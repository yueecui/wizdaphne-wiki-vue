"""Clean the equipment category (weapons / shields / armor / accessories).

Input : ``out/masterdata`` (see common.py)
        ``Equipment``                 one row per roll (``id`` != ``identification``)
        ``EquipmentParam``            base stats + per-stat reinforce groups (id = identification)
        ``EquipReinforceParamGroup``  ``group_id`` + ``reinforce`` (1..N) -> ``reinforce_value``
        ``EquipmentOverRankReinforce`` 合材补强：低于最高阶级的装备补强到更高阶级的数值表
        ``EquipmentType``             category (``part``) + localized type name
        ``EquipmentLockConfig``       fixed characteristics (``characteristic`` 100 = 装备类型特性)
        ``Skill`` / ``SkillEffectGroup`` / ``SkillDamageEffect``   普通攻击段数 + 特性名
        ``EquipSetSkills`` / ``EquipSetSkillContents``  套装技能
        ``CollectionEquip``           图鉴编号（``display_type`` 2 = 特殊装备，显示 EX）

Output: ``local_scripts/work/clean/equipment/equipments.json`` - one entry per
        ``identification``.  Every numeric field is copied from the master data;
        only a few things are derived:

          * ``c`` (攻击次数) comes from the normal-attack skill chain
            (``attack_skill_id`` -> ``SkillEffectGroup`` -> ``SkillDamageEffect.damage_count``).
            技能说明里的「攻击N次」与数据不一致（单手斧/钝器写 2 次、实际 1 段），
            所以不要解析文本；防具没有这一项；
          * ``max_stats`` = base + the reinforce group value at ``reinforce_max``
            (the game stores the growth as a table, not as a formula);
          * ``levels``：每级一行的完整数值（见下方注释）；
          * ``over_rank``：合材补强（``EquipmentOverRankReinforce``，按
            ``over_rank_reinforce_group_id`` 关联）。``rank`` 是**目标阶级**、
            ``level`` 是该阶级内的次数，五项属性是**累计加成**（接着上一阶级继续加）；
          * ``collection_id``：图鉴编号（``CollectionEquip.list_number``）。特殊装备
            （``display_type`` 2，编号 10000 起）在游戏图鉴里显示为 ``EX``；
          * ``skills`` / ``traits``：只输出 ``{id, level?}``（技能 identification +
            装备引用的等级），名字与说明由前端查技能数据。``EquipmentLockConfig``
            只有名字：能按名字找到同名技能的换成该技能 identification，找不到的
            才把名字写进 ``name``；同一技能以两种形式出现时只保留一条。

No filtering except:

  * two test rows that do not exist in the game
    (``残旧苦无`` / ``残旧之刃``, see ``TEST_IDENTIFICATIONS``);
  * enemy / NPC / story-only equipment, which has no localization at all —
    its ``name`` is a plain Japanese string instead of ``{ja, zhs, …}``
    (see ``has_cn_name``), e.g. ``短剣（陽炎の忍者用）``.

Every other identification with a ``EquipmentParam`` row is emitted, and the
V1 page's own subset can be compared by name.

加护概率 ``bonus``、特典分类 ``soucate``、获取途径 ``sou`` 取自
``config/EquipmentApi.json``（``Api/GetV2Equipment`` 响应的本地备份，其中 ``extra``
就是 wiki 上手工维护的 ``Data:EquipmentExtra.tabx``）。V1 手工表（``EquipmentExtra`` /
``EquipmentSkill`` / ``EquipmentSetSkill`` / ``EquipmentBonus`` / ``EquipmentBaseStat``）
不再参与清洗（对应的参考文件已从 ``config/`` 删除）：接口与解包都没提供的字段
（中文说明 / 装备需求）留空占位，UI 仍保留位置。

妖精相关的三个字段也来自解包（V1 手工表只用于校验）：

  * ``fa_can``：``Equipment.conditions_1`` = 10（种族条件）的种族列表。
    只有妖精（``CharacterSpecies`` 6）→ 2 专用；含妖精也含别的种族 → 1 可用；
    没有种族条件 → 0 不适用（妖精能穿但发挥不出性能）。与 V1 的
    97 / 3 / 711 条一一对应；
  * ``fa_sk`` / ``fa_sk_desc``：妖精专用装备的套装技能（``EquipSetSkillContents``
    → ``EquipSetSkills`` → ``Skill``），技能名用「、」连接，说明取 1 级那条
    （各等级只差开头的「套装技能LvN」）。

装备条件同样是解包数据：``conditions_*`` 的类型 9 = 职业限制、10 = 种族限制，
参数是被允许的 id 列表。清洗后输出成 ``job_limited``（``Job.id``）与
``race_limited``（``CharacterSpecies.id``），两个槽位合并去重；空数组 = 无限制。
种族条件也用来推 ``fa_can``（见 ``fairy_mark``）。

图标也在这一步规范化：``list_icon`` / ``icon`` 就是 ``ListIcon_*`` 与
``equip_icon_*`` 去掉 ``.png`` 的名字，空格转下划线、连续下划线合并成一个
（wiki 文件标题规则）。

    python equipment.py
    python equipment.py --limit 20     # probe
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    CLEAN,
    EQUIP_API_JSON,
    load,
    names,
    read_config_json,
    skill_identification,
    text,
    write_json,
)

#: ``EquipmentType.part`` -> list grouping (part 2 = two-handed, still 武器)
PART_CATEGORY = {
    1: "武器",
    2: "武器",
    3: "盾",
    4: "头部",
    5: "身体",
    6: "手部",
    7: "脚部",
    8: "饰品",
}

#: category display order in the list
CATEGORY_ORDER = ["武器", "盾", "头部", "身体", "手部", "脚部", "饰品", "工具"]

#: ``Equipment.element`` (verified against ``Equipment.note``: 火/水/風/土/光/闇)
ELEMENT = {0: None, 1: "火", 2: "水", 3: "风", 4: "土", 5: "光", 6: "暗", 7: "无"}

#: (list key, EquipmentParam base field, EquipmentParam reinforce group field)
STAT_MAP = [
    ("atk", "attack_base", "attack_reinforce_param_group_id"),
    ("mag", "magic_base", "magic_reinforce_param_group_id"),
    ("div", "divine_base", "divine_reinforce_param_group_id"),
    ("def", "defence_base", "defence_reinforce_param_group_id"),
    ("mdef", "magic_defence_base", "magic_defence_reinforce_param_group_id"),
    ("spe", "initiative_base", "initiative_reinforce_param_group_id"),
    ("acc", "hit_base", "hit_reinforce_param_group_id"),
    ("sur", "critical_base", "critical_reinforce_param_group_id"),
    ("eva", "avoid_base", "avoid_reinforce_param_group_id"),
    ("res", "resist_base", "resist_reinforce_param_group_id"),
    # 探索系（装备自身属性，也随强化成长）：探知 / 陷阱解除 / 陷阱回避
    ("det", "detection_base", "detection_reinforce_param_group_id"),
    ("dtrap", "trap_remove_base", "trap_remove_reinforce_param_group_id"),
    ("etrap", "trap_avoid_base", "trap_avoid_reinforce_param_group_id"),
]

#: ``EquipmentLockConfig.characteristic`` 100 = 装备类型特性（≈ 固定技能）
TYPE_CHARACTERISTIC = 100

#: 只保留这几条 ``EquipmentLockConfig``：游戏里没有对应技能，只能作为展示标签。
#: 其余 lock 都只是装备已引用技能的别名（游戏里由真实技能实现），一律隐藏。
KEEP_LOCK_CONFIG = {
    10004,  # 力量适应+
    10005,  # 力量适应-
    20000,  # 抗不死（EquipmentLockConfig 内部名叫「不死克星」）
    20001,  # 抗岩石（内部名叫「岩石克星」）
    30000,  # 火属性
    30001,  # 水属性
    30002,  # 风属性
    30003,  # 土属性
    30004,  # 光属性
    30005,  # 暗属性
}

#: 游戏内显示名：与 ``EquipmentLockConfig`` 的内部名不同时用它
LOCK_CONFIG_NAME = {
    20000: "抗不死",
    20001: "抗岩石",
}

#: 上面这些特性的说明文本：游戏数据里查不到，手工补（只用于展示，不可点开技能）
LOCK_CONFIG_DESC = {
    10004: "需要力量才能驾驭的武器。装备时更容易发挥装备者的攻击力。",
    10005: "需要力量才能驾驭的武器。装备时更难发挥装备者的攻击力。",
    20000: "由特殊的制法制作而成，能够对不死系敌人造成普通伤害。",
    20001: "由特殊的制法制作而成，能够对岩石系敌人造成普通伤害。",
    30000: "使用特殊的制造方法，附加了火之力。",
    30001: "使用特殊的制造方法，附加了水之力。",
    30002: "使用特殊的制造方法，附加了风之力。",
    30003: "使用特殊的制造方法，附加了土之力。",
    30004: "使用特殊的制造方法，附加了光之力。",
    30005: "使用特殊的制造方法，附加了暗之力。",
}

#: 游戏里不存在的测试装备（图标资源也缺）：「残旧苦无」「残旧之刃」
TEST_IDENTIFICATIONS = {106000200, 108000200}

#: ``Equipment.conditions_*`` 里的条件类型：9 = 职业限制，10 = 种族限制
CONDITION_JOB = 9
CONDITION_RACE = 10
#: ``CharacterSpecies``：6 = 妖精（1 人类 / 2 精灵 / 3 矮人 / 4 兽人 / 6 妖精）
FAIRY_RACE_ID = 6


def parse_id_list(value) -> list[int]:
    """``"[6]"`` / ``[6]`` / ``""`` -> ``[6]``；解析不了的当空列表。"""
    if isinstance(value, list):
        raw = value
    else:
        try:
            raw = json.loads(value or "[]")
        except (TypeError, ValueError):
            return []
    if not isinstance(raw, list):
        return []
    return [int(v) for v in raw if str(v).lstrip("-").isdigit()]


def condition_ids(rolls: list, condition: int) -> list[int]:
    """取 ``conditions_*`` 里某一类条件的参数（职业 / 种族 id），两个槽位合并去重。

    ``Equipment`` 每行最多两条条件：``conditions_1`` / ``conditions_2`` 是类型
    （9 = 职业，10 = 种族），``conditions_param_*`` 是被允许的 id 列表。
    """
    out: list[int] = []
    for slot in (1, 2):
        if str(pick(rolls, f"conditions_{slot}") or "") != str(condition):
            continue
        for value in parse_id_list(pick(rolls, f"conditions_param_{slot}")):
            if value not in out:
                out.append(value)
    return out


def fairy_mark(races: list[int]) -> int:
    """妖精标记（V1 的 ``fa_can``）：看种族条件里有没有妖精。

    * 种族只有妖精 ``[6]``            -> ``2`` 妖精专用（非妖精穿不上）
    * 含妖精也含别的种族 ``[1,2,3,4,6]`` -> ``1`` 妖精可用（都能穿）
    * 没有种族条件                     -> ``0`` 妖精不适用（妖精能穿但发挥不出性能）

    数据依据：``Equipment.conditions_1`` = 10（种族条件）、``conditions_param_1``
    是种族 id 列表。武器 / 防具都适用，与 V1 手工表的 97 / 3 / 711 条完全对应。
    """
    allowed = set(races)
    if FAIRY_RACE_ID not in allowed:
        return 0
    return 2 if allowed == {FAIRY_RACE_ID} else 1


def has_cn_name(row: dict) -> bool:
    """``name`` 带 ``zhs`` 才算玩家可获得。

    敌人 / NPC / 剧情专用装备在解包里没有本地化，``name`` 是纯日文字符串
    （如 ``短剣（陽炎の忍者用）``），全部排除。
    """
    name = row.get("name")
    return isinstance(name, dict) and bool(name.get("zhs"))

_ICON_SPACE = re.compile(r"\s+")
_ICON_MULTI = re.compile(r"_{2,}")


def icon_name(value) -> str | None:
    """图标资源名 -> wiki 上的文件名（不含扩展名）。

    Wiki 的文件标题规则：空格当作下划线，连续下划线合并成一个。数据里有几条
    脏名字（``ListIcon_ BreastplateHop``、``equip_icon_Divine _Blessing_Attire``），
    解包出来的 png 也是 ``ListIcon__BreastplateHop.png`` 这种双下划线形态，
    所以这里统一规范化，前端直接拼文件名即可。
    """
    if not value:
        return None
    return _ICON_MULTI.sub("_", _ICON_SPACE.sub("_", value.strip()))


def pick(rows: list, key: str):
    """First non-empty value of ``key`` across the rolls of one identification."""
    for row in rows:
        value = row.get(key)
        if value:
            return value
    return rows[0].get(key)


def attack_count(skill: dict | None, groups: dict, damage: dict) -> int | None:
    """普通攻击技能 -> 段数（``SkillDamageEffect.damage_count``）。

    走 ``SkillEffectGroup.damage_effect_ids`` 而不是技能说明文本：
    ``通常攻撃_片手斧`` 的说明写「攻击2次」，数据里却是 1 段。
    """
    if not skill:
        return None
    for group_id in skill.get("skill_effect_group_ids") or []:
        for damage_id in (groups.get(group_id) or {}).get("damage_effect_ids") or []:
            count = (damage.get(damage_id) or {}).get("damage_count")
            if count:
                return int(count)
    return None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--limit", type=int, default=0, help="only the first N identifications")
    args = ap.parse_args(argv)

    rows = load("Equipment")
    by_ident: dict[int, list] = collections.defaultdict(list)
    for row in rows:
        ident = row.get("identification")
        if ident:
            by_ident[ident].append(row)
    idents = [
        ident
        for ident in sorted(by_ident)
        if ident not in TEST_IDENTIFICATIONS and has_cn_name(by_ident[ident][0])
    ]
    if args.limit:
        idents = idents[: args.limit]

    params = {r["id"]: r for r in load("EquipmentParam")}
    types = {r["id"]: r for r in load("EquipmentType")}
    locks = {r["id"]: r for r in load("EquipmentLockConfig")}
    skill_rows = {r["id"]: r for r in load("Skill")}
    effect_groups = {r["id"]: r for r in load("SkillEffectGroup")}
    damage_effects = {r["id"]: r for r in load("SkillDamageEffect")}
    set_skills = {r["id"]: r for r in load("EquipSetSkills")}
    set_contents: dict[int, list] = collections.defaultdict(list)
    for row in load("EquipSetSkillContents"):
        set_contents[row.get("equipment_identification")].append(row)

    # 图鉴编号：ident -> CollectionEquip 行（display_type 2 = 特殊装备，编号 10000 起）
    collection_by_ident = {row.get("equip_param_id"): row for row in load("CollectionEquip")}

    # reinforce group: group_id -> {reinforce level -> delta}
    groups: dict[int, dict[int, int]] = collections.defaultdict(dict)
    for row in load("EquipReinforceParamGroup"):
        groups[row["group_id"]][row["reinforce"]] = row.get("reinforce_value") or 0

    # 合材补强：group_id -> 按 (目标阶级, 阶级内次数) 排序的行。
    # 五项属性在该表里是**累计加成**（新阶级第 1 次接着上一阶级满次继续加）。
    over_rank_groups: dict[int, list[dict]] = collections.defaultdict(list)
    for row in load("EquipmentOverRankReinforce"):
        over_rank_groups[row.get("group_id")].append(row)

    # 加护概率来自 ``Api/GetV2Equipment`` 的顶层 ``bonus``（按装备中文名索引）
    api_payload = read_config_json(EQUIP_API_JSON) or {}
    bonus_map: dict = {name: rows for name, rows in (api_payload.get("bonus") or [])}
    # 特典分类 / 获取途径来自同一响应的顶层 ``extra``（按 identification 索引），
    # 源头是 wiki 的 ``Data:EquipmentExtra.tabx``（手工维护，上传脚本只往里追加新装备）
    extra_map: dict = {
        int(row["id"]): row for row in (api_payload.get("extra") or []) if row.get("id")
    }

    # ---------- 商店：只用 shop.py 清洗后的店铺（有结束时间的限时商店不算） ----------
    # 商店的 content_id 是具体档位 id（如 100000109），要折回 identification（100000100）
    ident_by_row_id = {row.get("id"): ident for ident, rows in by_ident.items() for row in rows}
    shop_by_ident: dict[int, list] = collections.defaultdict(list)
    shops_path = os.path.join(CLEAN, "shop", "shops.json")
    if os.path.isfile(shops_path):
        with open(shops_path, encoding="utf8") as fh:
            for shop in json.load(fh):
                if shop.get("end_at"):
                    continue
                for row in shop.get("items") or []:
                    if row.get("content_type") != "Equip::Equipment":
                        continue
                    content_id = row.get("content_id")
                    if not content_id:
                        continue
                    ident = ident_by_row_id.get(content_id, content_id)
                    currency = row.get("currency")
                    entry_row = {
                        "shop_name": shop.get("name"),
                        "price": row.get("price"),
                        # 兑换点数写实际点数名（「银鳞硬币」）
                        "currency_name": (shop.get("point_name") if currency == 5
                                          else row.get("currency_name")),
                    }
                    bucket = shop_by_ident[ident]
                    if entry_row not in bucket:
                        bucket.append(entry_row)
    else:
        print(f"  {shops_path} 不存在：先跑 shop.py，否则装备没有商店信息")

    equipments = []
    counts_by_type: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)

    for ident in idents:
        rolls = by_ident[ident]
        params_row = params.get(ident) or {}
        kind = pick(rolls, "kind") or 0
        type_row = types.get(kind) or {}
        type_name = names(type_row).get("name") if type_row else None
        category = "工具" if kind == 901 else PART_CATEGORY.get(type_row.get("part") or 0, "其他")

        reinforce_max = params_row.get("reinforce_max_value") or 0

        stats: dict[str, int] = {}
        max_stats: dict[str, int] = {}
        for key, base_field, group_field in STAT_MAP:
            base = params_row.get(base_field) or 0
            stats[key] = base
            group_id = params_row.get(group_field) or 0
            delta = groups.get(group_id, {}).get(reinforce_max, 0) if reinforce_max else 0
            max_stats[key] = base + delta

        # 攻击次数：普通攻击技能的 damage_count（同一类型共用，解析失败时用同类众数）
        found = attack_count(
            skill_rows.get(pick(rolls, "attack_skill_id")), effect_groups, damage_effects
        )
        if found:
            counts_by_type[kind][found] += 1

        # 特性只存技能 identification（+ 引用等级），名字与说明由前端查技能数据；
        # 展示型 lock config 特性才带名字与手写说明。
        skills, traits = [], []
        seen: set[int] = set()

        def add_lock_config(lock_id: int) -> None:
            """加一条展示型特性（名字 + 手写说明，前端不可点开技能）。"""
            if lock_id in seen or lock_id not in KEEP_LOCK_CONFIG:
                return
            lock = locks.get(lock_id)
            if not lock:
                return
            seen.add(lock_id)
            target = skills if lock.get("characteristic") == TYPE_CHARACTERISTIC else traits
            entry = {
                "id": lock_id,
                "name": LOCK_CONFIG_NAME.get(lock_id) or names(lock).get("name"),
                "desc": LOCK_CONFIG_DESC.get(lock_id),
            }
            target.append({k: v for k, v in entry.items() if v})

        # standard_skill_ids 是 Skill 行 id（也兼容 identification）
        for skill_id in pick(rolls, "standard_skill_ids") or []:
            row = skill_rows.get(skill_id) or skill_rows.get(skill_id // 100)
            if not row:
                continue
            # 官方表配错 identification 的行按行 id 纠正（见 common.SKILL_IDENT_FIXES）
            skill_ident = skill_identification(row) or skill_id
            if skill_ident in seen:
                continue
            seen.add(skill_ident)
            entry = {"id": skill_ident}
            if row.get("level"):
                entry["level"] = row["level"]
            skills.append(entry)

        # 固定特性：只留 ``KEEP_LOCK_CONFIG`` 里的展示型特性，其它 lock config 一律隐藏
        for lock_id in pick(rolls, "lock_config_ids") or []:
            add_lock_config(lock_id)

        # 采集工具（kind 901）在游戏里固定显示「力量适应-」，但锁表里没有这条引用
        if kind == 901:
            add_lock_config(10005)

        # 套装技能（同组装备凑齐件数才生效）。妖精专用装备才有套装技能，
        # 技能名 / 说明就是这个装备的「妖精技能」（V1 的 fa_sk / fa_sk_desc）。
        sets = []
        fairy_skill_names: list[str] = []
        fairy_skill_desc = None
        for content in set_contents.get(ident, []):
            set_row = set_skills.get(content.get("set_skill_id"))
            if not set_row:
                continue
            skill = skill_rows.get(set_row.get("skill_identification")) or skill_rows.get(
                (set_row.get("skill_identification") or 0) // 100
            )
            skill_name = names(skill).get("name") if skill else None
            sets.append({
                "id": set_row["id"],
                "skill_id": set_row.get("skill_identification"),
                "skill_name": skill_name,
                "require_count": set_row.get("require_count"),
                "max_level": set_row.get("max_skill_level"),
                "add_skill_level": content.get("add_skill_level") or 0,
            })
            if skill_name and skill_name not in fairy_skill_names:
                fairy_skill_names.append(skill_name)
            # 各等级说明只差开头的「套装技能LvN」，取 1 级那条即可
            if fairy_skill_desc is None and skill:
                fairy_skill_desc = text(skill.get("description"))[0]

        # 装备条件（``conditions_*``）：9 = 职业限制，10 = 种族限制。
        # 妖精标记（0 不适用 / 1 可用 / 2 专用）就是种族条件里有没有妖精
        job_limited = condition_ids(rolls, CONDITION_JOB)
        race_limited = condition_ids(rolls, CONDITION_RACE)
        fa_can = fairy_mark(race_limited)

        # 强化曲线：每一行都是该等级的「完整数值」，只跳过与 +0 完全相同的等级。
        # 不能只写变化的属性：短键里 0 会被省略，前端解码时缺失的 num 字段补 0，
        # 那样「不随强化提升」的属性（速度/命中/回避…）会被误覆盖成 0。
        levels = []
        if reinforce_max:
            for level in range(1, reinforce_max + 1):
                row: dict = {"lv": level}
                for key, base_field, group_field in STAT_MAP:
                    group_id = params_row.get(group_field) or 0
                    delta = groups.get(group_id, {}).get(level, 0) if group_id else 0
                    row[key] = (params_row.get(base_field) or 0) + delta
                if any(row[key] != stats[key] for key, _base, _group in STAT_MAP):
                    levels.append(row)

        # 合材补强（材质补强）：目标阶级 / 阶级内次数 / 金币 / 五项属性累计加成
        over_rank = [
            {
                "rank": row.get("rank") or 0,
                "level": row.get("level") or 0,
                "cost": row.get("cost") or 0,
                "atk": row.get("attack") or 0,
                "mag": row.get("magic") or 0,
                "div": row.get("divine") or 0,
                "def": row.get("defence") or 0,
                "mdef": row.get("magic_defence") or 0,
            }
            for row in sorted(
                over_rank_groups.get(pick(rolls, "over_rank_reinforce_group_id") or 0, []),
                key=lambda r: (r.get("rank") or 0, r.get("level") or 0),
            )
        ]

        # 图鉴编号：特殊装备在游戏图鉴里显示为 EX（没有图鉴记录时为 None）
        collection = collection_by_ident.get(ident)
        collection_id = None
        if collection:
            collection_id = (
                "EX" if collection.get("display_type") == 2 else collection.get("list_number")
            )

        element = pick(rolls, "element") or 0
        note = pick(rolls, "note")
        display_name = names(rolls[0]).get("name")
        extra_row = extra_map.get(ident) or {}
        equipments.append({
            "id": ident,
            "name": display_name,
            "name_jp": names(rolls[0]).get("name_jp"),
            "name_en": names(rolls[0]).get("name_en"),
            "category": category,
            "type_id": kind if type_row else None,
            "type": type_name,
            "part": type_row.get("part"),
            "rank": pick(rolls, "rank") or 0,
            # 图鉴编号；特殊装备（display_type 2）显示为 EX
            "collection_id": collection_id,
            "element": element,
            "element_name": ELEMENT.get(element),
            "special": bool(pick(rolls, "is_special")),
            "note": note if isinstance(note, str) else None,
            # 列表图标（img_wiki/list_icon）与背包大图标（assets.lib/sprite/EquipmentIcon），
            # 都是「文件名去掉 .png」，并已按 wiki 标题规则规范化
            "list_icon": icon_name(pick(rolls, "list_icon_resource")),
            "icon": icon_name(pick(rolls, "icon_resource")),
            # 以下字段解包与 ``Api/GetV2Equipment`` 都还没有，保留占位（UI 仍留着位置）：
            # desc = 中文说明 / req = 装备需求
            "desc": None,
            "req": [],
            # 特典分类（9 = 特典，0 = 普通）与获取途径：来自 ``Api/GetV2Equipment`` 的 extra，
            # 即 wiki 上手工维护的 ``Data:EquipmentExtra.tabx``
            "soucate": extra_row.get("soucate") or 0,
            "sou": extra_row.get("sou") or [],
            # 妖精：0 不适用 / 1 可用 / 2 专用；fa_sk 是套装技能名（多个用「、」连接）
            "fa_can": fa_can,
            "fa_sk": "、".join(fairy_skill_names) or None,
            "fa_sk_desc": fairy_skill_desc,
            # 装备条件：职业限制（Job.id）/ 种族限制（CharacterSpecies.id），空 = 无限制
            "job_limited": job_limited,
            "race_limited": race_limited,
            # 加护：4 个槽位 × 19 个属性的百分比（``Api/GetV2Equipment`` 顶层 bonus）
            "bonus": bonus_map.get(display_name),
            "levels": levels,
            "reinforce_max": reinforce_max,
            # 材质补强（合材补强）：空数组 = 已是最上位阶级，不能再补强
            "over_rank": over_rank,
            "stats": stats,
            "max_stats": max_stats,
            # 临时字段：这件装备自身的普通攻击段数（解析不到时回填同类型众数）
            "attack_count": found,
            "skills": skills,
            "traits": traits,
            "set_skills": sets,
            # 商店来源（商店名 / 价格 / 货币名），空数组 = 商店买不到
            "shop": sorted(
                shop_by_ident.get(ident, []),
                key=lambda r: (r.get("price") or 0, r.get("shop_name") or ""),
            ),
        })

    # 攻击次数：优先用装备自身普通攻击的段数，解析不到时沿用同类型众数
    for item in equipments:
        found = item.pop("attack_count", None)
        counter = counts_by_type.get(item["type_id"] or 0)
        count = found or (counter.most_common(1)[0][0] if counter else 0)
        item["stats"]["c"] = count
        item["max_stats"]["c"] = count
        # 强化曲线每行也该带上攻击次数（不随强化变化，但要保持「完整数值」语义）
        for level_row in item.get("levels") or []:
            level_row["c"] = count

    equipments.sort(key=lambda e: (
        CATEGORY_ORDER.index(e["category"]) if e["category"] in CATEGORY_ORDER else 99,
        -e["rank"],
        e["id"],
    ))

    out_dir = os.path.join(CLEAN, "equipment")
    write_json(os.path.join(out_dir, "equipments.json"), equipments)

    by_category = collections.Counter(e["category"] for e in equipments)
    print(f"{len(equipments)} equipments -> {out_dir}")
    for category in CATEGORY_ORDER:
        if by_category.get(category):
            print(f"  {category:4} {by_category[category]:>4}")
    print(f"  {'其他':4} {by_category.get('其他', 0):>4}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
