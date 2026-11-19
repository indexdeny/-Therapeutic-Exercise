"""Syntax-check the inline script of lessons with node, and catch names that clash with the shared libraries.

    python tools/therapeutic-exercise/check_syntax.py 20 21 22

A top-level `const`/`let` with a name already declared in engine.js or te.js stops the whole lesson
("already declared"); a top-level `function` silently replaces the shared one. Both are reported.
Also reported: a call to a helper that other lessons define locally (infoCard, bubble, ...) but this one does not —
it fails only when that beat runs.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site" / "therapeutic-exercise"
DECL = re.compile(r"^(?:const|let|function)\s+([A-Za-z_$][\w$]*)", re.M)


def names(src):
    out = set(DECL.findall(src))
    for m in re.finditer(r"^const\s+(.+)$", src, re.M):   # const A = 1, B = 2;  (not arrow functions or calls)
        line = re.sub(r"\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}|'[^']*'|`[^`]*`", "", m.group(1))
        if "=>" not in line:
            out.update(re.findall(r"(?:^|,\s*)([A-Za-z_$][\w$]*)\s*=(?!=)", line))
    return out


def script(page):
    return re.search(r"<script>\n(.*?)</script>", page.read_text(encoding="utf-8"), re.S).group(1)


def main(nums):
    shared = names((SITE / "lib" / "engine.js").read_text(encoding="utf-8")) | names((SITE / "lib" / "te.js").read_text(encoding="utf-8"))
    local = set().union(*(names(script(p)) for p in SITE.glob("ch[0-9][0-9][0-9]/index.html"))) - shared
    bad = 0
    for n in nums:
        js = script(SITE / f"ch{int(n):03d}" / "index.html")
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
            f.write(js)
        r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
        clash = sorted(names(js) & shared - {"CHAPTER", "BEATS"})
        declared = names(js) | set(re.findall(r"\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)", js)) | set(re.findall(r",\s*([A-Za-z_$][\w$]*)\s*=(?![=>])", js))
        params = re.findall(r"function\s*[\w$]*\s*\(([^)]*)\)", js) + re.findall(r"\(([^()]*)\)\s*=>", js) + re.findall(r"([A-Za-z_$][\w$]*)\s*=>", js)
        declared |= {w for ps in params for w in re.findall(r"(?:^|,)\s*\.{0,3}([A-Za-z_$][\w$]*)", ps)}   # parameters, e.g. target in (f, target) =>
        code = re.sub(r"//[^\n]*", "", js)   # "planted at (x, y)" in a comment is not a call
        missing = sorted(set(re.findall(r"(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(", code)) & local - declared)
        ok = r.returncode == 0 and not clash and not missing
        bad += not ok
        print(f"ch{int(n):03d}: {'ok' if ok else 'FAIL'}" + (f"  syntax: {r.stderr.strip().splitlines()[-1]}" if r.returncode else "")
              + (f"  clashes: {', '.join(clash)}" if clash else "") + (f"  missing: {', '.join(missing)}" if missing else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
