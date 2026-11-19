"""Places of the lessons' magnifiers (lupa): propose, write into the lesson, check.

    python tools/therapeutic-exercise/lupa.py dump 94     # proposals -> content/…/chNNN/lupa.ru.json (keeps written places)
    python tools/therapeutic-exercise/lupa.py apply 94    # the LUPA block after `const CHAPTER = …`
    python tools/therapeutic-exercise/lupa.py check 94    # errors: no beat/mark/figure/target, lens over text or a framed box;
                                                          # warnings: figure not small, lens not shown at the end, its lines over text

A proposal is a beat where a figure smaller than ×0.85 is seen with a biomechanics place (target: its joint) or a working muscle
(level 1; target: the most frequent one). check reads the lesson as applied: run apply first.
dump and check open the lesson in Chromium (tools/.venv) on their own server (port 8779, or LUPA_PORT).
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
PORT = os.environ.get("LUPA_PORT", "8779")
URL = f"http://localhost:{PORT}/therapeutic-exercise/"
BEGIN, END = "// lupa begin", "// lupa end"
KEYS = ("beat", "fig", "target", "from", "to", "zoom", "pos")


def joint_point(key):
    """Pose point of a biomechanics joint key: aN -> Sh, eN -> EN, hF -> H, kN -> KN, fF -> AF."""
    base = {"a": "Sh", "e": "E", "h": "H", "k": "K", "f": "A"}[key[0]]
    return base if base in ("Sh", "H") else base + key[1:]


def block(n, places):
    rows = [p for p in places if p.get("enabled", True)]
    if not rows:
        return ""
    body = "".join("  " + json.dumps({k: p[k] for k in KEYS if k in p}, ensure_ascii=False) + ",\n" for p in rows)
    return (f"{BEGIN}: the magnifiers of the lesson (L switches); made by tools/therapeutic-exercise/lupa.py "
            f"from content/therapeutic-exercise/ch{n:03d}/lupa.ru.json\nconst LUPA = [\n{body}];\n{END}\n")


def put_block(html, blk):
    html = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n", "", html, flags=re.S)
    if not blk:
        return html
    m = re.search(r"^const CHAPTER = .*\n", html, re.M)
    return html[:m.end()] + blk + html[m.end():]


def jpath(n):
    return CONTENT / f"ch{n:03d}" / "lupa.ru.json"


DUMP_JS = r"""() => {
  const out = [];
  for (let i = 0; i < BEATS.length; i++) {
    seek(i, false);
    const id = BEATS[i].id, dur = TIMINGS[id].dur, seen = new Map();
    for (let t = 0; t <= dur + 1e-6; t += .25) {
      P.t = t; evalTo(t);
      BIO_REG.forEach(L => {
        if (L.custom || L.beat !== id || !L.alive() || L.f.s >= .85 || L.vis() <= .2) return;
        const s = seen.get(L) || { n: L.n, s: L.f.s, mus: {} }; seen.set(L, s);
        (L.f.muscles || []).forEach((x, k) => {
          if (ANAT3.lvl(x.mu.level) === 1 && (x.mu.g._st ? x.mu.g._st.o : 1) > .5) { const key = x.preset || 'm' + k; s.mus[key] = (s.mus[key] || 0) + 1; }
        });
      });
    }
    const bio = (typeof BIO === 'undefined' ? [] : BIO).filter(q => q.beat === id && q.fig !== null);
    seen.forEach(s => {
      const bq = bio.find(q => (q.fig === undefined ? 0 : q.fig) === s.n), mus = Object.entries(s.mus).sort((a, b) => b[1] - a[1])[0];
      if (bq) out.push({ beat: id, fig: s.n, joint: bq.joint, scale: s.s });
      else if (mus) out.push({ beat: id, fig: s.n, muscle: mus[0], scale: s.s });
    });
  }
  return out;
}"""

CHECK_JS = r"""places => places.map((q, idx) => {
  const r = { errors: [], warn: [] }, i = BEATS.findIndex(b => b.id === q.beat);
  if (i < 0) { r.errors.push('no beat ' + q.beat); return r; }
  const tm = TIMINGS[q.beat], mark = v => v == null || typeof v === 'number' || v in tm.marks, fi = q.fig === undefined ? 0 : q.fig;
  if (!mark(q.from) || !mark(q.to)) { r.errors.push('no mark ' + (mark(q.from) ? q.to : q.from)); return r; }
  seek(i, false);
  const t0 = bioWhen(q.beat, q.from, 0), t1 = Math.min(bioWhen(q.beat, q.to, Infinity), tm.dur);
  let L = null, hit = false;
  for (let t = t0; t <= t1 + 1e-6; t += .1) {
    P.t = t; evalTo(t);
    L = [...BIO_REG].find(o => !o.custom && o.beat === q.beat && o.n === fi && o.alive());
    if (L && lupaTarget(L.f, q.target)) hit = true;
  }
  if (!L) { r.errors.push('no figure ' + fi); return r; }
  if (!hit) { r.errors.push('no target ' + q.target); return r; }
  if (L.f.s >= .85) r.warn.push('figure not small (x' + L.f.s + ')');
  const cp = document.getElementById('lupaClip' + idx), disc = cp && cp.parentNode.querySelector('.lupa-disc');
  if (!disc) { r.warn.push('lens not shown at the end of the place'); return r; }
  const b = disc.getBoundingClientRect(), over = [], cross = [], S = document.getElementById('stage').getScreenCTM();
  const ring = cp.parentNode.querySelector(".lupa-mark"), dc = [+disc.getAttribute('cx'), +disc.getAttribute('cy')];
  const lines = lupaTangents([+ring.getAttribute("cx"), +ring.getAttribute("cy")], dc, +ring.getAttribute("r"))
    .map(s => s.map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(S); return [p.x, p.y]; }));
  document.querySelectorAll('#scene text, #scene rect, #anatLegend rect').forEach(e => {
    if (!e.closest('#anatLegend') && anatVis(e) <= .2) return;
    if (e.tagName === 'rect' && !e.closest('#anatLegend') && [...BIO_REG].some(o => !o.custom && o.f.g.contains(e))) return;
    const c = e.getBoundingClientRect();
    if (!c.width || (e.tagName === 'rect' && e.getAttribute('rx') !== '22' && (c.width > 1400 * S.a || c.height > 800 * S.d))) return;
    const name = (e.textContent || e.tagName).slice(0, 40);
    if (c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top) over.push(name);
    else if (lines.some(([p, q]) => lupaSegHit(p, q, [c.left, c.top, c.right, c.bottom]))) cross.push(name);
  });
  if (over.length) r.errors.push('lens over: ' + over.slice(0, 3).join(' | '));
  if (cross.length) r.warn.push('lines over: ' + cross.slice(0, 3).join(' | '));
  return r;
})"""


def browser(n, js, arg=None):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 960})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{URL}ch{n:03d}/index.html?beat=0&t=0&bio=lesson&lupa=1")
        pg.wait_for_timeout(400)
        res = pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
        b.close()
    if errs:
        print(f"ch{n:03d}: page errors {errs[:2]}")
    return res


def dump(n):
    found = browser(n, DUMP_JS)
    old = json.loads(jpath(n).read_text(encoding="utf-8")) if jpath(n).exists() else []
    have = {(p["beat"], p.get("fig", 0)) for p in old}
    new = []
    for f in found:
        if (f["beat"], f["fig"]) in have:
            continue
        target = joint_point(f["joint"]) if "joint" in f else f["muscle"]
        why = (f"угломер {f['joint']}" if "joint" in f else f"работает {f['muscle']}") + f", фигура ×{f['scale']}"
        new.append({"beat": f["beat"], "fig": f["fig"], "target": target, "zoom": 3, "enabled": True, "why": why})
    if not old and not new:
        print(f"ch{n:03d}: no places")
        return
    jpath(n).write_text(json.dumps(old + new, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"ch{n:03d}: {len(new)} proposed, {len(old)} kept")


def check(n):
    places = json.loads(jpath(n).read_text(encoding="utf-8"))
    on = [p for p in places if p.get("enabled", True)]
    res = browser(n, CHECK_JS, on) if on else []
    bad = warn = 0
    for p, r in zip(on, res):
        tag = f"ch{n:03d} [{p['beat']}] {p['target']}"
        for e in r["errors"]:
            print(f"{tag}  ERROR {e}"); bad += 1
        for w in r["warn"]:
            print(f"{tag}  WARN {w}"); warn += 1
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
