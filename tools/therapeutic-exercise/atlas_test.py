"""Tests of the exercise atlas: the data tools (py), the built page data (build), the grid and filters (grid), the preview (pv).

    tools/.venv/Scripts/python tools/therapeutic-exercise/atlas_test.py [group or test …]

Page tests need site/therapeutic-exercise/atlas/data.js (atlas.py build) and use their own server (port 8789, or ATLAS_PORT).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import atlas as A  # noqa: E402

BASE = f"http://localhost:{A.PORT}/therapeutic-exercise/"
TESTS, GROUP, ERRORS = {}, {}, []


def test(group):
    def deco(fn):
        TESTS[fn.__name__], GROUP[fn.__name__] = fn, group
        return fn
    return deco


# ---- py: lessons, moments, data problems
GOOD = {"id": "probe", "ru": "Проба", "en": "probe", "joint": ["knee"], "goal": ["strength"], "pos": ["supine"], "gear": ["none"],
        "key": ["коротко"], "page": 832, "moments": [{"n": 214, "beat": "quad", "mark": "slr"}]}


def probs(*exercises):
    return A.problems(A.vocab(), {"t": {"exercises": list(exercises)}})


@test("py")
def lessonRead():
    L = A.lesson(214)
    q = L["beats"]["quad"]
    ok = L["title"] == "Упражнения для колена в открытой цепи" and q["i"] == 2 and "slr" in q["marks"] and L["pages"] == (866, 869)
    return ok and "подъём прямой ноги" in L["cards"] and A.lesson(999) is None, (L["title"], q["i"], L["pages"], L["cards"][:4])


@test("py")
def pagesTable():
    p = A.pages()
    return len(p) == 253 and p[214] == (866, 869) and p[1][0] == 35, (len(p), p.get(214), p.get(1))


@test("py")
def segmentNext():
    L = A.lesson(214)
    m = L["beats"]["quad"]["marks"]
    after = min(v for v in m.values() if v > m["slr"])
    return A.segment({"beat": "quad", "mark": "slr"}, L) == (round(m["slr"], 3), round(after, 3)), m


@test("py")
def segmentTo():
    L = A.lesson(214)
    b = L["beats"]["quad"]
    last = max(b["marks"], key=b["marks"].get)
    t0, t1 = A.segment({"beat": "quad", "mark": "set", "to": last}, L)
    return t0 == round(b["marks"]["set"], 3) and t1 == round(b["dur"], 3), (last, t0, t1)


@test("py")
def problemsClean():
    err, warn = probs(dict(GOOD))
    err2, _ = probs(dict(GOOD, ru="Проба [SLR]", sand="j=knee&m=flex&pos=supine"))
    return err == [] and warn == [] and err2 == [], (err, warn, err2)


@test("py")
def problemsTable():
    no_page = {k: v for k, v in GOOD.items() if k != "page"}
    cases = [
        ([dict(GOOD), dict(GOOD)], "id also in"),
        ([dict(GOOD, id="Bad Id")], "bad id"),
        ([no_page], "missing page"),
        ([dict(GOOD, goal=["speed"])], "goal speed is not in the vocabulary"),
        ([dict(GOOD, gear=[])], "empty gear"),
        ([dict(GOOD, key=["а" * 41])], "key phrase longer than 40"),
        ([dict(GOOD, key=["а", "б", "в", "г"])], "key needs 1–3 phrases"),
        ([dict(GOOD, ru="Проба SLR")], "Latin letters outside brackets"),
        ([dict(GOOD, moments=[])], "no moments"),
        ([dict(GOOD, moments=[{"n": 999, "beat": "quad", "mark": "slr"}])], "no lesson 999"),
        ([dict(GOOD, moments=[{"n": 214, "beat": "nope", "mark": "slr"}])], "has no step nope"),
        ([dict(GOOD, moments=[{"n": 214, "beat": "quad", "mark": "nope"}])], "has no mark nope"),
        ([dict(GOOD, moments=[{"n": 214, "beat": "quad", "mark": "slr", "to": "set"}])], "bad to set"),
        ([dict(GOOD, moments=[{"n": 214, "beat": "quad", "mark": "slr", "crop": [900, 0, 800, 800]}])], "crop outside the stage"),
        ([dict(GOOD, thumb=3)], "thumb out of range"),
        ([dict(GOOD, sand="j=jaw")], "no sandbox joint jaw"),
        ([dict(GOOD, sand="j=knee&m=flex&pos=moon")], "no position moon"),
    ]
    bad = []
    for ex, want in cases:
        err, _ = probs(*ex)
        if not any(want in e for e in err):
            bad.append((want, err))
    for page, warned in ((100, True), (836, False), (837, True)):   # lesson 214: printed 832–835, one page of slack
        err, warn = probs(dict(GOOD, page=page))
        if err or any("outside the pages" in w for w in warn) != warned:
            bad.append(("page warning", page, err, warn))
    return not bad, bad


# ---- build: the page data is built from the current files
@test("build")
def checkClean():
    return A.check() == 0, "atlas.py check reported errors"


@test("build")
def payloadOrder():
    voc, ex = A.vocab(), A.payload(A.vocab(), A.regions())["ex"]
    joints, phases = [k[0] for k in voc["joint"]], [k[0] for k in voc["phase"]]
    keys = [(joints.index(e["joint"][0]), min((phases.index(p) for p in e["phase"]), default=99), e["moments"][0]["n"], e["moments"][0]["t0"]) for e in ex]
    mo = next(e for e in ex if e["id"] == "slr")["moments"][0]
    return keys == sorted(keys) and mo["i"] == 2 and mo["lesson"] == "Упражнения для колена в открытой цепи" and mo["t1"] > mo["t0"], (keys[:5], mo)


# ---- page helpers
def open_at(pg, qs=""):
    pg.goto(BASE + "atlas/" + qs)
    pg.wait_for_function("window.AT_READY === true", timeout=15000)


def cards(pg):
    return pg.locator(".card").count()


def tick(pg, field, key):
    if not pg.eval_on_selector(f"#f-{field}", "d => d.open"):
        pg.click(f"#f-{field} > summary")
    pg.click(f"#f-{field} input[value={key}]")


def expect(pg, js):
    return pg.evaluate(f"() => ATLAS.ex.filter(e => {js}).length")


def ready(pg):
    pg.wait_for_function("AT.mo && AT.P && AT.P.started && AT.n === AT.mo.n", timeout=15000)


# ---- grid: cards, filters, search, address
@test("grid")
def loads(pg):
    open_at(pg)
    n = pg.evaluate("ATLAS.ex.length")
    return n > 0 and cards(pg) == n and pg.inner_text("#atCount").startswith(str(n)), (n, cards(pg), pg.inner_text("#atCount"))


@test("grid")
def filterOne(pg):
    open_at(pg)
    tick(pg, "goal", "strength")
    want = expect(pg, "e.goal.includes('strength')")
    return cards(pg) == want, (cards(pg), want)


@test("grid")
def filterAnd(pg):
    open_at(pg)
    tick(pg, "goal", "strength")
    tick(pg, "pos", "supine")
    want = expect(pg, "e.goal.includes('strength') && e.pos.includes('supine')")
    return cards(pg) == want, (cards(pg), want)


@test("grid")
def jointFirst(pg):
    open_at(pg, "?joint=ankle")
    ids = pg.eval_on_selector_all(".card", "cs => cs.map(c => c.dataset.id)")
    own = pg.evaluate("() => ATLAS.ex.filter(e => e.joint[0] === 'ankle').map(e => e.id)")
    return len(own) > 0 and ids[:len(own)] == own, (ids[:6], own[:6])


@test("grid")
def filterOr(pg):
    open_at(pg, "?pos=supine,sit")
    want = expect(pg, "e.pos.includes('supine') || e.pos.includes('sit')")
    return cards(pg) == want and pg.is_checked("#f-pos input[value=sit]"), (cards(pg), want)


@test("grid")
def phaseNone(pg):
    open_at(pg)
    tick(pg, "phase", "max")
    want = expect(pg, "!e.phase.length || e.phase.includes('max')")
    none = pg.locator(".card .chip.none").count()
    return cards(pg) == want and none == expect(pg, "!e.phase.length"), (cards(pg), want, none)


@test("grid")
def search(pg):
    open_at(pg)
    pg.fill("#atQ", "подъем")
    a = cards(pg), expect(pg, "e.ru.toLowerCase().replace(/ё/g, 'е').includes('подъем')")
    pg.fill("#atQ", "RAISE")
    b = cards(pg), expect(pg, "e.en.toLowerCase().includes('raise')")
    return a[0] == a[1] > 0 and b[0] == b[1] > 0, (a, b)


@test("grid")
def emptyAndReset(pg):
    open_at(pg)
    tick(pg, "goal", "strength")
    pg.fill("#atQ", "яяяя")
    empty = pg.is_visible(".empty") and pg.inner_text("#atCount").startswith("0")
    pg.click("#atReset")
    n = pg.evaluate("ATLAS.ex.length")
    return empty and cards(pg) == n and pg.evaluate("location.search") == "" and pg.is_hidden("#atReset"), (empty, cards(pg), n)


@test("grid")
def urlWrite(pg):
    open_at(pg)
    tick(pg, "goal", "strength")
    pg.fill("#atQ", "подъём")
    s = pg.evaluate("decodeURIComponent(location.search)")
    return "goal=strength" in s and "q=подъём" in s, s


@test("grid")
def urlRead(pg):
    open_at(pg, "?goal=strength&ex=slr")
    title = pg.inner_text("#pvInfo h2")
    return pg.is_checked("#f-goal input[value=strength]") and title == "Подъём прямой ноги" and pg.evaluate("document.body.classList.contains('pv-open')") \
        and pg.locator(".card.sel").get_attribute("data-id") == "slr", title


@test("grid")
def summaryText(pg):
    open_at(pg, "?goal=strength")
    one = pg.inner_text("#f-goal > summary")
    tick(pg, "pos", "supine")
    tick(pg, "pos", "sit")
    two = pg.inner_text("#f-pos > summary")
    return one == "Цель: сила" and two == "Положение: 2 выбрано" and pg.locator("details.f[open]").count() == 1, (one, two)


@test("grid")
def contentsLink(pg):
    pg.goto(BASE + "#contents")
    link = pg.locator('a[href="atlas/"]')
    if link.count() != 1:
        return False, link.count()
    link.click()
    pg.wait_for_function("window.AT_READY === true", timeout=15000)
    return True, ""


@test("grid")
def mobile(pg):
    pg.set_viewport_size({"width": 375, "height": 800})
    open_at(pg)
    wide = pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
    pg.locator(".card").first.click()
    box = pg.locator("#pv").bounding_box()
    shown = pg.is_visible("#pv") and box and box["width"] >= 374
    pg.click("#pvClose")
    return wide and shown and pg.is_hidden("#pv"), (wide, box)


# ---- pv: the preview plays the moment of the lesson
@test("pv")
def previewFromUrl(pg):
    open_at(pg, "?ex=slr")
    ready(pg)
    r = pg.evaluate("({ i: AT.P.i, t: AT.P.t, play: AT.P.playing, mo: AT.mo, src: document.getElementById('pvFrame').src })")
    return r["i"] == r["mo"]["i"] and abs(r["t"] - r["mo"]["t0"]) < .3 and not r["play"] and r["src"].endswith("/ch214/"), r


@test("pv")
def embedFit(pg):
    out = []
    for width in (1440, 375):   # lessons narrower than 700 px move the stage up for their bar; the preview has no bar
        pg.set_viewport_size({"width": width, "height": 800 if width < 700 else 900})
        open_at(pg, "?ex=slr")
        ready(pg)
        out.append(pg.evaluate("""() => { const d = AT.w.document, s = d.getElementById('stage').getBoundingClientRect();
          return { bar: AT.w.getComputedStyle(d.getElementById('bar')).display, x: s.x, y: s.y, w: s.width, h: s.height,
                   iw: AT.w.innerWidth, ih: AT.w.innerHeight, cover: d.getElementById('cover').hidden }; }"""))
    ok = all(r["bar"] == "none" and abs(r["w"] - r["iw"]) < 2 and abs(r["x"]) < 2 and abs(r["y"]) < 2 and abs(r["h"] - r["ih"]) < 2 and r["cover"] for r in out)
    return ok, out


@test("pv")
def previewPlays(pg):
    open_at(pg)
    pg.click('.card[data-id="slr"]')
    ready(pg)
    pg.wait_for_timeout(1500)
    r = pg.evaluate("({ t: AT.P.t, i: AT.P.i, mo: AT.mo })")
    return r["i"] == r["mo"]["i"] and r["t"] > r["mo"]["t0"] + .5, r


@test("pv")
def previewStops(pg):
    open_at(pg, "?ex=slr")
    ready(pg)
    pg.evaluate("AT.w.seek(AT.mo.i, true, AT.mo.t1 - .5)")
    pg.wait_for_timeout(1500)
    r = pg.evaluate("({ t: AT.P.t, i: AT.P.i, play: AT.P.playing, ended: AT.ended, mo: AT.mo, bar: document.getElementById('pvBar').style.width })")
    return r["ended"] and not r["play"] and r["i"] == r["mo"]["i"] and abs(r["t"] - r["mo"]["t1"]) < .3 and r["bar"] == "100%", r


@test("pv")
def previewMore(pg):
    open_at(pg, "?ex=slr")
    ready(pg)
    pg.evaluate("AT.w.seek(AT.mo.i, true, AT.mo.t1 - .3)")
    pg.wait_for_function("AT.ended", timeout=5000)
    pg.click("#pvMore")
    pg.wait_for_timeout(1200)
    r = pg.evaluate("({ t: AT.P.t, i: AT.P.i, play: AT.P.playing, mo: AT.mo })")
    return r["play"] and (r["t"] > r["mo"]["t1"] or r["i"] > r["mo"]["i"]), r


@test("pv")
def previewReplay(pg):
    open_at(pg, "?ex=slr")
    ready(pg)
    pg.evaluate("AT.w.seek(AT.mo.i, true, AT.mo.t1 - .3)")
    pg.wait_for_function("AT.ended", timeout=5000)
    pg.click("#pvPlay")
    pg.wait_for_timeout(300)
    r = pg.evaluate("({ t: AT.P.t, play: AT.P.playing, ended: AT.ended, mo: AT.mo })")
    return r["play"] and not r["ended"] and r["t"] < r["mo"]["t0"] + 1, r


@test("pv")
def momentSwitch(pg):
    open_at(pg)
    id_ = pg.evaluate("ATLAS.ex.find(e => new Set(e.moments.map(m => m.n)).size > 1).id")
    open_at(pg, f"?ex={id_}")
    ready(pg)
    pg.click('.mom button[data-k="1"]')
    pg.wait_for_function("AT.k === 1 && AT.P && AT.n === AT.mo.n && AT.P.i === AT.mo.i", timeout=15000)
    r = pg.evaluate("({ n: AT.n, mo: AT.mo, src: document.getElementById('pvFrame').src, cur: document.querySelector('.mom button[aria-current]').dataset.k, url: location.search })")
    return r["src"].endswith(f"/ch{r['mo']['n']:03d}/") and r["cur"] == "1" and "mo=1" in r["url"], r


@test("pv")
def noLessonTransition(pg):
    # a lesson switch inside the preview must not start the lessons' cross-document view transition:
    # Chromium sometimes aborts it and logs an error
    pg.add_init_script("addEventListener('pagereveal', e => { window.__vt = e.viewTransition ? 'started' : 'none'; })")
    open_at(pg)
    id_ = pg.evaluate("ATLAS.ex.find(e => new Set(e.moments.map(m => m.n)).size > 1).id")
    open_at(pg, f"?ex={id_}")
    ready(pg)
    seen = []
    for k in (1, 0, 1):
        pg.click(f'.mom button[data-k="{k}"]')
        pg.wait_for_function(f"AT.k === {k} && AT.P && AT.n === AT.mo.n && AT.P.i === AT.mo.i", timeout=15000)
        seen.append(pg.evaluate("AT.w.__vt"))
    return seen == ["none"] * 3, seen


@test("pv")
def lessonLink(pg):
    open_at(pg, "?ex=slr")
    href = pg.get_attribute("#pvLesson", "href")
    mo = pg.evaluate("AT.mo")
    pg.goto(BASE + "atlas/" + href)
    pg.wait_for_function("typeof BEATS !== 'undefined' && document.getElementById('cover').hidden", timeout=15000)
    r = pg.evaluate("({ id: BEATS[P.i].id, t: P.t })")
    return href == f"../ch214/?beat={mo['i']}&t={mo['t0']}" and r["id"] == "quad" and abs(r["t"] - mo["t0"]) < .3, (href, r)


@test("pv")
def sandLink(pg):
    open_at(pg, "?ex=quad-set")
    href = pg.get_attribute("#pvSand", "href")
    pg.goto(BASE + "atlas/" + href)
    pg.wait_for_function("window.SB_READY === true", timeout=15000)
    r = pg.evaluate("({ j: SB.joint, pos: SB.pos })")
    return r["j"] == "knee" and r["pos"] == "supine", (href, r)


@test("pv")
def progressKept(pg):
    pg.goto(BASE)
    key = "animebook:progress:/therapeutic-exercise/"
    pg.evaluate("k => localStorage.setItem(k, JSON.stringify({ last: 5, done: [1] }))", key)
    open_at(pg, "?ex=slr")
    ready(pg)
    p = pg.evaluate("k => JSON.parse(localStorage.getItem(k))", key)
    return p["last"] == 5 and p["done"] == [1], p


@test("pv")
def escCloses(pg):
    open_at(pg, "?ex=slr")
    ready(pg)
    pg.click("#atQ")
    pg.keyboard.press("Escape")
    r = pg.evaluate("({ ex: AT.ex, empty: !document.getElementById('pvEmpty').hidden, url: location.search, play: AT.P.playing })")
    return r["ex"] is None and r["empty"] and "ex=" not in r["url"] and not r["play"], r


def run(name, pg):
    ERRORS.clear()
    try:
        ok, detail = TESTS[name](pg) if pg is not None else TESTS[name]()
    except Exception as e:
        ok, detail = False, repr(e)[:400]
    if ERRORS:
        ok, detail = False, ("errors", ERRORS[:3], detail)
    print(("PASS " if ok else "FAIL ") + name, "" if ok else detail, flush=True)
    return 0 if ok else 1


def main(args):
    sys.stdout.reconfigure(encoding="utf-8")
    names = [n for a in (args or list(TESTS)) for n in ([k for k, g in GROUP.items() if g == a] or [a])]
    fails = sum(run(n, None) for n in names if GROUP[n] in ("py", "build"))
    page = [n for n in names if GROUP[n] in ("grid", "pv")]
    if page:
        from playwright.sync_api import sync_playwright
        with A.server(), sync_playwright() as pw:
            b = pw.chromium.launch()
            for n in page:
                pg = b.new_page(viewport={"width": 1440, "height": 900})
                pg.on("pageerror", lambda e: ERRORS.append(str(e)))
                pg.on("console", lambda m: ERRORS.append(m.text) if m.type == "error" and "favicon" not in m.text and "404" not in m.text else None)
                fails += run(n, pg)
                pg.close()
            b.close()
    print("FAILS", fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
