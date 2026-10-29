"""Clean the camp / tavern topics (``out/topic_digest``) down to what the wiki shows.

Input : ``out/topic_digest/<EnglishName>.json`` - one file per character, already digested
        from the game text assets (camp questions + tavern topics).
Output: ``local_scripts/work/clean/dialogue/dialogues.json`` - one entry per **English
        name**, so every style variant of a character shares the same dialogue:

        {"character": "Lanavaille",
         "camp":   [{"question": "...", "answer": "..."}],
         "tavern": [{"topic": "全员生存", "order": 2}]}

Only the key bits are kept:

* camp   -> question + the answer the game recorded;
* tavern -> the topic and the answer order (1..3). The answer *text* is a fixed table of
  three generic player replies per topic, so the frontend generates it (see
  ``CharacterDetail.vue`` + ``TAVERN_REPLIES``).

    python dialogue.py
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CLEAN, TOPIC_DIGEST, write_json  # noqa: E402


def clean_camp(entries: list) -> list:
    """``question``/``answer`` only, de-duplicated, ordered by topic."""
    out, seen = [], set()
    for index, row in enumerate(entries or []):
        question = (row.get("question") or "").strip()
        answer = (row.get("answer") or "").strip()
        if not question or not answer:
            continue
        key = (question, answer)
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "question": question,
            "answer": answer,
            "_order": (int(row.get("topic_id") or 0), index),
        })
    out.sort(key=lambda item: item["_order"])
    for item in out:
        item.pop("_order")
    return out


def clean_tavern(entries: dict) -> list:
    """Topic + answer order (1..3); the reply text comes from the frontend table."""
    out = []
    for topic_id, row in (entries or {}).items():
        row = row or {}
        alt = row.get("alt_variant") or {}
        order = row.get("answer_index")
        if order is None:
            order = alt.get("answer_index")
        topic = row.get("topic") or ""
        if not topic or order is None:
            continue
        out.append({
            "topic": topic,
            "order": int(order) + 1,
            "_order": int(topic_id) if str(topic_id).isdigit() else 0,
        })
    out.sort(key=lambda item: item["_order"])
    for item in out:
        item.pop("_order")
    return out


#: 摘要文件用的是文本资产里的英文写法，和 ``Character.name.en`` 有几处对不上
ALIASES = {
    "Akahige": "Red Beard",   # 赤ひげ -> 红胡子
    "Bakes": "Bakesh",        # バケシュ -> 巴克什
    "Linne": "Rinne",         # リンネ -> 凛音
    "Savea": "Savia",         # サヴィア -> 萨维亚
    "Alboris": "Arboris",     # アルボリス -> 阿尔博里斯（同一角色两种拼法，两边的数据合并）
}

#: 酒馆议题的展示顺序（``CharacterDetail.vue`` 的答案表也按这个顺序排）
TAVERN_TOPIC_ORDER = ("全员生存", "战斗不能", "大异形讨伐", "奇袭对策", "陷阱对策")


def main() -> int:
    if not os.path.isdir(TOPIC_DIGEST):
        print(f"找不到对话目录：{TOPIC_DIGEST}")
        return 1

    merged: dict[str, dict] = {}
    for name in sorted(os.listdir(TOPIC_DIGEST)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(TOPIC_DIGEST, name), encoding="utf8") as fh:
            data = json.load(fh)
        character = data.get("character") or os.path.splitext(name)[0]
        character = ALIASES.get(character, character)

        entry = merged.setdefault(character, {"character": character, "camp": [], "tavern": []})
        seen = {(row["question"], row["answer"]) for row in entry["camp"]}
        for row in clean_camp(data.get("camp") or []):
            key = (row["question"], row["answer"])
            if key not in seen:
                seen.add(key)
                entry["camp"].append(row)

        known = {row["topic"] for row in entry["tavern"]}
        for row in clean_tavern(data.get("tavern") or {}):
            if row["topic"] not in known:
                known.add(row["topic"])
                entry["tavern"].append(row)

    results = []
    for character in sorted(merged):
        entry = merged[character]
        order = TAVERN_TOPIC_ORDER
        entry["tavern"].sort(key=lambda row: order.index(row["topic"])
                             if row["topic"] in order else len(order))
        if entry["camp"] or entry["tavern"]:
            results.append(entry)

    path = os.path.join(CLEAN, "dialogue", "dialogues.json")
    write_json(path, results)

    camp_total = sum(len(row["camp"]) for row in results)
    tavern_total = sum(len(row["tavern"]) for row in results)
    print(f"{len(results)} characters, {camp_total} camp Q/A, {tavern_total} tavern topics "
          f"-> {path}")
    for row in results[:3]:
        print(f"    {row['character']:<12} camp={len(row['camp'])} tavern={len(row['tavern'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
