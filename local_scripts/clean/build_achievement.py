# -*- coding: utf-8 -*-
"""用解包数据刷新 wiki 的 ``Data:成就.tabx``（同时产出一份 ``public/achievement.json`` 供本地开发）。

数据来源
    * 解包 ``AchievementMasterData``：``name`` / ``description`` / ``category`` /
      ``secret_flag``，以及解包 id（写进 ``uid`` 列）；
    * 线上 ``Data:成就.tabx``（先用 ``achievementTabx.ts fetch`` 拉到
      ``local_scripts/work/achievement.tabx.json``）：保留旧短 ``id``、``sub``（奈落
      地城子分类）与 ``comment``（攻略备注）。

规则
    * 按名称把解包条目对齐到旧表；名称有出入的少数条目见 ``ALIAS``（显式指定旧 id）；
    * 匹配上的保留旧短 id，新增条目按分类规则分配短 id：
        奈落（category 1）``d*100 + g*10 + seq``（d=1..4 为四个地城）；
        其余 ``cate*1000 + seq``（冒险者 2xxx / 装备 3xxx / 战斗 4xxx / 探索 5xxx / 其他 6xxx）；
    * ``i`` 按解包 ``AchievementMasterData`` 的表内顺序（id 升序，即游戏成就列表顺序）重排；
    * tabx 在 ``id`` 后新增 ``uid``（number）列，其余列沿用线上 schema。

用法::

    python local_scripts/clean/build_achievement.py            # 预览
    python local_scripts/clean/build_achievement.py --write     # 写入 tabx + json

之后用 ``npx tsx local_scripts/wiki/achievementTabx.ts upload`` 上传到线上。
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, load, text, write_json  # noqa: E402

#: 解包 ``category`` -> 旧表 ``cate``
CATE = {1: "奈落", 2: "冒险者", 3: "装备", 4: "战斗", 5: "探索", 99: "其他"}
NAME2CATE = {v: k for k, v in CATE.items()}

#: 奈落地城 -> ``d``（短 id 的百位）
DUNGEON_D = {"初始的奈落": 1, "贸易水路": 2, "不落的要塞": 3, "豪雪地带": 4}

JSON_PATH = os.path.join(ROOT, "public", "achievement.json")
TABX_PATH = os.path.join(ROOT, "local_scripts", "work", "achievement.tabx.json")

#: 没有线上 tabx 时的兜底 schema（与线上一致，另加 uid）
DEFAULT_FIELDS = [
    {"name": "i", "type": "number", "title": {"en": "i", "zh": "i"}},
    {"name": "id", "type": "string", "title": {"en": "id", "zh": "id"}},
    {"name": "uid", "type": "number", "title": {"en": "uid", "zh": "uid"}},
    {"name": "cate", "type": "string", "title": {"en": "cate", "zh": "cate"}},
    {"name": "sub", "type": "string", "title": {"en": "sub", "zh": "sub"}},
    {"name": "name", "type": "string", "title": {"en": "name", "zh": "name"}},
    {"name": "desc", "type": "string", "title": {"en": "desc", "zh": "desc"}},
    {"name": "comment", "type": "string", "title": {"en": "comment", "zh": "comment"}},
]

#: 解包名与旧表名有出入、且无法靠归一化匹配的条目：显式给出旧短 id
ALIAS = [
    ("果然有陷阱啊──！", 154),
    ("出门靠朋友，处世靠人情", 2047),
    ("装备收集家★★★★★", 3005),
    ("装备收集家★★★★★★", 3006),
    ("带着自豪举杯庆祝吧 -昔日的亡灵-", 6033),
    ("第一千杯的笑脸", 2066),
]

_VAR = str.maketrans({"內": "内", "弒": "弑", "、": ",", "【": "[", "】": "]", "（": "(", "）": ")", "～": "~"})


def norm(name: str | None) -> str:
    """名称归一化：全半角 / 空白 / 常见异体字与连接符。"""
    if not name:
        return ""
    s = unicodedata.normalize("NFKC", name).translate(_VAR)
    s = re.sub(r"[\s\u3000]+", "", s)
    s = re.sub(r"[·・:：\-—–－]", "", s)
    return s.lower()


def load_old() -> tuple[dict, list[dict]]:
    """读旧表：优先线上 tabx（fetch 产物），否则退回 public/achievement.json。"""
    if os.path.isfile(TABX_PATH):
        tabx = json.load(open(TABX_PATH, encoding="utf8"))
        fields = [f["name"] for f in tabx["schema"]["fields"]]
        rows = []
        for row in tabx["data"]:
            d = {name: (row[i] if i < len(row) else None) for i, name in enumerate(fields)}
            d["id"] = int(d["id"]) if d.get("id") is not None else None
            d["i"] = int(d["i"]) if d.get("i") is not None else 0
            rows.append(d)
        return tabx, rows
    data = json.load(open(JSON_PATH, encoding="utf8"))["achievement"]
    return {"description": {"zh": "由Tabx编辑器生成"}, "schema": {"fields": DEFAULT_FIELDS}, "data": []}, data


def main(argv: list[str]) -> int:
    write = "--write" in argv

    rows = load("AchievementMasterData")
    tabx, old = load_old()

    by_norm = {norm(a["name"]): a for a in old}
    by_id = {a["id"]: a for a in old}
    alias = {norm(name): oid for name, oid in ALIAS}

    matched: list[tuple[dict, dict, str]] = []   # (解包行, 旧行, 展示名)
    fresh: list[dict] = []                       # 新增（解包行）
    for r in rows:
        name = text(r.get("name"))[0] or ""
        o = by_norm.get(norm(name))
        if o is None and norm(name) in alias:
            o = by_id.get(alias[norm(name)])
        if o is not None:
            matched.append((r, o, name))
        else:
            fresh.append(r)

    # 新奈落条目靠"前缀最近"的已匹配奈落推断地城
    matched_abyss = [
        (str(r["id"]), o.get("sub"))
        for r, o, _ in matched
        if r.get("category") == 1 and o.get("sub")
    ]

    def dungeon_of(uid: int) -> str | None:
        us = str(uid)
        best, best_len, best_dist = None, -1, None
        for other, sub in matched_abyss:
            n = 0
            for a, b in zip(us, other):
                if a != b:
                    break
                n += 1
            dist = abs(uid - int(other))
            if n > best_len or (n == best_len and (best_dist is None or dist < best_dist)):
                best, best_len, best_dist = sub, n, dist
        return best

    # 现有短 id 的边界（奈落按地城，其余按分类）
    dungeon_max: dict[int, int] = {}
    cate_max: dict[int, int] = {}
    for a in old:
        c = NAME2CATE.get(a["cate"])
        if c == 1:
            d = a["id"] // 100
            if 1 <= d <= 4:
                dungeon_max[d] = max(dungeon_max.get(d, 0), a["id"])
        elif c is not None:
            cate_max[c] = max(cate_max.get(c, 0), a["id"])

    # 分配新短 id
    new_id: dict[int, int] = {}
    for c in sorted({r["category"] for r in fresh}):
        group = sorted((r for r in fresh if r["category"] == c), key=lambda r: r["id"])
        if c == 1:
            for r in group:
                sub = dungeon_of(r["id"])
                d = DUNGEON_D.get(sub or "")
                if d is None:
                    print(f"  ! 无法确定地城，暂按 d=1: uid={r['id']} {text(r['name'])[0]}")
                    d = 1
                nid = dungeon_max.get(d, d * 100) + 1
                while nid in by_id or nid in new_id.values():
                    nid += 1
                new_id[r["id"]] = nid
                dungeon_max[d] = nid
        else:
            cur = cate_max.get(c, c * 1000)
            for r in group:
                cur += 1
                while cur in by_id or cur in new_id.values():
                    cur += 1
                new_id[r["id"]] = cur
            cate_max[c] = cur

    def build(r: dict, ident: int, old_row: dict | None) -> dict:
        sub = old_row.get("sub") if old_row else None
        if r.get("category") == 1 and not sub:
            sub = dungeon_of(r["id"])
        rec = {
            "id": ident,
            "uid": r["id"],
            "name": text(r.get("name"))[0] or "",
            "desc": text(r.get("description"))[0] or "",
            "cate": CATE[r["category"]],
        }
        if sub:
            rec["sub"] = sub
        if old_row and old_row.get("comment"):
            rec["comment"] = old_row["comment"]
        if r.get("secret_flag"):
            rec["secret"] = True
        return rec

    out = [build(r, o["id"], o) for r, o, _ in matched]
    out += [build(r, new_id[r["id"]], None) for r in fresh]
    # i 按解包表（AchievementMasterData，id 升序）的自然顺序重排，
    # 让新增条目回到它们在游戏成就列表里的位置，而不是吊在分类末尾。
    master_index = {r["id"]: i for i, r in enumerate(rows)}
    out.sort(key=lambda rec: master_index.get(rec["uid"], len(rows)))
    out = [{"i": i, **rec} for i, rec in enumerate(out, 1)]

    # ---- 预览 ----
    print(f"解包 {len(rows)} 条 / 旧表 {len(old)} 条")
    print(f"匹配 {len(matched)}（含别名 {len(ALIAS)}）/ 新增 {len(fresh)}")
    old_ids = {o["id"] for _, o, _ in matched}
    orphan = [a for a in old if a["id"] not in old_ids]
    if orphan:
        print(f"  ! 旧表未匹配到解包（将丢弃）: {[(a['id'], a['name']) for a in orphan]}")
    if fresh:
        print("新增条目及新短 id：")
        for r in sorted(fresh, key=lambda r: new_id[r["id"]]):
            print(f"  {new_id[r['id']]:>5}  {CATE[r['category']]:<3}  {text(r['name'])[0]}")

    if not write:
        print("\n（预览模式，未写入；加 --write 落盘）")
        return 0

    # 1) 本地开发用的 JSON
    write_json(JSON_PATH, {"achievement": out})

    # 2) 线上 tabx：沿用已抓取的 schema，确保有 uid 列
    fields = [dict(f) for f in tabx["schema"]["fields"]]
    names = [f["name"] for f in fields]
    if "uid" not in names:
        at = names.index("id") + 1 if "id" in names else 1
        fields.insert(at, {"name": "uid", "type": "number", "title": {"en": "uid", "zh": "uid"}})
    names = [f["name"] for f in fields]

    def cell(rec: dict, name: str):
        if name == "i":
            return rec["i"]
        if name == "id":
            return str(rec["id"])
        if name == "uid":
            return rec["uid"]
        return rec.get(name)

    tabx["schema"]["fields"] = fields
    tabx["data"] = [[cell(rec, name) for name in names] for rec in out]
    write_json(TABX_PATH, tabx)

    print(f"\n已写入 {JSON_PATH}")
    print(f"已写入 {TABX_PATH}（{len(out)} 行，{len(names)} 列）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
