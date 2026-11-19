"""The joint sandbox: write the joints' data into the page, check it, calibrate the stops.

    python tools/therapeutic-exercise/sandbox.py apply          # content/…/sandbox/*.ru.json -> const SAND in sandbox/index.html
    python tools/therapeutic-exercise/sandbox.py check [knee]   # errors: no page at a fact, mark or task, unknown structure, a view
                                                                 # without its structure, a task its own «показать» does not solve,
                                                                 # a stop more than 10° from its reference; warnings: empty group
    python tools/therapeutic-exercise/sandbox.py calib knee     # strains of the structures at the reference poses (no stops)

check and calib read the page as applied (run apply first) and open it in Chromium (tools/.venv) on their own server
(port 8787, or SAND_PORT).
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
CONTENT = ROOT / "content" / "therapeutic-exercise" / "sandbox"
PAGE = SITE / "sandbox" / "index.html"
PORT = os.environ.get("SAND_PORT", "8787")
URL = f"http://localhost:{PORT}/therapeutic-exercise/sandbox/"
BEGIN, END = "// sand begin", "// sand end"


def load():
    return {p.name.split(".")[0]: json.loads(p.read_text(encoding="utf-8")) for p in sorted(CONTENT.glob("*.ru.json"))}


def block(data):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return (f"{BEGIN}: the joints of the sandbox; made by tools/therapeutic-exercise/sandbox.py from "
            f"content/therapeutic-exercise/sandbox/*.ru.json\nconst SAND = {body};\n{END}\n")


def apply():
    html = PAGE.read_text(encoding="utf-8")
    data = load()
    new, k = re.subn(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n", lambda m: block(data), html, count=1, flags=re.S)
    if not k:
        sys.exit("sand block not found in sandbox/index.html")
    PAGE.write_text(new, encoding="utf-8", newline="")
    print("applied", ", ".join(data))
    return 0


# Strains of every structure at each reference pose, with the stops switched off.
CALIB_JS = r"""(refs) => refs.map(r => {
  const M = SAND[SB.joint].motions.find(m => m.id === SB.motion), keep = M.stops;
  M.stops = []; sbOpen(SB.joint, SB.motion, r.pos, null); sbSet({ ...r.q, [r.dof]: r.expect }); M.stops = keep;
  const out = {}; for (const id in SAND[SB.joint].structures) out[id] = +sbStrain(id).toFixed(4);
  return { pos: r.pos, q: SB.q, by: r.by, strain: out };
})"""

# Every check of one joint; tasks whose answer is a contraction are moved there in small steps, so the senses see the motion.
CHECK_JS = r"""async (j) => {
  const D = SAND[j], err = [], warn = [], ids = new Set(Object.keys(D.structures)), wait = ms => new Promise(r => setTimeout(r, ms));
  for (const f of D.facts) if (!(f.page > 0)) err.push('fact without page: ' + f.ru);
  for (const t of D.tasks) if (!(t.page > 0)) err.push('task without page: ' + t.id);
  for (const m of D.motions) {
    for (const k of m.marks) if (!(k.page > 0)) err.push('mark without page: ' + k.ru);
    for (const g of m.groups) { if (!g.ids.length) warn.push('empty group ' + g.id); for (const id of g.ids) if (!ids.has(id)) err.push('group ' + g.id + ': unknown ' + id); }
    for (const s of m.stops) for (const id of s.ids || [s.id]) if (!ids.has(id)) err.push('stop: unknown ' + id);
    for (const pos in m.positions) {
      sbOpen(j, m.id, pos, null);
      for (const id of m.ids || ids) {   // only the structures this motion shows
        if (!D.structures[id]) { err.push(`${m.id}: unknown structure ${id}`); continue; }
        const s = D.structures[id];
        for (const [k, key] of [['limb', s.limb], ['close', s.close]]) if (key && SB.V[k] && !SB_VIEW[SB.V[k].model].el(SB.V[k].j, key)) err.push(`${pos}: the ${k} view has no ${key}`);
      }
    }
    for (const r of m.refs) {
      SB.joint = j; SB.motion = m.id; const o = sbRef(r);
      if (Math.abs(o.angle - r.expect) > 10) err.push(`ref ${r.pos} ${r.dof}→${r.to}: stops at ${o.angle.toFixed(0)}, expected ${r.expect}`);
      if (r.by && !o.by.includes(r.by)) err.push(`ref ${r.pos} ${r.dof}→${r.to}: stopped by [${o.by}], expected ${r.by}`);
    }
  }
  for (const t of D.tasks) {
    SB.joint = j; SB.motion = (t.show.motion || D.motions[0].id);
    const legs = (t.show.path || []).concat([t.show.q]);
    if (t.when.work) {
      sbShowNow({ ...t, show: { ...t.show, path: legs.slice(0, -2), q: legs.length > 1 ? legs[legs.length - 2] : {} } });
      const last = legs[legs.length - 1];
      for (let i = 1; i <= 40; i++) { for (const d in last) sbGo(d, lerp(SB.q[d], last[d], 1 / (41 - i))); sbActivate(sbWork().work); await wait(25); if (sbTaskOk(t.when, sbState())) break; }
    } else sbShowNow(t);
    if (!sbTaskOk(t.when, sbState())) err.push('task not solved by its show: ' + t.id);
  }
  return { err, warn };
}"""


def browser(joint, js, arg):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{URL}?j={joint}")
        pg.wait_for_function("window.SB_READY === true", timeout=15000)
        res = pg.evaluate(js, arg)
        b.close()
    if errs:
        print("page errors:", errs[:3])
    return res


def calib(joint):
    data = load()[joint]
    for m in data["motions"]:
        for r in browser(joint, CALIB_JS, m["refs"]):
            print(f"{r['pos']:7} {json.dumps(r['q'])}  by {r['by']}")
            print("   ", "  ".join(f"{k} {v:+.4f}" for k, v in r["strain"].items()))
    return 0


def check(joint):
    r = browser(joint, CHECK_JS, joint)
    for e in r["err"]:
        print("ERROR", e)
    for w in r["warn"]:
        print("WARN", w)
    print(f"{joint}: ERRORS {len(r['err'])} WARNINGS {len(r['warn'])}")
    return 1 if r["err"] else 0


def main(cmd, args):
    if cmd == "apply":
        return apply()
    if cmd not in ("check", "calib"):
        sys.exit(__doc__)
    srv = None
    try:
        urllib.request.urlopen(URL, timeout=1)
    except Exception:
        srv = subprocess.Popen([sys.executable, "tools/serve.py", PORT], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                urllib.request.urlopen(URL, timeout=1)
                break
            except Exception:
                time.sleep(.2)
    try:
        joints = args or list(load())
        if cmd == "calib":
            return max(calib(j) for j in joints)
        return max(check(j) for j in joints)
    finally:
        if srv:
            srv.kill()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "", sys.argv[2:]))
