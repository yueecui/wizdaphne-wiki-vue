"""Clean every shop (``Shop`` rows grouped into shops).

Input : ``out/masterdata``
        ``Shop``        一个商品一行（价格 / 货币 / 地区 / 限购 / 解锁条件）
        ``ShopContent`` 礼包拆包（直售商品 1:1）
        ``PointShop``   兑换所分类（名字 + 开放时间）
        ``Point``       货币定义
        ``TownConfig``  城镇名
        ``Reward`` / ``Equipment``  商品名

Output: ``local_scripts/work/clean/shop/shops.json``

官方表没有「商店」实体，只有商品行。这里按 ``(shop_kind, town, point_shop_id)``
把它们归成店铺：金币商店按城镇拆（通用 / 三个特产镇），宝石商按 ``PointShop`` 分类拆。

一级分类（``group``）只有两组：

* ``1 常驻商店`` —— 金币商店、宝石商（``PointShop.end_at`` 为空）、黒樽亭、银鳞伯爵府
* ``2 活动商店`` —— 宝石商里所有带结束时间的限时店

两类数据不展示：``shop_kind`` 为空（特殊入口 / 宝石包）与宝石商里
``point_shop_id=0`` 的自动生成杂物包（约 3.3k 条内容物，无分类也无时间）。
杂物包里内容全是技能书 / 宝典 / 秘笈的商品单独捞成一家「宝石商 · 秘笈」，归活动商店。

    python shop.py
"""

from __future__ import annotations

import argparse
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, load, names, write_json  # noqa: E402

#: ``Shop.shop_kind``
SHOP_KIND_LABELS = {
    1: "金币商店",
    2: "宝石商",
    3: "黒樽亭",
    4: "银鳞伯爵府",
}

#: 一级分类：常驻 / 活动
SHOP_GROUP_LABELS = {
    1: "常驻商店",
    2: "活动商店",
}

#: 内容物**全部**属于这些类型的商品算「技能书」，从 ``point_shop_id=0`` 的杂物包里单独捞出来
SKILL_BOOK_CONTENT_TYPES = {
    "Item::SkillLevelup",
    "Item::InheritSkill",
    "Item::LimitedSkillLevelup",
}

#: 捞出来的技能书店：key 与名字都单独造，归活动商店（游戏内按批次轮换 + 每日限购）
SKILL_BOOK_SHOP_KEY = (2, 0, 0)
SKILL_BOOK_SHOP_NAME = "宝石商 · 秘笈"

#: ``Shop.purchase_kind``
CURRENCY_LABELS = {
    1: "金币",
    2: "无偿宝石",
    3: "有偿宝石",
    4: "宝石 / 直购",
    5: "兑换点数",
}


def shop_name(kind, town: int, point_shop: dict | None, towns: dict) -> str:
    if kind == 1:
        if not town:
            return "金币商店 · 全城镇通用"
        label = names(towns.get(town) or {}).get("name") or f"城镇{town}"
        return f"金币商店 · {label}（特产）"
    base = SHOP_KIND_LABELS.get(kind or 0, "特殊商店")
    if point_shop:
        label = names(point_shop).get("name")
        if label:
            return f"{base} · {label}"
    return base


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.parse_args(argv)

    shops = load("Shop")
    towns = {row["id"]: row for row in load("TownConfig")}
    point_shops = {row["id"]: row for row in load("PointShop")}
    points = {row["id"]: row for row in load("Point")}
    rewards = {row["id"]: row for row in load("Reward")}
    equipments = {row["id"]: row for row in load("Equipment")}

    # 真正卖的东西在 ``ShopContent`` 里：``Shop.content_id`` 对礼包/宝石包是占位值
    # （4,356 行都写着 10000000），必须按 ``shop_id`` 反查内容物。
    contents_by_shop: dict[int, list] = collections.defaultdict(list)
    for row in load("ShopContent"):
        contents_by_shop[row.get("shop_id")].append(row)

    def content_name(content_type: str, content_id) -> tuple[str | None, str | None]:
        """内容物的显示名与图标（Item -> Reward，装备 -> Equipment，货币 -> Point）。"""
        content_type = content_type or ""
        if content_type.startswith("Item::"):
            target = rewards.get(content_id) or {}
        elif content_type == "Equip::Equipment":
            target = equipments.get(content_id) or {}
        elif content_type.startswith("Point::"):
            target = points.get(content_id) or {}
        else:
            target = {}
        label = names(target).get("name")
        return label, target.get("icon_resource")

    def row_contents(row: dict) -> list:
        contents = contents_by_shop.get(row.get("id"))
        if contents:
            return contents
        return [{"content_type": row.get("content_type"), "content_id": row.get("content_id")}]

    def is_skill_book(row: dict) -> bool:
        """内容物全是技能书 / 宝典 / 秘笈（不掺杂物）才算技能书商品。"""
        contents = row_contents(row)
        return bool(contents) and all(
            (content.get("content_type") or "") in SKILL_BOOK_CONTENT_TYPES
            for content in contents
        )

    def group_of(key: tuple) -> int:
        """1 常驻 / 2 活动。只有宝石商按 ``PointShop.end_at`` 区分，其余类别一律常驻。"""
        if key == SKILL_BOOK_SHOP_KEY:
            return 2      # 秘笈按批次轮换且每日限购，算活动
        kind, _, point_shop_id = key
        if kind != 2:
            return 1
        point_shop = point_shops.get(point_shop_id) or {}
        return 2 if (point_shop.get("end_at") or 0) else 1

    buckets: dict[tuple, list] = collections.defaultdict(list)
    skipped = 0
    for row in shops:
        kind = row.get("shop_kind")
        point_shop_id = row.get("point_shop_id") or 0
        if not kind:      # 宝石包 / 免费宝石等特殊入口，不展示
            skipped += 1
            continue
        # 宝石商里 point_shop_id=0 的自动生成杂物包（3.3k 条内容物）不展示，
        # 但里面的技能书商品单独捞出来成一家店
        if kind == 2 and not point_shop_id and not is_skill_book(row):
            skipped += 1
            continue
        town = (row.get("town_ids") or [0])[0]
        buckets[(kind, town, point_shop_id)].append(row)

    entries = []
    for index, (key, rows) in enumerate(
        sorted(
            buckets.items(),
            key=lambda kv: (group_of(kv[0]), kv[0][0], kv[0][1], kv[0][2]),
        ),
        start=1,
    ):
        kind, town, point_shop_id = key
        group = group_of(key)
        point_shop = point_shops.get(point_shop_id) or {}
        point_id = point_shop.get("point_id")
        items = []
        for row in rows:
            currency = row.get("purchase_kind")
            base = {
                "shop_id": row.get("id"),
                "price": row.get("price") or 0,
                "currency": currency,
                "currency_name": CURRENCY_LABELS.get(currency),
                "limit_kind": row.get("limit_kind") or 0,
                "limit_num": row.get("limit_num") or 0,
                "repeat": bool(row.get("is_repeat")),
                "condition": row.get("lineup_condition_id") or 0,
            }
            contents = contents_by_shop.get(row.get("id")) or []
            if not contents:      # 兜底：极少数商品行可能没有内容物记录
                contents = [{
                    "content_type": row.get("content_type"),
                    "content_id": row.get("content_id"),
                    "quantity": row.get("quantity"),
                }]
            for content in contents:
                content_type = content.get("content_type") or ""
                content_id = content.get("content_id")
                label, icon = content_name(content_type, content_id)
                item = {
                    **base,
                    "name": label,
                    "content_type": content_type,
                    "content_id": content_id,
                    "icon": icon,
                    "quantity": content.get("quantity") or 1,
                }
                if content_type == "Equip::Equipment":
                    # 商店卖的是某个档位行（``Equipment.id``），装备弹窗要的是 ``identification``
                    ident = (equipments.get(content_id) or {}).get("identification")
                    if ident:
                        item["content_ident"] = ident
                items.append(item)
        # 游戏内按 ``Shop.priority`` 排（同优先级按商品行 id 稳定排列），价格不参与排序
        priority_of = {row.get("id"): row.get("priority") or 0 for row in rows}
        items.sort(key=lambda item: (priority_of.get(item["shop_id"], 0), item["shop_id"]))

        entries.append({
            "id": index,
            "key": f"{kind or 0}-{town}-{point_shop_id}",
            "group": group,
            "group_name": SHOP_GROUP_LABELS[group],
            "kind": kind or 0,
            "kind_name": SHOP_KIND_LABELS.get(kind or 0, "特殊商店"),
            "town": town,
            "town_name": names(towns.get(town) or {}).get("name") if town else None,
            "point_shop_id": point_shop_id,
            "point_shop_name": names(point_shop).get("name") if point_shop else None,
            "point_id": point_id,
            "point_name": names(points.get(point_id) or {}).get("name") if point_id else None,
            "start_at": point_shop.get("start_at"),
            "end_at": point_shop.get("end_at"),
            "name": (SKILL_BOOK_SHOP_NAME if key == SKILL_BOOK_SHOP_KEY
                     else shop_name(kind, town, point_shop, towns)),
            "count": len(items),
            "items": items,
        })

    out_dir = os.path.join(CLEAN, "shop")
    write_json(os.path.join(out_dir, "shops.json"), entries)

    by_kind = collections.Counter((entry["group_name"], entry["kind_name"]) for entry in entries)
    total_items = sum(entry["count"] for entry in entries)
    print(f"{len(entries)} shops, {total_items} items, {skipped} rows skipped -> {out_dir}")
    for (group_name, kind_name), count in sorted(by_kind.items()):
        rows = sum(entry["count"] for entry in entries
                   if entry["group_name"] == group_name and entry["kind_name"] == kind_name)
        print(f"  {group_name} / {kind_name:<6} {count:>3} 家 {rows:>5} 件")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
