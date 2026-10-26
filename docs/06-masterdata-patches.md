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

`local_scripts/clean/common.py` → `SKILL_IDENT_FIXES`（`{Skill.id: 真正的 identification}`），
由 `skill_identification(row)` 统一取值；`skill.py` 归组、`equipment.py` 解析 `standard_skill_ids` 都用它。

> 不改 `out/masterdata`（每次解包都会被覆盖），也不在前端打补丁 —— 修正放在清洗入口，产物天然正确。

### 已归档的条目

| `Skill.id` | 表里写的 identification | 正确 identification | 技能 | 引用方 |
|---|---|---|---|---|
| 56167201 | 56167101 | 56167201 | 範囲魔術理解 / 范围法术理解 | `Equipment` 203101330「哈欠法杖」 |
| 56164201 | 56164101 | 56164201 | 効率調合 / 高效调和 | `Equipment` 104100430「调药棒」 |
| 56162501 | 53100401 | 56162501 | 剣鬼の呪い / 剑鬼的诅咒 | `Equipment` 206000700「妖刀鬼之岛」 |
| 56165101 | 56165001 | 56165101 | 闇属性強化 / 暗属性强化 | `Equipment` 200100730「深渊使者」 |
| 56165901 | 56165801 | 56165901 | 修正射撃 / 校正射击 | `Equipment` 205100430「陨星巨弓」 |
| 56166001 | 56165801 | 56166001 | 常時探知・罠解除・攻撃力アップ / 探知・陷阱解除・攻击力持续提升 | `Equipment` 500101830「星王外套」 |
| 56166101 | 56165801 | 56166101 | 弓の習熟 / 熟习弓 | `Equipment` 601101130「陨铁之射击护手」 |

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

### 案例：53100401（多级技能 + 一条外来行）

identification = 53100401 下是 混乱付与 的 Lv1–5（`id` 53100401…53100405），外加一行 **56162501 剣鬼の呪い**（level 1）
被误写进同一 identification。只需给 56162501 打一条补丁，混乱付与 的 5 级数据保持原样。

## 4. 新增一条的流程

1. 从装备 / 怪物侧拿到引用的技能 id（通常是 `Skill.id`）。
2. 在 `Skill.json` 里看该 id 的行、以及同一 identification 下的其它行，确认是「被写错 identification」而不是「正常的多级 / 同名变体」。
3. 在 `common.py` 的 `SKILL_IDENT_FIXES` 加一行，**键写 `Skill.id`，值写正确的 identification**，并注释技能名与引用方。
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
| `skill.py` 输出的条数 | 原始 3,031；当前 7 条补丁 → **3,038**（每拆一条 +1） |
| `work/clean/skill/skills.json` | 拆出来的每一条都有正确 `name` / `description`，被拆的 identification 不再含别人的行 |
| `work/clean/skill/skill_levels.json` | 拆出来的每个键下都只有它自己的等级行 |
| `work/clean/equipment/equipments.json` | 受影响装备的 `skills` 指向各自的 id（如 203101330 → 56167201） |
| `public/mock/SkillResponse.json` | 出现新 identification，`count` = **3038** |
| `public/mock/EquipmentResponse.json` | 受影响装备的 `sk` 指向各自的 id |

6. `public/mock` 入库后走 `update:wiki` 上传；前端不需要改代码，IndexedDB 侧靠 `DB_SCHEMA_VERSION` / `Api/Version` 自动刷新。

## 5. 检测结果与剩余情况

`Skill` 表里「同 identification + 同 level + 名字不同」共 13 组：

- **已全部处理（5 组，7 条补丁）**：53100401、56164101、56165001、56165801、56167101 —— 都在装备被动特性（5xxxxx / 5310xxxx）区，
  每一行的行 id 都被装备当作独立技能引用过，判定为官方配错表。见 §3 的归档表。
- **保持原样（8 组）**：剩下 8 组的 `level = 0`，共用 identification 是设计如此（同一技能的形态 / 强度变体），不要拆：

`101001000`（草药类道具「薬草 / 傷薬 / 上傷薬 …」）、`150015997` / `150015998`（遗物酔い中度 / 重度）、
`210300000`（强酸性攻击的属性变体）、`999954760`（测试行）、`213080600000`、`214020010000`、`215000600000`（敌方技能）。

判断规则（以后照这个来）：

1. 看**引用方**：装备 / 技能组 / 怪物技能表里能不能直接引用那个行 id —— 能，就说明它本该是独立 identification；
2. 看**行 id 与名字**：`id == identification` 的那行是「原主」，其余名字不同的行基本就是被塞进来的；
3. 只共用一套名字、靠 level 或效果差异区分的，属于正常变体，**不要拆**。

其余 8 组的 `level = 0`（敌方技能、道具效果、遗物酔い中/重度、测试行等），**共用 identification 是设计如此**，不要拆：

`101001000`（草药类道具）、`150015997` / `150015998`（遗物酔い中度/重度）、`210300000`（强酸性攻击变体）、
`999954760`（测试）、`213080600000`、`214020010000`、`215000600000`（敌方技能）。

判断规则：**引用方（装备 / 技能组 / 怪物技能表）如果有办法直接引用那个 id，就说明它本该是独立 identification**；
只是共用一套名字的变体，就不要动。

## 6. 注意

- 补丁只影响清洗产物；`out/masterdata` 不动，重新解包不会丢掉补丁。
- 拆分会让技能总数 +1，`data/`、`public/mock` 的 `count` 与体积随之变化，旧的验收数字（3,031）需要按新值核对。
- 同一个 `Skill.id` 不要在多处重复修：只能写在 `SKILL_IDENT_FIXES` 里，`skill.py` / `equipment.py` 都读它。
