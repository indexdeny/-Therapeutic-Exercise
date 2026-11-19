'use strict';
// A lesson moment in a frame: the lesson page itself (same site), without its bar and cover, playing from t0 and pausing at t1,
// driven by the lesson's own hideCover, seek and setPlaying. Used by the atlas, the glossary and the review's term cards;
// each player owns one iframe and one control row.
const MO3 = {
  early: .05,                                                                  // pause this long before the end of a moment
  progress: 'animebook:progress:' + new URL('../', location.href).pathname,   // the contents' «last lesson» (engine.js)
  embed: '#bar, #cover, #soundNote, #help, .paused-mark { display: none !important; }'
    + ' #frame { top: 50% !important; height: 900px !important; transform: translate(-50%, -50%) scale(var(--ka, .3)) !important; }'
    + ' @view-transition { navigation: none; }',   // a lesson switch in the frame: Chromium sometimes aborts the lessons' transition
};
const moTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const moLesson = n => `../ch${String(n).padStart(3, '0')}/`;
// Opening a lesson records it as the contents' «last lesson»; a moment must not change that.
function moKeep(v) {
  try {
    if (v === undefined) return localStorage.getItem(MO3.progress);
    if (v === null) localStorage.removeItem(MO3.progress); else localStorage.setItem(MO3.progress, v);
  } catch {}
  return null;
}
// The frame and its control row, for pages that make players on the fly.
function momentEl() {
  const root = document.createElement('div');
  root.className = 'moment';
  root.innerHTML = '<div class="pv-frame"><iframe title="Момент урока" allow="autoplay"></iframe>'
    + '<button class="pv-sound" type="button" hidden>▶ Включить звук</button></div>'
    + '<div class="pv-ctl"><button class="pv-play" type="button" aria-label="Пуск или пауза">▶</button><span class="pv-now">0:00</span>'
    + '<span class="pv-bar"><i></i></span><span class="pv-dur"></span></div>';
  const q = s => root.querySelector(s);
  return { root, ui: { frame: q('iframe'), sound: q('.pv-sound'), play: q('.pv-play'), now: q('.pv-now'), bar: q('.pv-bar i'), dur: q('.pv-dur') } };
}
// ui: { frame, sound, play, now, bar, dur }. The player's fields: mo (the moment: n, i, t0, t1), n, w, P (the lesson in the
// frame, its window and player state), stop (pause at the end of the moment), ended (paused there), live (frames are watched).
function momentPlayer(ui) {
  const M = { mo: null, n: 0, w: null, P: null, stop: true, ended: false, live: true };
  const seekMo = play => { M.w.hideCover(); M.w.seek(M.mo.i, play, M.mo.t0); };
  // The lesson page in the frame, without its bar and cover, scaled to the frame; the same lesson is reused.
  M.load = (mo, play = true) => {
    Object.assign(M, { mo, stop: true, ended: false });
    ui.dur.textContent = moTime(mo.t1 - mo.t0);
    if (M.n === mo.n && M.P) return seekMo(play);
    const keep = moKeep();
    M.n = mo.n;
    M.P = null;
    ui.frame.onload = () => {
      moKeep(keep);
      const w = M.w = ui.frame.contentWindow, d = w.document, s = d.createElement('style');
      M.P = w.eval('P');                       // P is a top-level const of engine.js, not a property of window
      s.textContent = MO3.embed;
      d.head.appendChild(s);
      const fit = () => d.documentElement.style.setProperty('--ka', Math.min(w.innerWidth / 1600, w.innerHeight / 900));
      fit();
      w.addEventListener('resize', fit);
      if (M.mo) seekMo(play);
    };
    ui.frame.src = moLesson(mo.n);
  };
  M.pause = () => { if (M.P) M.w.setPlaying(false); };
  M.more = () => { if (!M.P) return; M.stop = false; M.ended = false; M.w.setPlaying(true); };   // play on past the moment
  M.close = () => { M.pause(); M.live = false; };
  const tick = () => {
    if (!M.live) return;
    requestAnimationFrame(tick);
    const P = M.P, mo = M.mo;
    if (!P || !mo || M.n !== mo.n) return;
    if (M.stop && !M.ended && P.playing) {
      if (P.i === mo.i && P.t >= mo.t1 - MO3.early) { M.w.setPlaying(false); M.ended = true; }
      else if (P.i > mo.i) { M.w.seek(mo.i, false, mo.t1 - MO3.early); M.ended = true; }   // the step ended between two ticks
    }
    const len = mo.t1 - mo.t0, t = P.i === mo.i ? P.t - mo.t0 : P.i > mo.i ? len : 0;
    ui.bar.style.width = (M.ended ? 100 : 100 * Math.max(0, Math.min(1, t / len))) + '%';
    ui.now.textContent = moTime(Math.max(0, t));
    ui.play.textContent = P.playing ? '❚❚' : '▶';
    ui.sound.hidden = !P.afail;
  };
  ui.play.addEventListener('click', () => {
    if (!M.P) return;
    if (M.ended && M.stop) { M.ended = false; M.w.seek(M.mo.i, true, M.mo.t0); } else M.w.setPlaying(!M.P.playing);
  });
  ui.sound.addEventListener('click', () => {   // the browser did not let the sound start: start it again from here
    if (!M.P) return;
    M.P.afail = false;
    M.w.document.getElementById('soundNote').hidden = true;
    M.w.seek(M.P.i, true, M.P.t);
  });
  requestAnimationFrame(tick);
  return M;
}
