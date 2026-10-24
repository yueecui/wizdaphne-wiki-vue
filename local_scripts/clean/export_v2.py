"""Export the cleaned data into the "v2" web payload.

The v2 payload is a *separate* product from the hand-maintained
``public/data.json`` of the wiki: nothing here reads or overwrites the legacy
file, so both can coexist.

Layout (``local_scripts/work/clean/wiki_v2`` by default)::

    index.json                 manifest: counts, generated_at, schema_version
    characters.json            95 rows, list/filter payload (no stats)
    characters/<id>.json       one full record (stats, skills, fate, voice...)
    jobs.json                  17 jobs with skill lists
    skills.json                3,031 skills, list/filter payload
    skills/<ident>.json        one full record (description + per-level effects)
    effect_kinds.json          sub-effect kind dictionary
    excluded_awakening.json    the rows left out of the roster

Excluded from the roster (still present in the clean layer):
  * awakening styles  (id suffix 0099 / 0100)
  * the placeholder   (901100720000 / "？？？？")

    python export_v2.py
    python export_v2.py --copy-to D:\\path\\to\\wizdaphne-wiki-vue\\public\\data-v2
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, write_json  # noqa: E402

SCHEMA_VERSION = 1
AWAKENING_SUFFIX = ("0099", "0100")
PLACEHOLDER_IDS = {901100720000}

#: debug-only field, dropped from the per-character detail payload
CHARACTER_DROP = ("raw",)


def char_list_entry(row: dict) -> dict:
    return {
        "id": row["id"],
        "group": row["character_group_id"],
        "guide_no": row["guide_no"],
        "name": row["name"],
        "name_jp": row["name_jp"],
        "name_en": row["name_en"],
        "style": row["style"]["caption"]["name"],
        "is_default_style": bool(row["style"]["is_default"]),
        "rarity": row["rarity"],
        "race": row["race"],
        "attribute": row["attribute"],
        "gender": row["gender"],
        "personality": row["personality"],
        "alignment": row["alignment"],
        "jobs": [{"id": j["id"], "name": j["name"], "primary": bool(j["primary"])}
                 for j in row["jobs"]],
        "fate": row["fate"],
    }


def skill_list_entry(row: dict) -> dict:
    return {
        "identification": row["identification"],
        "name": row["name"],
        "name_jp": row["name_jp"],
        "name_en": row["name_en"],
        "kind": row["kind"],
        "kind_name": row["kind_name"],
        "max_level": row["max_level"],
        "is_passive": row["is_passive"],
        "player": row["player"],
        "sources": row["sources"],
        "jobs": row["jobs"],
        "flags": row["flags"],
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default=os.path.join(CLEAN, "wiki_v2"))
    ap.add_argument("--copy-to", default=None, help="copy the payload here after export")
    args = ap.parse_args(argv)

    out = args.out
    for sub in ("characters", "skills"):
        path = os.path.join(out, sub)
        if os.path.isdir(path):
            shutil.rmtree(path)
    os.makedirs(os.path.join(out, "characters"), exist_ok=True)
    os.makedirs(os.path.join(out, "skills"), exist_ok=True)

    # ---------- characters ----------
    rows = json.load(open(os.path.join(CLEAN, "character", "characters.json"), encoding="utf8"))
    roster, excluded = [], []
    for r in rows:
        suffix = str(r["id"])[-4:]
        if suffix in AWAKENING_SUFFIX or r["id"] in PLACEHOLDER_IDS:
            excluded.append(r)
        else:
            roster.append(r)

    write_json(os.path.join(out, "characters.json"), [char_list_entry(r) for r in roster])
    for r in roster:
        detail = {k: v for k, v in r.items() if k not in CHARACTER_DROP}
        write_json(os.path.join(out, "characters", f"{r['id']}.json"), detail)
    write_json(os.path.join(out, "excluded_awakening.json"), [
        {"id": r["id"], "name": r["name"], "style": r["style"]["caption"]["name"],
         "reason": "awakening" if str(r["id"])[-4:] in AWAKENING_SUFFIX else "placeholder"}
        for r in excluded
    ])

    # ---------- jobs ----------
    jobs = json.load(open(os.path.join(CLEAN, "job", "jobs.json"), encoding="utf8"))
    write_json(os.path.join(out, "jobs.json"), jobs)

    # ---------- skills ----------
    skills = json.load(open(os.path.join(CLEAN, "skill", "skills.json"), encoding="utf8"))
    levels = json.load(open(os.path.join(CLEAN, "skill", "skill_levels.json"), encoding="utf8"))
    kinds = json.load(open(os.path.join(CLEAN, "skill", "effect_kinds.json"), encoding="utf8"))

    write_json(os.path.join(out, "skills.json"), [skill_list_entry(s) for s in skills])
    for s in skills:
        ident = str(s["identification"])
        detail = dict(s)
        detail["levels"] = levels.get(ident, [])
        write_json(os.path.join(out, "skills", f"{ident}.json"), detail)
    write_json(os.path.join(out, "effect_kinds.json"), kinds)

    # ---------- manifest ----------
    write_json(os.path.join(out, "index.json"), {
        "schema_version": SCHEMA_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source": "local_scripts/work/clean",
        "counts": {
            "characters": len(roster),
            "character_groups": len({r["character_group_id"] for r in roster}),
            "excluded_awakening": len(excluded),
            "jobs": len(jobs),
            "skills": len(skills),
            "player_skills": sum(1 for s in skills if s["player"]),
        },
        "notes": [
            "roster excludes awakening styles (0099/0100) and the placeholder character",
            "names are zhs/jp/en; long text is Chinese with description_lang markers",
        ],
    })

    if args.copy_to:
        os.makedirs(args.copy_to, exist_ok=True)
        for name in os.listdir(out):
            src = os.path.join(out, name)
            dst = os.path.join(args.copy_to, name)
            if os.path.isdir(src):
                # overwrite in place: a rmtree of the wiki repo directory can be
                # blocked by editor "safe delete" shims, and every payload file is
                # regenerated anyway
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
        print(f"copied -> {args.copy_to}")

    print(f"{len(roster)} characters (+{len(excluded)} excluded), {len(jobs)} jobs, "
          f"{len(skills)} skills -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
