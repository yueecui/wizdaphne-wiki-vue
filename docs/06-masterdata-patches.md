# 06 · 官方主数据「配错表」的修正补丁

> 适用对象：改清洗链路的人（`local_scripts/clean/`）。
> 一句话：官方 MasterData 偶尔把 A 技能的行写进 B 技能的 `identification`，清洗按 identification 归组后，
> 两行被并成一个技能、名字与说明只取到第一行 —— 这里记录怎么发现、怎么补、补在哪。

---

## 1. 问题类型

清洗（`skill.py`）以 **identification** 为键把 `Skill` 表的多行（每个 level 一行）归成一个技能：

```python
by_ident[skill_identification(r)].append(r)             # 归组（补丁在这里生效）
base = next((r for r in rows if level >= 1), rows[0])   # 名字 / 说明只取第一行
```

官方表正常时，同一 identification 下的行只是「同一技能的 Lv1…LvN」。但偶尔会把**另一个技能**的行也塞进同一个
identification、且 level 相同，于是：

- 技能条数比应有的少（每并进一行少 1 条）；
- 名字、说明取到排序后的第一行 → 另一个技能**顶着别人的名字和说明**；
- 装备 / 怪物引用的是**行 id**（`Skill.id`），查表拿到的是被写错的那个 identification，所以它在装备页也显示成别人的技能。

## 2. 怎么发现

症状一般在「装备 / 怪物的技能列表」上被发现：某个技能的名字和说明明显不属于它。

数据侧判别：`Skill` 表里同一个 `identification` + 同一个 `level` 出现多行，且 `name.ja` 不同。扫描命令：

```powershell
cd D:\WizardyDaphne\WizardyDaphneUnpack\out\masterdata
$env:PYTHONIOENCODING='utf-8'
python -c "import json,collections;sk=json.load(open('Skill.json',encoding='utf8'));nm=lambda r:(r.get('name') or {}).get('ja') if isinstance(r.get('name'),dict) else r.get('name');c=collections.defaultdict(list);[c[(r['identification'],r.get('level') or 0)].append(r) for r in sk];[print(k,[(x['id'],nm(x)) for x in v]) for k,v in c.items() if len(v)>1 and len({nm(x) for x in v})>1]"
```

再用引用方交叉验证：`Equipment.standard_skill_ids` / `attack_skill_id`、`EquipSetSkills.skill_identification` 写的是
**行 id**，把它和行里被写错的 identification 一比就知道该改成什么。

## 3. 补丁的位置

`local_scripts/clean/common.py` 的 `skill_identification(row)` 统一取值，
`skill.py` 归组、`equipment.py` 解析 `standard_skill_ids`、`item.py` / `enemy.py` 都用它。优先级：

1. `SKILL_IDENT_FIXES`（`{Skill.id: 真正的 identification}`）—— 手工条目，
   自动规则覆盖不到的情况（目前只有 6 种回复药 `101001000`）才写这里；
2. `auto_split_skill_idents()` —— 装备引用的**被动**技能自动拆分（见 §3.1）；
3. 表里写的 `identification`。

> 不改 `out/masterdata`（每次解包都会被覆盖），也不在前端打补丁 —— 修正放在清洗入口，产物天然正确。

### 3.1 自动规则：装备引用的被动技能（`auto_split_skill_idents()`）

装备特性是「一件装备一条被动」，官方表却常把多件装备的行塞进同一个
`identification`，于是装备页显示成别人的特性。这类问题不再逐条写补丁，
由下面三个条件同时成立时自动拆：

1. **冲突**：同一 `identification`、同一 `level` 出现多行且 `name.ja` 不同；
2. **装备引用且被动**：组内至少一行被 `Equipment.standard_skill_ids` /
   `attack_skill_id` 引用，且 `Skill.use_timing ∈ (1, 5)`；
3. **玩家侧没有按 ident 引用**：`Character`（继承 / 潜在 / 固有 / same / exclude）、
   `CharacterSkill`、`GuestCharacterSkillGroup`、`FateCharacterStatuses`、
   `CharacterSelfRestraintSkill`、`SkillInheritance`、`SkillGroup`、`EquipSetSkills`、
   `FateAdditionalSkills`、`RelicSkill` 里都没有写这个 ident —— 否则拆开会让引用指错技能。

拆分方式：`id == identification` 的原主行保留原 ident；与原主**同名**的多级行
（如「混乱 Lv1-5」）也留在原 ident；每个**名字不同**的外来组统一落到该组首行
（最低等级那行）的行 id，多级外来技能仍是一条。

`use_timing` 必须同时认 `1` 和 `5`：装备特性区（`5xxxxx`）两种写法都有 ——
`56167101 庇护能手` 是 `5`，`56167401 献身驱魔` 是 `1`，只看 `5` 会漏掉后者。

### 已归档的条目

### 已归档的条目

**装备特性组：已由 §3.1 自动规则覆盖**（原来的 7 条手工补丁已从 `SKILL_IDENT_FIXES` 删除）：

| 原 identification | 拆出的技能（行 id = 新 ident） | 引用装备 |
|---|---|---|
| 53100401 | 56162501 剑鬼的诅咒 / 剣鬼の呪い | 206000700 妖刀鬼之岛 |
| 56164101 | 56164201 高效调和 / 効率調合 | 104100430 调药棒 |
| 56165001 | 56165101 暗属性强化 / 闇属性強化 | 200100730 深渊使者 |
| 56165801 | 56165901 校正射击、56166001 探知·陷阱解除·攻击力持续提升、56166101 熟习弓 | 205100430 陨星巨弓 / 500101830 星王外套 / 601101130 陨铁之射击护手 |
| 56167101 | 56167201 范围法术理解 / 範囲魔術理解 | 203101330 哈欠法杖 |
| 56167401 | 56167501 范围法术强化 / 範囲魔術強化 | 203101330 哈欠法杖（56167401 献身驱魔 / 献身の魔除け 留给 701100830 善报护腿） |

**仍需手工补丁的条目**（`SKILL_IDENT_FIXES`）：

| `Skill.id` | 表里写的 identification | 正确 identification | 技能 | 引用方 |
|---|---|---|---|---|
| 10100100000 | 101001000 | 10100100000 | 薬草 / 药草 | `Expendables` 30000000「药草」 |
| 10100100003 | 101001000 | 10100100003 | 傷薬 / 创伤药 | `Expendables` 30000001「创伤药」 |
| 10100100010 | 101001000 | 10100100010 | 上傷薬 / 高级创伤药 | `Expendables` 30000010「高级创伤药」 |
| 10100100020 | 101001000 | 10100100020 | 特上傷薬 / 特级创伤药 | `Expendables` 300000020「特级创伤药」 |
| 10100100030 | 101001000 | 10100100030 | 究極傷薬 / 究极创伤药 | `Expendables` 300000030「究极创伤药」 |
| 10100100040 | 101001000 | 10100100040 | 治癒秘薬 / 治愈秘药 | `Expendables` 300000040「治愈秘药」 |

> 消耗品走 `Expendables.content_id`（= `Skill.id`）引用，不属于装备、也不是被动，
> 自动规则管不到，所以这 6 条只能手工列。
> 同一个 identification 下最多塞了 4 个不同技能（56165801），所以「一条补丁 ≠ 一条 identification」：
> 补丁键是 **`Skill.id`**，一行一条。

### 案例：56167101 / 56167201

`Skill.json` 里 identification = 56167101 有两行，都是 level 1：

| `Skill.id` | identification | 名字（ja / zh） | 效果组 |
|---|---|---|---|
| 56167101 | 56167101 | 庇護巧者 / 庇护能手 | `passive_skill_effect_group_ids = [56167101]` |
| 56167201 | 56167101 ❌ | 範囲魔術理解 / 范围法术理解 | `skill_effect_group_ids = [56167201]` |

- 第二行自己的效果组是 56167201，装备 203101330 的 `standard_skill_ids` 里写的也是 **56167201** —— 正确 identification 就是它自己的行 id。
- 修复前：`skills.json` 只有一条 56167101，名字 / 说明取第一行（庇护能手）；第二行的说明只能落在 `skill_levels["56167101"][1].description`。
  装备侧 `skill_rows.get(56167201)` 命中这一行后取 `row["identification"]` = 56167101 → 装备页也显示「庇护能手」。
- 修复后：`skills.json` 多出 56167201（范围法术理解，带自己的说明与效果组），56167101 只剩一行；
  装备 203101330 的 `skills` 变为 `[{56167401}, {56166201}, {56167201}, …]`。

### 案例：56164101 / 56164201

同一形态的第二例，两行也都是 level 1：

| `Skill.id` | identification | 名字（ja / zh） | 效果组 |
|---|---|---|---|
| 56164101 | 56164101 | 慧眼の祝福（両手剣）/ 慧眼之祝福（双手剑） | `skill_effect_group_ids = [56164101]` |
| 56164201 | 56164101 ❌ | 効率調合 / 高效调和 | `skill_effect_group_ids = [56164201]` |

- 装备 104100430「调药棒」的 `standard_skill_ids` 写的是 **56164201**。
- 修复前：调药棒的特性显示成「慧眼之祝福（双手剑）」——一件调药棒挂着双手剑的命中加成。
- 修复后：56164201 独立成条（高效调和），56164101 保留「慧眼之祝福（双手剑）」。

### 案例：56165801（一个 identification 塞了 4 个技能）

identification = 56165801 下有 4 行、全是 level 1，各属不同装备：

| `Skill.id` | 名字（ja / zh） | 引用装备 |
|---|---|---|
| 56165801 | 常時器用さダウン / 灵巧持续降低 | 700001000 踉跄凉鞋 |
| 56165901 | 修正射撃 / 校正射击 | 205100430 陨星巨弓 |
| 56166001 | 常時探知・罠解除・攻撃力アップ / 探知・陷阱解除・攻击力持续提升 | 500101830 星王外套 |
| 56166101 | 弓の習熟 / 熟习弓 | 601101130 陨铁之射击护手 |

修复前这四件装备的特性全部显示成「灵巧持续降低」；修复后各自独立，共需要 **3 条补丁**（默认行保留原 identification，其余三行各一条）。

### 案例：101001000（回复系道具的 6 种药）

identification = 101001000 下有 6 行、全是 `level = 0`、名字各不相同：

| `Skill.id` | 名字 | 回复量（`sub_effects.params`） | 引用道具 |
|---|---|---|---|
| 10100100000 | 药草 | 25 | 30000000 药草 |
| 10100100003 | 创伤药 | 55 | 30000001 创伤药 |
| 10100100010 | 高级创伤药 | — | 30000010 高级创伤药 |
| 10100100020 | 特级创伤药 | — | 300000020 特级创伤药 |
| 10100100030 | 究极创伤药 | — | 300000030 究极创伤药 |
| 10100100040 | 治愈秘药 | 500 | 300000040 治愈秘药 |

- 引用方式：`Expendables.content_id` 写的是 **`Skill.id`**（不是 identification），6 个道具各自指向自己的行 —— 符合「引用方直接引用行 id」的判定，说明它们本该独立成条。
- 修复前：`skill.py` 按 identification 归成 1 条，名字取第一行，于是 6 种药在道具弹窗里**全部显示「治愈秘药」**，点开的技能详情也是同一页、回复量只显示其中一个值。
- 修复后：拆成 6 条（技能总数 +5），每行带自己的名字与回复量。

> 这条同时纠正了 `item.py` 的一个连带 bug：`use_skill` 以前把 `Expendables.content_id // 100` 当成 identification，
> 现在改为按 `Skill.id` 取行、再取该行的 `identification`。

### 案例：53100401（多级技能 + 一条外来行）

identification = 53100401 下是 混乱付与 的 Lv1–5（`id` 53100401…53100405），外加一行 **56162501 剣鬼の呪い**（level 1）
被误写进同一 identification。只需给 56162501 打一条补丁，混乱付与 的 5 级数据保持原样。

## 4. 新增一条的流程

1. 从装备 / 怪物侧拿到引用的技能 id（通常是 `Skill.id`）。
2. 在 `Skill.json` 里看该 id 的行、以及同一 identification 下的其它行，确认是「被写错 identification」而不是「正常的多级 / 同名变体」。
3. 先看 §3.1 的自动规则能不能覆盖（**装备引用 + 被动**、且玩家侧没有按 ident 引用）——
   能覆盖就不用写手工条目；覆盖不了（如消耗品、敌人技能、遗物）才在 `common.py` 的
   `SKILL_IDENT_FIXES` 加一行，**键写 `Skill.id`，值写正确的 identification**，并注释技能名与引用方。
4. 按顺序重跑：

```powershell
python local_scripts\clean\skill.py
python local_scripts\clean\equipment.py      # 只有装备引用受影响时才需要
python local_scripts\clean\build_data.py
python local_scripts\clean\build_mock.py
```

5. 验收（以本案例为例）：

| 检查点 | 期望 |
|---|---|
| `skill.py` 输出的条数 | 原始 identification 3,045；当前 6 条手工 + 8 行自动 → **3,058**（每拆一条 +1） |
| `work/clean/skill/skills.json` | 拆出来的每一条都有正确 `name` / `description`，被拆的 identification 不再含别人的行 |
| `work/clean/skill/skill_levels.json` | 拆出来的每个键下都只有它自己的等级行 |
| `work/clean/equipment/equipments.json` | 受影响装备的 `skills` 指向各自的 id（如 203101330 → 56167201） |
| `public/mock/SkillResponse.json` | 出现新 identification，`count` = **3058** |
| `public/mock/EquipmentResponse.json` | 受影响装备的 `sk` 指向各自的 id |

6. `public/mock` 入库后走 `update:wiki` 上传；前端不需要改代码，IndexedDB 侧靠 `DB_SCHEMA_VERSION` / `Api/Version` 自动刷新。

## 5. 检测结果与剩余情况

`Skill` 表里「同 identification + 同 level + 名字不同」共 **14 组**：

- **装备特性（6 组，自动规则 §3.1）**：53100401、56164101、56165001、56165801、56167101、56167401。
  这几组都有一行以上被 `Equipment.standard_skill_ids` 按行 id 引用、且行本身是被动
  （`use_timing` 为 1 或 5），8 个外来行各自独立。见 §3 归档表。
- **消耗品（1 组，6 条手工补丁）**：101001000（6 种回复药），`Expendables.content_id` 按行 id 引用。
- **保持原样（7 组）**：`150015997` / `150015998`（遗物酔い中度 / 重度，无任何引用）、
  `999954760`（测试行）、`210300000`（强酸变体）、`213080600000`、`214020010000`、
  `215000600000`（敌方技能）。这些组不是装备引用，按 §3.1 不会被自动拆；
  它们的行 id 虽然被 `EnemySkillGroup` 直接引用，但拆开只是把同一招的变体拆成多条，
  对装备页没有收益，暂时保持合并。

判断规则（以后照这个来）：

1. 先按 §3.1：**装备引用 + 被动**、同 identification 同 level 名字不同、玩家侧没有按 ident 引用 → 自动拆；
2. 其余情况看**引用方**：`Expendables.content_id` / 怪物技能表里能不能直接引用那个行 id —— 能，说明它本该独立；
3. 看**行 id 与名字**：`id == identification` 的那行是「原主」，其余名字不同的行基本就是被塞进来的；
4. 只共用一套名字、靠 level 或效果差异区分的，属于正常变体，**不要拆**。

## 6. 注意

- 补丁只影响清洗产物；`out/masterdata` 不动，重新解包不会丢掉补丁。
- 拆分会让技能总数 +1，`data/`、`public/mock` 的 `count` 与体积随之变化，旧的验收数字（3,031 / 3,043）需要按新值核对（当前 3,058）。
- 自动规则依赖 `Equipment` / `Skill` / 玩家侧引用表，`common.py` 里按进程缓存；表结构变动（字段改名）时要一起改 `auto_split_skill_idents()`。
- 同一个 `Skill.id` 不要在多处重复修：手工只能写在 `SKILL_IDENT_FIXES` 里，它优先于自动规则；`skill.py` / `equipment.py` / `item.py` / `enemy.py` 都读 `skill_identification()`。
