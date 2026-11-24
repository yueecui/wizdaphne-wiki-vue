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


def _load_dotenv(path: str) -> None:
    """读取仓库根的 ``.env``（``KEY=VALUE``，``#`` 开头为注释）。

    只补充环境里没有的键，值留空视为未配置。这样 Python 脚本与 TS 脚本
    （dotenv）读的是同一份 ``.env``，不需要额外设系统环境变量。
    """
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8-sig") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key, val = key.strip(), val.strip().strip('"').strip("'")
            if key and val and key not in os.environ:
                os.environ[key] = val


_load_dotenv(os.path.join(ROOT, ".env"))

#: unpack project root; only its ``out/masterdata`` is read.
#: 默认按「两个仓库同级」推断（``<parent>/WizardyDaphneUnpack``），
#: 也可用 ``WIZDAPHNE_UNPACK`` 覆盖，或直接把 ``WIZDAPHNE_MASTERDATA`` 指向表目录。
UNPACK = os.environ.get("WIZDAPHNE_UNPACK") or os.path.join(
    os.path.dirname(ROOT), "WizardyDaphneUnpack")
MD = os.environ.get("WIZDAPHNE_MASTERDATA") or os.path.join(UNPACK, "out", "masterdata")

#: 缺少解包数据时的提示（交接给他人时最常见的第一个报错）
MD_HINT = (
    f"找不到解包主数据目录：{MD}\n"
    "请把解包仓库与本仓库放在同级目录，或在仓库根 .env 里设置 "
    "WIZDAPHNE_UNPACK=<解包仓库根>（或 WIZDAPHNE_MASTERDATA=<表目录>），"
    "参见 .env.example。"
)

#: 线上手工补充表（从 wiki 拉下来的快照，由 fetchWikiExtras.ts 写入）：
#: ``Data:CharacterExtra.tabx`` / ``Data:EquipmentExtra.tabx`` / ``Data:遗物酒.tabx``。
#: 这些快照优先于 ``config/*.xlsx``、``config/EquipmentApi.json`` 被清洗脚本读取，
#: 这样本地 mock 与线上 wiki 完全一致；拉取脚本没跑过时自动回退到旧本地文件。
WIKI_TABX_DIR = os.path.join(ROOT, "local_scripts", "work", "wiki")

#: 营地 / 酒馆话题摘要（解包工程 ``out/topic_digest``，按角色英文名一个文件）
TOPIC_DIGEST = os.environ.get(
    "WIZDAPHNE_TOPIC_DIGEST", os.path.join(UNPACK, "out", "topic_digest"))

#: intermediates of the cleaning pass (regenerated every run, not committed)
WORK = os.path.join(ROOT, "local_scripts", "work")

#: 语义清洗层的落盘目录。默认 ``work/clean``；游戏更新后想先比对再覆盖旧数据时，
#: 用 ``WIZDAPHNE_CLEAN=<临时目录>`` 把这一轮清洗写到别处（``diff_data.py`` 比对用）。
CLEAN = os.environ.get("WIZDAPHNE_CLEAN") or os.path.join(WORK, "clean")

#: fallback order for "the Chinese text we show on the wiki"
ZH_ORDER = ("zhs", "zht", "ja", "en")

#: hand maintained supplements (pool group / release date / voice actor), kept
#: in the repo and merged over the cleaned master data on every run
EXTRA_XLSX = os.path.join(ROOT, "config", "Data_CharacterExtra.tabx.xlsx")

#: 个体出现几率（线上 ``CharacterResponse.rates``）。
#: 优先读 wiki 上手工维护的 ``Data:角色抽取率.tabx`` 快照（fetchWikiExtras.ts 拉取），
#: 没拉过时回退 ``config/CharacterRates.json`` 这份旧抓包备份。
RATES_JSON = os.path.join(ROOT, "config", "CharacterRates.json")
RATES_WIKI = os.path.join(WIKI_TABX_DIR, "Data_角色抽取率.tabx.json")

#: 遗物酒手工数据（推荐类别 / 掉落怪物），生成 ``relics_extra`` +
#: ``relics_ccate`` 用；``id`` 列是遗物的物品图鉴编号（``CollectionItem.list_number``，
#: 道具数据里的 ``collection.no``），前端靠它对回遗物。
#: Tabx 导出带 ``.tabx`` 后缀，手工另存时可能没有，两种文件名都认。
RELIC_XLSX_NAMES = ("Data_遗物酒.xlsx", "Data_遗物酒.tabx.xlsx")
RELIC_XLSX = next(
    (
        path
        for path in (os.path.join(ROOT, "config", name) for name in RELIC_XLSX_NAMES)
        if os.path.isfile(path)
    ),
    os.path.join(ROOT, "config", RELIC_XLSX_NAMES[0]),
)

#: 推荐类别的展示顺序（``relics_ccate``）；手工表里没列到的类别排在其后
RELIC_CATEGORY_ORDER = ("物理", "法系", "坦克", "开箱")

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
    # 装备侧「同一 identification 塞了多件装备的被动技能」由 ``auto_split_skill_ids()``
    # 自动处理（判定见 docs/06 §3.1），不需要在这里逐条列。
    #
    # 101001000（回复系）：6 行 skill.id 不同、名字不同（药草 / 创伤药 / 高级创伤药 /
    # 特级创伤药 / 究极创伤药 / 治愈秘药），却共用一个 identification。
    # 消耗品通过 ``Expendables.content_id``（= ``Skill.id``）引用，按 identification
    # 归组会把 6 个技能合成一条，于是所有药草都显示成「治愈秘药」且技能详情串页。
    10100100000: 10100100000,   # 药草
    10100100003: 10100100003,   # 创伤药
    10100100010: 10100100010,   # 高级创伤药
    10100100020: 10100100020,   # 特级创伤药
    10100100030: 10100100030,   # 究极创伤药
    10100100040: 10100100040,   # 治愈秘药
}

#: 被动类技能的 ``Skill.use_timing``：1 = 装备特性区（``5xxxxx``）里也用的写法，
#: 5 = 常时。装备的标准技能两种写法都有（56167401 献身驱魔是 1，56167101 庇护能手
#: 是 5），所以「被动」不能只看 5。
PASSIVE_USE_TIMING = (1, 5)


def _skill_label(row: dict) -> str:
    """技能行用于判重的名字（优先日文原名，退回中 / 英）。"""
    name = row.get("name")
    if isinstance(name, dict):
        return str(name.get("ja") or name.get("zhs") or name.get("en") or "")
    return str(name or "")


def _player_ident_references() -> set[int]:
    """玩家侧按 **identification** 引用的技能 id。

    这些 ident 不能拆：角色固有 / 继承 / 潜在技能、职业技能、克己、技能继承表、
    技能组、套装、遗物之力、羁绊技能都写 ident，拆开后引用会指到别的技能上。
    """
    out: set[int] = set()
    for c in load("Character"):
        for key in ("skill_identification_1", "skill_identification_2",
                    "sub_skill_identification_1", "sub_skill_identification_2"):
            if c.get(key):
                out.add(int(c[key]))
        # 固有技能存的是行 id（ident*100+level）
        for value in c.get("unique_skill_ids") or []:
            out.add(int(value) // 100)
        for value in c.get("same_skill_identification_ids") or []:
            out.add(int(value))
        for value in c.get("exclude_inheritance_skill_ids") or []:
            out.add(int(value))
    for r in load("CharacterSkill"):
        if r.get("skill_id"):
            out.add(int(r["skill_id"]) // 100)
    for r in load("GuestCharacterSkillGroup"):
        if r.get("skill_id"):
            out.add(int(r["skill_id"]) // 100)
    for r in load("FateCharacterStatuses"):
        if r.get("default_skill_id"):
            out.add(int(r["default_skill_id"]) // 100)
    for table_name, key in (
        ("CharacterSelfRestraintSkill", "skill_identification"),
        ("SkillInheritance", "skill_identification"),
        ("SkillGroup", "skill_identification"),
        ("EquipSetSkills", "skill_identification"),
        ("FateAdditionalSkills", "skill_identification"),
        ("RelicSkill", "relic_skill_identification_1"),
        ("RelicSkill", "relic_skill_identification_2"),
    ):
        for r in load(table_name):
            if r.get(key):
                out.add(int(r[key]))
    return out


#: ``auto_split_skill_idents()`` 的进程内缓存
_AUTO_SPLIT: dict[int, int] | None = None


def auto_split_skill_idents() -> dict[int, int]:
    """装备引用的被动技能：同一 identification 下塞了别的技能时，按行 id 拆开。

    判定（docs/06 §3.1）：

      * 同一 identification 下、同一 level 出现多行且名字不同 → 冲突组；
      * 组内至少有一行同时满足「被 ``Equipment.standard_skill_ids`` /
        ``attack_skill_id`` 引用」与 ``use_timing`` ∈ :data:`PASSIVE_USE_TIMING`；
      * 该 identification 没有被玩家侧按 ident 引用（:func:`_player_ident_references`）。

    返回 ``{行 id: 目标 identification}``，只包含要改名的**外来技能行**：

      * ``id == identification`` 的原主行保留原 ident；
      * 与原主同名的多级行（如「混乱 Lv1-5」）也留在原 ident；
      * 每个外来名字组统一落到该组首行（最低等级那行）的行 id，
        所以多级外来技能仍是一条。

    结果按进程缓存。
    """
    global _AUTO_SPLIT
    if _AUTO_SPLIT is not None:
        return _AUTO_SPLIT

    equipment_refs: set[int] = set()
    for row in load("Equipment"):
        for value in row.get("standard_skill_ids") or []:
            equipment_refs.add(int(value))
        if row.get("attack_skill_id"):
            equipment_refs.add(int(row["attack_skill_id"]))

    grouped: dict[int, list[dict]] = {}
    for row in load("Skill"):
        ident = row.get("identification")
        if ident:
            grouped.setdefault(ident, []).append(row)

    protected = _player_ident_references()
    splits: dict[int, int] = {}
    for ident, rows in grouped.items():
        if ident in protected:
            continue
        by_level: dict[int, list[dict]] = {}
        for row in rows:
            by_level.setdefault(row.get("level") or 0, []).append(row)
        conflict = any(
            len(bucket) > 1 and len({_skill_label(r) for r in bucket}) > 1
            for bucket in by_level.values()
        )
        if not conflict:
            continue
        if not any(r.get("id") in equipment_refs
                   and r.get("use_timing") in PASSIVE_USE_TIMING for r in rows):
            continue

        # 原主：id 就是 identification 的那行；没有时取最低等级的首行
        primary = next((r for r in rows if r.get("id") == ident), None) or min(
            rows, key=lambda r: (r.get("level") or 0, r.get("id") or 0))
        primary_name = _skill_label(primary)

        by_name: dict[str, list[dict]] = {}
        for row in rows:
            if row is primary or _skill_label(row) == primary_name:
                continue
            by_name.setdefault(_skill_label(row), []).append(row)
        for bucket in by_name.values():
            target = min(bucket, key=lambda r: (r.get("level") or 0, r.get("id") or 0))
            for row in bucket:
                if row.get("id"):
                    splits[int(row["id"])] = int(target["id"])
    _AUTO_SPLIT = splits
    return splits


def skill_identification(row: dict):
    """技能行真正的 identification。

    优先级：``SKILL_IDENT_FIXES`` 手工条目 -> ``auto_split_skill_idents()``
    （装备引用的被动技能冲突组）-> 表里写的 identification。
    """
    if not isinstance(row, dict):
        return None
    fixed = SKILL_IDENT_FIXES.get(row.get("id"))
    if fixed is not None:
        return fixed
    target = auto_split_skill_idents().get(row.get("id"))
    if target is not None:
        return target
    return row.get("identification")

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
        raise FileNotFoundError(f"no {name}.json in {MD}\n{MD_HINT}")
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


def read_json(path: str):
    """Read a JSON file (missing file -> ``FileNotFoundError``，由调用方决定兜底）。"""
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


def as_list(value) -> list:
    """单个值 / 分号串 / 数组 统一成列表（wiki tabx 里这些列可能是字符串也可能是数组）。"""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return _split_list(value)


def read_wiki_tabx(path: str) -> list[dict]:
    """读 wiki 导出的 ``.tabx`` JSON（``{schema:{fields:[{name}]}, data:[[…]]}``）
    成 ``[{字段名: 值}]``，形状与 ``read_tabx`` 的 xlsx 输出一致。

    ``fetchWikiExtras.ts`` 把线上手工表拉成这种 JSON 落盘到 ``WIKI_TABX_DIR``，
    清洗脚本优先读它（见 ``character_extra`` / ``relic_extra``），没拉过时回退 xlsx。
    """
    if not os.path.isfile(path):
        return []
    obj = read_json(path)
    fields = [f.get("name") for f in (obj.get("schema") or {}).get("fields") or []]
    if not fields:
        return []
    out: list[dict] = []
    for row in obj.get("data") or []:
        if not isinstance(row, list):
            continue
        item = {fields[i]: row[i] for i in range(min(len(fields), len(row)))}
        out.append(item)
    return out


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
    """个体出现几率，每条以「日文名 - 日文风格」标识角色。

    优先读 wiki 的 ``Data:角色抽取率.tabx`` 快照（``fetchWikiExtras.ts`` 落盘），
    这样新版本角色（含新风格）一在 wiki 上补录就能进 mock；
    没拉过快照时回退 ``config/CharacterRates.json``。
    """
    rows = read_wiki_tabx(RATES_WIKI)
    if rows:
        return rows
    if not os.path.isfile(RATES_JSON):
        return []
    with open(RATES_JSON, encoding="utf-8") as fh:
        return json.load(fh)


def character_extra() -> dict[int, dict]:
    """``config/Data_CharacterExtra.tabx.xlsx`` / 线上快照 -> ``{character_id: supplement}``。

    优先读 ``WIKI_TABX_DIR/Data_CharacterExtra.tabx.json``（fetchWikiExtras.ts 从 wiki
    拉下来的），与线上一致；没拉过时回退到本地 ``config/*.xlsx``。
    """
    wiki = os.path.join(WIKI_TABX_DIR, "Data_CharacterExtra.tabx.json")
    if os.path.isfile(wiki):
        out: dict[int, dict] = {}
        for row in read_wiki_tabx(wiki):
            cid = row.get("id")
            if not cid:
                continue
            banner_val = row.get("banner[]") or row.get("banner")
            out[int(cid)] = {
                "index": row.get("index"),
                "pool_group": row.get("group"),
                "release_date": parse_release(row.get("release_date")),
                "character_voice": row.get("character_voice") or None,
                "banner": [int(v) for v in as_list(banner_val) if str(v).strip().isdigit()],
            }
        return out
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
            # 概率UP立绘编号：``"2;18;28;40"`` / ``"56"`` / 空 -> [2, 18, 28, 40]
            # tabx 导出时列名带 ``[]``，手工另存可能没有，两种都认
            "banner": [int(v) for v in _split_list(row.get("banner[]") or row.get("banner"))
                       if str(v).strip().isdigit()],
        }
    return out


def _split_list(value) -> list[str]:
    """``"1;65;75"`` / ``"坦克;物理"`` -> ``["1", "65", "75"]``（分隔符 ; 或 ,）。"""
    if value is None:
        return []
    text_value = str(value).strip()
    if not text_value:
        return []
    for sep in (";", ",", "|"):
        if sep in text_value:
            return [part.strip() for part in text_value.split(sep) if part.strip()]
    return [text_value]


def relic_extra() -> tuple[list[dict], list[str]]:
    """``config/Data_遗物酒.tabx.xlsx`` -> (``relics_extra`` 行, 推荐类别可选项)。

    每条 = ``{id, monster_id: [图鉴编号], c: [推荐类别]}``，``id`` 是遗物的物品图鉴编号
    （``CollectionItem.list_number``）；``monster_id`` 是敌人的图鉴编号
    （``CollectionEnemy.list_number``，前端用敌人表的 ``no`` 换名字）。
    类别可选项即线上 ``relics_ccate``，按 ``RELIC_CATEGORY_ORDER`` 排，
    手工表里新出现的类别排在后面。
    """
    wiki = os.path.join(WIKI_TABX_DIR, "Data_遗物酒.tabx.json")
    if os.path.isfile(wiki):
        rows = []
        categories = []
        for row in read_wiki_tabx(wiki):
            rid = row.get("id")
            if not rid:
                continue
            cats = as_list(row.get("c[]") or row.get("c"))
            monster_ids = [int(v) for v in as_list(row.get("monster_id[]") or row.get("monster_id"))
                           if str(v).strip().isdigit()]
            for cat in cats:
                if cat not in categories:
                    categories.append(cat)
            rows.append({"id": int(rid), "monster_id": monster_ids, "c": cats})
        order = {name: index for index, name in enumerate(RELIC_CATEGORY_ORDER)}
        seen = {name: index for index, name in enumerate(categories)}
        categories.sort(key=lambda name: (order.get(name, len(order)), seen[name]))
        return rows, categories

    if not os.path.isfile(RELIC_XLSX):
        return [], []

    rows: list[dict] = []
    categories: list[str] = []
    for row in read_tabx(RELIC_XLSX):
        rid = row.get("id")
        if not rid:
            continue
        cats = _split_list(row.get("c[]") or row.get("c"))
        monster_ids = [int(v) for v in _split_list(row.get("monster_id[]") or row.get("monster_id")) if v.isdigit()]
        for cat in cats:
            if cat not in categories:
                categories.append(cat)
        rows.append({"id": int(rid), "monster_id": monster_ids, "c": cats})

    order = {name: index for index, name in enumerate(RELIC_CATEGORY_ORDER)}
    seen = {name: index for index, name in enumerate(categories)}
    categories.sort(key=lambda name: (order.get(name, len(order)), seen[name]))
    return rows, categories


#: 商店商品「出现条件」的人工文案表（线上 ``Data:ShopCondition.tabx``，由
#: ``uploadDataToWiki.ts`` 自动追加新 id、人工补文案；``build_mock.py`` 读快照
#: 生成 ``Api/GetV2Extra.shopCondition``）
SHOP_CONDITION_WIKI = os.path.join(WIKI_TABX_DIR, "Data_ShopCondition.tabx.json")


def shop_condition_extra() -> dict[str, str]:
    """``Data:ShopCondition.tabx`` 快照 -> ``{"100000000": "第一章", …}``。

    键是 ``Shop.lineup_condition_id``（字符串，前端按 ``String(item.condition)`` 查），
    值是人工写的中文文案；``name`` 空着的行跳过 —— 前端查不到就退回显示条件 id。
    官方 masterdata 里没有这些 id 的文案表，所以这份是纯人工维护的补充数据。
    """
    out: dict[str, str] = {}
    for row in read_wiki_tabx(SHOP_CONDITION_WIKI):
        cid = row.get("id")
        if cid is None or str(cid).strip() == "":
            continue
        text_value = row.get("name")
        if text_value is None:
            continue
        text_value = str(text_value).strip()
        if not text_value:
            continue
        out[str(int(cid))] = text_value
    return out
