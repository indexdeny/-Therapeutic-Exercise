"""The exercise atlas: find exercise marks in lessons, build the page data and pictures, check the data.

    python tools/therapeutic-exercise/atlas.py scan 201-215   # steps and marks of the lessons with their first words, and the
                                                              # info-card titles; ✓ = the mark is already a moment of the atlas
    python tools/therapeutic-exercise/atlas.py build          # content/…/atlas/*.ru.json -> site/…/atlas/data.js and img/<id>.webp
    python tools/therapeutic-exercise/atlas.py check          # errors and warnings of the data, pictures and data.js; exit 1 on errors

build takes the pictures in Chromium (tools/.venv) on its own server (port 8789, or ATLAS_PORT); a picture is taken again only
when its lesson, moment, second or crop has changed (hashes in site/…/atlas/img/shots.json).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from contextlib import contextmanager
from functools import cache
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site" / "therapeutic-exercise"
CONTENT = ROOT / "content" / "therapeutic-exercise"
DATA = CONTENT / "atlas"
OUT = SITE / "atlas"
PORT = os.environ.get("ATLAS_PORT", "8789")
URL = f"http://localhost:{PORT}/therapeutic-exercise/"
FIELDS = ("joint", "goal", "phase", "pos", "gear")
NEED = ("id", "ru", "en", "joint", "goal", "pos", "gear", "key", "page", "moments")
SHOT, CROP, WIDTH = 3, [0, 60, 800, 800], 480
KEY_MAX, KEY_LEN = 3, 40
PDF_SHIFT = 34                  # printed page = PDF page − 34 in the whole book
PAGE_SLACK = 1                  # chapters.md lesson ranges are off by a page where a section ends on the next lesson's first page
STR = r"'((?:[^'\\]|\\.)*)'"
BEAT = re.compile(r"^  \['([\w-]+)', " + STR, re.M)
TITLE = re.compile(r"const CHAPTER = \{ number: (\d+), title: " + STR)
CARD = re.compile(r"infoCard\([^')]*?" + STR)
ROW = re.compile(r"^\| (\d+) \| [^|]+ \| Гл\. \d+ \| \d+ \| [\w-]+ \| (\d+)(?:–(\d+))? \|", re.M)
ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LATIN = re.compile(r"[A-Za-z]")
HEAD = "// The exercise atlas; made by tools/therapeutic-exercise/atlas.py build from content/therapeutic-exercise/atlas/*.ru.json\n"


def js_str(s):
    return s.replace("\\'", "'").replace("\\\\", "\\")


def read_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def vocab():
    return read_json(DATA / "vocab.ru.json")


def regions():
    return {p.name.split(".")[0]: read_json(p) for p in sorted(DATA.glob("*.ru.json")) if p.name != "vocab.ru.json"}


@cache
def pages():
    """PDF pages of each lesson from books/therapeutic-exercise/chapters.md: {n: (first, last)}."""
    text = (ROOT / "authoring" / "therapeutic-exercise" / "chapters.md").read_text(encoding="utf-8")
    return {int(m[1]): (int(m[2]), int(m[3] or m[2])) for m in ROW.finditer(text)}


@cache
def lesson(n):
    """Title, PDF pages, info-card titles and steps (index in BEATS, title, length, marks) of a lesson; None if there is none."""
    d = SITE / f"ch{n:03d}"
    if not (d / "index.html").exists():
        return None
    html = (d / "index.html").read_text(encoding="utf-8")
    t = (d / "audio" / "ru" / "timings.js").read_text(encoding="utf-8")
    tm = json.loads(t[t.index("{"):t.rindex("}") + 1])
    beats = BEAT.findall(html[html.find("const BEATS = ["):])
    return {"n": n, "title": js_str(TITLE.search(html)[2]), "pages": pages().get(n),
            "cards": [js_str(c) for c in CARD.findall(html)],
            "beats": {b: {"i": i, "title": js_str(title), "dur": tm[b]["dur"], "marks": tm[b].get("marks", {})}
                      for i, (b, title) in enumerate(beats) if b in tm},
            "hash": hashlib.sha1((html + t).encode("utf-8")).hexdigest()[:12]}


def segment(mo, L):
    """Start and end second of a moment: from its mark to the mark after `to` (or after the mark itself), else the end of the step."""
    b = L["beats"][mo["beat"]]
    marks = sorted(b["marks"].items(), key=lambda kv: kv[1])
    j = [k for k, _ in marks].index(mo.get("to", mo["mark"]))
    t1 = marks[j + 1][1] if j + 1 < len(marks) else b["dur"]
    return round(b["marks"][mo["mark"]], 3), round(t1, 3)


@cache
def sand():
    return {p.name.split(".")[0]: read_json(p) for p in sorted((CONTENT / "sandbox").glob("*.ru.json"))}


def sand_problem(qs):
    """What is wrong with a sandbox address (j, m, pos, mode), or None."""
    q = {k: v[0] for k, v in parse_qs(qs).items()}
    J = sand().get(q.get("j"))
    if not J:
        return f"no sandbox joint {q.get('j')}"
    M = next((m for m in J["motions"] if m["id"] == q.get("m", J["motions"][0]["id"])), None)
    if not M:
        return f"no motion {q.get('m')} in the {q['j']} sandbox"
    if "pos" in q and q["pos"] not in M["positions"]:
        return f"no position {q['pos']} for {q['j']}/{M['id']}"
    if q.get("mode", "passive") not in ("passive", "active"):
        return f"bad mode {q['mode']}"
    return None


def problems(voc, regs):
    """Errors and warnings of the atlas data (the pictures and data.js are checked by check())."""
    err, warn, seen = [], [], {}
    keys = {f: [k[0] for k in voc[f]] for f in FIELDS}
    for name, R in regs.items():
        for e in R.get("exercises", []):
            at = f"{name}/{e.get('id', '?')}"
            miss = [f for f in NEED if f not in e]
            if miss:
                err.append(f"{at}: missing {', '.join(miss)}")
                continue
            if not ID.match(e["id"]):
                err.append(f"{at}: bad id")
            if e["id"] in seen:
                err.append(f"{at}: id also in {seen[e['id']]}")
            seen[e["id"]] = name
            for f in FIELDS:
                v = e.get(f, [])
                if f != "phase" and not v:
                    err.append(f"{at}: empty {f}")
                err += [f"{at}: {f} {k} is not in the vocabulary" for k in v if k not in keys[f]]
            if not 1 <= len(e["key"]) <= KEY_MAX:
                err.append(f"{at}: key needs 1–{KEY_MAX} phrases")
            err += [f"{at}: key phrase longer than {KEY_LEN}: {k}" for k in e["key"] if len(k) > KEY_LEN]
            for s in [e["ru"], e.get("warn", ""), e.get("note", "")] + e["key"]:
                if LATIN.search(re.sub(r"\[[^\]]*\]", "", s)):
                    err.append(f"{at}: Latin letters outside brackets: {s}")
            if not e["moments"]:
                err.append(f"{at}: no moments")
            spans = []
            for k, mo in enumerate(e["moments"]):
                w = f"{at} moment {k}"
                L = lesson(mo.get("n", 0))
                if not L:
                    err.append(f"{w}: no lesson {mo.get('n')}")
                    continue
                b = L["beats"].get(mo.get("beat"))
                if not b:
                    err.append(f"{w}: lesson {L['n']} has no step {mo.get('beat')}")
                    continue
                if mo.get("mark") not in b["marks"]:
                    err.append(f"{w}: step {mo['beat']} has no mark {mo.get('mark')}")
                    continue
                if "to" in mo and (mo["to"] not in b["marks"] or b["marks"][mo["to"]] < b["marks"][mo["mark"]]):
                    err.append(f"{w}: bad to {mo['to']}")
                    continue
                t0, t1 = segment(mo, L)
                if t1 <= t0:
                    err.append(f"{w}: empty moment {t0}–{t1}")
                if t0 + mo.get("shot", SHOT) > t1:
                    warn.append(f"{w}: the picture second is after the moment")
                c = mo.get("crop", CROP)
                if len(c) != 4 or min(c) < 0 or c[2] <= 0 or c[3] <= 0 or c[0] + c[2] > 1600 or c[1] + c[3] > 900:
                    err.append(f"{w}: crop outside the stage")
                spans.append(L["pages"])
            if not 0 <= e.get("thumb", 0) < max(1, len(e["moments"])):
                err.append(f"{at}: thumb out of range")
            if not (isinstance(e["page"], int) and e["page"] > 0):
                err.append(f"{at}: bad page")
            elif spans and not any(p and p[0] - PAGE_SLACK <= e["page"] + PDF_SHIFT <= p[1] + PAGE_SLACK for p in spans):
                warn.append(f"{at}: page {e['page']} is outside the pages of its lessons")
            if "sand" in e and (p := sand_problem(e["sand"])):
                err.append(f"{at}: {p}")
    return err, warn


def payload(voc, regs):
    """The page data: the vocabulary and the exercises with resolved moments, in the atlas order."""
    joints, phases = [k[0] for k in voc["joint"]], [k[0] for k in voc["phase"]]
    ex = []
    for R in regs.values():
        for e in R["exercises"]:
            mos = []
            for mo in e["moments"]:
                L = lesson(mo["n"])
                b = L["beats"][mo["beat"]]
                t0, t1 = segment(mo, L)
                mos.append({"n": mo["n"], "beat": mo["beat"], "i": b["i"], "t0": t0, "t1": t1, "lesson": L["title"], "step": b["title"]})
            item = {k: v for k, v in e.items() if k not in ("moments", "thumb")}
            item.update(phase=e.get("phase", []), moments=mos, img=f"img/{e['id']}.webp")
            ex.append(item)
    ex.sort(key=lambda e: (joints.index(e["joint"][0]), min((phases.index(p) for p in e["phase"]), default=99),
                           e["moments"][0]["n"], e["moments"][0]["t0"]))
    return {"vocab": voc, "ex": ex}


@contextmanager
def server(port=None):
    """The site on port (PORT by default) for the time of the block, unless something already serves it."""
    port = port or PORT
    url = f"http://localhost:{port}/therapeutic-exercise/"
    srv = None
    try:
        urllib.request.urlopen(url, timeout=1)
    except Exception:
        srv = subprocess.Popen([sys.executable, "tools/serve.py", port], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                urllib.request.urlopen(url, timeout=1)
                break
            except Exception:
                time.sleep(.2)
    try:
        yield
    finally:
        if srv:
            srv.kill()
            srv.wait(timeout=10)     # free the port before the next block looks for a server on it


def shot_key(mo):
    return hashlib.sha1(json.dumps([lesson(mo["n"])["hash"], mo["beat"], mo["mark"], mo.get("shot", SHOT), mo.get("crop", CROP), WIDTH])
                        .encode("utf-8")).hexdigest()[:12]


def take(todo):
    """Pictures for [(id, moment)]: the lesson at the moment's mark + shot seconds, the crop of the stage, WIDTH px wide."""
    from io import BytesIO
    from PIL import Image
    from playwright.sync_api import sync_playwright
    with server(), sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 960})
        for id_, mo in todo:
            bt = lesson(mo["n"])["beats"][mo["beat"]]
            t = round(bt["marks"][mo["mark"]] + mo.get("shot", SHOT), 2)
            pg.goto(f"{URL}ch{mo['n']:03d}/?beat={bt['i']}&t={t}")
            pg.wait_for_function("typeof BEATS !== 'undefined' && document.getElementById('cover').hidden", timeout=15000)
            got = pg.evaluate("BEATS[P.i].id")
            if got != mo["beat"]:
                sys.exit(f"{id_}: lesson {mo['n']} opened step {got}, expected {mo['beat']}")
            pg.wait_for_timeout(500)
            box = pg.locator("#stage").bounding_box()
            k, c = box["width"] / 1600, mo.get("crop", CROP)
            png = pg.screenshot(clip={"x": box["x"] + c[0] * k, "y": box["y"] + c[1] * k, "width": c[2] * k, "height": c[3] * k})
            im = Image.open(BytesIO(png)).convert("RGB").resize((WIDTH, round(WIDTH * c[3] / c[2])), Image.LANCZOS)
            im.save(OUT / "img" / f"{id_}.webp", quality=82)
            print("picture", id_, flush=True)
        b.close()


def report(err, warn):
    for e in err:
        print("ERROR", e)
    for w in warn:
        print("WARN", w)
    print(f"ERRORS {len(err)} WARNINGS {len(warn)}")


def build():
    voc, regs = vocab(), regions()
    err, warn = problems(voc, regs)
    report(err, warn)
    if err:
        return 1
    data = payload(voc, regs)
    img = OUT / "img"
    img.mkdir(parents=True, exist_ok=True)
    old = read_json(img / "shots.json") if (img / "shots.json").exists() else {}
    new, todo = {}, []
    for R in regs.values():
        for e in R["exercises"]:
            mo = e["moments"][e.get("thumb", 0)]
            new[e["id"]] = shot_key(mo)
            if old.get(e["id"]) != new[e["id"]] or not (img / f"{e['id']}.webp").exists():
                todo.append((e["id"], mo))
    if todo:
        take(todo)
    for p in img.glob("*.webp"):
        if p.stem not in new:
            p.unlink()
    (img / "shots.json").write_text(json.dumps(new, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    (OUT / "data.js").write_text(HEAD + "window.ATLAS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
                                 encoding="utf-8", newline="")
    print(f"built {len(data['ex'])} exercises, {len(todo)} new pictures")
    return 0


def check():
    from PIL import Image, ImageStat
    voc, regs = vocab(), regions()
    err, warn = problems(voc, regs)
    for R in regs.values():
        for e in R.get("exercises", []):
            p = OUT / "img" / f"{e.get('id')}.webp"
            if not p.exists():
                err.append(f"{e.get('id')}: no picture — run build")
            elif ImageStat.Stat(Image.open(p).convert("L")).stddev[0] < 12:
                err.append(f"{e['id']}: the picture is blank")
    if not err:
        try:
            text = (OUT / "data.js").read_text(encoding="utf-8")
            built = json.loads(text.split("window.ATLAS = ", 1)[1].rstrip().rstrip(";"))
        except Exception:
            built = None
        if built != payload(voc, regs):
            err.append("data.js is not built from the current data — run build")
    report(err, warn)
    return 1 if err else 0


def scan(arg):
    lo, _, hi = arg.partition("-")
    lo, hi = int(lo), int(hi or lo)
    used = {(m["n"], m["beat"], m["mark"]) for R in regions().values() for e in R["exercises"] for m in e["moments"]}
    for n in range(lo, hi + 1):
        L = lesson(n)
        if not L:
            continue
        p = L["pages"]
        print(f"== {n} {L['title']}" + (f" (стр. {p[0] - PDF_SHIFT}–{p[1] - PDF_SHIFT})" if p else ""))
        text = read_json(CONTENT / f"ch{n:03d}" / "narration.ru.json")["beats"]
        for b, B in L["beats"].items():
            if not B["marks"]:
                continue
            print(f"  {b} · {B['title']}")
            parts = dict(re.findall(r"\[\[(\w+)\]\]([^\[]*)", text.get(b, "")))
            for mk, t in sorted(B["marks"].items(), key=lambda kv: kv[1]):
                flag = "✓" if (n, b, mk) in used else " "
                print(f"    {flag} {mk:8} {t:6.1f}  {' '.join(parts.get(mk, '').split())[:100]}")
        if L["cards"]:
            print("  карточки: " + " · ".join(L["cards"]))
    return 0


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    cmd = argv[0] if argv else ""
    if cmd == "scan" and len(argv) == 2:
        return scan(argv[1])
    if cmd == "build":
        return build()
    if cmd == "check":
        return check()
    sys.exit(__doc__)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
