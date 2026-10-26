"""Round 1: build the long-key dataset consumed by the wiki pipeline.

Reads the cleaned layer (``local_scripts/work/clean``) and writes a **compact long-key**
dataset, i.e. the same information as before but without structurally redundant
fields:

  * reference objects (rarity / race / attribute / gender / personality /
    grade / job / target) are reduced to their id; the names live once in
    ``enums.json``;
  * ``kind_name`` / ``target_text`` are dropped (resolved through
    ``enums.json`` / ``effect_kinds.json``);
  * duplicate skill references inside a character are collapsed.

Layout (``--out`` defaults to ``<repo>/data``)::

    meta.json                     counts / timestamps / pipeline notes
    enums.json                    id -> {name, name_jp, name_en} dictionaries
    excluded.json                 awakening styles + placeholder (reference only)
    characters.json               95 rows  (totals; roster fields + stats/talent/skills/voice)
    jobs.json                     17 jobs  (totals; skill refs only, no names)
    skills.json                   3,031 rows (totals; skill fields + description + levels)
    equipments.json               841 rows (totals; weapon / armor fields + stats)
    effect_kinds.json             414 sub-effect kinds -> id + usage count + param slots
    character/<id>.json           one character
    job/<id>.json                 one job
    skill/<identification>.json   one skill
    equipment/<identification>.json  one equipment

Totals live in the root for grepping; the per-record files under
``character/ job/ skill/`` make a single entry easy to read in an editor.

Files are **overwritten in place**; directories are never removed, so the
export stays safe under editors that intercept recursive deletes.

    python local_scripts/clean/build_data.py
    python local_scripts/clean/build_data.py --out data
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, MD, ROOT, text  # noqa: E402

SCHEMA_VERSION = 3
AWAKENING_SUFFIX = ("0099", "0100")
PLACEHOLDER_IDS = {901100720000}
DEFAULT_OUT = os.path.join(ROOT, "data")

#: ``Skill.skill_kind`` (inferred, see docs 02 §6)
SKILL_KIND = {
    1: "普通攻击", 2: "攻击技能", 3: "辅助技能", 4: "攻击魔法", 5: "回复魔法",
    6: "强化魔法", 7: "妨碍魔法", 20: "设置陷阱", 90: "特殊",
}
#: ``Skill.cost_kind``: 1 = SP (weapon skills), 2 = MP (magic / prayers)
COST_KIND = {1: "SP", 2: "MP"}
#: ``SkillDamageEffect.damage_type``
DAMAGE_TYPE = {1: "物理", 2: "魔法", 3: "特殊"}
#: ``Skill.use_timing``: only the values verified against the guide site
USE_TIMING = {2: "战斗中", 5: "常时"}
#: ``Character.alignment`` enum (1 善 / 2 中立 / 3 恶, verified 93/93)
ALIGNMENT = {1: "善", 2: "中立", 3: "恶"}


def read_json(*parts: str):
    with open(os.path.join(*parts), encoding="utf8") as fh:
        return json.load(fh)


def read_clean(*parts: str):
    return read_json(CLEAN, *parts)


def compact(value):
    """Drop ``None`` / empty containers; keep ``0``, ``False`` and ``''``."""
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            item = compact(item)
            if item is None or item == [] or item == {}:
                continue
            out[key] = item
        return out
    if isinstance(value, list):
        return [compact(item) for item in value]
    return value


def write_json(path: str, data, indent: int | None = None) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as fh:
        if indent is None:
            json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(data, fh, ensure_ascii=False, indent=indent)


def dedupe(values: list) -> list:
    out, seen = [], set()
    for v in values:
        key = json.dumps(v, sort_keys=True, ensure_ascii=False) if isinstance(v, (dict, list)) else v
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
    return out


def enum_entry(obj: dict | None) -> dict | None:
    if not isinstance(obj, dict):
        return None
    oid = obj.get("id")
    if oid in (None, 0):
        return None
    entry = {"name": obj.get("name"), "name_jp": obj.get("name_jp"), "name_en": obj.get("name_en")}
    return compact(entry) or None


def collect_enum(target: dict, obj: dict | None) -> None:
    entry = enum_entry(obj)
    if entry is not None:
        target.setdefault(str(obj["id"]), entry)


def localized_name(raw) -> dict:
    if isinstance(raw, dict):
        return compact({
            "name": raw.get("zhs") or raw.get("zht") or raw.get("ja") or raw.get("en"),
            "name_jp": raw.get("ja"),
            "name_en": raw.get("en"),
        })
    if isinstance(raw, str):
        return {"name": raw, "name_jp": raw}
    return {}


def enum_table(name: str) -> dict:
    """Whole table -> ``{id: {name, name_jp, name_en}}`` (ids kept as strings)."""
    out = {}
    for row in read_json(MD, name + ".json"):
        oid = row.get("id")
        if not oid:
            continue
        out[str(oid)] = localized_name(row.get("name"))
    return out


def trim_params(params: list | None) -> list | None:
    """Drop trailing zeros: ``[1000,0,0]`` -> ``[1000]`` (positions preserved)."""
    if not params:
        return None
    values = list(params)
    while values and not values[-1]:
        values.pop()
    return values or None


def trim_zeros(values: list | None) -> list | None:
    if not values:
        return None
    out = list(values)
    while out and not out[-1]:
        out.pop()
    return out or None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args(argv)
    out = args.out

    characters = read_clean("character", "characters.json")
    jobs = read_clean("job", "jobs.json")
    skills = read_clean("skill", "skills.json")
    levels = read_clean("skill", "skill_levels.json")
    effect_kinds = read_clean("skill", "effect_kinds.json")
    equipments = read_clean("equipment", "equipments.json")
    try:
        items = read_clean("item", "items.json")
    except FileNotFoundError:      # item.py 没跑过时不影响其它模块
        items = []
    try:
        shops = read_clean("shop", "shops.json")
    except FileNotFoundError:      # shop.py 没跑过时不影响其它模块
        shops = []
    try:
        relics = read_clean("relic", "relics.json")
    except FileNotFoundError:      # relic.py 没跑过时不影响其它模块
        relics = []

    roster, excluded = [], []
    for row in characters:
        if str(row["id"])[-4:] in AWAKENING_SUFFIX or row["id"] in PLACEHOLDER_IDS:
            excluded.append(row)
        else:
            roster.append(row)

    enums: dict[str, dict] = {
        "alignment": {str(k): v for k, v in ALIGNMENT.items()},
        "skill_kind": {str(k): v for k, v in SKILL_KIND.items()},
        "cost_kind": {str(k): v for k, v in COST_KIND.items()},
        "damage_type": {str(k): v for k, v in DAMAGE_TYPE.items()},
        "use_timing": {str(k): v for k, v in USE_TIMING.items()},
        "rarity": {}, "race": {}, "attribute": {}, "gender": {}, "personality": {},
        "grade": {}, "job": {}, "target": {}, "equipment_type": {},
    }

    # whole-table dictionaries first: character rows only cover what they use
    for key, table in (
        ("rarity", "CharacterRarity"),
        ("grade", "CharacterGrade"),
        ("gender", "Gender"),
        ("personality", "Personality"),
        ("attribute", "Attribute"),
        ("job", "Job"),
    ):
        enums[key] = enum_table(table)

    # ---------- characters (one row = list fields + detail fields) ----------
    char_rows = []
    for row in roster:
        for key in ("rarity", "race", "attribute", "gender", "personality", "grade"):
            collect_enum(enums[key], row.get(key))

        alignment = row.get("alignment") or {}
        fate = row.get("fate") or {}
        style = row.get("style") or {}
        caption = style.get("caption") or {}

        skills_ref = row.get("skills") or {}
        stats = row.get("stats") or {}
        talent = row.get("talent") or {}
        voice = row.get("voice") or {}
        mental = row.get("mental") or {}
        images = row.get("images") or {}

        speech, speech_lang = text(voice.get("speech"))
        breakup, breakup_lang = text(voice.get("breakup_speech"))

        char_rows.append(compact({
            "id": row["id"],
            "group": row["character_group_id"],
            "guide_no": row.get("guide_no"),
            "name": row.get("name"),
            "name_jp": row.get("name_jp"),
            "name_en": row.get("name_en"),
            "style": caption.get("name"),
            # 个体几率数据用「日文名 - 日文风格」做键，这里保留日文风格名
            "style_jp": caption.get("name_jp"),
            "default": bool(style.get("is_default")),
            "rarity": (row.get("rarity") or {}).get("id"),
            "race": (row.get("race") or {}).get("id"),
            "attribute": (row.get("attribute") or {}).get("id"),
            "gender": (row.get("gender") or {}).get("id"),
            "personality": (row.get("personality") or {}).get("id"),
            "grade": (row.get("grade") or {}).get("id"),
            "alignment": alignment.get("id"),
            "align_point": alignment.get("point"),
            "jobs": [
                {"id": j["id"], "primary": bool(j.get("primary"))}
                for j in row.get("jobs") or []
            ],
            "fate": fate.get("identification"),
            # --- detail part ---
            "stats": {
                "base": stats.get("base"),
                "growth": stats.get("growth"),
                "pools": stats.get("pools"),
                "growth_rate": stats.get("growth_rate"),
            },
            "talent": {
                "id": talent.get("id"),
                "min": talent.get("min"),
                "max": talent.get("max"),
            },
            "mental": mental.get("value"),
            "skills": {
                "unique": dedupe([s.get("identification") for s in skills_ref.get("unique") or []]),
                "inherit": dedupe([s.get("identification") for s in skills_ref.get("inherit") or []]),
                "potential": dedupe([s.get("identification") for s in skills_ref.get("potential_inherit") or []]),
                "discipline": dedupe([
                    {"id": s.get("identification"), "level": s.get("level"), "need_point": s.get("need_point")}
                    for s in skills_ref.get("discipline") or []
                ]),
                "same": skills_ref.get("same_identifications"),
                "exclude": skills_ref.get("exclude_inheritance"),
                "get_lv": skills_ref.get("get_lv"),
            },
            # 潜在继承技能的解锁等级
            "potential_grade": row.get("potential_grade"),
            "images": {
                "image": images.get("image"),
                "thumbnail": images.get("thumbnail"),
                "thumbnail_file": images.get("thumbnail_file"),
                "thumbnail_dir": images.get("thumbnail_dir"),
            },
            "voice": {
                "speech": speech,
                "speech_lang": speech_lang if speech_lang not in ("zhs", "zht") else None,
                "breakup": breakup,
                "breakup_lang": breakup_lang if breakup_lang not in ("zhs", "zht") else None,
                "group": voice.get("voice_group_id"),
            },
            "self_restraint": row.get("self_restraint"),
            # 手工补充（Data_CharacterExtra.tabx.xlsx）
            "pool_group": row.get("pool_group"),
            "release_date": row.get("release_date"),
            "character_voice": row.get("character_voice"),
        }))

    # ---------- jobs ----------
    job_list = []
    for job in jobs:
        collect_enum(enums["job"], job)
        alignment = job.get("alignment") or {}
        variants = {
            key: [{"id": s.get("identification"), "get_lv": s.get("get_lv")} for s in rows]
            for key, rows in (job.get("skill_variants") or {}).items()
            if rows
        }
        chars = job.get("characters") or {}
        job_list.append(compact({
            "id": job["id"],
            "name": job.get("name"),
            "name_jp": job.get("name_jp"),
            "name_en": job.get("name_en"),
            "abbreviation": job.get("abbreviation"),
            "display_order": job.get("display_order"),
            "category": job.get("category"),
            "alignment": [1 if alignment.get("good") else None,
                          2 if alignment.get("neutral") else None,
                          3 if alignment.get("evil") else None],
            "base": job.get("base"),
            "growth": job.get("growth"),
            "multipliers": job.get("multipliers"),
            "skills": [
                {"id": s.get("identification"), "get_lv": s.get("get_lv")}
                for s in job.get("skills") or []
            ],
            "skill_variants": variants,
            "skill_count": job.get("skill_count"),
            "characters": {
                "primary": chars.get("primary"),
                "changeable": chars.get("changeable"),
            },
            # 转职到本职业所需的道具（按角色组给）
            "change_items": job.get("change_items"),
        }))
    # drop the None holes used to express "this alignment is not allowed"
    for job in job_list:
        if job.get("alignment") is not None:
            job["alignment"] = [a for a in job["alignment"] if a]

    # ---------- skills (one row = list fields + detail fields) ----------
    skill_rows = []
    targets: set[int] = set()
    for skill in skills:
        flags = skill.get("flags") or {}
        ident = skill["identification"]
        out_levels = []
        for lv in levels.get(str(ident)) or []:
            damage = []
            for d in lv.get("damage") or []:
                if d.get("target"):
                    targets.add(d["target"])
                damage.append(compact({
                    "attack_rate": d.get("attack_rate"),
                    "attack_rate_both_hands": d.get("attack_rate_both_hands"),
                    "add_damage_rate": d.get("add_damage_rate"),
                    "add_critical_rate": d.get("add_critical_rate"),
                    "valid_cap_parameter_value": d.get("valid_cap_parameter_value"),
                    "valid_cap_parameter_value_both_hands": d.get("valid_cap_parameter_value_both_hands"),
                    "valid_start_parameter_value": d.get("valid_start_parameter_value"),
                    "attack_type": d.get("attack_type"),
                    "reference_parameter": d.get("reference_parameter"),
                    "reference_parameter_2": d.get("reference_parameter_2"),
                    "damage_type": d.get("damage_type"),
                    "aptitude_ids": d.get("aptitude_ids"),
                    "fixed_damage": d.get("fixed_damage"),
                    "hit_rate": d.get("hit_rate"),
                    "damage_count": d.get("damage_count"),
                    "only_once": d.get("only_once"),
                    "target": d.get("target"),
                }))

            subs = []
            for s in lv.get("sub_effects") or []:
                if s.get("target"):
                    targets.add(s["target"])
                subs.append(compact({
                    "kind": s.get("kind"),
                    "params": trim_params(s.get("params")),
                    "strength": s.get("strength"),
                    "turn": s.get("turn"),
                    "target": s.get("target"),
                    "from": s.get("from"),
                    "reference_parameter": s.get("reference_parameter"),
                    "reference_parameter_rate": s.get("reference_parameter_rate"),
                    "abnormal_valid_start_parameter_value":
                        s.get("abnormal_valid_start_parameter_value"),
                    "abnormal_valid_cap_parameter_value":
                        s.get("abnormal_valid_cap_parameter_value"),
                    "force_apply": s.get("force_apply"),
                    "is_ignore_resist": s.get("is_ignore_resist"),
                    "reference_resist": s.get("reference_resist"),
                    "child_sub_effect_ids": s.get("child_sub_effect_ids"),
                    "target_race_ids": s.get("target_race_ids"),
                    "extension_params": s.get("extension_params"),
                    "child_sub_effects": s.get("child_sub_effects"),
                    "extension_effects": s.get("extension_effects"),
                    "param_refs": s.get("param_refs"),
                    "calc_reference_parameter": s.get("calc_reference_parameter"),
                    "calc_reference_parameter_2": s.get("calc_reference_parameter_2"),
                    "calc_reference_parameter_rate": s.get("calc_reference_parameter_rate"),
                    "calc_reference_parameter_rate_2": s.get("calc_reference_parameter_rate_2"),
                    "calc_valid_cap_parameter_value": s.get("calc_valid_cap_parameter_value"),
                    "calc_valid_start_parameter_value": s.get("calc_valid_start_parameter_value"),
                }))

            out_lv = compact({
                "level": lv.get("level"),
                "cost": lv.get("cost"),
                "cost_kind": lv.get("cost_kind"),
                "use_timing": lv.get("use_timing"),
                "use_limit": lv.get("use_limit"),
                "hate": lv.get("hate"),
                "skill_condition_ids": lv.get("skill_condition_ids"),
                "description": lv.get("description"),
                "description_lang": lv.get("description_lang"),
                "damage": damage,
                "sub_effects": subs,
            })
            # 射程 0 = 近距离，compact 会把 0 当空值去掉，这里单独保留
            if lv.get("range_type") is not None:
                out_lv["range_type"] = lv.get("range_type")
            out_levels.append(out_lv)

        skill_rows.append(compact({
            "id": ident,
            "name": skill.get("name"),
            "name_jp": skill.get("name_jp"),
            "name_en": skill.get("name_en"),
            "kind": skill.get("kind"),
            "max_level": skill.get("max_level"),
            "passive": bool(skill.get("is_passive")),
            "player": bool(skill.get("player")),
            "test": bool(flags.get("test")),
            "level0": bool(flags.get("level0")),
            "sources": skill.get("sources"),
            "jobs": skill.get("jobs"),
            # --- detail part ---
            "description": skill.get("description"),
            "detail_description": skill.get("detail_description"),
            "description_lang": skill.get("description_lang"),
            "job_limited": skill.get("job_limited"),
            "equipment_limited": skill.get("equipment_limited"),
            "tags": skill.get("tags"),
            "learn": [
                {"job": item.get("job"), "get_lv": item.get("get_lv")}
                for item in skill.get("learn") or []
            ],
            "levels": out_levels,
        }))

    # ---------- equipments（武器 / 盾 / 防具 / 饰品，一条 = 一个 identification） ----------
    equipment_rows = []
    for item in equipments:
        equipment_rows.append(compact({
            "id": item.get("id"),
            "name": item.get("name"),
            "name_jp": item.get("name_jp"),
            "name_en": item.get("name_en"),
            # 列表分组（武器 / 盾 / 头部 / 身体 / 手部 / 脚部 / 饰品 / 工具）
            "category": item.get("category"),
            "type_id": item.get("type_id"),
            "type": item.get("type"),
            "part": item.get("part"),
            "rank": item.get("rank"),
            # 图鉴编号：特殊装备为 "EX"，没有图鉴记录则为空
            "collection_id": item.get("collection_id"),
            "element": item.get("element"),
            "element_name": item.get("element_name"),
            "special": bool(item.get("special")),
            "note": item.get("note"),
            # 图标资源名（已按 wiki 标题规则规范化，不含 .png）
            "list_icon": item.get("list_icon"),
            "icon": item.get("icon"),
            # 接口/解包暂未提供的占位字段：特典分类 / 中文说明 / 获取途径 / 装备需求 / 妖精
            "soucate": item.get("soucate"),
            "desc": item.get("desc"),
            "sou": item.get("sou"),
            "req": item.get("req"),
            "fa_can": item.get("fa_can"),
            "fa_sk": item.get("fa_sk"),
            "fa_sk_desc": item.get("fa_sk_desc"),
            # 加护概率（4 槽 × 19 属性）与强化曲线（[{lv, atk, ...}]，每级完整数值，只输出与 +0 不同的等级）
            "bonus": item.get("bonus"),
            "levels": item.get("levels"),
            "reinforce_max": item.get("reinforce_max"),
            # 材质补强：[{rank, level, cost, atk, mag, div, def, mdef}]，属性为累计加成
            "over_rank": item.get("over_rank"),
            # 0 级数值 + 满强化推算（base + 强化组在 reinforce_max 的值）
            "stats": item.get("stats"),
            "max_stats": item.get("max_stats"),
            # 装备类型特性 / 非装备类型特性 / 套装
            "skills": item.get("skills"),
            "traits": item.get("traits"),
            "set_skills": item.get("set_skills"),
            # 商店来源（商店名 / 价格 / 货币名），空数组 = 商店买不到
            "shop": item.get("shop"),
        }))

    # ---------- enums: targets actually referenced ----------
    skill_targets = read_json(MD, "SkillTarget.json")
    for row in skill_targets:
        if row.get("id") in targets:
            label, lang = text(row.get("convert_text"))
            enums["target"][str(row["id"])] = compact({
                "name": label,
                "name_jp": (row.get("convert_text") or {}).get("ja") if isinstance(row.get("convert_text"), dict) else None,
                "name_en": (row.get("convert_text") or {}).get("en") if isinstance(row.get("convert_text"), dict) else None,
                "lang": lang if lang not in ("zhs", "zht") else None,
            })

    # ---------- enums: weapon types referenced by 武器限制 ----------
    weapon_ids = {x for row in skill_rows for x in (row.get("equipment_limited") or [])}
    for row in read_json(MD, "EquipmentType.json"):
        if row.get("id") not in weapon_ids:
            continue
        label, lang = text(row.get("name"))
        enums["equipment_type"][str(row["id"])] = compact({
            "name": label,
            "name_jp": (row.get("name") or {}).get("ja"),
            "name_en": (row.get("name") or {}).get("en"),
            "lang": lang if lang not in ("zhs", "zht") else None,
        })

    # ---------- effect kinds（只留结构；名字在 Data:EffectKind.json 里手工维护） ----------
    kinds = {}
    for key, item in effect_kinds.items():
        kinds[key] = compact({
            "id": item.get("id"),
            "count": item.get("count"),
            "params": item.get("params"),
            "invalid_kinds": item.get("invalid_kinds"),
            "remove_kinds": item.get("remove_kinds"),
        })

    # ---------- write: totals in the root, one file per record in sub-dirs ----------
    write_json(os.path.join(out, "characters.json"), char_rows, indent=1)
    write_json(os.path.join(out, "jobs.json"), job_list, indent=1)
    write_json(os.path.join(out, "skills.json"), skill_rows, indent=1)
    write_json(os.path.join(out, "equipments.json"), equipment_rows, indent=1)
    write_json(os.path.join(out, "effect_kinds.json"), kinds, indent=1)
    write_json(os.path.join(out, "enums.json"), enums, indent=1)

    for row in char_rows:
        write_json(os.path.join(out, "character", f"{row['id']}.json"), row, indent=1)
    for row in job_list:
        write_json(os.path.join(out, "job", f"{row['id']}.json"), row, indent=1)
    for row in skill_rows:
        write_json(os.path.join(out, "skill", f"{row['id']}.json"), row, indent=1)

    # 单条目录不整体清空（编辑器友好），但要删掉本次没有输出的旧条，
    # 例如被排除的测试装备 106000200 / 108000200
    equipment_dir = os.path.join(out, "equipment")
    keep = {f"{row['id']}.json" for row in equipment_rows}
    if os.path.isdir(equipment_dir):
        for name in os.listdir(equipment_dir):
            if name.endswith(".json") and name not in keep:
                os.remove(os.path.join(equipment_dir, name))
    for row in equipment_rows:
        write_json(os.path.join(equipment_dir, f"{row['id']}.json"), row, indent=1)
    write_json(os.path.join(out, "excluded.json"), [
        {"id": r["id"], "name": r.get("name"),
         "reason": "awakening" if str(r["id"])[-4:] in AWAKENING_SUFFIX else "placeholder"}
        for r in excluded
    ], indent=1)

    # ---------- items (道具)：清洗产物已按 wiki 字段命名，直接落盘 ----------
    item_rows = [compact(row) for row in items]
    write_json(os.path.join(out, "items.json"), item_rows, indent=1)
    item_dir = os.path.join(out, "item")
    keep = {f"{row['id']}.json" for row in item_rows}
    if os.path.isdir(item_dir):
        for name in os.listdir(item_dir):
            if name.endswith(".json") and name not in keep:
                os.remove(os.path.join(item_dir, name))
    for row in item_rows:
        write_json(os.path.join(item_dir, f"{row['id']}.json"), row, indent=1)

    # ---------- shops（商店）：一家店一条，items 内嵌 ----------
    shop_rows = [compact(row) for row in shops]
    write_json(os.path.join(out, "shops.json"), shop_rows, indent=1)
    shop_dir = os.path.join(out, "shop")
    keep = {f"{row['id']}.json" for row in shop_rows}
    if os.path.isdir(shop_dir):
        for name in os.listdir(shop_dir):
            if name.endswith(".json") and name not in keep:
                os.remove(os.path.join(shop_dir, name))
    for row in shop_rows:
        write_json(os.path.join(shop_dir, f"{row['id']}.json"), row, indent=1)

    # ---------- relics（遗物）：每种一条（同组取最低阶级） ----------
    relic_rows = [compact(row) for row in relics]
    write_json(os.path.join(out, "relics.json"), relic_rows, indent=1)

    write_json(os.path.join(out, "meta.json"), {
        "schema_version": SCHEMA_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source": "local_scripts/work/clean",
        "counts": {
            "characters": len(char_rows),
            "excluded": len(excluded),
            "jobs": len(job_list),
            "skills": len(skill_rows),
            "player_skills": sum(1 for s in skill_rows if s.get("player")),
            "equipments": len(equipment_rows),
            "items": len(item_rows),
            "shops": len(shop_rows),
            "effect_kinds": len(kinds),
            "targets": len(enums["target"]),
        },
        "notes": [
            "reference objects are reduced to ids; names live in enums.json",
            "kind_name / target_text / nested names are resolved through enums.json at runtime",
            "each domain is a single file under character/ job/ skill/",
            "files are overwritten in place, directories are never cleared",
        ],
    }, indent=1)

    print(f"{len(char_rows)} characters (+{len(excluded)} excluded), {len(job_list)} jobs, "
          f"{len(skill_rows)} skills, {len(equipment_rows)} equipments, "
          f"{len(item_rows)} items, {len(shop_rows)} shops, {len(kinds)} effect kinds -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
