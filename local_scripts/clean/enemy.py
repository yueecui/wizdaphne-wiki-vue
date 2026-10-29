"""Clean the enemy category (one row per ``EnemyCategory``).

Input : ``out/masterdata``
        ``EnemyCategory``     category (= 图鉴条目) with race / size / attack style
        ``CollectionEnemy``   bestiary entry (list number + zh / ja / en name)
        ``Enemy``             one row per spawn variant (kind / param / ai / skills)
        ``EnemyParam``        base / growth / correction + resistances
        ``EnemyParamOverride`` exp id -> hp / attack / magic / initiative factor
        ``EnemyAi``           ``ai_id`` -> 行动技能组（解包时撞名成 ``GuestCharacterAi~2``）
        ``EnemySkillGroup``   skill group id -> skill rows（weight 0 = 不由 AI 随机选择）
        ``EnemyInterruptAction`` ``ai_id`` -> 插入（割り込み）技能
        ``EnemyLayout``       enemy id -> level / max level of every spawn
        ``EnemyGimmick``      gimmick dictionary
        ``EnemySpecies`` / ``EnemyCharacteristic`` / ``Skill``

Output: ``local_scripts/work/clean/enemy/enemies.json``

One entry per ``EnemyCategory`` (289 categories: 252 in the bestiary + the
rest only exist in the master data). Numeric values are emitted as the raw
formula inputs, not as a level snapshot: the wiki computes

    value = (base + growth * level / 100) * correction / 100
    hp    = base * fluctuation / 100 + growth * level / 100

which was verified against the reference site (goblin lv2 -> HP 36-44,
attack 27, defence 33, covert -7).

    python enemy.py
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, load, names, skill_identification, write_json  # noqa: E402

#: ``EnemyParam`` 的属性组：``base_<key>`` / ``growth_<key>`` / ``correction_<key>``
STAT_KEYS = (
    "hp", "mp", "sp",
    "attack", "magic", "divine",
    "hit", "avoid", "resist",
    "defence", "magic_defence",
    "critical", "avoid_critical",
    "initiative", "covert",
)

#: 敌人 AI -> 行动技能组。解包时与 ``GuestCharacterAi`` 撞名，落成了 ``GuestCharacterAi~2``；
#: 字段是 ``ai_id`` + ``dungeon_level`` + ``skill_group_id`` + ``priority``。
#: 一个 ``ai_id`` 会挂几十个技能组（按 priority / 条件切换），技能取并集。
AI_TABLE = "GuestCharacterAi~2"

#: 插入 / 行动技能的触发条件参数（``condition_type`` + ``params``）。
#: ``condition_type == 1`` 时 ``params[0]`` 是 HP 百分比，即参考站的「HP 15% 以下」。
CONDITION_TABLE = "AutoBattleActionConditionAI"
HP_CONDITION_TYPE = 1

#: 已知的 ``condition_type`` 文案：返回 ``{text}`` 或 ``{label, ref|status, suffix}``。
#: 带 ``ref`` 的参数是 ``EnemyCategory.id``（type 18 的 90900~90903 = 冰柱、type 22 的 90800
#: = 戈弗罗自己），前端会渲染成可点击的敌人；带 ``status`` 的是子效果种类 id
#: （``SkillSubEffectKind.id``，前端用效果种类名表换成名字）。
#: 其余类型走 ``condition_display()`` 的 ``type N`` 兜底。
CONDITION_TYPE_TEXT = {
    # type 0：id 1，恒真——EnemyAi 里当兜底行用
    0: lambda params: {"text": "无条件"},
    # type 1：params[0] = HP 百分比（100→90 / 101→80 … 115→15）
    1: lambda params: {"text": f"HP {params[0]}% 以下" if params else "HP 条件"},
    # type 2：params[0] = 回合数（1 起算，精确匹配；首回合必定放的技能挂的就是 type2(1)）
    2: lambda params: {"text": f"第 {params[0]} 回合" if params else "回合条件"},
    # type 17：params[0] = sub effect id，自己身上带着该状态时成立
    # （1700~1737 = 3410 凍結 / 3010 毒 / 3020 睡眠 …）
    17: lambda params: {"label": "自身处于", "status": params[0], "suffix": "状态"}
                       if params else {"text": "自身状态条件"},
    # type 18：params = [敌人分类 id, 期望值]，例如戈弗罗的四根冰柱 90900~90903
    18: lambda params: {"label": "单位", "ref": params[0],
                       "suffix": "存在" if len(params) > 1 and params[1] else "不存在"}
                      if params else {"text": "单位条件"},
    # type 22：params = [敌人分类 id]（2200 → [90800] = 戈弗罗自己）
    22: lambda params: {"label": "敌人分类", "ref": params[0], "suffix": "存在"}
                      if params else {"text": "敌人分类条件"},
    # type 31：params = [sub effect id, 我方带该状态的人数]
    # （2500~2503 = 3410 凍結 1 / 2 / 3 / 5 人，人数递增、priority 也递增，按「以上」文案）
    31: lambda params: {"label": "我方", "status": params[0],
                       "suffix": f"{params[1]} 人以上" if len(params) > 1 else ""}
                      if params else {"text": "我方状态条件"},
}

#: 说的不是「选谁当目标」的 ``condition_type``：无条件 / 回合 / 自身状态 / 我方状态人数。
#: 它们出现在 ``EnemySkillGroup.skill_target_condition_id`` 里时，多半是解包把几张同 schema
#: 的合并表压成一份造成的 id 串位，技能池里干脆不显示。
TARGET_IGNORED_TYPES = {0, 2, 17, 31}
#: ``EnemyParam.*_resist`` -> 输出键
RESIST_KEYS = {
    "critical_resist": "critical",
    "instant_death_resist": "instant_death",
    "poison_resist": "poison",
    "sleep_resist": "sleep",
    "stun_resist": "stun",
    "paralys_resist": "paralys",
    "fear_resist": "fear",
    "parameter_down_resist": "parameter_down",
    "extinction_resist": "extinction",
    "seal_resist": "seal",
    "charm_resist": "charm",
    "curse_resist": "curse",
    "wt_change_resist": "wt_change",
    "confuse_resist": "confuse",
    "stone_resist": "stone",
    "freeze_resist": "freeze",
}


def stat_block(param: dict) -> dict:
    """``EnemyParam`` 的数值部分 -> ``{hp: {base, growth, correction, min, max}, ...}``."""
    out = {}
    for key in STAT_KEYS:
        block = {}
        base = param.get("base_" + key)
        growth = param.get("growth_" + key)
        correction = param.get("correction_" + key)
        if base:
            block["base"] = base
        if growth:
            block["growth"] = growth
        # 修正率默认 100%，只有非常规值（如哥布林隐蔽 65）才写出来
        if correction and correction != 100:
            block["correction"] = correction
        if key == "hp":
            low = param.get("min_fluctuation_hp")
            high = param.get("max_fluctuation_hp")
            if low and low != 100:
                block["min"] = low
            if high and high != 100:
                block["max"] = high
        if block:
            out[key] = block
    return out


def resist_block(param: dict) -> dict:
    out = {}
    for field, key in RESIST_KEYS.items():
        value = param.get(field)
        if value:
            out[key] = value
    if param.get("is_ignore_wt_change_resist"):
        out["ignore_wt_change"] = True
    return out


def freeze_block(param: dict, intelligence: int) -> dict:
    out = {}
    for field, key in (
        ("half_freeze_count", "half"),
        ("freeze_count", "full"),
        ("freeze_break_count", "break"),
        ("natural_recovery_rate_per_turn", "recovery"),
    ):
        value = param.get(field)
        if value:
            out[key] = value
    if intelligence:
        out["intelligence"] = intelligence
    low = param.get("min_fluctuation_base_wait_turn")
    high = param.get("max_fluctuation_base_wait_turn")
    if low and low != 100:
        out["wait_min"] = low
    if high and high != 100:
        out["wait_max"] = high
    return out


def ident_of(value, by_row: dict, known: set) -> int | None:
    """技能引用 -> identification。

    行 id 的规则并不统一（``30001609000 -> 300016090``，但 ``210703101`` 本身就是
    identification），所以必须查表，不能靠除法。
    """
    if not value:
        return None
    if value in by_row:
        return by_row[value]
    if value in known:
        return value
    return None


def drop_empty(obj: dict) -> dict:
    """丢 None / 空容器 / False，但**保留 0**（``kind: 0`` 是「一般」）。"""
    return {
        key: value for key, value in obj.items()
        if value is not None and value is not False and value != [] and value != {}
    }


def common_block(blocks: list) -> dict:
    """同一分类下多数变体共有的一份数值（抗性 / 冻结），用于列表展示。"""
    payload = [json.dumps(b, sort_keys=True, ensure_ascii=False) for b in blocks if b]
    if not payload:
        return {}
    best = collections.Counter(payload).most_common(1)[0][0]
    return json.loads(best)


def dedupe(values) -> list:
    out, seen = [], set()
    for value in values:
        if value is None or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def pick_names(*rows) -> dict:
    """按顺序取第一个带名字的行（图鉴 -> 分类 -> 实例）。"""
    for row in rows:
        if not isinstance(row, dict):
            continue
        result = names(row)
        if result.get("name"):
            return result
    return {"name": None, "name_jp": None, "name_en": None}


def condition_segments(rows: list) -> list[list[dict]]:
    """把合并进来的几张同结构条件表按 id 回落位置切开。

    解包把 5 个同 schema 的文件并成了一个 ``AutoBattleActionConditionAI.json``，
    于是同一个 id 在不同段里有不同含义（例如 1811：一段是「90900 冰柱存在」，
    另一段是「10201 骷髅弓箭手存在」）。
    """
    segments, current = [], []
    for row in rows:
        if current and (row.get("id") or 0) < (current[-1].get("id") or 0):
            segments.append(current)
            current = []
        current.append(row)
    if current:
        segments.append(current)
    return segments


def pick_conditions(rows: list, referenced: set) -> dict[int, dict]:
    """挑出「敌人侧」真正使用的条件定义。

    判断依据不是段的大小，而是哪一段被敌人数据（``EnemyAi`` / ``EnemyInterruptAction`` /
    ``EnemySkillGroup.skill_target_condition_id``）引用得最多——被引用最多的那段才是同一
    套 id 空间。
    """
    best, best_score = [], -1
    for segment in condition_segments(rows):
        ids = {row.get("id") for row in segment}
        score = len(ids & referenced)
        if score > best_score or (score == best_score and len(segment) > len(best)):
            best, best_score = segment, score
    picked: dict[int, dict] = {}
    for row in best:
        picked.setdefault(row["id"], row)
    return picked


def condition_display(condition_id: int | None, conditions: dict) -> dict:
    """条件 id -> ``{text}`` 或 ``{label, ref, suffix}``。

    ``AutoBattleActionConditionAI`` 里只有 ``(id, condition_type, params)``，没有参数名
    也没有枚举名，所以能确定的类型先写进 ``CONDITION_TYPE_TEXT``；其余一律显示
    ``type N(参数)``。

    带 ``ref`` 的（type 18 / 22）参数是 ``EnemyCategory.id``，前端会做成敌人链接；
    带 ``status`` 的（type 31）参数是子效果种类 id，前端用效果种类名表换成中文名。

    以后要补全时**只改这张表**（或改成从人工表 ``Api/GetV2Extra`` 读），前端不用动。
    """
    if not condition_id:
        return {"text": "无条件"}
    row = conditions.get(condition_id)
    if not row:
        return {"text": f"#{condition_id}"}
    render = CONDITION_TYPE_TEXT.get(row.get("condition_type"))
    if render is not None:
        return render(row.get("params") or [])
    params = row.get("params") or []
    args = ",".join(str(value) for value in params)
    return {"text": f"type {row.get('condition_type')}" + (f"({args})" if args else "")}


def condition_text(condition_id: int | None, conditions: dict) -> str:
    """纯文本版本（技能池的「目标条件」用，不显示成链接）。"""
    display = condition_display(condition_id, conditions)
    if display.get("text"):
        return display["text"]
    if display.get("status") is not None:
        # 这里拿不到效果种类名（在人工表里），只留 id
        return f"{display['label']}状态 {display['status']} {display.get('suffix') or ''}".strip()
    return f"{display['label']}#{display['ref']} {display['suffix']}"


def condition_unknown(condition_id: int | None, conditions: dict) -> bool:
    """条件含义还猜不出来（走 ``type N(参数)`` 兜底，或定义根本查不到）。

    这种文案对读者没有意义，技能池的「目标条件」遇到就直接不显示。
    """
    if not condition_id:
        return False
    row = conditions.get(condition_id)
    if not row:
        return True
    return row.get("condition_type") not in CONDITION_TYPE_TEXT


def target_hidden(condition_id: int | None, conditions: dict) -> bool:
    """``skill_target_condition_id`` 是否不值得显示。

    两种情况：含义还没解析出来（``type N`` 兜底 / 查不到定义）；或者虽然是已知类型、
    但说的不是「选谁当目标」（回合 / 自身状态 / 我方状态人数）——后者出现在目标条件里
    基本是合并表的 id 串位，显示出来只会误导。
    """
    if condition_unknown(condition_id, conditions):
        return True
    return conditions[condition_id].get("condition_type") in TARGET_IGNORED_TYPES


def hp_threshold(condition: dict | None) -> int | None:
    """``AutoBattleActionConditionAI`` 里 ``condition_type == 1`` 的条件 = 「HP N% 以下」。"""
    if not condition or condition.get("condition_type") != HP_CONDITION_TYPE:
        return None
    params = condition.get("params") or []
    if params and 0 < params[0] <= 100:
        return params[0]
    return None


def interrupt_details(rows: list, conditions: dict, ident) -> list[dict]:
    """``EnemyInterruptAction`` 的行 -> ``[{skill, once, hp, conditions}]``。

    一行 = 一种触发方式，**不按技能合并**：同一个技能常有多档触发（例如拉巴迪欧斯
    同时挂「HP 60% 以下」和「HP 30% 以下」），行内条件之间是 AND、行与行之间是 OR，
    合并成一份会把两种语义糊在一起。行按 ``priority`` 升序（小的先判定）。

    * ``hp``：该行条件里的 HP 档位（同一行有多个 HP 条件时取最低）。
    * ``conditions``：触发条件的展示文案（和 AI 行动规则同一套 ``condition_display()``），
      前端把插入行也列进 AI 行动规则表时直接用。
    """
    out = []
    for row in sorted(rows, key=lambda r: (r.get("priority") or 0, r.get("id") or 0)):
        skill = ident(row.get("interrupt_skill_id"))
        if not skill:
            continue
        condition_ids = [
            condition_id for condition_id in row.get("interrupt_action_condition_ids") or []
            if condition_id
        ]
        values = [hp_threshold(conditions.get(condition_id)) for condition_id in condition_ids]
        values = [value for value in values if value]
        out.append({
            "skill": skill,
            "once": bool(row.get("use_only_once")),
            "hp": min(values) if values else None,
            "conditions": [
                condition_display(condition_id, conditions) for condition_id in condition_ids
            ],
        })
    return out


def ai_plan(rows: list, skill_groups: dict, conditions: dict, ident,
            default_target: int = 100) -> list[dict]:
    """``EnemyAi`` 的行 -> AI 行动规则（已按 priority 升序）。

    每行 = 一条「条件成立就用这个技能池」的规则；条件之间是 AND，判定时从上往下取第
    一条全部成立的。``condition_text()`` 把条件 id 翻成人话（未知类型显示 ``type N``）。
    技能池里带上 ``weight``（随机抽选的权重）和 ``skill_target_condition_id``（选目标的条件，
    ``100`` 是最常见的默认值，不显示；含义没解析出来或不属于目标语义的也不显示，
    见 ``target_hidden()``）。
    """
    plan = []
    for row in sorted(rows, key=lambda r: (r.get("priority") or 0, r.get("id") or 0)):
        skills = []
        for group_row in skill_groups.get(row.get("skill_group_id")) or []:
            value = ident(group_row.get("skill_id"))
            if not value:
                continue
            target = group_row.get("skill_target_condition_id") or 0
            known = target not in (0, default_target) and not target_hidden(target, conditions)
            skills.append({
                "skill": value,
                "weight": group_row.get("weight") or 0,
                "target": condition_text(target, conditions) if known else None,
            })
        plan.append({
            "priority": row.get("priority"),
            "conditions": [
                condition_display(condition_id, conditions)
                for condition_id in row.get("action_condition_ids") or []
            ],
            "skills": skills,
        })
    return plan


def variant_skills(row: dict, ai_groups: dict, skill_groups: dict, interrupts: dict,
                   conditions: dict, ident):
    """一个 ``Enemy`` 行的技能 -> ``(行动, 插入, 被动, 挣扎)``。

    * 行动：``EnemyAi`` 给该 ``ai_id`` 挂的全部技能组。``weight == 0`` 的行是脚本 /
      特殊机制触发、AI 不会随机选的技能（如「吸収1回目」），按参考站的做法不列入。
    * 插入：``EnemyInterruptAction``（割り込み），带「一次」标记与 HP 触发条件。
      例如戈弗罗的「冰墙的奇迹」只在这里。
    * 被动：``Enemy.standard_skill_ids``。
    * 挣扎：``Enemy.skill_struggle``。

    出现在插入里的技能不再重复列进行动池（参考站也是这么分栏的）。
    """
    def ident_list(values):
        return dedupe([ident(value) for value in values])

    group_ids = list(ai_groups.get(row.get("ai_id")) or [])
    # AI 表缺项时至少保住「技能组 id == Enemy.id」这一组（早期版本用的规则）
    if row["id"] in skill_groups and row["id"] not in group_ids:
        group_ids.append(row["id"])

    seen, used = [], []
    for gid in group_ids:
        for group_row in skill_groups.get(gid) or []:
            value = ident(group_row.get("skill_id"))
            if not value:
                continue
            seen.append(value)
            if group_row.get("weight"):
                used.append(value)
    action = dedupe(used) or dedupe(seen)

    interrupt = interrupt_details(
        interrupts.get(row.get("ai_id")) or [], conditions, ident)
    passive = ident_list(row.get("standard_skill_ids") or [])
    struggle = ident(row.get("skill_struggle"))

    blocked = {item["skill"] for item in interrupt}
    return [x for x in action if x not in blocked], interrupt, passive, struggle


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default=os.path.join(CLEAN, "enemy", "enemies.json"))
    args = ap.parse_args(argv)

    categories = {row["id"]: row for row in load("EnemyCategory")}
    collection = {row["enemy_category_id"]: row for row in load("CollectionEnemy")}
    params = {row["id"]: row for row in load("EnemyParam")}
    skill_rows = load("Skill")
    skill_by_row = {row["id"]: skill_identification(row) for row in skill_rows}
    #: 技能行 id -> 等级（同一 identification 的多级技能，行 id 末尾两位就是等级）
    skill_level_by_row = {row["id"]: row.get("level") or 0 for row in skill_rows}
    known_skills = set(skill_by_row.values())

    # 技能组：AI（``Enemy.ai_id``）-> 技能组 id -> 技能行
    skill_groups: dict[int, list] = collections.defaultdict(list)
    for row in load("EnemySkillGroup"):
        skill_groups[row["skill_group_id"]].append(row)

    #: ``ai_id`` -> 它可能使用的技能组（一个 AI 会挂几十组，按条件 / 优先级切换）
    try:
        ai_rows = load(AI_TABLE)
    except FileNotFoundError:       # 旧解包没有这张表时退回「技能组 == Enemy.id」
        ai_rows = []
    ai_groups: dict[int, list] = collections.defaultdict(list)
    ai_rows_by_id: dict[int, list] = collections.defaultdict(list)
    for row in ai_rows:
        ai_rows_by_id[row.get("ai_id")].append(row)
        group_id = row.get("skill_group_id")
        if group_id and group_id not in ai_groups[row.get("ai_id")]:
            ai_groups[row.get("ai_id")].append(group_id)

    #: ``ai_id`` -> 插入（割り込み）技能，例如戈弗罗的「冰墙的奇迹」
    interrupts: dict[int, list] = collections.defaultdict(list)
    for row in load("EnemyInterruptAction"):
        interrupts[row.get("ai_id")].append(row)

    #: 敌人数据引用到的全部条件 id，用来在多段合并表里选出对应的 id 空间
    referenced: set[int] = set()
    for row in ai_rows:
        referenced.update(row.get("action_condition_ids") or [])
    for rows in interrupts.values():
        for row in rows:
            referenced.update(row.get("interrupt_action_condition_ids") or [])
    for rows in skill_groups.values():
        for row in rows:
            if row.get("skill_target_condition_id"):
                referenced.add(row["skill_target_condition_id"])

    #: 条件 id -> ``{condition_type, params}``
    conditions = pick_conditions(load(CONDITION_TABLE), referenced)

    # 等级区间：EnemyLayout 里同一 enemy 可能出现在很多层
    # 教学 / 测试布局（等级 1、上限 99+）会把区间拉成 1-100，直接跳过
    levels: dict[int, list] = {}
    for row in load("EnemyLayout"):
        enemy_id = row["enemy_id"]
        low, high = row.get("level") or 0, row.get("max_level") or 0
        # 99 / 100 是「无上限」占位，会把区间拉成 1-100
        if high >= 99:
            continue
        # ``level`` 与 ``max_level`` 含义不同：深层敌人是「level 固定 80 + max_level 35~75」，
        # 可能 low>high，先归一成升序再合并 —— 既避免 Lv80-75 倒挂，也别漏掉 80 级出场
        if low > high:
            low, high = high, low
        span = levels.setdefault(enemy_id, [low, high])
        if low:
            span[0] = min(span[0] or low, low)
        if high:
            span[1] = max(span[1], high)

    by_category: dict[int, list] = collections.defaultdict(list)
    for row in load("Enemy"):
        by_category[row["category_id"]].append(row)
    for rows in by_category.values():
        rows.sort(key=lambda r: r["id"])

    entries = []
    for category_id, instance_rows in by_category.items():
        category = categories.get(category_id) or {}
        book = collection.get(category_id)

        variants = []
        attributes, attack_attributes, weaknesses = [], [], []
        characteristics, gimmicks, kinds = [], [], []
        level_low, level_high = 0, 0
        all_skills: list[int] = []

        for row in instance_rows:
            enemy_id = row["id"]
            param = params.get(row.get("param_id")) or {}

            #: 本变体引用到的技能等级：identification -> 等级（多级技能才有意义，0 不记）
            skill_levels: dict[int, int] = {}

            def ident(ref, _levels=skill_levels):
                identification = ident_of(ref, skill_by_row, known_skills)
                if identification is not None:
                    level = skill_level_by_row.get(ref) or 0
                    if level:
                        _levels.setdefault(identification, level)
                return identification

            action, interrupt, passive, struggle = variant_skills(
                row, ai_groups, skill_groups, interrupts, conditions, ident,
            )
            skills = dedupe(
                sorted(action) + [item["skill"] for item in interrupt] + passive
                + ([struggle] if struggle else []))

            level = levels.get(enemy_id) or [0, 0]
            stat = stat_block(param)
            variant = {
                "id": enemy_id,
                "kind": row.get("kind"),
                "param": row.get("param_id"),
                "exp": row.get("exp_id"),
                "ai": row.get("ai_id"),
                "level": level if any(level) else None,
                "attribute": [x for x in row.get("attribute_ids") or [] if x],
                "attack_attribute": [x for x in row.get("attack_attribute_ids") or [] if x],
                "weak": [x for x in (row.get("weak_1"), row.get("weak_2"), row.get("weak_3")) if x],
                "characteristics": [x for x in row.get("characteristics") or [] if x],
                "gimmicks": [row.get("gimmick_%d" % i) for i in range(1, 11) if row.get("gimmick_%d" % i)],
                "fly": bool(row.get("is_fly")),
                "body_size": row.get("body_size"),
                # 全部技能（行动 + 插入 + 被动 + 挣扎）与分栏明细
                "skills": skills,
                # 引用到的技能等级（identification -> 等级）
                "skill_levels": {str(k): v for k, v in skill_levels.items()},
                "action_skills": sorted(action),
                # 插入技能：带「一次」标记与 HP 触发条件
                "interrupts": interrupt,
                "passive_skills": passive,
                "struggle_skill": struggle,
                # AI 行动规则：priority 升序，条件成立就用该技能池
                "ai_plan": ai_plan(
                    ai_rows_by_id.get(row.get("ai_id")) or [],
                    skill_groups, conditions, ident,
                ),
                "stats": stat,
                "resist": resist_block(param),
                "freeze": freeze_block(param, row.get("intelligence") or 0),
            }
            variants.append(drop_empty(variant))

            attributes += variant["attribute"]
            attack_attributes += variant["attack_attribute"]
            weaknesses += variant["weak"]
            characteristics += variant["characteristics"]
            gimmicks += variant["gimmicks"]
            kinds.append(row.get("kind"))
            all_skills += skills
            if any(level):
                low, high = level
                level_low = low if not level_low else min(level_low, low)
                level_high = max(level_high, high)

        name = pick_names(book, category, instance_rows[0])
        # 缩略图：同一分类基本共用一张（10 个分类有差异，4 个没有），取第一个有值的
        thumbnail = next(
            (row.get("thumbnail_name") for row in instance_rows if row.get("thumbnail_name")),
            None,
        )
        entry = {
            "id": category_id,
            "no": (book or {}).get("list_number"),
            "book": book.get("id") if book else None,
            **name,
            "thumbnail": thumbnail,
            "boss": bool((book or {}).get("enemy_boss_flag")),
            "race": category.get("race_id"),
            "lineage": category.get("lineage_id"),
            "size": category.get("size_kind"),
            "attack_type": category.get("attack_type"),
            "damage_type": category.get("damage_type"),
            "attribute": sorted(set(attributes)),
            "attack_attribute": sorted(set(attack_attributes)),
            "weak": sorted(set(weaknesses)),
            "characteristics": sorted(set(characteristics)),
            "gimmicks": sorted(set(gimmicks)),
            "kinds": sorted({k for k in kinds if k is not None}),
            "level": {"min": level_low, "max": level_high} if level_low or level_high else None,
            "fly": any("fly" in v for v in variants),
            # 抗性 / 冻结在分类内基本一致，列表页直接用这一份；个别变体差异见 variants
            "resist": common_block([v.get("resist") or {} for v in variants]),
            "freeze": common_block([v.get("freeze") or {} for v in variants]),
            "body_size": dict(collections.Counter(
                tuple(v["body_size"]) for v in variants if v.get("body_size")
            )) or None,
            "skills": dedupe(all_skills),
            "variants": variants,
        }
        # 体型是多值统计，转成「值 -> 出现次数」的普通列表，便于前端挑主值
        if entry["body_size"]:
            entry["body_size"] = [
                {"size": list(size), "count": count}
                for size, count in sorted(entry["body_size"].items())
            ]
        entries.append(drop_empty(entry))

    entries.sort(key=lambda e: (e.get("no") is None, e.get("no") or 0, e["id"]))
    write_json(args.out, entries)
    print(f"{len(entries)} enemy categories "
          f"({sum(1 for e in entries if e.get('no'))} in bestiary, "
          f"{sum(len(e['variants']) for e in entries)} variants) -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
