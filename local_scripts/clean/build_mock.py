"""Round 2: turn the long-key dataset into wiki-API shaped mocks.

The wiki stores short-key JSON (``dbCodec.encodeDoc``) in the ``Data:``
namespace and serves it through ``Api/GetXxx`` as::

    { "items": [...], "count": N, "page": 1, "limit": 10000 }

This script produces the same payloads locally (no upload, no MediaWiki
required) so the frontend can be developed against DEV mocks:

    CharacterResponse.json    Api/GetV2Character   95 records (roster + stats/talent/skills/voice)
    JobResponse.json          Api/GetV2Job         17 jobs
    SkillResponse.json        Api/GetV2Skill       3,031 records (skill fields + description + levels)
    EquipmentResponse.json    Api/GetV2Equipment   839 records (weapon / armor stats + traits) + 顶层 baseStat
    EnumResponse.json         Api/GetV2Enum        id dictionaries + effect kind 结构（名字在 GetV2EffectKind）
    VersionResponse.json      Api/GetV2Version     { version }

``EffectKindResponse.json``（Api/GetEffectKind，效果种类名的手改表）不在这里生成：
那份数据只在 wiki 上手工维护，DEV 直接把同名文件放到 ``public/mock`` 即可。

Compression rules (mirroring ``docs/data-wiki-api-indexeddb.md``):

  * ``num``    0 is omitted (decode defaults to 0)
  * ``str``    "" is omitted (decode defaults to "")
  * ``bool``   only ``true`` is written (here as ``1``; decode = key present)
  * arrays     empty arrays are omitted
  * ``obj``    only written when it has content
  * ``raw``    written as-is (ids, possibly string numbers)

Files are overwritten in place; directories are never removed.

    python local_scripts/clean/build_mock.py
    python local_scripts/clean/build_mock.py --data data --out public/mock
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    EQUIP_API_JSON,
    ROOT,
    character_extra,
    character_rates,
    read_config_json,
)

PAGE_LIMIT = 10000
DEFAULT_DATA = os.path.join(ROOT, "data")
DEFAULT_OUT = os.path.join(ROOT, "public", "mock")

# ---------- field specs: (long, short, kind[, value map | nested fields]) ----------

JOB_REF = [("id", "i", "num"), ("get_lv", "l", "num")]
LEARN = [("job", "j", "num"), ("get_lv", "l", "num")]
DISCIPLINE = [("id", "i", "num"), ("level", "l", "num"), ("need_point", "np", "num")]
STATS_POOL = [("base", "b", "num"), ("growth", "g", "num")]
STATS = [
    ("str", "s", "num"), ("int", "i", "num"), ("pie", "p", "num"),
    ("vit", "v", "num"), ("agi", "a", "num"), ("dex", "d", "num"),
    ("luk", "l", "num"), ("hp", "h", "num"), ("mp", "m", "num"), ("sp", "sp", "num"),
]

CHAR_LIST = [
    ("id", "i", "raw"),
    ("group", "g", "num"),
    ("guide_no", "n", "num"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("style", "sty", "str"),
    ("default", "d", "bool"),
    ("rarity", "r", "num"),
    ("race", "ra", "num"),
    ("attribute", "at", "num"),
    ("gender", "ge", "num"),
    ("personality", "pe", "num"),
    ("grade", "gr", "num"),
    ("alignment", "al", "num"),
    ("align_point", "ap", "num"),
    ("jobs", "jo", "objArr", [("id", "i", "num"), ("primary", "p", "bool")]),
    ("fate", "fa", "num"),
]

CHAR_DETAIL = [
    ("id", "i", "raw"),
    ("stats", "st", "obj", [
        ("base", "b", "numMap"),
        ("growth", "g", "numMap"),
        ("pools", "p", "map", STATS_POOL),
        ("growth_rate", "r", "objArr", STATS),
    ]),
    ("talent", "ta", "obj", [
        ("id", "i", "num"),
        ("min", "lo", "numMap"),
        ("max", "hi", "numMap"),
    ]),
    ("mental", "me", "num"),
    ("grade", "gr", "num"),
    ("skills", "sk", "obj", [
        ("unique", "u", "numArr"),
        ("inherit", "ih", "numArr"),
        ("potential", "pt", "numArr"),
        ("discipline", "dc", "objArr", DISCIPLINE),
        ("same", "sm", "numArr"),
        ("exclude", "ex", "numArr"),
        ("get_lv", "gl", "num"),
    ]),
    # 潜在继承技能的解锁等级
    ("potential_grade", "pg", "num"),
    ("images", "im", "obj", [
        ("image", "i", "str"),
        ("thumbnail", "t", "str"),
        ("thumbnail_file", "tf", "str"),
        ("thumbnail_dir", "td", "str"),
    ]),
    ("voice", "vo", "obj", [
        ("speech", "s", "str"),
        ("speech_lang", "sl", "str"),
        ("breakup", "b", "str"),
        ("breakup_lang", "bl", "str"),
        ("group", "g", "num"),
    ]),
    # 克己：额外提升的属性标签（同稀有度对比得出，中文）
    ("self_restraint", "sr", "obj", [
        ("id", "i", "num"),
        ("extra_tags", "t", "strArr"),
    ]),
]

JOB = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("abbreviation", "ab", "str"),
    ("display_order", "o", "num"),
    ("category", "c", "str"),
    ("alignment", "al", "numArr"),
    ("base", "b", "numMap"),
    ("growth", "g", "numMap"),
    ("multipliers", "m", "numMap"),
    ("skills", "sk", "objArr", JOB_REF),
    ("skill_variants", "sv", "objArrMap", JOB_REF),
    ("skill_count", "sc", "num"),
    ("characters", "ch", "obj", [
        ("primary", "pr", "numArr"),
        ("changeable", "cd", "numArr"),
    ]),
    ("change_items", "ci", "objArr", [
        ("item", "i", "num"),
        ("quantity", "q", "num"),
        ("group", "g", "num"),
    ]),
]

SKILL_LIST = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("kind", "k", "num"),
    ("max_level", "ml", "num"),
    ("passive", "p", "bool"),
    ("player", "pl", "bool"),
    ("test", "t", "bool"),
    ("level0", "l0", "bool"),
    ("sources", "s", "strArr"),
    ("jobs", "j", "numArr"),
]

DAMAGE = [
    ("attack_rate", "ar", "num"),
    ("attack_rate_both_hands", "a2", "num"),
    ("add_damage_rate", "ad", "num"),
    ("add_critical_rate", "cr", "num"),
    ("valid_cap_parameter_value", "vc", "num"),
    ("valid_cap_parameter_value_both_hands", "v2", "num"),
    ("valid_start_parameter_value", "vs", "num"),
    ("attack_type", "at", "num"),
    ("reference_parameter", "rf", "num"),
    ("reference_parameter_2", "r2", "num"),
    ("damage_type", "dt", "num"),
    ("aptitude_ids", "ap", "numArr"),
    ("fixed_damage", "fd", "num"),
    ("hit_rate", "hr", "num"),
    ("damage_count", "dc", "num"),
    ("only_once", "oo", "bool"),
    ("target", "tg", "num"),
]

# 被引用的 sub effect 的摘要（child_sub_effect_ids / extension_params 展开用）
SUB_BRIEF_LEAF = [
    ("id", "i", "num"),
    ("kind", "k", "num"),
    ("kind_name", "kn", "str"),
    ("params", "p", "numArr"),
    ("strength", "s", "num"),
    ("turn", "t", "num"),
    ("target", "g", "num"),
    ("target_text", "gt", "str"),
]

SUB_BRIEF = SUB_BRIEF_LEAF + [("children", "cs", "objArr", SUB_BRIEF_LEAF)]

SUB_EFFECT = [
    ("kind", "k", "num"),
    ("params", "p", "numArr"),
    ("strength", "s", "num"),
    ("turn", "t", "num"),
    ("target", "g", "num"),
    ("from", "f", "str", {"damage": "d", "effect_group": "g", "attack_start": "a"}),
    ("reference_parameter", "rp", "num"),
    ("reference_parameter_rate", "rr", "num"),
    ("abnormal_valid_start_parameter_value", "as", "num"),
    ("abnormal_valid_cap_parameter_value", "ac", "num"),
    ("force_apply", "fa", "bool"),
    ("is_ignore_resist", "ir", "bool"),
    ("calc_reference_parameter", "cp", "num"),
    ("calc_reference_parameter_2", "c2", "num"),
    ("calc_reference_parameter_rate", "cq", "num"),
    ("calc_reference_parameter_rate_2", "c3", "num"),
    ("calc_valid_cap_parameter_value", "cc", "num"),
    ("calc_valid_start_parameter_value", "cv", "num"),
    ("reference_resist", "rs", "num"),
    ("child_sub_effect_ids", "ch", "numArr"),
    ("target_race_ids", "tr", "numArr"),
    ("extension_params", "xp", "numArr"),
    ("child_sub_effects", "cs", "objArr", SUB_BRIEF),
    ("extension_effects", "xe", "objArr", SUB_BRIEF),
    # 参数里指向的效果（参数序号 -> 摘要），前端按缩进行显示
    ("param_refs", "pr", "map", SUB_BRIEF),
]

LEVEL = [
    ("level", "l", "num"),
    ("cost", "c", "num"),
    ("cost_kind", "ck", "num"),
    ("use_timing", "ut", "num"),
    ("use_limit", "ul", "num"),
    ("hate", "ht", "num"),
    ("range_type", "rt", "num"),
    ("skill_condition_ids", "cd", "numArr"),
    ("description", "d", "str"),
    ("description_lang", "dl", "str"),
    ("damage", "dm", "objArr", DAMAGE),
    ("sub_effects", "sb", "objArr", SUB_EFFECT),
]

SKILL_DETAIL = [
    ("id", "i", "raw"),
    ("description", "d", "str"),
    ("detail_description", "d2", "str"),
    ("description_lang", "dl", "str"),
    ("job_limited", "jl", "numArr"),
    ("equipment_limited", "el", "numArr"),
    ("tags", "tg", "numArr"),
    ("learn", "ln", "objArr", LEARN),
    ("levels", "lv", "objArr", LEVEL),
]


#: 装备特性：只带技能 identification + 引用等级（名字与说明由前端查技能数据），
#: 解包 Skill 表里找不到的纯 lock config 特性才带名字
EQUIP_REF = [
    ("id", "i", "num"),
    ("level", "l", "num"),
    ("name", "zh", "str"),
    # 手写的展示型特性说明（lock config，游戏里没有这段文本）
    ("desc", "d", "str"),
]

EQUIP_STAT = [
    ("atk", "at", "num"), ("c", "c", "num"), ("mag", "mg", "num"), ("div", "dv", "num"),
    ("def", "df", "num"), ("mdef", "md", "num"), ("spe", "sp", "num"), ("acc", "ac", "num"),
    ("sur", "sr", "num"), ("eva", "ev", "num"), ("res", "rs", "num"),
    # 探索系（装备自身属性，也随强化成长）：探知 / 陷阱解除 / 陷阱回避
    ("det", "dt", "num"), ("dtrap", "dp", "num"), ("etrap", "et", "num"),
]

#: 强化曲线的一行：等级 + 该等级的完整数值（缺失的 num 在解码时补 0）
EQUIP_LEVEL = [("lv", "l", "num")] + EQUIP_STAT

#: 材质补强（合材补强）的一行：目标阶级 / 阶级内次数 / 金币 / 五项累计加成
#: 武器只加攻击 / 魔力 / 神力，防具只加防御 / 法术防御
EQUIP_OVER_RANK = [
    ("rank", "r", "num"),
    ("level", "l", "num"),
    ("cost", "co", "num"),
    ("atk", "at", "num"),
    ("mag", "mg", "num"),
    ("div", "dv", "num"),
    ("def", "df", "num"),
    ("mdef", "md", "num"),
]
EQUIP_SET = [
    ("id", "i", "num"),
    ("skill_id", "si", "num"),
    ("skill_name", "sn", "str"),
    ("require_count", "rc", "num"),
    ("max_level", "ml", "num"),
    ("add_skill_level", "al", "num"),
]
EQUIPMENT = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("category", "c", "str"),
    ("type_id", "ti", "num"),
    ("type", "ty", "str"),
    ("part", "pt", "num"),
    ("rank", "r", "num"),
    # 图鉴编号；特殊装备（display_type 2）为 "EX"
    ("collection_id", "ci", "raw"),
    ("element", "el", "num"),
    ("element_name", "eln", "str"),
    ("special", "sp", "bool"),
    ("note", "nt", "str"),
    # 图标资源名（list_icon = 列表小图，icon = 背包大图，均不含 .png）
    ("list_icon", "li", "str"),
    ("icon", "ic", "str"),
    # V1 手工字段：soucate 9 = 特典 / desc 中文说明 / 获取途径 / 妖精
    ("soucate", "so", "num"),
    ("desc", "d", "str"),
    ("sou", "su", "strArr"),
    ("req", "rq", "strArr"),
    ("fa_can", "fc", "num"),
    ("fa_sk", "fs", "str"),
    # 妖精技能描述
    ("fa_sk_desc", "fd", "str"),
    ("reinforce_max", "rm", "num"),
    # 0 级数值 + 满强化推算
    ("stats", "st", "obj", EQUIP_STAT),
    ("max_stats", "mx", "obj", EQUIP_STAT),
    ("skills", "sk", "objArr", EQUIP_REF),
    ("traits", "tr", "objArr", EQUIP_REF),
    ("set_skills", "ss", "objArr", EQUIP_SET),
    # 强化曲线（每级完整数值，只输出与 +0 不同的等级）与加护概率（4 槽 × 19 属性）
    ("levels", "lv", "objArr", EQUIP_LEVEL),
    ("bonus", "bn", "numArrArr"),
    # 材质补强（低于最高阶级时可继续提升，空数组 = 不能补强）
    ("over_rank", "or", "objArr", EQUIP_OVER_RANK),
]

#: list + detail fields merged (``id`` / ``grade`` are already in the list part;
#: ``style`` uses ``sty`` because ``st`` is taken by ``stats``)
CHAR = CHAR_LIST + [spec for spec in CHAR_DETAIL if spec[0] not in ("id", "grade")]
SKILL = SKILL_LIST + [spec for spec in SKILL_DETAIL if spec[0] != "id"]


def read_json(path: str):
    with open(path, encoding="utf8") as fh:
        return json.load(fh)


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))


def encode_doc(src: dict, fields: list) -> dict:
    """Long-key dict -> short-key dict (see module docstring for the rules)."""
    out: dict = {}
    for spec in fields:
        long, short, kind = spec[0], spec[1], spec[2]
        if long not in src:
            continue
        value = src[long]
        if value is None:
            continue

        if kind == "num":
            if value == 0:
                continue
            out[short] = value

        elif kind == "raw":
            out[short] = value

        elif kind == "str":
            if value == "":
                continue
            if len(spec) > 3 and isinstance(spec[3], dict):
                value = spec[3].get(value, value)
            out[short] = value

        elif kind == "bool":
            if value:
                out[short] = 1

        elif kind in ("numArr", "strArr"):
            if value:
                out[short] = value

        elif kind == "numArrArr":
            # 二维数字数组（加护概率 4 槽 × 19 属性），0 有含义，必须保留
            if value:
                out[short] = [list(row) for row in value]

        elif kind == "numMap":
            nested = {k: v for k, v in (value or {}).items() if v not in (0, None)}
            if nested:
                out[short] = nested

        elif kind == "obj":
            nested = encode_doc(value, spec[3])
            if nested:
                out[short] = nested

        elif kind == "map":
            # {"hp": {base, growth}} -> {"hp": {"b": .., "g": ..}}
            nested = {}
            for key, item in (value or {}).items():
                if not isinstance(item, dict):
                    continue
                encoded = encode_doc(item, spec[3])
                if encoded:
                    nested[key] = encoded
            if nested:
                out[short] = nested

        elif kind == "objArr":
            nested = [encode_doc(item, spec[3]) for item in value or []]
            nested = [item for item in nested if item]
            if nested:
                out[short] = nested

        elif kind == "objArrMap":
            nested = {}
            for key, rows in (value or {}).items():
                encoded = [encode_doc(item, spec[3]) for item in rows or []]
                encoded = [item for item in encoded if item]
                if encoded:
                    nested[key] = encoded
            if nested:
                out[short] = nested

        else:  # pragma: no cover - defensive
            raise ValueError(f"unknown kind {kind!r} for {long}")

    return out


def decode_doc(src: dict, fields: list) -> dict:
    """Short-key dict -> long-key dict (the counterpart used by the frontend)."""
    out: dict = {}
    for spec in fields:
        long, short, kind = spec[0], spec[1], spec[2]
        raw = src.get(short)

        if kind == "num":
            out[long] = raw if raw is not None else 0
        elif kind == "raw":
            if raw is not None:
                out[long] = raw
        elif kind == "str":
            value = raw if raw is not None else ""
            if len(spec) > 3 and isinstance(spec[3], dict):
                value = {v: k for k, v in spec[3].items()}.get(value, value)
            out[long] = value
        elif kind == "bool":
            out[long] = bool(raw)
        elif kind in ("numArr", "strArr"):
            out[long] = raw or []
        elif kind == "numArrArr":
            out[long] = [list(row) for row in (raw or [])]
        elif kind == "numMap":
            out[long] = dict(raw or {})
        elif kind == "obj":
            out[long] = decode_doc(raw or {}, spec[3])
        elif kind == "map":
            out[long] = {k: decode_doc(v or {}, spec[3]) for k, v in (raw or {}).items()}
        elif kind == "objArr":
            out[long] = [decode_doc(item, spec[3]) for item in raw or []]
        elif kind == "objArrMap":
            out[long] = {k: [decode_doc(item, spec[3]) for item in rows]
                         for k, rows in (raw or {}).items()}
        else:  # pragma: no cover - defensive
            raise ValueError(f"unknown kind {kind!r} for {long}")

    return out


def verify(encoded: list[dict], fields: list, label: str) -> None:
    """encode -> decode -> encode must be a fixed point."""
    for index, doc in enumerate(encoded):
        again = encode_doc(decode_doc(doc, fields), fields)
        if again != doc:
            raise AssertionError(f"{label}[{index}] is not round-trip stable: {doc} != {again}")


def check_specs() -> None:
    """Merged specs must not reuse a short key (a later field would win silently)."""
    for label, spec in (("CHAR", CHAR), ("SKILL", SKILL), ("JOB", JOB), ("EQUIPMENT", EQUIPMENT)):
        seen: dict[str, str] = {}
        for item in spec:
            long, short = item[0], item[1]
            if short in seen:
                raise ValueError(f"{label}: short key {short!r} used by {seen[short]!r} and {long!r}")
            seen[short] = long


def wrap(items: list, limit: int = PAGE_LIMIT) -> dict:
    return {"items": items, "count": len(items), "page": 1, "limit": limit}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", default=DEFAULT_DATA)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args(argv)

    data = args.data
    check_specs()

    characters = read_json(os.path.join(data, "characters.json"))
    jobs = read_json(os.path.join(data, "jobs.json"))
    skills = read_json(os.path.join(data, "skills.json"))
    equipments = read_json(os.path.join(data, "equipments.json"))
    effect_kinds = read_json(os.path.join(data, "effect_kinds.json"))
    enums = read_json(os.path.join(data, "enums.json"))

    char_rows = [encode_doc(row, CHAR) for row in characters]
    job_rows = [encode_doc(row, JOB) for row in jobs]
    skill_rows = [encode_doc(row, SKILL) for row in skills]
    equip_rows = [encode_doc(row, EQUIPMENT) for row in equipments]

    verify(char_rows, CHAR, "Character")
    verify(job_rows, JOB, "Job")
    verify(skill_rows, SKILL, "Skill")
    verify(equip_rows, EQUIPMENT, "Equipment")

    # 手工补充数据（config/Data_CharacterExtra.tabx.xlsx）放在 payload 顶层 `extra`：
    # 长键、不压缩，前端导入时按 id 合并，不进 items
    char_extra = [
        {
            "index": sup.get("index"),
            "group": sup.get("pool_group"),
            "character_voice": sup.get("character_voice"),
            "release_date": sup.get("release_date"),
            "id": cid,
        }
        for cid, sup in character_extra().items()
    ]
    char_extra.sort(key=lambda row: row["index"] or 0, reverse=True)

    # 个体几率同样放在顶层：备份数据以「日文名 - 日文风格」为键，这里换成角色 id
    key_to_id = {}
    for c in characters:
        jp = c.get("style_jp")
        key = c.get("name_jp") or ""
        if jp and jp != "基本":
            key = f"{key} - {jp}"
        key_to_id[key] = c.get("id")
    rates_by_id = {}
    for row in character_rates():
        cid = key_to_id.get(row.get("name"))
        if cid is not None:
            rates_by_id[cid] = {**row, "id": cid}
    char_rates = [rates_by_id[c["id"]] for c in characters if c["id"] in rates_by_id]

    payloads = {
        "CharacterResponse.json": {**wrap(char_rows), "extra": char_extra, "rates": char_rates},
        "JobResponse.json": wrap(job_rows),
        "SkillResponse.json": wrap(skill_rows),
        # baseStat 与线上 ``Api/GetV2Equipment`` 顶层同形状（不压缩），列表用它决定红绿配色；
        # 加护概率已并入每件装备的 ``bn``，这里只补 baseStat
        "EquipmentResponse.json": {
            **wrap(equip_rows),
            "baseStat": (read_config_json(EQUIP_API_JSON) or {}).get("baseStat") or {},
        },
        # effect_kind 只有结构（名字在 Data:EffectKind.json，由 Api/GetV2EffectKind 提供）
        "EnumResponse.json": wrap([{**enums, "effect_kind": effect_kinds}]),
        # the cache is keyed on this single value; nothing else belongs here
        "VersionResponse.json": {"version": int(time.strftime("%y%m%d%H%M"))},
    }

    for name, payload in payloads.items():
        write_json(os.path.join(args.out, name), payload)

    total = sum(os.path.getsize(os.path.join(args.out, name)) for name in payloads)
    print(f"{len(payloads)} mock payloads, {total / 1024 / 1024:.2f} MB -> {args.out}")
    for name, payload in payloads.items():
        size = os.path.getsize(os.path.join(args.out, name))
        count = payload.get("count", "-")
        print(f"  {name:32} {str(count):>6} items  {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
