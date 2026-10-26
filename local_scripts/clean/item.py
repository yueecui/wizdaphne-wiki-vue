"""Clean the item category (every ``Item::*`` row in ``Reward``).

Input : ``out/masterdata``
        ``Reward``              all items (name / flavor / icon / type / sell price)
        ``ItemType``            content_type -> in-game category key
        ``Expendables``         consumable -> skill it casts
        ``FishingFeed``         bait -> fishing parameters
        ``RelicItem``           relic -> grade / rank / alignment / skill
        ``work/clean/shop/shops.json``  shop.py 清洗后的店铺（item -> 价格 / 商店名 / 点数名）

Output: ``local_scripts/work/clean/item/items.json``

One entry per item id. Everything the wiki can show is kept:
names (zh / jp / en), flavor text, icon, category, type, sell price,
use-effect skill, fishing parameters, relic data and every shop row
that sells it (price / currency / town / limit / unlock condition).

    python item.py
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, load, names, skill_identification, text, write_json  # noqa: E402

#: ``ItemType.name_key`` -> 游戏内的道具分类（ItemType 把多个 content_type 归成一类）
CATEGORY_LABELS = {
    "ContentType@Expendable": "消耗品",
    "ContentType@CharacterTrainingItem": "养成道具",
    "ContentType@SaleOnly": "只能出售",
    "ContentType@RefineEquipmentItem": "精炼装备素材",
    "ContentType@JobChangeable": "转职道具",
    "ContentType@Junk": "杂物",
    "ContentType@Relic": "神器",
    "ContentType@Fish": "鱼",
    "ContentType@FishingFeed": "鱼饵",
}

#: ItemType 没有覆盖到的 content_type，直接给中文名
TYPE_LABELS = {
    "Item::Valuable": "特殊道具",
    "Item::MissionPass": "任务通行证",
    "Item::VipPass": "会员证",
    "Item::SoulCrystal": "魂晶",
    "Item::EquipmentSubEffectChange": "装备词条变更",
    "Item::InheritSkill": "继承技能道具",
    "Item::LimitedSkillLevelUp": "技能等级道具",
    "Item::LimitedSkillLevelup": "技能等级道具",
    "Item::GradeGrowth": "阶位成长",
    "Item::GradeGrowthProof": "阶位证明",
    "Item::CharacterExp": "经验道具",
    "Item::EquipmentReinforceMaterial": "强化素材",
    "Item::RelicEquipmentMaterial": "神器装备素材",
    "Item::FreeGem": "无偿宝石",
    "Item::PaidGem": "有偿宝石",
    "Item::RestraintPoint": "克己点数",
    "Item::SkillLevelup": "技能升级",
    "Item::JobReturnable": "转职道具",
    "Item::OverRankReinforceLevelUp": "材质补强素材",
    "Item::UnifyEquipment": "装备统一素材",
    "Item::Fish": "鱼",
    "Item::FishingRig": "钓组",
    "Item::FishingTackle": "钓具",
    "Item::FishingFeedBag": "鱼饵包",
    "Item::EventMissionRelease": "活动任务开放",
    "Item::ResetForkedRoad": "分歧路线重置",
    "Item::SeverFate": "断绝命运",
    "Item::EquipmentReinforceMaterial": "精炼装备素材",
}

#: 道具图鉴的四个分类（游戏内页签）。官方表没有直接字段，按 ``Reward.type`` 归类：
#: 只能出售 -> 出售；消耗品 -> 消耗品；贵重品 -> 贵重品；其余（神器 / 素材 / 鱼饵 / 养成…）-> 其他
COLLECTION_GROUPS = {
    "Item::SaleOnly": "出售",
    "Item::Expendable": "消耗品",
    "Item::NamedExpendable": "消耗品",
    "Item::Valuable": "贵重品",
}


#: 1000 号以后的图鉴编号按千位段对应页签（1xxx 消耗品 / 2xxx 贵重品 / 4xxx 其他），
#: 个别道具的 ``Reward.type`` 与所在页签不一致，以编号段为准：
#: 「用顺手的鱼饵箱」2131 是 ``Item::FishingFeedBag``，但游戏里排在 **贵重品**。
COLLECTION_GROUP_BY_BLOCK = {
    1: "消耗品",
    2: "贵重品",
    4: "其他",
}


def collection_group(content_type: str | None, list_number: int | None = None) -> str:
    by_block = COLLECTION_GROUP_BY_BLOCK.get((list_number or 0) // 1000)
    if by_block:
        return by_block
    return COLLECTION_GROUPS.get(content_type or "", "其他")


#: ``Item::Junk`` 里其实混了两类抽卡道具，官方没有专门字段，按**列表图标**区分
#: （比名字可靠：41 条特典骸骨的 name 还是日文）：
#:   list_icon_bone / list_icon_Summoning_Scroll -> 角色抽卡（骸骨 / 召唤卷轴）
#:   list_icon_junk                             -> 装备抽卡（「××杂物」）
JUNK_GROUP_BY_ICON = {
    "list_icon_bone": "角色抽卡",
    "list_icon_Summoning_Scroll": "角色抽卡",
    "list_icon_junk": "装备抽卡",
}

#: 认不出来的杂物先丢这里，等人工确认后再补规则
JUNK_GROUP_UNKNOWN = "未分类"


def junk_group(row: dict) -> str | None:
    """``Item::Junk`` 的二级分类；非杂物返回 ``None``。"""
    if (row.get("type") or "") != "Item::Junk":
        return None
    return JUNK_GROUP_BY_ICON.get(row.get("list_icon_resource") or "", JUNK_GROUP_UNKNOWN)


def category_map() -> dict[str, str]:
    """``content_type`` -> 中文分类（先用 ItemType 的归并，再退回单类型表）。"""
    out: dict[str, str] = {}
    for row in load("ItemType"):
        label = CATEGORY_LABELS.get(row.get("name_key") or "", row.get("name_key") or "")
        for content_type in row.get("content_type") or []:
            out[content_type] = label
    for content_type, label in TYPE_LABELS.items():
        out.setdefault(content_type, label)
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.parse_args(argv)

    rewards = load("Reward")
    categories = category_map()

    # ---------- 使用效果：消耗品 -> 技能 ----------
    # ``Expendables.content_id`` 是 ``Skill.id``（精确到某一行），不是 identification。
    # 同一 identification 下有多行（药草 / 创伤药 / 高级创伤药 …），
    # 必须按 id 取名字，否则会被合并成一条（以前所有药草都显示成「治愈秘药」）。
    skills_by_id = {row.get("id"): row for row in load("Skill")}
    use_skill: dict[int, dict] = {}
    for row in load("Expendables"):
        item_id = row.get("item_id")
        if not item_id:
            continue
        skill = skills_by_id.get(row.get("content_id"))
        if not skill:
            continue
        use_skill[item_id] = {
            "kind": row.get("content_type"),
            "id": skill_identification(skill),
            "name": names(skill).get("name"),
        }

    # ---------- 鱼饵参数 ----------
    fishing = {row.get("item_id"): row for row in load("FishingFeed")}

    # ---------- 神器 ----------
    relics = {row.get("item_id"): row for row in load("RelicItem")}

    # ---------- 图鉴（只取 CollectionItem 的条目 id） ----------
    # 编号 / 售价 / 图鉴说明属于图鉴模块，不重复清洗进道具数据
    collection = {row.get("item_id"): row for row in load("CollectionItem")}

    # ---------- 商店反查：直接用 shop.py 清洗好的店铺数据 ----------
    # 店铺归组、过滤（无 shop_kind / 宝石商杂物包）都由 shop.py 负责，
    # 这里不再遍历原始 Shop 表，避免两套规则对不上。
    shop_by_item: dict[int, list] = collections.defaultdict(list)
    shops_path = os.path.join(CLEAN, "shop", "shops.json")
    if os.path.isfile(shops_path):
        with open(shops_path, encoding="utf8") as fh:
            shop_entries = json.load(fh)
        for shop in shop_entries:
            if shop.get("end_at"):
                continue      # 限时商店（有结束时间）不作为道具的长期获取途径
            for row in shop.get("items") or []:
                content_type = row.get("content_type") or ""
                content_id = row.get("content_id")
                if not content_type.startswith("Item::") or not content_id:
                    continue
                currency = row.get("currency")
                shop_by_item[content_id].append({
                    "shop_name": shop.get("name"),
                    "shop_kind": shop.get("kind"),
                    "price": row.get("price"),
                    "currency": currency,
                    # 兑换点数写实际点数名（「银鳞硬币」），其余仍是支付方式名
                    "currency_name": (shop.get("point_name") if currency == 5
                                      else row.get("currency_name")),
                    "quantity": row.get("quantity"),
                    "limit_kind": row.get("limit_kind") or 0,
                    "limit_num": row.get("limit_num") or 0,
                    "repeat": bool(row.get("repeat")),
                    "condition": row.get("condition") or 0,
                    "town": shop.get("town") or 0,
                    "point_shop_id": shop.get("point_shop_id") or 0,
                })
    else:
        print(f"  {shops_path} 不存在：先跑 shop.py，否则道具没有商店信息")

    entries = []
    for row in rewards:
        item_id = row.get("id")
        if not item_id:
            continue
        desc, desc_lang = text(row.get("flavor"))
        entry = {"id": item_id}
        entry.update(names(row))
        content_type = row.get("type")
        entry["type"] = content_type
        entry["category"] = categories.get(content_type or "")
        entry["desc"] = desc
        if desc_lang and desc_lang not in ("zhs", "zht"):
            entry["desc_lang"] = desc_lang
        entry["icon"] = row.get("icon_resource")
        entry["list_icon"] = row.get("list_icon_resource")
        entry["value"] = row.get("value") or 0          # 卖价
        entry["sort_id"] = row.get("sort_id") or 0

        group = junk_group(row)
        if group:
            entry["junk_group"] = group

        # 图鉴条目：只有一部分道具进图鉴（473 / 2684）
        # 只存条目 id 与编号，图鉴说明 / 售价 / 显示类型归图鉴模块
        book = collection.get(item_id)
        if book:
            entry["collection_group"] = collection_group(content_type, book.get("list_number"))
            entry["collection"] = {
                "id": book.get("id"),
                "no": book.get("list_number"),
            }

        skill = use_skill.get(item_id)
        if skill:
            entry["use_skill"] = skill

        feed = fishing.get(item_id)
        if feed:
            entry["fishing"] = {
                "volume": feed.get("volume"),
                "duration": feed.get("duration"),
                "min_meet": feed.get("min_meet"),
                "max_meet": feed.get("max_meet"),
                "min_success": feed.get("min_success"),
                "max_success": feed.get("max_success"),
            }

        relic = relics.get(item_id)
        if relic:
            entry["relic"] = {
                "grade": relic.get("grade"),
                "rank": relic.get("rank"),
                "alignment": relic.get("alignment"),
                "skill_id": relic.get("relic_skill_id"),
            }

        shops = shop_by_item.get(item_id)
        if shops:
            shops.sort(key=lambda s: (s.get("price") or 0, s.get("town") or 0))
            entry["shop"] = shops

        entries.append(entry)

    entries.sort(key=lambda e: (e.get("sort_id") or 0, e["id"]))

    out_dir = os.path.join(CLEAN, "item")
    write_json(os.path.join(out_dir, "items.json"), entries)

    by_category = collections.Counter(e.get("category") or "（未分类）" for e in entries)
    in_shop = sum(1 for e in entries if e.get("shop"))
    with_skill = sum(1 for e in entries if e.get("use_skill"))
    in_book = sum(1 for e in entries if e.get("collection"))
    print(f"{len(entries)} items ({in_shop} sold in shops, {with_skill} with a use effect, "
          f"{in_book} in the collection) -> {out_dir}")
    for label, count in by_category.most_common():
        print(f"  {label:<8} {count}")
    groups = collections.Counter(e.get("collection_group") for e in entries if e.get("collection"))
    print("  图鉴：" + " · ".join(f"{k} {v}" for k, v in groups.most_common()))
    junk = collections.Counter(e.get("junk_group") for e in entries if e.get("junk_group"))
    print("  杂物：" + " · ".join(f"{k} {v}" for k, v in junk.most_common()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
