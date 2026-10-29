# 04 · v2 数据流水线与前端（与旧版完全隔离）

> 2026-10-21。目标：让「解包数据」这条线**独立生长**，与现有的手工数据 / 旧页面**互不影响**。
> 2026-10-21 续：数据的**新形态**（`data/` 长键精简 → `public/mock/` 短键 API 载荷）见 [`05-data-pipeline.md`](./05-data-pipeline.md)。
> **2026-10-21 再续：`DataV2` 已切到新链路** —— 开发环境读 `public/mock/*Response.json`，线上读 Wiki `Api/GetXxx`，
> 解码后写入 IndexedDB 并常驻内存；旧的 `public/data-v2/` 已删除。
> 旧功能（`public/data.json` + `src/views/DataSearcher`）保持原样，任何人继续手工维护都正常可用。

---

## 1. 隔离原则

| 层 | 旧（手工线） | 新（解包线） | 是否共用 |
|---|---|---|---|
| 数据文件 | `public/data.json`（手工，95 角色 / 521 技能） | `public/mock/*Response.json`（DEV）/ Wiki `Api/GetXxx`（线上） | 不共用 |
| 数据来源 | 线上 MediaWiki 模块 / 手工编辑 | 解包 → 两轮清洗 → Wiki `Data:` 页面 | 不共用 |
| 前端目录 | `src/views/DataSearcher/` | `src/views/DataV2/` + `src/stores/wikiData.ts` | 不共用 |
| 状态管理 | `useSearcherDataStore` | `useWikiDataStore`（IndexedDB）+ `useDataV2Store`（视图） | 不共用 |
| 类型 | `SearcherData.types.ts` | `DataV2/types.ts` | 不共用 |
| 挂载点 | `#data-searcher` | `#data-searcher-v2` | 不共用 |
| 构建产物 | `assets/DataSearcher-*.js` | `assets/DataV2-*.js` | 独立 chunk |

唯一「共用」的是底层 UI 库（naive-ui）与主题容器 `ThemeConfigProvider`，只做引用，不修改。

---

## 2. 数据链路

```
out/masterdata（解包主数据，288 表）
   └─ local_scripts/clean/{character,job,skill,equipment}.py  语义清洗
        └─ local_scripts/work/clean
             └─ local_scripts/clean/build_data.py  第一轮：长键精简 → <repo>/data
                  └─ local_scripts/clean/build_mock.py  第二轮：短键 + API 形状 → <repo>/public/mock
                       └─ 上传 Wiki Data: 页面（未做）
                            └─ Api/GetCharacter|Job|Skill|Enum   ──►  浏览器
                                 └─ decodeDoc → IndexedDB → 内存 refs
```

开发环境跳过「上传 Wiki」这一步，`Api/GetXxx` 由 `public/mock/*Response.json` 顶替（`IS_DEV` 分支）。

### 2.1 收录规则（本次决策）

- **不收录觉醒形态**：id 末 4 位 `0099` / `0100` 的 9 行不进入角色列表，但保留在清洗层，导出时写入 `excluded_awakening.json` 备查（后续要加时可以一键恢复）。
- **不收录占位角色**：`901100720000`（「？？？？」流浪者）。
- 结果：**95 个角色条目**（75 个基本形态 + 20 个异装形态），与手工数据条目数一致，可直接对照。

### 2.2 产物结构

前端实际拿到的只有 6 个模块（详情与列表已合并，一条记录即完整文档）：

| 文件（`public/mock/`，DEV） | Wiki 接口 | 条数 | 体积 |
|---|---|---|---|
| `CharacterResponse.json` | `Api/GetCharacter` | 95 | 773 KB |
| `JobResponse.json` | `Api/GetJob` | 17 | 21 KB |
| `SkillResponse.json` | `Api/GetSkill` | 3,031 | 2.16 MB |
| `EquipmentResponse.json` | `Api/GetEquipment` | 816 | 1.41 MB |
| `EnumResponse.json` | `Api/GetEnum` | 1（字典包） | 62 KB |
| `VersionResponse.json` | `Api/Version` | — | <1 KB |

第一轮的长键数据在仓库根目录 `data/`（不入库），结构见 05 §2。

---

## 3. 生成命令

```bat
cd /d D:\WizardyDaphne\wizdaphne-wiki-vue

:: 1) 重跑语义清洗（游戏更新后；读解包仓库的 out\masterdata）
python local_scripts\clean\character.py
python local_scripts\clean\job.py
python local_scripts\clean\skill.py
python local_scripts\clean\equipment.py
python local_scripts\clean\dialogue.py   :: 营地/酒馆对话（读 out\topic_digest）

:: 2) 第一轮：长键精简 -> <repo>\data
python local_scripts\clean\build_data.py

:: 3) 第二轮：短键 + API 形状 -> <repo>\public\mock
python local_scripts\clean\build_mock.py
```

`public/mock` 是生成物（`.gitignore` 已忽略）；线上则由上传脚本写进 Wiki `Data:` 页面。
`export_v2.py` / `public/data-v2` 已废弃，仅保留脚本作历史参考。

### 3.1 技能数值字段怎么读（攻略站对照）

攻略站技能页的每一行，都能在这三张表里找到来源；载荷已把需要的字段平铺到 `SkillResponse.items[].levels[]`（短键 `lv`）。

| 攻略站显示 | 载荷路径 | 解包字段 | 说明 |
|---|---|---|---|
| 分类 | `kind_name` | `Skill.skill_kind` | 1 普通攻击 / 2 攻击技能 / 3 辅助 / 4 攻击魔法 / 5 回复魔法 / 6 强化魔法 / 7 妨碍魔法 / 20 陷阱 / 90 特殊 |
| 主动 / 被动 | `is_passive` | `Skill.use_timing == 5` | 5 视为常时（被动） |
| 消耗 SP / MP | `levels[].cost` + `cost_kind` | `Skill.cost` / `cost_kind` | `1 = SP`（武器技能）、`2 = MP`（魔法/祈祷） |
| 使用次数 | `levels[].use_limit` | `Skill.use_limit` | 每场战斗可用次数（33 行有值） |
| 仇恨 | `levels[].hate` | `Skill.hate` | 技能仇恨值（1193 行有值，如 8000 / 300） |
| 射程 / 使用条件 | `levels[].range_type` / `levels[].skill_condition_ids` | `Skill.range_type` / `skill_condition_ids` | 射程：`0 近距离`、`1 中距离`、`10 远距离`、`99 依武器`；条件暂无可读枚举 |
| 最大 Lv | `max_level` | `Skill.level` 最大值 | — |
| 范围 | `levels[].damage[].target_text` | `SkillDamageEffect.skill_target_id → SkillTarget.convert_text` | 目标文案来自表内本地化 |
| 伤害种类 | `damage[].damage_type` | 同名字段 | `1 物理 / 2 魔法 / 3 无属性`（道具、卷轴、无属性技能） |
| 威力（攻击率） | `damage[].attack_rate` | 同名字段 | 百分数，120 = 120% |
| 双手威力 | `damage[].attack_rate_both_hands` | 同名字段 | 独立数值，**不是**威力 × 1.2 后四舍五入 |
| 阈值 | `damage[].valid_cap_parameter_value` | 同名字段 | 参数上限；**10000 = 无上限**（默认值） |
| 双手阈值 | `damage[].valid_cap_parameter_value_both_hands` | 同名字段 | 独立字段，同样以 10000 表示无上限 |
| 阈值起点 | `damage[].valid_start_parameter_value` | 同名字段 | 0 = 从 0 起算；200/100 等为起始阈值 |
| 会心率加成 | `damage[].add_critical_rate` | 同名字段 | 百分数，30 = +30%；**-100 = 不会心**（魔法/道具） |
| 伤害倍率修正 | `damage[].add_damage_rate` | 同名字段 | 100 = 基准；75 / 90 / 150 等调整最终伤害 |
| 固定伤害 | `damage[].fixed_damage` | 同名字段 | 不吃倍率的固定加值（卷轴 45、恢复药 55） |
| 命中 | `damage[].hit_rate` | 同名字段 | 百分数，90 = 90%；100 = 必中；0 = 无判定（自身/道具） |
| 攻击次数 | `damage[].damage_count` | 同名字段 | `99 = 依武器`（每段武器攻击一次）；1/2/3/5 为固定段数 |
| 仅一次 | `damage[].only_once` | 同名字段 | true = 多段只结算一次（102 个伤害行） |
| 攻击类型 | `damage[].attack_type` | 同名字段 | `0` 常见（1999 行）/ `1` 少见（19 行）。**语义未确认**，前端不展示 |
| 效果行（防御贯穿 / 准备状态特效 …） | `levels[].sub_effects[]` | `SkillDamageEffect.sub_effect_ids` + `SkillEffectGroup.sub_effect_ids` | 见下 |

> 判定依据：`damage_type` 的「无属性」来自恢复药 / 火球卷轴 / 镜花风月等 162 行；`add_critical_rate = -100` 与魔法、道具完全重合；`hit_rate = 0` 只出现在自身目标（`target 601`）。

**子效果（效果行）的读法**

子效果来自 `SkillSubEffect`（表名 `unk_4369adef4d`），关键字段：

| 字段 | 载荷 | 含义 |
|---|---|---|
| `kind` | `sub_effects[].kind` | 效果类型；中文名与参数标签查 `effect_kinds.json` |
| `param_1 ~ param_7` | `sub_effects[].params` | 攻略站的「数值1 ~ 数值7」，**按 kind 各自解释**，见下表 |
| `strength` | `sub_effects[].strength` | 强度；异常状态类常与 `param_2` 重复（展示时去重） |
| `turn` | `sub_effects[].turn` | 持续回合；0 = 即时，**9999 = 永久** |
| `skill_target_id` | `sub_effects[].target_text` | 该效果作用目标，可能与伤害目标不同 |
| 来源 | `sub_effects[].from` | `damage` = 挂在伤害行上（如防御贯穿）；`effect_group` = 挂在效果组上（如属性强化） |
| `calc_reference_parameter` | `sub_effects[].calc_reference_parameter` | 效果量参照的能力值（`SkillReferenceParamType`，同伤害的 `reference_parameter`） |
| `calc_reference_parameter_rate` | `sub_effects[].calc_reference_parameter_rate` | 效果量占参照能力的百分比，逐级变化（治疗 `140 → 180`） |
| `calc_valid_cap_parameter_value` / `calc_valid_start_parameter_value` | 同名字段 | 效果量阈值窗口（`100 → 800` / 起点 `0 → 100`） |
| `reference_resist` | `sub_effects[].reference_resist` | 施加率参照的抗性类型（暂无枚举，显示数字） |
| `child_sub_effect_ids` | `sub_effects[].child_sub_effect_ids` | 追加的子效果（引用 `SkillSubEffect.id`） |
| `target_race_ids` | `sub_effects[].target_race_ids` | 只对特定种族生效（种族名可读） |
| `extension_params` | `sub_effects[].extension_params` | `SkillSubEffectExtensionParam` 的扩展参数，以 sub effect id 为键，值多为别的 sub effect id |
| `child_sub_effects` / `extension_effects` | 同名字段 | 上面两个 id 列表的展开版：`{id, kind, kind_name, params, strength, turn, target, target_text, children?}`，只再展开一层 |

已确认的 `param` 语义（写进 `skill.py` 的 `PARAM_LABELS`，随 `effect_kinds.json` 输出；当前 **45 个 kind** 有标签，**122 个 kind** 有中文名）：

| kind | 名称 | param 位含义 |
|---|---|---|
| 30 | 防御贯穿 | 1: 贯穿率 % |
| 20 | 准备状态特效 | 1: 触发数值 |
| 9040 | 污损 | 1: 污损值 |
| 5010 / 5020 / 5030 | 常时 HP / MP / SP 提升 | 1: 提升 % |
| 5040 / 5050 / 5060 | 常时攻击 / 魔力 / 神力提升 | 1: 提升 % |
| 5070 / 5080 | 常时防御 / 法术防御提升 | 1: 提升 % |
| 5090 / 5100 / 5110 | 常时命中 / 回避 / 抵抗提升 | 1: 提升 % |
| 5120 / 5130 / 5140 / 5150 | 常时暴击率 / 暴击回避 / 会心率 / 会心回避提升 | 1: 提升 % |
| 5160 / 5170 / 5180 / 5190 | 常时速度 / 探知 / 陷阱解除 / 陷阱回避提升 | 1: 提升 % |
| 8110 / 8120 / 8160 | 常时智力 / 信仰 / 运气提升 | 1: 提升 % |
| 1000 / 1010 / 1060 | HP 回复 / 固定回复 / 持续回复 | 1: 回复量 |
| 150 | 种族特效 | 1: 种族 ID；2: 伤害加成 % |
| 2340 | 种族抵抗 | 1: 种族 ID；2: 伤害减免 % |
| 2500 | 属性受到伤害增加 | 1: 属性 ID；2: 伤害增加 % |
| 3000 | 防御力下降 | 1: 防御变化 %；2: 法术防御变化 % |
| 3070 | 命中下降 | 1: 命中变化 %；2: 回避变化 % |
| 2120 | 防御提升 | 1: 防御 %；2: 法术防御 % |
| 2160 | 抵抗提升 | 1: 抵抗 % |
| 2000 | 攻击力提升 | 1: 攻击 %（2 位未确认） |
| 3030 | 气绝 | 1: 发动概率 %；2: 强度 |
| 5710 | 指定装备时能力提升 | 1: 装备类别 ID；2: 属性 ID；3: 数值 |
| 6730 | 每次使用威力提升 | 1: 累积效果 ID；2: 次数 |
| 6000 | 呼叫同伴 | 1: 怪物 ID；2: 数量 |
| 5420 / 5430 / 5440 | 即死 / 暴击 / 冻结耐性变动 | 1: 耐性变化 |
| 3050 / 3190 | WT 增加 / 延长 | 1: WT 量 |

展示规则（`SkillDetail.vue`）：

- 有标签 → `标签 值`，百分比且为正 → 自动 `+`（`防御贯穿率 +50%`、`种族 ID 700 · 伤害加成 +20%`）；
- 无标签 → 保持 `数值N 值`；
- `turn = 9999` → `永久`；
- `strength` 与某个 param 值相同 → 不重复展示。

仍未知的部分：`attack_type` 的 0/1、`2000.param_2`、`strength` 的独立语义（多见于异常状态，可能与强度等级/命中修正有关）。`effect_kinds.json` 中 `labeled=false` 的 292 个低频 kind 只有日文名（Q8）。

**学习/获取**

| 攻略站显示 | 载荷 | 解包字段 |
|---|---|---|
| `Lv 3 盗贼` | `learn[] = {job, get_lv}` | `CharacterSkill.get_lv` + `CharacterSkill.job_id` |
| 来源标签（继承/固有/潜在/克己/装备…） | `sources[]` | 由 `Character` / `Equipment` / `RelicSkill` 等表反查 |

---

## 4. 前端

### 4.1 目录

```
src/api/
  dbCodec.ts            短键 -> 长键解码（CHAR/JOB/SKILL 三套 FieldSpec）
  wikiData.ts           取数：DEV 读 public/mock，线上走 Api/GetXxx；版本号
src/stores/
  wikiData.ts           数据源：Dexie(IndexedDB) + 版本比对 + 内存 refs
src/views/DataV2/
  DataV2.vue            外壳：标题栏、页签（角色/技能/武器/防具/妖精/杂物/物品/商店/遗物）、加载状态；
                        页签走 URL `?tab=`，
                        并存 `localStorage.DataV2ActiveTab`（对齐 V1 的 `tab` / `DataSearcherActiveTab`）
  dataV2Store.ts        视图层：把 decode 后的裸数据按 enums 富化成面板所需形状
  dataV2Settings.ts     过滤器持久化：所有面板的筛选条件存 `localStorage.dataV2Settings`
                        （`usePersistentRef` 单项 / `usePersistentFilter` 整组，对应 V1 的
                        `dataSearcherSettings`：character / skill / equipment / item / shop /
                        relic / junk，键名按面板分组，新增字段自动带默认值）
  types.ts              面板数据契约
  CharacterPanel.vue    角色：筛选 + 卡片网格 + 详情抽屉
  CharacterDetail.vue   角色详情：基础值/成长/才能/技能/克己/台词
  SkillPanel.vue        技能：筛选 + 表格（分页 25 条），点行打开详情弹窗
  SkillModal.vue        技能详情弹窗外壳（NModal + 标题 + 关闭）
  SkillDetail.vue       技能详情：基础信息 / 说明 / 逐级数值（转置表）/ 通用数值 / 学习来源
  EquipmentPanel.vue    装备：武器 / 防具两张列表，完全对齐 V1（类型按钮、搜索、特性/特典/妖精筛选、
                        满强化切换、红绿基准配色、分页、右键复制 {{装备}}）
  EquipmentModal.vue    装备详情：基础信息（含妖精标记）/ 特效与妖精技能描述 / 属性值（+0~+20，可叠加材质补强）/
                        材质补强（按目标阶级分组，逐次属性增量 + 小计 + 总加成）/ 加护概率
  FairyPanel.vue        妖精：妖精专用装备按套装技能 → 装备组（同阶级的主题名）→ 部位列成表，
                        普通 / 优质 / 特殊三色标记，点名字打开装备详情（对齐 V1 的「妖精」页）
```

职责边界：`wikiData` 只管「拿到正确的数据并落库」，`dataV2Store` 只管「把 id 还原成名称、把短键补成完整字段」，组件不关心数据从哪来。

技能弹窗的版式参考攻略站 `leveling-guide …/wizva/skill/<slug>/`：
**基本信息表 → 效果说明 → 逐级数值（行=项目、列=Lv）→ 通用数值（不随等级变化）→ 学习/获取**。
同一行在各等级取值一致时自动从「逐级数值」移到「通用数值」，避免出现整列重复。

### 4.2 挂载

新增 loader 配置 `src/loader/config/dataSearcherV2.ts`，当页面存在 `#data-searcher-v2` 时自动挂载：

```html
<div id="data-searcher-v2"></div>
```

- 本地开发：`index.html` 已加入该挂载点（与旧的 `#data-searcher` 并排，方便对比）。
- 线上：在与旧页面相同的位置放这个 div 即可；如需独立页面，新建 wiki 页面只放这一个元素。
- 页签通过 URL 参数 `?v2tab=character|job|skill|equipment` 记忆，避免与旧页面的 `?tab=` 冲突。

### 4.3 数据源与缓存

| 环境 | 地址 |
|---|---|
| 开发 | `${BASE_URL}mock/<Module>Response.json`（`Character/Job/Skill/Enum/Version`） |
| 线上 | `/api.php?action=lua&module=Api/Get<Module>&format=json&utf8=1` |

判定入口是 `src/util` 的 `IS_DEV`，没有额外环境变量。

首次加载流程：

```
Api/Version ──► 与 IndexedDB 里的 dataVersion 比较
                  ├─ 一致且缓存非空 → 读 IndexedDB（不发起模块请求）
                  └─ 不一致/空   → 并行拉 4 个模块 → decodeDoc → bulkPut → 内存
```

- 数据库：`wizdaphne-wiki-v2`，表 `characters / jobs / skills / meta`。
- `DB_SCHEMA_VERSION` 变化（文档结构改了）→ 整库删除重建。
- 数据版本变化 → 整库重拉（游戏数据是批量更新，行级 diff 没有收益）。
- 「重新加载」按钮调用 `store.refresh()`：清缓存后重新走上面的流程，而不是刷新页面。
- 断网且无缓存 → 页面提示「无网络，且本地没有缓存数据」；断网有缓存 → 正常展示。

---

## 5. 已知限制与后续

| 项 | 现状 | 后续 |
|---|---|---|
| 觉醒形态 | 不收录，原始行保留 | 需要时在 `export_v2.py` 去掉过滤即可 |
| 装备 | 816 条（武器 341 / 盾 51 / 头部 97 / 身体 109 / 手部 73 / 脚部 61 / 饰品 82 / 工具 2），含 0 级与强化曲线、图标名、探索三项、材质补强、图鉴编号（`CollectionEquip.list_number`；`display_type` 2 的特殊装备显示 EX，5 件无图鉴记录的为 null），以及加护概率 bonus；类型基准值 baseStat 与特典分类 / 获取途径已搬到 `Api/GetV2Extra`（人工维护数据，独立版本号）。材质补强取自解包 `EquipmentOverRankReinforce`（`over_rank_reinforce_group_id` 关联）：`over_rank[]` 每项是「目标阶级 + 阶级内次数 + 金币 + 五项累计加成」，只有低于最高阶级的 540 件有数据。特性只存技能 identification + 引用等级，名字与说明由前端查技能数据（IndexedDB）。敌人 / NPC / 剧情专用装备（`name` 无中文本地化）已排除；特典分类 `soucate` 与获取途径 `sou` 由 `Api/GetV2Equipment` 顶层 `extra`（源头是 wiki 手工维护的 `Data:EquipmentExtra.tabx`，上传脚本只追加新装备）提供，列表排序 / 特典着色 / 特典过滤器 / 杂物列表底色都靠它；中文说明 / 装备需求仍保留占位；妖精标记 `fa_can`（种族条件 10）与妖精技能 `fa_sk`（= 套装技能名）已由解包数据还原 | 图标图片托管、装备编辑与杂物来源待补 |
| 杂物 | `DataV2/junk/` 独立实现（V1 代码不改动）：官网抓包 `public/junkdata.json`（743 分类）整理出约 23 万条几率组合，装备中文名 / 阶级 / 特典取 V2 装备数据；列表、筛选、分页、右键复制模板与 V1 一致，详情弹窗改为与技能/装备同款（固定头 + 内容滚动）。整理结果写入主库 `wizdaphne-wiki-v2` 的 `junk` 表（记录写入时的 `DB_SCHEMA_VERSION`），本地有缓存时进入页面直接读取、不再请求 `Api/GetJunkData`；整库重建（schema 版本 bump）或手动刷新时缓存一并失效；详情里查看装备打开 V2 装备弹窗 | 杂物数据更新需把 `junkdata.json` 换掉并清理缓存（bump `DB_SCHEMA_VERSION` 或走一次刷新） |
| 怪物 / 地图 | 未导出 | 复用 `common.py` 与同一套导出结构 |
| 图标 / 立绘 | 未接入 | `Character.image_name` / `thumbnail_name` 已在数据里，需另跑资源管线 |
| 多语言切换 | 只展示中文 + 日英名 | 数据层已保留 `name_jp/name_en`，扩展即可 |
| 数据更新 | 手动重跑两轮脚本 → 上传（未做）→ 版本号变化后前端自动重拉 | 可做成 CI：解包 → 清洗 → 导出 → 上传 |
| 上传模块 | `update:wiki` 已支持 character / job / skill / equipment / enum，记录级页面为 `Data:<类>/<id>.json` + `dtype`；`Data:Version.json` 仍手工维护 | 按需补怪物 / 物品等新类 |
| 数据缓存 | 整库全量重拉 | 数据量大到 2 MB 以上再考虑按域分页 / 增量 |
| 效果参数语义 | 122 个 kind 有中文名，其中 45 个有 `param` 位标签；`attack_type` / `2000.param_2` / `strength` 语义未确认 | 继续按频次补剩余 292 个低频 kind（Q8） |

---

## 6. 验收清单（人工）

1. 打开带 `#data-searcher-v2` 的页面，页签「角色 / 技能 / 武器 / 防具 / 妖精 / 杂物 / 物品 / 商店 / 遗物」可切换，`?tab=` 可深链（旧的 `?v2tab=` 也兼容）。
2. 角色：95 条；筛选稀有度/种族/属性/职业、搜索中日英名、勾选「只显示基本形态」应生效；点卡片出抽屉，基础值 7 项与成长率有值；**抽屉里的固有/继承/潜在继承/克己技能标签可点击**，弹出同一个技能详情 modal。
3. 技能：默认只看可获得技能（929 条），勾选「显示敌方/测试」后 3,031 条；搜索、类型/职业/来源筛选生效；点行出**弹窗**，`精密攻击` 应与攻略站一致：消耗 5→40 SP、威力 120%→160%、双手威力 144%→192%、阈值 100→800、双手阈值 300→2400、会心率加成 +30%→+48%、防御贯穿 +50%→+80%，通用区显示 命中 90 / 攻击次数 依武器 / 准备状态特效：触发数值 1000，学习条件 `盗贼 Lv3`；防御贯穿行显示 `防御贯穿率 +50%`→`+80%`。
4. 缓存：首次打开 Network 里能看到 `mock/*Response.json`；刷新后不再请求模块文件（只请求 `VersionResponse.json`），页面直接从 IndexedDB 呈现；DevTools → Application → IndexedDB 可见 `wizdaphne-wiki-v2`。
5. `wizdaphne-wiki-vue/public/data-v2` 已不存在，页面不再请求任何 `data-v2` 路径。
6. 旧页面（`#data-searcher`）行为、数据与本改动前完全一致。
