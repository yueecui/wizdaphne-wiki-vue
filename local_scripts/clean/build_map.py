"""把解包侧的地图产物（map_v3）转成前端长键数据：``data/map.json`` / ``data/enemyPool.json``。

数据来源（解包仓库）::

    <src>/floors.json        { maps: [...], floors: [...] }  层为单位
    <src>/unclassified.json  { pools: [...] }                挂不到层的编队池（敌群）

只保留页面需要的字段，敌人一律只留 ``enemy_id``，名称 / 属性由前端查敌人模块。
"""

from __future__ import annotations

import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SRC = r"D:\WizardyDaphne\WizardyDaphneUnpack\out\tmp\map_v3"
DEFAULT_OUT = os.path.join(ROOT, "data")


def read_json(path: str):
    with open(path, encoding="utf8") as fh:
        return json.load(fh)


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))


def norm_levels(lo: int, hi: int) -> tuple[int, int]:
    """等级区间可能出现 low>high（深层敌人 level 固定 80 + maxLevel 35~75），统一成升序。"""
    if lo > hi:
        lo, hi = hi, lo
    return lo, hi


def enemy_ref(row: dict) -> dict:
    level = row.get("level") or [0, 0]
    lo = level[0] if len(level) > 0 else 0
    hi = level[1] if len(level) > 1 else 0
    lo, hi = norm_levels(lo, hi)
    return {
        "enemy_id": row["enemyId"],
        "lv_min": lo,
        "lv_max": hi,
        "rows": row.get("formationRows", 0),
    }


def member(row: dict) -> dict:
    pos = row.get("position") or [0, 0]
    lo, hi = norm_levels(row.get("level", 0), row.get("maxLevel", 0))
    return {
        "enemy_id": row["enemyId"],
        "lv_min": lo,
        "lv_max": hi,
        "pos_x": pos[0] if len(pos) > 0 else 0,
        "pos_y": pos[1] if len(pos) > 1 else 0,
        "notorious": bool(row.get("isNotorious")),
        "wanted": bool(row.get("isWanted")),
        "hate": bool(row.get("hasHate")),
    }


def formation(row: dict) -> dict:
    lv = row.get("levelRange") or [0, 0]
    lo = lv[0] if len(lv) > 0 else 0
    hi = lv[1] if len(lv) > 1 else 0
    lo, hi = norm_levels(lo, hi)
    return {
        "formation_id": row["formationId"],
        "row_id": row["rowId"],
        "layout_id": row["layoutId"],
        "weight": row.get("weight", 0),
        "lv_min": lo,
        "lv_max": hi,
        "escape": row.get("escapeDifficulty", 0),
        "surprise": row.get("surpriseRate", 0),
        "preemption": row.get("preemptionRate", 0),
        "exp_rate": row.get("expRate", 0),
        "drop_id": row.get("dropId", 0),
        "special_drop_id": row.get("specialDropId", 0),
        "drop_probability": row.get("dropProbability", 0),
        "trap_id": row.get("trapId", 0),
        "rare_trap_id": row.get("rareTrapId", 0),
        "condition_id": row.get("conditionId", 0),
        "respawn_kind": row.get("respawnKind", 0),
        "symbol_id": row.get("enemySymbolId", 0),
        "symbol_kind": row.get("enemySymbolKind", 0),
        "grade_id": row.get("availableGradeId", 0),
        "friend_prob": row.get("friendlyProbability", 0),
        "covert": row.get("covertCollection", 0),
        "win_condition": row.get("battleWinConditionKind", 0),
        "members": [member(item) for item in (row.get("members") or [])],
    }


def floor_doc(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "map_id": row["mapId"],
        "map_name": row["mapName"],
        "area_id": row["areaId"],
        "scene_name": row.get("sceneName") or "",
        "ceiling": bool(row.get("existCeiling")),
        "floor_attribute": row.get("floorAttribute", 0),
        "enemy_placement": row.get("enemyPlacement") or [0, 0],
        "bgm": row.get("bgm") or "",
        "normal_enemies": [enemy_ref(item) for item in (row.get("normalEnemies") or [])],
        "notorious_enemies": [enemy_ref(item) for item in (row.get("notoriousEnemies") or [])],
        "formations": [formation(item) for item in (row.get("formations") or [])],
    }


def pool_doc(formation_id: int, group: dict) -> dict:
    """一条 = 一个编队分组；``floors`` 只放能确定关联上的层，不做任何推断。"""
    rows = sorted(group["rows"].values(), key=lambda item: item.get("rowId", 0))
    ranges: list[list[int]] = []
    for row in rows:
        level = row.get("levelRange") or [0, 0]
        lo = level[0] if len(level) > 0 else 0
        hi = level[1] if len(level) > 1 else 0
        lo, hi = norm_levels(lo, hi)
        pair = [lo, hi]
        if pair not in ranges:
            ranges.append(pair)
    ranges.sort()
    return {
        "id": formation_id,
        "row_count": len(rows),
        "lv_ranges": ranges,
        "normal_enemies": sorted(group["normal"].values(), key=lambda item: item["enemy_id"]),
        "notorious_enemies": sorted(group["notorious"].values(), key=lambda item: item["enemy_id"]),
        "floors": sorted(group["floors"].values(), key=lambda item: item["id"]),
        "formations": [formation(row) for row in rows],
    }


def build_pools(floors_src: dict, pools_src: dict) -> list[dict]:
    """所有编队分组：层里出现的 + 挂不到层的池，合并成同一份清单。"""
    groups: dict[int, dict] = {}

    def group_of(formation_id: int) -> dict:
        if formation_id not in groups:
            groups[formation_id] = {"rows": {}, "floors": {}, "normal": {}, "notorious": {}}
        return groups[formation_id]

    def add_row(row: dict, floor: dict | None = None) -> None:
        group = group_of(row["formationId"])
        group["rows"].setdefault(row["rowId"], row)
        if floor is not None:
            group["floors"].setdefault(
                floor["id"],
                {"id": floor["id"], "name": floor["name"], "map_name": floor["mapName"]},
            )
        # 同一行里同一敌人只算一次，避免站位重复计数
        seen: set[int] = set()
        for item in row.get("members") or []:
            enemy_id = item["enemyId"]
            if enemy_id in seen:
                continue
            seen.add(enemy_id)
            bucket = group["notorious"] if item.get("isNotorious") else group["normal"]
            lv_min, lv_max = norm_levels(item.get("level", 0), item.get("maxLevel", 0))
            current = bucket.get(enemy_id)
            if current is None:
                bucket[enemy_id] = {"enemy_id": enemy_id, "lv_min": lv_min, "lv_max": lv_max, "rows": 1}
            else:
                current["lv_min"] = min(current["lv_min"], lv_min)
                current["lv_max"] = max(current["lv_max"], lv_max)
                current["rows"] += 1

    for floor in floors_src["floors"]:
        for row in floor.get("formations") or []:
            add_row(row, floor)
    # 挂不到层的编队池：没有可确定关联的层，清单里 floors 为空
    for pool in pools_src.get("pools") or []:
        for row in pool.get("rows") or []:
            add_row(row)

    return [pool_doc(formation_id, product) for formation_id, product in sorted(groups.items())]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args(argv)

    floors_src = read_json(os.path.join(args.src, "floors.json"))
    pools_src = read_json(os.path.join(args.src, "unclassified.json"))

    maps = [
        {
            "id": item["id"],
            "name": item["name"],
            "kind": item.get("kind") or 0,
            "group_id": item.get("groupId") or 0,
            "town_name": item.get("townName") or "",
            "floor_ids": item.get("floorIds") or [],
        }
        for item in floors_src["maps"]
    ]
    floors = [floor_doc(item) for item in floors_src["floors"]]
    pools = build_pools(floors_src, pools_src)

    write_json(os.path.join(args.out, "map.json"), {"maps": maps, "floors": floors})
    write_json(os.path.join(args.out, "enemyPool.json"), {"pools": pools})

    for name in ("map.json", "enemyPool.json"):
        size = os.path.getsize(os.path.join(args.out, name))
        print(f"  {name:18} {size / 1024:.0f} KB")
    print(f"maps {len(maps)} / floors {len(floors)} / pools {len(pools)} -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(__import__("sys").argv[1:]))
