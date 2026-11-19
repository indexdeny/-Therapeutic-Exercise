"""Register finished lessons: status in chapters.md, the contents (UNITS) and the previous lesson's "next" link.

    python tools/therapeutic-exercise/register.py 2          # mark lesson 2 ready and rebuild the contents
    python tools/therapeutic-exercise/register.py            # only rebuild the contents from chapters.md

The contents list every lesson whose status is ready or user-approved, grouped by book chapter (unit). The
unit title comes from the "### Глава N. Title — …" heading in chapters.md. Lessons are numbered globally, so
a lesson only appears when all earlier lessons are in the contents too (the cover numbers them in order).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAP = ROOT / "authoring/therapeutic-exercise/chapters.md"
SITE = ROOT / "site/therapeutic-exercise"
ROW = re.compile(r"^\| (\d+) \| (.+?) \| Гл\. (\d+) \| (\d+) \| (\w[\w-]*) \|")
UNIT = re.compile(r"^### Глава (\d+)\. (.+?) — ")


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else None
    text = MAP.read_text(encoding="utf-8")
    if n:
        if not (SITE / f"ch{n:03d}" / "index.html").exists():
            sys.exit(f"ch{n:03d} is not built yet")
        text, k = re.subn(rf"^(\| {n} \| .+? \| Гл\. \d+ \| \d+ \| )planned( \|)", r"\1ready\2", text, flags=re.M)
        MAP.write_text(text, encoding="utf-8")
        print(f"lesson {n}: " + ("marked ready" if k else "status unchanged"))
    units, rows = {}, []
    for line in text.splitlines():
        if (u := UNIT.match(line)):
            units[int(u[1])] = u[2]
        elif (r := ROW.match(line)):
            rows.append((int(r[1]), r[2], int(r[3]), int(r[4]), r[5]))
    ready = []
    for num, title, unit, minutes, status in rows:      # contiguous from lesson 1
        if status not in ("ready", "user-approved") or num != len(ready) + 1:
            break
        ready.append((num, title, unit, minutes))
    out = []
    for num, title, unit, minutes in ready:
        if not out or out[-1][0] != unit:
            out.append((unit, []))
        out[-1][1].append([title, minutes])
    js = ",\n".join(f"  [{json.dumps(units[u], ensure_ascii=False)}, {json.dumps(ls, ensure_ascii=False)}]" for u, ls in out)
    idx = SITE / "index.html"
    s = idx.read_text(encoding="utf-8")
    s, k = re.subn(r"(const UNITS = \[[^\n]*\n)(.*?)(\n\];)", lambda m: m[1] + js + m[3], s, count=1, flags=re.S)
    if not k:
        sys.exit("UNITS block not found in index.html")
    idx.write_text(s, encoding="utf-8")
    print(f"contents: {len(ready)} lessons in {len(out)} units")
    # each listed lesson links to the next listed one
    for (a, *_), (b, *_) in zip(ready, ready[1:]):
        f = SITE / f"ch{a:03d}" / "index.html"
        c = f.read_text(encoding="utf-8")
        want = f"next: '../ch{b:03d}/'"
        if want in c:
            continue
        c2, k = re.subn(r"(const CHAPTER = \{[^}]*?)(, next: '[^']*')?( \};)", lambda m: m[1] + ", " + want + m[3], c, count=1)
        if k:
            f.write_text(c2, encoding="utf-8")
            print(f"ch{a:03d}: next → ch{b:03d}")


if __name__ == "__main__":
    main()
