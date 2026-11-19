"""Check the player additions on a lesson: start a step mid-way from the step bar, hover hint, playback speed.

    tools/.venv/Scripts/python tools/therapeutic-exercise/e2e_player.py [--url http://localhost:8765/therapeutic-exercise/ch001/]

Needs the textbook server with HTTP Range (tools/serve.py). Prints one line per check and exits 1 on a failure.
"""
import argparse
import asyncio
import sys

from playwright.async_api import async_playwright

FAILS = []


def check(name, ok, detail=""):
    print(("ok   " if ok else "FAIL ") + name + (f"  ({detail})" if detail else ""))
    if not ok:
        FAILS.append(name)


async def main(url):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width": 1600, "height": 960})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(url)
        await pg.evaluate("localStorage.removeItem('speed')")
        await pg.reload()
        await pg.wait_for_timeout(600)
        await pg.click("#cover")
        await pg.wait_for_timeout(800)
        segs = pg.locator("#segs .seg")
        n = await pg.evaluate("BEATS.length")
        qi = await pg.evaluate("BEATS.findIndex(b => b.ask && b.id !== 'finish')")   # the first question step
        # the step to start mid-way: step 8, or the next one without a question (a question step always starts at its top)
        mi = await pg.evaluate("(() => { const i = BEATS.findIndex((b, k) => k >= 7 && !b.ask); return i < 0 ? BEATS.findIndex((b, k) => k >= 1 && !b.ask) : i; })()")

        # 1. click the middle of that step: it starts mid-way, picture and audio together
        box = await segs.nth(mi).bounding_box()
        await pg.mouse.move(box["x"] + box["width"] * .5, box["y"] + box["height"] / 2)
        hint = await pg.text_content("#stepName")
        check("hover shows target step and time", hint.startswith(f"→ {mi + 1} / {n}") and "·" in hint, hint)
        await pg.mouse.click(box["x"] + box["width"] * .5, box["y"] + box["height"] / 2)
        await pg.wait_for_timeout(1500)
        st = await pg.evaluate("({ i: P.i, t: P.t, a: P.audio.currentTime, paused: P.audio.paused, dur: TIMINGS[BEATS[P.i].id].dur })")
        half = st["dur"] / 2
        check(f"click starts step {mi + 1}", st["i"] == mi, str(st))
        check("lesson clock starts mid-step", half < st["t"] < half + 3, f"t={st['t']:.2f}, half={half:.2f}")
        check("audio starts mid-clip", half < st["a"] < half + 3 and not st["paused"], f"audio={st['a']:.2f}")

        # 2. speed: X cycles 1 → 1.25 → 1.5 → 2; at 2× the clock runs twice as fast
        await pg.mouse.move(800, 400)
        for _ in range(3):
            await pg.keyboard.press("x")
        sp = await pg.evaluate("({ s: SPEED, r: P.audio.playbackRate, label: document.getElementById('bSpeed').textContent })")
        check("X key sets 2×", sp["s"] == 2 and sp["r"] == 2 and sp["label"] == "2×", str(sp))
        t0 = await pg.evaluate("P.t")
        await pg.wait_for_timeout(2000)
        t1 = await pg.evaluate("P.t")
        check("clock runs about 2× at 2×", 3.2 < t1 - t0 < 4.8, f"{t1 - t0:.2f} s in 2 s")
        await pg.click("#bSpeed")
        sp = await pg.evaluate("({ s: SPEED, label: document.getElementById('bSpeed').textContent })")
        check("button cycles back to 1×", sp["s"] == 1 and sp["label"] == "1×", str(sp))
        await pg.click("#bSpeed")

        # 3. a question step always starts at its top
        box = await segs.nth(qi).bounding_box()
        await pg.mouse.click(box["x"] + box["width"] * .7, box["y"] + box["height"] / 2)
        await pg.wait_for_timeout(600)
        q = await pg.evaluate("({ i: P.i, t: P.t, card: !!document.querySelector('#ui .quiz') })")
        check("question step opens its card", q["i"] == qi and q["card"], str(q))

        # 4. the speed is remembered
        await pg.reload()
        await pg.wait_for_timeout(600)
        sp = await pg.evaluate("({ s: SPEED, label: document.getElementById('bSpeed').textContent })")
        check("speed remembered after reload", sp["s"] == 1.25 and sp["label"] == "1,25×", str(sp))
        await pg.evaluate("localStorage.removeItem('speed')")
        check("no page errors", not errs, "; ".join(errs))
        await b.close()
    return 1 if FAILS else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8765/therapeutic-exercise/ch001/")
    sys.exit(asyncio.run(main(ap.parse_args().url)))
