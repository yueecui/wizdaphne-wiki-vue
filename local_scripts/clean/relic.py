"""遗物（RelicItem）清洗。

Input : ``out/masterdata``
        ``RelicItem``       一件遗物 = 一组（group_id），同组不同阶级（grade / rank）
        ``RelicAlcohol``    遗物酒名（``relic_item_id`` 对回遗物）
        ``RelicSkill``      遗物之力（``relic_skill_identification_1/2`` → ``Skill.identification``）
        ``Skill``           技能名与子效果（提升 / 降低属性从子效果种类名解析）
        ``SkillEffectGroup`` / ``SkillSubEffect`` / ``SkillSubEffectKind``
        ``Reward``          遗物名与图标

Output: ``work/clean/relic/relics.json``

每条遗物只取同组里阶级最低的一条作为代表；掉落怪物与推荐类别留空，
后续由手工数据补。

    python relic.py
"""

from __future__ import annotations

import argparse
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, load, names, write_json  # noqa: E402

#: ``RelicItem.alignment``
ALIGNMENT = {1: "善", 2: "中立", 3: "恶"}

#: 子效果种类名 → 属性名；先匹配长的，避免「魔術防御」被「防御」吃掉
STAT_NAMES = [
    ("魔術防御", "法术防御力"),
    ("攻撃", "攻击力"),
    ("魔力", "魔力"),
    ("神力", "神力"),
    ("防御", "防御力"),
    ("抵抗", "抵抗"),
    ("行動速度", "行动速度"),
    ("会心率", "会心"),
    ("命中", "命中"),
    ("回避", "回避"),
    ("探知", "探知"),
    ("罠解除", "陷阱解除"),
    ("罠回避", "陷阱回避"),
    ("HP", "HP"),
    ("MP", "MP"),
    ("SP", "SP"),
]

#: 上面的表按「先匹配长的」查，否则「罠回避」会被「回避」吃掉
_STAT_LONGEST_FIRST = sorted(STAT_NAMES, key=lambda kv: -len(kv[0]))

#: 「パッシブ火属性ダメージ軽減」这类按属性的减伤 → 对应耐性（属性名写在种类名里）
ELEMENT_RESIST = [
    ("火", "火耐性"),
    ("水", "水耐性"),
    ("風", "风耐性"),
    ("地", "土耐性"),
    ("光", "光耐性"),
    ("闇", "暗耐性"),
]

#: ``属性被ダメージ増加``（kind 2500）的 ``param_1`` 是属性 ID（7 = 无属性）
ELEMENT_BY_ID = {
    1: "火耐性",
    2: "水耐性",
    3: "风耐性",
    4: "土耐性",
    5: "光耐性",
    6: "暗耐性",
    7: "无属性耐性",
}


def stat_of(kind_name: str, value: int) -> tuple[str, bool] | None:
    """效果种类名 + ``param_1`` → (属性名, 是否提升)；识别不了返回 ``None``。

    提升 / 降低是同一个 sub effect，方向由数值正负决定（种类名里的
    「アップ」只是模板名，实际 ``param_1`` 可能是负数）。
    """
    if not kind_name:
        return None
    if "軽減" in kind_name:
        # ``パッシブ火属性ダメージ軽減`` 的 ``param_1`` 一律是负的减伤幅度，方向恒为提升
        for jp, cn in ELEMENT_RESIST:
            if f"{jp}属性" in kind_name:
                return cn, True
        return None
    if "被ダメージ増加" in kind_name:
        # 受到该属性的伤害增加 = 该属性耐性下降；param_1 是属性 ID
        return ELEMENT_BY_ID.get(value, "全属性耐性"), False
    if "クリティカル耐性" in kind_name:
        return "暴击耐性", value >= 0
    for jp, cn in _STAT_LONGEST_FIRST:
        if jp in kind_name:
            return cn, value >= 0
    return None


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.parse_args(argv)

    rows = load("RelicItem")
    reward = {r["id"]: r for r in load("Reward")}
    alcohol = {r.get("relic_item_id"): r for r in load("RelicAlcohol")}
    relic_skills = {r["id"]: r for r in load("RelicSkill")}
    effect_groups = {r["id"]: r for r in load("SkillEffectGroup")}
    sub_effects = {r["id"]: r for r in load("SkillSubEffect")}
    kinds = {r["id"]: r for r in load("SkillSubEffectKind")}

    skills_by_ident: dict[int, list] = collections.defaultdict(list)
    for row in load("Skill"):
        ident = row.get("identification")
        if ident:
            skills_by_ident[ident].append(row)

    def base_skill(ident: int | None) -> dict:
        level_rows = skills_by_ident.get(ident) or []
        if not level_rows:
            return {}
        return min(level_rows, key=lambda r: r.get("level") or 0)

    def effects(ident: int | None) -> tuple[list[str], list[str]]:
        inc: list[str] = []
        dec: list[str] = []
        skill = base_skill(ident)
        for gid in skill.get("skill_effect_group_ids") or []:
            for sid in (effect_groups.get(gid) or {}).get("sub_effect_ids") or []:
                sub = sub_effects.get(sid) or {}
                kind_name = (kinds.get(sub.get("kind")) or {}).get("name") or ""
                hit = stat_of(kind_name, sub.get("param_1") or 0)
                if not hit:
                    continue
                stat, up = hit
                bucket = inc if up else dec
                if stat not in bucket:
                    bucket.append(stat)
        return inc, dec

    relics = []
    seen: set[int] = set()
    for row in sorted(rows, key=lambda r: (r.get("group_id") or 0, r.get("grade") or 0)):
        group = row.get("group_id") or row.get("id")
        if group in seen:
            continue
        seen.add(group)

        item = reward.get(row.get("item_id")) or {}
        relic_skill = relic_skills.get(row.get("relic_skill_id")) or {}
        inc: list[str] = []
        dec: list[str] = []
        for key in ("relic_skill_identification_1", "relic_skill_identification_2"):
            got_inc, got_dec = effects(relic_skill.get(key))
            inc += [s for s in got_inc if s not in inc]
            dec += [s for s in got_dec if s not in dec]

        entry = {
            "id": row.get("item_id") or row.get("id"),
            "name": names(item).get("name"),
            "brew": names(alcohol.get(row.get("item_id")) or {}).get("name"),
            "power": names(base_skill(relic_skill.get("relic_skill_identification_1"))).get("name"),
            # 遗物之力对应的技能 identification（点击遗物打开技能弹窗用）
            "skill_id": relic_skill.get("relic_skill_identification_1"),
            "align": ALIGNMENT.get(row.get("alignment")),
            "grade": row.get("grade"),
            "icon": item.get("icon_resource"),
            "inc": inc,
            "dec": dec,
            # 掉落怪物 / 推荐类别：后续用手工数据补，清洗阶段留空
            "monsters": [],
            "categories": [],
        }
        relics.append({k: v for k, v in entry.items() if v not in (None, [], "")})

    write_json(os.path.join(CLEAN, "relic", "relics.json"), relics)
    no_brew = sum(1 for r in relics if "brew" not in r)
    no_power = sum(1 for r in relics if "power" not in r)
    print(f"  relics {len(relics)}（无遗物酒 {no_brew}，无遗物之力 {no_power}）-> work/clean/relic")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
