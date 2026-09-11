#!/usr/bin/env python3
"""把 ECDICT sqlite 切成"双字母分块" JSON，供浏览器按需 fetch。

设计：
- 每个分块文件名 = 词条前两个字母（如 im.json / fr.json），单词只有一个字母时用 "a_" 形式。
- 文件内容 = { word: [phonetic, pos, translation, english] }，值为数组省空间。
- 浏览器查一个词只需下载对应分块（几十~几百 KB），再用 IndexedDB 缓存。
"""
from __future__ import annotations
import json
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "ecdict.sqlite"
OUT = ROOT / "public" / "dict"

MAX_FIELD = 600  # 单个字段最多保留的字符数，防止个别超长释义把分块撑爆


def chunk_key(word: str) -> str | None:
    letters = "".join(ch for ch in word if "a" <= ch <= "z")
    if not letters:
        return None
    return letters[0] + (letters[1] if len(letters) > 1 else "_")


def trim(value, limit=MAX_FIELD):
    if not value:
        return ""
    value = str(value).strip()
    return value[:limit]


def main():
    if not DB.exists():
        sys.exit("data/ecdict.sqlite 不存在")
    OUT.mkdir(parents=True, exist_ok=True)
    # 清掉旧分块，避免残留过期数据
    for old in OUT.glob("*.json"):
        old.unlink()

    chunks: dict[str, dict] = defaultdict(dict)
    total = 0
    with sqlite3.connect(f"file:{DB}?mode=ro", uri=True) as connection:
        cursor = connection.execute(
            "SELECT word, phonetic, pos, translation, definition FROM dictionary"
        )
        for word, phonetic, pos, translation, definition in cursor:
            if not word or not re.fullmatch(r"[a-z]+(?:[-' ][a-z]+)*", word.lower()):
                continue
            key = chunk_key(word.lower())
            if key is None:
                continue
            chunks[key][word.lower()] = [
                trim(phonetic, 120),
                trim(pos, 60),
                trim(translation),
                trim(definition),
            ]
            total += 1

    total_bytes = 0
    sizes = []
    for key, entries in chunks.items():
        path = OUT / f"{key}.json"
        payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
        path.write_text(payload, encoding="utf-8")
        size = path.stat().st_size
        total_bytes += size
        sizes.append((size, key, len(entries)))

    sizes.sort(reverse=True)
    print(f"词条总数: {total}")
    print(f"分块数: {len(chunks)}")
    print(f"总大小: {total_bytes / 1024 / 1024:.1f} MB")
    print("最大的 8 个分块:")
    for size, key, count in sizes[:8]:
        print(f"  {key}.json  {size / 1024:.0f} KB  ({count} 词)")


if __name__ == "__main__":
    main()
