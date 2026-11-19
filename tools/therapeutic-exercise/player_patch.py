"""Player additions for this book's engine copy: start a step mid-way and change playback speed.

    python tools/therapeutic-exercise/localize_ru.py site/therapeutic-exercise/lib/engine.js     # first
    python tools/therapeutic-exercise/player_patch.py site/therapeutic-exercise/lib/engine.js

- Clicking the step bar starts that step at the clicked moment, not at its start; while hovering, the step
  name shows where the click will go ("→ 8 / 17 Четыре цели · 0:12"). Question steps still start at the top.
- A speed button (and the X key) cycles 1× → 1,25× → 1,5× → 2×; the choice is remembered. Narration plays
  faster with its pitch kept; the animation follows the audio clock, and wall-time stretches speed up too.
Starting a clip mid-way needs a server that answers HTTP Range requests (tools/serve.py).
Exact replacements, applied after localize_ru.py; running it twice is safe. engine.css gets its styles appended.
"""
import sys
from pathlib import Path

JS = [
    ('<div class="step" id="stepName"></div>',
     '<div class="step" id="stepName"></div>\n    <button class="icon speed" id="bSpeed" aria-label="Скорость (X)" title="Скорость (X)">1×</button>'),
    ('<dt><kbd>F</kbd></dt><dd>Полный экран</dd>',
     '<dt><kbd>F</kbd></dt><dd>Полный экран</dd>\n          <dt><kbd>X</kbd></dt><dd>Скорость: 1× → 1,25× → 1,5× → 2×</dd>\n          <dt>Щелчок</dt><dd>по полосе шагов — начать с этого места</dd>'),
    ("""function seek(i, play = P.playing) {
  stopAudio(); clearCards(); reset();
  for (let k = 0; k < i; k++) { runBeat(k); evalTo(Infinity); }
  start(i, play);
}
function start(i, play) {""",
     """function seek(i, play = P.playing, at = 0) {
  stopAudio(); clearCards(); reset();
  for (let k = 0; k < i; k++) { runBeat(k); evalTo(Infinity); }
  start(i, play, at);
}
// at > 0 starts a lesson step mid-way: the picture is fast-forwarded to that moment and the clip starts there.
function start(i, play, at = 0) {"""),
    ("""  evalTo(0);
  const a = P.audio = new Audio(`audio/${CHAPTER.language || 'en'}/${BEATS[i].id}.mp3`);
  a.preload = 'auto';""",
     """  evalTo(0);
  if (at > 0 && !BEATS[i].ask) { P.t = at; evalTo(at); }
  const a = P.audio = new Audio(`audio/${CHAPTER.language || 'en'}/${BEATS[i].id}.mp3`);
  a.preload = 'auto';
  if (P.t > 0) a.currentTime = P.t;
  a.playbackRate = SPEED;"""),
    ("    } else P.t += dt;", "    } else P.t += dt * SPEED;"),
    ("  s.onclick = () => { hideCover(); seek(i, true); };",
     """  const at = e => {   // the moment under the pointer; near the left edge, or on a question, the step's start
    const r = s.getBoundingClientRect(), q = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return b.ask || q < .03 ? 0 : q * TIMINGS[b.id].dur;
  };
  s.onclick = e => { hideCover(); seek(i, true, at(e)); };
  s.onmousemove = e => { P.hover = { i, t: at(e) }; s.style.setProperty('--hx', (e.clientX - s.getBoundingClientRect().left).toFixed(1) + 'px'); };
  s.onmouseleave = () => { P.hover = null; };"""),
    ("  $('stepName').textContent = `${P.i + 1} / ${BEATS.length}   ${BEATS[P.i].title}`;",
     """  const hv = P.hover, mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('stepName').textContent = hv ? `→ ${hv.i + 1} / ${BEATS.length}   ${BEATS[hv.i].title}${BEATS[hv.i].ask ? '' : ' · ' + mmss(hv.t)}`
    : `${P.i + 1} / ${BEATS.length}   ${BEATS[P.i].title}`;"""),
    ("setCaptions(captions);\n",
     """setCaptions(captions);
// Playback speed, remembered across lessons.
const SPEEDS = [1, 1.25, 1.5, 2];
let SPEED = 1;
try { const v = +localStorage.getItem('speed'); if (SPEEDS.includes(v)) SPEED = v; } catch {}
function setSpeed(v) {
  SPEED = v;
  $('bSpeed').textContent = String(v).replace('.', ',') + '×';
  $('bSpeed').classList.toggle('on', v !== 1);
  if (P.audio) P.audio.playbackRate = v;
  try { localStorage.setItem('speed', String(v)); } catch {}
}
const cycleSpeed = () => setSpeed(SPEEDS[(SPEEDS.indexOf(SPEED) + 1) % SPEEDS.length]);
$('bSpeed').onclick = cycleSpeed;
setSpeed(SPEED);
"""),
    ("  else if (k === 'f' || k === 'F' || e.code === 'KeyF') toggleFull();",
     "  else if (k === 'f' || k === 'F' || e.code === 'KeyF') toggleFull();\n  else if (k === 'x' || k === 'X' || e.code === 'KeyX') cycleSpeed();"),
]
CSS = """
/* Book additions: playback speed and starting a step mid-way (tools/therapeutic-exercise/player_patch.py). */
.icon.speed { width: auto; min-width: 58px; padding: 0 12px; border-radius: 22px; color: var(--dim); font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
.icon.speed.on { background: var(--quiz); border-color: var(--quiz); color: #10242e; }
.seg::after { content: ""; position: absolute; top: 0; bottom: 0; left: var(--hx, -9px); width: 3px; margin-left: -1px; background: var(--task); opacity: 0; pointer-events: none; }
.seg:hover::after { opacity: 1; }
/* A text grid with five or more choices wraps its buttons, so the row text keeps room. */
.screen .grid.text .opts:has(> .opt:nth-child(5)) { flex-wrap: wrap; max-width: 700px; justify-content: flex-end; }
.screen .grid.text .opts:has(> .opt:nth-child(5)) > .opt { min-height: 42px; }
"""

js = Path(sys.argv[1])
s = js.read_text(encoding="utf-8")
missing = []
for old, new in JS:
    if new in s:
        continue
    if old not in s:
        missing.append(old.splitlines()[0])
        continue
    s = s.replace(old, new, 1)
if missing:
    sys.exit("Not found (run localize_ru.py first, or the engine changed):\n  " + "\n  ".join(missing))
js.write_text(s, encoding="utf-8")
css = js.with_name("engine.css")
c = css.read_text(encoding="utf-8")
add = [rule for rule in CSS.strip("\n").split("\n") if rule.startswith(("/*", ".")) and rule not in c]
if add:   # append only the rules (and their comments) that are not there yet
    css.write_text(c.rstrip("\n") + "\n\n" + "\n".join(add) + "\n", encoding="utf-8")
print(f"{js}: player additions applied")
