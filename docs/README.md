# 巫术达芙妮 Wiki · 解包数据清洗（调研与进度）

> 最后更新：2026-10-21
> 适用对象：第一次接触本项目的开发者 / 内容维护者。读完本页再看子文档即可上手。

---

## 0. 这是什么、为什么要清洗

本仓库（`wizdaphne-wiki-vue`）是 [巫术达芙妮中文维基](https://wizdaphne.huijiwiki.com/) 的前端与本地更新脚本。

- 前端「数据查询」模块的数据**一直是人工整理**的，落在 `public/data.json`（开发环境）与线上 MediaWiki 接口 `Api/GetSearcherData`（生产环境）。
- 2026-10 起，在独立仓库 `D:\WizardyDaphne\WizardyDaphneUnpack` 完成了**游戏资源解包**：可解密下载缓存、导出贴图/文本，并把**服务端主数据**（MessagePack 表）导出为可读 JSON，且已合并 `ja / zhs / zht / en` 四种语言。
- 现在的工作 = **把解包出来的「机器数据」清洗成维基可用的「产品数据」**，逐步替换手工数据。
- 解包数据的表名是**反编译比对结构推测**出来的，推测不出的以 `unk_<sig>` 命名；本次调研范围 = **角色 / 职业 / 技能**。

数据流一句话：

```
游戏缓存 / 主数据 → 解密解包 → out\masterdata（288 张表，多语言）
                  → 语义清洗（tools\clean\{character,job,skill}.py）→ out\clean\<域>\<id>.json
                  → 第一轮 build_data.py   → data\（根目录总数据 + character/job/skill 单条，引用只留 id）
                  → 第二轮 build_mock.py   → public\mock\（短键 + API 形状）
                  → 上传 Wiki Data: 页面 → Api/GetXxx → 前端 decode → IndexedDB
```

旧的 `public/data.json` 仍被旧页面使用；v2 已切到新链路（`data/` → `public/mock/` → Wiki API → IndexedDB），旧载荷 `public/data-v2/` 已删除。详见 `05-data-pipeline.md` 与 `04-data-v2.md` §4.3。

---

## 1. 五分钟结论

| 维度 | 手工现状 `public/data.json` | 解包可得 | 结论 |
|---|---|---|---|
| 角色 | 95 条（`data.json`；旧的 `data.js` 只有 63 条） | `Character` 105 行 = 95 条 + 9 个觉醒 + 1 个占位 | 手工 95 条与解包 95 行 **1:1 对应**（详见 03） |
| 职业 | 14 条倍率 / 9 个标准职业 | `Job` 17 行（9 常规 + 3 联动 + 4 角色专用 + 1 流浪者），倍率/基础/成长齐全 | 可直接替换（手工 `res` 整列有误，见 03 §4.1） |
| 角色→职业 | 只有 `class: string[]` | `JobChangeItem` 明确给出「主职业 + 第二职业」（57 组双职业、19 组单职业） | 已验证与攻略站 93 条角色 100% 一致 |
| 技能 | 521 条（名称/描述/类型/上限） | `Skill` 8,655 行 / 3,031 个技能 ID，其中**玩家可获得 929 个**（核心 853），逐级数据齐全 | 513 条手工技能名可直接命中，其余为译名/符号差异 |
| 技能数值 | 无 | 效果链路已打通并落盘：`SkillEffectGroup → SkillDamageEffect / SkillSubEffect` | 已产出逐级威力/命中/消耗，效果标签覆盖 89.5% |
| 多语言 | 中文名 + 日英名 | 93 张本地化表，文本字段为 `{ja,zhs,zht,en}` | 做三语站已具备条件 |
| 校验 | 纯人工 | 与攻略站 leveling-guide 交叉验证：基础值/成长率/阵营/种族/属性/职业全部一致 | 数据可信度高 |
| 前端 | `src/views/DataSearcher`（`public/data.json`） | `src/views/DataV2`（Wiki `Api/GetXxx` / DEV `public/mock`，IndexedDB 缓存） | **两套并存**，互不影响（见 04） |

**一句话进度：角色、职业、技能三部分的数据结构已经摸清并完成首轮清洗（角色已产出 105 个 JSON）；技能数值链路已验证可用，但尚未落成产品格式。**

---

## 2. 文档索引

| 文档 | 内容 | 读者 |
|---|---|---|
| 本页 `docs/README.md` | 项目背景、进度看板、关键结论、待确认问题、路线图、术语表 | 所有人，先读这页 |
| [`01-data-pipeline.md`](./01-data-pipeline.md) | 数据从哪来：解包仓库、`out\` 目录、多语言合并、表名机制、常用命令 | 要动手跑脚本的人 |
| [`02-character-job-skill.md`](./02-character-job-skill.md) | 本次调研主体：角色/职业/技能的表结构、ID 规则、枚举含义、关联关系、清洗输出设计、验证明细 | 要写清洗脚本 / 改前端的人 |
| [`03-manual-vs-unpack.md`](./03-manual-vs-unpack.md) | 手工数据（`data.json` 95 条）与解包的逐字段对照、差异清单、迁移建议 | 要迁移数据 / 修手工错漏的人 |
| [`04-data-v2.md`](./04-data-v2.md) | v2 数据流水线与前端：收录规则、产物结构、生成命令、挂载方式、验收清单 | 要部署 / 继续开发 v2 页面的人 |
| [`05-data-pipeline.md`](./05-data-pipeline.md) | **新链路**：第一轮长键精简（`data/`）→ 第二轮短键 mock（`public/mock/`），字段精简规则、短键表、编码规则、验收清单 | 要接 Wiki API / 改载荷格式的人 |
| [`06-masterdata-patches.md`](./06-masterdata-patches.md) | 官方主数据「配错表」的修正补丁：症状、扫描命令、`SKILL_IDENT_FIXES` 的位置与新增流程（案例 56167101 / 56167201） | 发现技能名/说明错位时要补数据的人 |
| [`07-shops.md`](./07-shops.md) | 商店数据：`Shop` / `ShopContent` / `PointShop` 表结构与字段、金币商店 126 件商品的分布、进度解锁只有 id 没有文案、**122 家店的清洗与商店页实现** | 要做商店页 / 补「获取途径」的人 |
| [`08-items.md`](./08-items.md) | 道具数据：`Reward` / `ItemType` / `Expendables` / 强化素材表结构、2,684 条道具的分类分布、**图鉴（出售/消耗品/贵重品/其他，473 条）**、清理与前端探查页的实现 | 要做道具页 / 查道具效果与价格的人 |
| [`data-wiki-api-indexeddb.md`](./data-wiki-api-indexeddb.md) | 参考范式：Wiki 短键 JSON → `Api/GetXxx` → 前端 decode → IndexedDB/内存 | 要理解 05 为什么这么设计的人 |

> 解包本身的技术原理（AES 密钥、IL2CPP、MessagePack、Addressables）不在本仓库展开，见解包仓库的 `docs/unpacking.md` 与 `skills/main-unpack/SKILL.md`。

---

## 3. 进度看板

| # | 事项 | 状态 | 产物 / 位置 | 说明 |
|---|---|---|---|---|
| 1 | 解密下载缓存 + CRC 校验 | 完成 | `WizardyDaphneUnpack/out/plain` | 24,811 个 bundle 100% 通过 |
| 2 | 主数据解密导出 | 完成 | `out/masterdata/*.json` + `index.json` | 288 张表 / 234,520 行 |
| 3 | 多语言合并（ja/zhs/zht/en） | 完成 | 同上，本地化字段为 `{lang: text}` | 93 张本地化表、195 张共享表 |
| 4 | 表名识别（schema → IL2CPP 类名） | 基本完成 | `tools/clean/data/schema_names.json` | 仍有 15 张为 `unk_*` |
| 5 | 未命名表识别（本次） | 部分完成 | 见 `02-character-job-skill.md` §6 | 技能链路 3 张已高置信度识别 |
| 6 | 角色清洗脚本 | 完成（首版） | `local_scripts/clean/character.py` → `local_scripts/work/clean/character/` | 105 行 + 76 组 + 风格 + 双职业，三语名 |
| 7 | 职业清洗 | 完成（首版） | `local_scripts/clean/job.py` → `local_scripts/work/clean/job/jobs.json` | 17 职业 + 倍率/基础/成长 + 技能表 |
| 8 | 技能清洗 | 完成（首版） | `local_scripts/clean/skill.py` → `local_scripts/work/clean/skill/` | 3,031 个技能 / 8,655 行等级数据 + 效果数值 |
| 9 | 输出给 wiki 的格式与迁移 | 未开始 | — | 需先定粒度与语言策略（见 §5） |
| 10 | 与 `public/data.json` / 线上 API 对接 | 未开始 | — | 前端结构见 02 §7 |
| 11 | 手工数据 × 解包 对照 | 完成 | `docs/03-manual-vs-unpack.md` | 95/95 匹配；差异 7 类已列清单 |
| 12 | v2 网页载荷导出 | **已废弃** | `local_scripts/clean/export_v2.py` → `public/data-v2/` | 被第 15/16 项取代；`public/data-v2` 已删除 |
| 13 | v2 前端页面 | 首版可用 | `src/views/DataV2/` + `loader/config/dataSearcherV2.ts` | 独立目录/独立 store/挂载点 `#data-searcher-v2`，待人工验收 |
| 14 | 技能详情弹窗 | 完成（首版） | `DataV2/SkillModal.vue` + `SkillDetail.vue` | 攻略站式版式：基本信息/说明/逐级数值（转置）/通用数值/学习来源；字段对照见 04 §3.1 |
| 15 | 第一轮清洗（长键精简） | 完成 | `local_scripts/clean/build_data.py` → `data/` | 95 角色 / 17 职业 / 3,031 技能 / 816 装备；根目录总数据 + `character/ job/ skill/ equipment/` 单条；列表与详情合并、引用只留 id、名称进 `enums.json`（见 05） |
| 16 | 第二轮清洗（Wiki 载荷 mock） | 完成 | `local_scripts/clean/build_mock.py` → `public/mock/` | 短键 + `{items,count,page,limit}`，6 个模块共 4.40 MB，内置短键唯一性与往返自检；`update:wiki` 已支持 character / job / skill / equipment / enum 上传（mock 本身不入库） |
| 17 | IndexedDB 数据源 | 完成 | `src/api/dbCodec.ts` + `src/api/wikiData.ts` + `src/stores/wikiData.ts` | 短键解码、版本比对、整库缓存；`DataV2` 已切换（见 04 §4.3） |
| 18 | 移除旧载荷 | 完成 | — | `public/data-v2/` 已删除，页面不再请求该路径 |
| 19 | 装备（武器 / 防具） | 完成 | `local_scripts/clean/equipment.py` + `DataV2/EquipmentPanel.vue` + `EquipmentModal.vue` | 816 条（武器 341 / 盾 51 / 头部 97 / 身体 109 / 手部 73 / 脚部 61 / 饰品 82 / 工具 2）；数值、攻击次数、特性、套装、图标、强化曲线、探索三项（探知 / 陷阱解除 / 陷阱回避）、材质补强（`EquipmentOverRankReinforce`，540 件）与图鉴编号（`CollectionEquip`，特殊装备 EX）取自解包，加护概率与类型基准值 `baseStat` 取自 `Api/GetV2Equipment` 顶层；详情新增「材质补强」页（目标阶级分组、逐次属性增量、阶级小计、总加成），属性表可用下拉叠加补强等级；能通过杂物获得的装备还会显示「杂物来源」页签（本地有杂物整理缓存时生效）；敌人 / NPC / 剧情专用装备（`name` 没有中文本地化）与测试行一并排除；V1 手工表（EquipmentExtra / EquipmentSkill / EquipmentSetSkill / EquipmentBonus / EquipmentBaseStat）不再参与清洗，解包与接口都没有的字段保留占位 |

| 20 | 杂物 | 完成 | `DataV2/JunkPanel.vue` + `DataV2/junk/` | V2 独立实现，V1 代码不改动；官网抓包 `public/junkdata.json`（743 分类）整理出约 23 万条几率组合，装备中文名 / 阶级 / 特典取 V2 装备数据；列表 / 筛选 / 分页 / 详情弹窗 / 右键复制模板与 V1 一致；整理结果缓存到主库 `wizdaphne-wiki-v2` 的 `junk` 表，本地有缓存时进页面直接读取、不再走网络，整库重建（`DB_SCHEMA_VERSION` bump）或手动刷新时一起失效；详情里查看装备打开 V2 装备弹窗 |

状态含义：**完成** = 已产出且验证过；**首版可用** = 有产物但字段/粒度待定；**未开始** = 仅完成调研。

---

## 4. 关键事实速查（附证据等级）

标注：**[已验证]** = 有交叉验证或 100% 外键闭合；**[推断]** = 由内容语义/结构推断；**[未知]** = 尚无结论。

1. [已验证] `Skill` 主键是「技能行 ID」，规则 `id = identification * 100 + level`；`identification` 才代表一个「技能」，同一技能有 1/2/3/5/7/9/15 行不等的等级数据。
2. [已验证] 玩家可获得技能共 **929 个 identification**（核心 853 + 缘角色羁绊 69 + 隐退才能 7），全部能在 `Skill` 表解析。
3. [已验证] 常规 9 职业的技能 ID 前缀规律：`110 + (job_id - 100)`，即战士 `110*`、盗贼 `111*`……治愈师 `118*`。
4. [已验证] 每个角色组可由 `JobChangeItem` 得到「主职业 + 第二职业」：57 组有 2 个、19 组只有 1 个；与攻略站 93 条角色 100% 一致。
5. [已验证] 角色 ID 是**有含义的编码**：`[稀有度][0][种族][性别][序号 4 位][风格 4 位]`。
6. [已验证] 角色基础值 = 种族 + 属性 + 阶级 + 性别（10 点底数已含在种族基础值内）；显示用成长率 = 种族 + 属性（职业成长率单列）。加斯顿、菲利希娅与攻略站完全一致。
7. [已验证] 阵营枚举 `1=善 / 2=中立 / 3=恶`，93/93 角色与攻略站一致。
8. [已验证] 技能效果链路外键闭合：`Skill.skill_effect_group_ids` 的 7,675 个不同引用 100% 命中效果组表；伤害效果 2,003/2,009、子效果 8,244/8,290 命中。
9. [推断] 三张未命名表即技能效果三件套：`unk_c506d12c17 = SkillEffectGroup`、`unk_4369adef4d = SkillSubEffect`、`unk_3cdcc01c30 = SkillSubEffectKind`（证据见 02 §6）。
10. [推断] `skill_kind` 枚举：1 普通攻击 / 2 攻击技能 / 3 辅助技能 / 4 攻击魔法 / 5 回复魔法 / 6 强化魔法 / 7 妨碍魔法 / 20 设置陷阱 / 90 特殊（道具、剧情）。
11. [未知] `cost_kind`（1/2）与 `use_timing`（1~7）的官方枚举名与完整语义，目前只能按行为归类。
12. [未知] `SkillGroup`（64 组 / 1,443 行）的用途；`SkillInheritance` 中 9 个引用在 `Skill` 表缺失的原因。
13. [已验证] 首轮清洗已产出：角色 105 行 / 76 组、职业 17 个、技能 3,031 个（8,655 行等级数据）；技能中玩家可获得 929 个、测试 82 个、仅 0 级 1,576 个。
14. [已验证] 效果标签字典 122 条（含 damage 级高频 16 个），其中 45 个带 `param_1~7` 位标签；玩家技能子效果实例覆盖 **89.5%**，仍未标注的低频类型 292 种（Q8）。
15. [已验证] 隐退「才能」（手工 `fate_type`）可由解包自动得出：`FateCharacterStatuses`（105 行，一角色一行）→ `default_skill_id` ∈ `193015000~193015006` →「XX的才能」。菲利希娅 = 智慧的才能，与攻略站一致。

---

## 5. 决策记录与待确认问题

### 已决策（2026-10-21）

| 编号 | 问题 | 决策 |
|---|---|---|
| Q1 | 角色粒度 | **先全清洗出来看**：同时产出「105 行平铺」+「76 个角色组」两种视图，粒度等看完再定 |
| Q2 | 语言策略 | **中文为主 + 日英名**：`name`（中文）/ `name_jp` / `name_en`；长文本只出中文，缺失时用 `description_lang` 标记回退语言 |
| Q3 | 技能范围 | **全部 3,031 个**，含测试/敌方，靠 `flags.test / flags.level0 / player / sources` 标注，由调用方过滤 |
| Q4 | 数值深度 | **逐级数值先做高频类型**：已给出 122 个中文标签（45 个带参数位语义），覆盖玩家技能 89.5% 的子效果；其余保留日文名待补 |
| Q5 | 角色口径 | **已澄清**：手工 95 条 = 75 基本角色（含 8 无名）+ 20 个异装风格 = 攻略站 93 + 爱莉安诺特 + 夏莉莉妮雅第二版；解包比之手多 9 个觉醒 + 1 个占位（详见 03 §0） |
| Q5b | 觉醒形态是否收录 | **不收录**（先）：v2 角色列表固定 95 条，9 个觉醒 + 1 个占位写入 `excluded_awakening.json` 备查，后续要加时去掉过滤即可 |
| Q6 | 落地位置 | **清洗与导出都在本仓库**：脚本在 `local_scripts/clean/`，中间产物在 `local_scripts/work/clean/`（不入库），生成物写到 `data/` 与 `public/mock/`；解包仓库只提供 `out/masterdata` |
| Q7 | 前端兼容 | **新建一份**：`src/views/DataV2/`，独立目录/独立 store/独立挂载点，旧 `DataSearcher` 一行不改 |
| Q9 | 新数据形态 | **两轮清洗**：`data/` 长键精简（生成物，不入库）→ `public/mock/` 短键 + `Api/GetXxx` 形状；引用类字段只存 id，名称统一进 `enums.json`（详见 05） |

### 仍待确认

| 编号 | 问题 | 影响 |
|---|---|---|
| Q8 | **效果标签补充**：剩余 355 种低频效果类型是否继续反推中文名？ | 影响技能表格的完整度 |

---

## 6. 建议的下一步（按依赖排序）

1. **人工验收 v2 页面**：按 `04-data-v2.md` §6 的清单点一遍（角色/职业/技能三个面板 + 旧页面回归）。
2. **补表名**：把 02 §6 的识别结论写进 `tools/clean/data/manual_names.json`，重跑 `identify_tables.py`，让 `out/masterdata` 出现 `SkillEffectGroup` 等真名。
3. **补效果标签**：剩余 355 种低频 `SkillSubEffectKind` 按出现频次逐个补中文名（Q8）。
4. **回归校验 / CI**：游戏更新后重跑「解包 → 清洗 → 导出」，与上次快照 diff（角色/技能数量、字段缺失率）。
5. **扩展域**：装备（`Equipment` 3768 行）、怪物（`Enemy` 1363 行）复用 `common.py` 与同一套 v2 导出结构。
6. **上线方案**：`public/mock` 只服务开发；线上由 `Api/GetXxx` 返回同形状数据，前端已实现 `decodeDoc` + IndexedDB + 版本失效。
7. **上传模块**：按 `05-data-pipeline.md` §3 的短键 spec 写 `encodeDoc`，把 `public/mock` 写入 Wiki `Data:` 页面，并更新 `Api/Version`。

---

## 7. 术语表（维基说法 ↔ 解包表）

| 维基/玩家说法 | 解包表 / 字段 | 说明 |
|---|---|---|
| 角色 | `Character` | 一行 = 一个「风格」；`character_group_id` 相同的行属同一角色 |
| 风格 / 觉醒 | `Character.caption_name`、`is_default_style`、`before_awakening_character_id` | 序号 `0000` 基本、`0001` 异装、`0099` 觉醒 |
| 图鉴号 | `CollectionCharacter.list_number` | 67~69（外传）、2001~2069（主线/活动）、9001~9006（无名） |
| 职业 | `Job` | 100~108 常规、200~202 联动、800~803 角色专用、900 流浪者 |
| 转职 / 第二职业 | `JobChangeItem` | 该角色可转的职业清单 |
| 技能 | `Skill.identification` | 技能本体，不区分等级 |
| 技能等级 | `Skill.level` / `Skill.id` | `id = identification*100 + level` |
| 固有技能 | `Character.unique_skill_ids` | 角色独有，多为 `194*` 前缀 |
| 继承技能 | `Character.skill_identification_1/2` | 攻略站字段名 `inherit_skill` |
| 潜在继承技能 | `Character.sub_skill_identification_1/2` | 攻略站字段名 `potential_inherit_skill`，受 `sub_inheritance_grade_id` 限制 |
| 克己 / 自制 | `CharacterSelfRestraintSkill` | 按点数逐级解锁，攻略站叫「克己技能」 |
| 才能（成长） | `Talent` + `CharacterGrowthRate` | 决定成长率区间与等级修正 |
| 才能（隐退） | `FateCharacterStatuses.default_skill_id` → `Skill 1930150xx` | 「XX 的才能」（力量/智慧/信仰心/生命力/灵巧/敏捷/运气），手工字段 `fate_type` |
| 阶级 | `CharacterGrade` | 12 档，含 `max_lv` 与每项 +N |
| 意志力 | `CharacterMental.mental` | 100 / 90 / 80 |
| 特性值 | 「基础值 + 成长率 × 等级 + …」 | 见 02 §3.6 |

---

## 8. 复现方式（最短路径）

```bat
:: 解包仓库：只做到 out\masterdata
cd /d D:\WizardyDaphne\WizardyDaphneUnpack
dir out\masterdata\index.json
python tools\clean\identify_tables.py
python tools\multilang.py build --langs ja zhs zht en

:: 本仓库：清洗 + 两轮导出（输入仍是解包仓库的 out\masterdata）
cd /d D:\WizardyDaphne\wizdaphne-wiki-vue
python local_scripts\clean\character.py   :: -> local_scripts\work\clean\character（105 行 + 76 组）
python local_scripts\clean\job.py         :: -> local_scripts\work\clean\job\jobs.json
python local_scripts\clean\skill.py       :: -> local_scripts\work\clean\skill（3,031 技能 / 8,655 等级行）

:: 校验单个角色与攻略站
python local_scripts\clean\character.py --check gaston

:: 两轮生成前端数据
python local_scripts\clean\build_data.py  :: -> data（长键精简）
python local_scripts\clean\build_mock.py  :: -> public\mock（短键 API 形状）
```

产物位置与字段说明见 `01-data-pipeline.md`。
