# 05 · 两轮清洗与 Wiki API 载荷（新链路）

> 2026-10-21。目标：把解包数据整理成**可直接上传 Wiki、再由前端按版本拉取**的形态。
> 方案参考 [`data-wiki-api-indexeddb.md`](./data-wiki-api-indexeddb.md)：Wiki 存短键 JSON → `Api/GetXxx` 分页返回 → 前端 `decodeDoc` 还原 → IndexedDB / 内存缓存。
> 本轮**只做到 mock**：不写上传脚本、不改前端、不建 IndexedDB。

---

## 1. 两轮分工

```
<unpack>/out/masterdata（288 表，解包主数据）
   │  local_scripts/clean/{character,job,skill}.py      语义清洗
   ▼
local_scripts/work/clean（105 角色 / 17 职业 / 3,031 技能，长键）
   │  local_scripts/clean/build_data.py                 ← 第一轮
   ▼
<repo>/data（长键精简版：根目录总数据 + character/job/skill 子目录单条，引用只留 id）
   │  local_scripts/clean/build_mock.py                 ← 第二轮
   ▼
<repo>/public/mock（短键 + API 响应形状，供 DEV / 上传使用）
```

输入只有 `out/masterdata` 还留在解包仓库：路径写在 `local_scripts/clean/common.py`
（`WIZDAPHNE_UNPACK` / `WIZDAPHNE_MASTERDATA` 环境变量可覆盖），其余全部在本仓库内完成。

| 轮次 | 脚本 | 输出 | 特点 |
|---|---|---|---|
| 第一轮 | `build_data.py` | `wizdaphne-wiki-vue/data/` | 长键、**一条记录一个对象**（列表 + 详情合并）、总数据在根目录 + 单条在子目录、引用只留 id |
| 第二轮 | `build_mock.py` | `wizdaphne-wiki-vue/public/mock/` | 短键、`{items,count,page,limit}`、**按值省略**（0 / `""` / `false` / 空数组） |

两轮都**直接覆盖文件，不删除目录**：编辑器的「安全删除」会拦截 `rmtree`，而每次生成都是全量覆盖，无需清空。
`data/` 与 `public/mock/` 都是生成物，**均不入库**（`.gitignore`）。

---

## 2. 第一轮：`data/`（长键精简版）

### 2.1 目录

```
data/
  meta.json                       schema 版本、生成时间、各域数量、管线说明
  enums.json                      全部 id → 名称字典（见 2.3）
  excluded.json                   9 觉醒 + 1 占位（备查）
  characters.json                 ← 总数据：95 条（列表字段 + stats/talent/skills/voice）
  jobs.json                       ← 总数据：17 个职业
  skills.json                     ← 总数据：3,031 条（技能字段 + 描述 + 逐级数值）
  effect_kinds.json               414 种子效果类型
  character/<id>.json             ← 单条角色，便于在编辑器里单独打开
  job/<id>.json                   ← 单条职业
  skill/<identification>.json     ← 单条技能
```

| 文件 | 体积 |
|---|---|
| `characters.json`（总） | 1.85 MB |
| `skills.json`（总） | 7.45 MB |
| `jobs.json`（总） | 44 KB |
| `effect_kinds.json` | 63 KB |
| `enums.json` | 16 KB |
| `character/*.json`（95 个） | 合计 ≈ 1.9 MB |
| `job/*.json`（17 个） | 合计 ≈ 45 KB |
| `skill/*.json`（3,031 个） | 合计 ≈ 4.6 MB |

**总数据放根目录**用于整体检索 / 后续脚本读取；**子目录放单条**用于人工查看（打开 `skill/111000000.json` 就是完整的一条精密攻击）。
子目录只覆盖写、不清空：条目减少时旧文件会残留，需要时手动删除。

**列表与详情不再分开**：一条角色 = 基础信息 + 属性/才能/技能/台词；一条技能 = 名称/类型/来源 + 描述 + 全部等级数值。这样按 id 查一次即可，不需要前端再 join 两个接口。

### 2.2 省字段规则（第一轮）

原则：**能用一个 id 定位的，就不要存对象；能由 id 查表的，就不要存文案。**

| 原字段 | 现在 | 解析方式 |
|---|---|---|
| `rarity: {id, name, name_jp, name_en}` | `rarity: 300` | `enums.rarity["300"].name` |
| `race / attribute / gender / personality / grade` 对象 | 数字 id | 对应 `enums.*` |
| `alignment: {id, name: "evil", point}` | `alignment: 3` + `align_point: 0` | `enums.alignment` = 善/中立/恶 |
| `jobs: [{id, name, name_jp, name_en, primary}]` | `{id, primary}` | `enums.job` |
| `fate: {identification, name..., type}` | `fate: 193015001` | `skill/skills.json` |
| `kind_name: "攻击技能"` | 删掉，只留 `kind: 2` | `enums.skill_kind` |
| `damage[].target_text: "1名敌人"` | 删掉，只留 `target: 901` | `enums.target` |
| `sub_effects[].kind_name` | 删掉，只留 `kind` | `effect_kinds.json` |
| 角色 `skills.unique/inherit/...` 带名称 | 只留 `identification` | `skill/skills.json` |
| 角色 `style: {caption:{...}, is_default, ...}` | `style: "基本"` + `default: true` | 觉醒信息在 `excluded.json` |
| 角色 `names: {ja,zhs,zht,en}` | 删掉 | 已有 `name/name_jp/name_en` |
| 职业 `skills[].name*` | 只留 `{id, get_lv}` | `skill/skills.json` |
| `sub_effects[].params: [1000,0,0,0,0,0,0]` | 尾部 0 截断 `[1000]` | 位置语义保留，缺省即 0 |

仍然保留的"长文本"：角色名三语、技能名三语、技能描述、台词（中文优先，缺失时用 `*_lang` 标记回退语言）。

### 2.3 `enums.json`

```jsonc
{
  "rarity":      { "300": { "name": "传说的冒险者", "name_jp": "伝説の冒険者", "name_en": "Legendary Adventurer" } },
  "grade":       { "1": { "name": "无阶", ... } },          // 全量 12 档
  "race":        { "1": { "name": "人类", ... } },          // 8 种（角色实际引用）
  "attribute":   { "1": { "name": "火", ... } },            // 全量 8 种
  "gender":      { "1": { "name": "男", ... } },
  "personality": { "2": { "name": "熱血", ... } },          // 缺 zhs 时回退 ja
  "job":         { "100": { "name": "战士", ... } },        // 全量 17
  "target":      { "901": { "name": "1名敌人", ... } },     // 技能实际引用的 96 种
  "alignment":   { "1": "善", "2": "中立", "3": "恶" },      // 写死
  "skill_kind":  { "2": "攻击技能", ... },                   // 写死
  "cost_kind":   { "1": "SP", "2": "MP" },                   // 写死
  "damage_type": { "1": "物理", "2": "魔法", "3": "特殊" },   // 写死
  "use_timing":  { "2": "战斗中", "5": "常时" }               // 仅已验证的值
}
```

> 名称字典跟随版本变化（新角色稀有度、新职业）由脚本全量重生成，**不要**在前端硬编码整份字典；前端只在"字典缺项"时兜底显示 `#id`。

---

## 3. 第二轮：`public/mock/`（Wiki API 形状）

### 3.1 产物

| 文件 | 对应接口 | 条数 | 体积 |
|---|---|---|---|
| `CharacterResponse.json` | `Api/GetV2Character` | 95 | 816 KB |
| `JobResponse.json` | `Api/GetV2Job` | 17 | 26 KB |
| `SkillResponse.json` | `Api/GetV2Skill` | 3,031 | 2.34 MB |
| `EquipmentResponse.json` | `Api/GetV2Equipment` | 816 | 1.41 MB |
| `EnumResponse.json` | `Api/GetV2Enum` | 1（对象包） | 41 KB |
| `ExtraResponse.json` | `Api/GetV2Extra` | 6 块（人工表） | 94 KB |
| `VersionResponse.json` | `Api/Version` | — | <1 KB |

每个模块一条记录即完整文档（角色含 stats/talent/skills/voice，技能含描述与全部等级数值），不再有 `*Detail` 接口。

统一包装：

```jsonc
{ "items": [ /* 短键文档 */ ], "count": 3031, "page": 1, "limit": 10000 }
```

`VersionResponse.json` 例外，只有一个字段：

```jsonc
{ "version": 2610220857 }
```

`version` 用 `yymmddHHMM`（10 位）。只用于「版本变化 → 整体失效重拉」：不带 `schema_version`，也不带 `generated_at`，缓存结构版本由前端常量 `DB_SCHEMA_VERSION` 单独管理。

### 3.2 编码规则（与 `dbCodec` 一致）

| kind | 规则 | decode 默认 |
|---|---|---|
| `num` | `0` 不写 | `0` |
| `str` | `""` 不写 | `""` |
| `bool` | 仅写 `1`（Wiki 存储层原为 `true`→空串；mock 用 `1` 更短） | 键存在即 `true` |
| `numArr` / `strArr` | 空数组不写 | `[]` |
| `numMap` | 值为 `0` 的键省略 | 取值时 `?? 0` |
| `obj` | 编码后为空则不写 | 结构缺省 |
| `objArr` | 空数组不写；元素编码后为空则丢弃 | `[]` |
| `raw` | 原样写（id 可能超出 JS 安全整数） | 原值 |

> 角色 / 技能 id 最大到 `901100720000`，仍在 `Number.MAX_SAFE_INTEGER` 内，用 `raw` 存数字即可；将来出现超长 id 再改字符串。

`build_mock.py` 内置两项自检：

1. **短键唯一性**：合并后的 spec 里同一个短键只能出现一次（列表与详情合并后最容易撞键，`style`/`stats` 就撞过，故 `style` 用 `sty`）；
2. **往返稳定**：每条记录执行 `encode → decode → encode`，必须与第一次编码完全相等，否则直接抛错（防止 spec 漏字段）。

> **线上 Lua 序列化陷阱**：Scribunto 返回 table 时，**从 1 开始的连续整数 key 会被编码成数组**。
> `EnumResponse` 里的 `alignment` / `cost_kind` / `damage_type` 正好是 `{1:…,2:…,3:…}`，
> 到线上会变成 `["善","中立","恶"]`。`src/stores/wikiData.ts` 的 `normalizeEnums()` 在
> 下载落库、读缓存时统一还原成 `{"1": …}`（数组下标 0 = key 1），所以生成侧不用改格式，
> DEV 的 mock（本来就是对象）原样透传；`skill_kind` / `use_timing` 等 key 不连续，线上仍是对象。

### 3.3 短键表（节选）

角色 `CharacterResponse.items[]`：

| 短键 | 长键 | 类型 |
|---|---|---|
| `i` | id | raw |
| `g` | group | num |
| `n` | guide_no | num |
| `zh` / `jp` / `en` | name / name_jp / name_en | str |
| `sty` | style | str（`st` 已被 stats 占用） |
| `d` | default | bool |
| `r` / `ra` / `at` / `ge` / `pe` / `gr` / `al` / `ap` | rarity / race / attribute / gender / personality / grade / alignment / align_point | num |
| `jo` | jobs | objArr `{i, p}` |
| `fa` | fate | num |
| `st` | stats `{b,g,p,r}` | obj |
| `ta` | talent `{i,lo,hi}` | obj |
| `me` / `gr` | mental / grade | num |
| `sk` | skills `{u,ih,pt,dc,sm,ex,gl}` | obj |
| `im` / `vo` | images / voice | obj |

技能 `SkillResponse.items[]`：

| 短键 | 长键 | 类型 |
|---|---|---|
| `i` / `zh` / `jp` / `en` | id / name / name_jp / name_en | raw / str |
| `k` / `ml` | kind / max_level | num |
| `p` / `pl` / `t` / `l0` | passive / player / test / level0 | bool |
| `s` / `j` | sources / jobs | strArr / numArr |
| `d` / `d2` / `dl` | description / detail_description / description_lang | str |
| `jl` / `el` / `tg` | job_limited / equipment_limited / tags | numArr |
| `ln` | learn `[{j, l}]` | objArr |
| `lv` | levels | objArr |
| `lv[].l` / `c` / `ck` / `ut` / `ul` / `ht` / `rt` | level / cost / cost_kind / use_timing / use_limit / hate / range_type | num |
| `lv[].cd` | skill_condition_ids | numArr |
| `lv[].dm` | damage `[{ar,a2,ad,cr,vc,v2,vs,at,dt,fd,hr,dc,oo,tg}]` | objArr |
| `lv[].sb` | sub_effects `[{k,p,s,t,g,f,rp,rr,as,ac,fa,ir,cp,c2,cq,c3,cc,cv,rs,ch,tr,xp,cs,xe}]` | objArr |
| `lv[].sb[].cs` / `xe` | 被引用 sub effect 的摘要 `[{i,k,kn,p,s,t,g,gt,cs}]`（第二层 `cs` 为叶子，不再嵌套） | objArr |

装备 `EquipmentResponse.items[]`：

| 短键 | 长键 | 类型 |
|---|---|---|
| `i` / `zh` / `jp` / `en` | id / name / name_jp / name_en | raw / str |
| `c` / `ty` | category（武器/盾/头部/身体/手部/脚部/饰品/工具）/ type | str |
| `ti` / `pt` / `r` | type_id / part / rank | num |
| `el` / `eln` | element / element_name（1 火 … 6 暗） | num / str |
| `sp` | special（特典装备） | bool |
| `nt` / `rm` | note（客户端日文备注）/ reinforce_max | str / num |

| `li` / `ic` | list_icon（列表小图）/ icon（背包大图）；均为去掉 `.png` 的资源名，空格→`_`、连续 `_` 合并（wiki 标题规则） | str |
| `so` | soucate 特典分类（9 = 特典，0 = 普通）：已搬到 `Api/GetV2Extra.equipmentExtra`（源头是 wiki 手工维护的 `Data:EquipmentExtra.tabx`），前端按装备 id 合并；用于列表排序、特典着色、特典过滤器、杂物列表排序与底色。旧数据页里仍带着这一列时按兜底处理 | num |
| `su` | sou 获取途径：同样来自 `equipmentExtra`。页面里一行一个字符串、多个来源用 `;` 连接，接口拆成数组；详情里按 wiki 文本渲染（支持 `[[页面|文字]]`） | strArr |
| `d` / `rq` | desc（中文说明）/ req（装备需求）；解包与接口都没提供，恒为空（占位） | str / strArr |
| `fc` | fa_can 妖精标记：0 不适用（妖精能穿但发挥不出性能）/ 1 可用 / 2 专用。取自解包 `Equipment.conditions_*` 的种族条件（条件 `10` 的种族列表：只有妖精 `6` → 2，含妖精也含别的种族 → 1，没有种族条件 → 0；`CharacterSpecies` 6 = 妖精） | num |
| `fs` | fa_sk 妖精技能 = 套装技能名（`EquipSetSkillContents` → `EquipSetSkills` → `Skill`），多个用「、」连接；没有套装技能为空 | str |
| `fd` | fa_sk_desc 妖精技能说明（套装技能 1 级说明，中文；各等级只差开头的「套装技能LvN」） | str |
| `jl` / `rl` | job_limited / race_limited 装备条件：`Equipment.conditions_*` 里类型 9（职业）/ 10（种族）允许的 id 列表（两个槽位合并去重，空 = 无限制；例：圣骑士之盾 = `[104]` 骑士，遗志小盾 = 职业 `[108]` + 种族 `[1,2,3,4,6]`） | numArr |
| `lv` | levels `[{l, at, c, mg, …}]`：强化曲线，每个等级一行「完整数值」（含不变化的攻击次数 `c`），只输出与 +0 不同的等级 | objArr |
| `bn` | bonus `[[…],[…],[…],[…]]`：加护概率 4 槽 × 19 属性，来自 `Api/GetV2Equipment` 顶层 `bonus` | numArrArr |
| `st` / `mx` | stats / max_stats `{at,c,mg,dv,df,md,sp,ac,sr,ev,rs,dt,dp,et}`；`dt` / `dp` / `et` = 探知 / 陷阱解除 / 陷阱回避，取自 `EquipmentParam` 的 `detection_base` / `trap_remove_base` / `trap_avoid_base`，和别的属性一样进 `lv` 强化曲线（只有手套 / 面具 / 饰品等少数装备有） | obj |
| `sk` / `tr` | skills（装备类型特性）/ traits（非装备类型特性）`[{i, l?, zh?, d?}]`：技能引用只有 identification + 等级 `l`（1 级不显示），名字与说明由前端查技能数据。`EquipmentLockConfig` 只保留 10 条游戏里没有对应技能的展示型特性（火水风土光暗属性 / 力量适应+ / 力量适应- / 抗不死 / 抗岩石），带名字 `zh`（`LOCK_CONFIG_NAME` 覆盖游戏内显示名）与手写说明 `d`（`equipment.py` 的 `LOCK_CONFIG_DESC`），前端不可交互；其余 lock config（都是已有技能的别名）一律隐藏 | objArr |
| `ss` | set_skills `[{i,si,sn,rc,ml,al}]` | objArr |

`st` 的键：`at` 攻击 / `c` 攻击次数 / `mg` 魔力 / `dv` 神力 / `df` 防御 / `md` 魔防 / `sp` 速度 / `ac` 命中 / `sr` 会心 / `ev` 回避 / `rs` 抵抗 / `dt` 探知 / `dp` 陷阱解除 / `et` 陷阱回避；`mx` 是「基础值 + 强化组在 `reinforce_max` 的值」的推算值。

装备只排除两类：游戏里不存在的测试行（`残旧苦无` / `残旧之刃`），以及 `name` 没有中文本地化的敌人 / NPC / 剧情专用装备 —— 解包里这类 `name` 不是 `{ja, zhs, …}` 而是纯日文字符串（如 `短剣（陽炎の忍者用）`），判定见 `equipment.py` 的 `has_cn_name()`。

`Api/GetV2Extra.equipmentBaseStat`（长键、不压缩）是装备类型的基准值：类型 -> 基准值 + 排序序号 `i`
（`{ "短剑": { "i": 1, "c": 2, "spe": 4, "acc": 15, "eva": 2 } }`，`-1` 表示该属性不参与比较）。
它来自 `config/EquipmentApi.json`（线上 `Api/GetV2Equipment` 响应的本地备份，与 `bonus`
同一个文件；`bonus` 仍并进每件装备的 `bn`），列表用它做红绿配色；`i` 同时决定类型按钮的顺序（< 100 武器，>= 100 防具）。

### 3.5 加护：单文件（不走这两轮）

哈肯的加护只有 143 条，也没有按 id 单独查询的需求，所以 `blessing.py` **直接**写
`public/blessing.json`（约 85 KB，长键，入库）：不进 mock 打包、不拆记录页、
不进 IndexedDB，也不做 Lua 接口 —— 前端一次 `fetch` 读完，线上取 `Data:Blessing.json`
的原文（`?action=raw`）。

| 键 | 内容 |
|---|---|
| `generatedAt` / `count` | 生成时间 / 条数 |
| `stats` | `{能力值 id: 名称}`：kind 7000 的 `params[0]`。解包里没有这张枚举表，id 由加护 / 技能描述反推（4 攻击力、5 防御力、6 魔力、7 法术防御力、8 神力、9 命中、10 回避、11 抵抗、12 会心、14 行动速度、16 陷阱解除、17 陷阱回避） |
| `species` / `attributes` | `{EnemySpecies id: 名称}` / `{Attribute id: 名称}`，只收这份数据用得到的几个 |
| `groups` | `{group_id: {"layers": [楼层名]}}`：加护组没有名字，靠 `DungeonWedge.blessing_group_id` → `dungeon_floor_move_id` → `DungeonFloorMove.name` 反查（`20001` = 「B2F -圣堂-」；古城遗迹的 `6000001` 对应 4 个「小哈肯」层） |
| `items[].id` / `name` / `name_jp` / `name_en` / `description` | `HakenBlessing` 基本字段（`description_lang` 只在说明回退到日 / 英时出现） |
| `items[].group` / `pool` / `tier` | `group_id` 与拆出来的「主题池 + 档位」（`group = pool * 10 + tier`） |
| `items[].rarity` / `weight` | 稀有度（0-3）/ 抽取权重 |
| `items[].effects[]` | `{kind, kind_name, params, turn, strength}`：`kind_name` 是日文种类名（兜底显示），`params` 是 `param_1..N`（末尾 0 已去掉，位置不能错） |

效果参数按 `kind` 解释：`7000` 加護（`params[0]` → `stats`，`params[1]` = 加成 %）、
`150` 种族特效 / `2340` 种族抵抗（`params[0]` → `species`，`params[1]` = 伤害 %）、
`2363` 属性攻击伤害提升（`params[0]` = 伤害 %，`params[1]` → `attributes`）；
其余（各种耐性变动等）只有数值，直接用 `kind_name` 显示。

同一份数据还会生成 wiki 词条「哈肯」的四张表（白 / 绿 / 蓝 / 紫加护）：
`yarn update:haken -- --dry-run` 只写预览 `local_scripts/work/haken.wiki`，
不带参数则登录后替换词条里两个标记之间的内容（只动 `===白加护===` 起的四节）。
效果名/参数名取 `ExtraResponse.json` 的 `effectKinds`（= `Data:EffectKind.json`），
wiki 上仍为日文的条目在脚本的 `KIND_NAMES` 里兜底成中文。

## 4.x 人工维护数据（`Api/GetV2Extra`）

解包数据之外的「人工表」集中在一个模块里，带独立版本号（`Api/Version` 的 `extra`），
改动只需要重传这一个模块、前端也只重拉它：

| 字段 | 内容 | 来源 |
|---|---|---|
| `effectKinds` | 效果种类名 + 参数名 | wiki `Data:EffectKind.json` |
| `equipmentBaseStat` | 装备类型基准值 | `config/EquipmentApi.json`（抓包备份） |
| `equipmentExtra` | 装备特典分类 / 获取途径 `[{id, soucate, sou}]` | wiki `Data:EquipmentExtra.tabx` |
| `relicExtra` | 遗物掉落怪物 / 推荐类别 `[{id, monster_id, c}]`（`id` = 物品图鉴编号） | `config/Data_遗物酒.xlsx` |
| `relicCategory` | 遗物推荐类别可选项与顺序 | 同上 |
| `characterExtra` | 角色卡池组 / 上线日期 / 声优 | `config/Data_CharacterExtra.tabx.xlsx` |

前端在 `src/stores/wikiData.ts` 里把这几块单独存进 IndexedDB 的 `meta`（`extraVersion` +
六个键），版本变化时只调 `refreshExtra()`；解包表（角色 / 技能 / 装备 / 道具 …）一条都不动。

`sub_effects[].f` 取值 `"d"`（damage 行挂载）/ `"g"`（effect group 挂载）/ `"a"`（attack_start 攻击前挂载），decode 还原为 `damage` / `effect_group` / `attack_start`。

角色 `pg` = `potential_grade`（潜在继承解锁等级），职业 `ci` = `change_items` `[{i,q,g}]`，效果种类（EnumResponse，不压缩）额外带 `invalid_kinds` / `remove_kinds`。

`EnumResponse.json` 里的 `effect_kind` 字典同时带有 `params`（`param_1..7` 的位标签），前端据此把 `params` 渲染成
`防御贯穿率 +50%`，不参与短键压缩。字段语义见 `04-data-v2.md` §3.1。

完整 spec 以 `local_scripts/clean/build_mock.py` 顶部常量为准（`CHAR` = `CHAR_LIST` + `CHAR_DETAIL`，`SKILL` = `SKILL_LIST` + `SKILL_DETAIL`，以及 `JOB` / `DAMAGE` / `SUB_EFFECT` / `LEVEL`）。

### 3.4 体积对照（不含加护的单文件，见 3.5）

| 口径 | 长键（旧 `public/data-v2`） | 第一轮 `data/` | 第二轮 mock |
|---|---|---|---|
| 技能数据 | 9.7 MB（3,031 个文件） | 4.36 MB（1 个文件） | 2.16 MB |
| 角色数据 | 2.2 MB（95 个文件） | 1.85 MB（1 个文件） | 773 KB |
| 全部数据 | ~13 MB | ~6.3 MB | **2.94 MB** |

---

## 4. 生成命令

```bat
cd /d D:\WizardyDaphne\wizdaphne-wiki-vue

:: 0) 前置：语义清洗（游戏更新后重跑，读解包仓库的 out\masterdata）
python local_scripts\clean\character.py
python local_scripts\clean\job.py
python local_scripts\clean\skill.py
python local_scripts\clean\dialogue.py   :: 营地/酒馆对话（读 out\topic_digest）

:: 0.5) 单文件（不用跑下面两轮）：哈肯的加护 -> <repo>\public\blessing.json
python local_scripts\clean\blessing.py

:: 1) 第一轮：长键精简 → <repo>\data
python local_scripts\clean\build_data.py

:: 2) 第二轮：短键 + API 形状 → <repo>\public\mock
python local_scripts\clean\build_mock.py

:: 可选：换输出位置
python local_scripts\clean\build_data.py --out D:\tmp\data
python local_scripts\clean\build_mock.py --data D:\tmp\data --out D:\tmp\mock
```

两个脚本都只 `open(..., "w")` 覆盖同名文件，不 `rmtree`、不清目录。

---

## 5. 尚未做的部分

| 项 | 状态 | 说明 |
|---|---|---|
| 上传脚本（mock → `Data:` 页面） | **已完成** | `local_scripts/wiki/uploadDataToWiki.ts`（`yarn update:wiki`）：记录级 `Data:Character|Job|Skill|Equipment/<id>.json` + `dtype`，单条目 `Data:Enum.json`；`Data:Version.json`、`Data:EffectKind.json` 不由脚本维护（后者在 wiki 上手工改）；增量缓存为 sqlite（`D:\WizardyDaphne\workspace\wikitext.sqlite`）。装备类跑完会再同步 `Data:EquipmentExtra.tabx`：先拉线上页面，只把本地有、页面上没有的装备**追加**进去（已有行不动、页面解析失败直接跳过），`--dry-run` 只打印会追加哪些 id |
| `Api/GetXxx` lua 模块 | 未做 | 按 `dtype` 从 `mw.huiji.db` 取对应 `Data:` 条目，包成 `{items,count,page,limit}`；单条目页直接读 `Data:Enum.json` / `Data:Version.json` |
| 前端 `decodeDoc` / `DOC_SPECS` | **已完成** | `src/api/dbCodec.ts`（CHAR / JOB / SKILL / EQUIP 四套 spec，与本文 §3.3 一致） |
| IndexedDB 缓存层 | **已完成** | `src/stores/wikiData.ts`（Dexie，版本比对 + 整库重拉），`DataV2` 已切到该数据源 |
| 多语言 | 只中文 + 日英名 | 描述/台词缺中文时用 `*_lang` 标记 |

---

## 6. 验收清单

1. `python local_scripts\clean\build_data.py` 输出 `95 characters (+10 excluded), 17 jobs, 3031 skills, 414 effect kinds`。
2. `data/characters.json` 中随便一条：既有 `stats/talent/skills/voice`，也有 `rarity/race/...` 数字，`jobs` 只有 `{id, primary}`。
3. `data/enums.json` 的 `grade` 有 12 项、`job` 有 17 项、`target` 有 96 项。
4. `data/skills.json` 中精密攻击（`id: 111000000`）同时有 `name/kind/sources` 和 `description/levels`。
5. 子目录条数与总数一致：`data/character/` 95 个、`data/job/` 17 个、`data/skill/` 3,031 个、`data/equipment/` 816 个，且 `data/skill/111000000.json` 是单条对象。
6. `python local_scripts\clean\build_mock.py` 输出 6 个文件且不抛异常（短键唯一性 + 往返自检）。
7. `public/mock/SkillResponse.json` 的形态是 `{items,count,page,limit}`，`count` = 3031；精密攻击首级为
   `{"l":1,"c":5,"ck":1,"ut":2,"dm":[{"ar":120,"a2":144,"ad":100,"cr":30,"vc":100,"v2":300,"dt":1,"hr":90,"dc":99,"tg":901}],"sb":[{"k":20,"p":[1000],"g":901,"f":"d"},{"k":30,"p":[50],"g":901,"f":"d"}]}`
   （`vs`、`fixed_damage`、`only_once` 为 0/false 已省略）。
8. `public/mock/CharacterResponse.json` 的首条同时有 `sty: "基本"` 与 `st: {b,g,p,r}`（两者不会互相覆盖）。
9. 重复执行两轮脚本，除 `meta.json` / `VersionResponse.json` 的 `version` 时间戳外，其余文件内容完全一致（幂等）。
