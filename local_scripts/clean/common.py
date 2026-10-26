"""Shared helpers for the cleaning scripts (character / job / skill).

Conventions (agreed for the wiki output):
  * names are exposed as ``name`` (zhs) + ``name_jp`` + ``name_en``;
  * long text (descriptions) is Chinese only, with a ``*_lang`` marker when the
    Chinese text is missing and we had to fall back to another language;
  * ids are always copied verbatim from the master data (no renumbering).

Paths: only the unpacked master data still lives outside this repo. Everything
this pipeline produces stays here (``local_scripts/work`` -> ``data`` -> ``public/mock``).
"""

from __future__ import annotations

import json
import os
import re
import zipfile
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

#: this repo (``wizdaphne-wiki-vue``)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: unpack project root; only its ``out/masterdata`` is read. Override with
#: ``WIZDAPHNE_UNPACK`` (or point ``WIZDAPHNE_MASTERDATA`` straight at the tables).
UNPACK = os.environ.get("WIZDAPHNE_UNPACK", r"D:\WizardyDaphne\WizardyDaphneUnpack")
MD = os.environ.get("WIZDAPHNE_MASTERDATA", os.path.join(UNPACK, "out", "masterdata"))

#: intermediates of the cleaning pass (regenerated every run, not committed)
WORK = os.path.join(ROOT, "local_scripts", "work")
CLEAN = os.path.join(WORK, "clean")

#: fallback order for "the Chinese text we show on the wiki"
ZH_ORDER = ("zhs", "zht", "ja", "en")

#: hand maintained supplements (pool group / release date / voice actor), kept
#: in the repo and merged over the cleaned master data on every run
EXTRA_XLSX = os.path.join(ROOT, "config", "Data_CharacterExtra.tabx.xlsx")

#: 个体出现几率（线上 ``CharacterResponse.rates`` 的本地备份，只用于生成 mock）
RATES_JSON = os.path.join(ROOT, "config", "CharacterRates.json")

#: ``Api/GetV2Equipment`` 响应的本地备份（``{items, baseStat, bonus, …}``）。
#: 类型基准值 ``baseStat`` 与加护概率 ``bonus`` 都随接口返回，不再从 V1 手工表清洗：
#:   * ``baseStat``：类型 -> 基准值 + 排序序号 ``i``（列表红绿配色 / 类型按钮顺序）
#:   * ``bonus``：``[[装备名, [4 槽 × 19 属性]]]``
EQUIP_API_JSON = os.path.join(ROOT, "config", "EquipmentApi.json")

_XLSX_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_JST_OFFSET = timezone(timedelta(hours=8))  # release dates are written in game time (UTC+8)

#: 官方主数据「配错表」的修正表：``Skill.id`` -> 该行真正的 ``identification``。
#:
#: 症状：同一个 ``identification`` + 同一个 ``level`` 下出现多行、名字却不同。
#: 清洗按 identification 归组，名字与说明只取排序后的第一行，于是另一行的技能
#: 就顶着别人的名字出现在装备 / 怪物页上；引用它的装备又因为「id 查不到
#: identification」而落回错误的行。
#:
#: 这里按**行 id**（``Skill.id``，引用方实际写的就是它）纠正 identification，
#: 让两个技能各自成条，引用关系自然对上。排查与新增流程见
#: ``docs/06-masterdata-patches.md``。
SKILL_IDENT_FIXES: dict[int, int] = {
    # 範囲魔術理解（范围魔术理解）：官方表把 identification 写成了 56167101
    # （庇護巧者 / 庇护能手），装备 203101330 的 standard_skill_ids 引用的是
    # 它自己的 56167201。
    56167201: 56167201,
    # 効率調合（效率调和）：identification 被写成 56164101（慧眼の祝福（両手剣）），
    # 装备 104100430「调药棒」引用的是它自己的 56164201。
    56164201: 56164201,
    # 剣鬼の呪い（剑鬼的诅咒）：塞进了 53100401（混乱付与 Lv1-5）里，装备引用的是 56162501。
    56162501: 56162501,
    # 闇属性強化（暗属性强化）：塞进了 56165001（クラウストルムの力）。
    56165101: 56165101,
    # 下面三个都塞进了 56165801（常時器用さダウン）：一个 identification 下四条不同技能。
    56165901: 56165901,   # 修正射撃 / 校正射击
    56166001: 56166001,   # 常時探知・罠解除・攻撃力アップ / 探知・陷阱解除・攻击力持续提升
    56166101: 56166101,   # 弓の習熟 / 熟习弓
}


def skill_identification(row: dict):
    """技能行真正的 identification（应用 ``SKILL_IDENT_FIXES`` 修正）。"""
    if not isinstance(row, dict):
        return None
    fixed = SKILL_IDENT_FIXES.get(row.get("id"))
    return fixed if fixed is not None else row.get("identification")

#: 克己加成（``SkillSubEffect.kind``）-> 中文标签。名字只存在于 wiki 的
#: ``Data:EffectKind.json``（日文），这里按习语给出中文，供筛选与展示使用。
EFFECT_KIND_TAGS = {
    5010: "HP",
    5020: "MP",
    5030: "SP",
    5040: "攻击力",
    5050: "魔力",
    5060: "神力",
    8120: "信仰心",
    5070: "防御力",
    5080: "法术防御力",
    5110: "抵抗",
    5140: "会心",
    5170: "探知",
    5180: "陷阱解除",
    5190: "陷阱回避",
    5160: "行动速度",
    5090: "命中",
    5100: "回避",
    5300: "毒耐性",
    5340: "麻痹耐性",
    5330: "气绝耐性",
    5320: "睡眠耐性",
    # 封技与封魔在数据里是同一个 kind，统一叫「封印耐性」
    5370: "封印耐性",
    5390: "混乱耐性",
    5400: "魅惑耐性",
    5360: "石化耐性",
    5420: "即死耐性",
    5380: "恐惧耐性",
    5430: "暴击耐性",
    5350: "诅咒耐性",
}


#: 克己标签的展示顺序，沿用 V1 的固定列表；「信仰心」（PIE 加成）是 V1 之后
#: 新增的，插在对应位置。「封技 / 封魔」合并为「封印耐性」
DISCIPLINE_TAGS = [
    "HP", "MP", "SP",
    "攻击力", "魔力", "神力", "信仰心",
    "防御力", "法术防御力",
    "抵抗", "会心", "探知",
    "陷阱解除", "陷阱回避", "行动速度",
    "命中", "回避",
    "毒耐性", "麻痹耐性", "气绝耐性", "睡眠耐性",
    "封印耐性", "混乱耐性", "魅惑耐性",
    "石化耐性", "即死耐性",
    "恐惧耐性", "暴击耐性", "诅咒耐性",
]

_TAG_ORDER = {tag: i for i, tag in enumerate(DISCIPLINE_TAGS)}


def effect_tags(kind) -> list:
    """``kind`` -> 中文标签列表（一个 kind 可能给多个标签）。"""
    tag = EFFECT_KIND_TAGS.get(kind) if kind is not None else None
    if not tag:
        return []
    return list(tag) if isinstance(tag, tuple) else [tag]


def sort_discipline_tags(tags) -> list:
    """按 ``DISCIPLINE_TAGS`` 的顺序去重排序。"""
    seen = set()
    unique = []
    for tag in tags:
        if tag and tag not in seen:
            seen.add(tag)
            unique.append(tag)
    return sorted(unique, key=lambda t: _TAG_ORDER.get(t, len(DISCIPLINE_TAGS)))


def load(name: str):
    """Load one table from the unpacked master data (``MD``)."""
    path = os.path.join(MD, name + ".json")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"no {name}.json in {MD}")
    return json.load(open(path, encoding="utf8"))


def table(name: str) -> dict:
    """Load a table as ``{id: row}`` (first row wins on duplicates)."""
    rows = load(name)
    return {r["id"]: r for r in rows if isinstance(r, dict) and "id" in r}


def text(value):
    """``{"zhs": ...}`` or ``"..."`` -> (display text, language used)."""
    if value is None:
        return None, None
    if isinstance(value, str):
        return value, "ja"  # plain strings in the tables are always Japanese
    if isinstance(value, dict):
        for lang in ZH_ORDER:
            v = value.get(lang)
            if v:
                return v, lang
    return None, None


def names(row: dict) -> dict:
    """Build the wiki name triple from a row's ``name`` field."""
    raw = row.get("name") if isinstance(row, dict) else None
    if isinstance(raw, dict):
        return {
            "name": raw.get("zhs") or raw.get("zht") or raw.get("ja") or raw.get("en"),
            "name_jp": raw.get("ja"),
            "name_en": raw.get("en"),
        }
    if isinstance(raw, str):
        return {"name": raw, "name_jp": raw, "name_en": None}
    return {"name": None, "name_jp": None, "name_en": None}


def brief(row: dict | None, ident: int | None) -> dict | None:
    """``{id, name, ...}`` for a referenced dictionary row."""
    if row is None:
        return None
    out = {"id": ident}
    out.update(names(row))
    return out


def read_config_json(path: str):
    """Read a hand maintained JSON under ``config/`` (missing file -> ``None``)."""
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf8") as fh:
        return json.load(fh)


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)


def clear_dir(path: str, suffix: str = ".json") -> None:
    if not os.path.isdir(path):
        return
    for f in os.listdir(path):
        if f.endswith(suffix):
            os.remove(os.path.join(path, f))


def _column(ref: str) -> int:
    """``B7`` -> 1 (zero based column index)."""
    letters = re.match(r"[A-Z]+", ref or "")
    if not letters:
        return -1
    index = 0
    for ch in letters.group():
        index = index * 26 + (ord(ch) - 64)
    return index - 1


def read_tabx(path: str, sheet: int = 1) -> list[dict]:
    """Read one worksheet of an xlsx / tabx file as ``[{header: value}]``.

    Only what Tabx writes is handled (shared strings + inline values), so the
    cleaning pass stays dependency free (no openpyxl).
    """
    with zipfile.ZipFile(path) as zf:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared = [
                "".join(t.text or "" for t in si.iter(_XLSX_NS + "t"))
                for si in root.findall(_XLSX_NS + "si")
            ]

        root = ET.fromstring(zf.read(f"xl/worksheets/sheet{sheet}.xml"))
        grid: list[dict[int, object]] = []
        for row in root.iter(_XLSX_NS + "row"):
            cells: dict[int, object] = {}
            for cell in row.findall(_XLSX_NS + "c"):
                kind, raw = cell.get("t"), cell.find(_XLSX_NS + "v")
                if kind == "s":
                    value = shared[int(raw.text)] if raw is not None else None
                elif kind == "inlineStr":
                    value = "".join(t.text or "" for t in cell.iter(_XLSX_NS + "t"))
                elif raw is not None:
                    try:
                        number = float(raw.text)
                        value = int(number) if number.is_integer() else number
                    except (TypeError, ValueError):
                        value = raw.text
                else:
                    value = None
                cells[_column(cell.get("r") or "")] = value
            grid.append(cells)

    if not grid:
        return []
    header = grid[0]
    keys = [header.get(i) for i in range(max(header) + 1)] if header else []
    rows = []
    for cells in grid[1:]:
        item = {key: cells.get(i) for i, key in enumerate(keys) if key}
        if any(v is not None for v in item.values()):
            rows.append(item)
    return rows


def parse_release(value) -> dict | None:
    """``##2026-10-15`` (game time, UTC+8) -> ``{date, time, milliseconds}``."""
    if not value:
        return None
    text_value = str(value).lstrip("#").strip()
    if not text_value:
        return None
    try:
        moment = datetime.strptime(text_value, "%Y-%m-%d").replace(tzinfo=_JST_OFFSET)
    except ValueError:
        return None
    utc = moment.astimezone(timezone.utc)
    return {
        "date": utc.strftime("%Y-%m-%d"),
        "time": utc.strftime("%H:%M:%S"),
        "milliseconds": int(moment.timestamp() * 1000),
    }


def character_rates() -> list:
    """``config/CharacterRates.json``：每条以「日文名 - 日文风格」标识角色。"""
    if not os.path.isfile(RATES_JSON):
        return []
    with open(RATES_JSON, encoding="utf-8") as fh:
        return json.load(fh)


def character_extra() -> dict[int, dict]:
    """``config/Data_CharacterExtra.tabx.xlsx`` -> ``{character_id: supplement}``."""
    if not os.path.isfile(EXTRA_XLSX):
        return {}
    out = {}
    for row in read_tabx(EXTRA_XLSX):
        cid = row.get("id")
        if not cid:
            continue
        out[int(cid)] = {
            "index": row.get("index"),
            "pool_group": row.get("group"),
            "release_date": parse_release(row.get("release_date")),
            "character_voice": row.get("character_voice") or None,
        }
    return out
