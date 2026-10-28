"""Clean the skill category (all 3,031 identifications, flagged).

Input : ``out/masterdata``
        ``Skill``                        skill level rows (id = identification*100 + level)
        ``CharacterSkill``               job -> skill unlock table
        ``Character``                    unique / inherit / potential skills
        ``CharacterSelfRestraintSkill``  discipline (克己) skills
        ``Equipment`` / ``EquipSetSkills`` / ``RelicSkill`` / ``FateAdditionalSkills``
        ``SkillEffectGroup``              effect group (verified by FK closure)
        ``SkillSubEffect``                one applied effect / debuff
        ``SkillSubEffectKind``            effect kind dictionary
        ``SkillDamageEffect`` / ``SkillTarget`` / ``SkillActivateTiming``

Output: ``local_scripts/work/clean/skill/``
        ``skills.json``        one entry per identification (no level payload)
        ``skill_levels.json``  identification -> [per-level cost + effect numbers]
        ``effect_kinds.json``  effect kind id -> japanese label + usage count

Filtering is NOT applied: every identification is emitted with flags
(``player`` / ``test`` / ``level0``), so the caller decides what to show.

    python skill.py
    python skill.py --limit 50        # only the first N identifications (probe)
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, load, names, skill_identification, text, write_json  # noqa: E402

KIND_NAMES = {
    1: "普通攻击",
    2: "攻击技能",
    3: "辅助技能",
    4: "攻击魔法",
    5: "回复魔法",
    6: "强化魔法",
    7: "妨碍魔法",
    20: "设置陷阱",
    90: "特殊",
}

#: 效果种类名不在生成阶段写死：保留客户端日文 ``name``，
#: 中文由 Wiki 上的 ``Data:EffectKind.json``（``Api/GetV2Enum`` 的 ``kinds``）在前端覆盖。
#: 参数名一律按位置写成「参数1 / 参数2 …」，不做任何推断。

TEST_NAME = re.compile(r"テスト|テスト|test|Test|空データ")

#: 敌人 / 武器的普通攻击在官方表里没有真名，只有 ``通常攻撃_近_前列抽選_1回攻撃`` 这类占位名，
#: 个别行还错填了中文（216200020 = 狼的普攻，zhs 竟是「坚守不退」，那是 踏み止まり 的译名）。
#: 这些行一律显示成「普通攻击」；段数 / 属性看 ``description``。
#: 注意 ``通常攻撃時クリティカル``（关于普攻的被动）不算占位名，不会被匹配。
NORMAL_ATTACK = re.compile(r"^通常攻撃(_|$)")
NORMAL_ATTACK_NAME = "普通攻击"


def ident_of(value: int, known: dict) -> int | None:
    """Skill references are stored in two shapes: row id (ident*100+lv) or ident."""
    if not value:
        return None
    if value in known:
        return value
    if value // 100 in known:
        return value // 100
    return None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--limit", type=int, default=0, help="only the first N identifications")
    args = ap.parse_args(argv)

    skills = load("Skill")
    by_ident: dict[int, list] = collections.defaultdict(list)
    for r in skills:
        # 官方表把个别技能行写进了别的 identification（见 common.SKILL_IDENT_FIXES），
        # 这里按行 id 纠正后再归组，否则两行会被并成同一个技能、名字只取到第一行。
        by_ident[skill_identification(r)].append(r)
    for rows in by_ident.values():
        rows.sort(key=lambda r: r.get("level") or 0)
    known = set(by_ident)

    # ---------- effect chain ----------
    groups = {r["id"]: r for r in load("SkillEffectGroup")}
    subs = {r["id"]: r for r in load("SkillSubEffect")}
    # 子效果的扩展参数（以 SkillSubEffect.id 为键，params 大多又是别的 sub effect id）
    ext_params = {r["id"]: r.get("params") or None for r in load("SkillSubEffectExtensionParam")}
    kinds = {r["id"]: r for r in load("SkillSubEffectKind")}
    damage = {r["id"]: r for r in load("SkillDamageEffect")}
    targets = {r["id"]: r for r in load("SkillTarget")}
    # kind 2790「敵のバフ数によってStepReplace」的 param_1 指向这张表：
    # replace_id -> step（敌人能力提升效果数量档）-> 实际执行的技能效果组
    step_replaces: dict[int, dict[int, dict]] = collections.defaultdict(dict)
    for r in load("SkillStepReplace"):
        step_replaces[r["replace_id"]][r["step"]] = r

    # ---------- 召唤 ----------
    # ``EnemyFriendLayout`` 每行是一个被召唤出来的 Enemy 实例（位置 / 等级），
    # ``friend_layout_id`` 有两种挂法：
    #   1. 等于施放技能自己（大多数情况，布局 id = ``Skill.id``）；
    #   2. 由 ``SkillSubEffect`` 里 kind 6000「仲間呼び」的 ``param_1`` 指过去
    #      （例如 213106000「召唤」→ 布局 123001000，此时布局 id 与技能 id 无关）。
    # 只按第一种join会漏掉后一种，所以两种都认。
    enemy_rows = {r["id"]: r for r in load("Enemy")}
    summon_units: dict[int, dict[tuple[int, int], int]] = collections.defaultdict(
        lambda: collections.defaultdict(int))
    for r in load("EnemyFriendLayout"):
        enemy = enemy_rows.get(r.get("enemy_id")) or {}
        category = enemy.get("category_id")
        if not r.get("friend_layout_id") or not category:
            continue
        summon_units[r["friend_layout_id"]][(category, r.get("level") or 0)] += 1

    #: ident -> 该技能 6000 子效果里出现的 friend_layout_id（第二种挂法用）
    summon_layout_of: dict[int, list[int]] = collections.defaultdict(list)
    for ident, rows in by_ident.items():
        for r in rows:
            for group_id in r.get("skill_effect_group_ids") or []:
                for sub_id in (groups.get(group_id) or {}).get("sub_effect_ids") or []:
                    sub = subs.get(sub_id) or {}
                    layout_id = sub.get("param_1")
                    if sub.get("kind") == 6000 and layout_id and layout_id not in summon_layout_of[ident]:
                        summon_layout_of[ident].append(layout_id)

    # ---------- who references what ----------
    sources: dict[int, set] = collections.defaultdict(set)

    def ref(value, label):
        i = ident_of(value, known)
        if i is not None:
            sources[i].add(label)

    chars = load("Character")
    for c in chars:
        for u in c.get("unique_skill_ids") or []:
            ref(u, "unique")
        for k in ("skill_identification_1", "skill_identification_2"):
            ref(c.get(k), "inherit")
        for k in ("sub_skill_identification_1", "sub_skill_identification_2"):
            ref(c.get(k), "potential")
    for r in load("CharacterSelfRestraintSkill"):
        ref(r.get("skill_identification"), "discipline")
    for r in load("CharacterSkill"):
        ref((r.get("skill_id") or 0) // 100, "job")
    for e in load("Equipment"):
        for x in e.get("standard_skill_ids") or []:
            ref(x, "equipment")
        ref(e.get("attack_skill_id"), "equipment")
    for r in load("EquipSetSkills"):
        ref(r.get("skill_identification"), "equip_set")
    for r in load("RelicSkill"):
        ref(r.get("relic_skill_identification_1"), "relic")
        ref(r.get("relic_skill_identification_2"), "relic")
    for r in load("FateAdditionalSkills"):
        ref(r.get("skill_identification"), "bond")
    # 角色隐退后得到的「XX 的才能」（1930150xx）；缘角色则是羁绊技能（193316xxx）
    for r in load("FateCharacterStatuses"):
        label = "fate" if r.get("character_type") == "Character::Character" else "bond"
        ref(r.get("default_skill_id"), label)

    # job that learns the skill (CharacterSkill + Skill.learnable_job_id)
    job_of: dict[int, set] = collections.defaultdict(set)
    learn_of: dict[int, list] = collections.defaultdict(list)
    for r in load("CharacterSkill"):
        i = (r.get("skill_id") or 0) // 100
        if i in known:
            job_of[i].add(r["job_id"])
            learn_of[i].append({"job": r["job_id"], "get_lv": r.get("get_lv")})
    for r in skills:
        if r.get("learnable_job_id"):
            ident = skill_identification(r)
            job_of[ident].add(r["learnable_job_id"])
            learn_of[ident].append(
                {"job": r["learnable_job_id"], "get_lv": None})

    # ---------- build ----------
    #: identification -> 召唤出来的单位（分类 / 等级 / 数量）
    summon_by_ident: dict[int, list[dict]] = collections.defaultdict(list)
    for skill_id, units in summon_units.items():
        ident = ident_of(skill_id, known)
        if ident is None:
            continue
        for (category, level), count in units.items():
            summon_by_ident[ident].append(
                {"category": category, "level": level, "count": count})

    # 第二种挂法兜底：布局 id 与技能 id 无关，只能从 6000 的 param_1 查
    for ident, layout_ids in summon_layout_of.items():
        if summon_by_ident.get(ident):
            continue
        units: dict[tuple[int, int], int] = collections.defaultdict(int)
        for layout_id in layout_ids:
            for (category, level), count in (summon_units.get(layout_id) or {}).items():
                units[(category, level)] += count
        for (category, level), count in units.items():
            summon_by_ident[ident].append(
                {"category": category, "level": level, "count": count})

    idents = sorted(by_ident)
    if args.limit:
        idents = idents[: args.limit]

    entries, levels_out = [], {}
    kind_count = collections.Counter()
    #: kind -> 用到的最后一个 param 序号（用于生成「参数N」占位名）
    kind_param_span = collections.defaultdict(int)

    for ident in idents:
        rows = by_ident[ident]
        base = next((r for r in rows if (r.get("level") or 0) >= 1), rows[0])
        max_level = max((r.get("level") or 0) for r in rows)

        entry = {"identification": ident}
        entry.update(names(base))
        if not entry["name"]:
            entry["name"] = f"# {ident}"          # 5 enemy skills have empty names
        # 普攻占位名统一成「普通攻击」（见 NORMAL_ATTACK 的注释）；name_jp 保留原始占位名
        if NORMAL_ATTACK.search(str(entry.get("name_jp") or "")):
            entry["name"] = NORMAL_ATTACK_NAME
        kind = base.get("skill_kind")
        entry["kind"] = kind
        entry["kind_name"] = KIND_NAMES.get(kind)
        entry["max_level"] = max_level
        entry["is_passive"] = (base.get("use_timing") == 5)

        desc, desc_lang = text(base.get("description"))
        detail, detail_lang = text(base.get("detail_description"))
        entry["description"] = desc
        if desc_lang and desc_lang not in ("zhs", "zht"):
            entry["description_lang"] = desc_lang
        entry["detail_description"] = detail

        entry["sources"] = sorted(sources.get(ident, ()))
        entry["player"] = bool(entry["sources"])
        entry["jobs"] = sorted(job_of.get(ident, ()))
        units = sorted(summon_by_ident.get(ident, ()),
                       key=lambda unit: (-unit["count"], unit["category"]))
        if units:
            entry["summons"] = units
        #: "Lv 3 盗贼" style unlock conditions (CharacterSkill.get_lv)
        learn_map: dict[int, int | None] = {}
        for x in learn_of.get(ident, ()):
            j, g = x["job"], x["get_lv"]
            if j not in learn_map or (learn_map[j] is None and g is not None):
                learn_map[j] = g
        entry["learn"] = [{"job": j, "get_lv": g}
                          for j, g in sorted(learn_map.items(),
                                             key=lambda p: (p[0], p[1] if p[1] is not None else 99))]
        entry["job_limited"] = [j for j in (base.get("job_limited_ids") or []) if j]
        entry["equipment_limited"] = [e for e in (base.get("equipment_limited_ids") or []) if e]
        entry["tags"] = base.get("skill_tag_ids") or []

        raw_name = base.get("name")
        nm_ja = raw_name.get("ja") if isinstance(raw_name, dict) else raw_name
        test = (bool(TEST_NAME.search(str(nm_ja or "")))
                or 997000 < ident < 1000000
                or 999000000 <= ident < 1000000000)
        entry["flags"] = {
            "test": test,
            "level0": max_level == 0,
            "player": entry["player"],
        }

        # per-level payload
        lv_rows = []
        for r in rows:
            lv = r.get("level") or 0
            item = {"level": lv, "cost": r.get("cost"), "cost_kind": r.get("cost_kind"),
                    "use_timing": r.get("use_timing")}
            if r.get("use_limit"):
                item["use_limit"] = r["use_limit"]
            if r.get("hate"):
                item["hate"] = r["hate"]
            # 0 = 近距离，不能被当成空值跳过
            if r.get("range_type") is not None:
                item["range_type"] = r["range_type"]
            if r.get("skill_condition_ids"):
                item["skill_condition_ids"] = r["skill_condition_ids"]
            lv_desc, lv_lang = text(r.get("description"))
            if lv_desc and lv_desc != desc:
                item["description"] = lv_desc
                if lv_lang and lv_lang not in ("zhs", "zht"):
                    item["description_lang"] = lv_lang
            #: 有些技能的每个等级名字不同（如「隙ダメージ上書き90%」），引用时需要按等级取名字
            lv_name, lv_name_lang = text(r.get("name"))
            if lv_name and lv_name != entry["name"]:
                item["name"] = lv_name
                if lv_name_lang and lv_name_lang not in ("zhs", "zht"):
                    item["name_lang"] = lv_name_lang

            gids = [g for g in (r.get("skill_effect_group_ids") or []) if g]
            if gids:
                item["effect_group"] = gids[0]
            if r.get("passive_skill_effect_group_ids"):
                item["passive_effect_groups"] = r["passive_skill_effect_group_ids"]

            dmg, sub = [], []

            def brief_params(s):
                """param_1..7，裁掉尾部连续的 0，避免带一堆空位。"""
                params = [s.get(f"param_{i}") for i in range(1, 8)]
                used = [i + 1 for i, v in enumerate(params) if v]
                return params[: used[-1]] if used else None

            def sub_brief(sid, with_children=True):
                """被引用的 sub effect 的展示摘要；只向下展开一层，防止环。"""
                s = subs.get(sid)
                if not s:
                    return None
                k = s.get("kind")
                tgt = targets.get(s.get("skill_target_id")) or {}
                brief = {
                    "id": sid,
                    "kind": k,
                    "kind_name": text((kinds.get(k) or {}).get("name"))[0],
                    "params": brief_params(s),
                    "strength": s.get("strength"),
                    "turn": s.get("turn"),
                    "target": s.get("skill_target_id"),
                    "target_text": text(tgt.get("convert_text"))[0],
                    # 效果量（恢复量）：参照能力值 × 百分比 + 阈值窗口。
                    # 被参数引用的效果（例：6800 -> 1000 HP回復）只有带上这些数字，
                    # 才能显示「恢复量 · 神力 19%」，否则只剩一个效果名。
                    "calc_reference_parameter": s.get("calc_reference_parameter"),
                    "calc_reference_parameter_2": s.get("calc_reference_parameter_2"),
                    "calc_reference_parameter_rate": s.get("calc_reference_parameter_rate"),
                    "calc_reference_parameter_rate_2": s.get("calc_reference_parameter_rate_2"),
                    "calc_valid_cap_parameter_value": s.get("calc_valid_cap_parameter_value"),
                    "calc_valid_start_parameter_value": s.get("calc_valid_start_parameter_value"),
                }
                if with_children:
                    kids = [sub_brief(x, False) for x in (s.get("child_sub_effect_ids") or [])]
                    kids = [x for x in kids if x]
                    if kids:
                        brief["children"] = kids
                return brief

            def param_ref(v):
                """参数值指向别的效果时的展示摘要（sub effect id / 扩展参数行 id）。"""
                brief = sub_brief(v, with_children=False)
                if brief:
                    return brief
                # SkillSubEffectExtensionParam 行：
                # 整行都是 7 位以上的行 id 且都能查到 -> 当作效果列表展开；
                # 否则就是配置系数（100 / 200 / 310 / 3020 …），按数值逐项列出
                ext = ext_params.get(v) or []
                ids = [i for i in ext if i and i >= 1000000]
                kids = [sub_brief(i, with_children=False) for i in ids]
                base = {"id": v, "kind": None, "kind_name": "扩展参数", "strength": None,
                        "turn": None, "target": None, "target_text": None}
                if ext and len(ids) == len(ext) and all(kids):
                    return {**base, "params": None, "children": kids}
                if ext:
                    return {**base, "params": list(ext)}
                return None

            def sub_entry(sid, origin):
                """One SkillSubEffect row -> display payload (params = 数值1..7)."""
                s = subs.get(sid)
                if not s:
                    return None
                k = s.get("kind")
                kind_count[k] += 1
                tgt = targets.get(s.get("skill_target_id")) or {}
                item_sub = {
                    "kind": k,
                    "kind_name": text((kinds.get(k) or {}).get("name"))[0],
                    "strength": s.get("strength"),
                    "turn": s.get("turn"),
                    "target": s.get("skill_target_id"),
                    "target_text": text(tgt.get("convert_text"))[0],
                    "from": origin,
                    # apply (施加) check: which stat scales the chance, the base
                    # rate, and the stat window that maps to 0..100%
                    "reference_parameter": s.get("reference_parameter"),
                    "reference_parameter_rate": s.get("reference_parameter_rate"),
                    "abnormal_valid_start_parameter_value":
                        s.get("abnormal_valid_start_parameter_value"),
                    "abnormal_valid_cap_parameter_value":
                        s.get("abnormal_valid_cap_parameter_value"),
                    "force_apply": s.get("force_apply"),
                    "is_ignore_resist": s.get("is_ignore_resist"),
                    # 施加率的抵抗类型 / 子效果 / 目标种族限制
                    "reference_resist": s.get("reference_resist"),
                    "child_sub_effect_ids": s.get("child_sub_effect_ids") or None,
                    "target_race_ids": s.get("target_race_ids") or None,
                    # 效果量（恢复量等）：参照属性 × 百分比，带阈值窗口
                    "calc_reference_parameter": s.get("calc_reference_parameter"),
                    "calc_reference_parameter_2": s.get("calc_reference_parameter_2"),
                    "calc_reference_parameter_rate": s.get("calc_reference_parameter_rate"),
                    "calc_reference_parameter_rate_2": s.get("calc_reference_parameter_rate_2"),
                    "calc_valid_cap_parameter_value": s.get("calc_valid_cap_parameter_value"),
                    "calc_valid_start_parameter_value": s.get("calc_valid_start_parameter_value"),
                }
                params = [s.get(f"param_{i}") for i in range(1, 8)]
                used = [i + 1 for i, v in enumerate(params) if v]
                if used:
                    item_sub["params"] = params
                    if k is not None:
                        kind_param_span[k] = max(kind_param_span[k], used[-1])
                    # 参数里指向别的效果的 id（指定技能 / 系数组 …）：
                    # 把被引用效果的数据一起带出来，前端在下面按缩进行显示
                    # 只认 7 位数以上的值：普通数值（百分比 / 个数 / 种类 id）不是行 id
                    refs = {}
                    for i, value in enumerate(params, 1):
                        brief = param_ref(value) if value and value >= 1000000 else None
                        if brief:
                            refs[str(i)] = brief
                    if refs:
                        item_sub["param_refs"] = refs
                    # kind 2790 的 param_1 是 SkillStepReplace.replace_id：
                    # 按 step（敌人能力提升效果数量的档位）切换到不同的技能效果组，
                    # 这里把每一档真正生效的效果一并带出来，前端才能显示档位差异
                    if k == 2790 and params[0] in step_replaces:
                        steps = []
                        for step, row in sorted(step_replaces[params[0]].items()):
                            grp = groups.get(row.get("effect_group_id")) or {}
                            effects = [
                                brief
                                for brief in (
                                    sub_brief(sid, False)
                                    for sid in grp.get("sub_effect_ids") or []
                                )
                                if brief
                            ]
                            steps.append({
                                "step": step,
                                "effect_group": row.get("effect_group_id"),
                                "effects": effects or None,
                            })
                        item_sub["step_replace"] = steps
                # 扩展参数：SkillSubEffectExtensionParam 以 sub effect id 为键
                ext = ext_params.get(sid)
                if ext:
                    item_sub["extension_params"] = ext
                    ext_effects = [sub_brief(x) for x in ext]
                    ext_effects = [x for x in ext_effects if x]
                    if ext_effects:
                        item_sub["extension_effects"] = ext_effects
                # 子效果的展开版（保留 id 版给需要对照原始数据的地方）
                kids = [sub_brief(x) for x in (s.get("child_sub_effect_ids") or [])]
                kids = [x for x in kids if x]
                if kids:
                    item_sub["child_sub_effects"] = kids
                return item_sub

            for gid in gids + list(r.get("passive_skill_effect_group_ids") or []):
                grp = groups.get(gid) or {}
                for did in grp.get("damage_effect_ids") or []:
                    d = damage.get(did)
                    if not d:
                        continue
                    tgt = targets.get(d.get("skill_target_id")) or {}
                    dmg.append({
                        "attack_rate": d.get("attack_rate"),
                        "attack_rate_both_hands": d.get("attack_rate_both_hands"),
                        "add_damage_rate": d.get("add_damage_rate"),
                        "add_critical_rate": d.get("add_critical_rate"),
                        "valid_cap_parameter_value": d.get("valid_cap_parameter_value"),
                        "valid_cap_parameter_value_both_hands":
                            d.get("valid_cap_parameter_value_both_hands"),
                        "valid_start_parameter_value": d.get("valid_start_parameter_value"),
                        # which stat the attack rate is a percentage of (SkillReferenceParamType)
                        "reference_parameter": d.get("reference_parameter"),
                        "reference_parameter_2": d.get("reference_parameter_2"),
                        "damage_type": d.get("damage_type"),
                        # element attribute ids (1 fire .. 7 untyped, 99 physical, 999 none)
                        "aptitude_ids": d.get("aptitude_ids") or [],
                        "attack_type": d.get("attack_type"),
                        "fixed_damage": d.get("fixed_damage"),
                        "hit_rate": d.get("hit_rate"),
                        "damage_count": d.get("damage_count"),
                        "only_once": d.get("only_once"),
                        "target": d.get("skill_target_id"),
                        "target_text": text(tgt.get("convert_text"))[0],
                    })
                    # damage-scoped sub effects (防御贯穿 / 准备状态特效 ...)
                    for sid in d.get("sub_effect_ids") or []:
                        s_item = sub_entry(sid, "damage")
                        if s_item and s_item not in sub:
                            sub.append(s_item)
                    # 攻击开始时先挂上的效果（准备状态 / 攻击前触发）
                    for sid in d.get("attack_start_sub_effect_ids") or []:
                        s_item = sub_entry(sid, "attack_start")
                        if s_item and s_item not in sub:
                            sub.append(s_item)
                for sid in (grp.get("sub_effect_ids") or []) + (grp.get("turn_end_sub_effect_ids") or []):
                    s_item = sub_entry(sid, "effect_group")
                    if s_item and s_item not in sub:
                        sub.append(s_item)
            if dmg:
                item["damage"] = dmg
            if sub:
                item["sub_effects"] = sub
            lv_rows.append(item)

        entries.append(entry)
        levels_out[str(ident)] = lv_rows

    def param_labels(k):
        """参数名按位置写「参数N」；人工修正请在 Wiki 的 Data:EffectKind.json 里做。

        结构是**纯字符串数组**（``["参数1", "参数2"]``），不再是 ``[{"name": …}]``：
        末尾 ``%`` 表示百分数，末尾 ``@xx`` 表示该值是某个枚举的 id（见前端 REF_TAG）。
        """
        span = kind_param_span.get(k, 0)
        return [f"参数{i + 1}" for i in range(span)] or None

    # effect kind dictionary (only kinds that actually occur)
    kind_dict = {}
    for k, n in kind_count.most_common():
        row = kinds.get(k) or {}
        ja, _ = text(row.get("name"))
        kind_dict[str(k)] = {
            "id": k,
            "name_jp": ja,
            "name": ja,
            "category": row.get("category"),
            "primary_category": row.get("primary_category"),
            "count": n,
            # param_1..7 名; None = 该效果没有参数
            "params": param_labels(k),
            # 互斥 / 互相移除的效果种类（暂无可读枚举，前端先显示 id）
            "invalid_kinds": row.get("invalid_sub_effect_kinds") or None,
            "remove_kinds": row.get("remove_sub_effect_kinds") or None,
        }

    out_dir = os.path.join(CLEAN, "skill")
    write_json(os.path.join(out_dir, "skills.json"), entries)
    write_json(os.path.join(out_dir, "skill_levels.json"), levels_out)
    write_json(os.path.join(out_dir, "effect_kinds.json"), kind_dict)

    player = [e for e in entries if e["player"]]
    test = [e for e in entries if e["flags"]["test"]]
    lv0 = [e for e in entries if e["flags"]["level0"]]
    total_levels = sum(len(v) for v in levels_out.values())

    # coverage of the curated label dictionary, measured on player skills only
    top20 = {v["id"] for v in list(kind_dict.values())[:20]}
    p_sub = p_hit = 0
    for e in player:
        for lv in levels_out[str(e["identification"])]:
            for s in lv.get("sub_effects") or []:
                p_sub += 1
                p_hit += s.get("kind") in top20
    allc = sum(v["count"] for v in kind_dict.values()) or 1
    top20_all = sum(v["count"] for v in list(kind_dict.values())[:20])
    print(f"{len(entries)} skills ({total_levels} level rows): player={len(player)}, "
          f"test={len(test)}, level0={len(lv0)} -> {out_dir}")
    print(f"  effect kinds: {len(kind_dict)} used; top20 covers {top20_all / allc:.1%} of all "
          f"sub-effects, {p_hit / (p_sub or 1):.1%} of player sub-effects")
    print(f"  named kinds: {sum(1 for v in kind_dict.values() if v['name'])} / {len(kind_dict)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
