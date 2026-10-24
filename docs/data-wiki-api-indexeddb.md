# 游戏数据流转方案：Wiki → API → IndexedDB

> 目的：把「大型静态数据集」（如游戏内物品 / 怪物 / 配方 / 技能等）托管在 Wiki 上，通过 MediaWiki 接口按需拉取，落地到浏览器 IndexedDB 做离线缓存，最终常驻内存供页面即时查询。
> 本文档描述本项目的完整链路，供其它项目直接套用或裁剪。

---

## 1. 总览

```
┌──────────────┐   上传(encodeDoc)   ┌──────────────────────┐
│ 原始数据清洗  │ ─────────────────▶ │  Wiki Data: 页面       │
│ (长键 JSON)  │                     │  (短键压缩存储)        │
└──────────────┘                     └──────────┬───────────┘
                                                 │ Api/GetXxx (Scribunto lua)
                                                 │ 返回 {items,count,page,limit}
                                                 ▼
                                        ┌────────────────┐
                                        │  前端 fetch 层   │  fetchDataVersion / fetchAllModuleItems
                                        │ (api/wikiData)  │  + decodeDoc 还原长键
                                        └────────┬───────┘
                                                 │ 版本变化？
                              ┌──────────────────┴──────────────────┐
                         否（版本一致/离线）                    是（版本变化/首次）
                              │                                    │
                              ▼                                    ▼
                     ┌────────────────┐                  ┌────────────────────┐
                     │ loadFromDb     │                  │ refreshFromApi     │
                     │ 读 IndexedDB   │                  │ 清空→逐模块重拉     │
                     └───────┬────────┘                  │ → bulkPut 写回      │
                             │                          └─────────┬──────────┘
                             └──────────────┬───────────────────────┘
                                            ▼
                                     ┌────────────────┐
                                     │  内存常驻 ref   │  items/monsters/... 全部进 ref
                                     │ (Pinia store)  │  组件直接查内存
                                     └────────────────┘
```

**三层分工**
1. **Wiki（数据源）**：数据以短键 JSON 写在 Wiki 的 `Data:` 命名空间页面，由 Scribunto lua 模块 `Api/GetXxx` 按类型取出并分页返回。
2. **API 拉取层**：前端 `fetch` 调用接口，做分页补齐 + 短键→长键解码（`decodeDoc`）。
3. **IndexedDB + 内存（本地缓存）**：用 Dexie 按版本号整体失效；命中缓存直接读库，否则全量重拉并写回；数据最终常驻 Pinia `ref`，组件零延迟查询。

---

## 2. 各层详解

### 2.1 数据源：Wiki（MediaWiki + Scribunto）

- 站点：本项目用 HuiJi Wiki（`*.huijiwiki.com`），任意 MediaWiki + Scribunto 扩展均可替代。
- 存储：数据写在 `Data:` 页面，借助 `mw.huiji.db` 之类的键值存储按字段原样存取（也可换成自定义 DB 后端）。
- 取数接口：每个数据类型一个 lua 模块，约定返回结构统一为：
  ```jsonc
  { "items": [ /* 文档数组 */ ], "count": 1234, "page": 1, "limit": 10000 }
  // page=1 时 count 为该类总数
  ```
  模块名形如 `Api/GetItem`、`Api/GetMonster`、`Api/GetRecipe`、`Api/GetSpell`、`Api/GetState`、`Api/GetAreaEffect`。
- 版本号接口：`Api/Version`，返回 `{ "version": 109309 }`（6 位整数，可按位拆成大版本.小版本-修订）。

> 前端如何连到 Wiki：开发期用 Vite `server.proxy` 把 `/api`、`/index.php`、`/uploads` 反代到 Wiki 域名（见 `vite.config.ts`），线上则由同源/网关处理。换项目只需改 `VITE_WIKI_PREFIX` 与代理目标。

### 2.2 短键压缩编解码：`dbCodec.ts`

Wiki 上存的是**短键** JSON（节省页面体积与传输量），前端解码回**长键**对象（前端类型 / 组件按长键消费，无需改动）。

**压缩约定（encode 侧，decode 为其逆）**
- `num`：值为 `0` 省略，decode 缺席补 `0`；
- `str`：空串省略，decode 缺席补 `''`；
- `bool`：仅 `true` 写出（存储层会把 `true` 存成空串、`false` 丢弃），decode 取到该键即 `true`；
- `raw`：原样保留（如 `id`、可能为字符串的数值字段）；
- `numArr` / `strArr` / `objArr`：空数组不写；
- `obj`：仅存在时写；
- `optional` 字段：可整体缺席（decode 缺席即省略，不补默认）；
- `dtype`：不参与编解码（Wiki 端查询后已剔除）。

**核心 API**
```ts
// 上传时：长键 → 短键
encodeDoc(src: Doc, spec: FieldSpec[]): Doc
// 拉取时：短键 → 长键（兼容未压缩旧数据：短键缺席但长键存在则沿用）
decodeDoc(src: Doc, spec: FieldSpec[]): Doc
```
`FieldSpec` 声明每个字段的 `long`（前端键）、`short`（存储键）、`kind`、以及 `obj/objArr` 的嵌套 `fields`。每种文档类型一套 `DOC_SPECS`（如 `item` / `monster` / `recipe` / `spell` / `state` / `areaeffect`）。

> 换项目要点：先定义自己的 `DOC_SPECS`，encode 用于上传脚本，decode 用于前端拉取；这是整套方案里**最该复用**的范式。

### 2.3 客户端拉取层：`api/wikiData.ts`

- `fetchDataVersion()`：取线上版本号；失败返回 `null`（视为离线）。同时兼容 `version` / `data.version` / `data` 多种响应包装。
- `fetchAllModuleItems(module)`：先取 `page=1` 拿到 `count`，再按 `PAGE_LIMIT=10000` 分页补齐，通常 1–2 次请求取完。
- `resolveListPayload()`：兼容 `{items}` / `{data:{items}}` / `{data:[...]}` 三种包装。
- 会话内缓存：搜索器等工具首次用到才触发 `fetchAllSpells()` 等，Promise 记忆化避免重复请求（这些数据现已并入启动链路，store 启动后会用 `setCachedXxx` 把内存数据回填，搜索器直接复用）。
- **DEV 回退**：`IS_DEV` 时改为读取 `web/public/<Module>Response.json` 本地 mock，免联网开发。

### 2.4 本地存储与状态：`stores/wikiData.ts`（Dexie + Pinia）

- **数据库类 `WikiDataDb extends Dexie`**：每个数据类型一张表（`items` / `monsters` / `recipes` / `spells` / `states` / `areaEffects`），主键 `id`；另有 `meta` 表存版本与结构版本。
- **结构版本迁移**：用 Dexie 的 `version(1/2/3).stores({...})` 声明演进；自定义 `DB_SCHEMA_VERSION` 常量用于**结构变化时整体删除重建**（本项目曾把 `jobsItems` 并入 `items`、后新增技能等表，都靠整库重建 + 自动全量重拉解决）。
- **初始化流程 `initWikiData()`（幂等，重复调用只执行一次）**
  1. 检查 `meta.dbSchemaVersion` 是否等于 `DB_SCHEMA_VERSION`，不等则 `db.delete()` 重建；
  2. 读本地 `meta.dataVersion`；
  3. 取线上 `fetchDataVersion()`；
  4. **版本不一致 / 首次**：`refreshFromApi()` 清表 → 逐模块 `fetchAllModuleItems` → `decodeDoc` → 事务内 `bulkPut` 写回，并写入新 `dataVersion`；
  5. **版本一致 / 离线**：`loadFromDb()` 从 IndexedDB `toArray()` 读入内存；若取不到线上版本且本地也无缓存，置 `error`。
- **内存常驻**：所有数据进 `ref`，并预建 `itemMap` / `monsterMap` / `itemByName` / `recipesByResultId` 等索引；组件一律查询内存，零 I/O。
- **进度上报**：`refreshFromApi` 过程中把逐模块状态写入 `reload`，全屏加载层据此显示进度。

---

## 3. 关键设计取舍

| 决策 | 理由 |
|---|---|
| 短键压缩存储 | 数据集万级条目，压缩后页面/传输体积显著下降；decode 在客户端一次性完成，成本可忽略 |
| **按版本号整体失效**缓存 | 游戏数据更新间隔 ≥3 个月，全量替换代价可接受；比逐条 diff 简单可靠 |
| IndexedDB 持久化 + 内存常驻 | 跨会话免重复下载；内存查表 O(1)，满足模拟器/搜索器的高频查询 |
| `bulkPut` 批量写 | 万级条目逐条 `put` 慢，批量写入一次事务完成 |
| 启动即全量加载 6 类 | 主链路数据常驻；技能/状态/区域效果虽为工具按需，也并入启动并回填缓存，避免二次网络 |
| DEV mock + `IS_DEV` 分支 | 离线可开发；线上走真实接口，代码同一份 |

---

## 4. 迁移到其它项目的复用清单

**可直接复用（范式不变）**
1. `dbCodec.ts` 的短键编解码思路 + `FieldSpec`/`DOC_SPECS` 定义方式（按你的数据字段重写 spec 即可）。
2. `api/wikiData.ts` 的「版本号比对 + 分页拉取 + 响应包装兼容 + 会话缓存」模式。
3. `stores/wikiData.ts` 的「Dexie 建表 + `DB_SCHEMA_VERSION` 整库重建 + 版本比对决定读缓存/全量重拉 + 内存常驻」初始化骨架。
4. DEV mock 机制（`IS_DEV` 读本地 JSON）。

**必须按项目改写**
- `RELOAD_MODULES`：你的数据类型与对应接口模块名。
- `DOC_SPECS` 与各 `GameXxx` 类型。
- Wiki 域名 / 代理配置（`vite.config.ts` 的 `VITE_WIKI_PREFIX` 与 `/api`、`/uploads` 反代目标）。
- Dexie 表结构（每张表的主键与索引需匹配你的查询方式）。
- 版本号接口与版本号解析规则（本项目 6 位整数拆 `大版本.小版本-修订`）。

**可选裁剪**
- 若数据量小、更新频繁，可放弃「全量按版本失效」，改为按条目 `updatedAt` 增量同步。
- 若无需离线，可省去 IndexedDB，仅内存 + 接口缓存即可。
- 若已有图形化后台，可跳过 Wiki，直接用 REST 接口提供相同 `{items,count,page,limit}` 响应，前端拉取层无需改动。

---

## 5. 关键文件索引

| 文件 | 职责 |
|---|---|
| `web/src/api/wikiData.ts` | 版本号 / 分页拉取 / 解码入口 / DEV mock / 会话缓存 |
| `web/src/api/dbCodec.ts` | 短键 ↔ 长键 编解码（`encodeDoc` / `decodeDoc` / `DOC_SPECS`） |
| `web/src/stores/wikiData.ts` | Dexie 库定义、版本比对初始化、内存常驻、进度上报 |
| `web/public/<Module>Response.json` | DEV 离线 mock（接口原始响应快照） |
| `vite.config.ts` | `/api`、`/index.php`、`/uploads` 反代到 Wiki 域名 |
| `local_scripts/cleaner/*` | （上游）游戏客户端数据解包 + 清洗，产出长键 JSON 与 i18n，供上传脚本 `encodeDoc` 后写入 Wiki |

> 注：上传脚本（长键 → 短键 → 写 `Data:` 页面）是 `encodeDoc` 的调用方，与 `dbCodec.ts` 的 decode 互为逆操作；本项目由独立脚本在发布数据时执行。
