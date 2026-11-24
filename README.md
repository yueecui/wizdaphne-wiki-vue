# 巫术达芙妮中文维基前端和本地更新脚本

[https://wizdaphne.huijiwiki.com/](https://wizdaphne.huijiwiki.com/) 前端和本地更新脚本

## 环境

- nodejs 24+（用 yarn 4，`corepack enable` 后按 `package.json` 的 `packageManager` 自动切换）
- python 3.10+（清洗脚本只用标准库，无需 `pip install`）
- 可选：[解包仓库 `WizardyDaphneUnpack`](../WizardyDaphneUnpack) —— 只有在更新游戏数据时才需要

## 快速开始

```bash
git clone <本仓库>
cd wizdaphne-wiki-vue
cp .env.example .env    # 至少填 VITE_WIKI_PREFIX；上传数据还要填 WIKI_* 与 COS_*
yarn install
yarn dev
```

`.env` 说明见 `.env.example`。其中：

| 变量 | 作用 |
| --- | --- |
| `VITE_WIKI_PREFIX` | 站点前缀，即 `https://<前缀>.huijiwiki.com`。**必填**，缺了 `vite` 直接报错 |
| `WIZDAPHNE_UNPACK` | 解包仓库根目录；留空 = 与本仓库**同级**的 `WizardyDaphneUnpack` |
| `WIZDAPHNE_MASTERDATA` | 只指向主数据表目录时用（如 `...\out\masterdata`） |
| `WIKI_*` | wiki 机器人账号 / authkey，上传类脚本必填 |
| `COS_*` | 腾讯云密钥、桶名、区域、路径前缀，上传静态资源必填 |

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `dev` / `build` / `preview` | 本地开发（端口取 `VITE_PORT`，默认 8765）/ 类型检查 + 构建到 `dist/` / 预览构建产物 |
| `[UPDATE 1] 清洗解包数据` | ① 从解包主数据清洗出中间产物 → `local_scripts/work/clean`（**需要解包仓库**） |
| `[UPDATE 2] 转换为 mock` | ② 先从 wiki 拉手工表（`Data:*Extra.tabx`、`Data:EffectKind.json` 等，**需要 `VITE_WIKI_PREFIX` + `WIKI_AUTHKEY`，只读不登录**），再生成 `data/`、`public/mock/`、`public/talent.gamedata.json`（**需要解包仓库**） |
| `[UPDATE 3] 上传到 wiki` | ③ 把 mock 增量上传到 wiki（`WIKI_CACHE_SQLITE_PATH` 默认 `local_scripts/work/wikitext.sqlite`） |
| `uploadToCos` | 把 `dist/assets/`（**需先 `yarn build`**）上传到 COS 并重写 wiki 的 loader 页面 |
| `[官方] junk` / `[官方] equipment-bonus` / `[官方] character-extra` / `[官方] character-status` | 从游戏**官方站点**抓数据：垃圾掉率 / 装备基准值与特典 / 角色补充表 / 角色状态 |
| `[WIKI] haken` | 生成「哈肯」词条的加护表格并**直接写 wiki**（登录 + 编辑页面；`--dry-run` 只落 `local_scripts/work/haken.wiki`，`--page` 换词条） |
| `[旧版] scrape:data` | 旧版 DataSearcher 页面用的 wiki API 快照（`public/*.json`），与 mock 管线无关，等旧页面下线后删除 |

> 数据更新三步按顺序跑（①→②→③）；步骤名带方括号，在 `yarn run` 列表或 IDE 的 npm scripts 面板里用引号或直接点击执行，例如 `yarn "[UPDATE 3] 上传到 wiki" -- --dry-run`。

## 数据来源

游戏数据全部来自解包仓库的 `out/masterdata/*.json`（由游戏资源解包得到，见该仓库 README）。
本仓库只负责清洗 → mock → 上传。`out/` 体积很大，不进版本库，所以**从零更新数据需要自己有游戏本体并跑过解包**。

例外：地图 / 敌群用的 `map_v3/floors.json`、`map_v3/unclassified.json` 已作为构建数据入库在解包仓库，
`build_map.py` 直接读取它们（游戏更新后用解包仓库的 `python tools/map_export.py` 重建），这部分不需要游戏本体。
