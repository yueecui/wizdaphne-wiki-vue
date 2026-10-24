"""Clean the job (class) category.

Input : ``out/masterdata`` tables ``Job``, ``CharacterSkill``, ``Character``,
        ``JobChangeItem``, ``Skill``.
Output: ``local_scripts/work/clean/job/jobs.json`` - one entry per job with name triple,
        category, base/growth stats, combat multipliers and the skill list
        (unlock level + attribute variants).

    python job.py
"""

from __future__ import annotations

import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, brief, load, names, table, write_json  # noqa: E402

#: master-data field -> wiki key (same names the frontend already uses)
MULTIPLIERS = {
    "attack_correction": "atk",
    "magic_correction": "mag",
    "divine_correction": "div",
    "defence_correction": "def",
    "magic_defence_correction": "mdef",
    "hit_correction": "acc",
    "avoid_correction": "eva",
    "resist_correction": "res",
    "initiative_correction": "speed",
    "detection_correction": "det",
    "trap_remove_correction": "dtrap",
    "trap_avoid_correction": "etrap",
    "mp_correction": "mp",
    "sp_correction": "sp",
    "exp_correction": "exp",
    "hate_rate": "hate_rate",
    "hate_offset": "hate_offset",
    "wanted_capture_correction": "wanted_capture",
    "trap_release_success_expand_rate": "trap_release_expand",
    "consume_trap_release_retry_hp": "trap_retry_hp",
}

STATS = ("str", "int", "pie", "vit", "agi", "dex", "luk")


def category(job_id: int) -> str:
    if 100 <= job_id < 200:
        return "standard"
    if 200 <= job_id < 300:
        return "collab"
    if 800 <= job_id < 900:
        return "character"
    return "other"


def main() -> int:
    jobs = load("Job")
    job_rows = {r["id"]: r for r in jobs}
    skills = {r["identification"]: r for r in load("Skill")}
    char_skill = load("CharacterSkill")
    chars = load("Character")
    job_change = load("JobChangeItem")

    # who starts / who can change into this job
    primary = collections.defaultdict(list)
    for c in chars:
        primary[c.get("job_id")].append(c["id"])
    changeable = collections.defaultdict(set)
    change_items = collections.defaultdict(list)
    for r in job_change:
        changeable[r["job_id"]].add(r["character_group_id"])
        # 转职到该职业所需的道具（无道具名字典，前端先显示 id）
        change_items[r["job_id"]].append({
            "item": r.get("item_id"),
            "quantity": r.get("quantity"),
            "group": r.get("character_group_id"),
        })

    # skill list grouped by job and aptitude (999 = unconditional)
    by_job = collections.defaultdict(list)
    for r in char_skill:
        by_job[r["job_id"]].append(r)

    out = []
    for jid in sorted(job_rows, key=lambda i: (job_rows[i].get("display_order") or 0, i)):
        row = job_rows[jid]
        entry = {"id": jid}
        entry.update(names(row))
        entry["abbreviation"] = (row.get("abbreviation") or {}).get("en") \
            if isinstance(row.get("abbreviation"), dict) else row.get("abbreviation")
        entry["display_order"] = row.get("display_order")
        entry["category"] = category(jid)
        entry["alignment"] = {
            k.split("_")[1]: bool(row.get(k))
            for k in ("alignment_good", "alignment_neutral", "alignment_evil")
        }
        entry["base"] = {k: row.get(f"base_{k}") for k in STATS + ("hp", "mp", "sp")}
        entry["growth"] = {k: row.get(f"growth_{k}") for k in STATS + ("hp", "mp", "sp")}
        entry["multipliers"] = {wiki: row.get(field) for field, wiki in MULTIPLIERS.items()}

        rows = sorted(by_job.get(jid, []), key=lambda r: (r.get("get_lv") or 0,
                                                          r.get("aptitude_id") or 0))
        main_skills, variants = [], collections.defaultdict(list)
        for r in rows:
            ident = (r.get("skill_id") or 0) // 100
            item = {"identification": ident, "get_lv": r.get("get_lv")}
            item.update(names(skills.get(ident) or {}))
            if (r.get("aptitude_id") or 999) == 999:
                main_skills.append(item)
            else:
                variants[r["aptitude_id"]].append(item)
        entry["skills"] = main_skills
        entry["skill_variants"] = {str(k): v for k, v in sorted(variants.items())}
        entry["skill_count"] = len({s["identification"] for s in main_skills}
                                   | {s["identification"] for v in variants.values() for s in v})
        entry["characters"] = {
            "primary": sorted(primary.get(jid, [])),
            "changeable": sorted(changeable.get(jid, [])),
        }
        items = sorted(change_items.get(jid, []), key=lambda x: (x["item"] or 0))
        if items:
            entry["change_items"] = items
        out.append(entry)

    path = os.path.join(CLEAN, "job", "jobs.json")
    write_json(path, out)

    std = [e for e in out if e["category"] == "standard"]
    print(f"{len(out)} jobs ({len(std)} standard, "
          f"{sum(1 for e in out if e['category'] == 'collab')} collab, "
          f"{sum(1 for e in out if e['category'] == 'character')} character) -> {path}")
    for e in out[:3]:
        print(f"    {e['id']:4d} {e['name']:<10} skills={e['skill_count']:3d} "
              f"atk={e['multipliers']['atk']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
