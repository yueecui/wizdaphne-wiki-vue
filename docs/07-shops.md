# 07 · 商店数据（地区商店 / 兑换所）

> 适用对象：要新增「商店」页面或给装备/道具补「获取途径」的人。
> 结论先说：**商品、价格、货币、限购、地区、礼包内容都齐全；只有「进度解锁」的文案在 masterdata 里不存在（只有 id）。**

---

## 1. 表清单

| 表 | 行数 | 内容 |
|---|---|---|
| `Shop.json` | 4,920 | 一个**商品**一行：价格、货币、限购、地区、解锁条件、图标 |
| `ShopContent.json` | 6,759 | 商品 → 实际发放的内容物（礼包拆包；直售商品 1:1） |
| `ShopSets.json` | 9 | 活动礼盒套装（名字 + 图） |
| `Point.json` | 113 | 货币 / 点数定义（多语言名字 + 说明 + `type`） |
| `PointShop.json` | 117 | 兑换所分类（`point_id` + `town_id` + `start_at` / `end_at`） |
| `TownConfig.json` | 49 | 城镇列表（名称、地区、解锁说明） |
| `ShopReplaceShop.json` / `ShopReplaceContent.json` | 3 / 3 | 商品替换规则（刷新时换货，特例） |
| `TradeItem.json` | 21 | 活动交易品 |

### `Shop` 关键字段

| 字段 | 说明 |
|---|---|
| `id` | 商品行 id（**不是**物品 id） |
| `shop_kind` | 商店类别，见 §3 |
| `town_ids` | 地区筛选，见 §2 |
| `sale_category` | 商店首页分类（0 = 金币店） |
| `purchase_kind` | 支付方式（1 = 金币） |
| `price` / `quantity` | 单价 / 一次购买数量 |
| `limit_kind` / `limit_num` | 限购周期 / 次数（`0` = 不限购） |
| `is_repeat` | 是否可重复购买 |
| `lineup_condition_id` | 进度解锁条件 id（见 §4） |
| `content_type` / `content_id` | 发放内容（`Item::*` / `Equip::Equipment` / `Point::Gold` …） |
| `point_shop_id` | 兑换所分类（非 0 时属于某个兑换所） |
| `priority` / `badge_kind` / `is_flash_sale` | 排序 / 角标 / 限时特卖 |
| `is_official_shop` | 官方商店（氪金直购） |

## 2. 地区：`town_ids`

全表只有 4 种取值，**`[0]` 就是「所有城镇通用」**：

| `town_ids` | 行数 | 含义 |
|---|---|---|
| `[0]` | 4,889 | 所有城镇共享 |
| `[3]` | 15 | 豪雪地带伊斯贝克 特产 |
| `[5]` | 10 | 瓜尔达要塞 特产 |
| `[44]` | 6 | 诺森霍洛村 特产 |

`TownConfig` 有 49 行城镇，但只有这 3 个配了特产 —— 与「每个地区都有商店、大部分商品相同，只有个别特产」的实感一致。

## 3. 商店类别：`shop_kind`

| 值 | 行数 | 特征 | 推断 |
|---|---|---|---|
| `1` | 126 | 全部 `purchase_kind=1`（金币）、`limit_kind=0`、`sale_category=0` | **地区商店**（金币店） |
| `2` | 4,429 | `purchase_kind` 2/3/4/5，大量 `Item::Junk` 礼包、`Item::Relic` | 宝石 / 礼包商店（氪金） |
| `3` | 186 | 全部 `Item::Relic`，`group_id` 有值 | 神器兑换 |
| `4` | 51 | 混装，部分 `price=0`，限量 10 / 100 / 200 | 活动 / 限定商店 |
| 空（`null`） | 128 | 宝石包、免费宝石、`price=0` 特殊商品 | 官方商店 / 特殊入口 |

> 除 `shop_kind=1` 外的商店都与地区无关，靠 `point_shop_id` 挂到 `PointShop` 分类
> （如 `501` 本周进货 186 行、`3000500` 深暗幻想之城 91 行）。

### 地区商店（`shop_kind=1`）明细：126 件

| 分组 | 数量 |
|---|---|
| `town_ids=[0]` 通用 | 95 |
| 伊斯贝克（3）特产 | 15 |
| 瓜尔达要塞（5）特产 | 10 |
| 诺森霍洛村（44）特产 | 6 |
| 按类型：装备 | 78（武器 35 / 盾 7 / 头 9 / 身 11 / 手 7 / 脚 8 / 饰品 1） |
| 按类型：消耗品 | 43（药草 40 → 高级创伤药 500、究极创伤药 4000、各种卷轴 200–2000…） |
| 按类型：鱼饵 | 5 |

## 4. 进度解锁：有 id，没有文案

`lineup_condition_id`：4,920 行里 935 行有值（`0` = 无条件）。地区商店的 126 件里有 **37 个不同 id**：

```
100000000 100000100 100000200 100000700 … 100002600
100030000 ~ 100030500        100040000 ~ 100040500
100800000 ~ 100800500        100911500 100912000        300000000
```

id 明显是分层的：`1000xxxxx` 主线阶段、`10003xxxx` / `10004xxxx` 对应地区、`1008xxxxx` 钓鱼、`1009xxxxx` 其它玩法。

**但全 288 张表里没有任何一张以这些 id 为主键**（唯一撞上的 `100030000` 是 `Enemy` 的巧合），
即「达成什么条件解锁」的文字不在 masterdata 里，属于客户端逻辑。可选做法：

1. 按 `lineup_condition_id` 分组，当作「解锁阶梯」展示，不写条件文字；
2. 人工补文案（地区商店只有 37 个 id，全表一百多个，量可控）；
3. 只标「需解锁」。

## 5. 货币 / 兑换所

- `Point.json`：`type` 有 `Point::Gold`（金币）、`Point::Event`（活动点数，108 个）、
  `Point::Fishing`、`Point::Relic`、`Point::Wanted`；每条带多语言名字 + 说明，可直接展示「这是什么货币」。
- `PointShop.json`：兑换所分类，`town_id` + 开放时间；`Shop.point_shop_id` 指向它。
- `Shop.purchase_kind` 是**支付方式枚举**（1 金币 / 2、3 宝石类 / 4 直购 / 5 兑换点数），
  具体货币名要靠 `PointShop.point_id` → `Point` 查。

## 6. 落地时的坑

1. **装备商品的 `content_id` 是 `Equipment.id`（具体 roll），不是 identification**。同一件装备有多个 roll，
   商店卖的是特定那一行；要 `Equipment.id → identification` 才能链接到现有装备弹窗。
2. 礼包必须走 `ShopContent`：金币店是 1:1，氪金礼包是 1:N（一个「套装」拆成若干件）。
3. `Shop.name` 已带中文名，消耗品 / 鱼饵不需要额外字典表；装备建议链到 V2 装备页。
4. `limit_kind`（1–4 = 四种限购周期）+ `limit_num` + `is_repeat` 要一起看才准。
5. `ShopReplaceShop` / `ShopReplaceContent` 只有 3 条（特例换货），首版可以忽略。
6. `shop_kind` 有空值（128 行），分组统计前先兜底。

## 7. 建议产物

```
data/shops.json           按 town 分组，通用 + 特产合并
public/mock/ShopResponse.json   短键 + {items,count,page,limit}
```

结构草案：

```jsonc
{
  "towns": [
    {
      "town_id": 3, "town_name": "豪雪地带伊斯贝克",
      "items": [
        { "id": 21000123, "type": "Equip", "ref": 200001609, "name": "冻原大剑",
          "price": 75000, "currency": 1, "quantity": 1, "limit": null,
          "condition": 100040000 }
      ]
    }
  ]
}
```

验收基线：`shop_kind=1` 共 126 条，`town_ids=[0]` 95 条，三处特产 15 / 10 / 6。
