# 08 · 道具（物品）数据

> 适用对象：要做「道具」页面、给商店 / 装备 / 技能补「获取途径」的人。
> 结论：**道具主表是 `Reward.json`（2,684 条）**，名字 / 说明 / 图标 / 分类 / 卖价都齐；
> 消耗品的使用效果能直接挂到技能上，强化素材的消耗规则在 `EquipmentReinforced`。

---

## 1. 表清单

| 表 | 行数 | 内容 |
|---|---|---|
| `Reward.json` | 2,684 | **道具总表**：名字（4 语言）/ 说明 `flavor` / 图标 / `type` / 卖价 `value` / `sort_id` |
| `ItemType.json` | 9 | 把 20 种 `content_type` 归并成游戏内的 9 个分类页签 |
| `Expendables.json` | 105 | 消耗品 → 使用后发动的技能（`content_type: Skill::Skill`） |
| `FishingFeed.json` | 13 | 鱼饵：水量 / 时长 / 咬钩区间 / 成功区间 |
| `Fish.json` | 8 | 鱼（重量 / 稀有度等） |
| `RelicItem.json` | 238 | 神器：`grade` / `rank` / `alignment` / `relic_skill_id` |
| `RelicAlcohol.json` | — | 神器酒（兑换用） |
| `EquipmentReinforced.json` | 210 | 装备强化（+N）：`rank` + `level` → 金币 + **素材数量** |
| `EquipReinforceParamGroup.json` | — | 强化属性增量 |
| `EquipmentOverRankReinforce.json` | — | 材质补强（合材）数值 |
| `EquipmentEffectUpgradeItem.json` | 222 | 装备特性升级素材（`400000xxx`） |
| `EquipmentSaleList.json` | 866 | 装备卖价 |
| `BoostSellingPrice.json` | 33 | 售卖加成比率 |

`Reward` 字段：

| 字段 | 说明 |
|---|---|
| `id` | 道具 id（= `Shop.content_id`） |
| `name` / `flavor` | 名字 / 说明，四语言 dict；`flavor` 带 `<color>`、`[icon=rank6]` 之类富文本 |
| `icon_resource` / `list_icon_resource` | 大图 / 列表小图（资源名，不含 `.png`） |
| `type` | 道具大类 `Item::*` |
| `value` | **卖价**（药草 10，商店买价 40 ≈ 4 倍） |
| `sort_id` | 排序号，同时是分类前缀（`3xxxxxxxx` 消耗品、`6xxxxxxxx` 强化素材、`1xxxxxxxx` 杂物、`99xxxxxxx` 特殊） |

## 2. 分类（`ItemType`）

| id | 分类 | 覆盖的 `content_type` |
|---|---|---|
| 1000 | 消耗品 | `Expendable`、`NamedExpendable` |
| 1100 | 养成道具 | `CharacterExp`、`SkillLevelup`、`InheritSkill`、`GradeGrowth`… |
| 1300 | 精炼装备素材 | `EquipmentSubEffectChange`、`EquipmentReinforceMaterial`、`OverRankReinforceLevelUp`、`UnifyEquipment`、`RelicEquipmentMaterial` |
| 1500 | 杂物 | `Junk` |
| 1600 | 神器 | `Relic` |
| 1700 / 1800 | 鱼 / 鱼饵 | `Fish`、`FishingFeed` |

`ItemType` 没覆盖的 `type`（`Valuable`、`MissionPass`、`VipPass`、`SoulCrystal`、钓鱼竿/钓具、活动任务开放…）
在 `item.py` 的 `TYPE_LABELS` 里补中文名。

`Reward.type` 分布（2,684 条，前几名）：

| type | 数量 |
|---|---|
| `Item::Junk` | 1,144 |
| `Item::Valuable` | 256 |
| `Item::Relic` | 238 |
| `Item::EquipmentSubEffectChange` | 223 |
| `Item::InheritSkill` | 187 |
| `Item::LimitedSkillLevelup` | 162 |
| `Item::JobChangeable` | 114 |
| `Item::Expendable` | 102 |

## 3. 消耗品：使用效果挂在技能上

`Expendables.json`：`item_id → {content_type: "Skill::Skill", content_id}`，`content_id // 100` 就是技能 identification。

- 105 条里 **104 条能对上清洗后的技能表**（缺 `300400000`）。
- 技能名与道具名一致，所以道具的「效果数值」可以**直接复用技能弹窗**，不用另做一套：

```
火球卷轴 30100000 → 101000000 火球卷轴
药草     30000000 → 101001000 治愈秘药
```

## 4. 强化素材：种类少，规则在别的表

- `Item::EquipmentReinforceMaterial` 只有 **5 种**：下级 / 中级 / 上级 / 特级铁矿石 + 银矿石（`value` 都是 0，不可卖）。
- 强化消耗在 `EquipmentReinforced`：`rank` + `level` → `cost`（金币）+ `required_item_quantity`（素材数量），
  素材等级由 `rank` 决定；属性增量在 `EquipReinforceParamGroup`，材质补强在 `EquipmentOverRankReinforce`。
- 装备**特性**升级用另一套素材：`EquipmentEffectUpgradeItem`（222 条，`400000xxx`）→ `EquipmentEffectUpgrade` 的等级数值。

## 5. 数据缺口

1. 商店里有 **20 条 `Item::Junk` 在 `Reward` 里查不到**（下架 / 测试商品），名字只能退化用 `Shop.name`。
2. `Expendables` 有 1 条（`300400000`）找不到对应技能。
3. `Item::Junk`（1,144 条）= 骸骨（抽卡）+ 「××杂物」，与现有杂物模块（官网抓包 `junkdata.json`）是两套数据，别混用。
4. 道具没有「获取途径」反查表：商店来源要自己用 `Shop` / `ShopContent` 建索引，掉落 / 任务奖励在别的表。

## 6. 图鉴（道具收集）

只有一部分道具进图鉴：`Reward` 2,684 条里 **473 条**。

| 表 | 行数 | 内容 |
|---|---|---|
| `CollectionItem.json` | 473 | 图鉴条目：`item_id` / 图鉴 `id` / `list_number`（图鉴编号）/ `display_type` / `sale_value` / `flavor_group_id` |
| `CollectionFlavorGroup.json` | 1,162 | 图鉴说明（比 `Reward.flavor` 更完整，带［仅供出售］之类的标注），按 `flavor_group_id` + `slot_id` 分组 |
| `CollectionControllGroup.json` | 374 | 图鉴**筛选**条件组（属性 / 种族 / 性别…），不是分类 |
| `CollectionCondition.json` | 2 | 图鉴解锁条件（`kind` / `target` / `compare_method` / `value`） |

> 同类还有 `CollectionCharacter` 206 / `CollectionEquip` 811 / `CollectionEnemy` 252，
> 角色 / 装备 / 怪物图鉴可以复用同一套表结构。

### 编号与 EX

- `CollectionItem.list_number` 就是图鉴编号（1–4129，中间有跳号）。
- **编号 500–599（5XX）在游戏里显示为 `EX`，并统一排在分类最后**。数据里完全吻合：
  81 条 `display_type = 2` 的条目正好落在 500–581。
- 排序规则（前端 `compareCollectionNo`）：先按编号升序，`isEx` 的整组排到后面，组内仍按编号升序。
- 各分类的 EX 数量：贵重品 38 / 其他 22 / 消耗品 21 / 出售 0（合计 81）。

### 图鉴的四个分类

官方表**没有**分类字段（`CollectionItem.control_group_id` 全是 1，那是筛选用的控制组）。
四类是按 `Reward.type` 归出来的，与导入时的实际数量完全吻合：

| 图鉴分类 | 来源 `Reward.type` | 数量 |
|---|---|---|
| 出售 | `Item::SaleOnly` | 34 |
| 消耗品 | `Item::Expendable` / `NamedExpendable` | 52 |
| 贵重品 | `Item::Valuable` | 235 |
| 其他 | 其余（神器 61 / 神器素材 21 / 鱼饵 13 / 阶位成长 12 / 魂晶 10 / 鱼 8 / 强化素材 5 …） | 152 |

字段落在道具数据里：

| 长键 | 短键 | 说明 |
|---|---|---|
| `collection_group` | `cg` | 出售 / 消耗品 / 贵重品 / 其他（只对进图鉴的道具有值） |
| `collection.id` | `col.i` | 图鉴条目 id |
| `collection.no` | `col.n` | 图鉴编号（`list_number`） |

> 图鉴说明（`CollectionFlavorGroup` 更完整的那份）、图鉴售价、`display_type`
> 属于图鉴模块，不再重复清洗进道具数据。

## 7. 杂物细分（`Item::Junk`）

`Item::Junk` 共 1,144 条，官方 `type` **完全一样**，但里面混了两类抽卡道具：

| 二级分类 | 判据（`list_icon_resource`） | 数量 | 说明 |
|---|---|---|---|
| 角色抽卡 | `list_icon_bone`（368）/ `list_icon_Summoning_Scroll`（13） | 381 | 骸骨、召唤卷轴 |
| 装备抽卡 | `list_icon_junk` | 763 | 「××杂物」 |
| （数据兜底） | 其余图标 | 0 | `junk_group = 未分类`，目前没有命中 |

> 页签上的「未分类」**不是**杂物兜底，而是「图鉴四类 + 两种抽卡之外的全部道具」，
> 见下面 §7.1。

> **不要用名字判**：41 条特典骸骨的 `name` 还是日文（如「稀なる遺骸：魔術殺しの白夜叉　特典」），
> 名字规则会漏掉它们；`list_icon` 是结构化字段，1,144 条 100% 命中。
> 两套判据交叉验证结果：装备 763 = 763 完全一致，角色 340（名字含「骸骨/召唤」）+ 41（日文名）= 381。

字段：`junk_group` / `jg`（`角色抽卡` / `装备抽卡` / `未分类`），只有 `Item::Junk` 有值。

### 7.1 按类型细分的六组

从「未分类」里再按 `Reward.type` 拆出六组（`itemTypes.ts` 的 `ITEM_GROUP_TYPES`）：

| 页签 | 对应 `Item::*` | 数量 | 说明 |
|---|---|---|---|
| 其他消耗品 | `Expendable` + `NamedExpendable` | 55 | **不含**已进图鉴「消耗品」的 52 条；剩下的是巧克力（复古巧克力 / 魅惑巧克力苏姬 / 羁绊巧克力）和各种卷轴 |
| 技能书 | `InheritSkill` + `LimitedSkillLevelup` | 349 | 187 + 162 |
| 转职书 | `JobChangeable` + `JobReturnable` | 115 | 114 + 1 |
| 遗物 | `Relic` | 238 | 含进图鉴的 61 条（同一件遗物在两个页签都能查到） |
| 精炼石 | `EquipmentSubEffectChange` | 223 | 含进图鉴的 3 条 |
| 通行证 | `VipPass` + `MissionPass` | 111 | 21 + 90 |

> 除「其他消耗品」外，其余五组按类型**全收**，所以与图鉴页签有少量重叠（不算错，只是两个视角）。

### 7.2 未分类（待辨认）

页签「未分类」= 图鉴四类、两种抽卡、上面六组都覆盖不到的道具，目前 **40 条**：

| category | 数量 |
|---|---|
| 特殊道具（`Item::Valuable` 未进图鉴） | 21 |
| 养成道具 | 13 |
| 只能出售（`SaleOnly` 未进图鉴） | 2 |
| 活动任务开放 | 2 |
| 无偿宝石 / 有偿宝石 | 各 1 |

判据写在前端：`isUnclassifiedItem()` = 无 `collection_group`、`junk_group` 不是两种抽卡、且 `itemGroupOf()` 返回 `null`。
等这批也辨认完，把规则沉淀到 `item.py`，页签继续收缩。

前端二级导航因此变成四组：
`全部 · 出售 · 消耗品 · 贵重品 · 其他 ‖ 角色抽卡 · 装备抽卡 ‖ 其他消耗品 · 技能书 · 转职书 · 遗物 · 精炼石 · 通行证 ‖ 未分类`。

## 8. 本期实现（探查版）

| 位置 | 内容 |
|---|---|
| `local_scripts/clean/item.py` | `Reward` + `ItemType` + `Expendables` + `FishingFeed` + `RelicItem` + **`shop.py` 清洗后的 `work/clean/shop/shops.json`** 合成 `work/clean/item/items.json` |
| `local_scripts/clean/build_data.py` | 输出 `data/items.json` + `data/item/<id>.json`，`meta.counts.items` |
| `local_scripts/clean/build_mock.py` | `ITEM` 字段表 → `public/mock/ItemResponse.json`（短键，1.3 MB） |
| `local_scripts/wiki/uploadDataToWiki.ts` | 新增 `item` kind（`Data:Item/<id>.json`，`dtype: item`） |
| `src/api/dbCodec.ts` | `ITEM_FIELDS`（与 mock 的短键一一对应） |
| `src/views/DataV2/ItemPanel.vue` / `ItemModal.vue` / `itemTypes.ts` | 数据查询页新增「道具」页签，二级导航 = 全部 / 图鉴四类 / 两种抽卡 / 按类型六组 / 未分类 |

字段（长键 / 短键）：`id/i`、`name/zh`、`name_jp/jp`、`name_en/en`、`type/ty`、`category/c`、
`desc/d`、`icon/ic`、`list_icon/li`、`value/v`、`sort_id/so`、
`use_skill/sk`、`shop/sh`（`objArr`：商店名 / 价格 / 货币 / 地区 / 限购 / 解锁条件 / 兑换所分类，
兑换点数的 `currency_name` 写入实际点数名，如「银鳞硬币」）、
`fishing/fi`、`relic/re`、`collection_group/cg`、`collection/col`、`junk_group/jg`。

> 当前「道具」页是**探查版**：直接调 `Api/GetV2Item`（DEV 读 mock），不写 IndexedDB，
> 目的是先把 2,684 条数据铺开看字段。确定要长期保留后再按其它模块的方式接进缓存。

### 上线步骤

```powershell
python local_scripts\clean\shop.py      # item.py 直接消费它的 shops.json
python local_scripts\clean\item.py
python local_scripts\clean\build_data.py
python local_scripts\clean\build_mock.py
pnpm update:wiki --only item      # Data:Item/<id>.json + dtype: item
```

**线上还需要手工新建 Lua 模块 `Api/GetV2Item`**（照抄 `Api/GetV2Skill`，dtype 改成 `item`），否则线上请求会 404。

### 验收基线

| 检查点 | 期望 |
|---|---|
| `item.py` 输出 | 2,684 条；商店有售 421 条（按 `shop.py` 拆包后的内容物统计，已排除有结束时间的限时商店）；有使用效果 105 条；进图鉴 473 条 |
| 图鉴分类 | 贵重品 235 / 其他 152 / 消耗品 52 / 出售 34（合计 473） |
| 图鉴引用 | 473 条带 `collection`（只有 `id` + `no`）；图鉴售价 / 说明 / `display_type` 不进道具数据 |
| 杂物细分 | 角色抽卡 381 / 装备抽卡 763（合计 1,144） |
| 类型六组 | 其他消耗品 55 / 技能书 349 / 转职书 115 / 遗物 238 / 精炼石 223 / 通行证 111 |
| 未分类 | 40 条（特殊道具 21 / 养成道具 13 / 只能出售 2 / 活动任务开放 2 / 宝石 2） |
| 分类计数 | 杂物 1,144 / 养成道具 381 / 特殊道具 256 / 精炼装备素材 252 / 神器 238 … |
| `data/items.json` | 2,684 条，`meta.counts.items` = 2684 |
| `public/mock/ItemResponse.json` | `count` = 2684，约 1.3 MB |
| 前端 | 「道具」页签列出 2,684 条，可按分类 / 来源筛选，点开看到商店与原始 JSON |
