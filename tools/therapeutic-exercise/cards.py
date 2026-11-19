"""Short lines of the info cards (infoCard): dump them from a lesson, check them, write them into the lesson.

    python tools/therapeutic-exercise/cards.py dump 113 114     # cards of the lessons -> content/…/chNNN/cards.ru.json (keeps written lines)
    python tools/therapeutic-exercise/cards.py check 113 114    # errors: empty line, too wide, a word not from the card or its narration
    python tools/therapeutic-exercise/cards.py apply 113 114    # the CARDS_SHORT block after `const CHAPTER = …` of each lesson

A line is "" until written and null when the card keeps its full text (for example, the lesson draws inside it: see "hosts").
dump and check open the lesson in Chromium (tools/.venv) on their own server (port 8771, or CARDS_PORT).
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site" / "therapeutic-exercise"
CONTENT = ROOT / "content" / "therapeutic-exercise"
PORT = os.environ.get("CARDS_PORT", "8771")   # another port when two runs overlap
URL = f"http://localhost:{PORT}/therapeutic-exercise/"
BEGIN, END = "// cards-short begin", "// cards-short end"
WORD = re.compile(r"[A-Za-zА-Яа-яЁё]+")
NUM = re.compile(r"\d+(?:[.,]\d+)?")


def words(s):
    return [w.lower().replace("ё", "е") for w in WORD.findall(s)]


def stem(w):
    return w[:max(3, len(w) - (2 if len(w) <= 6 else 3))]


def unknown_words(short, sources):
    """Words of 4+ letters in the short line that no source word shares a stem with."""
    src = {w for s in sources for w in words(s)}
    out = []
    for w in words(short):
        if len(w) < 4:
            continue
        if not any(s.startswith(stem(w)) or (len(s) >= 4 and w.startswith(stem(s))) for s in src):
            out.append(w)
    return out


def repeats_title(short, title):
    """True when every word of 3+ letters in the line is already in the title (stem match): the line adds nothing."""
    tw = [w for w in words(title) if len(w) >= 3]
    sw = [w for w in words(short) if len(w) >= 3]
    return bool(sw) and all(any(t.startswith(stem(w)) or w.startswith(stem(t)) for t in tw) for w in sw)


def missing_numbers(body, short, keep):
    have = set(NUM.findall(short)) | set(map(str, keep or []))
    return [n for n in dict.fromkeys(NUM.findall(body)) if n not in have]


def block(n, entries):
    rows = [(e["title"] + "\n" + e["body"], e["short"]) for e in entries if e.get("short")]
    if not rows:
        return ""
    body = "".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n" for k, v in rows)
    return (f"{BEGIN}: key-word lines of the info cards (T switches); made by tools/therapeutic-exercise/cards.py "
            f"from content/therapeutic-exercise/ch{n:03d}/cards.ru.json\nconst CARDS_SHORT = {{\n{body}}};\n{END}\n")


def put_block(html, blk):
    html = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n", "", html, flags=re.S)
    if not blk:
        return html
    m = re.search(r"^const CHAPTER = .*\n", html, re.M)
    return html[:m.end()] + blk + html[m.end():]


def narration(n):
    beats = json.loads((CONTENT / f"ch{n:03d}" / "narration.ru.json").read_text(encoding="utf-8"))["beats"]
    return {k: re.sub(r"\[\[[^\]]*\]\]", "", v) for k, v in beats.items()}


def jpath(n):
    return CONTENT / f"ch{n:03d}" / "cards.ru.json"


DUMP_JS = r"""() => {
  const log = []; let beat = -1;
  const rb0 = runBeat, ic0 = infoCard;
  runBeat = i => { beat = i; return rb0(i); };
  infoCard = function (...a) { const g = ic0.apply(this, a); log.push({ beat, g, t0: a[8] }); return g; };
  const sc = document.getElementById('scene'), out = [];
  const opac = e => { let o = 1; for (let n = e; n && n !== sc; n = n.parentNode) { o *= +(n.getAttribute('opacity') ?? 1);
    if (n.getAttribute('display') === 'none' || (n.style && n.style.visibility === 'hidden')) return 0; } return o; };
  try {
    for (let i = 0; i < BEATS.length; i++) {
      log.length = 0; seek(i, false); const end = TIMINGS[BEATS[i].id].dur; P.t = end - .05; evalTo(end - .05);
      const mine = log.filter(l => l.beat === i && l.g._card.body), cg = new Set(log.map(l => l.g));
      const leaves = [...sc.querySelectorAll('text, path, rect, circle, ellipse, line, polyline, polygon, image, use')]
        .filter(e => { for (let n = e; n && n !== sc; n = n.parentNode) if (cg.has(n)) return false; return opac(e) > .05; });
      for (const { g, t0 } of mine) {
        const c = g._card, hosts = [];
        if (g.childElementCount > c.own) hosts.push('drawn into the card group: ' + (g.childElementCount - c.own));
        if (opac(g) > .05) {
          const r = g.firstChild.getBoundingClientRect(), ra = r.width * r.height;
          for (const e of leaves) {
            const b = e.getBoundingClientRect(), ba = b.width * b.height;
            if (ba < 4 || ba > .9 * ra) continue;
            const ix = Math.min(r.right, b.right) - Math.max(r.left, b.left), iy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
            if (ix > 0 && iy > 0 && ix * iy > .5 * ba) hosts.push(e.tagName + (e.textContent ? ' «' + e.textContent.slice(0, 40) + '»' : ''));
            if (hosts.length >= 5) break;
          }
        }
        out.push({ beat: BEATS[i].id, beatIndex: i, t0: typeof t0 === 'number' ? +t0.toFixed(2) : null, title: c.title, body: c.body,
          x: +g.firstChild.getAttribute('x'), y: +g.firstChild.getAttribute('y'), w: c.w, h: c.h, textW: c.textW, size: g.children[2] ? +g.children[2].firstChild.getAttribute('font-size') : null, hosts });
      }
    }
  } finally { runBeat = rb0; infoCard = ic0; }
  return out;
}"""

CHECK_JS = r"""cards => cards.map(c => {
  const ss = Math.max(25, c.size || 23), g0 = G(document.getElementById('scene'));
  const g = infoCard(g0, 0, 0, c.w, c.h, c.title, c.body, '#fff', null, { size: c.size || 23, textW: c.textW, short: c.short });
  const r = { width: uiW(c.short, ss), hs: g._card.hs }; g0.remove(); return r;
})"""


def browser(n, js, arg=None):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 960})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{URL}ch{n:03d}/index.html?beat=0&t=0&cards=full")
        pg.wait_for_timeout(400)
        res = pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
        b.close()
    if errs:
        print(f"ch{n:03d}: page errors {errs[:2]}")
    return res


def dump(n):
    cards, seen = browser(n, DUMP_JS), set()
    old = {(e["title"], e["body"]): e for e in json.loads(jpath(n).read_text(encoding="utf-8"))} if jpath(n).exists() else {}
    out = []
    for c in cards:
        k = (c["title"], c["body"])
        if k in seen:
            continue
        seen.add(k)
        o = old.pop(k, {})
        c["short"] = o.get("short", None if c["hosts"] else "")
        c["keep"] = o.get("keep", [])
        out.append(c)
    for k in old:
        print(f"ch{n:03d}: stale line dropped: {k[0]} | {old[k].get('short')}")
    if not out:
        print(f"ch{n:03d}: no cards")
        return
    jpath(n).write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"ch{n:03d}: {len(out)} cards, {sum(1 for c in out if c['hosts'])} with drawing inside")


def check(n):
    cards, nar = json.loads(jpath(n).read_text(encoding="utf-8")), narration(n)
    bad = warn = 0
    todo = [c for c in cards if c["short"]]
    geo = browser(n, CHECK_JS, todo) if todo else []
    for c in cards:
        if c["short"] == "":
            print(f"ch{n:03d} ERROR empty: {c['title']}"); bad += 1
    for c, g in zip(todo, geo):
        tag = f"ch{n:03d} [{c['beat']}] {c['title']} | {c['short']}"
        if g["width"] > c["textW"]:
            print(f"{tag}  ERROR too wide {g['width']:.0f} > {c['textW']}"); bad += 1
        u = unknown_words(c["short"], [c["title"], c["body"], nar.get(c["beat"], "")])
        if u:
            print(f"{tag}  ERROR words not in the card or its narration: {u}"); bad += 1
        nn = sum(1 for t in c["short"].split() if WORD.search(t))   # numbers and signs (→, +, ≥) are not words
        if not 3 <= nn <= 7:
            print(f"{tag}  WARN {nn} words"); warn += 1
        if repeats_title(c["short"], c["title"]):
            print(f"{tag}  WARN the line repeats the title"); warn += 1
        m = missing_numbers(c["body"], c["short"], c.get("keep"))
        if m:
            print(f"{tag}  WARN numbers only in the full text: {m}"); warn += 1
        if g["hs"] > c["h"] + .5:
            print(f"{tag}  WARN short card taller than the full one ({g['hs']:.0f} > {c['h']})"); warn += 1
    print(f"ch{n:03d}: {len(todo)} lines, {sum(1 for c in cards if c['short'] is None)} kept full, errors {bad}, warnings {warn}")
    return bad


def apply(n):
    page = SITE / f"ch{n:03d}" / "index.html"
    html = page.read_text(encoding="utf-8")
    page.write_text(put_block(html, block(n, json.loads(jpath(n).read_text(encoding="utf-8")))), encoding="utf-8", newline="")
    print(f"ch{n:03d}: block written")


def main(cmd, nums):
    nums = [int(x) for x in nums]
    if cmd == "apply":
        for n in nums:
            apply(n)
        return 0
    srv = subprocess.Popen([sys.executable, "tools/serve.py", PORT], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(URL, timeout=1)
                break
            except Exception:
                time.sleep(.2)
        if cmd == "dump":
            for n in nums:
                dump(n)
            return 0
        return 1 if sum(check(n) for n in nums) else 0
    finally:
        srv.kill()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2:]))
