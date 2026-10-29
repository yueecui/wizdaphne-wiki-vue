"""Clean the adventurer (character) category into one readable table.

Input : unpacked master data (``WIZDAPHNE_MASTERDATA``, see common.py).
        ``Character`` is the adventurer row; every numeric ``*_id`` is resolved through
        the game's own dictionary tables:

          CharacterRarity  rarity          CharacterSpecies  race_id  (+ base stats)
          Job              job_id (+ stats) Attribute        aptitude_id (fire/water/...)
          Gender           gender_id        Personality      personality_id
          CharacterMental  mental_id        CharacterGrade   grade_id (+ stats)
          Skill            skill ids (``identification`` = skill_id // 100)
          CharacterSelfRestraintSkill       self_restraint_group -> discipline skills
          Talent / CharacterGrowthRate      talent min/max + per-level growth rates
          CollectionCharacter               compendium/guide number
          config/Data_CharacterExtra.tabx.xlsx  卡池组 / 上线日期 / 声优（手工维护）

Output: ``local_scripts/work/clean/character/<id>_<中文名>.json`` - one file per adventurer (identity with
        id + name for each enum, skills, talent, derived stats, images/voice, and the
        untouched ``raw`` row) plus ``index.json`` for orientation. Localized text keeps
        the ``{ja, zhs, zht, en}`` form used by out/masterdata.

    python character.py                     # split every adventurer into its own file
    python character.py --check phyllisia   # diff one entry against the guide page
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    CLEAN,
    MD,
    UNPACK,
    character_extra,
    effect_tags,
    names as name_triple,
    sort_discipline_tags,
)

STAT_KEYS = ("str", "int", "pie", "vit", "agi", "dex", "luk")

#: 1/2/3 -> Wizardry's good/neutral/evil (checked against the guide page: Phyllisia is 3
#: and the site shows alignment "evil"); the character row itself only carries the number.
ALIGNMENT = {1: "good", 2: "neutral", 3: "evil"}

_BAD_FILE_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

#: `__` in a file name is collapsed into a space by MediaWiki, so the name the
#: wiki serves never matches the shipped one (e.g. ``tmb_chara__01132_03_926``).
_MULTI_UNDERSCORE = re.compile(r"_{2,}")


def display_name(value) -> str:
    """Best Chinese label for a localized name field (falls back ja -> en)."""
    if isinstance(value, dict):
        return value.get("zhs") or value.get("ja") or value.get("en") or ""
    return value or ""


def file_safe(text: str) -> str:
    return _BAD_FILE_CHARS.sub("_", (text or "").strip()).strip(" .")


def image_stem(value) -> str:
    """Normalize a sprite name for the wiki (``__`` -> ``_``)."""
    return _MULTI_UNDERSCORE.sub("_", (value or "").strip())


def image_asset(thumbnail) -> dict:
    """Locate the thumbnail sprite that ``Character.thumbnail_name`` points at.

    ``thumbnail_name`` is the sprite stem only. Most of them live in
    ``assets.lib/sprite/thumbnail/chara``; the few gacha portraits use the
    ``tmb_gasha_`` prefix and live in ``.../thumbnail/gasha`` instead.
    """
    stem = image_stem(thumbnail)
    if not stem:
        return {"thumbnail_file": None, "thumbnail_dir": None}
    return {
        "thumbnail_file": stem + ".png",
        "thumbnail_dir": "gasha" if stem.startswith("tmb_gasha_") else "chara",
    }


#: 每个角色三张「结缘」立绘，索引就是 ``Character.image_name``（三位数编号）：
#: ``assets.lib/sprite/fate_image`` / ``fatechara`` / ``fatechara_face``。
#: 校验过：Character(105) + FateCharacter(65) 的 image_name 互不重复且全部有图。
FATE_ART_TEMPLATES = (
    ("fate_image", "FateImage{0}.png"),        # 结缘界面半身立绘
    ("fate_chara", "FateChara{0}.png"),        # 全身立绘
    ("fate_face", "FateCharaFace{0}.png"),     # 列表头像
)


def fate_art(image_name) -> dict:
    """The three fate (结缘) artworks indexed by ``Character.image_name``."""
    text = str(image_name or "").strip()
    if not text.isdigit():
        return {key: None for key, _ in FATE_ART_TEMPLATES}
    index = f"{int(text):03d}"
    return {key: tpl.format(index) for key, tpl in FATE_ART_TEMPLATES}


def gacha_art_map() -> dict:
    """``character id -> (概率UP列表小图, 结缘详情大图)`` from ``GachaCharacterAppeals``.

    263 rows over 54 characters; both image names repeat identically for every row of a
    character, so the first row wins. ``gacha_item_banner`` / ``legend_character_sale``
    are the two sprite folders those names point at.
    """
    path = os.path.join(MD, "GachaCharacterAppeals.json")
    if not os.path.isfile(path):
        return {}
    out: dict = {}
    for row in json.load(open(path, encoding="utf8")):
        cid = row.get("character_character_id")
        if not cid or cid in out:
            continue
        banner = row.get("banner_image_name")
        detail = row.get("detail_image_name")
        out[cid] = (f"{banner}.png" if banner else None,
                    f"{detail}.png" if detail else None)
    return out


def load(name: str):
    path = os.path.join(MD, name + ".json")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"no {name}.json in {MD}")
    return json.load(open(path, encoding="utf8"))


class Table:
    """A game table indexed by id, with a name accessor (zhs -> ja -> en)."""

    def __init__(self, name: str):
        self.rows = {r["id"]: r for r in load(name) if isinstance(r, dict) and "id" in r}
        self.name = name

    def get(self, i):
        return self.rows.get(i)

    def brief(self, i):
        r = self.rows.get(i)
        out = {"id": i, "name": None, "name_jp": None, "name_en": None}
        if r is not None:
            out.update(name_triple(r))
        return None if (r is None and i in (None, 0)) else out


def skill_ref(skill_by_ident: dict, ident):
    """``{identification, name, name_jp, name_en}`` for a skill identification."""
    row = skill_by_ident.get(ident)
    out = {"identification": ident, "name": None, "name_jp": None, "name_en": None}
    if row:
        out.update(name_triple(row))
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", metavar="SLUG",
                    help="compare one character against out/reference/guide/*_character_<slug>.json")
    args = ap.parse_args(argv)

    chars = load("Character")
    rarity, job = Table("CharacterRarity"), Table("Job")
    species, attribute = Table("CharacterSpecies"), Table("Attribute")
    gender, personality = Table("Gender"), Table("Personality")
    mental, grade = Table("CharacterMental"), Table("CharacterGrade")
    talents = {r["id"]: r for r in load("Talent")}
    rates: dict = {}
    for r in load("CharacterGrowthRate"):
        rates.setdefault(r["talent_id"], []).append(r)
    for rows in rates.values():
        rows.sort(key=lambda r: r.get("job_lv") or 0)
    skills = {}
    top_skill: dict = {}
    for r in load("Skill"):
        ident = r.get("identification")
        skills.setdefault(ident, r)
        # 克己技能的 kind 集合每级相同、只有数值变化，统一取最高等级
        if ident not in top_skill or (r.get("level") or 0) > (top_skill[ident].get("level") or 0):
            top_skill[ident] = r
    restraint: dict = {}
    for r in load("CharacterSelfRestraintSkill"):
        restraint.setdefault(r.get("group_id"), []).append(r)
    job_change: dict = {}
    for r in load("JobChangeItem"):
        job_change.setdefault(r["character_group_id"], []).append(r["job_id"])
    # 隐退后获得的「XX 的才能」：FateCharacterStatuses.default_skill_id -> Skill 1930150xx
    fate_skills: dict = {}
    for r in load("FateCharacterStatuses"):
        if r.get("character_type") == "Character::Character":
            fate_skills[r["character_id"]] = r["default_skill_id"]
    collection = load("CollectionCharacter")
    # 卡池图：概率UP列表小图 + 结缘详情大图（只有 54 个角色有）
    gacha_art = gacha_art_map()
    # 手工维护的补充数据（卡池组 / 上线日期 / 声优），见 config/Data_CharacterExtra.tabx.xlsx
    extra = character_extra()

    guide_no = {}
    for g in collection:
        cid, n = g.get("category_select_id"), g.get("list_number")
        if cid is not None and n is not None:
            guide_no.setdefault(cid, n)

    def stat_sum(*tables):
        """Base stats = species + attribute + grade + gender (job's own base is not part
        of it - verified against the guide page for two characters)."""
        out = {}
        for k in STAT_KEYS:
            vals = [t.get(f"base_{k}") for t in tables if isinstance(t, dict)]
            out[k] = sum(v for v in vals if isinstance(v, int))
        return out

    def growth_sum(*tables):
        out = {}
        for k in STAT_KEYS:
            vals = [t.get(f"growth_{k}") for t in tables if isinstance(t, dict)]
            out[k] = sum(v for v in vals if isinstance(v, int))
        return out

    def pools(spec):
        return {k: {"base": spec.get(f"base_{k}"), "growth": spec.get(f"growth_{k}")}
                for k in ("hp", "mp", "sp") if spec}

    def skills_of(c):
        ids = [i for i in (c.get("skill_identification_1"), c.get("skill_identification_2"))
               if i]
        pot = [i for i in (c.get("sub_skill_identification_1"),
                           c.get("sub_skill_identification_2")) if i]
        uniq = c.get("unique_skill_ids") or []
        group = restraint.get(c.get("self_restraint_group"), [])
        return {
            "inherit": [skill_ref(skills, i) for i in ids],
            "potential_inherit": [skill_ref(skills, i) for i in pot],
            "unique": [dict({"id": u}, **skill_ref(skills, u // 100)) for u in uniq],
            "same_identifications": c.get("same_skill_identification_ids") or [],
            "exclude_inheritance": c.get("exclude_inheritance_skill_ids") or [],
            "discipline": [dict(skill_ref(skills, g.get("skill_identification")),
                                level=g.get("level"), need_point=g.get("need_point"),
                                skill_level=g.get("skill_level"))
                           for g in group],
            "get_lv": c.get("skill_get_lv"),
        }

    def fate_of(c):
        """隐退后获得的天赋技能（「XX 的才能」），来自 FateCharacterStatuses。"""
        sid = fate_skills.get(c.get("id"))
        if not sid:
            return None
        ref = skill_ref(skills, sid)
        short = (ref.get("name") or "").replace("的才能", "") or None
        return dict(ref, type=short)

    # ---- 克己：每个角色一个专属克己技能，同稀有度共享一套标准加成 ----
    effect_groups = {g["id"]: g for g in load("SkillEffectGroup")}
    sub_effects = {s["id"]: s for s in load("SkillSubEffect")}
    restraint_skill: dict = {}
    for group_id, entries in restraint.items():
        top = max(entries, key=lambda r: r.get("level") or 0)
        restraint_skill[group_id] = top.get("skill_identification")

    def restraint_kinds(identification) -> dict:
        row = top_skill.get(identification)
        if not row:
            return {}
        out = {}
        for gid in row.get("skill_effect_group_ids") or []:
            group_row = effect_groups.get(gid) or {}
            for sid in group_row.get("sub_effect_ids") or []:
                sub = sub_effects.get(sid)
                if sub and sub.get("kind"):
                    out[sub["kind"]] = sub.get("param_1")
        return out

    kinds_by_char = {}
    for c in chars:
        ident = restraint_skill.get(c.get("self_restraint_group"))
        if ident:
            kinds_by_char[c.get("id")] = restraint_kinds(ident)

    # 同稀有度对比：数值比同稀有度的标准值更高，或该加成只有少数角色才拥有，
    # 就是「额外提升」的属性（例如加斯顿的回避 + 毒耐性）
    extra_kinds: dict = {}
    by_rarity: dict = {}
    for c in chars:
        by_rarity.setdefault(c.get("rarity"), []).append(c.get("id"))
    for ids in by_rarity.values():
        spread: dict = {}
        for cid in ids:
            for kind, value in kinds_by_char.get(cid, {}).items():
                spread.setdefault(kind, []).append(value)
        for cid in ids:
            picked = []
            for kind, value in kinds_by_char.get(cid, {}).items():
                values = spread.get(kind) or [value]
                if len(values) * 2 < len(ids) or value > min(values):
                    picked.append(kind)
            extra_kinds[cid] = sorted(picked)

    rows = []
    for c in chars:
        spec, jb = species.get(c.get("race_id")), job.get(c.get("job_id"))
        attr, gr = attribute.get(c.get("aptitude_id")), grade.get(c.get("grade_id"))
        gen = gender.get(c.get("gender_id"))
        tal = talents.get(c.get("talent_id")) or {}
        group = c.get("character_group_id") or c.get("id")
        sup = extra.get(c.get("id")) or {}
        item_banner, sale_detail = gacha_art.get(c.get("id"), (None, None))
        # 主职业放最前面，其余（第二职业 / 可转职）按 id 排序，和 V1 的 class[] 顺序一致
        main_job = c.get("job_id")
        job_ids = ([main_job] if main_job else []) + sorted(
            j for j in set(job_change.get(group) or []) if j != main_job
        )
        rows.append({
            "id": c.get("id"),
            "character_group_id": group,
            "guide_no": guide_no.get(c.get("id")),
            "names": c.get("name"),
            "name": display_name(c.get("name")) or None,
            "name_jp": (c.get("name") or {}).get("ja") if isinstance(c.get("name"), dict) else None,
            "name_en": (c.get("name") or {}).get("en") if isinstance(c.get("name"), dict) else None,
            "style": {
                "caption": name_triple({"name": c.get("caption_name")}),
                "is_default": c.get("is_default_style"),
                "before_awakening": c.get("before_awakening_character_id"),
                "awakening": c.get("awakening_character_id"),
            },
            "rarity": rarity.brief(c.get("rarity")),
            "job": job.brief(c.get("job_id")),
            "jobs": [dict(job.brief(j), primary=(j == c.get("job_id"))) for j in job_ids],
            "attribute": attribute.brief(c.get("aptitude_id")),
            "race": species.brief(c.get("race_id")),
            "gender": gender.brief(c.get("gender_id")),
            "personality": personality.brief(c.get("personality_id")),
            "mental": {"id": c.get("mental_id"),
                       "value": (mental.get(c.get("mental_id")) or {}).get("mental")},
            "grade": grade.brief(c.get("grade_id")),
            "alignment": {"id": c.get("alignment"),
                          "name": ALIGNMENT.get(c.get("alignment")),
                          "point": c.get("alignment_point")},
            "skills": skills_of(c),
            # 潜在继承技能的解锁等级（sub_inheritance_grade_id）
            "potential_grade": c.get("sub_inheritance_grade_id"),
            "fate": fate_of(c),
            "self_restraint": {
                "id": restraint_skill.get(c.get("self_restraint_group")),
                "extra_kinds": extra_kinds.get(c.get("id")) or [],
                "extra_tags": sort_discipline_tags(
                    t for k in extra_kinds.get(c.get("id")) or [] for t in effect_tags(k)
                ),
            },
            "talent": {**{"id": c.get("talent_id")},
                       **name_triple({"name": tal.get("name")}),
                       "min": {k: tal.get(f"min_{k}") for k in STAT_KEYS},
                       "max": {k: tal.get(f"max_{k}") for k in STAT_KEYS}},
            "stats": {
                "base": stat_sum(spec, attr, gr, gen),
                "growth": growth_sum(spec, attr),
                "pools": pools(spec),
                "growth_rate": [{k: r.get(f"{k}_rate") for k in
                                 STAT_KEYS + ("hp", "mp", "sp")}
                                for r in rates.get(c.get("talent_id"), [])],
            },
            "images": {
                # 结缘立绘的索引（三位数），三张 Fate* 图都用它
                "image": c.get("image_name"),
                **fate_art(c.get("image_name")),
                # 卡池图（没有卡池记录的角色为 None）
                "gacha_item_banner": item_banner,
                "legend_character_sale": sale_detail,
                "thumbnail": image_stem(c.get("thumbnail_name")) or None,
                **image_asset(c.get("thumbnail_name")),
            },
            "voice": {"speech": c.get("speech"), "breakup_speech": c.get("breakup_speech"),
                      "voice_group_id": c.get("voice_group_id")},
            "pool_group": sup.get("pool_group"),
            # 概率UP立绘编号（手工表 banner 列，数字补 5 位后即 gacha_banner_00002.png）
            "banner": sup.get("banner") or [],
            "release_date": sup.get("release_date"),
            "character_voice": sup.get("character_voice"),
            "raw": c,
        })

    rows.sort(key=lambda r: (r["guide_no"] is None, r["guide_no"] or 0))
    out_dir = os.path.join(CLEAN, "character")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):                    # idempotent: drop the previous run
        if f.endswith(".json"):
            os.remove(os.path.join(out_dir, f))

    index = {}
    for r in rows:                                   # one file per adventurer
        label = file_safe(display_name(r.get("name")))
        stem = f"{r['id']}_{label}" if label else str(r["id"])
        with open(os.path.join(out_dir, stem + ".json"), "w", encoding="utf8") as fh:
            json.dump(r, fh, ensure_ascii=False, indent=1)
        index[stem + ".json"] = {
            "id": r["id"], "group": r["character_group_id"], "guide_no": r["guide_no"],
            "name": r["name"], "name_jp": r["name_jp"], "name_en": r["name_en"],
            "style": r["style"]["caption"]["name"],
            "is_default_style": r["style"]["is_default"],
        }
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf8") as fh:
        json.dump(dict(sorted(index.items())), fh, ensure_ascii=False, indent=1)

    # two aggregate views: flat rows (105) and character groups (76)
    with open(os.path.join(out_dir, "characters.json"), "w", encoding="utf8") as fh:
        json.dump(rows, fh, ensure_ascii=False, indent=1)

    groups: dict = {}
    for r in rows:
        g = groups.setdefault(r["character_group_id"], {
            "character_group_id": r["character_group_id"],
            "guide_no": None,
            "name": r["name"], "name_jp": r["name_jp"], "name_en": r["name_en"],
            "rarity": r["rarity"], "race": r["race"], "attribute": r["attribute"],
            "gender": r["gender"], "jobs": r["jobs"], "fate": r["fate"], "styles": [],
            "default_style": None,
        })
        g["styles"].append({
            "id": r["id"], "caption": r["style"]["caption"]["name"],
            "is_default": bool(r["style"]["is_default"]),
            "awakening": r["style"]["awakening"],
            "before_awakening": r["style"]["before_awakening"],
        })
        if r["guide_no"] and g["guide_no"] is None:
            g["guide_no"] = r["guide_no"]
        if r["style"]["is_default"]:
            g["default_style"] = r["id"]
    for g in groups.values():
        g["styles"].sort(key=lambda s: (not s["is_default"], s["id"]))
    ordered = dict(sorted(groups.items(), key=lambda kv: (kv[1]["guide_no"] is None,
                                                         kv[1]["guide_no"] or 0, kv[0])))
    with open(os.path.join(out_dir, "character_groups.json"), "w", encoding="utf8") as fh:
        json.dump(ordered, fh, ensure_ascii=False, indent=1)

    known = sum(1 for r in rows if r["guide_no"] is not None)
    named = sum(1 for r in rows if r["jobs"] and r["race"] and r["attribute"])
    styles = sum(1 for r in rows if not r["style"]["is_default"])
    two_jobs = sum(1 for g in groups.values() if len(g["jobs"]) > 1)
    print(f"{len(rows)} character rows / {len(groups)} groups ({known} with guide_no, "
          f"{styles} styles, {two_jobs} groups with 2 jobs, {named} fully resolved)"
          f" -> {out_dir}")
    print("    index.json / characters.json / character_groups.json + one file per row")
    for fname in list(index)[:3]:
        print(f"    {fname}")

    if args.check:
        ref_path = os.path.join(UNPACK, "out", "reference", "guide", f"zh-Hans_character_{args.check}.json")
        if not os.path.isfile(ref_path):
            print(f"  (no reference payload: {ref_path})")
            return 0
        ref = json.load(open(ref_path, encoding="utf8"))
        want = {}
        for row in ref["dataCard"]["columns"]:
            for cell in row:
                v = cell.get("value") or {}
                if v.get("type") == "keyword":
                    want[cell["path"]] = v["keywords"][0]["key"]
        compendium = None
        for row in ref["description"]["fields"]:
            for cell in row:
                if cell["path"] == "compendium_no":
                    compendium = (cell.get("value") or {}).get("numbers", [None])[0]
        mine = next((r for r in rows if r["guide_no"] == compendium), None)
        if mine is None:
            print(f"  (no local character with guide_no {compendium})")
            return 0
        def en(label):
            return (mine.get(label) or {}).get("name_en")
        got = {
            "rarity_key": en("rarity"),
            "job_key": en("job"),
            "attribute_key": en("attribute"),
            "race_key": en("race"),
            "gender_key": en("gender"),
            "alignment_key": mine["alignment"]["name"],
        }
        print(f"  --- {args.check}: local vs guide ---")
        for k, refv in want.items():
            if k in got:
                mine_v = (got[k] or "").lower().replace(" ", "-") if got[k] else None
                mark = "OK " if mine_v == refv else "!! "
                print(f"    {mark}{k:<20} local={mine_v!s:<22} guide={refv}")
        print(f"    guide compendium_no={compendium}  local guide_no={mine['guide_no']}"
              f"  name={json.dumps(mine['names'], ensure_ascii=False)}")
        print(f"    inherit skill: {json.dumps(mine['skills']['inherit'], ensure_ascii=False)}")
        print(f"    unique skills: {json.dumps(mine['skills']['unique'], ensure_ascii=False)}")
        print(f"    discipline   : {json.dumps(mine['skills']['discipline'][:2], ensure_ascii=False)}")
        print(f"    talent min/max: {json.dumps(mine['talent']['min'])} / "
              f"{json.dumps(mine['talent']['max'])}")
        gbase = ref["statsData"].get("base") or {}
        bdiff = {k: v - gbase[k] for k, v in mine["stats"]["base"].items()
                 if k in gbase and v != gbase[k]}
        print(f"    base stats    : {json.dumps(mine['stats']['base'])}"
              f"  guide={json.dumps(gbase)}  {'OK' if not bdiff else 'DIFF ' + json.dumps(bdiff)}")
        print(f"    growth stats  : {json.dumps(mine['stats']['growth'])}"
              f"  guide={json.dumps(ref['statsData'].get('growth'))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
