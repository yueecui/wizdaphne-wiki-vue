"""Clean ``HakenBlessing``（哈肯的加护）into **one standalone JSON**.

数据量很小（143 条），也不需要按 id 单独查询，所以不走 mock 管线、不拆记录页，
直接打成一个文件：

    public/blessing.json
      generatedAt   生成时间
      count         条数
      stats         {能力值 id: 名称}：kind 7000「加護」的 ``param_1``
      species       {EnemySpecies id: 名称}：kind 150 / 2340 的 ``param_1``
      attributes    {Attribute id: 名称}：kind 2363 的 ``param_2``
      items         [{id, name, name_jp, name_en, description, group, pool, tier,
                      rarity, weight, effects: [{kind, kind_name, params, turn, strength}]}]

名字跟着数据走（用到的种族 / 属性 / 能力值只有几种），前端一次 ``fetch`` 就能
把页面画完，不需要再查 V2 的 IndexedDB 模块、也不吃 ``Api/Version`` 的版本号。

``group_id`` 的规律是「加护池 × 10 + 稀有度档」（20001 / 20011 / 20021 / 20031 是
不同主题池，70151 是联动池），这里拆成 ``pool`` / ``tier`` 方便筛选。

已确认的 kind 参数含义（种族 / 属性 / 能力值都是 id）：

  * 7000「加護」：``param_1`` 被加成的基础能力值（``stats``），``param_2`` 加成 %
  * 150「种族特效」：``param_1`` 种族，``param_2`` 伤害 %（正）
  * 2340「种族抵抗」：``param_1`` 种族，``param_2`` 伤害 %（负）
  * 2363「属性攻击造成伤害提升（持续发动效果用）」：``param_1`` 伤害 %，``param_2`` 属性
  * 其余（耐性变动 / 属性伤害减轻 …）：只有数值

    python local_scripts/clean/blessing.py
"""

from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, load, names, table, text, write_json  # noqa: E402

OUT = os.path.join(ROOT, "public", "blessing.json")

#: 被加成的基础能力值（kind 7000 的 ``param_1``）。解包里没有这张枚举表，id 由
#: 加护与技能描述反推：
#:   力量加护 → 4、防守加护 → 5、玛纳加护 → 6 与 8、抵抗、魔防的加护 → 11 与 7、
#:   俊敏加护 → 14 与 10、命中加护 → 9、远程战斗加护Ⅱ → 12、
#:   古城遗迹加护（陷阱解除）→ 16、陷阱加护 → 16 与 17。
#: 3（SP）/ 13 / 15 等没在数据里出现过，不猜。
STATS = {
    1: "HP",
    2: "MP",
    4: "攻击力",
    5: "防御力",
    6: "魔力",
    7: "法术防御力",
    8: "神力",
    9: "命中",
    10: "回避",
    11: "抵抗",
    12: "会心",
    14: "行动速度",
    16: "陷阱解除",
    17: "陷阱回避",
}

#: 参数里哪一位是种族 / 属性 id（其余 kind 不翻译）
RACE_KINDS = (150, 2340)
ATTRIBUTE_KINDS = (2363,)
ATTRIBUTE_SLOT = 2  # 2363 的种族 / 属性 id 在 param_2


def trim_params(row: dict) -> list:
    """``param_1..param_7`` -> 去掉末尾 0 的列表（中间的 0 保留，位置不能错）。"""
    values = [row.get(f"param_{i}") or 0 for i in range(1, 8)]
    while values and not values[-1]:
        values.pop()
    return values


def names_of(table_rows: dict, ids) -> dict:
    """``{id: 名称}``：只保留用得到的 id（``names()`` 取中文，缺了回退日文）。"""
    out = {}
    for ident in ids:
        label, _ = text((table_rows.get(ident) or {}).get("name"))
        if label:
            out[str(ident)] = label
    return out


def groups_of(group_ids) -> dict:
    """``{group_id: {"layers": [楼层名]}}``。

    解包里加护组没有名字，但每个组都挂在一枚「楔」上：
    ``DungeonWedge.blessing_group_id`` -> ``dungeon_floor_move_id`` ->
    ``DungeonFloorMove.name``（例：``20001`` = 「B2F -圣堂-」）。一个组可能挂在多层
    （古城遗迹的 ``6000001`` 就有 4 层），所以是列表。
    """
    floor_moves = table("DungeonFloorMove")
    layers: dict[int, list[str]] = {}
    for wedge in load("DungeonWedge"):
        gid = wedge.get("blessing_group_id") or 0
        if not gid or gid not in group_ids:
            continue
        label, _ = text((floor_moves.get(wedge.get("dungeon_floor_move_id")) or {}).get("name"))
        names_of_group = layers.setdefault(gid, [])
        if label and label not in names_of_group:
            names_of_group.append(label)
    return {str(gid): {"layers": labels} for gid, labels in sorted(layers.items())}


def main() -> int:
    sub_effects = table("SkillSubEffect")
    sub_kinds = table("SkillSubEffectKind")
    rows = load("HakenBlessing")

    items = []
    species_ids: set[int] = set()
    attribute_ids: set[int] = set()

    for row in rows:
        group = row.get("group_id") or 0
        effects = []
        for sid in row.get("skill_sub_effect_ids") or []:
            effect = sub_effects.get(sid)
            if not effect:
                continue
            kind = effect.get("kind")
            params = trim_params(effect)
            # 只有确认过的 kind 才翻译，其余保留原值由前端按参数名显示
            if kind in RACE_KINDS and params:
                species_ids.add(params[0])
            if kind in ATTRIBUTE_KINDS and len(params) >= ATTRIBUTE_SLOT:
                attribute_ids.add(params[ATTRIBUTE_SLOT - 1])
            kind_jp, _ = text((sub_kinds.get(kind) or {}).get("name"))
            effects.append({
                "kind": kind,
                # 日文种类名：wiki 上还没配中文名（如 kind 7000）时用它兜底
                "kind_name": kind_jp,
                "params": params,
                "turn": effect.get("turn") or 0,
                "strength": effect.get("strength") or 0,
            })

        description, lang = text(row.get("description"))
        item = {
            "id": row.get("id"),
            **names(row),
            "description": description,
            "group": group,
            "pool": group // 10,
            "tier": group % 10,
            "rarity": row.get("rarity") or 0,
            "weight": row.get("weight") or 0,
            "effects": effects,
        }
        # 说明只有中文（缺席时回退日文并标记语言）
        if lang in ("ja", "en"):
            item["description_lang"] = lang
        items.append(item)

    items.sort(key=lambda item: (item["group"], item["id"]))
    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "count": len(items),
        "stats": {str(k): v for k, v in STATS.items()},
        "species": names_of(table("EnemySpecies"), sorted(species_ids)),
        "attributes": names_of(table("Attribute"), sorted(attribute_ids)),
        # group_id -> 楼层名（同一组可能对应多层，见下面的 groups_of）
        "groups": groups_of({item["group"] for item in items}),
        "items": items,
    }
    write_json(OUT, payload)

    size = os.path.getsize(OUT) / 1024
    pools = sorted({item["pool"] for item in items})
    print(f"{len(items)} blessings, {len(pools)} pools {pools}, "
          f"{len(payload['groups'])} groups, "
          f"{len(payload['species'])} species / {len(payload['attributes'])} attributes "
          f"-> {OUT} ({size:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
