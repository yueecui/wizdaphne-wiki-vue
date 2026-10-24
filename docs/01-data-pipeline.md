# 01 · 数据从哪来（解包流水线）

> 本文只讲「解包仓库产出什么、在哪、怎么重跑」，不展开逆向原理。

---

## 1. 两个仓库的分工

| 仓库 | 路径 | 职责 |
|---|---|---|
| 解包仓库 | `D:\WizardyDaphne\WizardyDaphneUnpack` | 解密游戏缓存、导出主数据、多语言合并、**数据清洗脚本**、参考数据抓取 |
| 本仓库 | `D:\WizardyDaphne\wizdaphne-wiki-vue` | 维基前端、`public/data.json` 等产品数据、线上发布 |

解包仓库的 `out\` **可随时删除重建**；持久配置放在 `tools\clean\data\`（表名映射、手工命名），这两类不要混。

---

## 2. 解包仓库目录速览

```
WizardyDaphneUnpack\
  .env                     游戏安装路径（WVD_GAME）/ 仓库路径（WVD_DATA）
  1-decrypt-cache.bat      解密下载缓存      → out\plain
  2-index-bundles.bat      登记 bundle 清单  → out\asset-index.jsonl
  3-extract-assets.bat     抽取贴图/文本/mono→ out\assets
  4-verify.bat             CRC 校验解密结果
  5-collect-assets.bat     去重归档          → out\assets.lib / assets.new
  6-lang-ja|zhs|zht|en.bat 切语言后「只记录」新增文件
  7-merge-langs.bat        导出 + 合并多语言 → out\masterdata
  tools\                   解包与主数据脚本
    masterdata.py          单表 dump / 搜索
    multilang.py           多语言合并（产出 out\masterdata）
    clean\
      common.py            加载/文本/命名三件套（清洗脚本共用）
      identify_tables.py   schema 签名 → IL2CPP 类名（写 schema_names.json / table_map.json）
      analyze_unk.py       未命名表分诊（与哪个类最像）
      character.py         角色清洗 → out\clean\character
      job.py               职业清洗 → out\clean\job
      skill.py             技能清洗 → out\clean\skill
      fetch_guide.py       抓攻略站角色详情页 → out\reference\guide
      il2cpp_names.py      抽 IL2CPP 类型/字段名
      data\                持久配置：schema_names.json / table_map.json / manual_names.json / il2cpp_types.json
  docs\unpacking.md        逆向原理与已验证事实
  skills\                  给 agent 用的技能包（main-unpack / audio-unpack / skillpkg）
  out\                     所有产物（可删）
```

---

## 3. 主数据产物 `out\masterdata`

### 3.1 规模

| 指标 | 数值 |
|---|---|
| 表数量 | 288（`*.json` 文件 + `index.json`） |
| 总行数 | 234,520 |
| 本地化表 | 93 张 / 62,005 行 |
| 共享表 | 195 张 |

「本地化表」= 同一个表每种语言一个文件，合并后文本字段变为对象：

```json
"name": { "ja": "ガストン", "zhs": "加斯顿", "zht": "加斯頓", "en": "Gaston" }
```

「共享表」= 与语言无关，文本保持标量（多为空、短名或测试串）。

### 3.2 `index.json` 每项的含义

```json
"Character": {
  "sig": "1b6524649c",          // schema 签名 = 排序后字段名的 md5（表名识别的依据）
  "kind": "localized",          // localized | shared
  "keys": ["id", "name", ...],  // 字段名
  "records": 105,               // 行数
  "files": 4,                   // 合并了几个原始文件（= 语言数）
  "languages": ["en","ja","zhs","zht"],
  "merged_fields": ["name", ...], // 被合并成多语言对象的字段
  "variants": ["en","ja","zhs","zht"],
  "file": "Character.json"
}
```

### 3.3 命名规则与 `unk_*`

- 表名**不是**从内容猜的，而是把「字段集合」与 IL2CPP 里的 `Bone.MasterData.*` 类做匹配（`identify_tables.py`）。
- 同名但 schema 不同时，后出现者加 `~2` 后缀（如 `CharacterOutfit~2`），**它们不是同一张表**，清洗时不要合并。
- 匹配不上或发生冲突的保留 `unk_<sig>`。目前 15 张，其中 3 张是技能效果链路的关键表（已识别，见 `02` §6）。

### 3.4 语言

本地化表在 `out\masterdata` 中已经是四语对象；缺失语言时为 `null`（例：`Personality.name.zht` 缺、`Gender.name.ja` 缺）。
这不是 bug，是游戏本身某些表只做了部分语言。

---

## 4. 常用命令

```bat
cd /d D:\WizardyDaphne\WizardyDaphneUnpack

:: 主数据普查（不写文件）
python tools\masterdata.py --list

:: 全量 dump 到 out\masterdata（单语言，调试用）
python tools\masterdata.py --dump

:: 搜含某关键词的行
python tools\masterdata.py --find skill

:: 表名识别（读 data\<sha1>，内存扫描，写 tools\clean\data）
python tools\clean\identify_tables.py

:: 多语言合并（最终产物）
python tools\multilang.py build --langs ja zhs zht en

:: 未命名表分诊
python tools\clean\analyze_unk.py   :: → out\clean\unk_analysis.txt / .json

:: 角色清洗（已挪到本仓库 local_scripts\clean\）
python local_scripts\clean\character.py
python local_scripts\clean\character.py --check gaston
```

> 游戏更新后的完整顺序见解包仓库 `README.md`：`1 → 4 → 2 → 3 → 5`；需要新语言时走 `6-*` 记录后 `7-` 合并。

---

## 5. 参考数据（交叉验证用）

解包仓库额外抓了两类外部数据用于校验，**只做对照，不进产品**：

| 来源 | 产物 | 用途 |
|---|---|---|
| 攻略站 codex API（`/api/wizva/<lang>/catalogue/...`） | `out\reference\{lang}_{skill,item,equipment,character,enemy}.json` | 名称、类型标签、角色职业/阵营/种族等关键词 |
| 攻略站详情页 | `out\reference\guide\zh-Hans_character_<slug>.json` | 角色详情（含 `statsData.base/growth/pools/talent/growthRate`） |

已验证的对照结论记录在 `02-character-job-skill.md` §8。

---

## 6. 数据如何进入维基

前端「数据查询」在 `src/views/DataSearcher/`，数据入口只有一个：

```ts
// src/views/DataSearcher/data/searcherDataStore.ts
const response = await fetch(
    IS_DEV ? '/data.json' : '/api.php?action=lua&module=Api/GetSearcherData&format=json&utf8=1',
);
```

- 开发环境读 `public/data.json`（当前为**手工数据**）。
- 生产环境读维基的 MediaWiki 模块接口，返回结构相同（`ISearcherExposeData`）。
- 因此清洗后的数据有两条落地路径：
  1. **兼容路线**：生成与 `ISearcherExposeData` 同构的 JSON，先替换 `public/data.json` 做 dev 对比 → 再灌进线上模块。
  2. **重构路线**：新 schema（带 ID、多语言、层级），同时改 `SearcherData.types.ts` 与各页面。

两条路线取舍见 `docs/README.md` §5 Q6。

---

## 7. 产物清单（当前快照）

| 路径 | 内容 | 状态 |
|---|---|---|
| `out\masterdata\` | 288 张表 + index | 可用 |
| `out\clean\character\` | `characters.json`（105 行）+ `character_groups.json`（76 组）+ 105 个单行 JSON + `index.json` | 首版 |
| `out\clean\job\jobs.json` | 17 个职业：倍率、基础、成长、技能表 | 首版 |
| `out\clean\skill\` | `skills.json`（3,031）+ `skill_levels.json`（8,655 行）+ `effect_kinds.json`（400 类） | 首版 |
| `out\reference\` | codex 五个域 JSON + 2 个角色详情页 | 参考 |
| `out\clean\unk_analysis.txt` | 15 张 unk 表的最近类与字段 | 本次生成 |
| `out\assets.lib\` | 贴图/文本（按规则分目录） | 与本任务无关 |
