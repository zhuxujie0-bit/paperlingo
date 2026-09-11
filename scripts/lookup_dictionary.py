#!/usr/bin/env python3
import json
import re
import sqlite3
import sys
from pathlib import Path

word = sys.argv[1].strip().lower() if len(sys.argv) == 2 else ''
if not re.fullmatch(r"[a-z]+(?:[-'][a-z]+)*", word):
    print(json.dumps({"entry": None}))
    raise SystemExit(0)

db = Path(__file__).resolve().parent.parent / 'data' / 'ecdict.sqlite'
if not db.exists():
    print(json.dumps({"error": "offline-dictionary-unavailable"}))
    raise SystemExit(0)

with sqlite3.connect(f'file:{db}?mode=ro', uri=True) as connection:
    row = connection.execute(
        'SELECT word, phonetic, pos, translation, definition FROM dictionary WHERE word = ?',
        (word,),
    ).fetchone()

if row is None:
    print(json.dumps({"entry": None}, ensure_ascii=False))
else:
    print(json.dumps({"entry": {"lemma": row[0], "phonetic": row[1], "partOfSpeech": row[2], "translation": row[3], "english": row[4]}}, ensure_ascii=False))
