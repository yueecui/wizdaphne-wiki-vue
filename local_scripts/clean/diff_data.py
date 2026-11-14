"""Diff two cleaning passes and report schema drift (game update guard).

Why
  The unpacker names master-data tables by matching a table's **column set** to the
  game's own IL2CPP classes. A version update that reshapes a table (字段增删 / 类型变化)
  silently changes the column names our cleaning scripts read, so re-running the clean
  chain straight over ``work/clean`` + ``data`` would overwrite the previous, known-good
  output. Instead: write the new pass into a temp dir (``WIZDAPHNE_CLEAN`` + ``--out``),
  then diff it here against the old one.

What is compared
  Every top-level ``*.json`` of a data dir is one *collection*:

    * ``list`` of objects        -> keyed by ``id``
    * ``{key: object}``          -> keyed by that key (effect_kinds / enums / map)

  For each collection, over the **ids present on both sides**:

    * 记录数 / 新增 id / 丢失 id
    * 字段消失 / 新增 / 塌陷（覆盖率）
    * 类型变化（int -> str、标量 -> 对象、可空化 …）
    * 值翻转（原来有数字的列现在恒为 0）
    * 引用失效（``*_id(s)`` / ``identification`` 指向的 id 在本轮数据里查不到）

Usage
    set WIZDAPHNE_CLEAN=D:\\tmp\\clean
    python local_scripts\\clean\\shop.py
    python local_scripts\\clean\\character.py
    ...（job / skill / equipment / item / relic / enemy / dialogue）
    python local_scripts\\clean\\build_data.py --out D:\\tmp\\data
    python local_scripts\\clean\\diff_data.py --old data --new D:\\tmp\\data

    python local_scripts\\clean\\diff_data.py --old local_scripts\\work\\clean --new D:\\tmp\\clean
    python local_scripts\\clean\\diff_data.py --old data --new D:\\tmp\\data --top 40 --json report.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

#: 至少影响这么多条记录才算一条有效信号
MIN_RECORDS = 3
#: 引用检查：只统计这些后缀的字段
REF_KEY = re.compile(r"(^id|_ids?|identification)$")
#: 值翻转：原本次非零 / 本次非零
NONZERO_HI = 0.8
NONZERO_LO = 0.2
#: 塌陷：旧覆盖率过半，新覆盖率不到它的这个比例
COLLAPSE_RATIO = 0.2


def read_json(path: str):
    with open(path, encoding="utf8") as fh:
        return json.load(fh)


def scalar_type(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, (int, float)):
        return "int" if float(value).is_integer() else "float"
    if isinstance(value, str):
        return "str"
    return type(value).__name__


def flatten_record(value, prefix: str, paths: dict, stats: dict) -> None:
    """一条记录 -> ``{路径: 类型}``；``stats[路径] = [非零值个数, 数值总个数]``。"""
    if isinstance(value, dict):
        if prefix:
            paths[prefix] = "obj"
        for key, item in value.items():
            flatten_record(item, f"{prefix}.{key}" if prefix else str(key), paths, stats)
        return
    if isinstance(value, list):
        if prefix:
            paths[prefix] = "arr"
        for item in value:
            flatten_record(item, prefix + "[]" if prefix else "[]", paths, stats)
        return
    if not prefix:
        return
    kind = scalar_type(value)
    paths[prefix] = kind
    if kind in ("int", "float"):
        bucket = stats.setdefault(prefix, [0, 0])
        bucket[0] += 1 if value else 0
        bucket[1] += 1


class Side:
    """One collection from one directory (aggregated over a set of ids)."""

    def __init__(self, name: str):
        self.name = name
        self.records: dict[str, object] = {}
        self.ids: set[str] = set()
        self.cov: Counter = Counter()
        self.types: dict[str, set] = defaultdict(set)
        self.stats: dict[str, list] = defaultdict(lambda: [0, 0])

    def add(self, key: str, record) -> None:
        self.records[key] = record
        self.ids.add(key)

    def aggregate(self, keys) -> None:
        self.cov.clear()
        self.types.clear()
        self.stats.clear()
        for key in keys:
            paths: dict[str, str] = {}
            stats: dict[str, list] = {}
            flatten_record(self.records[key], "", paths, stats)
            for path, kind in paths.items():
                self.cov[path] += 1
                self.types[path].add(kind)
            for path, (high, total) in stats.items():
                self.stats[path][0] += high
                self.stats[path][1] += total


def load_collection(directory: str, filename: str) -> Side | None:
    path = os.path.join(directory, filename)
    if not os.path.isfile(path):
        return None
    data = read_json(path)
    side = Side(filename)
    if isinstance(data, list):
        for index, row in enumerate(data):
            if isinstance(row, dict) and row.get("id") is not None:
                side.add(str(row["id"]), row)
            else:
                side.add(f"#{index}", row)
    elif isinstance(data, dict):
        for key, row in data.items():
            side.add(str(key), row)
    else:
        return None
    return side


def is_ref_key(key: str, depth: int) -> bool:
    # 记录自己的 ``id`` 不算引用；嵌套对象 / 数组里的 ``id`` 是引用（如装备的 skills[].id）
    if key == "id":
        return depth > 0
    return bool(REF_KEY.search(key))


def walk_refs(value, out: list, depth: int = 0) -> None:
    """收集 ``*_id(s)`` / ``identification`` 的整数值（含嵌套）。"""
    if isinstance(value, dict):
        for key, item in value.items():
            if is_ref_key(str(key), depth):
                collect_ids(item, out)
            else:
                walk_refs(item, out, depth + 1)
    elif isinstance(value, list):
        for item in value:
            walk_refs(item, out, depth)


def collect_ids(value, out: list) -> None:
    if isinstance(value, bool):
        return
    if isinstance(value, int):
        out.append(value)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, int) and not isinstance(item, bool):
                out.append(item)
    elif isinstance(value, dict):
        ref = value.get("id")
        if isinstance(ref, int) and not isinstance(ref, bool):
            out.append(ref)


def fmt_ratio(hit: int, total: int) -> str:
    return f"{hit / total * 100:5.1f}%" if total else "  n/a"


def compare(old: Side, new: Side, top: int, known_old: set, known_new: set) -> list[str]:
    common = sorted(old.ids & new.ids)
    added = sorted(new.ids - old.ids)
    removed = sorted(old.ids - new.ids)
    total = len(common) or 1

    head = f"== {old.name[:-5]}  旧 {len(old.ids)} / 新 {len(new.ids)}  共有 {len(common)}"
    if added:
        head += f"  +{len(added)}"
    if removed:
        head += f"  -{len(removed)}"
    lines = [head]

    old.aggregate(common)
    new.aggregate(common)

    drops, adds, collapses, types, flips = [], [], [], [], []
    for path in sorted(set(old.cov) | set(new.cov)):
        old_n, new_n = old.cov[path], new.cov[path]
        old_r, new_r = old_n / total, new_n / total
        old_k, new_k = old.types.get(path, set()), new.types.get(path, set())

        if old_n >= MIN_RECORDS and new_n == 0:
            drops.append(f"  [字段消失] {path}  {old_n}/{total} -> 0  类型 {','.join(sorted(old_k))}")
        elif new_n >= MIN_RECORDS and old_n == 0:
            adds.append(f"  [字段新增] {path}  0 -> {new_n}/{total}  类型 {','.join(sorted(new_k))}")
        elif old_n and new_n:
            if old_r >= 0.5 and new_r < old_r * COLLAPSE_RATIO:
                collapses.append(f"  [字段塌陷] {path}  {fmt_ratio(old_n, total)} ->"
                                 f" {fmt_ratio(new_n, total)}"
                                 f"  类型 {','.join(sorted(old_k))} -> {','.join(sorted(new_k))}")
            elif old_k != new_k and (old_k | new_k) - {"null"}:
                types.append(f"  [类型变化] {path}  {','.join(sorted(old_k))} ->"
                             f" {','.join(sorted(new_k))}  ({old_n}/{total} -> {new_n}/{total})")
            if path in old.stats and path in new.stats:
                o_hi, o_n = old.stats[path]
                n_hi, n_n = new.stats[path]
                if o_n >= MIN_RECORDS and n_n >= MIN_RECORDS:
                    o_ratio, n_ratio = o_hi / o_n, n_hi / n_n
                    if o_ratio >= NONZERO_HI and n_ratio <= NONZERO_LO:
                        flips.append(f"  [值翻转]   {path}  非零 {o_ratio * 100:.0f}% ->"
                                     f" {n_ratio * 100:.0f}%  ({o_n} -> {n_n} 个值)")

    lines += drops + collapses + types + flips
    lines += adds[:top]
    if len(adds) > top:
        lines.append(f"  [字段新增] ... 另有 {len(adds) - top} 条（--top 可调）")

    if added[:5]:
        lines.append(f"  新增 id 例：{', '.join(added[:5])}")
    if removed[:5]:
        lines.append(f"  丢失 id 例：{', '.join(removed[:5])}")

    # ---- 引用完整性：引用到的 id 能否在本轮数据里查到 ------------------------
    notes = []
    for label, side, known in (("旧", old, known_old), ("新", new, known_new)):
        refs: list[int] = []
        for key in common:
            walk_refs(side.records[key], refs)
        if refs:
            hit = sum(1 for v in refs if v in known)
            notes.append(f"{label} {hit}/{len(refs)} = {fmt_ratio(hit, len(refs))}")
    if len(notes) == 2:
        lines.append("  引用可解析率  " + " / ".join(notes))

    return lines


def known_ids(directory: str) -> set[int]:
    """这一轮数据里出现过的全部记录 id（引用检查用）。"""
    out: set[int] = set()
    for name in os.listdir(directory):
        if not name.endswith(".json"):
            continue
        path = os.path.join(directory, name)
        if not os.path.isfile(path):
            continue
        try:
            data = read_json(path)
        except (ValueError, UnicodeDecodeError):
            continue
        rows = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for row in rows:
            if isinstance(row, dict):
                rid = row.get("id")
                if isinstance(rid, int) and not isinstance(rid, bool):
                    out.add(rid)
            elif isinstance(row, int) and not isinstance(row, bool):
                out.add(row)
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--old", required=True, help="上一轮的 data 或 work/clean 目录")
    ap.add_argument("--new", required=True, help="这一轮的临时目录")
    ap.add_argument("--top", type=int, default=12, help="字段新增最多打印多少条（默认 12）")
    ap.add_argument("--json", default=None, help="把报告另存为 json")
    args = ap.parse_args(argv)

    if not os.path.isdir(args.old) or not os.path.isdir(args.new):
        print(f"目录不存在：{args.old} / {args.new}")
        return 2

    old_files = {n for n in os.listdir(args.old)
                 if n.endswith(".json") and os.path.isfile(os.path.join(args.old, n))}
    new_files = {n for n in os.listdir(args.new)
                 if n.endswith(".json") and os.path.isfile(os.path.join(args.new, n))}
    shared = sorted(old_files & new_files - {"meta.json"})
    only_new = sorted(new_files - old_files)
    only_old = sorted(old_files - new_files)

    known_old = known_ids(args.old)
    known_new = known_ids(args.new)

    report: dict[str, list[str]] = {}
    print(f"旧：{args.old}\n新：{args.new}")
    for name in shared:
        old = load_collection(args.old, name)
        new = load_collection(args.new, name)
        if old is None or new is None:
            continue
        lines = compare(old, new, args.top, known_old, known_new)
        report[name] = lines
        print()
        print("\n".join(lines))

    if only_old:
        print("\n仅旧目录有：" + ", ".join(only_old))
    if only_new:
        print("仅新目录有：" + ", ".join(only_new))

    if args.json:
        with open(args.json, "w", encoding="utf8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=1)
        print(f"\n报告已写入 {args.json}")

    signals = sum(1 for lines in report.values() for line in lines
                  if line.lstrip().startswith("[字段消失]") or line.lstrip().startswith("[字段塌陷]")
                  or line.lstrip().startswith("[类型变化]") or line.lstrip().startswith("[值翻转]"))
    print(f"\n共比对 {len(report)} 个数据集，可疑信号 {signals} 条")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
