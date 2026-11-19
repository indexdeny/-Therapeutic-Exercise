"""Places of the biomechanics layer (goniometer, forces, lever arms, moment bars): propose, check, write into the lesson.

    python tools/therapeutic-exercise/bio.py dump 75     # proposals -> content/…/chNNN/bio.ru.json (keeps written places)
    python tools/therapeutic-exercise/bio.py apply 75    # the BIO block after `const CHAPTER = …` of each lesson
    python tools/therapeutic-exercise/bio.py check 75    # errors: no beat/figure/joint/mark, bars over text; warnings: spoken degrees not shown

A place proposed by dump is a beat whose narration speaks of an angle, degrees, a goniometer, a lever or a moment and that shows
a figure; its joint is the one that moves most there. check reads the lesson as applied: run apply first.
dump and check open the lesson in Chromium (tools/.venv) on their own server (port 8775, or BIO_PORT).
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
PORT = os.environ.get("BIO_PORT", "8775")
URL = f"http://localhost:{PORT}/therapeutic-exercise/"
BEGIN, END = "// bio begin", "// bio end"
# Words that name a joint angle (not «угловой импульс», «углекислый», «в четыре угла»); degrees of speed or temperature do not count.
ANGLE = re.compile(r"угломер|гониометр|прямым углом|\b(?:угол|угла|углу|углом|угле) (?:сгибания|разгибания|отведения|приведения|наклона|ротации)", re.I)
NOT_ANGLE = re.compile(r"градус\w*\s+в\s+секунду|тепл|температур|нагре|горяч|холодн|калори", re.I)
LEVER = re.compile(r"рычаг|плеч[оау] (?:силы|рычага)|момент сил|вращающ", re.I)
KEYS = ("beat", "fig", "from", "to", "level", "joint", "load", "muscle", "curve", "range", "bars", "gon")
_NUMS = {0: "ноль нуля нулю нуле", 1: "один одного одному одна одну одно", 2: "два двух двум две", 3: "три трех трем",
         4: "четыре четырех", 5: "пять пяти", 6: "шесть шести", 7: "семь семи", 8: "восемь восьми", 9: "девять девяти",
         10: "десять десяти", 11: "одиннадцать одиннадцати", 12: "двенадцать двенадцати", 13: "тринадцать тринадцати",
         14: "четырнадцать четырнадцати", 15: "пятнадцать пятнадцати", 16: "шестнадцать шестнадцати", 17: "семнадцать семнадцати",
         18: "восемнадцать восемнадцати", 19: "девятнадцать девятнадцати", 20: "двадцать двадцати", 30: "тридцать тридцати",
         40: "сорок сорока", 50: "пятьдесят пятидесяти", 60: "шестьдесят шестидесяти", 70: "семьдесят семидесяти",
         80: "восемьдесят восьмидесяти", 90: "девяносто девяноста", 100: "сто ста", 200: "двести двухсот"}
NUMWORD = {w: v for v, ws in _NUMS.items() for w in ws.split()}


def _num(tok):
    return int(tok) if tok.isdigit() else NUMWORD.get(tok)


def spoken_degrees(text):
    """Numbers in the text that a word «градус…» follows within three words: «тридцать–сорок пять градусов» -> [30, 45] (not «один сустав на несколько градусов»)."""
    toks = [t.lower().replace("ё", "е") for t in re.findall(r"[А-Яа-яЁё]+|\d+", text.replace("°", " градус"))]
    out, i = [], 0
    while i < len(toks):
        v = _num(toks[i])
        if v is None:
            i += 1
            continue
        total, last, j = v, v, i + 1
        while j < len(toks):   # сто двадцать пять: hundreds, then tens, then units
            w = _num(toks[j])
            if w is None or not (last >= 20 and last % 10 == 0 and w < last and (last >= 100 or w < 10)):
                break
            total, last, j = total + w, w, j + 1
        if any(t.startswith("градус") for t in toks[j:j + 3]):
            out.append(total)
        i = j
    return out


def talks_angle(s):
    """A sentence about a joint angle: angle words, or degrees said that are not of speed or temperature."""
    return bool(ANGLE.search(s)) or (bool(spoken_degrees(s)) and not NOT_ANGLE.search(s))


def block(n, places):
    rows = [p for p in places if p.get("enabled", True)]
    if not rows:
        return ""
    body = "".join("  " + json.dumps({k: p[k] for k in KEYS if k in p}, ensure_ascii=False) + ",\n" for p in rows)
    return (f"{BEGIN}: places of the biomechanics layer (B switches); made by tools/therapeutic-exercise/bio.py "
            f"from content/therapeutic-exercise/ch{n:03d}/bio.ru.json\nconst BIO = [\n{body}];\n{END}\n")


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
    return CONTENT / f"ch{n:03d}" / "bio.ru.json"


DUMP_JS = r"""() => {
  const out = [], keys = ['aN', 'eN', 'hN', 'kN', 'fN', 'aF', 'eF', 'hF', 'kF', 'fF'];
  for (let i = 0; i < BEATS.length; i++) {
    seek(i, false);
    const id = BEATS[i].id, dur = TIMINGS[id].dur, seen = new Map();
    for (let t = 0; t <= dur + 1e-6; t += .25) {
      P.t = t; evalTo(t);
      BIO_REG.forEach(L => {
        if (L.custom || L.beat !== id || !L.f.g.isConnected) return;
        const s = seen.get(L) || { n: L.n, lo: {}, hi: {}, end: {} }; seen.set(L, s);
        for (const k of keys) { const v = L.f.pose[k] ?? 0; s.lo[k] = Math.min(s.lo[k] ?? v, v); s.hi[k] = Math.max(s.hi[k] ?? v, v); s.end[k] = v; }
      });
    }
    seen.forEach(s => {
      let best = null, bv = 3;
      for (const k of keys) { const d = s.hi[k] - s.lo[k]; if (d > bv) { bv = d; best = k; } }
      if (!best) { bv = -1; for (const k of keys.slice(0, 5)) { const d = Math.abs(s.end[k] - (STAND[k] ?? 0)); if (d > bv) { bv = d; best = k; } } }
      out.push({ beat: id, fig: s.n, joint: best, moves: +(s.hi[best] - s.lo[best]).toFixed(1) });
    });
  }
  return out;
}"""

CHECK_JS = r"""places => places.map(q => {
  const r = { errors: [], angles: [], overlap: [] }, i = BEATS.findIndex(b => b.id === q.beat);
  if (i < 0) { r.errors.push('no beat ' + q.beat); return r; }
  const tm = TIMINGS[q.beat], mark = v => v == null || typeof v === 'number' || v in tm.marks, fig = q.fig === undefined ? 0 : q.fig;
  if (!mark(q.from) || !mark(q.to)) { r.errors.push('no mark ' + (mark(q.from) ? q.to : q.from)); return r; }
  if (fig !== null && !/^[aehkf][NF]$/.test(q.joint)) { r.errors.push('bad joint ' + q.joint); return r; }
  const lt = q.load && q.load.type;
  if ((lt === 'band' || lt === 'pulley') && !Array.isArray(q.load.anchor)) r.errors.push(lt + ' without anchor');
  if (lt === 'band' && !q.load.rest) r.errors.push('band without rest');
  seek(i, false);
  const t0 = bioWhen(q.beat, q.from, 0), t1 = Math.min(bioWhen(q.beat, q.to, Infinity), tm.dur);
  let L = null;
  for (let t = t0; t <= t1 + 1e-6; t += .1) {
    P.t = t; evalTo(t);
    L = [...BIO_REG].find(x => x.beat === q.beat && (fig === null ? x.custom && x.name === q.joint : !x.custom && x.n === fig));
    if (L) r.angles.push(+(L.custom ? bioGeoCustom(L) : bioGeoFig(L.f, q.joint)).th.toFixed(1));
  }
  if (!L) { r.errors.push(fig === null ? 'no bioJoint ' + q.joint : 'no figure ' + fig); return r; }
  const bars = L.g && L.g.getAttribute('display') !== 'none' && L.g.querySelector('[data-b="bars"]');
  if (bars) {
    const b = bars.getBoundingClientRect();
    document.querySelectorAll('#scene text, #scene rect[rx="22"], #anatLegend rect').forEach(e => {
      if (e.closest('.bio') || (!e.closest('#anatLegend') && anatVis(e) <= .2)) return;
      const c = e.getBoundingClientRect();
      if (c.width && c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top) r.overlap.push((e.textContent || e.tagName).slice(0, 40));
    });
  }
  return r;
})"""


def browser(n, js, arg=None):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 960})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{URL}ch{n:03d}/index.html?beat=0&t=0&bio=lesson")
        pg.wait_for_timeout(400)
        res = pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
        b.close()
    if errs:
        print(f"ch{n:03d}: page errors {errs[:2]}")
    return res


def dump(n):
    figs, nar = browser(n, DUMP_JS), narration(n)
    old = json.loads(jpath(n).read_text(encoding="utf-8")) if jpath(n).exists() else []
    have = {(p["beat"], p.get("fig", 0), p["joint"]) for p in old}
    new = []
    for beat, text in nar.items():
        said = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if talks_angle(s) or LEVER.search(s)]
        if not said:
            continue
        lever = any(LEVER.search(s) for s in said)
        for f in (x for x in figs if x["beat"] == beat and x["joint"]):
            if (beat, f["fig"], f["joint"]) in have:
                continue
            new.append({"beat": beat, "fig": f["fig"], "joint": f["joint"], "level": "full" if lever else "angle",
                        "load": {"type": "none"}, "enabled": True, "keep": [], "why": "«" + " … ".join(said)[:300] + "»"})
    if not old and not new:
        print(f"ch{n:03d}: no places")
        return
    jpath(n).write_text(json.dumps(old + new, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"ch{n:03d}: {len(new)} proposed, {len(old)} kept")


def check(n):
    places, nar = json.loads(jpath(n).read_text(encoding="utf-8")), narration(n)
    on = [p for p in places if p.get("enabled", True)]
    res = browser(n, CHECK_JS, on) if on else []
    bad = warn = 0
    for p, r in zip(on, res):
        tag = f"ch{n:03d} [{p['beat']}] {p['joint']}"
        for e in r["errors"]:
            print(f"{tag}  ERROR {e}"); bad += 1
        if r["overlap"]:
            print(f"{tag}  ERROR bars over: {r['overlap'][:3]}"); bad += 1
        keep = {int(k) for k in p.get("keep", [])}
        for d in spoken_degrees(nar.get(p["beat"], "")):
            if d in keep or not r["angles"] or any(abs(a - d) <= 5 for a in r["angles"]):
                continue
            print(f"{tag}  WARN narrator says {d}°, the goniometer shows {min(r['angles']):.0f}–{max(r['angles']):.0f}°"); warn += 1
    print(f"ch{n:03d}: {len(on)} places, errors {bad}, warnings {warn}")
    return bad


def apply(n):
    page = SITE / f"ch{n:03d}" / "index.html"
    html = page.read_text(encoding="utf-8")
    places = json.loads(jpath(n).read_text(encoding="utf-8")) if jpath(n).exists() else []
    page.write_text(put_block(html, block(n, places)), encoding="utf-8", newline="")
    print(f"ch{n:03d}: block written ({sum(1 for p in places if p.get('enabled', True))} places)")


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
