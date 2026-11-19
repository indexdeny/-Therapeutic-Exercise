// Shared drawing for the book «Лечебные упражнения»: text helpers, the mannequin figure (rig v2) and anatomy layers.
// Load after engine.js and before the lesson script. Lessons must not redeclare these names.
'use strict';

const PANEL = '#22322d', EDGE = '#3a5047';
const rad = d => d * Math.PI / 180;
const lerp = (a, b, q) => a + (b - a) * q;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Anatomy colours, the same in every lesson: muscle coral, bone chalk, tendon/ligament/capsule pale yellow.
const ANAT = { muscle: '#f4a48c', muscleDeep: '#d9826c', bone: '#ece8dc', tendon: '#f1dfa0', taut: '#ffd75e', skin: '#ece8dc' };

/* ---------- text ---------- */
function txt(p, str, x, y, t0, { size = 30, fill = COL.chalk, anchor = 'start', weight = 500, font = UI, italic = false } = {}) {
  const e = T(p, str, { x, y, size, fill, anchor, weight, font, o: 0 });
  if (italic) e.setAttribute('font-style', 'italic');
  if (t0 !== null) show(e, t0);
  return e;
}
// Wrapped text: a word that would pass maxW starts a new line. The group has _h (height of its lines).
function para(p, str, x, y, t0, { size = 28, lh = 1.32, maxW = 600, fill = COL.chalk, weight = 500, anchor = 'start' } = {}) {
  const out = [];
  let cur = '';
  for (const w of str.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && uiW(t, size) > maxW) { out.push(cur); cur = w; } else cur = t;
  }
  out.push(cur);
  const g = G(p, { o: 0 });
  out.forEach((l, i) => T(g, l, { x, y: y + i * size * lh, size, fill, weight, anchor }));
  g._h = out.length * size * lh;
  if (t0 !== null) show(g, t0);
  return g;
}
// A rounded tag centred on (x, y).
function pill(p, str, x, y, t0, { col = COL.whole, size = 22, fill = null } = {}) {
  const w = uiW(str, size) + 30, g = G(p, { x, y, o: 0 });
  mk('rect', { x: -w / 2, y: -size * 1.05, width: w, height: size * 1.55, rx: size * .78, fill: COL.board, stroke: col, 'stroke-width': 2.2 }, g);
  T(g, str, { x: 0, y: 0, size, fill: fill || col, weight: 600, anchor: 'middle' });
  if (t0 !== null) show(g, t0, .4);
  return g;
}
const roundBox = (g, x, y, w, h, stroke = EDGE, fill = PANEL, sw = 2) => mk('rect', { x, y, width: w, height: h, rx: 22, fill, stroke, 'stroke-width': sw }, g);
function badge(p, n, x, y, col) {
  const g = G(p, { x, y });
  mk('circle', { r: 24, fill: col }, g);
  T(g, String(n), { x: 0, y: 10, size: 28, fill: COL.board, weight: 700, anchor: 'middle' });
  return g;
}

/* ---------- marks ---------- */
// A drawn arrow along a quadratic curve from a to b (control point c).
function arrowTo(p, a, b, t0, { c = null, col = COL.dim, w = 3.5, dur = .7 } = {}) {
  const [cx, cy] = c || [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const g = G(p);
  draw(path(g, `M${a[0]} ${a[1]}Q${cx} ${cy} ${b[0]} ${b[1]}`, { stroke: col, 'stroke-width': w }, { d: 0 }), t0, dur);
  const ang = Math.atan2(b[1] - cy, b[0] - cx), ux = Math.cos(ang), uy = Math.sin(ang);
  const hd = path(g, `M${b[0] - 17 * ux - 10 * uy} ${b[1] - 17 * uy + 10 * ux}L${b[0]} ${b[1]}L${b[0] - 17 * ux + 10 * uy} ${b[1] - 17 * uy - 10 * ux}`, { stroke: col, 'stroke-width': w }, { o: 0 });
  show(hd, t0 + dur - .12, .2);
  return g;
}
function cross(p, x, y, r, t0, w = 9) {
  const g = G(p);
  draw(path(g, `M${x - r} ${y - r}L${x + r} ${y + r}`, { stroke: COL.bad, 'stroke-width': w }, { d: 0 }), t0, .28);
  draw(path(g, `M${x + r} ${y - r}L${x - r} ${y + r}`, { stroke: COL.bad, 'stroke-width': w }, { d: 0 }), t0 + .24, .28);
  return g;
}
const checkMark = (p, x, y, t0, col = COL.good, k = 1) => draw(path(p, `M${x - 11 * k} ${y}l${8 * k} ${9 * k}l${15 * k} ${-19 * k}`, { stroke: col, 'stroke-width': 5 }, { d: 0 }), t0, .3);
const ground = (p, x1, x2, y, t0) => show(path(p, `M${x1} ${y}H${x2}`, { stroke: COL.faint, 'stroke-width': 3 }, { o: 0 }), t0);
// Run fn once when the lesson clock reaches t (also on every replay past t): relabel, recolour, swap content.
const whenAt = (t, fn) => prog(q => { if (q >= 1) fn(); }, t, .01, lin);
// A rounded box with a bold first line and dimmer lines under it, centred on (x, y); hidden until t0.
function labelBox(p, x, y, w, lines, col, t0, { size = 26 } = {}) {
  const h = 26 + lines.length * size * 1.25, g = G(p, { o: 0 });
  mk('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 16, fill: COL.board, stroke: col, 'stroke-width': 3 }, g);
  lines.forEach((l, i) => T(g, l, { x, y: y + (i - (lines.length - 1) / 2) * size * 1.25 + size * .35, size: i ? size - 4 : size, weight: i ? 500 : 700, fill: i ? COL.dim : col, anchor: 'middle' }));
  if (t0 !== null) show(g, t0);
  return g;
}

/* ---------- info cards ---------- */
// A card with a bold title and a sentence. In the short mode (the default) the sentence gives way to a key-word line,
// opts.short or the lesson's CARDS_SHORT table (key: title + '\n' + body), and the box fits it, centred where the full card was.
// T switches every card of the page; the choice is kept for the whole book, and ?cards=short|full overrides it.
const CARDS3 = { store: 'animebook:cards', size: 25, top: 42, gap: 50, pad: 26, lines: 2 };
let CARDS_MODE = null;
const CARD_REG = new Set();
function cardsMode() {
  if (CARDS_MODE) return CARDS_MODE;
  let m = new URLSearchParams(location.search).get('cards');
  if (m !== 'short' && m !== 'full') { m = null; try { m = localStorage.getItem(CARDS3.store); } catch {} }
  return (CARDS_MODE = m === 'full' ? 'full' : 'short');
}
function cardsSet(m) {
  CARDS_MODE = m;
  try { localStorage.setItem(CARDS3.store, m); } catch {}
  CARD_REG.forEach(g => { if (g.isConnected) g._mode(m); else CARD_REG.delete(g); });
}
// The T key (Е on the Russian layout); not while typing in a field or with the key list open.
function cardsKey(e) {
  if (e.code !== 'KeyT' || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  const help = document.getElementById('help');
  if (help && !help.hidden) return;
  e.preventDefault();
  cardsSet(cardsMode() === 'short' ? 'full' : 'short');
}
document.addEventListener('keydown', cardsKey);
function infoCard(p, x, y, w, h, title, body, col, t0, { size = 23, textW = w - 44, short = null } = {}) {
  const g = G(p, { o: 0 });
  const box = roundBox(g, x, y, w, h, col, PANEL, 2.5);
  const tt = put(para(g, title, x + 22, y + CARDS3.top, null, { size: 26, weight: 700, fill: col, maxW: textW }), { o: 1 });
  const full = body ? put(para(g, body, x + 22, y + 50 + tt._h, null, { size, fill: COL.chalk, maxW: textW }), { o: 1 }) : null;
  let sh = short;
  if (sh == null && body && typeof CARDS_SHORT !== 'undefined') sh = CARDS_SHORT[title + '\n' + body] || null;
  if (t0 !== null) show(g, t0);
  g._card = { title, body, short: null, w, h, textW, own: g.childElementCount };
  if (!full || !sh) return g;
  const ss = Math.max(CARDS3.size, size), sp = para(g, sh, x + 22, 0, null, { size: ss, fill: COL.chalk, maxW: textW });
  while (sp.childElementCount > CARDS3.lines) sp.lastChild.remove();
  const hs = CARDS3.gap + tt._h + (sp.childElementCount - 1) * ss * 1.32 + CARDS3.pad, ys = y + h / 2 - hs / 2;
  put(sp, { y: ys + CARDS3.gap + tt._h, o: 0 });
  Object.assign(g._card, { short: sh, hs, ys, own: g.childElementCount });
  g._mode = m => {
    const s = m === 'short';
    box.setAttribute('y', s ? ys : y); box.setAttribute('height', s ? hs : h);
    put(tt, { y: s ? ys - y : 0 }); put(full, { o: s ? 0 : 1 }); put(sp, { o: s ? 1 : 0 });
  };
  CARD_REG.add(g);
  g._mode(cardsMode());
  return g;
}

/* ---------- solid shapes with cylinder shading ---------- */
let SHADE_ID = 0;
const LIGHT = [-.5, -.86];                      // light from the upper left, in the shape's own coordinates
// A gradient across a limb: light side, base, shadow side. Returns its url and a function that aims it.
function shadeGrad(defs, base) {
  const id = 'sh' + (++SHADE_ID), gr = mk('linearGradient', { id, gradientUnits: 'userSpaceOnUse' }, defs);
  [[0, mix(base, '#ffffff', .5)], [.42, base], [1, mix(base, '#000000', .5)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  const aim = (A, B, r) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const s = nx * LIGHT[0] + ny * LIGHT[1] > 0 ? 1 : -1, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    gr.setAttribute('x1', (mx + s * nx * r).toFixed(1)); gr.setAttribute('y1', (my + s * ny * r).toFixed(1));
    gr.setAttribute('x2', (mx - s * nx * r).toFixed(1)); gr.setAttribute('y2', (my - s * ny * r).toFixed(1));
  };
  return { url: `url(#${id})`, aim };
}
// Outline of a tapered capsule from A (radius ra) to B (radius rb).
function capsuleD(A, B, ra, rb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
  const f = v => v.toFixed(1);
  return `M${f(A[0] + nx * ra)} ${f(A[1] + ny * ra)}L${f(B[0] + nx * rb)} ${f(B[1] + ny * rb)}A${rb} ${rb} 0 0 0 ${f(B[0] - nx * rb)} ${f(B[1] - ny * rb)}` +
    `L${f(A[0] - nx * ra)} ${f(A[1] - ny * ra)}A${ra} ${ra} 0 0 0 ${f(A[0] + nx * ra)} ${f(A[1] + ny * ra)}Z`;
}
// A shaded capsule element; set(A, B) moves it.
function limbEl(parent, defs, base, ra, rb, outline) {
  const sh = shadeGrad(defs, base), e = mk('path', { fill: sh.url, stroke: outline, 'stroke-width': 2, 'stroke-linejoin': 'round' }, parent);
  return { e, set(A, B) { e.setAttribute('d', capsuleD(A, B, ra, rb)); sh.aim(A, B, Math.max(ra, rb)); } };
}

/* ---------- fig: a shaded mannequin in side view (rig v2) ---------- */
// Pose angles in degrees. t: trunk lean (+ forward); hd: head tilt (+ down); aN/eN, aF/eF: shoulder and elbow flexion
// of the near/far arm (relative to the trunk); hN/kN/fN, hF/kF/fF: hip flexion, knee flexion, ankle dorsiflexion.
// (0,0) is the hip joint; standing, the ankles are 182 below it (× scale). The foot is drawn with its sole at
// the ankle point, so an ankle placed on a line stands on it. dir 1 faces right, −1 left.
const RIG = { th: 92, sh: 90, ft: 30, tr: 118, nk: 12, hr: 25, ua: 72, fa: 66, hand: 22 };
const STAND = { t: 0, hd: 0, aN: 10, eN: 16, aF: -8, eF: 12, hN: 4, kN: 2, fN: 0, hF: -4, kF: 2, fF: 0 };
const SIT = { ...STAND, t: 12, aN: 32, eN: 55, aF: 32, eF: 55, hN: 100, kN: 95, fN: 5, hF: 100, kF: 95, fF: 5 };
const STEP = { ...STAND, t: 10, aN: -12, eN: 20, aF: 22, eF: 20, hN: 58, kN: 72, fN: 24, hF: 0, kF: 4, fF: 14 };   // both feet flat
const SINGLE = { ...STAND, aN: 28, eN: 12, aF: -22, eF: 12, hF: 62, kF: 85, fF: -10 };
const SQUAT = { ...STAND, t: 32, hd: -12, aN: 122, aF: 122, hN: 92, kN: 95, fN: 25, hF: 92, kF: 95, fF: 25 };
const REACH = { ...STAND, aN: 168, eN: 6 };
// Whole body tilted forward by d degrees about the ankles (feet flat): the ankle strategy of balance.
const LEAN = d => ({ ...STAND, t: d, hN: 0, hF: 0, kN: 0, kF: 0, fN: d, fF: d, aN: d + 8, aF: d - 6 });
const STRIDE = { ...STAND, t: 4, aN: -14, eN: 18, aF: 18, eF: 18, hN: 25, kN: 5, fN: -16, hF: -12, kF: 0, fF: 16 };   // a step forward, both feet flat
function fig(parent, { x = 0, y = 0, s = 1, o = 1, r = 0, dir = 1, col = '#d8d1c1', pose = {} } = {}) {
  const g = G(parent, { x, y, s, o, r });
  const defs = mk('defs', {}, g), farCol = mix(col, COL.board, .42), line = mix(col, COL.board, .62), lineF = mix(farCol, COL.board, .5);
  const f = { g, dir, s, col, pose: { ...STAND, ...pose }, pts: {} };
  const L = (c, ra, rb, ln) => limbEl(g, defs, c, ra, rb, ln);
  // back to front: far arm, far leg, neck, torso, head, near leg, near arm
  f.parts = {
    uaF: L(farCol, 10.5, 8.5, lineF), faF: L(farCol, 8.5, 6.5, lineF), hdF: L(farCol, 7, 6, lineF),
    thF: L(farCol, 16, 11.5, lineF), shF: L(farCol, 11.5, 7.5, lineF), ftF: L(farCol, 7.5, 5, lineF),
    neck: L(col, 9, 9, line), torso: L(col, 23, 28, line),
  };
  const hg = mk('radialGradient', { id: 'hd' + (++SHADE_ID), cx: .38, cy: .32, r: .78 }, defs);
  [[0, mix(col, '#ffffff', .5)], [.55, col], [1, mix(col, '#000000', .45)]].forEach(([o2, c]) => mk('stop', { offset: o2, 'stop-color': c }, hg));
  f.head = mk('circle', { r: RIG.hr, fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2 }, g);
  f.nose = mk('circle', { r: 5.5, fill: col, stroke: line, 'stroke-width': 1.5 }, g);
  Object.assign(f.parts, {
    thN: L(col, 16.5, 12, line), shN: L(col, 12, 8, line), ftN: L(col, 8, 5, line),
    uaN: L(col, 11, 9, line), faN: L(col, 9, 7, line), hdN: L(col, 7.5, 6.5, line),
  });
  f.onSet = [];   // functions called after every pose change, e.g. an overlay that follows the figure
  f.set = p => { Object.assign(f.pose, p); figDraw(f); f.onSet.forEach(fn => fn(f)); return f; };
  figDraw(f);
  if (anatEnabled()) { ANAT_FIGS.add(f); if (ANAT_ALL) anatFig(f, true); }
  bioReg(f);
  return f;
}
function figDraw(f) {
  const p = f.pose, d = f.dir, P = f.parts;
  const at = (A, len, ang) => [A[0] + d * len * Math.sin(rad(ang)), A[1] + len * Math.cos(rad(ang))];
  const H = [0, 0], Sh = at(H, RIG.tr, 180 - p.t), hAng = 180 - p.t - p.hd, Nk = at(Sh, RIG.nk + 6, hAng), Hc = at(Sh, RIG.nk + RIG.hr, hAng);
  const arm = (a, e) => { const E = at(Sh, RIG.ua, a - p.t), W = at(E, RIG.fa, a - p.t + e); return [E, W, at(W, RIG.hand, a - p.t + e + 8)]; };
  const leg = (h, k, a) => {
    const K = at(H, RIG.th, h - p.t), sa = h - p.t - k, A = at(K, RIG.sh, sa), fa = sa + 90 + a;
    const up = (P, r) => at(P, -r, sa);                                  // lift the foot along the shank by its radius
    return [K, A, at(A, RIG.ft, fa), at(A, 7, fa + 180), up];
  };
  const [EN, WN, XN] = arm(p.aN, p.eN), [EF, WF, XF] = arm(p.aF, p.eF);
  const [KN, AN, toeN, heelN, upN] = leg(p.hN, p.kN, p.fN), [KF, AF, toeF, heelF, upF] = leg(p.hF, p.kF, p.fF);
  P.uaF.set(Sh, EF); P.faF.set(EF, WF); P.hdF.set(WF, XF);
  P.thF.set(H, KF); P.shF.set(KF, AF); P.ftF.set(upF(heelF, 7.5), upF(toeF, 5));
  P.neck.set(Sh, Nk); P.torso.set(H, Sh);
  P.thN.set(H, KN); P.shN.set(KN, AN); P.ftN.set(upN(heelN, 8), upN(toeN, 5));
  P.uaN.set(Sh, EN); P.faN.set(EN, WN); P.hdN.set(WN, XN);
  f.head.setAttribute('cx', Hc[0].toFixed(1)); f.head.setAttribute('cy', Hc[1].toFixed(1));
  const Ns = at(Hc, RIG.hr - 1, hAng - 92);
  f.nose.setAttribute('cx', Ns[0].toFixed(1)); f.nose.setAttribute('cy', Ns[1].toFixed(1));
  Object.assign(f.pts, { H, Sh, Hc, EN, WN, XN, EF, WF, XF, KN, AN, toeN, heelN, KF, AF, toeF, heelF });
}
// Rotate a vector by r degrees (SVG rotation: clockwise on screen).
const rotPt = (x, y, r) => { const c = Math.cos(rad(r)), sn = Math.sin(rad(r)); return [x * c - y * sn, x * sn + y * c]; };
// Stage point of a figure point; works for rotated (lying) figures too.
const onStage = (f, k) => { const s = st(f.g), [x, y] = rotPt(f.pts[k][0] * f.s, f.pts[k][1] * f.s, s.r || 0); return [s.x + x, s.y + y]; };
// Keep one ankle at a fixed point (in the figure's parent) while the pose changes.
function plant(f, k, ax, ay) { const [x, y] = rotPt(f.pts[k][0] * f.s, f.pts[k][1] * f.s, st(f.g).r || 0); put(f.g, { x: ax - x, y: ay - y }); f.onSet.forEach(fn => fn(f)); }
// Tween to a pose. keep = [ankle key, x, y] holds that foot still. Schedule one figure's tweens in time order:
// replays evaluate them in the order they were added.
function poseTo(f, to, t0, dur = .8, ease = io, keep = null) {
  let from = null;
  prog(q => {
    if (!from) from = { ...f.pose };
    const p = {};
    for (const k in to) p[k] = lerp(from[k], to[k], q);
    f.set(p);
    if (keep) plant(f, ...keep);
  }, t0, dur, ease);
}
// Walking or running in side view; the stride fades in and out, so the figure starts and ends standing.
function gaitPose(w, e, running) {
  const s = Math.sin(w), c = Math.cos(w), A = running ? 34 : 22;
  return running
    ? { ...STAND, t: 12 * e, hN: e * (10 + A * s), hF: e * (10 - A * s), kN: e * (20 + 75 * Math.max(0, c) ** 2), kF: e * (20 + 75 * Math.max(0, -c) ** 2), aN: e * (12 - 40 * s), aF: e * (12 + 40 * s), eN: 90 * e, eF: 90 * e }
    : { ...STAND, t: 3 * e, hN: lerp(STAND.hN, A * s, e), hF: lerp(STAND.hF, -A * s, e), kN: e * (6 + 40 * Math.max(0, c) ** 2), kF: e * (6 + 40 * Math.max(0, -c) ** 2), aN: lerp(STAND.aN, 3 - 18 * s, e), aF: lerp(STAND.aF, 3 + 18 * s, e), eN: lerp(STAND.eN, 15, e), eF: lerp(STAND.eF, 15, e) };
}
function walk(f, t0, dur, { cycles = 2, dx = 0, running = false } = {}) {
  let x0 = null, y0 = null;
  prog(q => {
    if (x0 === null) ({ x: x0, y: y0 } = st(f.g));
    const w = 2 * Math.PI * cycles * q, e = Math.min(1, q * cycles * 2, (1 - q) * cycles * 2);
    f.set(gaitPose(w, e, running));
    put(f.g, { x: x0 + dx * q, y: y0 - e * (running ? 7 : 3) * Math.abs(Math.sin(w)) * f.s });
  }, t0, dur, lin);
}
// Repeat a movement n times between STAND and pose; keep holds a foot still.
function repeatPose(f, pose, t0, dur, n, keep = null) {
  prog(q => {
    const e = (1 - Math.cos(2 * Math.PI * n * q)) / 2, p = {};
    for (const k in pose) p[k] = lerp(STAND[k], pose[k], e);
    f.set(p);
    if (keep) plant(f, ...keep);
  }, t0, dur, lin);
}
// A pulsing spot on the near knee: pain or another symptom.
function painAt(f, t0) {
  const [kx, ky] = f.pts.KN, g = G(f.g, { x: kx, y: ky, s: 0, o: 0 });
  mk('circle', { r: 21, fill: COL.bad, 'fill-opacity': .35, stroke: COL.bad, 'stroke-width': 5 }, g);
  pop(g, t0); pulse(g, t0 + .7, 1.45); pulse(g, t0 + 1.8, 1.3);
  return g;
}

// A figure steps up a stair that is drawn exactly under its near foot; the far foot stays at (x, groundY).
// Measures the STEP pose first, so the step height and position follow the figure's size.
function stepUp(p, x, groundY, s, t0, { dur = 1.1, col = COL.dim } = {}) {
  const f = fig(p, { x, y: groundY - 182 * s, s });
  f.set(STEP); plant(f, 'AF', x, groundY);
  const [hx, hy] = onStage(f, 'heelN'), [tx] = onStage(f, 'toeN'), h = groundY - hy;
  f.set(STAND); plant(f, 'AF', x, groundY);
  const e = path(p, `M${x - 70 * s} ${groundY}H${hx - 8 * s}V${hy}H${tx + 18 * s}V${hy - h}H${tx + 90 * s}`, { stroke: col, 'stroke-width': 4 }, { d: 0 });
  draw(e, t0, .6);
  poseTo(f, STEP, t0 + .6, dur, io, ['AF', x, groundY]);
  return f;
}

// Centre of mass of the figure (segment weights, approximately), in the figure's parent coordinates.
function comOf(f) {
  const P = f.pts, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const parts = [[P.Hc, .08], [mid(P.H, P.Sh), .46], [mid(P.H, P.KN), .1], [mid(P.H, P.KF), .1], [mid(P.KN, P.AN), .05], [mid(P.KF, P.AF), .05],
    [mid(P.Sh, P.WN), .05], [mid(P.Sh, P.WF), .05], [P.AN, .03], [P.AF, .03]];
  let x = 0, y = 0;
  for (const [q, w] of parts) { x += q[0] * w; y += q[1] * w; }
  const s = st(f.g);
  return [s.x + x * f.s, s.y + y * f.s];
}
// Live balance overlay: the centre of mass (⊕), its plumb line to the ground and the base of support between
// the outermost heel and toe. The base turns yellow, then red, as the plumb line nears and passes its edge.
function balanceOverlay(p, f, groundY, t0) {
  const g = G(p, { o: 0 });
  const bos = mk('path', { stroke: COL.good, 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none' }, g);
  const plumb = mk('path', { stroke: COL.chalk, 'stroke-width': 2.5, 'stroke-dasharray': '7 7', fill: 'none' }, g);
  const foot = mk('circle', { r: 7, fill: COL.chalk }, g);
  const com = G(g);
  mk('circle', { r: 15, fill: COL.board, stroke: COL.task, 'stroke-width': 4 }, com);
  mk('path', { d: 'M-15 0H15M0 -15V15', stroke: COL.task, 'stroke-width': 3 }, com);
  const o = { g, com, inside: true, margin: 0 };
  const upd = () => {
    const [cx, cy] = comOf(f);
    const xs = ['toeN', 'heelN', 'toeF', 'heelF'].map(k => onStage(f, k)).filter(q => Math.abs(q[1] - groundY) < 12 * f.s + 6).map(q => q[0]);
    const a = Math.min(...xs), b = Math.max(...xs);
    o.margin = Math.min(cx - a, b - cx); o.inside = o.margin >= 0;
    const col = o.margin > 10 ? COL.good : o.margin >= 0 ? COL.int : COL.bad;
    bos.setAttribute('d', `M${a.toFixed(1)} ${groundY + 9}H${b.toFixed(1)}`); bos.setAttribute('stroke', col);
    plumb.setAttribute('d', `M${cx.toFixed(1)} ${cy.toFixed(1)}V${groundY}`);
    foot.setAttribute('cx', cx.toFixed(1)); foot.setAttribute('cy', groundY + 9); foot.setAttribute('fill', col);
    put(com, { x: cx, y: cy });
  };
  f.onSet.push(upd); upd();
  show(g, t0);
  return o;
}

/* ---------- small props ---------- */
function chair(p, hx, seatY, groundY, t0) {
  return show(path(p, `M${hx - 46} ${seatY - 82}V${seatY}H${hx + 34}M${hx - 40} ${seatY}V${groundY}M${hx + 28} ${seatY}V${groundY}`, { stroke: COL.dim, 'stroke-width': 5 }, { o: 0 }), t0);
}
function stairs(p, x, y, n, w, h, t0, col = COL.dim) {
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += `h${w}v${-h}`;
  const e = path(p, d + `h${w}`, { stroke: col, 'stroke-width': 4 }, { d: 0 });
  draw(e, t0, .8);
  return e;
}

/* ---------- anatomy layers ---------- */
// A muscle between attachment points A and B: a belly with a tendon at each end. The belly keeps its volume,
// so it thins when stretched and thickens when short. set(A, B) returns the strain (length / rest − 1).
function muscleEl(parent, { rest, w = 15, col = ANAT.muscle, tendon = .2, shape = 'belly', sensor = false } = {}) {
  const g = mk('g', {}, parent);
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-width': 0, 'stroke-opacity': .5, 'stroke-linejoin': 'round' }, g);
  const ten = mk('path', { fill: 'none', stroke: ANAT.tendon, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
  const belly = mk('path', { fill: col, stroke: mix(col, '#000000', .35), 'stroke-width': 1.5 }, g);
  const fib = mk('path', { fill: 'none', stroke: mix(col, '#ffffff', .4), 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-opacity': .8 }, g);
  const m = { g, rest, strain: 0, level: 0, last: null, shape, k: 1, L: rest, col: null };
  const anat = anatEnabled();
  if (anat) glow.setAttribute('display', 'none');                       // the live anatomy marks modes by colour, not by a glow
  if (sensor) [glow, ten, belly, fib].forEach(e => e.setAttribute('display', 'none'));   // drawn by the glass figure instead
  m.act = v => { m.level = v; if (m.last) m.set(...m.last); };   // activation 0..1: the muscle contracts and glows red
  m.set = (A, B) => {
    m.last = [A, B];
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    m.L = L;
    const P1 = [A[0] + ux * L * tendon, A[1] + uy * L * tendon], P2 = [B[0] - ux * L * tendon, B[1] - uy * L * tendon];
    const h = anat ? w * m.k : clamp(w * (rest / L) ** 1.5, w * .45, w * 1.7), M = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
    const f = v => v.toFixed(1), Q = k => `${f(M[0] + nx * 2 * h * k)} ${f(M[1] + ny * 2 * h * k)}`;
    if (shape === 'ribbon') {   // a slightly bowed band: full width in the middle, a third of it at the ends
      const N = 12, bow = Math.min((L - 2 * L * tendon) * .06, 10), up = [], dn = [], mid = [[], [], []];
      for (let i = 0; i <= N; i++) {
        const s = i / N, sn = Math.sin(Math.PI * s), hw = h * (.35 + .65 * sn);
        const cx = P1[0] + (P2[0] - P1[0]) * s + nx * bow * sn, cy = P1[1] + (P2[1] - P1[1]) * s + ny * bow * sn;
        up.push(`${f(cx + nx * hw)} ${f(cy + ny * hw)}`); dn.push(`${f(cx - nx * hw)} ${f(cy - ny * hw)}`);
        [-.45, 0, .45].forEach((o, j) => mid[j].push(`${f(cx + nx * hw * o)} ${f(cy + ny * hw * o)}`));
      }
      belly.setAttribute('d', 'M' + up.join('L') + 'L' + dn.reverse().join('L') + 'Z');
      fib.setAttribute('d', mid.map(l => 'M' + l.join('L')).join(''));
    } else {
      belly.setAttribute('d', `M${f(P1[0])} ${f(P1[1])}Q${Q(1)} ${f(P2[0])} ${f(P2[1])}Q${Q(-1)} ${f(P1[0])} ${f(P1[1])}Z`);
      fib.setAttribute('d', [-.45, 0, .45].map(k => `M${f(P1[0] + ux * 8)} ${f(P1[1] + uy * 8)}Q${Q(k)} ${f(P2[0] - ux * 8)} ${f(P2[1] - uy * 8)}`).join(''));
    }
    glow.setAttribute('d', belly.getAttribute('d'));
    ten.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(P1[0])} ${f(P1[1])}M${f(P2[0])} ${f(P2[1])}L${f(B[0])} ${f(B[1])}`);
    m.strain = L / rest - 1;
    if (!anat) {
      const s = clamp(m.strain / .12, 0, 1) * (1 - m.level), a = m.level;   // stretched: brighter, yellow glow; active: red
      belly.setAttribute('fill', mix(mix(col, '#ffd2c4', s * .6), '#ff5a3c', a * .75));
      glow.setAttribute('stroke', a > s ? '#ff5a3c' : ANAT.taut);
      glow.setAttribute('stroke-width', (Math.max(s, a) * 10).toFixed(1));
      ten.setAttribute('stroke', mix(ANAT.tendon, ANAT.taut, s));
    }
    return m.strain;
  };
  if (anat && !sensor) ANAT_REG.add(anatMuscleDisplay(m, belly, fib));
  return m;
}
// A ligament or a joint capsule from A to B. Shorter than its rest length it hangs in a wave (slack);
// at rest length it is straight, bright and thick (taut). set returns the tension 0..1.
function ligEl(parent, { rest, w = 5 } = {}) {
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-opacity': .35, 'stroke-linecap': 'round' }, parent);
  const e = mk('path', { fill: 'none', 'stroke-linecap': 'round' }, parent);
  const l = { rest, tension: 0 };
  l.set = (A, B) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const slack = Math.max(0, rest - L), amp = Math.min(14, Math.sqrt(slack * L) * .5), f = v => v.toFixed(1);
    let d = `M${f(A[0])} ${f(A[1])}`;
    for (let i = 1; i <= 24; i++) {
      const q = i / 24, wv = amp * Math.sin(q * Math.PI * 3) * Math.sin(q * Math.PI);
      d += `L${f(A[0] + dx * q + nx * wv)} ${f(A[1] + dy * q + ny * wv)}`;
    }
    e.setAttribute('d', d); glow.setAttribute('d', d);
    l.tension = clamp(1 - slack / (rest * .12), 0, 1);
    e.setAttribute('stroke', mix(mix(ANAT.tendon, COL.board, .35), ANAT.taut, l.tension));
    e.setAttribute('stroke-width', (w * (.75 + .45 * l.tension)).toFixed(1));
    glow.setAttribute('stroke-width', (w * 3.2 * l.tension).toFixed(1));
    return l.tension;
  };
  return l;
}
// A bone from A to B with rounded ends (epiphyses).
function boneEl(parent, w = 11) {
  const e = mk('path', { fill: 'none', stroke: ANAT.bone, 'stroke-width': w, 'stroke-linecap': 'round' }, parent);
  const ends = [0, 1].map(() => mk('circle', { r: w * .85, fill: ANAT.bone }, parent));
  return { set(A, B) { e.setAttribute('d', `M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}`); [A, B].forEach((P, i) => { ends[i].setAttribute('cx', P[0].toFixed(1)); ends[i].setAttribute('cy', P[1].toFixed(1)); }); } };
}

/* ---------- elbow model: arm in side view, palm up, with flexors, extensor and anterior capsule ---------- */
// Shoulder at (x, y), upper arm to the right. set(angle) bends the elbow: angle is the inside angle between upper arm
// and forearm (180° = fully straight). Exposes pts (S, E, W, labels' anchor points) and strains for labels.
function elbowModel(parent, { x = 0, y = 0, s = 1, upper = 140, fore = 128 } = {}) {
  const g = G(parent, { x, y, s });
  const skinG = mk('g', { opacity: .9 }, g), defs = mk('defs', {}, g), mus = mk('g', {}, g);
  const skin = [limbEl(skinG, defs, '#4b5f57', 31, 25, '#6f857b'), limbEl(skinG, defs, '#4b5f57', 23, 16, '#6f857b'), limbEl(skinG, defs, '#4b5f57', 14, 12, '#6f857b')];
  const hum = boneEl(mus, 10), ul = boneEl(mus, 8);
  const S = [0, 0], E = [upper, 0];
  const at = (P, v, k) => [P[0] + v[0] * k, P[1] + v[1] * k];
  const geo = ang => {
    const ph = rad(180 - ang), F = [Math.cos(ph), -Math.sin(ph)], N = [F[1], -F[0]];   // N: front (flexor) side of the forearm
    return { F, N, W: at(E, F, fore) };
  };
  // attachments [origin on the humerus, insertion on the forearm] for a given elbow angle
  const att = ang => {
    const { F, N } = geo(ang);
    return { brachialis: [[62, -9], at(at(E, F, 16), N, 5)], biceps: [[12, -15], at(at(E, F, 22), N, 8)],
      triceps: [[10, 15], at(at(E, F, -13), N, -8)], capsule: [[upper - 22, -15], at(at(E, F, 19), N, 11)] };
  };
  const len = ([A, B]) => Math.hypot(B[0] - A[0], B[1] - A[1]), mid = att(130);   // muscles at rest length at 130°
  const brachialis = muscleEl(mus, { rest: len(mid.brachialis), w: 10, col: ANAT.muscleDeep, tendon: .15 });
  const biceps = muscleEl(mus, { rest: len(mid.biceps), w: 14 });
  const triceps = muscleEl(mus, { rest: len(mid.triceps), w: 13 });
  const capsule = ligEl(mus, { rest: len(att(172).capsule), w: 5 });   // the anterior capsule tightens near full extension
  const joint = mk('circle', { cx: E[0], cy: E[1], r: 9, fill: COL.board, stroke: ANAT.bone, 'stroke-width': 4 }, mus);
  const m = { g, pts: {}, ang: 150, muscles: { biceps, brachialis, triceps }, capsule };
  m.act = (name, v) => { m.muscles[name].act(v); return m; };   // activation of one muscle, 0..1
  m.set = ang => {
    const { F, N, W } = geo(ang);
    skin[0].set(S, E); skin[1].set(E, W); skin[2].set(W, at(W, F, 26));
    hum.set([6, 0], [upper - 6, 0]); ul.set(at(E, F, -12), W);
    const a = att(ang);
    brachialis.set(...a.brachialis); biceps.set(...a.biceps); triceps.set(...a.triceps); capsule.set(...a.capsule);
    m.ang = ang;
    Object.assign(m.pts, { S, E, W, biceps: [upper * .45, -30], capsule: at(E, N, 18), hand: at(W, F, 14) });
    m.strain = { biceps: biceps.strain, brachialis: brachialis.strain, triceps: triceps.strain, capsule: capsule.tension };
    return m;
  };
  m.set(150);
  return m;
}

/* ---------- ICF diagram (МКФ, рис. 1.2 нарисован заново) ---------- */
// Health condition on top; body functions & structures, activity, participation in the middle; environmental and
// personal factors below, joined to the middle row by a bus line. Drawn around (0, 0), about 1180 × 560, inside a group
// at {x, y, s}. Every part starts hidden; the lesson reveals parts with icf.reveal(key, t0) and relabels them with icf.label().
const ICF_COL = { hc: '#ece8dc', body: '#f4a48c', act: '#86c9e8', part: '#b6dcf0', env: '#8fd6b0', pers: '#f3c95c' };
function icfDiagram(parent, { x = 800, y = 450, s = 1, names = {} } = {}) {
  const g = G(parent, { x, y, s });
  const N = { hc: ['Состояние здоровья', '(болезнь или расстройство)'], body: ['Функции и структуры', 'организма'], act: ['Активность'], part: ['Участие'],
    env: ['Факторы среды'], pers: ['Личностные факторы'], ...names };
  const POS = { hc: [0, -220, 440], body: [-430, -20, 330], act: [0, -20, 300], part: [430, -20, 300], env: [-230, 200, 360], pers: [230, 200, 360] };
  const lines = G(g, { o: 0 }), boxes = {};
  const dbl = (a, b) => {   // a double-headed connector
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, h = (P, sx) => `M${P[0] + sx * (12 * ux - 7 * uy)} ${P[1] + sx * (12 * uy + 7 * ux)}L${P[0]} ${P[1]}L${P[0] + sx * (12 * ux + 7 * uy)} ${P[1] + sx * (12 * uy - 7 * ux)}`;
    mk('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}${h(a, 1)}${h(b, -1)}`, stroke: COL.dim, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, lines);
  };
  dbl([-150, -180], [-380, -62]); dbl([0, -180], [0, -62]); dbl([150, -180], [380, -62]);
  dbl([-262, -20], [-152, -20]); dbl([152, -20], [278, -20]);
  mk('path', { d: 'M-430 92H430M-230 92V160M230 92V160', stroke: COL.dim, 'stroke-width': 3, fill: 'none' }, lines);
  [-430, 0, 430].forEach(bx => dbl([bx, 92], [bx, 24]));
  for (const k in POS) {
    const [bx, by, w] = POS[k], b = G(g, { x: bx, y: by, o: 0 }), h = N[k].length > 1 ? 86 : 64;
    const r = mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: COL.board, stroke: ICF_COL[k], 'stroke-width': 3 }, b);
    const tg = mk('g', {}, b);
    const setText = (arr, col = ICF_COL[k]) => {
      tg.replaceChildren();
      arr.forEach((l, i) => T(tg, l, { x: 0, y: (i - (arr.length - 1) / 2) * 30 + 9, size: i ? 22 : 26, weight: i ? 500 : 700, fill: i ? COL.dim : col, anchor: 'middle' }));
    };
    setText(N[k]);
    boxes[k] = { g: b, rect: r, setText, w, h };
  }
  const brace = G(g, { o: 0 });
  mk('path', { d: 'M-410 248Q-410 262 -396 262H-14Q0 262 0 276Q0 262 14 262H396Q410 262 410 248', stroke: COL.faint, 'stroke-width': 2.5, fill: 'none' }, brace);
  T(brace, 'факторы контекста', { x: 0, y: 302, size: 22, fill: COL.dim, anchor: 'middle' });
  const icf = { g, boxes, lines, brace };
  icf.reveal = (k, t0) => k === 'lines' ? show(lines, t0) : k === 'brace' ? show(brace, t0) : tw(boxes[k].g, { o: 1 }, t0, .5);
  icf.label = (k, arr, col) => boxes[k].setText(arr, col);
  icf.tint = (k, col) => boxes[k].rect.setAttribute('stroke', col);
  icf.at = k => { const s0 = st(g); return [s0.x + POS[k][0] * s0.s, s0.y + POS[k][1] * s0.s]; };   // a box centre in the parent's coordinates
  return icf;
}

/* ---------- cycle: a ring of steps with arrows between neighbours ---------- */
// items: array of label lines per node (string or [line, sub]). Nodes sit on an ellipse (r, ry) around (cx, cy),
// clockwise from `start` degrees. Returns { nodes, reveal(i, t0), arc(i, t0), runner(t0, dur, laps) }.
function cycleRing(p, { cx = 800, cy = 470, r = 260, ry = null, items, col = COL.task, w = 240, start = -90, size = 24 } = {}) {
  const n = items.length, R2 = ry || r, pt = a => [cx + r * Math.cos(a), cy + R2 * Math.sin(a)];
  const nodes = items.map((lines, i) => {
    const a = rad(start + i * 360 / n), [x, y] = pt(a), L = [].concat(lines);
    const box = labelBox(p, x, y, w, L, col, null, { size });
    const tx = -Math.sin(a) * r, ty = Math.cos(a) * R2, tl = Math.hypot(tx, ty);
    const half = Math.abs(tx / tl) * w / 2 + Math.abs(ty / tl) * (13 + L.length * size * .62);   // box extent along the ring
    return { x, y, a, box, m: (half + 14) / ((r + R2) / 2) };
  });
  const arcs = nodes.map((nd, i) => {
    const nx = nodes[(i + 1) % n], a1 = nd.a + nd.m, a2 = (i + 1 === n ? nx.a + 2 * Math.PI : nx.a) - nx.m;
    const [x1, y1] = pt(a1), [x2, y2] = pt(a2), f = v => v.toFixed(1);
    const g = G(p), big = a2 - a1 > Math.PI ? 1 : 0;
    const line = path(g, `M${f(x1)} ${f(y1)}A${r} ${R2} 0 ${big} 1 ${f(x2)} ${f(y2)}`, { stroke: col, 'stroke-width': 3.5 }, { d: 0 });
    const tx = -Math.sin(a2) * r, ty = Math.cos(a2) * R2, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl;
    const head = path(g, `M${f(x2 - 15 * ux - 9 * uy)} ${f(y2 - 15 * uy + 9 * ux)}L${f(x2)} ${f(y2)}L${f(x2 - 15 * ux + 9 * uy)} ${f(y2 - 15 * uy - 9 * ux)}`, { stroke: col, 'stroke-width': 3.5 }, { o: 0 });
    return { line, head };
  });
  return {
    nodes,
    reveal(i, t0) { show(nodes[i].box, t0); },
    arc(i, t0, dur = .6) { draw(arcs[i].line, t0, dur); show(arcs[i].head, t0 + dur - .1, .2); },
    runner(t0, dur, laps = 1, c = COL.chalk) {   // a dot that travels round the ring
      const d = mk('circle', { r: 11, fill: c }, p);
      put(d, { o: 0 });
      prog(q => { const [x, y] = pt(rad(start) + q * laps * 2 * Math.PI); put(d, { x, y, o: q > 0 && q < 1 ? 1 : 0 }); }, t0, dur, lin);
      return d;
    },
  };
}

/* ---------- lying patients, a treatment table, reaching hands, muscles on a figure (chapter 3) ---------- */
// A treatment table seen from the side: the top at y from x1 to x2; legH is the height of the top above the floor.
// For people drawn at scale s, a table about hip-high is legH = 155 * s (the floor is then at y + legH).
function bench(p, x1, x2, y, t0, col = COL.dim, legH = 120) {
  const g = G(p, { o: 0 });
  mk('rect', { x: x1, y, width: x2 - x1, height: 18, rx: 6, fill: PANEL, stroke: col, 'stroke-width': 3 }, g);
  path(g, `M${x1 + 30} ${y + 18}V${y + legH}M${x2 - 30} ${y + 18}V${y + legH}`, { stroke: col, 'stroke-width': 5 });
  if (t0 !== null) show(g, t0);
  return g;
}
// A figure lying supine on a table top at topY, head to the left, hip at hx. The back rests on the top.
function supine(p, hx, topY, s, t0, pose = {}, opts = {}) {
  const f = fig(p, { x: hx, y: topY - 27 * s, s, r: -90, o: 0, pose: { ...STAND, hN: 0, hF: 0, kN: 0, kF: 0, aN: 4, aF: 4, eN: 6, eF: 6, ...pose }, ...opts });
  if (t0 !== null) show(f.g, t0);
  return f;
}
// Stage point -> figure-local point.
const toLocal = (f, X, Y) => { const s = st(f.g), [x, y] = rotPt(X - s.x, Y - s.y, -(s.r || 0)); return [x / f.s, y / f.s]; };
// Two-link reach: bend the near ('N') or far ('F') arm so its wrist lands on a stage point; the elbow points down.
function reach(f, side, X, Y) {
  const [tx, ty] = toLocal(f, X, Y), Sh = f.pts.Sh, ua = RIG.ua, fa = RIG.fa;
  const vx = (tx - Sh[0]) * f.dir, vy = ty - Sh[1], D = clamp(Math.hypot(vx, vy), 12, ua + fa - 1), dg = 180 / Math.PI;
  const phi = Math.atan2(vx, vy) * dg;
  const beta = Math.acos(clamp((ua * ua + D * D - fa * fa) / (2 * ua * D), -1, 1)) * dg;
  const gam = Math.acos(clamp((ua * ua + fa * fa - D * D) / (2 * ua * fa), -1, 1)) * dg;
  f.set({ ['a' + side]: phi - beta + f.pose.t, ['e' + side]: 180 - gam });
}
// Keep a figure's hand on a moving point: target() returns stage [x, y]; called after every pose change of `on`.
function holdHand(f, side, on, target) { const upd = () => { const [x, y] = target(); reach(f, side, x, y); }; on.onSet.push(upd); upd(); }
// A muscle on a figure between two points fixed to body segments; it follows every pose change and glows when stretched.
// Each end is [from, to, along, off]: `along` units from joint `from` toward `to`, then `off` units sideways —
// positive is anterior on a segment that points up from its joint and posterior on one that points down.
// The rest length is the length in the pose at creation × slack. after: the part it is drawn above (e.g. 'ftN').
function muscleOn(f, a, b, { w = 13, col = ANAT.muscle, slack = 1, after = null } = {}) {
  const pt = s => anatAttPt(f, s);
  // on a glass figure a muscle from the shared list becomes a sensor for its drawn shape; any other muscle is drawn as a ribbon
  const glass = anatEnabled() && !!(f.parts && f.parts.torso && f.head), preset = glass ? anatPreset(a) : null;
  const hug = !!preset && ANAT_HUG.some(h => h[6] === preset);
  if (glass) anatFig(f);
  const P = pt(a), Q = pt(b), mu = muscleEl(f.g, { rest: Math.hypot(P[0] - Q[0], P[1] - Q[1]) * slack, w, col, sensor: hug, shape: glass && !hug ? 'ribbon' : 'belly' });
  if (after) f.g.insertBefore(mu.g, f.parts[after].e.nextSibling);
  mu.ends = () => [pt(a), pt(b)];
  const upd = () => mu.set(pt(a), pt(b));
  f.onSet.push(upd); upd();
  if (hug) f.anat.attach(preset, mu); else if (glass) f.anat.custom(mu, after);
  (f.muscles = f.muscles || []).push({ mu, a, b, preset: anatPreset(a) });
  return mu;
}
// Attachment points of the two-joint muscles of chapter 3 (near side).
const MUSCLE = {
  hamstrings: [['H', 'Sh', -14, -10], ['KN', 'AN', 22, 9]],
  rectus: [['H', 'Sh', 8, 16], ['KN', 'AN', 0, -22]],
  gastroc: [['KN', 'H', 8, -10], ['AN', 'heelN', 10, 0]],
  biceps: [['Sh', 'H', -6, -10], ['EN', 'WN', 12, -8]],
  triceps: [['Sh', 'H', 10, 9], ['EN', 'WN', -6, 8]],
};

/* ---------- flatFig: the patient seen from above on the table ---------- */
// Front view when supine, back view when prone; shaded capsules, local origin at the hips, head up the screen.
// The near limbs are on the right: arm(th) abducts the near arm (0 along the body, 180 overhead); leg(th) and legF(th)
// abduct the near and the far leg (0 straight down the table, negative = across the midline). f.pts: E, W, u (arm),
// K, A (near leg). f.mid is a layer between the trunk and the near arm (scapula), f.top one above everything.
function flatFig(p, cx, cy, s, t0, col = '#d8d1c1') {
  const g = G(p, { x: cx, y: cy, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62);
  const L = (ra, rb) => limbEl(g, defs, col, ra, rb, line);
  const f = { g, s, S: [84, -168], pts: {}, onSet: [] };
  const chain = (A, th, k, parts, lens) => {
    const a = rad(th), u = [k * Math.sin(a), Math.cos(a)], out = [A];
    let d = 0;
    parts.forEach((pt, i) => { const P = out[i]; d += lens[i]; const Q = [A[0] + d * u[0], A[1] + d * u[1]]; pt.set(P, Q); out.push(Q); });
    return { out, u };
  };
  const LEG = [170, 160, 24], ARM = [118, 104, 42];
  const legF = [L(26, 19), L(18, 12), L(11, 9)], legN = [L(26, 19), L(18, 12), L(11, 9)];
  const armF = [L(15, 12), L(12, 10), L(10, 9)];
  L(56, 64).set([0, -18], [0, -138]);
  L(25, 25).set([-84, -168], [84, -168]);
  const hd = G(g, { x: 0, y: -180 });   // neck and head turn about the base of the neck
  limbEl(hd, defs, col, 15, 15, line).set([0, 0], [0, -32]);
  const hg = mk('radialGradient', { id: 'ffh' + (++SHADE_ID), cx: .38, cy: .32, r: .78 }, defs);
  [[0, mix(col, '#ffffff', .5)], [.55, col], [1, mix(col, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, hg));
  const ears = [-1, 1].map(k => mk('ellipse', { cx: 37 * k, cy: -70, rx: 8, ry: 15, fill: col, stroke: line, 'stroke-width': 2, opacity: 0 }, hd));
  mk('circle', { cx: 0, cy: -70, r: 38, fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2 }, hd);
  const eyes = [-1, 1].map(() => mk('circle', { cy: -80, r: 4.5, fill: mix(col, '#000000', .6), opacity: 0 }, hd));
  const nose = mk('ellipse', { cx: 0, cy: -64, rx: 5.5, ry: 9, fill: mix(col, '#000000', .1), stroke: line, 'stroke-width': 1.5, opacity: 0 }, hd);
  let face = false;
  // head(lat, rot): side bend about the base of the neck (+ = toward the near shoulder) and rotation; the nose and
  // the ears that show it are drawn only after face(true) (the face of a supine patient)
  f.face = on => { face = on; f.head(f.lat || 0, f.rot || 0); return f; };
  f.head = (lat, rot = 0) => {
    f.lat = lat; f.rot = rot; put(hd, { x: 0, y: -180, r: lat });
    const v = Math.sin(rad(rot));
    nose.setAttribute('cx', (30 * v).toFixed(1)); nose.setAttribute('opacity', face ? 1 : 0);
    eyes.forEach((e, i) => { e.setAttribute('cx', (30 * v + (i ? 15 : -15) * Math.cos(rad(rot))).toFixed(1)); e.setAttribute('opacity', face ? 1 : 0); });
    ears[0].setAttribute('opacity', face ? (1 - Math.max(0, v)).toFixed(2) : 0); ears[1].setAttribute('opacity', face ? (1 - Math.max(0, -v)).toFixed(2) : 0);
    return f;
  };
  f.mid = mk('g', {}, g);
  const armN = [L(16, 13), L(13, 10), L(10, 9)];
  f.armN = armN;   // the near arm's parts, so a lesson can hide them and draw its own jointed arm
  f.top = mk('g', {}, g);
  const fire = () => f.onSet.forEach(fn => fn(f));
  f.arm = th => { const r = chain(f.S, th, 1, armN, ARM); f.th = th; Object.assign(f.pts, { E: r.out[1], W: r.out[2], u: r.u }); fire(); return f; };
  f.leg = th => { const r = chain([30, 0], th, 1, legN, LEG); f.thL = th; Object.assign(f.pts, { K: r.out[1], A: r.out[2], uL: r.u }); fire(); return f; };
  f.legF = th => { const r = chain([-30, 0], th, -1, legF, LEG); Object.assign(f.pts, { KF: r.out[1], AF: r.out[2] }); return f; };
  chain([-84, -168], 6, -1, armF, ARM);
  f.legF(3); f.leg(3); f.arm(6);
  f.stage = ([x, y]) => [cx + x * s, cy + y * s];
  if (t0 !== null) show(g, t0);
  return f;
}
// The table under a flatFig, seen from above.
const tableTop = (p, cx, cy, s, t0) => show(mk('rect', { x: cx - 135 * s, y: cy - 330 * s, width: 270 * s, height: 700 * s, rx: 14, fill: PANEL, stroke: COL.dim, 'stroke-width': 3, opacity: 0 }, p), t0);
// The on-screen mark for an explanation or example that is not from the book.
const NOTE = (p, x, y, t0) => pill(p, 'пояснение: не из книги', x, y, t0, { col: COL.dim, size: 19 });

/* ---------- chapter 4: stretching ---------- */
// A patient on the table and, unless hands is null, a therapist behind it whose near and far hands hold hands[0] and
// hands[1]: a point of the patient ('KN', 'heelN', 'EN', 'WN', 'H', …) or a function returning a stage point.
// Supine: head left, therapist on the right facing left; prone: head right, therapist on the left. follow: a point the
// therapist steps along with (offset dx·s). The table legs are 155·s long, so the therapist reaches. Returns { pt, th, legH }.
function tableScene(p, { hx = 800, top = 540, s = 1.2, t0 = .2, prone = false, hands = ['KN', 'heelN'], thx = 120, follow = null, dx = 95, pose = {} } = {}) {
  const legH = 155 * s;
  const th = hands ? fig(p, { x: hx + (prone ? -thx : thx) * s, y: top + legH - 182 * s, s, dir: prone ? 1 : -1, col: '#b9cfe0', o: 0, pose: { t: 24, hN: 26, hF: 22, kN: 8, kF: 8 } }) : null;
  bench(p, hx - 330 * s, hx + 330 * s, top, t0, COL.dim, legH);
  const pt = prone
    ? fig(p, { x: hx, y: top - 25 * s, s, r: 90, o: 0, pose: { ...STAND, hN: 0, hF: 0, kN: 0, kF: 0, aN: 4, aF: 4, eN: 6, eF: 6, fN: -40, fF: -40, ...pose } })
    : supine(p, hx, top, s, null, pose);
  if (t0 !== null) show(pt.g, t0);
  if (th) {
    if (follow) pt.onSet.push(() => put(th.g, { x: onStage(pt, follow)[0] + (prone ? -1 : 1) * dx * s }));
    const tgt = h => typeof h === 'function' ? h : () => onStage(pt, h);
    holdHand(th, 'N', pt, tgt(hands[0])); holdHand(th, 'F', pt, tgt(hands[1]));
    pt.set({});
    if (t0 !== null) show(th.g, t0);
  }
  return { pt, th, legH };
}
// Stage path of a range-of-motion arc around point C: angle a in degrees from `zero` (the segment's start direction
// in screen degrees, 0 = right, 90 = down), turning by sign (+1 clockwise on screen, −1 counter-clockwise).
const romArc = (C, R, a0, a1, zero = 0, sign = -1) => {
  let d = '';
  for (let i = 0; i <= 36; i++) { const a = rad(zero + sign * lerp(a0, a1, i / 36)); d += `${i ? 'L' : 'M'}${(C[0] + R * Math.cos(a)).toFixed(1)} ${(C[1] + R * Math.sin(a)).toFixed(1)}`; }
  return d;
};
// A shaded hand in side view: the forearm runs along +x to the wrist at (x, y), then the metacarpal and three
// phalanges. set({ w, mcp, pip, dip }) in degrees, + = toward the palm. h.J: joints, h.phis: segment angles.
// tendons: the long finger flexor (palm side) and extensor (back), bright yellow when they tighten.
function handSide(p, x, y, s = 1, { tendons = false, col = '#d8d1c1' } = {}) {
  const g = G(p, { o: 0 }), defs = mk('defs', {}, g), L = [86, 48, 32, 25].map(v => v * s), R = [14, 10, 8.5, 7.5].map(v => v * s), line = '#8a8476';
  limbEl(g, defs, col, 24 * s, 19 * s, line).set([x - 300 * s, y], [x, y]);
  const segs = R.map(r => limbEl(g, defs, col, r, r * .85, line));
  const tend = tendons ? [0, 1].map(() => mk('path', { fill: 'none', 'stroke-width': 3.5 * s, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g)) : null;
  const h = { g, s, ang: { w: 0, mcp: 20, pip: 30, dip: 15 }, J: [], phis: [], tension: { flex: 0, ext: 0 }, onSet: [] };
  h.set = (a = {}) => {
    Object.assign(h.ang, a);
    const { w, mcp, pip, dip } = h.ang, phis = [w, w + mcp, w + mcp + pip, w + mcp + pip + dip], f = v => v.toFixed(1);
    let P = [x, y];
    const J = [P];
    phis.forEach((ph, i) => { const Q = [P[0] + L[i] * Math.cos(rad(ph)), P[1] + L[i] * Math.sin(rad(ph))]; segs[i].set(P, Q); J.push(Q); P = Q; });
    h.J = J; h.phis = phis;
    if (tend) {
      const tot = w + mcp + pip + dip;
      h.tension.flex = clamp((-tot - 10) / 40, 0, 1); h.tension.ext = clamp((tot - 200) / 60, 0, 1);
      [1, -1].forEach((sg, k) => {
        const pts = J.map((Q, i) => { const ph = phis[Math.min(i, 3)]; return [Q[0] - sg * Math.sin(rad(ph)) * 11 * s, Q[1] + sg * Math.cos(rad(ph)) * 11 * s]; });
        tend[k].setAttribute('d', `M${f(x - 220 * s)} ${f(y + sg * 11 * s)}` + pts.map(Q => `L${f(Q[0])} ${f(Q[1])}`).join(''));
        tend[k].setAttribute('stroke', mix(mix(ANAT.tendon, COL.board, .3), ANAT.taut, k ? h.tension.ext : h.tension.flex));
      });
    }
    h.onSet.forEach(fn => fn(h));
    return h;
  };
  h.set();
  return h;
}
// A point on segment i of a handSide hand: q along it, off toward the palm (+) or the back (−).
const handAt = (h, i, q, off) => { const A = h.J[i], B = h.J[i + 1], ph = rad(h.phis[i]); return [lerp(A[0], B[0], q) - Math.sin(ph) * off, lerp(A[1], B[1], q) + Math.cos(ph) * off]; };
// A sarcomere seen from the side, centred at (cx, cy): Z-lines at the ends, thin actin filaments from each Z-line,
// thick myosin in the middle. set(len) moves the Z-lines; the overlap of actin and myosin follows. ov(): overlap 0..1.
function sarcomere(p, cx, cy, len0 = 120, h = 46, { col = ANAT.muscle } = {}) {
  const g = G(p, {}), act = len0 * .36, myo = len0 * .5, f = v => v.toFixed(1);
  const zl = [0, 1].map(() => mk('path', { stroke: COL.chalk, 'stroke-width': 4, 'stroke-linecap': 'round' }, g));
  const actin = mk('path', { stroke: mix(col, '#ffffff', .35), 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, g);
  const myosin = mk('path', { stroke: mix(col, '#000000', .25), 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, g);
  const ys = [-.3, 0, .3].map(k => cy + k * h);
  const sr = { g, len: len0, len0 };
  sr.set = len => {
    sr.len = len;
    const a = cx - len / 2, b = cx + len / 2;
    zl[0].setAttribute('d', `M${f(a)} ${f(cy - h / 2)}V${f(cy + h / 2)}`); zl[1].setAttribute('d', `M${f(b)} ${f(cy - h / 2)}V${f(cy + h / 2)}`);
    actin.setAttribute('d', ys.map(y => `M${f(a)} ${f(y - 6)}H${f(a + act)}M${f(b)} ${f(y - 6)}H${f(b - act)}M${f(a)} ${f(y + 6)}H${f(a + act)}M${f(b)} ${f(y + 6)}H${f(b - act)}`).join(''));
    myosin.setAttribute('d', ys.map(y => `M${f(cx - myo / 2)} ${f(y)}H${f(cx + myo / 2)}`).join(''));
    return sr;
  };
  sr.ov = () => clamp((act - (sr.len - myo) / 2) / act, 0, 1);
  sr.set(len0);
  return sr;
}
// The stress-strain curve of connective tissue, origin at (x0, y0), w × h. e is strain 0..1: toe region to .15,
// elastic (linear) range to the elastic limit at .5, plastic range to the ultimate strength at .72, necking, failure
// at .85. c.sig(e) → stress 0..1, c.pt(e) → stage point, c.path(e0, e1) → path data. k > 1 makes a stiffer tissue
// (the same curve over a shorter strain).
function stressCurve(x0, y0, w, h, { k = 1 } = {}) {
  const c = { x0, y0, w, h, k, toe: .15, lim: .5, ult: .72, fail: .85 };
  const base = e => e <= .15 ? .6 * e * e / .15 : e <= .5 ? .09 + 1.886 * (e - .15) : e <= .72 ? .75 + .15 * Math.sin(Math.PI / 2 * (e - .5) / .22)
    : e <= .85 ? .9 - .3 * ((e - .72) / .13) ** 2 : 0;
  c.sig = e => base(Math.min(e * k, .85));
  c.e = e => e / k;   // where a landmark of the base curve lies on this curve
  c.pt = e => [x0 + e * w, y0 - c.sig(e) * h];
  c.path = (e0, e1, n = 60) => { let d = ''; for (let i = 0; i <= n; i++) { const [x, y] = c.pt(lerp(e0, e1, i / n)); d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; } return d; };
  return c;
}
// Axes for a chart: origin (x0, y0), w × h, labels on the y and x axes. Hidden until shown.
function chartAxes(p, x0, y0, w, h, yLabel, xLabel, t0) {
  const g = G(p, { o: 0 });
  path(g, `M${x0} ${y0 - h}V${y0}H${x0 + w}`, { stroke: COL.dim, 'stroke-width': 3 });
  path(g, `M${x0 - 7} ${y0 - h + 12}L${x0} ${y0 - h}L${x0 + 7} ${y0 - h + 12}M${x0 + w - 12} ${y0 - 7}L${x0 + w} ${y0}L${x0 + w - 12} ${y0 + 7}`, { stroke: COL.dim, 'stroke-width': 3 });
  T(g, yLabel, { x: x0 + 12, y: y0 - h + 6, size: 21, fill: COL.dim });
  T(g, xLabel, { x: x0 + w, y: y0 + 36, size: 21, fill: COL.dim, anchor: 'end' });
  if (t0 !== null) show(g, t0);
  return g;
}

/* ---------- chapter 5: joint surfaces, glides and the capsule ---------- */
const CART = '#a8d4e0';   // articular cartilage
// A synovial joint in close-up, drawn in its own frame around the joint centre O = (0, 0): the fixed bone comes from
// above, the moving bone goes down. convexMoves: the moving bone carries the convex head (radius R) and the fixed one
// the concave cup (radius R + gap); otherwise the fixed bone has the head and the moving bone the cup. The group sits
// at {x, y, s, r} in p; movAng / fixAng tilt a shaft away from the joint axis (+ = its far end to the right);
// shaft / fixShaft: the length of the moving / fixed bone beyond its joint surface; rest: the swing of the resting
// position, where the capsule is slack.
// set({ a, d, n, raw }): a — swing of the moving bone in degrees (+ = its far end moves to the right in the frame);
// d — glide along the treatment plane (+ = right); n — distraction away from the concave surface (− = compression).
// The capsule has a band on each side: slack, it hangs in a wave; tightening, it straightens and glows (j.tension =
// [left, right]). A glide presses the head into the band on its side (convex moving) or pulls the cup away from the
// band on the other side (concave moving); a swing tightens the band opposite the swing; distraction tightens both.
// j.tight = [left, right] adds tension to a shortened band. Where the surfaces press into each other the cup glows red (j.press 0..1). j.tp / j.axis: the treatment plane and
// the line from the axis to the middle of the concave surface (hidden; show them). j.stage(P): frame point → p;
// j.movPt(P): a point of the moving bone (its own frame) → frame; j.headAt(al) / j.cupAt(al): surface points.
function jointGlide(p, { x = 800, y = 450, s = 1, r = 0, R = 70, gap = 6, span = 58, convexMoves = true, shaft = 210, w = 64,
  movAng = 0, fixAng = 0, fixShaft = null, rest = 0, capsule = true, t0 = .2 } = {}) {
  const g = G(p, { x, y, s, r, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const Rc = R + gap, Rr = Rc + 17, line = mix(ANAT.bone, '#000000', .5);
  const j = { g, R, Rc, convexMoves, a: 0, d: 0, n: 0, D: [0, 0], tension: [0, 0], tight: [0, 0], press: 0, onSet: [] };
  const grad = (kind, attrs, stops) => { const id = 'jg' + (++SHADE_ID), gr = mk(kind, { id, ...attrs }, defs); stops.forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr)); return `url(#${id})`; };
  const shaftFill = () => grad('linearGradient', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, mix(ANAT.bone, '#ffffff', .45)], [.45, ANAT.bone], [1, mix(ANAT.bone, '#000000', .42)]]);
  const headFill = () => grad('radialGradient', { cx: .38, cy: .34, r: .75 }, [[0, mix(ANAT.bone, '#ffffff', .55)], [.55, ANAT.bone], [1, mix(ANAT.bone, '#000000', .4)]]);
  const cupPt = (sg, rad0, al) => [rad0 * Math.sin(rad(al)), sg * rad0 * Math.cos(rad(al))];
  const dirOf = (sg, ang) => rotPt(0, sg, sg < 0 ? ang : -ang);
  // the far end of a shaft fades out (a mask in the bone's own frame)
  const fade = (el, sg, ang, len) => {
    const u = dirOf(sg, ang), L = Rc + len, id = 'jm' + (++SHADE_ID), m = mk('mask', { id, maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 4000, height: 4000 }, defs);
    const gu = grad('linearGradient', { gradientUnits: 'userSpaceOnUse', x1: f(u[0] * (L - 80)), y1: f(u[1] * (L - 80)), x2: f(u[0] * L), y2: f(u[1] * L) }, [[0, '#ffffff'], [1, '#000000']]);
    mk('rect', { x: -2000, y: -2000, width: 4000, height: 4000, fill: gu }, m);
    el.setAttribute('mask', `url(#${id})`);
  };
  // a bone ending in the concave cup; sg −1: the bone is above and the cup opens down, +1: below, opening up
  const cupBone = (par, sg, ang, len) => {
    const b = mk('g', {}, par), u = dirOf(sg, ang), side = [u[1] * sg, -u[0] * sg];   // side: toward +x
    const at = (k, d0) => [u[0] * d0 + side[0] * k * w / 2, u[1] * d0 + side[1] * k * w / 2];
    const Pl = cupPt(sg, Rr, -span), Pr = cupPt(sg, Rr, span), R0 = at(1, Rc + 55), L0 = at(-1, Rc + 55), sw = sg < 0 ? 1 : 0;
    const P2 = q => q.map(f).join(' ');
    const d = `M${P2(cupPt(sg, Rc, -span))}A${Rc} ${Rc} 0 0 ${sw} ${P2(cupPt(sg, Rc, span))}L${P2(Pr)}` +
      `Q${f(R0[0])} ${f(lerp(Pr[1], R0[1], .35))} ${P2(R0)}L${P2(at(1, Rc + len))}L${P2(at(-1, Rc + len))}L${P2(L0)}` +
      `Q${f(L0[0])} ${f(lerp(Pl[1], L0[1], .35))} ${P2(Pl)}Z`;
    mk('path', { d, fill: shaftFill(), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, b);
    path(b, `M${P2(cupPt(sg, Rc + 2.5, 4 - span))}A${Rc + 2.5} ${Rc + 2.5} 0 0 ${sw} ${P2(cupPt(sg, Rc + 2.5, span - 4))}`, { stroke: CART, 'stroke-width': 5 });
    fade(b, sg, ang, len);
    return b;
  };
  // a bone ending in the convex head; sg: the direction of its shaft (−1 up, +1 down)
  const headBone = (par, sg, ang, len) => {
    const b = mk('g', {}, par), u = dirOf(sg, ang), P2 = q => q.map(f).join(' ');
    mk('path', { d: capsuleD([u[0] * R * .3, u[1] * R * .3], [u[0] * (R + len), u[1] * (R + len)], w / 2, w / 2 * .92), fill: shaftFill(), stroke: line, 'stroke-width': 2 }, b);
    mk('circle', { r: R, fill: headFill(), stroke: line, 'stroke-width': 2 }, b);
    const a0 = span + 22, sw = sg > 0 ? 1 : 0;
    path(b, `M${P2(cupPt(-sg, R - 2.5, -a0))}A${R - 2.5} ${R - 2.5} 0 0 ${sw} ${P2(cupPt(-sg, R - 2.5, a0))}`, { stroke: CART, 'stroke-width': 5 });
    fade(b, sg, ang, len);
    return b;
  };
  const mov = G(g);
  const fl = fixShaft === null ? shaft : fixShaft;
  if (convexMoves) { headBone(mov, 1, movAng, shaft); j.fixed = cupBone(g, -1, fixAng, fl); }
  else { j.fixed = headBone(g, -1, fixAng, fl); g.appendChild(mov); cupBone(mov, 1, movAng, shaft); }
  j.mov = mov;
  const capG = mk('g', {}, g), bands = [0, 1].map(() => ({ glow: mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-opacity': .35, 'stroke-linecap': 'round' }, capG), e: mk('path', { fill: 'none', 'stroke-linecap': 'round' }, capG) }));
  if (!capsule) capG.setAttribute('opacity', 0);
  j.capsule = capG;
  const pressEl = mk('path', { fill: 'none', stroke: '#ff5a3c', 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
  const sgC = convexMoves ? -1 : 1, tpG = G(g, { o: 0 }), axG = G(g, { o: 0 });
  path(tpG, `M${-(Rc + 80)} ${sgC * Rc}H${Rc + 80}`, { stroke: COL.task, 'stroke-width': 4, 'stroke-dasharray': '14 9' });
  path(axG, `M0 0L0 ${sgC * Rc}`, { stroke: COL.whole, 'stroke-width': 3, 'stroke-dasharray': '5 7' });
  mk('circle', { r: 6, fill: COL.whole }, axG);
  j.tp = tpG; j.axis = axG;
  j.movPt = P => { const q = rotPt(P[0], P[1], -j.a); return [q[0] + j.D[0], q[1] + j.D[1]]; };
  j.stage = P => { const S = st(g), q = rotPt(P[0] * S.s, P[1] * S.s, S.r || 0); return [S.x + q[0], S.y + q[1]]; };
  j.headAt = al => convexMoves ? j.movPt(cupPt(-1, R, al)) : cupPt(1, R, al);
  j.cupAt = al => convexMoves ? cupPt(-1, Rc, al) : j.movPt(cupPt(1, Rc, al));
  const band = (b, A, M, B, t) => {
    const C = [2 * M[0] - (A[0] + B[0]) / 2, 2 * M[1] - (A[1] + B[1]) / 2], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    let d = '';
    for (let i = 0; i <= 28; i++) {
      const q = i / 28, wv = (1 - t) * 8 * Math.sin(q * Math.PI * 3) * Math.sin(q * Math.PI);
      const x0 = (1 - q) ** 2 * A[0] + 2 * q * (1 - q) * C[0] + q * q * B[0], y0 = (1 - q) ** 2 * A[1] + 2 * q * (1 - q) * C[1] + q * q * B[1];
      d += `${i ? 'L' : 'M'}${f(x0 - dy / L * wv)} ${f(y0 + dx / L * wv)}`;
    }
    b.e.setAttribute('d', d); b.glow.setAttribute('d', d);
    b.e.setAttribute('stroke', mix(mix(ANAT.tendon, COL.board, .35), ANAT.taut, t));
    b.e.setAttribute('stroke-width', f(5 * (.75 + .5 * t)));
    b.glow.setAttribute('stroke-width', f(17 * t));
  };
  // the deepest point where the head would pass into the cup for a displacement D (at the current swing)
  const al40 = Array.from({ length: 41 }, (_, i) => lerp(-span, span, i / 40));
  const penOf = D => {
    let pm = -1e9;
    for (const al of al40) {
      const c = cupPt(convexMoves ? -1 : 1, Rc, al), P = convexMoves ? c : (q => [q[0] + D[0], q[1] + D[1]])(rotPt(c[0], c[1], -j.a)), H = convexMoves ? D : [0, 0];
      pm = Math.max(pm, R + 1.5 - Math.hypot(P[0] - H[0], P[1] - H[1]));
    }
    return pm;
  };
  // a glide comes with just enough distraction to clear the rim of the cup (the book adds a grade I distraction to
  // every glide); raw: true keeps the displacement as given, to show rolling or compression
  j.set = ({ a = j.a, d = j.d, n = j.n, raw = false } = {}) => {
    Object.assign(j, { a, d, n });
    const u = convexMoves ? [1, 0] : rotPt(1, 0, -a), v = convexMoves ? [0, 1] : rotPt(0, 1, -a);
    const Dof = ne => [d * u[0] + ne * v[0], d * u[1] + ne * v[1]];
    let ne = n;
    if (!raw && d && n >= 0) for (let i = 0; i < 60 && penOf(Dof(ne)) > 0; i++) ne += .5;
    j.D = Dof(ne); j.nEff = ne;
    put(mov, { x: j.D[0], y: j.D[1], r: -a });
    if (!convexMoves) { put(tpG, { x: j.D[0], y: j.D[1], r: -a }); put(axG, { x: j.D[0], y: j.D[1], r: -a }); }
    const sg = convexMoves ? 1 : -1;
    [-1, 1].forEach((k, i) => {
      const A = convexMoves ? cupPt(-1, Rr - 3, k * (span + 3)) : [k * R * .62, -R * .82];
      const B = convexMoves ? j.movPt([k * R * .62, R * .82]) : j.movPt(cupPt(1, Rr - 3, k * (span + 3)));
      const M = convexMoves ? j.movPt([k * (R + 9), R * .05]) : [k * (R + 9), -R * .05];
      j.tension[i] = clamp(j.tight[i] + sg * k * d / (R * .2) + n / (R * .15) - k * (a - rest) / 22, 0, 1);
      band(bands[i], A, M, B, j.tension[i]);
    });
    // compression: the part of the cup that the head would pass into
    const H = convexMoves ? j.D : [0, 0];
    let pmax = 0, dd = '', was = false;
    for (let i = 0; i <= 40; i++) {
      const P = j.cupAt(lerp(-span, span, i / 40)), pen = R + 1.5 - Math.hypot(P[0] - H[0], P[1] - H[1]);
      if (pen > 0) { dd += `${was ? 'L' : 'M'}${f(P[0])} ${f(P[1])}`; pmax = Math.max(pmax, pen); }
      was = pen > 0;
    }
    j.press = clamp(pmax / 5, 0, 1);
    pressEl.setAttribute('d', dd); pressEl.setAttribute('opacity', f(.25 + .7 * j.press));
    j.onSet.forEach(fn => fn(j));
    return j;
  };
  j.set({});
  if (t0 !== null) show(g, t0);
  return j;
}

const FLUID = '#7fc4e8';   // synovial fluid
// A grip oval in the therapist's colour that stays on a point P of the moving bone of a jointGlide (its own frame).
function gripOn(j, layer, P, k = 1) {
  const e = mk('ellipse', { rx: 24 * k, ry: 16 * k, fill: '#b9cfe0', 'fill-opacity': .9, stroke: '#7d93a3', 'stroke-width': 2 }, layer);
  put(e, { o: 0 });
  const upd = () => { const S = j.stage(j.movPt(P)); put(e, { x: S[0], y: S[1], r: (st(j.g).r || 0) - j.a + 90 }); };
  j.onSet.push(upd); upd();
  return e;
}
// Synovial fluid in the joint space of j: dots along the gap, squeezed out to the rim when the surfaces press together.
function fluidIn(j, n = 9) {
  const g = mk('g', {}, j.g), dots = Array.from({ length: n }, () => mk('circle', { r: 5.5, fill: FLUID, 'fill-opacity': .9 }, g));
  const upd = () => {
    const sq = clamp(-j.nEff / 8, 0, 1);
    dots.forEach((e, i) => {
      const al = lerp(-50, 50, i / (n - 1)), a = al + sq * (al < 0 ? -1 : 1) * (60 - Math.abs(al)) * .9;
      const H = j.headAt(a), C = j.cupAt(a);
      e.setAttribute('cx', ((H[0] + C[0]) / 2).toFixed(1)); e.setAttribute('cy', ((H[1] + C[1]) / 2).toFixed(1));
    });
  };
  j.onSet.push(upd); upd();
  return g;
}

// The right shoulder girdle from the front: the sternum, clavicle, scapula (behind the ribs) and humerus.
// set(elev): arm elevation in degrees; the scapula turns upward by a fifth of it about a point below the spine of the
// scapula and the clavicle rises a little (a scheme, not measured).
function girdleFront(p, x, y, s = 1, t0 = .2) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), line = mix(ANAT.bone, '#000000', .5), f = v => v.toFixed(1);
  path(g, 'M0 -30V330M24 -20Q170 0 178 150Q168 290 60 330', { stroke: COL.faint, 'stroke-width': 3 });
  const scap = mk('path', { fill: ANAT.bone, 'fill-opacity': .5, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  mk('rect', { x: -22, y: -14, width: 44, height: 200, rx: 18, fill: ANAT.bone, stroke: line, 'stroke-width': 2 }, g);
  const clav = limbEl(g, defs, ANAT.bone, 10, 9, line), hum = limbEl(g, defs, ANAT.bone, 17, 12, line);
  const head = mk('circle', { r: 27, fill: ANAT.bone, stroke: line, 'stroke-width': 2 }, g);
  const gf = { g, pts: {}, stage: P => { const S = st(g); return [S.x + P[0] * S.s, S.y + P[1] * S.s]; } };
  gf.set = elev => {
    const add = (A, v) => [A[0] + v[0], A[1] + v[1]], R2 = (v, d) => rotPt(v[0], v[1], d);
    const AC = R2([165, -15], -elev * .08), C = add(AC, [-60, 70]), ph = -elev / 5;
    const about = v => add(C, R2([AC[0] + v[0] - C[0], AC[1] + v[1] - C[1]], ph));
    const sc = [[-85, 5], [5, 30], [-60, 190]].map(about);
    scap.setAttribute('d', `M${f(sc[0][0])} ${f(sc[0][1])}Q${f(AC[0])} ${f(AC[1] - 8)} ${f(sc[1][0])} ${f(sc[1][1])}L${f(sc[2][0])} ${f(sc[2][1])}Z`);
    clav.set([14, 2], AC);
    const H = about([26, 50]), u = R2([0, 1], -elev);
    hum.set(add(H, [u[0] * 12, u[1] * 12]), add(H, [u[0] * 235, u[1] * 235]));
    head.setAttribute('cx', f(H[0])); head.setAttribute('cy', f(H[1]));
    Object.assign(gf.pts, { SC: [14, 2], AC, H, inf: sc[2], sup: sc[0], gl: about([5, 30]) });
    return gf;
  };
  gf.set(0);
  if (t0 !== null) show(g, t0);
  return gf;
}

// A hand seen from the palm, wrist at (x, y), fingers up. set({ dev, thumb }): radial (−) or ulnar (+) deviation in
// degrees, and thumb abduction 0..1. Parts are shaded capsules.
function palmHand(p, x, y, s = 1, { col = '#d8d1c1', line = '#8a8476' } = {}) {
  const g = G(p, { o: 0 }), defs = mk('defs', {}, g);
  limbEl(g, defs, col, 34 * s, 28 * s, line).set([x, y + 260 * s], [x, y]);
  const hand = G(g, { x, y });
  const palm = limbEl(hand, defs, col, 42 * s, 46 * s, line); palm.set([0, -20 * s], [0, -110 * s]);
  [-33, -11, 11, 33].forEach((dx, i) => limbEl(hand, defs, col, 11 * s, 9 * s, line).set([dx * s, -150 * s], [dx * s * 1.05, -(150 + [70, 88, 84, 66][i]) * s]));
  const th = G(hand, { x: -40 * s, y: -40 * s });
  limbEl(th, defs, col, 14 * s, 11 * s, line).set([0, 0], [-30 * s, -70 * s]);
  const h = { g, hand, s };
  h.set = ({ dev = 0, thumb = 0 } = {}) => { put(hand, { x, y, r: dev }); put(th, { x: -40 * s, y: -40 * s, r: -18 - 40 * thumb }); return h; };
  h.at = (lx, ly) => { const st0 = st(hand), [rx, ry] = rotPt(lx * s, ly * s, st0.r || 0); return [x + rx, y + ry]; };
  h.set();
  return h;
}

// A saddle (hyperbolic paraboloid) in a three-quarter view, shaded by height, with an optional rider surface above.
// The line along u is concave, the line along v convex. Returns { g, rider, setRider(lift) }.
function saddle(p, cx, cy, s, t0) {
  const g = G(p, { x: cx, y: cy, s, o: 0 }), N = 8, f = v => v.toFixed(1);
  const z = (u, v) => 55 * (u * u - v * v), P = (u, v, lift = 0) => [u * 130 + v * 60, v * 40 - z(u, v) - lift];
  const quads = (par, lift, colFn, op) => {
    for (let b = 0; b < N; b++) for (let a = 0; a < N; a++) {
      const u0 = -1 + 2 * a / N, u1 = u0 + 2 / N, v0 = -1 + 2 * b / N, v1 = v0 + 2 / N, pts = [P(u0, v0, lift), P(u1, v0, lift), P(u1, v1, lift), P(u0, v1, lift)];
      mk('path', { d: 'M' + pts.map(q => q.map(f).join(' ')).join('L') + 'Z', fill: colFn(z((u0 + u1) / 2, (v0 + v1) / 2)), stroke: COL.board, 'stroke-width': .8, 'fill-opacity': op }, par);
    }
  };
  quads(g, 0, h => mix(mix(ANAT.bone, '#000000', .45), ANAT.bone, (h + 55) / 110), 1);
  const line = (fn, col) => { let d = ''; for (let i = 0; i <= 30; i++) { const q = -1 + 2 * i / 30, [x, y] = fn(q); d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`; } return path(g, d, { stroke: col, 'stroke-width': 5 }, { o: 0 }); };
  const conc = line(q => P(q, 0), COL.whole), conv = line(q => P(0, q), COL.task);
  const rider = G(g, { o: 0 });
  quads(rider, 0, () => CART, .55);
  if (t0 !== null) show(g, t0);
  return { g, conc, conv, rider, P, setRider: lift => put(rider, { y: -lift }) };
}

/* ---------- chapter 6: resistance exercise ---------- */
// Figure-local point -> stage point (like onStage, for a computed point).
const figPt = (f, P) => { const s = st(f.g), [x, y] = rotPt(P[0] * f.s, P[1] * f.s, s.r || 0); return [s.x + x, s.y + y]; };
// A dumbbell in a neutral grip, drawn around (0, 0) in group c: a bar with a shaded plate at each end, the bar along x.
// k scales it (1 ≈ a light dumbbell, 1.6 a heavy one).
function dumbbell(c, k = 1, col = '#9fb0bf') {
  const defs = mk('defs', {}, c), id = 'db' + (++SHADE_ID), gr = mk('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, mix(col, '#ffffff', .45)], [.45, col], [1, mix(col, '#000000', .5)]].forEach(([o, cc]) => mk('stop', { offset: o, 'stop-color': cc }, gr));
  const line = mix(col, '#000000', .6);
  mk('rect', { x: -25 * k, y: -3.5 * k, width: 50 * k, height: 7 * k, rx: 3 * k, fill: mix(col, '#000000', .25), stroke: line, 'stroke-width': 1.2 }, c);
  [-1, 1].forEach(sg => mk('rect', { x: sg * 22 * k - 7 * k, y: -17 * k, width: 14 * k, height: 34 * k, rx: 4 * k, fill: `url(#${id})`, stroke: line, 'stroke-width': 1.5 }, c));
  return c;
}
// A cardboard box drawn around (0, 0) in group c, w × h.
function boxProp(c, w = 60, h = 44, col = '#c9a97a') {
  mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3, fill: col, stroke: mix(col, '#000000', .5), 'stroke-width': 2 }, c);
  path(c, `M${-w / 2} ${-h / 2 + 9}H${w / 2}M0 ${-h / 2}V${-h / 2 + 9}`, { stroke: mix(col, '#000000', .35), 'stroke-width': 2 });
  return c;
}
// Something held in a hand of figure f (side 'N' or 'F'): draw0(c) draws it around (0, 0); it follows every pose change
// and scales with the figure. It sits `along` units past the wrist; turn: it turns with the forearm (a dumbbell in a
// neutral grip stays across the forearm), otherwise it stays level (a box).
function carry(p, f, draw0, { side = 'N', along = 12, turn = true } = {}) {
  const c = G(p);
  draw0(c);
  const upd = () => {
    const E = f.pts['E' + side], W = f.pts['W' + side], dx = W[0] - E[0], dy = W[1] - E[1], L = Math.hypot(dx, dy) || 1;
    const [x, y] = figPt(f, [W[0] + dx / L * along, W[1] + dy / L * along]);
    put(c, { x, y, s: f.s, r: turn ? Math.atan2(dy, dx) * 180 / Math.PI + 90 + (st(f.g).r || 0) : 0 });
  };
  f.onSet.push(upd); upd();
  return c;
}
// Path data of y = fn(x) on a chart: x and fn(x) in 0..1 map to the box with origin (x0, y0), w × h.
const fnPath = (x0, y0, w, h, fn, a = 0, b = 1, n = 80) => {
  let d = '';
  for (let i = 0; i <= n; i++) { const x = lerp(a, b, i / n); d += `${i ? 'L' : 'M'}${(x0 + x * w).toFixed(1)} ${(y0 - fn(x) * h).toFixed(1)}`; }
  return d;
};
// Pose between A and B (keys of B; missing keys of A from STAND).
const blendPose = (A, B, k) => { const o = {}; for (const key in B) o[key] = lerp(A[key] ?? STAND[key], B[key], k); return o; };
// A standing figure with a dumbbell in the near hand and the biceps on the arm: { f, mu, db }.
function curlFig(p, x, gy, s, k, t0) {
  const f = fig(p, { x, y: gy - 182 * s, s, o: 0, pose: { aN: 6, eN: 10 } });
  const mu = muscleOn(f, ...MUSCLE.biceps, { after: 'hdN', w: 11 });
  const db = carry(p, f, c => dumbbell(c, k));
  put(db, { o: 0 });
  if (t0 !== null) { show(f.g, t0); show(db, t0); }
  return { f, mu, db };
}
// n elbow curls of a curlFig (n + .5 ends at the top); the biceps works throughout.
function curls(c, t0, dur, n, { top = 125, lvl = 1 } = {}) {
  prog(q => { const e = (1 - Math.cos(2 * Math.PI * n * q)) / 2; c.f.set({ aN: 6, eN: lerp(10, top, e) }); c.mu.act(lvl); }, t0, dur, lin);
}

// An arrow "R" (resistance) ending at point B and pointing along (ux, uy); g.at(B, ux, uy) moves it.
function rArrow(p, col = COL.whole, L = 70) {
  const g = G(p, { o: 0 }), a = path(g, '', { stroke: col, 'stroke-width': 7 }), t = T(g, 'R', { size: 24, weight: 700, fill: col, anchor: 'middle' });
  g.at = (B, ux, uy) => {
    const n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
    const b = [B[0] - ux * 14, B[1] - uy * 14], s0 = [b[0] - ux * L, b[1] - uy * L], f = v => v.toFixed(1);
    a.setAttribute('d', `M${f(s0[0])} ${f(s0[1])}L${f(b[0])} ${f(b[1])}M${f(b[0] - ux * 16 - uy * 11)} ${f(b[1] - uy * 16 + ux * 11)}L${f(b[0])} ${f(b[1])}L${f(b[0] - ux * 16 + uy * 11)} ${f(b[1] - uy * 16 - ux * 11)}`);
    t.setAttribute('x', f(s0[0] - uy * 22)); t.setAttribute('y', f(s0[1] + ux * 22 + 8));
  };
  return g;
}

/* ---------- PNF: the patient from above, limbs in 3D (lessons 71–72) ---------- */
// Body coordinates: x to the screen's right (the patient's LEFT — a supine patient seen from above), y toward the feet,
// z toward the ceiling. Limbs are drawn by dropping z; height shows as a thicker limb and a shadow on the table.
const PNF_SKIN = '#d8d1c1', PNF_TH = '#b9cfe0';
const nrm = v => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; };
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add3 = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q)];
const perp = (t, v) => nrm(add3(t, v, -dot3(t, v)));
const bez3 = (A, C, B, q) => nrm([0, 1, 2].map(i => (1 - q) ** 2 * A[i] + 2 * q * (1 - q) * C[i] + q * q * B[i]));
// Flexion patterns of the RIGHT limbs: limb direction at the start (s), a lift between (c), at the end (e), and the
// direction of the thumb (arm) or of the toes (leg) at the start and end. Extension = the same path backwards.
const PAT = {
  armD1: { s: [-.45, .89, -.08], c: [.05, .1, 1.5], e: [.5, -.75, .43], ts: [.89, .45, 0], te: [-.5, -.2, .85] },
  armD2: { s: [.38, .88, .28], c: [-.1, .1, 1.5], e: [-.5, -.85, .15], ts: [.9, -.35, 0], te: [0, 0, -1] },
  legD1: { s: [-.35, .94, -.03], c: [0, .62, .9], e: [.35, .3, .88], ts: [.35, .6, .7], te: [-.3, -.95, .2] },
  legD2: { s: [.15, .99, 0], c: [-.15, .62, .9], e: [-.45, .3, .85], ts: [-.45, .6, .65], te: [.35, -.9, .25] },
};
// Where the therapist's hands go: d distal, p proximal = [segment (0 upper arm / thigh, 1 forearm / shank, 2 hand,
// 'tip' foot), fraction along it, under the limb]; B0 → B1 the therapist's stance from the start to the end.
const ARMB = { B0: [-330, -40], B1: [-315, -240] }, LEGB = { B0: [-330, 250], B1: [-300, 60] };
const SPEC = {
  armD1F: { d: [2, .5], p: [1, .2], ...ARMB }, armD1E: { d: [2, .5], p: [0, .85], ...ARMB },
  armD2F: { d: [2, .5], p: [1, .25], ...ARMB }, armD2E: { d: [2, .5], p: [1, .4], ...ARMB },
  legD1F: { d: ['tip', .6], p: [0, .85], ...LEGB }, legD1E: { d: ['tip', .55], p: [0, .97, true], ...LEGB },
  legD2F: { d: ['tip', .6], p: [0, .85], ...LEGB }, legD2E: { d: ['tip', .55], p: [0, .85, true], ...LEGB },
};
// Limb and thumb/toe directions at e (0 = start of the flexion pattern, 1 = end). The distal parts lead: they are
// complete by mid-range in either direction (rev = moving from the end back to the start).
function patPose(pt, e, rev = false) {
  e = clamp(e, 0, 1);
  const v = bez3(pt.s, pt.c, pt.e, e), w = rev ? clamp(2 * e - 1, 0, 1) : clamp(2 * e, 0, 1);
  return [v, perp(nrm(lerp3(pt.ts, pt.te, io(w))), v)];
}
// A moving right limb: chain from O along v; the tip is the thumb or the foot, pointing along t.
function mover(g, defs, line, shG, O, lens, radii, kind, f) {
  const mg = mk('g', {}, g);
  const mkL = (ra, rb) => { const sh = shadeGrad(defs, PNF_SKIN), e = mk('path', { fill: sh.url, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, mg); return { e, ra, rb, set(A, B, ka, kb) { e.setAttribute('d', capsuleD(A, B, ra * ka, rb * kb)); sh.aim(A, B, Math.max(ra * ka, rb * kb)); } }; };
  const segs = lens.map((_, i) => mkL(radii[i], radii[i + 1]));
  const tip = kind === 'foot' ? mkL(12, 9) : mkL(6.5, 5);
  const shs = [...segs, tip].map(() => mk('path', { fill: '#000' }, shG));
  const o = { O, Ltot: lens.reduce((a, b) => a + b, 0), onSet: [] };
  const kz = z => 1 + clamp(z, -60, 420) / 1300, flat = q => [q[0], q[1]], shd = q => [q[0] + .3 * Math.max(0, q[2]), q[1] + .45 * Math.max(0, q[2])];
  o.set = (v, t) => {
    v = nrm(v); t = perp(t, v); o.v = v; o.t = t;
    const P3 = [[O[0], O[1], 0]]; let d = 0;
    lens.forEach(l => { d += l; P3.push([O[0] + v[0] * d, O[1] + v[1] * d, v[2] * d]); });
    const n = P3.length - 1;
    let A3, B3;
    if (kind === 'foot') { A3 = add3(P3[n], t, -8); B3 = add3(P3[n], t, 56); }
    else { const b = lerp3(P3[n - 1], P3[n], .18); A3 = add3(b, t, 6); B3 = add3(b, t, 34); }
    [...segs.map((el, i) => [P3[i], P3[i + 1], el]), [A3, B3, tip]].forEach(([a, b, el], i) => {
      el.set(flat(a), flat(b), kz(a[2]), kz(b[2]));
      shs[i].setAttribute('d', capsuleD(shd(a), shd(b), el.ra, el.rb));
    });
    if (t[2] < -.2) mg.insertBefore(tip.e, segs[n - 1].e); else mg.appendChild(tip.e);   // thumb or toes toward the table: behind
    Object.assign(o, { P3, A3, B3 });
    o.onSet.forEach(fn => fn(o));
  };
  o.at = (i, q) => i === 'tip' ? f.stage(flat(lerp3(o.A3, o.B3, q))) : f.stage(flat(lerp3(o.P3[i], o.P3[i + 1], q)));
  return o;
}
// The patient supine on the table seen from above, head up the screen; the right arm and leg move (f.arm, f.leg).
function pnfFig(p, cx, cy, s, t0) {
  const g = G(p, { x: cx, y: cy, s, o: 0 }), defs = mk('defs', {}, g), line = mix(PNF_SKIN, COL.board, .62);
  const L = (ra, rb) => limbEl(g, defs, PNF_SKIN, ra, rb, line);
  mk('rect', { x: -165, y: -345, width: 360, height: 740, rx: 16, fill: PANEL, stroke: COL.dim, 'stroke-width': 3 }, g);
  L(26, 19).set([30, 0], [36, 170]); L(18, 12).set([36, 170], [40, 330]); L(12, 9).set([40, 326], [42, 350]);
  L(15, 12).set([84, -168], [96, -52]); L(12, 10).set([96, -52], [104, 52]); L(10, 9).set([104, 52], [107, 92]);
  L(56, 64).set([0, -18], [0, -138]); L(25, 25).set([-84, -168], [84, -168]);
  L(15, 15).set([0, -180], [0, -212]);
  const hg = mk('radialGradient', { id: 'pnh' + (++SHADE_ID), cx: .38, cy: .32, r: .78 }, defs);
  [[0, mix(PNF_SKIN, '#ffffff', .5)], [.55, PNF_SKIN], [1, mix(PNF_SKIN, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, hg));
  mk('circle', { cx: 0, cy: -250, r: 38, fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2 }, g);
  [-15, 15].forEach(x => mk('circle', { cx: x, cy: -258, r: 4.5, fill: mix(PNF_SKIN, '#000000', .6) }, g));
  mk('ellipse', { cx: 0, cy: -243, rx: 5.5, ry: 9, fill: mix(PNF_SKIN, '#000000', .1), stroke: line, 'stroke-width': 1.5 }, g);
  const shG = mk('g', { opacity: .2 }, g);
  const f = { g, s, stage: ([x, y]) => [cx + x * s, cy + y * s] };
  f.leg = mover(g, defs, line, shG, [-30, 0], [170, 160], [26, 18, 12], 'foot', f);
  f.arm = mover(g, defs, line, shG, [-84, -168], [118, 104, 46], [16, 12, 10, 9], 'thumb', f);
  f.leg.set([-.04, 1, 0], [0, 0, 1]); f.arm.set([-.1, .99, 0], [-.3, .1, 1]);
  f.eyes = f.stage([0, -258]);
  if (t0 !== null) show(g, t0);
  return f;
}
// Stage point of the hand tip or of the ankle for pattern pt at e.
function tipPos(f, limb, pt, e) { const [v] = patPose(pt, e); return f.stage([limb.O[0] + v[0] * limb.Ltot, limb.O[1] + v[1] * limb.Ltot]); }
// Ease a limb from wherever it is to pattern pt at e.
function toPose(limb, pt, e, t0, dur = .8, rev = false) {
  let from = null;
  prog(q => { if (!from) from = [limb.v, limb.t]; const [v, t] = patPose(pt, e, rev); limb.set(nrm(lerp3(from[0], v, q)), lerp3(from[1], t, q)); }, t0, dur);
}
// Pattern pt n times from t0 over dur: against resistance from the start to the end (end to start when rev), back
// unresisted; it first eases in from the current pose and finishes where it began. cb(e, act) after every frame.
function drive(limb, pt, t0, dur, n, { rev = false, cb = null } = {}) {
  const e0 = rev ? 1 : 0;
  toPose(limb, pt, e0, t0, .7, !rev);
  if (cb) prog(() => cb(e0, false), t0, .7, lin);
  prog(q => {
    const u = (q * n) % 1, ret = .3;
    let e, act;
    if (q >= 1) { e = e0; act = false; }
    else if (u < 1 - ret) { const w = io(u / (1 - ret)); e = rev ? 1 - w : w; act = true; }
    else { const w = io((u - 1 + ret) / ret); e = rev ? w : 1 - w; act = false; }
    const [v, t] = patPose(pt, e, act ? rev : !rev);
    limb.set(v, t);
    if (cb) cb(e, act);
  }, t0 + .7, Math.max(1, dur - .7), lin);
}
// A manual contact: the therapist's hand on the limb (dashed when it lies under the limb).
function contact(p) {
  const e = put(mk('ellipse', { rx: 25, ry: 16, fill: PNF_TH, stroke: mix(PNF_TH, COL.board, .5), 'stroke-width': 2.5 }, p), { o: 0 });
  e.at = (P, under, ang) => { put(e, { x: P[0], y: P[1], r: ang }); e.setAttribute('stroke-dasharray', under ? '6 5' : 'none'); e.setAttribute('fill-opacity', under ? .35 : .92); };
  return e;
}
// The therapist from above: shaded shoulders, the head (nose = facing) and two-link arms whose hands reach the two
// contacts, the elbows bending outward.
function therapistTop(p, t0) {
  const g = G(p, { o: 0 }), defs = mk('defs', {}, g), line = mix(PNF_TH, COL.board, .6), UA = 95, FA = 88;
  const arms = [0, 1].map(() => [limbEl(g, defs, PNF_TH, 14, 12, line), limbEl(g, defs, PNF_TH, 12, 10, line)]);
  const body = G(g, {}), bd = mk('defs', {}, body);
  limbEl(body, bd, PNF_TH, 27, 27, line).set([-58, 6], [58, 6]);
  const hg = mk('radialGradient', { id: 'thh' + (++SHADE_ID), cx: .38, cy: .32, r: .78 }, bd);
  [[0, mix(PNF_TH, '#ffffff', .5)], [.55, PNF_TH], [1, mix(PNF_TH, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, hg));
  mk('circle', { cx: 0, cy: 4, r: 25, fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2 }, body);
  mk('ellipse', { cx: 0, cy: -21, rx: 6, ry: 7, fill: PNF_TH, stroke: line, 'stroke-width': 1.5 }, body);
  const ik = (S, H, B) => {   // elbow of a two-link arm from S to H, bent away from the body centre B
    const dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 1;
    if (d >= UA + FA - 1) return [S[0] + dx / d * UA, S[1] + dy / d * UA];
    const al = Math.acos(clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1)), base = Math.atan2(dy, dx);
    const c = [-1, 1].map(k => [S[0] + UA * Math.cos(base + k * al), S[1] + UA * Math.sin(base + k * al)]);
    const far = q => Math.hypot(q[0] - B[0], q[1] - B[1]);
    return far(c[0]) > far(c[1]) ? c[0] : c[1];
  };
  g.set = (B, c1, c2) => {
    const mx = (c1[0] + c2[0]) / 2 - B[0], my = (c1[1] + c2[1]) / 2 - B[1], L = Math.hypot(mx, my) || 1, fx = mx / L, fy = my / L;
    put(body, { x: B[0], y: B[1], r: Math.atan2(fy, fx) * 180 / Math.PI + 90 });
    const s1 = [B[0] - fy * 56 + fx * 6, B[1] + fx * 56 + fy * 6], s2 = [B[0] + fy * 56 + fx * 6, B[1] - fx * 56 + fy * 6], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const pair = d(s1, c1) + d(s2, c2) <= d(s1, c2) + d(s2, c1) ? [[s1, c1], [s2, c2]] : [[s1, c2], [s2, c1]];
    pair.forEach(([S, H], i) => { const E = ik(S, H, B); arms[i][0].set(S, E); arms[i][1].set(E, H); });
  };
  if (t0 !== null) show(g, t0);
  return g;
}
// Contacts, an R arrow against the motion and (optionally) the therapist for one limb. rg.cb(pt, rev, spec) → drive cb.
function pnfRig(p, f, limb, { t0 = null, ther = null } = {}) {
  const lay = G(p, {}), th = ther !== null ? therapistTop(lay, ther) : null;
  const c1 = contact(lay), c2 = contact(lay), rG = G(lay, { o: t0 === null ? 1 : 0 }), Ra = rArrow(rG);
  if (t0 !== null) { show(c1, t0); show(c2, t0); show(rG, t0); }
  const rg = { c1, c2, R: Ra, th, dir: [1, 0] };
  const ang = i => { const a = limb.at(i, 0), b = limb.at(i, 1); return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; };
  rg.cb = (pt, rev, sp) => (e, act) => {
    const D0 = limb.at(sp.d[0], sp.d[1]), P0 = limb.at(sp.p[0], sp.p[1]);
    c1.at(D0, sp.d[2], ang(sp.d[0])); c2.at(P0, sp.p[2], ang(sp.p[0]));
    const a = tipPos(f, limb, pt, e - .03), b = tipPos(f, limb, pt, e + .03), sg = rev ? -1 : 1, ux = (b[0] - a[0]) * sg, uy = (b[1] - a[1]) * sg;
    if (Math.hypot(ux, uy) > 1.5) rg.dir = [-ux, -uy];
    Ra.at(D0, ...rg.dir); put(Ra, { o: act ? 1 : 0 });
    if (th) th.set(f.stage([lerp(sp.B0[0], sp.B1[0], e), lerp(sp.B0[1], sp.B1[1], e)]), D0, P0);
  };
  return rg;
}
const reps = dur => Math.max(1, Math.round(dur / 5));

/* ---------- chapter 7: aerobic exercise — heart, lungs, muscle fibres, ECG, ergometers ---------- */
const HEART_C = '#c8605a', BLOOD_A = '#e2574c', BLOOD_V = '#7f9fd0', LUNG_C = '#e8a8a8', ERGO = '#7f909c';
// Two-link leg reach: bend the near ('N') or far ('F') leg of a side-view figure so its ankle lands on a stage point (knee forward).
function legTo(f, side, X, Y) {
  const [tx, ty] = toLocal(f, X, Y), th = RIG.th, sh = RIG.sh, vx = tx * f.dir, vy = ty, dg = 180 / Math.PI;
  const D = clamp(Math.hypot(vx, vy), 20, th + sh - 1), phi = Math.atan2(vx, vy) * dg;
  const beta = Math.acos(clamp((th * th + D * D - sh * sh) / (2 * th * D), -1, 1)) * dg;
  const a1 = phi + beta, gam = Math.acos(clamp((th * th + sh * sh - D * D) / (2 * th * sh), -1, 1)) * dg;
  f.set({ ['h' + side]: a1 + f.pose.t, ['k' + side]: 180 - gam });
}
// A tube drawn twice: a dark rim and a lighter core (a vessel, the trachea).
const tube = (g, d, col, w) => { path(g, d, { stroke: mix(col, '#000000', .3), 'stroke-width': w }); return path(g, d, { stroke: col, 'stroke-width': w * .76 }); };
// A shaded heart from the front (apex to the viewer's right) with the aortic arch, the superior vena cava, the pulmonary
// trunk and the coronary arteries on its surface. Centre (x, y), scale s. h.beat(k): k 0..1 squeezes the ventricles;
// h.cor — the coronary arteries (a group); h.lad — the anterior descending artery.
function heartEl(p, x, y, s = 1, t0 = null) {
  const g = G(p, { x, y, s, o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g), id = 'ht' + (++SHADE_ID);
  const gr = mk('radialGradient', { id, cx: .36, cy: .3, r: .85 }, defs);
  [[0, mix(HEART_C, '#ffffff', .45)], [.5, HEART_C], [1, mix(HEART_C, '#000000', .5)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  tube(g, 'M-14 -36C-20 -118 72 -132 72 -70V-30', BLOOD_A, 30);
  path(g, 'M-22 -64C-24 -104 26 -120 54 -114', { stroke: mix(BLOOD_A, '#ffffff', .5), 'stroke-width': 6, 'stroke-opacity': .6 });
  tube(g, 'M-60 -30V-122', BLOOD_V, 26);
  tube(g, 'M16 -26C22 -64 40 -86 80 -92', BLOOD_V, 24);
  const body = G(g, {});
  mk('path', { d: 'M-72 -34C-106 -4 -100 58 -52 92C-18 116 32 132 82 148C88 108 98 44 82 2C70 -34 40 -54 8 -54C-22 -54 -50 -52 -72 -34Z',
    fill: `url(#${id})`, stroke: mix(HEART_C, '#000000', .55), 'stroke-width': 2.5 }, body);
  path(body, 'M-72 -30C-90 -20 -98 2 -94 26', { stroke: mix(HEART_C, '#000000', .4), 'stroke-width': 2 });
  path(body, 'M-58 -40C-40 -50 -20 -50 -6 -44', { stroke: mix(HEART_C, '#ffffff', .4), 'stroke-width': 5, 'stroke-opacity': .5 });
  const cor = G(body, {});
  const lad = path(cor, 'M14 -40C30 4 52 70 80 140', { stroke: BLOOD_A, 'stroke-width': 6 });
  path(cor, 'M20 -32C46 -18 72 -2 88 22', { stroke: BLOOD_A, 'stroke-width': 4.5 });
  path(cor, 'M-24 -40C-62 -26 -84 20 -62 74C-48 96 -12 110 22 120', { stroke: BLOOD_A, 'stroke-width': 4.5 });
  path(cor, 'M38 40L10 54M50 76L24 92M30 6L56 18M-76 30L-46 24', { stroke: BLOOD_A, 'stroke-width': 3 });
  const h = { g, body, cor, lad };
  h.beat = k => { const q = 1 - .07 * k; put(body, { x: 10 * (1 - q), y: 50 * (1 - q), s: q }); };
  if (t0 !== null) show(g, t0);
  return h;
}
// Lungs from the front with the trachea and the main bronchi; l.breathe(k): k 0..1 inflates them.
function lungsEl(p, x, y, s = 1, t0 = null) {
  const g = G(p, { x, y, s, o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g), id = 'lg' + (++SHADE_ID);
  const gr = mk('radialGradient', { id, cx: .4, cy: .3, r: .9 }, defs);
  [[0, mix(LUNG_C, '#ffffff', .4)], [.55, LUNG_C], [1, mix(LUNG_C, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  tube(g, 'M0 -160V-70M0 -70L-44 -34M0 -70L44 -34', '#d9cdb8', 22);
  path(g, 'M0 -156V-76', { stroke: '#b5a890', 'stroke-width': 17, 'stroke-dasharray': '3 9', 'stroke-linecap': 'butt' });
  const lobes = [-1, 1].map(sg => {
    const e = G(g, {});
    const d = sg < 0 ? 'M-24 -112C-70 -112 -122 -30 -124 70C-126 122 -100 142 -64 134C-40 128 -22 114 -20 82V-92C-20 -104 -22 -112 -24 -112Z'
      : 'M24 -112C70 -112 122 -30 124 70C126 122 100 142 64 134C48 130 40 122 34 106C46 86 42 60 22 52V-92C22 -104 22 -112 24 -112Z';
    mk('path', { d, fill: `url(#${id})`, stroke: mix(LUNG_C, '#000000', .5), 'stroke-width': 2.5 }, e);
    path(e, `M${44 * sg} -34L${70 * sg} 6M${44 * sg} -34L${62 * sg} 60M${44 * sg} -34L${92 * sg} -16M${62 * sg} 60L${88 * sg} 96M${70 * sg} 6L${100 * sg} 40`,
      { stroke: mix(LUNG_C, '#000000', .3), 'stroke-width': 3, 'stroke-opacity': .55 });
    return [e, sg];
  });
  const l = { g };
  l.breathe = k => lobes.forEach(([e, sg]) => e.setAttribute('transform', `translate(${22 * sg} -40) scale(${(1 + .07 * k).toFixed(3)} ${(1 + .1 * k).toFixed(3)}) translate(${-22 * sg} 40)`));
  if (t0 !== null) show(g, t0);
  return l;
}
// A muscle fascicle in cross-section: seven fibres, capillaries between them, mitochondria and enzyme dots inside.
// x.set({ cap, mito, enz }) — 0..1: training adds capillaries, more and larger mitochondria, more enzymes.
function fibreX(p, cx, cy, R = 130, { col = ANAT.muscle, t0 = null } = {}) {
  const g = G(p, { x: cx, y: cy, o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g), id = 'fx' + (++SHADE_ID);
  const gr = mk('radialGradient', { id, cx: .38, cy: .32, r: .8 }, defs);
  [[0, mix(col, '#ffffff', .35)], [.6, col], [1, mix(col, '#000000', .35)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  const r = R * .3, d = r * 2.14;
  const C = [[0, 0], ...[0, 1, 2, 3, 4, 5].map(i => [d * Math.cos(rad(i * 60 - 90)), d * Math.sin(rad(i * 60 - 90))])];
  mk('circle', { r: R, fill: mix(ANAT.tendon, COL.board, .75), stroke: mix(ANAT.tendon, COL.board, .3), 'stroke-width': 3 }, g);
  C.forEach(([a, b]) => mk('circle', { cx: a, cy: b, r, fill: `url(#${id})`, stroke: mix(col, '#000000', .45), 'stroke-width': 1.5 }, g));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const inner = [], outer = [];
  for (let i = 0; i < 6; i++) {
    const A = C[1 + i], B = C[1 + (i + 1) % 6], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, L = Math.hypot(mx, my);
    inner.push([(A[0] + B[0]) / 3, (A[1] + B[1]) / 3]);
    outer.push([mx / L * (L + r * .5), my / L * (L + r * .5)]);
  }
  const caps = [0, 3, 1, 4, 2, 5].flatMap(i => [inner[i], outer[i]]).map(([a, b]) => mk('circle', { cx: a.toFixed(1), cy: b.toFixed(1), r: r * .15, fill: BLOOD_A, stroke: mix(BLOOD_A, '#000000', .4), 'stroke-width': 1.5 }, g));
  const mito = [], enz = [];
  C.forEach(([a, b]) => {
    for (let i = 0; i < 8; i++) {
      const an = rnd() * 2 * Math.PI, rr = Math.sqrt(rnd()) * r * .66;
      mito.push(mk('ellipse', { cx: (a + rr * Math.cos(an)).toFixed(1), cy: (b + rr * Math.sin(an)).toFixed(1), rx: r * .15, ry: r * .08, fill: '#c97a3a', stroke: '#7a4420', 'stroke-width': 1.2,
        transform: `rotate(${Math.round(rnd() * 180)} ${(a + rr * Math.cos(an)).toFixed(1)} ${(b + rr * Math.sin(an)).toFixed(1)})` }, g));
    }
    for (let i = 0; i < 10; i++) { const an = rnd() * 2 * Math.PI, rr = Math.sqrt(rnd()) * r * .8; enz.push(mk('circle', { cx: (a + rr * Math.cos(an)).toFixed(1), cy: (b + rr * Math.sin(an)).toFixed(1), r: 2.6, fill: ANAT.taut }, g)); }
  });
  const fx = { g, r, C };
  fx.set = ({ cap = 0, mito: mi = 0, enz: en = 0 } = {}) => {
    const nc = Math.round(4 + 8 * cap), nm = Math.round(2 + 6 * mi), ne = Math.round(2 + 8 * en), k = 1 + .5 * mi;
    caps.forEach((e, i) => e.setAttribute('opacity', i < nc ? 1 : 0));
    mito.forEach((e, i) => { e.setAttribute('opacity', i % 8 < nm ? 1 : 0); e.setAttribute('rx', (r * .15 * k).toFixed(1)); e.setAttribute('ry', (r * .08 * k).toFixed(1)); });
    enz.forEach((e, i) => e.setAttribute('opacity', i % 10 < ne ? 1 : 0));
  };
  fx.set({});
  if (t0 !== null) show(g, t0);
  return fx;
}
// An ECG trace: baseline y0 from x0, w wide, R wave h tall. e.set(bpm, t, st) draws win seconds from time t;
// st shifts the ST segment (minus is a depression), in units of h. The waves narrow a little at a fast rate.
function ecgStrip(p, x0, y0, w, h, { col = COL.good, win = 4, t0 = null } = {}) {
  const g = G(p, { o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g), id = 'ec' + (++SHADE_ID);
  const cp = mk('clipPath', { id }, defs);
  mk('rect', { x: x0, y: y0 - h * 1.4, width: w, height: h * 2.6 }, cp);
  let gd = '';
  for (let i = 0; i <= win * 5; i++) gd += `M${(x0 + i * w / (win * 5)).toFixed(1)} ${y0 - h * 1.3}V${y0 + h * .9}`;
  path(g, gd, { stroke: COL.faint, 'stroke-width': 1, 'stroke-opacity': .5 });
  const tr = path(g, '', { stroke: col, 'stroke-width': 3, 'clip-path': `url(#${id})` });
  const X = s => x0 + s / win * w, f = v => v.toFixed(1);
  const e = { g, tr };
  e.set = (bpm, t = 0, st = 0) => {
    const T = 60 / bpm, c = Math.min(1, Math.sqrt(T));
    let d = '';
    for (let k = Math.floor(t / T) - 1; k * T < t + win; k++) {
      const b = k * T - t, P = (s, v) => `${f(X(b + s * c))} ${f(y0 - v * h)}`;
      d += `M${P(0, 0)}L${P(.04, 0)}Q${P(.09, .26)} ${P(.14, 0)}L${P(.18, 0)}L${P(.19, -.1)}L${P(.21, 1)}L${P(.235, -.28)}L${P(.26, st)}L${P(.34, st)}Q${P(.42, .62 + st)} ${P(.5, 0)}L${f(X(b + T))} ${f(y0)}`;
    }
    tr.setAttribute('d', d);
  };
  e.set(70);
  if (t0 !== null) show(g, t0);
  return e;
}
// An upright cycle ergometer with its rider (side view, facing right): { g, f, q4, ham, crank(a), C, HB }.
// The seat is at (x, gy − 180·k), the crank in front of it, the flywheel at the front; k = s / .85.
function cycleErgo(p, x, gy, s = .85, t0 = null) {
  const k = s / .85, g = G(p, { o: t0 === null ? 1 : 0 }), seat = [x, gy - 180 * k], C = [x + 90 * k, gy - 60 * k], cr = 34 * k, HB = [C[0] + 90 * k, C[1] - 140 * k];
  const FW = [C[0] + 118 * k, gy - 50 * k], fr = 38 * k;
  path(g, `M${C[0] - 60 * k} ${gy}H${FW[0] + 50 * k}M${C[0]} ${C[1]}V${gy}M${FW[0]} ${FW[1]}L${FW[0] + 10 * k} ${gy}`, { stroke: ERGO, 'stroke-width': 7 * k });
  mk('circle', { cx: FW[0], cy: FW[1], r: fr, fill: '#3d4a52', stroke: ERGO, 'stroke-width': 4 * k }, g);
  const spokes = path(g, `M${FW[0] - fr * .8} ${FW[1]}H${FW[0] + fr * .8}M${FW[0]} ${FW[1] - fr * .8}V${FW[1] + fr * .8}`, { stroke: ERGO, 'stroke-width': 3 * k });
  path(g, `M${C[0]} ${C[1] - 10 * k}L${FW[0]} ${FW[1] - 10 * k}M${C[0]} ${C[1] + 10 * k}L${FW[0]} ${FW[1] + 10 * k}`, { stroke: '#5b6b78', 'stroke-width': 2.5 * k });
  path(g, `M${seat[0] - 26 * k} ${seat[1]}H${seat[0] + 26 * k}M${seat[0]} ${seat[1]}L${C[0]} ${C[1]}L${C[0] + 60 * k} ${C[1] - 140 * k}H${HB[0]}`, { stroke: ERGO, 'stroke-width': 7 * k });
  mk('circle', { cx: C[0], cy: C[1], r: cr, fill: 'none', stroke: ERGO, 'stroke-width': 3 * k }, g);
  const f = fig(g, { s, pose: { ...SIT, t: 22, aN: 60, eN: 30, aF: 60, eF: 30 } });
  plant(f, 'H', seat[0] + 4 * k, seat[1] - 10 * k);
  const e = { g, f, C, HB, q4: muscleOn(f, ...MUSCLE.rectus, { after: 'ftN', w: 10 }), ham: muscleOn(f, ...MUSCLE.hamstrings, { after: 'ftN', w: 10 }) };
  e.crank = (a, lvl = .9) => {
    legTo(f, 'N', C[0] + cr * Math.cos(a), C[1] + cr * Math.sin(a)); legTo(f, 'F', C[0] - cr * Math.cos(a), C[1] - cr * Math.sin(a));
    reach(f, 'N', HB[0] - 6 * k, HB[1] + 4 * k); reach(f, 'F', HB[0] - 14 * k, HB[1] + 2 * k);
    e.q4.act(Math.max(0, Math.sin(a)) * lvl); e.ham.act(Math.max(0, -Math.sin(a)) * lvl);
    spokes.setAttribute('transform', `rotate(${(a * 180 / Math.PI * 2.5 % 360).toFixed(1)} ${FW[0]} ${FW[1]})`);
  };
  e.crank(0, 0);
  if (t0 !== null) show(g, t0);
  return e;
}
// A treadmill with a walker or runner (side view, facing right). tm.set({ grade, ph, run }): grade in percent tilts
// the deck about its rear end; ph — the gait phase in cycles (the belt runs back); the lower ankle stands on the belt.
function treadmill(p, x, gy, s = .9, t0 = null) {
  const k = s / .9, g = G(p, { o: t0 === null ? 1 : 0 }), L = 360 * k, x0 = x - 240 * k, dy0 = gy - 34 * k;
  const leg = path(g, '', { stroke: ERGO, 'stroke-width': 8 * k });
  path(g, `M${x0 - 14 * k} ${gy}H${x0 + L + 24 * k}M${x0} ${gy}V${dy0 + 10 * k}`, { stroke: ERGO, 'stroke-width': 8 * k });
  const deck = G(g, {});
  mk('rect', { x: x0 - 8 * k, y: dy0, width: L + 16 * k, height: 22 * k, rx: 10 * k, fill: '#3d4a52', stroke: '#2c353d', 'stroke-width': 2 }, deck);
  const belt = path(deck, `M${x0} ${dy0}H${x0 + L}`, { stroke: '#8a9aa6', 'stroke-width': 5 * k, 'stroke-dasharray': `${16 * k} ${12 * k}`, 'stroke-linecap': 'butt' });
  // the upright, the console and the handrail stand on the base and do not tilt with the deck
  path(g, `M${x0 + L + 18 * k} ${gy}L${x0 + L + 30 * k} ${dy0 - 200 * k}M${x0 + L + 24 * k} ${dy0 - 150 * k}H${x0 + L - 100 * k}`, { stroke: ERGO, 'stroke-width': 7 * k });
  mk('rect', { x: x0 + L - 4 * k, y: dy0 - 236 * k, width: 70 * k, height: 40 * k, rx: 6 * k, fill: '#2c353d', stroke: ERGO, 'stroke-width': 3 }, g);
  const f = fig(g, { s });
  const tm = { g, f, deck, grade: 0, x0, dy0, L };
  tm.yAt = (X, a) => dy0 - (X - x0) * Math.tan(a);
  tm.set = ({ grade = tm.grade, ph = 0, run = false } = {}) => {
    tm.grade = grade;
    const a = Math.atan(grade / 100), deg = a * 180 / Math.PI;
    deck.setAttribute('transform', `rotate(${(-deg).toFixed(2)} ${x0} ${dy0})`);
    belt.setAttribute('stroke-dashoffset', (ph * 130 * k * (run ? 1.6 : 1)).toFixed(1));
    const fx = x0 + L - 30 * k;
    leg.setAttribute('d', `M${fx.toFixed(1)} ${(tm.yAt(fx, a) + 18 * k).toFixed(1)}V${gy}`);
    const pose = gaitPose(2 * Math.PI * ph, 1, run);
    f.set({ ...pose, t: pose.t + deg * .6, fN: pose.fN + deg, fF: pose.fF + deg });
    put(f.g, { x, y: 0 });
    let oy = Infinity;
    for (const kk of ['AN', 'AF']) { const P = onStage(f, kk); oy = Math.min(oy, tm.yAt(P[0], a) - P[1]); }
    put(f.g, { x, y: oy - 2.5 * k });
  };
  tm.set({});
  if (t0 !== null) show(g, t0);
  return tm;
}

/* ---------- chapter 8: balance ---------- */
// Colours: centre of mass (COM) and its plumb point (COG) — orange; base of support (BOS) — green; centre of
// pressure (COP) — red; limits of stability (LOS) — blue; foam and other soft supports — sand.
const COM_C = COL.task, BOS_C = COL.good, COP_C = '#ff7a6a', LOS_C = COL.whole, FOAM = '#c8b27a';
// More muscles on a side-view figure (near side), for the balance strategies: tibialis anterior, quadriceps,
// abdominals, erector spinae, iliopsoas.
Object.assign(MUSCLE, {
  tibAnt: [['KN', 'AN', 16, -10], ['AN', 'toeN', 14, -5]],
  quads: [['H', 'KN', 26, -14], ['KN', 'AN', 12, -13]],
  abdom: [['H', 'Sh', 8, 22], ['H', 'Sh', 98, 25]],
  parasp: [['H', 'Sh', 2, -20], ['H', 'Sh', 108, -25]],
  iliopsoas: [['H', 'Sh', 55, 2], ['H', 'KN', 24, -6]],
});
// Hip strategy: trunk lean t (+ forward) with the hips moved back by b degrees; legs straight, feet flat.
const HIPSTRAT = (t, b) => ({ ...STAND, t, hN: t + b, hF: t + b, kN: 0, kF: 0, fN: -b, fF: -b, aN: t + 14, aF: t - 2 });

// The centre-of-mass symbol: a circle in quarters, two of them filled.
function comSym(p, x = 0, y = 0, r = 15, col = COM_C) {
  const g = G(p, { x, y });
  mk('circle', { r, fill: COL.board, stroke: col, 'stroke-width': 3 }, g);
  mk('path', { d: `M0 0V${-r}A${r} ${r} 0 0 1 ${r} 0ZM0 0V${r}A${r} ${r} 0 0 1 ${-r} 0Z`, fill: col }, g);
  return g;
}

/* feet seen from above, the base of support */
// A foot outline from above: heel centre at (0, 0), toes toward −y, about 115 long (≈ 26 cm); side 1 is the right
// foot (big toe on the left), −1 the left. FOOT_PTS: points of the outline for the hull.
const FOOT_PTS = [[0, 14], [-12, 11], [-16, 0], [-14, -24], [-15, -52], [-21, -74], [-20, -90], [-11, -101], [1, -100], [12, -95], [20, -82], [21, -60], [18, -30], [15, -4], [10, 11]];
function footD(side = 1) {
  const q = (x, y) => `${(x * side).toFixed(1)} ${y}`;
  return `M${q(0, 14)}C${q(-10, 14)} ${q(-16, 8)} ${q(-16, 0)}C${q(-16, -18)} ${q(-11, -36)} ${q(-14, -54)}C${q(-17, -66)} ${q(-24, -78)} ${q(-20, -91)}` +
    `C${q(-16, -102)} ${q(-5, -104)} ${q(3, -100)}C${q(11, -97)} ${q(19, -89)} ${q(21, -77)}C${q(24, -62)} ${q(20, -40)} ${q(17, -20)}C${q(16, -6)} ${q(12, 14)} ${q(0, 14)}Z`;
}
// Convex hull (monotone chain), polygon path, point-in-polygon.
function hull(P) {
  const a = P.map(q => [q[0], q[1]]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const lo = [], up = [];
  for (const q of a) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of a.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const polyD = P => 'M' + P.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Stances for stanceTop: [x, y, angle] of each heel centre (L = the screen-left foot), upL/upR lift a foot (0..1).
const STANCES = {
  apart: { L: [-40, 50, -6], R: [40, 50, 6] },
  together: { L: [-17, 50, 0], R: [17, 50, 0] },
  wide: { L: [-95, 50, -10], R: [95, 50, 10] },
  tandem: { L: [0, 108, 0], R: [0, -8, 0] },
  single: { L: [-40, 50, -6], R: [40, 50, 6], upL: 1 },
  step: { L: [-30, 112, -4], R: [30, -12, 4] },
};
// Feet from above with the base of support (the hull of the feet on the ground, green), the centre of gravity
// (⊕, the plumb point of the centre of mass) and the centre of pressure (red dot). st.set({ L, R, upL, upR, cog, cop })
// places them in local units; st.to(name or object, t0, dur) tweens; st.inside — the COG is over the base;
// st.area() — the area of the base; st.at([x, y]) — a local point on the stage.
function stanceTop(p, cx, cy, s = 1, t0 = null, { stance = 'apart', foot = '#cfc8b8', marks = true } = {}) {
  const g = G(p, { x: cx, y: cy, s, o: 0 });
  const bos = mk('path', { fill: mix(BOS_C, COL.board, .8), stroke: BOS_C, 'stroke-width': 3 / s, 'stroke-linejoin': 'round' }, g);
  const feet = ['L', 'R'].map(k => {
    const fg = G(g), side = k === 'R' ? 1 : -1;
    const e = mk('path', { d: footD(side), fill: mix(foot, COL.board, .4), stroke: foot, 'stroke-width': 2.5 / s }, fg);
    [[-10, -91, 7.5], [1, -94, 4.6], [8.5, -90, 4.2], [14, -84, 3.8], [18, -76, 3.4]].forEach(([u, v, r]) => mk('circle', { cx: u * side, cy: v, r, fill: mix(foot, COL.board, .2) }, fg));
    return { k, g: fg, e, side };
  });
  const cog = comSym(g, 0, 0, 14), cop = mk('circle', { r: 9, fill: COP_C, stroke: COL.board, 'stroke-width': 2 }, g);
  if (!marks) { put(cog, { o: 0 }); put(cop, { o: 0 }); }
  const o = { g, bos, feet, cog, cop, poly: [], inside: true, st: { upL: 0, upR: 0, cog: [0, 0], cop: [0, 0], ...JSON.parse(JSON.stringify(STANCES[stance])) } };
  o.set = q => {
    Object.assign(o.st, q);
    const S0 = o.st, pts = [];
    feet.forEach(ft => {
      const [x, y, r] = S0[ft.k], up = S0['up' + ft.k] || 0;
      put(ft.g, { x, y: y - 10 * up, r, s: 1 + .06 * up });
      ft.e.setAttribute('stroke-dasharray', up > .5 ? '7 6' : 'none');
      ft.g.setAttribute('opacity', (1 - .55 * up).toFixed(2));
      if (up < .5) FOOT_PTS.forEach(([u, v]) => { const [a, b] = rotPt(u * ft.side, v, r); pts.push([x + a, y + b]); });
    });
    o.poly = pts.length ? hull(pts) : [];
    bos.setAttribute('d', o.poly.length ? polyD(o.poly) : '');
    put(cog, { x: S0.cog[0], y: S0.cog[1] });
    cop.setAttribute('cx', S0.cop[0].toFixed(1)); cop.setAttribute('cy', S0.cop[1].toFixed(1));
    o.inside = o.poly.length > 2 && inPoly(o.poly, S0.cog[0], S0.cog[1]);
    bos.setAttribute('stroke', o.inside ? BOS_C : COL.bad);
    bos.setAttribute('fill', mix(o.inside ? BOS_C : COL.bad, COL.board, .8));
    return o;
  };
  o.to = (name, t0, dur = .8, ease = io) => {
    let from = null;
    const to = typeof name === 'string' ? { upL: 0, upR: 0, ...STANCES[name] } : name;
    prog(q => {
      if (!from) from = JSON.parse(JSON.stringify(o.st));
      const n = {};
      for (const k in to) n[k] = Array.isArray(to[k]) ? to[k].map((v, i) => lerp(from[k][i], v, q)) : lerp(from[k], to[k], q);
      o.set(n);
    }, t0, dur, ease);
  };
  o.area = () => { let a = 0; const P = o.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };
  o.at = ([x, y]) => [cx + x * s, cy + y * s];
  o.set({});
  if (t0 !== null) show(g, t0);
  return o;
}

/* frontStand: a standing figure seen from the front */
// Local origin: the ground point midway between the feet (the group sits at (x, gy), scale s). L and R are the
// screen-left and screen-right sides (the figure faces us: its right side is on the screen left). f.set({ … }):
//   w — half the distance between the ankles; shift — sideways shift of the pelvis (+ = to the screen right);
//   drop — pelvis lowered (the knees bend toward us); tilt — pelvic obliquity in degrees (+ = clockwise on screen);
//   lean — trunk side bend from vertical (+ = toward the screen right); hd — head tilt;
//   aL, aR — shoulder abduction (0 hanging, 90 horizontal, 180 overhead); eL, eR — elbow bend in the same plane;
//   liftL, liftR — hip flexion of a lifted leg in degrees (the knee comes toward us, the shank hangs);
//   abL, abR — abduction of a lifted leg in degrees.
// Muscles (above the body, glowing when active): f.mus.medL/medR — gluteus medius, f.mus.addL/addR — adductors.
// f.com() — the centre of mass on the stage; f.at(P) — a local point on the stage; f.pts — local joint points.
function frontStand(p, x, gy, s = 1, t0 = null, { col = '#d8d1c1', pose = {}, muscles = true } = {}) {
  const g = G(p, { x, y: gy, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62);
  const Lm = (ra, rb) => limbEl(g, defs, col, ra, rb, line);
  const f = { g, s, x, gy, onSet: [], mus: {}, pts: {},
    pose: { w: 30, shift: 0, drop: 0, tilt: 0, lean: 0, hd: 0, aL: 8, aR: 8, eL: 6, eR: 6, liftL: 0, liftR: 0, abL: 0, abR: 0, ...pose } };
  const feet = [0, 1].map(() => mk('path', { fill: mix(col, '#000000', .18), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g));
  const legs = [0, 1].map(() => [Lm(20, 14), Lm(14, 9)]);
  // the trunk: one tapered outline from the hips to the shoulders, shaded across; round deltoid caps
  const tSh = shadeGrad(defs, col), trunk = mk('path', { fill: tSh.url, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  const neck = Lm(10, 10), delts = [0, 1].map(() => Lm(16, 13));
  const TRUNK = [[0, -30], [18, -32], [44, -18], [50, 4], [42, 28], [35, 58], [40, 88], [50, 108], [46, 122], [24, 126], [0, 124]];
  const arms = [0, 1].map(() => [Lm(12, 10), Lm(10, 7.5), Lm(7.5, 6)]);
  const hg = mk('radialGradient', { id: 'fs' + (++SHADE_ID), cx: .38, cy: .32, r: .78 }, defs);
  [[0, mix(col, '#ffffff', .5)], [.55, col], [1, mix(col, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, hg));
  const head = mk('circle', { r: 26, fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2 }, g);
  f.top = mk('g', {}, g);
  const add = (A, v, k = 1) => [A[0] + v[0] * k, A[1] + v[1] * k], rot = (v, a) => rotPt(v[0], v[1], a);
  const geo = q => {
    const hipOff = [rot([-28, 0], q.tilt), rot([28, 0], q.tilt)], lift = [q.liftL, q.liftR];
    const ank = [[-q.w, -10], [q.w, -10]];
    let py = Infinity;
    [0, 1].forEach(i => { if (lift[i] > 0) return; const dx = q.shift + hipOff[i][0] - ank[i][0]; py = Math.min(py, ank[i][1] - Math.sqrt(Math.max(0, 182 * 182 - dx * dx)) - hipOff[i][1]); });
    if (py === Infinity) py = -192;
    const P = [q.shift, py + q.drop], H = hipOff.map(o => add(P, o));
    const legs2 = [0, 1].map(i => {
      const out = i ? -1 : 1, ab = i ? q.abR : q.abL;
      if (lift[i] > 0) {   // a lifted leg: the thigh comes toward us (foreshortened), the shank hangs
        const d = rot([0, 1], out * ab), K = add(H[i], d, 92 * Math.cos(rad(lift[i]))), A = add(K, d, 90);
        return [K, A, d];
      }
      const A = ank[i], D = [A[0] - H[i][0], A[1] - H[i][1]], L = Math.hypot(...D), d = [D[0] / L, D[1] / L];
      return [add(H[i], D, 92 / 182), A, d];
    });
    const up = [Math.sin(rad(q.lean)), -Math.cos(rad(q.lean))], Sc = add(P, up, 118);
    const Sh = [add(Sc, rot([-52, 0], q.lean)), add(Sc, rot([52, 0], q.lean))];
    const Nk = add(Sc, rot([0, -16], q.lean + q.hd)), Hc = add(Sc, rot([0, -40], q.lean + q.hd));
    const arm = i => {
      const k = i ? 1 : -1, a = rad(i ? q.aR : q.aL), e = rad(i ? q.eR : q.eL);
      const d1 = rot([k * Math.sin(a), Math.cos(a)], q.lean), E = add(Sh[i], d1, 72);
      const d2 = rot([k * Math.sin(a + e), Math.cos(a + e)], q.lean), W = add(E, d2, 66);
      return [E, W, add(W, d2, 22)];
    };
    return { P, H, legs: legs2, Sc, Sh, Nk, Hc, arms: [arm(0), arm(1)] };
  };
  // muscle attachments: gluteus medius from the iliac crest to the greater trochanter, adductors from the pubis
  // to the inner femur; they follow the pelvis and the thighs
  const att = (q, G0) => {
    const r = [];
    [0, 1].forEach(i => {
      const out = i ? 1 : -1, d = G0.legs[i][2], n = [-d[1] * -out, d[0] * -out];   // n points outward
      r.push([add(G0.P, rot([out * 42, -44], q.tilt)), add(add(G0.H[i], d, 16), n, 17)]);
      r.push([add(G0.P, rot([out * 9, 14], q.tilt)), add(add(G0.H[i], d, 78), n, -9)]);
    });
    return r;
  };
  const G0 = geo(f.pose), A0 = att(f.pose, G0), len = ([A, B]) => Math.hypot(B[0] - A[0], B[1] - A[1]);
  const MN = ['medL', 'addL', 'medR', 'addR'];
  if (muscles) MN.forEach((k, i) => { f.mus[k] = muscleEl(f.top, { rest: len(A0[i]), w: k.startsWith('med') ? 13 : 11 }); });
  f.com = () => {
    const q = f.pts, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const parts = [[q.Hc, .08], [mid(q.P, q.Sc), .46], [mid(q.H[0], q.legs[0][0]), .1], [mid(q.H[1], q.legs[1][0]), .1], [mid(q.legs[0][0], q.legs[0][1]), .05],
      [mid(q.legs[1][0], q.legs[1][1]), .05], [mid(q.Sh[0], q.arms[0][1]), .05], [mid(q.Sh[1], q.arms[1][1]), .05], [q.legs[0][1], .03], [q.legs[1][1], .03]];
    let cx = 0, cy = 0;
    for (const [P, w] of parts) { cx += P[0] * w; cy += P[1] * w; }
    return f.at([cx, cy]);
  };
  f.at = P => { const s0 = st(g); return [s0.x + P[0] * s0.s, s0.y + P[1] * s0.s]; };
  f.set = q => {
    Object.assign(f.pose, q);
    const pz = f.pose, Q = geo(pz);
    [0, 1].forEach(i => {
      const [K, A, d] = Q.legs[i], out = i ? 1 : -1;
      legs[i][0].set(Q.H[i], K); legs[i][1].set(K, A);
      const fx = A[0] + out * 5, fy = A[1] + 4, fv = v => v.toFixed(1);
      feet[i].setAttribute('d', `M${fv(fx - 15)} ${fv(fy - 6)}Q${fv(fx)} ${fv(fy - 12)} ${fv(fx + 15)} ${fv(fy - 6)}L${fv(fx + 18)} ${fv(fy + 6)}Q${fv(fx)} ${fv(fy + 10)} ${fv(fx - 18)} ${fv(fy + 6)}Z`);
      const [E, W, X] = Q.arms[i];
      arms[i][0].set(Q.Sh[i], E); arms[i][1].set(E, W); arms[i][2].set(W, X);
    });
    const ax = [Math.sin(rad(pz.lean)), -Math.cos(rad(pz.lean))], lat = [-ax[1], ax[0]], tp = ([v, u]) => [Q.P[0] + ax[0] * u + lat[0] * v, Q.P[1] + ax[1] * u + lat[1] * v];
    const side = TRUNK.map(tp), other = TRUNK.slice(1, -1).reverse().map(([v, u]) => tp([-v, u])), fv = v => v.toFixed(1);
    trunk.setAttribute('d', 'M' + side.concat(other).map(P => fv(P[0]) + ' ' + fv(P[1])).join('L') + 'Z');
    tSh.aim(Q.P, Q.Sc, 52);
    neck.set(Q.Sc, Q.Nk);
    [0, 1].forEach(i => { const E = Q.arms[i][0], d = [E[0] - Q.Sh[i][0], E[1] - Q.Sh[i][1]], L = Math.hypot(...d); delts[i].set(Q.Sh[i], [Q.Sh[i][0] + d[0] / L * 16, Q.Sh[i][1] + d[1] / L * 16]); });
    head.setAttribute('cx', Q.Hc[0].toFixed(1)); head.setAttribute('cy', Q.Hc[1].toFixed(1));
    Object.assign(f.pts, Q);
    if (muscles) { const A = att(pz, Q); MN.forEach((k, i) => f.mus[k].set(...A[i])); }
    f.onSet.forEach(fn => fn(f));
    return f;
  };
  f.set({});
  if (t0 !== null) show(g, t0);
  return f;
}

/* supports: foam, a wobble board, a gait belt */
// A foam pad (side view) standing on the ground at gy, width w, height h; returns { g, top }.
function foamPad(p, x, gy, w = 220, h = 46, t0 = null) {
  const g = G(p, { o: t0 === null ? 1 : 0 });
  mk('rect', { x: x - w / 2, y: gy - h, width: w, height: h, rx: 14, fill: mix(FOAM, COL.board, .45), stroke: FOAM, 'stroke-width': 3 }, g);
  for (let i = 0; i < Math.floor(w / 22); i++) mk('circle', { cx: x - w / 2 + 14 + i * 22, cy: gy - h / 2 + (i % 2 ? 7 : -7), r: 3.5, fill: mix(FOAM, COL.board, .2) }, g);
  if (t0 !== null) show(g, t0);
  return { g, top: gy - h };
}
// A wobble board (side view): a board of width w on a half-dome rocker standing on the ground at gy.
// wb.set(deg) tilts the board (+ = clockwise); wb.at(dx) — the stage point on the board top dx from its centre.
function wobbleBoard(p, x, gy, w = 240, t0 = null, { col = '#b98a5a' } = {}) {
  const g = G(p, { o: t0 === null ? 1 : 0 }), R = 34, py = gy - R;
  mk('path', { d: `M${x - R} ${gy}A${R} ${R} 0 0 1 ${x + R} ${gy}Z`, fill: mix(col, COL.board, .4), stroke: col, 'stroke-width': 3 }, g);
  const board = G(g, { x, y: py });
  mk('rect', { x: -w / 2, y: -16, width: w, height: 16, rx: 7, fill: col, stroke: mix(col, '#000000', .35), 'stroke-width': 2 }, board);
  const wb = { g, board, ang: 0 };
  wb.set = deg => { wb.ang = deg; put(board, { x, y: py, r: deg }); return wb; };
  wb.at = dx => { const [a, b] = rotPt(dx, -16, wb.ang); return [x + a, py + b]; };
  wb.set(0);
  if (t0 !== null) show(g, t0);
  return wb;
}
// A gait belt round the waist of a side-view figure; belt.handle() — the stage point at the back of the belt
// (where the therapist holds it).
function gaitBelt(f, { col = '#6fa8c8' } = {}) {
  const e = mk('path', { stroke: col, 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }, f.g);
  f.g.insertBefore(e, f.parts.thN.e);
  const belt = { e };
  const upd = () => {
    const H = f.pts.H, S = f.pts.Sh, L = Math.hypot(S[0] - H[0], S[1] - H[1]), ux = (S[0] - H[0]) / L, uy = (S[1] - H[1]) / L;
    const C = [H[0] + ux * 30, H[1] + uy * 30], n = [-uy, ux], r = 26, v = x => x.toFixed(1);
    e.setAttribute('d', `M${v(C[0] - n[0] * r)} ${v(C[1] - n[1] * r)}L${v(C[0] + n[0] * r)} ${v(C[1] + n[1] * r)}`);
    belt.local = [C[0] - n[0] * r * f.dir, C[1] - n[1] * r * f.dir];
  };
  belt.handle = () => { upd(); const s = st(f.g), [x, y] = rotPt(belt.local[0] * f.s, belt.local[1] * f.s, s.r || 0); return [s.x + x, s.y + y]; };
  f.onSet.push(upd); upd();
  return belt;
}

/* ---------- chapter 9: aquatic exercise — the pool, floating patients, buoyancy devices, forces of water ---------- */
// Colours: water (top and deep), the surface line, foam buoyancy devices (orange), the buoyancy force and the centre
// of buoyancy (pale cyan), drag and other resistance of the water (blue, drawn with a dark halo).
const WATER_T = '#3f93c2', WATER_B = '#1a4b69', SURF_C = '#a8def5', FLOAT_C = '#f2a65a', BUOY_C = '#c4f1ff', COB_C = '#7fd8f0', DRAG_C = COL.whole;
// Heights above the hip joint (figure units, × scale) of the immersion levels of a standing side-view figure:
// the seventh cervical vertebra (C7), the xiphoid process, the anterior superior iliac spine (ASIS).
const IMM = { c7: 138, xiph: 78, asis: 16 };
function waterGrad(defs) {
  const gr = mk('linearGradient', { id: 'wat' + (++SHADE_ID), x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  mk('stop', { offset: 0, 'stop-color': WATER_T }, gr); mk('stop', { offset: 1, 'stop-color': WATER_B }, gr);
  return `url(#${gr.id})`;
}
// A pool in side view. Layers: w.back (walls and floor), w.mid (people and things in the water), w.front (the water,
// translucent, so whatever is under the surface looks immersed, and the surface line). The surface is at surfY from
// x1 to x2; floor: points [[x, y], …] from x1 to x2 (default flat at botY), e.g. a slope or steps; walls rise rim above
// the surface. w.set({ y, t, amp }) — water level, wave time and height; w.wave(t0, dur, amp) animates the waves;
// w.surfAt(x) — the surface height at x.
function pool(p, x1, x2, surfY, botY, t0 = null, { floor = null, walls = true, rim = 50, alpha = .45 } = {}) {
  const g = G(p, { o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g);
  const back = G(g), mid = G(g), front = G(g), fv = v => v.toFixed(1);
  const fl = floor || [[x1, botY], [x2, botY]];
  const fd = fl.map(q => `L${fv(q[0])} ${fv(q[1])}`).join('');
  path(back, walls ? `M${x1} ${surfY - rim}${fd}L${x2} ${surfY - rim}` : 'M' + fd.slice(1), { stroke: COL.dim, 'stroke-width': 5, 'stroke-linejoin': 'round' });
  const water = mk('path', { fill: waterGrad(defs), 'fill-opacity': alpha }, front);
  const surf = mk('path', { stroke: SURF_C, 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, front);
  const w = { g, back, mid, front, water, surf, x1, x2, y: surfY, t: 0, amp: 0 };
  w.surfAt = x => w.y + w.amp * Math.sin(x * .028 + w.t * 2.6);
  w.set = (q = {}) => {
    Object.assign(w, q);
    const pts = [];
    for (let i = 0; i <= 48; i++) { const x = lerp(x1, x2, i / 48); pts.push(fv(x) + ' ' + fv(w.surfAt(x))); }
    const top = 'M' + pts.join('L');
    surf.setAttribute('d', top);
    water.setAttribute('d', top + fl.slice().reverse().map(q2 => `L${fv(q2[0])} ${fv(q2[1])}`).join('') + 'Z');
    return w;
  };
  w.wave = (t0, dur, amp = 4) => prog(q => w.set({ t: q * dur, amp }), t0, dur, lin);
  w.set({});
  if (t0 !== null) show(g, t0);
  return w;
}
// Water seen from above: a basin with soft ripples; w.mid is the layer for people, w.ring(x, y, t0) — a ripple that
// spreads from a point.
function poolTop(p, x, y, w0, h0, t0 = null) {
  const g = G(p, { o: t0 === null ? 1 : 0 }), defs = mk('defs', {}, g);
  mk('rect', { x, y, width: w0, height: h0, rx: 26, fill: waterGrad(defs), 'fill-opacity': .5, stroke: COL.dim, 'stroke-width': 4 }, g);
  for (let i = 0; i < 9; i++) {
    const cx = x + 60 + ((i * 263) % (w0 - 120)), cy = y + 40 + ((i * 151) % (h0 - 80));
    path(g, `M${cx - 26} ${cy}Q${cx - 13} ${cy - 7} ${cx} ${cy}T${cx + 26} ${cy}`, { stroke: SURF_C, 'stroke-width': 2, 'stroke-opacity': .35 });
  }
  const mid = G(g), top = G(g);
  const o = { g, mid, top };
  o.ring = (rx, ry, t1) => { const e = mk('circle', { cx: rx, cy: ry, r: 10, fill: 'none', stroke: SURF_C, 'stroke-width': 2.5, opacity: 0 }, top); prog(q => { e.setAttribute('r', (10 + 60 * q).toFixed(1)); e.setAttribute('opacity', (q < 1 ? .8 * (1 - q) : 0).toFixed(2)); }, t1, 1.4, out); return e; };
  if (t0 !== null) show(g, t0);
  return o;
}
// Foam buoyancy devices on a side-view figure, drawn in its own frame so they follow every pose and turn with it:
// collar (round the neck), belt (round the waist; 'back' — floats on the back only, as for deep-water running),
// rings (both ankles), strap (a float at the near ankle), knee (a float just above the near knee), bar (a swim bar
// in the near hand), vest. Returns the elements by name.
function floats(f, { collar = false, belt = false, rings = false, strap = false, knee = false, bar = false, vest = false } = {}) {
  const defs = mk('defs', {}, f.g), line = mix(FLOAT_C, '#000000', .42), farC = mix(FLOAT_C, COL.board, .35), d = {};
  const after = (el, ref) => { f.g.insertBefore(el, ref.nextSibling); return el; };
  const cap = (ra, rb, col = FLOAT_C) => limbEl(f.g, defs, col, ra, rb, line);
  if (vest) { d.vest = cap(33, 36); after(d.vest.e, f.parts.torso.e); d.vest.e.setAttribute('fill-opacity', .9); }
  if (belt) {
    d.belt = cap(15, 15);
    after(d.belt.e, d.vest ? d.vest.e : f.parts.torso.e);
    if (belt === 'back') { d.strap0 = mk('path', { stroke: mix(FLOAT_C, COL.board, .3), 'stroke-width': 5, fill: 'none' }, f.g); after(d.strap0, d.belt.e); }
  }
  if (collar) { d.collar = cap(10, 10); after(d.collar.e, f.nose); }
  if (rings) { d.ringF = cap(8, 8, farC); after(d.ringF.e, f.parts.ftF.e); d.ringN = cap(8, 8); after(d.ringN.e, f.parts.ftN.e); }
  if (strap) { d.strap = cap(12, 12); after(d.strap.e, f.parts.ftN.e); }
  if (knee) { d.knee = cap(12, 12); after(d.knee.e, f.parts.thN.e); }
  if (bar) { d.rod = mk('path', { stroke: '#9fb0bf', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, f.g); d.bar = [cap(13, 13), cap(13, 13)]; }
  const ax = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  const across = (el, C, u, half, k = 1) => { const n = [-u[1] * f.dir * k, u[0] * f.dir * k]; el.set([C[0] + n[0] * half, C[1] + n[1] * half], [C[0] - n[0] * half, C[1] - n[1] * half]); };
  const at = (A, u, k) => [A[0] + u[0] * k, A[1] + u[1] * k];
  const upd = () => {
    const P = f.pts, uT = ax(P.H, P.Sh), nT = [-uT[1] * f.dir, uT[0] * f.dir];   // nT points to the front of the trunk
    if (d.vest) d.vest.set(at(P.H, uT, 34), at(P.H, uT, 100));
    if (d.belt) {
      const C = at(P.H, uT, 32);
      if (belt === 'back') {
        const B = [C[0] - nT[0] * 30, C[1] - nT[1] * 30];
        d.belt.set(at(B, uT, -14), at(B, uT, 14));
        d.strap0.setAttribute('d', `M${(C[0] - nT[0] * 30).toFixed(1)} ${(C[1] - nT[1] * 30).toFixed(1)}L${(C[0] + nT[0] * 26).toFixed(1)} ${(C[1] + nT[1] * 26).toFixed(1)}`);
      } else across(d.belt, C, uT, 34);
    }
    if (d.collar) { const uN = ax(P.Sh, P.Hc); across(d.collar, at(P.Sh, uN, 14), uN, 30); }
    if (d.ringF) { const u = ax(P.KF, P.AF); across(d.ringF, at(P.AF, u, -8), u, 17); }
    if (d.ringN) { const u = ax(P.KN, P.AN); across(d.ringN, at(P.AN, u, -8), u, 18); }
    if (d.strap) { const u = ax(P.KN, P.AN); across(d.strap, at(P.AN, u, -12), u, 24); }
    if (d.knee) { const u = ax(P.H, P.KN); across(d.knee, at(P.KN, u, -22), u, 24); }
    if (d.bar) {
      const u = ax(P.EN, P.WN), C = at(P.WN, u, 12), n = [-u[1], u[0]], E1 = at(C, n, 34), E2 = at(C, n, -34);
      d.rod.setAttribute('d', `M${E1[0].toFixed(1)} ${E1[1].toFixed(1)}L${E2[0].toFixed(1)} ${E2[1].toFixed(1)}`);
      d.bar[0].set(at(E1, n, -12), at(E1, n, 10)); d.bar[1].set(at(E2, n, 12), at(E2, n, -10));
    }
  };
  f.onSet.push(upd); upd();
  return d;
}
// A patient floating supine (buoyancy-supported), head to the left, hip at hx: the body axis lies just under the
// surface, so the face and the front of the trunk break it. dev: devices as in floats() (f.dev).
function floater(p, hx, surfY, s, t0, pose = {}, dev = {}) {
  const f = fig(p, { x: hx, y: surfY + 2 * s, s, r: -90, o: 0, pose: { ...STAND, hd: 10, hN: 0, hF: 0, kN: 0, kF: 0, aN: 4, aF: 6, eN: 0, eF: 2, fN: -40, fF: -40, ...pose } });
  f.dev = floats(f, dev);
  if (t0 !== null) show(f.g, t0);
  return f;
}
// Foam devices on a patient seen from above (flatFig): a collar round the neck, a belt across the waist, rings at
// both ankles (they follow the legs).
function floatsTop(f, { collar = true, belt = true, rings = true } = {}) {
  const line = mix(FLOAT_C, '#000000', .42), d = {};
  if (collar) d.collar = mk('ellipse', { cx: 0, cy: -190, rx: 40, ry: 15, fill: 'none', stroke: FLOAT_C, 'stroke-width': 13 }, f.top);
  if (belt) d.belt = mk('rect', { x: -70, y: -70, width: 140, height: 30, rx: 12, fill: FLOAT_C, stroke: line, 'stroke-width': 2 }, f.top);
  if (rings) {
    d.rings = [0, 1].map(() => mk('ellipse', { rx: 21, ry: 8, fill: 'none', stroke: FLOAT_C, 'stroke-width': 9 }, f.top));
    const upd = () => [['K', 'A'], ['KF', 'AF']].forEach(([k, a], i) => {
      const K = f.pts[k], A = f.pts[a];
      if (!K || !A) return;
      const ang = Math.atan2(A[1] - K[1], A[0] - K[0]) * 180 / Math.PI - 90, L = Math.hypot(A[0] - K[0], A[1] - K[1]);
      put(d.rings[i], { x: A[0] - (A[0] - K[0]) / L * 12, y: A[1] - (A[1] - K[1]) / L * 12, r: ang });
    });
    const legF0 = f.legF;
    f.legF = th => { legF0(th); upd(); return f; };
    f.legF(3);
    f.onSet.push(upd); upd();
  }
  return d;
}
// A force arrow with a dark halo (readable on water) from (x, y) along (dx, dy); a group, so show/hide work;
// a.set(x, y, dx, dy) moves it.
function fArrow(p, x, y, dx, dy, col = BUOY_C, { w = 7, head = 18 } = {}) {
  const g = G(p), halo = mk('path', { fill: 'none', stroke: COL.board, 'stroke-width': w + 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': .75 }, g);
  const e = mk('path', { fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  g.set = (x0, y0, ux, uy) => {
    const L = Math.hypot(ux, uy), fv = v => v.toFixed(1);
    if (L < 2) { e.setAttribute('d', ''); halo.setAttribute('d', ''); return g; }
    const tx = ux / L, ty = uy / L, X = x0 + ux, Y = y0 + uy, k = Math.min(head, L * .55);
    const d = `M${fv(x0)} ${fv(y0)}L${fv(X)} ${fv(Y)}M${fv(X - tx * k - ty * k * .62)} ${fv(Y - ty * k + tx * k * .62)}L${fv(X)} ${fv(Y)}L${fv(X - tx * k + ty * k * .62)} ${fv(Y - ty * k - tx * k * .62)}`;
    e.setAttribute('d', d); halo.setAttribute('d', d);
    return g;
  };
  g.set(x, y, dx, dy);
  return g;
}
// The centre-of-buoyancy symbol: a ring with a cross through it.
function cobSym(p, x = 0, y = 0, r = 14, col = COB_C) {
  const g = G(p, { x, y });
  mk('circle', { r: r + 3, fill: COL.board, 'fill-opacity': .6 }, g);
  mk('circle', { r, fill: 'none', stroke: col, 'stroke-width': 3 }, g);
  mk('path', { d: `M${-r * 1.7} 0H${r * 1.7}M0 ${-r * 1.7}V${r * 1.7}`, stroke: col, 'stroke-width': 3 }, g);
  return g;
}

/* ---------- chapter 10: soft tissue injury and repair — the healing window, a tendon in its sheath, a crutch ---------- */
// Stage colours, like a traffic light: acute stage / phase I red, subacute / phase II amber, chronic / phase III green.
const STG = [COL.bad, COL.task, COL.good], STG_N = ['острая', 'подострая', 'хроническая'];
const CLOT_C = '#b8433b', CELL_C = '#e8e2f6', FIBRO_C = '#8fc7e0', CAP_C = '#e2574c', EXUD_C = '#7fb8d8', SYNOV_C = '#d9a0b4';
// Three stage chips in a row centred on cx; `active` (0..2, or -1) is bright, the others dim.
function stageChips(p, cx, y, active, t0, { size = 21, gap = 14 } = {}) {
  const ws = STG_N.map(s => uiW(s, size) + 34), tot = ws.reduce((a, b) => a + b, 0) + gap * 2;
  let x = cx - tot / 2;
  return STG_N.map((s, i) => {
    const on = active < 0 || i === active, g = G(p, { x: x + ws[i] / 2, y, o: 0 });
    mk('rect', { x: -ws[i] / 2, y: -size * 1.05, width: ws[i], height: size * 1.55, rx: size * .78, fill: on ? mix(STG[i], COL.board, .78) : COL.board, stroke: on ? STG[i] : COL.faint, 'stroke-width': on ? 2.6 : 1.6 }, g);
    T(g, s, { x: 0, y: 0, size, fill: on ? STG[i] : COL.faint, weight: 600, anchor: 'middle' });
    x += ws[i] + gap;
    if (t0 !== null) show(g, t0 + i * .15, .4);
    return g;
  });
}
// A magnified window of a wound in dense connective tissue; x, y the top left, w × h. Mature collagen runs left–right in
// both edges; the gap between them fills as the tissue heals. A deeper structure (bone or another tendon) lies along the
// bottom. set({ … }), every value 0..1:
//   exud — exudate in the gap; clot — the clot with its fibrin net; debris — dead tissue (phagocytosis clears it);
//   cells — inflammatory cells; cap — capillaries growing in from above and below; fib — fibroblasts; coll — new collagen
//   (share of the fibres shown); align — the new fibres turn along the line of stress (left–right) and bridge the gap;
//   thick — they thicken and brighten; shrink — the scar contracts and the edges close in; adhere — new fibres reach down to
//   the deeper structure (an adhesion); degrade — the mature fibres thin and break (chronic inflammation).
// hv.gap() → [left, right] of the gap; hv.band = [top, bottom] of the tissue.
function healView(p, x, y, w, h, t0 = null, { seed = 11 } = {}) {
  const g = G(p, { o: 0 }), id = 'hv' + (++SHADE_ID), f = v => v.toFixed(1);
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const cp = mk('clipPath', { id }, mk('defs', {}, g));
  mk('rect', { x, y, width: w, height: h, rx: 24 }, cp);
  const inner = G(g, {}); inner.setAttribute('clip-path', `url(#${id})`);
  mk('rect', { x, y, width: w, height: h, fill: '#26353b' }, inner);
  const T0 = y + h * .07, T1 = y + h * .8, cx = x + w / 2, HW = w * .17, TH = T1 - T0;
  mk('rect', { x, y: y + h * .87, width: w, height: h * .13, fill: mix(ANAT.bone, COL.board, .5) }, inner);
  path(inner, `M${x} ${f(y + h * .87)}H${x + w}`, { stroke: ANAT.bone, 'stroke-width': 3, 'stroke-opacity': .7 });
  const back = G(inner, {}), exud = mk('rect', { y: T0, height: TH, rx: 14, fill: EXUD_C, opacity: 0 }, back);
  // the two edges: a lighter tissue block with a ragged end and mature fibres
  const NR = 7, rows = Array.from({ length: NR }, (_, i) => T0 + (i + .5) * TH / NR), jit = rows.map(() => (rnd() - .5) * 22);
  const edges = [-1, 1].map(side => {
    const eg = G(back, {});
    const end = i => cx + side * HW + side * jit[i] * .6;
    let d = `M${side < 0 ? x - 10 : x + w + 10} ${f(T0)}`;
    rows.forEach((ry, i) => { d += `L${f(end(i))} ${f(ry - TH / NR / 2)}L${f(end(i) + side * 6)} ${f(ry)}`; });
    d += `L${f(end(NR - 1))} ${f(T1)}L${side < 0 ? x - 10 : x + w + 10} ${f(T1)}Z`;
    mk('path', { d, fill: '#33464b' }, eg);
    const fibs = rows.map((ry, i) => {
      let fd = '';
      const a = side < 0 ? x - 10 : end(i), b = side < 0 ? end(i) : x + w + 10;
      for (let k = 0; k <= 30; k++) { const xx = lerp(a, b, k / 30); fd += `${k ? 'L' : 'M'}${f(xx)} ${f(ry + 2.5 * Math.sin(xx / 9 + i))}`; }
      return mk('path', { d: fd, fill: 'none', stroke: ANAT.tendon, 'stroke-width': 7, 'stroke-linecap': 'round' }, eg);
    });
    return { eg, fibs, side };
  });
  // the gap: clot, debris, cells, capillaries, fibroblasts, new collagen (positions relative to the gap centre)
  const clotG = G(back, { o: 0 }), clotPts = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; clotPts.push([Math.cos(a) * (HW + 8) * (.9 + .15 * rnd()), Math.sin(a) * TH * .42 * (.92 + .12 * rnd())]); }
  const clotD = mk('path', { fill: CLOT_C, 'fill-opacity': .8 }, clotG);
  const fibrin = mk('path', { fill: 'none', stroke: '#f2c9c2', 'stroke-width': 1.3, 'stroke-opacity': .7 }, clotG);
  const fibrinL = Array.from({ length: 12 }, () => [[(rnd() - .5) * 2, (rnd() - .5) * 1.6], [(rnd() - .5) * 2, (rnd() - .5) * 1.6]]);
  const debris = Array.from({ length: 7 }, () => { const e = mk('path', { fill: '#7a5646', stroke: '#3b2a22', 'stroke-width': 1 }, back); return { e, u: (rnd() - .5) * 1.4, v: (rnd() - .5) * .75, r: 6 + rnd() * 5, k: rnd() }; });
  const caps = [[-.45, -1], [.35, -1], [-.2, 1], [.5, 1]].map(([u, s]) => ({ e: mk('path', { fill: 'none', stroke: CAP_C, 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '0 2' }, back), u, s, dep: .55 + rnd() * .3 }));
  const newF = Array.from({ length: 18 }, (_, i) => ({ e: mk('path', { fill: 'none', 'stroke-linecap': 'round' }, back), u: (rnd() - .5) * 1.7, v: (i + .5) / 18, th: (rnd() - .5) * 150, L: 34 + rnd() * 36 }));
  const adh = Array.from({ length: 5 }, (_, i) => ({ e: mk('path', { fill: 'none', 'stroke-linecap': 'round', stroke: ANAT.tendon, 'stroke-width': 3 }, back), u: -.8 + i * .4, dx: (rnd() - .5) * 40 }));
  const fibros = Array.from({ length: 10 }, () => { const e = G(back, {}); mk('ellipse', { rx: 17, ry: 4.5, fill: FIBRO_C }, e); mk('ellipse', { rx: 5, ry: 3, fill: '#3b6f88' }, e); return { e, u: (rnd() - .5) * 1.5, v: .1 + rnd() * .8, th: (rnd() - .5) * 160 }; });
  const cells = Array.from({ length: 9 }, () => { const e = G(back, {}); mk('circle', { r: 8.5, fill: CELL_C, stroke: '#9a8fb8', 'stroke-width': 1.2 }, e); mk('circle', { cx: 1.5, cy: -1, r: 3.6, fill: '#9a7fc8' }, e); return { e, u: (rnd() - .5) * 1.5, v: .1 + rnd() * .8 }; });
  mk('rect', { x, y, width: w, height: h, rx: 24, fill: 'none', stroke: COL.chalk, 'stroke-width': 4 }, g);
  const hv = { g, band: [T0, T1], st: { exud: 0, clot: 0, debris: 0, cells: 0, cap: 0, fib: 0, coll: 0, align: 0, thick: 0, shrink: 0, adhere: 0, degrade: 0 } };
  hv.gap = () => { const hw = HW * (1 - .45 * hv.st.shrink); return [cx - hw, cx + hw]; };
  const vis = (k, n, i) => clamp(k * n - i, 0, 1);
  hv.set = o => {
    const S = Object.assign(hv.st, o), hw = HW * (1 - .45 * S.shrink), dx = HW - hw;
    exud.setAttribute('x', f(cx - hw - 6)); exud.setAttribute('width', f(2 * hw + 12)); exud.setAttribute('opacity', (.4 * S.exud).toFixed(2));
    edges.forEach(E => {
      put(E.eg, { x: -E.side * dx });
      E.fibs.forEach((fe, i) => {
        const brk = S.degrade > (i * .37 % 1) * .8;
        fe.setAttribute('stroke-width', f(7 - 4.2 * S.degrade));
        fe.setAttribute('stroke', mix(ANAT.tendon, '#7d8a86', S.degrade * .6));
        fe.setAttribute('stroke-dasharray', brk ? `${f(40 - 18 * S.degrade)} ${f(10 + 22 * S.degrade)}` : 'none');
      });
    });
    put(clotG, { o: S.clot });
    clotD.setAttribute('d', 'M' + clotPts.map(([u, v]) => `${f(cx + u * hw / HW)} ${f((T0 + T1) / 2 + v)}`).join('L') + 'Z');
    fibrin.setAttribute('d', fibrinL.map(([A, B]) => `M${f(cx + A[0] * hw * .8)} ${f((T0 + T1) / 2 + A[1] * TH * .3)}L${f(cx + B[0] * hw * .8)} ${f((T0 + T1) / 2 + B[1] * TH * .3)}`).join(''));
    debris.forEach(d0 => {
      const X = cx + d0.u * hw, Y = (T0 + T1) / 2 + d0.v * TH * .5, r = d0.r * (.4 + .6 * S.debris);
      d0.e.setAttribute('d', `M${f(X - r)} ${f(Y)}L${f(X - r * .2)} ${f(Y - r * .8)}L${f(X + r)} ${f(Y - r * .2)}L${f(X + r * .4)} ${f(Y + r * .9)}Z`);
      d0.e.setAttribute('opacity', clamp(S.debris * 1.4 - d0.k * .4, 0, 1).toFixed(2));
    });
    caps.forEach(c => {
      const X = cx + c.u * hw, Y0 = c.s < 0 ? T0 - 4 : T1 + 4, D = c.dep * TH * .5 * -c.s;
      c.e.setAttribute('d', `M${f(X - 9)} ${f(Y0)}C${f(X - 14)} ${f(Y0 + D * .7)} ${f(X - 10)} ${f(Y0 + D)} ${f(X)} ${f(Y0 + D)}C${f(X + 10)} ${f(Y0 + D)} ${f(X + 14)} ${f(Y0 + D * .7)} ${f(X + 9)} ${f(Y0)}`);
      c.e.setAttribute('stroke-dasharray', `${S.cap.toFixed(3)} 2`); c.e.setAttribute('opacity', S.cap > .01 ? 1 : 0);
    });
    const thk = 1.6 + 4.4 * S.thick, col = mix(mix(ANAT.tendon, COL.board, .4), ANAT.tendon, S.thick);
    newF.forEach((n, i) => {
      const a = rad(n.th * (1 - S.align)), L = lerp(n.L, 2 * hw + 24, S.align), X = cx + n.u * hw * (1 - S.align), Y = T0 + n.v * TH;
      const ux = Math.cos(a) * L / 2, uy = Math.sin(a) * L / 2, bend = 7 * (1 - S.align);
      n.e.setAttribute('d', `M${f(X - ux)} ${f(Y - uy)}Q${f(X - uy / L * bend * 4)} ${f(Y + ux / L * bend * 4)} ${f(X + ux)} ${f(Y + uy)}`);
      n.e.setAttribute('stroke', col); n.e.setAttribute('stroke-width', f(thk));
      n.e.setAttribute('opacity', vis(S.coll, newF.length, i).toFixed(2));
    });
    adh.forEach(a0 => {
      const X = cx + a0.u * hw, Yb = y + h * .87 + 2;
      a0.e.setAttribute('d', `M${f(X)} ${f(T1 - 16)}Q${f(X + a0.dx * .5)} ${f((T1 + Yb) / 2)} ${f(X + a0.dx)} ${f(Yb)}`);
      a0.e.setAttribute('opacity', S.adhere.toFixed(2));
    });
    fibros.forEach((b, i) => put(b.e, { x: cx + b.u * hw, y: T0 + b.v * TH, r: b.th * (1 - S.align), o: vis(S.fib, fibros.length, i) }));
    cells.forEach((c, i) => put(c.e, { x: cx + c.u * hw, y: T0 + c.v * TH, o: vis(S.cells, cells.length, i) }));
    return hv;
  };
  hv.set({});
  if (t0 !== null) show(g, t0);
  return hv;
}
// A tendon in its synovial sheath, side view: the tendon runs from (x, y) to the right over L, radius r; the sheath wraps
// its middle. set({ … }): glide — the tendon slides (px, its fibre marks move); fluid 0..1 — more synovial fluid (the sheath
// swells); inflS / inflT 0..1 — red glow on the sheath / the tendon; thick 0..1 — the sheath thickens; calc 0..1 — calcium
// deposits; degen 0..1 — thin, disordered fibres with many cells; adh 0..1 — fibrous bridges between tendon and sheath;
// taut 0..1 — the tendon glows yellow (tension). ts.mid: the middle of the tendon; ts.top(): the top of the sheath.
function tendonSheath(p, x, y, L, t0 = null, { r = 24, seed = 5 } = {}) {
  const g = G(p, { o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), s0 = x + L * .18, s1 = x + L * .82;
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const shGlow = mk('rect', { x: s0, rx: 30, fill: 'none', stroke: '#ff5a3c', 'stroke-opacity': 0 }, g);
  const sheath = mk('rect', { x: s0, rx: 30, fill: mix(SYNOV_C, COL.board, .72), stroke: '#a7b6bb' }, g);
  const lining = mk('rect', { x: s0 + 6, rx: 24, fill: FLUID, 'fill-opacity': .3, stroke: SYNOV_C, 'stroke-width': 2.5 }, g);
  const tGlow = mk('path', { d: `M${x} ${y}H${x + L}`, fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 2 * r + 16, stroke: '#ff5a3c', 'stroke-opacity': 0 }, g);
  const tTaut = mk('path', { d: `M${x} ${y}H${x + L}`, fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 2 * r + 10, stroke: ANAT.taut, 'stroke-opacity': 0 }, g);
  const gr = mk('linearGradient', { id: 'tsg' + (++SHADE_ID), x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, mix(ANAT.tendon, '#ffffff', .45)], [.45, ANAT.tendon], [1, mix(ANAT.tendon, '#000000', .45)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  mk('rect', { x, y: y - r, width: L, height: 2 * r, rx: r, fill: `url(#${gr.id})`, stroke: mix(ANAT.tendon, '#000000', .5), 'stroke-width': 2 }, g);
  const tTint = mk('rect', { x, y: y - r, width: L, height: 2 * r, rx: r, fill: '#ff5a3c', opacity: 0 }, g);
  const fibs = [-.55, -.18, .18, .55].map(k => mk('path', { d: `M${x + r} ${f(y + k * r)}H${x + L - r}`, fill: 'none', stroke: mix(ANAT.tendon, '#000000', .35), 'stroke-width': 2.4, 'stroke-dasharray': '26 9' }, g));
  const dg = G(g, { o: 0 });
  for (let i = 0; i < 14; i++) { const X = x + r + rnd() * (L - 2 * r), Y = y + (rnd() - .5) * r * 1.3, a = (rnd() - .5) * 1.6, l = 14 + rnd() * 18; path(dg, `M${f(X - Math.cos(a) * l)} ${f(Y - Math.sin(a) * l)}Q${f(X + 6)} ${f(Y - 5)} ${f(X + Math.cos(a) * l)} ${f(Y + Math.sin(a) * l)}`, { stroke: mix(ANAT.tendon, '#6b5a3a', .5), 'stroke-width': 1.6 }); }
  for (let i = 0; i < 22; i++) mk('circle', { cx: f(x + r + rnd() * (L - 2 * r)), cy: f(y + (rnd() - .5) * r * 1.4), r: 2.6, fill: '#8d6fb0' }, dg);
  for (let i = 0; i < 4; i++) { const X = x + L * (.25 + .17 * i); path(dg, `M${f(X)} ${f(y - r + 3)}q${f(6 + rnd() * 6)} ${f(r * .6)} 0 ${f(r * 1.3)}`, { stroke: CAP_C, 'stroke-width': 2 }); }
  const cg = G(g, { o: 0 });
  for (let i = 0; i < 6; i++) { const X = x + L * (.3 + .08 * i + rnd() * .04), Y = y + (rnd() - .5) * r; mk('path', { d: `M${f(X - 5)} ${f(Y)}l4 -5l6 2l1 6l-6 3z`, fill: '#ffffff', stroke: COL.board, 'stroke-width': 1 }, cg); }
  const ag = G(g, { o: 0 });
  const ts = { g, mid: [x + L / 2, y], st: { glide: 0, fluid: 0, inflS: 0, inflT: 0, thick: 0, calc: 0, degen: 0, adh: 0, taut: 0 } };
  ts.top = () => y - r - 10 - 14 * ts.st.fluid - 6 - 10 * ts.st.thick;
  ts.set = o => {
    const S = Object.assign(ts.st, o), gap = 10 + 14 * S.fluid, sw = 4 + 10 * S.thick, hy = r + gap, oy = hy + 6 + sw / 2;
    [[lining, hy, 2.5], [sheath, oy, sw], [shGlow, oy, sw + 14]].forEach(([e, k, w]) => { e.setAttribute('y', f(y - k)); e.setAttribute('height', f(2 * k)); e.setAttribute('width', f(s1 - s0 - (e === lining ? 12 : 0))); e.setAttribute('stroke-width', f(w)); });
    shGlow.setAttribute('stroke-opacity', (.45 * S.inflS).toFixed(2));
    lining.setAttribute('stroke', mix(SYNOV_C, '#ff5a3c', S.inflS * .8));
    tGlow.setAttribute('stroke-opacity', (.3 * S.inflT).toFixed(2)); tTint.setAttribute('opacity', (.32 * S.inflT).toFixed(2));
    tTaut.setAttribute('stroke-opacity', (.4 * S.taut).toFixed(2));
    fibs.forEach(e => { e.setAttribute('stroke-dashoffset', f(-S.glide)); e.setAttribute('opacity', (1 - .85 * S.degen).toFixed(2)); });
    put(dg, { o: S.degen }); put(cg, { o: S.calc });
    ag.replaceChildren();
    [.3, .42, .55, .68].forEach((k, i) => { const X = x + L * k, sg = i % 2 ? 1 : -1; path(ag, `M${f(X)} ${f(y + sg * (r - 2))}L${f(X + 10)} ${f(y + sg * (hy - 1))}`, { stroke: ANAT.tendon, 'stroke-width': 4 }); });
    put(ag, { o: S.adh });
    return ts;
  };
  ts.set({});
  if (t0 !== null) show(g, t0);
  return ts;
}
// A crutch in side view from the armpit pad A to the tip on the ground B; the hand grip is 42 % of the way down.
// set(A, B) returns the crutch; c.grip is the grip point.
function crutch(p, col = '#b9c4c9') {
  const g = G(p), e = mk('path', { fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const tip = mk('circle', { r: 6, fill: '#55605f' }, g);
  const c = { g, grip: [0, 0] };
  c.set = (A, B) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, f = v => v.toFixed(1);
    const P = (k, s) => [A[0] + ux * L * k + nx * s, A[1] + uy * L * k + ny * s], q = v => `${f(v[0])} ${f(v[1])}`;
    e.setAttribute('d', `M${q(P(0, -15))}L${q(P(0, 15))}M${q(P(.02, -9))}L${q(P(.72, 0))}L${q(P(.02, 9))}M${q(P(.42, -8))}L${q(P(.42, 8))}M${q(P(.72, 0))}L${q(B)}`);
    tip.setAttribute('cx', f(B[0])); tip.setAttribute('cy', f(B[1]));
    c.grip = P(.42, 0);
    return c;
  };
  return c;
}

/* ---------- chapter 11: joint, connective tissue and bone disorders — a joint in section, a hand map, a long bone ---------- */
const PANNUS_C = '#c8566a', OSTEO_C = '#d9cfb8', CALLUS_C = '#9cc6d6';
// A joint in frontal section (schematic, knee-like): the upper bone ends in a wide convex end, the lower one in a plateau;
// cartilage on both, capsule with its synovial lining and fluid at the sides. set({ … }):
//   cart: [left, right] 0..1 — cartilage left (1 normal; the joint space narrows and the upper bone settles toward the
//   thinner side); eff — effusion (the capsule bulges); syn — synovitis (thick red lining); pannus — granulation tissue creeps
//   from the margins over the cartilage; erode — bites in the bone at the margins; porosis — periarticular osteoporosis
//   (speckles); osteo — osteophytes at the margins; scler — sclerotic band under the thinner cartilage; cysts — cysts in
//   the subchondral bone; fiss — cracks in the cartilage; ank — a bony bridge (ankylosis); sublux — the upper bone shifts (px).
// aj.stage(P): a local point → parent; aj.up(P): a point of the upper bone (after settling) → local.
function arthroJoint(p, x, y, s, t0 = null) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), B = ANAT.bone, line = mix(B, '#000000', .5), f = v => v.toFixed(1);
  const bg = mk('linearGradient', { id: 'aj' + (++SHADE_ID), x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  [[0, mix(B, '#000000', .3)], [.45, B], [1, mix(B, '#000000', .38)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, bg));
  const fluid = mk('path', { fill: FLUID }, g), lining = mk('path', { fill: 'none', 'stroke-linejoin': 'round' }, g);
  const caps = mk('path', { fill: 'none', stroke: ANAT.tendon, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
  // the lower bone (fixed)
  const low = G(g, {});
  mk('path', { d: 'M-116 14H116Q120 44 92 56C62 68 52 92 52 124V300H-52V124C-52 92 -62 68 -92 56Q-120 44 -116 14Z', fill: `url(#${bg.id})`, stroke: line, 'stroke-width': 2 }, low);
  const porL = G(low, { o: 0 }), cystL = G(low, { o: 0 }), sclL = mk('path', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0 }, low);
  const cartLow = [0, 1].map(() => mk('path', { fill: 'none', stroke: CART, 'stroke-linecap': 'round' }, low));
  const fissL = G(low, { o: 0 });
  // the upper bone (settles, tilts, shifts)
  const up = G(g, {});
  mk('path', { d: 'M-56 -300V-124C-60 -86 -112 -76 -112 -40Q-112 -14 -84 -14H-14Q0 -26 14 -14H84Q112 -14 112 -40C112 -76 60 -86 56 -124V-300Z', fill: `url(#${bg.id})`, stroke: line, 'stroke-width': 2 }, up);
  const porU = G(up, { o: 0 }), cystU = G(up, { o: 0 }), sclU = mk('path', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0 }, up);
  const cartUp = [0, 1].map(() => mk('path', { fill: 'none', stroke: CART, 'stroke-linecap': 'round' }, up));
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { const sx = (rnd() - .5) * 200, sy = -30 - rnd() * 90; mk('circle', { cx: f(sx), cy: f(sy), r: f(2 + rnd() * 3), fill: mix(B, '#000000', .45) }, porU); mk('circle', { cx: f((rnd() - .5) * 200), cy: f(30 + rnd() * 70), r: f(2 + rnd() * 3), fill: mix(B, '#000000', .45) }, porL); }
  [[-62, -36, 11, 7], [40, -44, 8, 6]].forEach(([cx, cy, rx, ry]) => mk('ellipse', { cx, cy, rx, ry, fill: mix(B, '#000000', .55) }, cystU));
  [[-70, 36, 10, 7], [-36, 44, 7, 5]].forEach(([cx, cy, rx, ry]) => mk('ellipse', { cx, cy, rx, ry, fill: mix(B, '#000000', .55) }, cystL));
  [-78, -58, -40].forEach(xx => path(fissL, `M${xx} 5l3 5l-3 4`, { stroke: COL.board, 'stroke-width': 2 }));
  // osteophytes, pannus, erosions, a bony bridge
  const ost = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(() => mk('path', { fill: OSTEO_C, stroke: line, 'stroke-width': 1.5 }, g));
  const pan = [0, 1].map(() => mk('path', { fill: PANNUS_C, 'fill-opacity': .85, stroke: mix(PANNUS_C, '#000000', .3), 'stroke-width': 1.5 }, g));
  const bites = [0, 1].map(() => mk('path', { fill: COL.board, opacity: 0 }, g));
  const ank = mk('path', { fill: B, stroke: line, 'stroke-width': 1.5, opacity: 0 }, g);
  const aj = { g, st: { cart: [1, 1], eff: 0, syn: 0, pannus: 0, erode: 0, porosis: 0, osteo: 0, scler: 0, cysts: 0, fiss: 0, ank: 0, sublux: 0 } };
  aj.stage = P => [x + P[0] * s, y + P[1] * s];
  const side = (k, b) => `${f(60 * k)} -150C${f((118 + b) * k)} -140 ${f((132 + b) * k)} -60 ${f((130 + b) * k)} 0S${f((118 + b) * k)} 120 ${f(56 * k)} 150`;
  aj.set = o => {
    const S = Object.assign(aj.st, o), loss = S.cart.map(c => 1 - c), dy = 8 * (loss[0] + loss[1]), r = 7 * (loss[1] - loss[0]);
    put(up, { x: S.sublux, y: dy, r });
    aj.up = P => { const [a, b2] = rotPt(P[0], P[1], r); return [a + S.sublux, b2 + dy]; };
    [-1, 1].forEach((k, i) => {
      const w = Math.max(.6, 10 * S.cart[i]);
      cartUp[i].setAttribute('d', `M${k * 8} -9H${k * 100}`); cartUp[i].setAttribute('stroke-width', f(w));
      cartLow[i].setAttribute('d', `M${k * 8} 9H${k * 108}`); cartLow[i].setAttribute('stroke-width', f(w));
      cartUp[i].setAttribute('opacity', S.cart[i] < .06 ? 0 : 1); cartLow[i].setAttribute('opacity', S.cart[i] < .06 ? 0 : 1);
      // osteophytes at the four margins
      const og = S.osteo * 26, ox = k * 112;
      ost[i].setAttribute('d', `M${ox} -40L${ox + k * og} ${f(-30 + og * .1)}L${ox} -18Z`);
      ost[i + 2].setAttribute('d', `M${k * 116} 16L${k * (116 + og)} ${f(10 - og * .2)}L${k * 114} 34Z`);
      // pannus from the margin over the cartilage; erosion bites in the bone
      const pl = S.pannus * 70, ex = k * 112;
      pan[i].setAttribute('d', S.pannus < .02 ? '' : `M${ex} -20Q${f(ex - k * pl * .5)} ${f(-6)} ${f(ex - k * pl)} 0Q${f(ex - k * pl * .5)} ${f(8)} ${ex} 20Q${f(ex + k * 10)} 0 ${ex} -20Z`);
      const bw = 12 * S.erode;
      bites[i].setAttribute('d', `M${f(k * 96)} 14q${f(k * bw * .6)} ${f(bw)} ${f(k * bw * 1.4)} 0Z M${f(k * 84)} -14q${f(k * bw * .6)} ${f(-bw)} ${f(k * bw * 1.4)} 0Z`);
      bites[i].setAttribute('opacity', S.erode > .02 ? 1 : 0);
    });
    const thin = loss[1] >= loss[0] ? 1 : -1;
    [sclU, sclL].forEach((e, j) => { e.setAttribute('d', `M${thin * 10} ${j ? 22 : -22}H${thin * 100}`); e.setAttribute('stroke-width', f(10 * S.scler)); e.setAttribute('stroke-opacity', (.55 * S.scler).toFixed(2)); });
    put(porU, { o: S.porosis }); put(porL, { o: S.porosis }); put(cystU, { o: S.cysts }); put(cystL, { o: S.cysts }); put(fissL, { o: S.fiss });
    ank.setAttribute('d', `M-60 -12C-40 -2 -20 -2 0 -10C20 -2 40 -2 60 -12L60 14C40 6 20 6 0 14C-20 6 -40 6 -60 14Z`); ank.setAttribute('opacity', S.ank.toFixed(2));
    const b = 26 * S.eff + 10 * S.syn;
    fluid.setAttribute('d', `M${side(-1, b)}L56 150C${f(118 + b)} 120 ${f(130 + b)} 60 ${f(130 + b)} 0S${f(118 + b)} -140 60 -150Z`);
    fluid.setAttribute('fill-opacity', (.25 + .25 * S.eff).toFixed(2));
    lining.setAttribute('d', `M${side(-1, b)}M${side(1, b)}`); lining.setAttribute('stroke', mix(SYNOV_C, '#ff5a3c', S.syn * .85)); lining.setAttribute('stroke-width', f(3 + 7 * S.syn));
    caps.setAttribute('d', `M${side(-1, b + 9)}M${side(1, b + 9)}`);
    return aj;
  };
  aj.set({});
  if (t0 !== null) show(g, t0);
  return aj;
}
// The back of a right hand (schematic, shaded): wrist, palm, four fingers and the thumb, with every joint marked by name:
// 'W' wrist, 'CMC1' thumb base, 'MCP1'…'MCP5', 'PIP2'…'PIP5', 'DIP2'…'DIP5', 'IP1'. hm.at(name) → parent point;
// hm.dot(names, col, t0, { r }) marks joints; hm.swell(name, col, t0, { rx, ry }) a fusiform swelling; hm.set({ ulnar })
// turns the fingers toward the little finger at the MCP joints (degrees).
function handMap(p, x, y, s, t0 = null, { col = '#d8d1c1' } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62);
  const L = (ra, rb) => limbEl(g, defs, col, ra, rb, line);
  const pg = mk('linearGradient', { id: 'hm' + (++SHADE_ID), x1: 0, y1: 0, x2: 1, y2: .3 }, defs);
  [[0, mix(col, '#ffffff', .4)], [.5, col], [1, mix(col, '#000000', .38)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, pg));
  const fore = L(48, 44), palm = mk('path', { fill: `url(#${pg.id})`, stroke: line, 'stroke-width': 2 }, g);
  palm.setAttribute('d', 'M-66 40C-78 0 -80 -60 -70 -96C-40 -110 32 -112 72 -92C82 -44 78 0 64 40C30 58 -30 58 -66 40Z');
  const FING = [[2, -50, -96, -8, [52, 34, 26]], [3, -16, -104, -2, [56, 36, 28]], [4, 18, -100, 4, [52, 34, 26]], [5, 50, -90, 11, [42, 28, 22]]];
  const fingers = FING.map(([n, bx, by, ang, len]) => ({ n, base: [bx, by], ang, len, segs: [L(12, 11), L(11, 10), L(10, 9)] }));
  const thumb = { segs: [L(15, 13), L(13, 11), L(11, 10)], base: [-66, 10] };
  const J = {};
  const hm = { g, st: { ulnar: 0 }, J };
  hm.at = n => { const P = J[n], s0 = st(g); return [s0.x + P[0] * s0.s, s0.y + P[1] * s0.s]; };
  hm.set = o => {
    Object.assign(hm.st, o);
    fore.set([0, 150], [0, 60]); J.W = [0, 54];
    fingers.forEach(F => {
      const a = rad(F.ang + hm.st.ulnar), u = [Math.sin(a), -Math.cos(a)];
      let P = F.base; J['MCP' + F.n] = P;
      F.segs.forEach((sg, i) => { const Q = [P[0] + u[0] * F.len[i], P[1] + u[1] * F.len[i]]; sg.set(P, Q); P = Q; if (i === 0) J['PIP' + F.n] = Q; if (i === 1) J['DIP' + F.n] = Q; if (i === 2) J['TIP' + F.n] = Q; });
    });
    const tA = [[-66, 10], [-96, -26], [-112, -58], [-122, -84]];
    thumb.segs.forEach((sg, i) => sg.set(tA[i], tA[i + 1]));
    Object.assign(J, { CMC1: tA[0], MCP1: tA[1], IP1: tA[2], TIP1: tA[3] });
    return hm;
  };
  hm.dot = (names, c, t0d, { r = 9 } = {}) => {
    const dg = G(g, { o: 0 });
    names.forEach(n => mk('circle', { cx: J[n][0], cy: J[n][1], r, fill: c, stroke: COL.board, 'stroke-width': 2 }, dg));
    if (t0d !== null) show(dg, t0d);
    return dg;
  };
  hm.swell = (n, c, t0d, { rx = 15, ry = 11 } = {}) => {
    const e = mk('ellipse', { cx: J[n][0], cy: J[n][1], rx, ry, fill: c, 'fill-opacity': .45, stroke: c, 'stroke-width': 2.5 }, g);
    put(e, { o: 0 }); if (t0d !== null) show(e, t0d);
    return e;
  };
  hm.set({});
  if (t0 !== null) show(g, t0);
  return hm;
}
// A long bone lying left to right from (x, y), length L (shaded cortex, medullary canal). The fracture is at fx (0..1).
// set({ line, gap, shift, angle, rot, hema, soft, hard, remodel, plate, lucent }):
//   line — 'trans' | 'obl' | 'spiral' | 'long' | 'comm' | null (the fracture line drawn); gap / shift / angle — the distal
//   fragment is pulled away (px), moved sideways (px) or angled (degrees, about the fracture); rot 0..1 — rotation marks;
//   hema — the hematoma; soft — a soft callus (radiolucent, pale blue); hard — the callus turns to woven bone; remodel —
//   the callus shrinks back to the bone's outline; plate — an internal fixation plate with screws; lucent — the bone under
//   the plate thins (stress shielding).
function longBone(p, x, y, L, t0 = null, { r = 34, fx = .5 } = {}) {
  const g = G(p, { o: 0 }), defs = mk('defs', {}, g), B = ANAT.bone, line = mix(B, '#000000', .5), f = v => v.toFixed(1);
  const gr = mk('linearGradient', { id: 'lb' + (++SHADE_ID), x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, mix(B, '#ffffff', .35)], [.4, B], [1, mix(B, '#000000', .4)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  const FX = x + L * fx;
  const hema = mk('ellipse', { cx: FX, cy: y, fill: CLOT_C, opacity: 0 }, g);
  const callus = mk('path', { 'stroke-width': 2.5 }, g);
  const part = (x0, x1, endL, endR) => {
    const pg = G(g, {});
    mk('path', { d: `M${x0} ${y - r}H${x1}V${y + r}H${x0}Z`, fill: `url(#${gr.id})`, stroke: 'none' }, pg);
    if (endL) mk('ellipse', { cx: x0, cy: y, rx: r * .9, ry: r * 1.45, fill: `url(#${gr.id})`, stroke: line, 'stroke-width': 2 }, pg);
    if (endR) mk('ellipse', { cx: x1, cy: y, rx: r * .9, ry: r * 1.45, fill: `url(#${gr.id})`, stroke: line, 'stroke-width': 2 }, pg);
    path(pg, `M${x0 + (endL ? r * .8 : 0)} ${y - r}H${x1 - (endR ? r * .8 : 0)}M${x0 + (endL ? r * .8 : 0)} ${y + r}H${x1 - (endR ? r * .8 : 0)}`, { stroke: line, 'stroke-width': 2 });
    const canal = mk('rect', { x: x0 + (endL ? r : 0), y: y - r * .42, width: x1 - x0 - (endL ? r : 0) - (endR ? r : 0), height: r * .84, rx: 6, fill: '#d6b98c', 'fill-opacity': .55 }, pg);
    return { pg, canal };
  };
  const A = part(x, FX, true, false), Bp = part(FX, x + L, false, true);
  const fl = mk('path', { fill: 'none', stroke: COL.board, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
  const rotMarks = G(Bp.pg, { o: 0 }); [0, 1, 2].forEach(i => path(rotMarks, `M${FX + 40 + i * 28} ${y - r - 10}q14 ${r + 10} 0 ${2 * r + 20}`, { stroke: COL.whole, 'stroke-width': 2.5, 'stroke-dasharray': '5 5' }));
  const plate = G(g, { o: 0 });
  mk('rect', { x: FX - 110, y: y - r - 16, width: 220, height: 14, rx: 6, fill: '#9aa7b0', stroke: '#5f6b72', 'stroke-width': 2 }, plate);
  [-90, -50, 50, 90].forEach(dx => { mk('rect', { x: FX + dx - 4, y: y - r - 18, width: 8, height: 2 * r + 4, fill: '#7d8a93', 'fill-opacity': .7 }, plate); mk('circle', { cx: FX + dx, cy: y - r - 9, r: 6, fill: '#c9d2d8', stroke: '#5f6b72', 'stroke-width': 2 }, plate); });
  const lucent = mk('rect', { x: FX - 110, y: y - r, width: 220, height: 2 * r, fill: COL.board, opacity: 0 }, g);
  const lb = { g, st: { line: null, gap: 0, shift: 0, angle: 0, rot: 0, hema: 0, soft: 0, hard: 0, remodel: 0, plate: 0, lucent: 0 }, fx: FX };
  const LINES = {
    trans: `M${FX} ${y - r - 2}L${FX + 4} ${y - r * .3}L${FX - 3} ${y + r * .4}L${FX + 2} ${y + r + 2}`,
    obl: `M${FX - r * .9} ${y - r - 2}L${FX + r * .9} ${y + r + 2}`,
    spiral: `M${FX - r} ${y - r - 2}C${FX - r * .2} ${y - r * .2} ${FX + r * .2} ${y + r * .2} ${FX + r} ${y + r + 2}M${FX + r} ${y - r - 2}Q${FX + r * 1.6} ${y} ${FX + r} ${y + r + 2}`,
    long: `M${FX - r * 2.2} ${y - 4}L${FX - r * .6} ${y + 3}L${FX + r * .8} ${y - 3}L${FX + r * 2.2} ${y + 4}`,
    comm: `M${FX - r * .8} ${y - r - 2}L${FX} ${y + 2}L${FX + r * .8} ${y - r - 2}M${FX - r * .4} ${y + r + 2}L${FX - r * .1} ${y + 6}L${FX + r * .5} ${y + r + 2}M${FX} ${y + 2}L${FX - r * .1} ${y + 6}`,
  };
  lb.set = o => {
    const S = Object.assign(lb.st, o);
    Bp.pg.setAttribute('transform', `rotate(${S.angle} ${FX} ${y}) translate(${S.gap} ${S.shift})`);
    fl.setAttribute('d', S.line && !(S.line === 'trans' && (S.gap || S.shift || S.angle)) ? LINES[S.line] || '' : '');
    fl.setAttribute('opacity', (1 - S.hard).toFixed(2));
    put(rotMarks, { o: S.rot });
    const hr = r * 1.6 + 6 * S.hema;
    hema.setAttribute('rx', f(30 + 30 * S.hema)); hema.setAttribute('ry', f(hr)); hema.setAttribute('opacity', (.75 * S.hema).toFixed(2));
    const cw = 120 * (1 - .75 * S.remodel), ch = r * (1.75 - .7 * S.remodel), on = Math.max(S.soft, S.hard);
    callus.setAttribute('d', `M${f(FX - cw)} ${y}C${f(FX - cw * .7)} ${f(y - ch)} ${f(FX + cw * .7)} ${f(y - ch)} ${f(FX + cw)} ${y}C${f(FX + cw * .7)} ${f(y + ch)} ${f(FX - cw * .7)} ${f(y + ch)} ${f(FX - cw)} ${y}Z`);
    callus.setAttribute('fill', mix(CALLUS_C, B, S.hard)); callus.setAttribute('fill-opacity', (on * (.45 + .45 * S.hard) * (1 - .5 * S.remodel)).toFixed(2));
    callus.setAttribute('stroke', mix(CALLUS_C, line, S.hard)); callus.setAttribute('stroke-opacity', (on * (1 - S.remodel)).toFixed(2));
    callus.setAttribute('stroke-dasharray', S.hard > .5 ? 'none' : '6 5');
    put(plate, { o: S.plate });
    lucent.setAttribute('opacity', (.35 * S.lucent).toFixed(2));
    return lb;
  };
  // the canal of the distal part shows through the line; keep the plate on top
  g.appendChild(plate);
  lb.set({});
  if (t0 !== null) show(g, t0);
  return lb;
}

/* ---------- chapter 13: peripheral nerves — a nerve in section, a gliding nerve, nerve maps of the arm and the leg ---------- */
const NERVE_C = '#f5d76e', EPI_C = '#e9dcc0', PERI_C = '#c9a0d6', ENDO_C = '#9fd0c8', MYEL_C = '#f4f1ea', VESS_C = '#d9534f';
// A peripheral nerve in cross-section, centre (cx, cy), radius R: epineurium with vessels round three fascicles, each in
// its perineurium; inside, myelinated axons (myelin ring, endoneurium) and a few thin unmyelinated ones.
// set({ hl, demy, ax, endo, peri, epi }): hl — 'epi' | 'peri' | 'endo' | 'myel' | 'ax' | null brightens one layer;
// the others 0..1 damage the middle fascicle (Sunderland degrees): demy — myelin thins; ax — axons die (wallerian);
// endo — endoneurial tubes break; peri — the perineurium tears; epi — the whole nerve is cut (epineurium broken).
function nerveX(p, cx, cy, R = 200, t0 = null) {
  const g = G(p, { x: cx, y: cy, o: 0 }), f = v => v.toFixed(1);
  const epi = mk('circle', { r: R, fill: EPI_C, stroke: mix(EPI_C, '#000000', .35), 'stroke-width': 3 }, g);
  const epiHl = mk('circle', { r: R + 6, fill: 'none', stroke: ANAT.taut, 'stroke-width': 8, opacity: 0 }, g);
  const vess = G(g, {});
  [[.78, 30], [.8, 150], [.76, 255], [.82, 320]].forEach(([k, a]) => { const x = R * k * Math.cos(rad(a)), y = R * k * Math.sin(rad(a)); mk('circle', { cx: f(x), cy: f(y), r: R * .06, fill: VESS_C, stroke: '#7a1d10', 'stroke-width': 1.5 }, vess); mk('circle', { cx: f(x), cy: f(y), r: R * .025, fill: '#5b0f0f' }, vess); });
  const FAS = [[-.32, -.3, .36], [.36, -.18, .32], [.0, .38, .34]], fas = [];
  FAS.forEach(([fx, fy, fr], fi) => {
    const fg = G(g, { x: R * fx, y: R * fy }), r = R * fr;
    const peri = mk('circle', { r, fill: '#3a2f3f', stroke: PERI_C, 'stroke-width': R * .045 }, fg);
    const periHl = mk('circle', { r: r + 4, fill: 'none', stroke: ANAT.taut, 'stroke-width': 6, opacity: 0 }, fg);
    const axons = [];
    let sd = 7 + fi * 13; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + rnd() * .4, d = r * .72 * Math.sqrt((i + .5) / n), x = d * Math.cos(a), y = d * Math.sin(a), ar = r * (.11 + rnd() * .04);
      const ag = G(fg, { x, y });
      const endo = mk('circle', { r: ar * 1.75, fill: '#24323a', stroke: ENDO_C, 'stroke-width': 1.6 }, ag);
      const myel = mk('circle', { r: ar * 1.3, fill: 'none', stroke: MYEL_C, 'stroke-width': ar * .55 }, ag);
      const ax = mk('circle', { r: ar * .85, fill: NERVE_C }, ag);
      axons.push({ endo, myel, ax, ar });
    }
    for (let i = 0; i < 5; i++) { const a = rnd() * 6.28, d = r * (.2 + rnd() * .65); mk('circle', { cx: f(d * Math.cos(a)), cy: f(d * Math.sin(a)), r: r * .035, fill: mix(NERVE_C, '#000000', .2) }, fg); }
    fas.push({ fg, peri, periHl, axons, r });
  });
  const gash = mk('path', { d: '', fill: COL.board, stroke: '#a2584c', 'stroke-width': 3, opacity: 0 }, g);
  const S = { hl: null, demy: 0, ax: 0, endo: 0, peri: 0, epi: 0 }, e = { g, st: S, R };
  e.set = o => {
    Object.assign(S, o);
    epiHl.setAttribute('opacity', S.hl === 'epi' ? 1 : 0);
    vess.setAttribute('opacity', 1);
    fas.forEach((F, fi) => {
      const mid = fi === 2;
      F.periHl.setAttribute('opacity', S.hl === 'peri' ? 1 : 0);
      F.peri.setAttribute('stroke-dasharray', mid && S.peri > 0 ? `${f(30 * (1 - S.peri) + 4)} ${f(14 * S.peri)}` : 'none');
      F.peri.setAttribute('stroke', mid ? mix(PERI_C, '#e2574c', S.peri) : PERI_C);
      F.axons.forEach(A => {
        A.endo.setAttribute('stroke', S.hl === 'endo' ? ANAT.taut : mid ? mix(ENDO_C, '#e2574c', S.endo) : ENDO_C);
        A.endo.setAttribute('stroke-width', S.hl === 'endo' ? 3.5 : 1.6);
        A.endo.setAttribute('stroke-dasharray', mid && S.endo > 0 ? `${f(10 * (1 - S.endo) + 2)} ${f(6 * S.endo)}` : 'none');
        A.myel.setAttribute('stroke', S.hl === 'myel' ? ANAT.taut : MYEL_C);
        A.myel.setAttribute('stroke-width', f(A.ar * .55 * (mid ? 1 - .85 * S.demy : 1)));
        A.ax.setAttribute('fill', S.hl === 'ax' ? '#ffffff' : mid ? mix(NERVE_C, '#5b5550', S.ax) : NERVE_C);
      });
    });
    gash.setAttribute('d', `M${f(-R * .1)} ${f(-R - 8)}L${f(R * .12)} ${f(-R * .2)}L${f(-R * .06)} ${f(R * .3)}L${f(R * .08)} ${f(R + 8)}`);
    gash.setAttribute('fill', 'none'); gash.setAttribute('stroke', COL.board); gash.setAttribute('stroke-width', f(16 * S.epi)); gash.setAttribute('opacity', S.epi > 0 ? 1 : 0);
    epi.setAttribute('stroke', mix(mix(EPI_C, '#000000', .35), '#e2574c', S.epi));
    return e;
  };
  e.fasc = i => { const F = fas[i], s0 = st(g), s1 = st(F.fg); return [s0.x + s1.x * (s0.s ?? 1), s0.y + s1.y * (s0.s ?? 1)]; };
  e.set({});
  if (t0 !== null) show(g, t0);
  return e;
}
// A nerve along a polyline (stage points). set({ wave, slide, taut, prof }): wave 0..1 — slack nerves lie wavy;
// slide (px) moves the bead markers along the nerve; prof(u) 0..1 scales the slide along the nerve (u from start to end),
// e.g. near a moving joint first; taut 0..1 — a yellow glow of strain; hot 0..1 — red (irritated). reroute(pts) moves it.
function nerveLine(p, pts, t0 = null, { w = 9, n = 14, col = NERVE_C } = {}) {
  const g = G(p, { o: 0 }), f = v => v.toFixed(1);
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-width': 0, 'stroke-opacity': .55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const hot = mk('path', { fill: 'none', stroke: '#ff5a3c', 'stroke-width': w + 10, 'stroke-opacity': 0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const body = mk('path', { fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const core = mk('path', { fill: 'none', stroke: mix(col, '#ffffff', .5), 'stroke-width': w * .3, 'stroke-linecap': 'round', 'stroke-opacity': .7 }, g);
  const beads = Array.from({ length: n }, () => mk('circle', { r: w * .42, fill: mix(col, '#6b4e10', .55) }, g));
  const S = { wave: 0, slide: 0, taut: 0, hot: 0, prof: null }, e = { g, st: S, pts };
  const geo = () => {
    const P = e.pts, seg = [];
    let L = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
    const at = sArc => {
      let s = clamp(sArc, 0, L), i = 0;
      while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
      const A = P[i], B = P[i + 1], k = seg[i] ? s / seg[i] : 0, ux = (B[0] - A[0]) / (seg[i] || 1), uy = (B[1] - A[1]) / (seg[i] || 1);
      return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, -uy, ux];
    };
    return { L, at };
  };
  e.set = o => {
    Object.assign(S, o);
    const { L, at } = geo(), N = Math.max(24, Math.round(L / 6)), amp = 9 * S.wave, per = 70;
    const wp = s => { const [x, y, nx, ny] = at(s), a = amp * Math.sin(s / per * 2 * Math.PI); return [x + nx * a, y + ny * a]; };
    let d = '';
    for (let i = 0; i <= N; i++) { const [x, y] = wp(L * i / N); d += (i ? 'L' : 'M') + f(x) + ' ' + f(y); }
    [glow, hot, body, core].forEach(el => el.setAttribute('d', d));
    glow.setAttribute('stroke-width', f(w + 16 * S.taut));
    glow.setAttribute('stroke-opacity', f(.6 * S.taut));
    hot.setAttribute('stroke-opacity', f(.45 * S.hot));
    body.setAttribute('stroke', mix(col, '#ff8a5c', S.hot * .6));
    beads.forEach((b, i) => {
      const u = (i + .5) / n, sh = S.slide * (S.prof ? S.prof(u) : 1), s = u * L + sh;
      const [x, y] = wp(clamp(s, 0, L));
      b.setAttribute('cx', f(x)); b.setAttribute('cy', f(y)); b.setAttribute('opacity', s < 0 || s > L ? 0 : 1);
    });
    return e;
  };
  e.reroute = P => { e.pts = P; return e.set({}); };
  e.set({});
  if (t0 !== null) show(g, t0);
  return e;
}
// A right arm seen from the front, palm forward (medial = −x, toward the body), shoulder at (x, y), hand at the bottom
// (≈ 640 × s below). Faint bones and the five nerves of the arm: ax, mc, med, uln, rad. hl(name, t0, col) brightens a
// nerve; mark(site, col, t0) puts a pulsing ring at a site: axSite, spiral, cubital, pronator, supinator, carpal, guyon,
// axilla. at(site) gives its stage point.
function armNerves(p, x, y, s = 1, t0 = null, { col = '#d8d1c1' } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62), f = v => v.toFixed(1);
  const skin = G(g, { o: .55 });
  limbEl(skin, defs, col, 62, 50, line).set([0, 20], [0, 278]);
  limbEl(skin, defs, col, 50, 34, line).set([0, 290], [0, 515]);
  mk('path', { d: 'M-44 520C-50 560 -44 600 -36 612H34C48 590 52 556 46 520Z', fill: col, stroke: line, 'stroke-width': 2 }, skin);
  [[-34, 612, -40, 690], [-12, 614, -14, 700], [10, 614, 12, 696], [30, 610, 34, 680], [46, 540, 78, 600]].forEach(([a, b, c, d]) => limbEl(skin, defs, col, 10, 8, line).set([a, b], [c, d]));
  const bones = G(g, { o: .9 }), bc = mix(ANAT.bone, COL.board, .35);
  mk('ellipse', { cx: 0, cy: 18, rx: 30, ry: 26, fill: bc }, bones);
  path(bones, 'M0 30V262', { stroke: bc, 'stroke-width': 16 });
  mk('ellipse', { cx: 0, cy: 272, rx: 46, ry: 14, fill: bc }, bones);
  path(bones, 'M16 292L22 512M-16 292L-22 516', { stroke: bc, 'stroke-width': 10 });
  const N = {
    ax: [[-12, 30], [8, 58], [34, 70], [46, 90]],
    mc: [[-8, 32], [4, 120], [10, 250], [28, 310], [36, 420]],
    med: [[-14, 28], [-20, 150], [-8, 280], [0, 330], [2, 500], [0, 540], [10, 600], [16, 650]],
    uln: [[-22, 28], [-32, 180], [-44, 272], [-30, 332], [-26, 500], [-30, 545], [-36, 620], [-36, 680]],
    rad: [[-16, 34], [-6, 100], [22, 172], [36, 240], [30, 284], [26, 300], [22, 336], [18, 400]],
    radS: [[26, 300], [36, 420], [40, 510], [54, 560]],
  };
  const nl = {};
  Object.entries(N).forEach(([k, P]) => {
    const pth = path(g, '', { stroke: NERVE_C, 'stroke-width': 5, 'stroke-opacity': .55 });
    pth.setAttribute('d', 'M' + P.map(q => f(q[0]) + ' ' + f(q[1])).join('L'));
    nl[k] = pth;
  });
  const SITES = { axSite: [8, 58], spiral: [22, 172], cubital: [-44, 272], pronator: [0, 330], supinator: [22, 336], carpal: [0, 540], guyon: [-30, 545], axilla: [-20, 60] };
  const e = { g, N, nl };
  e.at = k => { const P = SITES[k] || k, s0 = st(g); return [s0.x + P[0] * s0.s, s0.y + P[1] * s0.s]; };
  e.hl = (k, t, c = NERVE_C) => { const el = nl[k]; tw(el, { 'a_stroke-width': 9, 'a_stroke-opacity': 1 }, t, .5); el.setAttribute('stroke', c); if (k === 'rad') e.hl('radS', t, c); return el; };
  e.dim = (k, t) => { tw(nl[k], { 'a_stroke-width': 5, 'a_stroke-opacity': .55 }, t, .5); if (k === 'rad') e.dim('radS', t); };
  e.mark = (k, c, t) => { const [mx, my] = SITES[k], r = G(g, { x: mx, y: my, s: 0, o: 0 }); mk('circle', { r: 16, fill: c, 'fill-opacity': .25, stroke: c, 'stroke-width': 3.5 }, r); pop(r, t); pulse(r, t + .6, 1.4); return r; };
  if (t0 !== null) show(g, t0);
  return e;
}
// A right leg seen from the side (front = +x), hip at (x, y), ankle ≈ 560 × s below, foot to the right. Faint bones,
// the piriformis and the nerves: fem, obt (dashed, medial), sci, tib, per, perD, perS. Sites: piri, inguinal, fibneck,
// tarsal, popliteal. Same hl / dim / mark / at as armNerves.
function legNerves(p, x, y, s = 1, t0 = null, { col = '#d8d1c1' } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62), f = v => v.toFixed(1);
  const skin = G(g, { o: .55 });
  mk('path', { d: 'M-70 -60C-40 -90 50 -90 70 -40L56 20H-64Z', fill: col, stroke: line, 'stroke-width': 2 }, skin);
  limbEl(skin, defs, col, 66, 46, line).set([0, 0], [0, 300]);
  limbEl(skin, defs, col, 44, 28, line).set([0, 306], [0, 560]);
  limbEl(skin, defs, col, 22, 16, line).set([-10, 578], [118, 598]);
  const bones = G(g, { o: .9 }), bc = mix(ANAT.bone, COL.board, .35);
  mk('ellipse', { cx: 0, cy: -6, rx: 26, ry: 24, fill: bc }, bones);
  path(bones, 'M0 10V286', { stroke: bc, 'stroke-width': 18 });
  path(bones, 'M8 316L4 548M-18 330L-14 540', { stroke: bc, 'stroke-width': 11 });
  mk('circle', { cx: -18, cy: 334, r: 10, fill: bc }, bones);
  const piri = mk('path', { d: 'M-64 -40C-50 -34 -30 -26 -14 -12L-18 -2C-34 -14 -52 -22 -66 -28Z', fill: '#c0392b', 'fill-opacity': .7 }, g);
  const N = {
    fem: [[34, -20], [38, 20], [42, 120], [36, 250]],
    obt: [[12, -10], [10, 80], [6, 180]],
    sci: [[-44, -30], [-40, 20], [-36, 140], [-28, 268]],
    tib: [[-28, 268], [-24, 320], [-20, 500], [-10, 556], [24, 600]],
    per: [[-28, 268], [-32, 316], [-24, 340], [-6, 350]],
    perD: [[-6, 350], [8, 420], [14, 540], [40, 586]],
    perS: [[-6, 350], [-10, 440], [-2, 540]],
  };
  const nl = {};
  Object.entries(N).forEach(([k, P]) => {
    const pth = path(g, '', { stroke: NERVE_C, 'stroke-width': 5, 'stroke-opacity': .55 });
    pth.setAttribute('d', 'M' + P.map(q => f(q[0]) + ' ' + f(q[1])).join('L'));
    if (k === 'obt') pth.setAttribute('stroke-dasharray', '8 6');
    nl[k] = pth;
  });
  const SITES = { piri: [-44, -28], inguinal: [36, -14], fibneck: [-22, 342], tarsal: [-10, 556], popliteal: [-26, 300] };
  const e = { g, N, nl, piri };
  e.at = k => { const P = SITES[k] || k, s0 = st(g); return [s0.x + P[0] * s0.s, s0.y + P[1] * s0.s]; };
  e.hl = (k, t, c = NERVE_C) => { const el = nl[k]; tw(el, { 'a_stroke-width': 9, 'a_stroke-opacity': 1 }, t, .5); el.setAttribute('stroke', c); if (k === 'per') { e.hl('perD', t, c); e.hl('perS', t, c); } return el; };
  e.dim = (k, t) => { tw(nl[k], { 'a_stroke-width': 5, 'a_stroke-opacity': .55 }, t, .5); if (k === 'per') { e.dim('perD', t); e.dim('perS', t); } };
  e.mark = (k, c, t) => { const [mx, my] = SITES[k], r = G(g, { x: mx, y: my, s: 0, o: 0 }); mk('circle', { r: 16, fill: c, 'fill-opacity': .25, stroke: c, 'stroke-width': 3.5 }, r); pop(r, t); pulse(r, t + .6, 1.4); return r; };
  if (t0 !== null) show(g, t0);
  return e;
}
// Tint the skin zone of a nerve on a handMap: 'median' (thumb, index, middle, radial half of the ring finger and the
// radial palm), 'ulnar' (little finger, ulnar half of the ring finger, ulnar palm). Returns the group (hidden until t0).
function handZone(hm, kind, col, t0 = null) {
  const J = hm.J, g = mk('g', { opacity: 0 }, hm.g), f = v => v.toFixed(1), w = 21;
  const seg = (pts, ww = w, off = 0) => {
    const d = 'M' + pts.map(q => f(q[0] + off) + ' ' + f(q[1])).join('L');
    mk('path', { d, fill: 'none', stroke: col, 'stroke-width': ww, 'stroke-opacity': .55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  };
  const fin = n => [J['MCP' + n], J['PIP' + n], J['DIP' + n], J['TIP' + n]];
  if (kind === 'median') {
    seg([J.CMC1, J.MCP1, J.IP1, J.TIP1], 24); seg(fin(2)); seg(fin(3)); seg(fin(4), 10, -5);
    mk('path', { d: 'M-66 30C-74 -20 -72 -70 -64 -94C-40 -104 -10 -106 24 -104L28 -70C10 -30 -10 10 -30 44Z', fill: col, 'fill-opacity': .4 }, g);
  } else {
    seg(fin(5)); seg(fin(4), 10, 6);
    mk('path', { d: 'M30 -100C52 -98 66 -94 72 -92C82 -44 78 0 64 40C50 46 40 48 34 48C40 0 38 -60 30 -100Z', fill: col, 'fill-opacity': .4 }, g);
  }
  if (t0 !== null) show(g, t0);
  return g;
}

/* ---------- chapter 14: the spine (postureFig, spineSeg) ---------- */
const DISC_C = '#8fb8c8', NUC_C = '#d8eef6', EP_C = '#c9b8e8';
const REG_C = { C: '#86c9e8', T: '#f4a48c', L: '#8fd6b0', S: '#f3c95c', Co: '#bba8ee' };   // regions of the column
// Posture parameters of postureFig. tilt — pelvic tilt (+ anterior); lord / kyph / cerv — lumbar lordosis, thoracic
// kyphosis, cervical lordosis (total bend, degrees); ulf — flexion of the upper lumbar spine; fh — forward head 0..1;
// hd — head tilt (+ chin down); scap — scapulae (+ protracted, − retracted); shank / thigh — lean from the vertical
// (+ forward); arm — arm swing (+ forward). The presets follow Fig. 14.7 and Fig. 14.18.
const PSTD = { tilt: 0, lord: 46, ulf: 0, kyph: 42, cerv: 34, fh: 0, hd: 0, scap: 0, shank: 1.5, thigh: 3.5, arm: 0, elb: 10, wr: 0 };
const POSTURE = {
  std: { ...PSTD },
  lordotic: { ...PSTD, tilt: 14, lord: 70, kyph: 54, cerv: 40, fh: .6, scap: .35, shank: 2.5, thigh: -1 },
  sway: { ...PSTD, tilt: -4, lord: 70, ulf: 8, kyph: 70, cerv: 34, fh: 1, scap: .6, shank: -1.5, thigh: 11 },
  flat: { ...PSTD, tilt: -12, lord: 18, kyph: 22, cerv: 30, fh: .3, shank: 2, thigh: 4 },
  round: { ...PSTD, kyph: 56, fh: 1, scap: 1 },
  flatUp: { ...PSTD, lord: 40, kyph: 20, cerv: 12, hd: 8, scap: -.8 },
};
// The column from L5 (unit 0) up to C1 (unit 23): unit lengths (body + disc) and how each region's bend is shared.
const SEG_L = [...Array(5).fill(18), ...Array(12).fill(11.6), ...Array(7).fill(8.2)];
const SEG_W = [...Array(5).fill(25), ...Array(12).fill(19), ...Array(7).fill(14)];
const SEG_N = ['L5', 'L4', 'L3', 'L2', 'L1', ...Array.from({ length: 12 }, (_, i) => 'T' + (12 - i)), ...Array.from({ length: 7 }, (_, i) => 'C' + (7 - i))];
const WL = [.32, .26, .2, .13, .09], WU = [0, 0, 0, .5, .5];
const WK = [.03, .05, .07, .09, .11, .12, .12, .11, .1, .08, .07, .05];
const WC = [.2, .19, .17, .15, .12, .1, .07];
const P_FRONT = [64, 70, 74, 74, 72, 72, 74, 78, 82, 84, 86, 86, 85, 82, 78, 72, 64, 50, 38, 32, 30, 30, 30, 30, 30];
const P_BACK = [30, 30, 30, 29, 28, 27, 27, 27, 28, 29, 30, 30, 30, 29, 28, 27, 26, 25, 24, 24, 24, 24, 24, 25, 26];
// Geometry of a standing posture in side view, facing right; (0, 0) is where the plumb line meets the ground.
function postureGeo(q) {
  const sn = a => Math.sin(rad(a)), cs = a => Math.cos(rad(a));
  const A = [-12, -41], K = [A[0] + 221 * sn(q.shank), A[1] - 221 * cs(q.shank)], H = [K[0] + 216 * sn(q.thigh), K[1] - 216 * cs(q.thigh)];
  const pv = v => { const [x, y] = rotPt(v[0], v[1], q.tilt); return [H[0] + x, H[1] + y]; };   // pelvis frame → figure
  const S1 = pv([-18, -52]);
  let phi = 30 + q.tilt, P = S1;
  const pts = [S1], phis = [];
  for (let i = 0; i < 24; i++) {
    let b;
    if (i < 5) b = -q.lord * WL[i] + q.ulf * WU[i];
    else if (i < 17) b = q.kyph * WK[i - 5] + (i >= 14 ? 5 * q.fh * (i - 13) / 3 : 0);
    else b = -q.cerv * WC[i - 17] + (i < 20 ? 7 * q.fh : -9 * q.fh);
    phi += b; phis.push(phi);
    P = [P[0] + SEG_L[i] * sn(phi), P[1] - SEG_L[i] * cs(phi)];
    pts.push(P);
  }
  // direction at each point (0..24) and its anterior normal
  const dirAt = u => u === 0 ? 30 + q.tilt : u === 24 ? phis[23] : (phis[u - 1] + phis[u]) / 2;
  const ant = (u, k) => { const a = dirAt(u); return [pts[u][0] + k * cs(a), pts[u][1] + k * sn(a)]; };
  const O = pts[24], hA = q.hd + (phis[23] + 10) * .25;
  const hd = v => { const [x, y] = rotPt(v[0], v[1], hA); return [O[0] + x, O[1] + y]; };
  const ph2 = phis[14], sh = 20 + 14 * q.scap;
  const Sh = [pts[15][0] + sh * cs(ph2) - 6 * sn(ph2), pts[15][1] + sh * sn(ph2) + 6 * cs(ph2)];
  const aA = q.arm + 4, E = [Sh[0] + 150 * sn(aA), Sh[1] + 150 * cs(aA)], W = [E[0] + 132 * sn(aA + q.elb), E[1] + 132 * cs(aA + q.elb)];
  const xA = aA + q.elb + 4 + (q.wr || 0), X = [W[0] + 70 * sn(xA), W[1] + 70 * cs(xA)];
  const tD = [(K[0] - H[0]) / 216, (K[1] - H[1]) / 216], sD = [(A[0] - K[0]) / 221, (A[1] - K[1]) / 221];   // thigh and shank, downward
  return { A, K, H, S1, pts, phis, ant, O, hA, hd, Sh, E, W, X, pv, tD, sD, q };
}
// Landmarks of a posture geometry (figure coordinates).
const P_MARK = {
  ear: G => G.hd([-4, -25]), head: G => G.hd([6, -60]), chin: G => G.hd([48, 2]), occ: G => G.hd([-40, -20]), nose: G => G.hd([70, -44]),
  sh: G => G.Sh, hip: G => G.H, troch: G => [G.H[0] - 7, G.H[1] - 2], knee: G => G.K, ankle: G => G.A, mall: G => [G.A[0] - 2, G.A[1] + 4],
  S1: G => G.S1, S2: G => G.pv([-30, -34]), cocc: G => G.pv([-48, 12]), SI: G => G.pv([-46, -46]), OA: G => G.O, com: G => G.pv([-8, -40]), ASIS: G => G.pv([38, -62]), PSIS: G => G.pv([-60, -58]), pub: G => G.pv([40, 22]),
  L5: G => pAnt(G, 0.5, 0), L3: G => pAnt(G, 2.5, 0), L1: G => pAnt(G, 4.5, 0), T12: G => pAnt(G, 5.5, 0), T7: G => pAnt(G, 10.5, 0), T2: G => pAnt(G, 15.5, 0),
  C7: G => pAnt(G, 17.5, 0), C4: G => pAnt(G, 20.5, 0), C1: G => pAnt(G, 23.5, 0),
};
// ant(u, k) for a fractional u: interpolate between the points.
function pAnt(G, u, k) {
  const i = Math.min(23, Math.floor(u)), f = u - i, a = G.ant(i, k), b = G.ant(i + 1, k);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
}
// Anterior normal of a segment pointing down (figure facing right).
const nA = d => [d[1], -d[0]];
// Muscles of postureFig: two attachments as functions of the geometry; rest lengths are taken in the standard posture.
const P_MUS = {
  rectus: [G => G.pv([36, 16]), G => pAnt(G, 9, P_FRONT[9] - 12)],                       // rectus abdominis
  iliopsoas: [G => pAnt(G, 3, 12), G => [G.H[0] + G.tD[0] * 34 + 14 * nA(G.tD)[0], G.H[1] + G.tD[1] * 34 + 14 * nA(G.tD)[1]]],
  rectFem: [G => G.pv([32, -36]), G => [G.K[0] + 24, G.K[1] - 6]],                         // rectus femoris
  erector: [G => G.pv([-50, -36]), G => pAnt(G, 7, -P_BACK[7] + 9)],                       // lumbar erector spinae
  thorEr: [G => pAnt(G, 6, -P_BACK[6] + 8), G => pAnt(G, 15, -P_BACK[15] + 8)],             // thoracic erector spinae
  glut: [G => G.pv([-56, -34]), G => [G.H[0] + G.tD[0] * 64 - 24 * nA(G.tD)[0], G.H[1] + G.tD[1] * 64 - 24 * nA(G.tD)[1]]],
  soleus: [G => [G.K[0] + G.sD[0] * 50 - 15 * nA(G.sD)[0], G.K[1] + G.sD[1] * 50 - 15 * nA(G.sD)[1]], G => [G.A[0] - 24, G.A[1] + 8]],
  gastroc: [G => [G.K[0] - G.tD[0] * 22 - 14 * nA(G.tD)[0], G.K[1] - G.tD[1] * 22 - 14 * nA(G.tD)[1]], G => [G.A[0] - 26, G.A[1] + 4]],
  hams: [G => G.pv([-26, 44]), G => [G.K[0] + G.sD[0] * 34 - 16, G.K[1] + G.sD[1] * 34]],
  trapU: [G => G.hd([-38, -16]), G => [G.Sh[0] - 14, G.Sh[1] - 18]],                        // upper trapezius
  subocc: [G => G.hd([-32, -8]), G => pAnt(G, 21.5, -12)],                                // suboccipitals
  scm: [G => G.hd([-14, -16]), G => pAnt(G, 16, P_FRONT[16] - 8)],                         // sternocleidomastoid
  dnf: [G => pAnt(G, 23.5, 7), G => pAnt(G, 14.5, 9)],                                      // longus colli / deep neck flexors
  pec: [G => pAnt(G, 12, P_FRONT[12] - 10), G => [G.Sh[0] + 10, G.Sh[1] - 4]],             // pectoralis minor
  rhomb: [G => pAnt(G, 13, -P_BACK[13] + 4), G => pAnt(G, 12.5, -P_BACK[12] + 16 + 12 * G.q.scap)],   // scapular retractors
};
const P_LIG = {   // straight ligaments: iliofemoral (front of the hip)
  iliofem: [G => G.pv([30, -30]), G => [G.H[0] + G.tD[0] * 46 + 20 * nA(G.tD)[0], G.H[1] + G.tD[1] * 46 + 20 * nA(G.tD)[1]]],
};
const P_BAND = {   // ligaments along the column: [from unit, to unit, offset as a fraction of the body width (+ anterior)]
  ALL_L: [0, 5, .62], PLL_L: [0, 5, -.62], ALL_T: [5, 17, .62], PLL_T: [5, 17, -.62], ALL_C: [17, 24, .62], PLL_C: [17, 24, -.62],
};
// A standing figure in side view with the spine, pelvis and ribs drawn over the body like an X-ray.
// set(params | preset name), to(target, t0, dur): pose; at(name): stage point of a landmark (P_MARK);
// mus(name, { w }): a muscle (P_MUS) that thins and glows when stretched, thickens when short;
// band(name): a ligament along the column (P_BAND) that brightens when stretched. Layers: f.mid (above the bones),
// f.top (above everything). Options: arm, ribs, regions (colour the regions), body (draw the skin).
function postureFig(p, x, gy, s, t0, { col = '#d8d1c1', pose = 'std', arm = true, ribs = true, regions = false, body = true, bones = true } = {}) {
  const g = G(p, { x, y: gy, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62), farCol = mix(col, COL.board, .42);
  const L = (c, ra, rb, ln, par = g) => limbEl(par, defs, c, ra, rb, ln);
  const f = { g, s, q: { ...PSTD, ...(typeof pose === 'string' ? POSTURE[pose] : pose) }, onSet: [], geo: null };
  const farArm = arm ? [L(farCol, 11, 9, mix(farCol, COL.board, .5)), L(farCol, 9, 7, mix(farCol, COL.board, .5)), L(farCol, 7, 5.5, mix(farCol, COL.board, .5))] : [];
  const tSh = shadeGrad(defs, col), torso = mk('path', { fill: tSh.url, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: body ? 1 : 0 }, g);
  const thigh = L(col, 36, 25, line), shank = L(col, 24, 13, line);
  const foot = mk('path', { fill: mix(col, '#000000', .12), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  if (!body) [thigh.e, shank.e, foot].forEach(e => e.setAttribute('opacity', 0));
  const B = ANAT.bone, bl = mix(B, '#000000', .45), bonesG = mk('g', { opacity: bones ? 1 : 0 }, g);
  const legBones = path(bonesG, '', { stroke: B, 'stroke-width': 8, 'stroke-opacity': .55 });
  const femHead = mk('circle', { r: 15, fill: B, 'fill-opacity': .6, stroke: bl, 'stroke-width': 1.5 }, bonesG);
  const ilium = mk('path', { fill: B, 'fill-opacity': .32, stroke: bl, 'stroke-width': 2, 'stroke-linejoin': 'round' }, bonesG);
  const acet = mk('circle', { r: 19, fill: 'none', stroke: bl, 'stroke-width': 2.5 }, bonesG);
  const sacrum = mk('path', { fill: regions ? REG_C.S : B, 'fill-opacity': .75, stroke: bl, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, bonesG);
  const cocc = mk('path', { fill: regions ? REG_C.Co : B, 'fill-opacity': .75, stroke: bl, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, bonesG);
  const ribsP = path(bonesG, '', { stroke: B, 'stroke-width': 3, 'stroke-opacity': ribs ? .5 : 0 });
  const sternum = path(bonesG, '', { stroke: B, 'stroke-width': 6, 'stroke-opacity': ribs ? .5 : 0 });
  const discs = mk('path', { fill: DISC_C, 'fill-opacity': .9 }, bonesG);
  const spinous = path(bonesG, '', { stroke: B, 'stroke-width': 3.5, 'stroke-opacity': .8 });
  const regOf = i => i < 5 ? 'L' : i < 17 ? 'T' : 'C';
  const verts = SEG_L.map((_, i) => mk('path', { fill: regions ? REG_C[regOf(i)] : B, stroke: bl, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, bonesG));
  const scap = mk('path', { fill: B, 'fill-opacity': .28, stroke: bl, 'stroke-width': 1.8, 'stroke-linejoin': 'round', opacity: arm ? 1 : 0 }, bonesG);
  f.mid = mk('g', {}, g);
  Object.assign(f, { verts, sacrum, cocc, ilium, ribsP, discs, scap, torso });
  const nearArm = arm ? [L(col, 12, 10, line), L(col, 10, 7.5, line), L(col, 7.5, 6, line)] : [];
  const delt = arm ? mk('circle', { r: 21, fill: col, stroke: line, 'stroke-width': 2 }, g) : null;
  const hg = mk('radialGradient', { id: 'pf' + (++SHADE_ID), cx: .42, cy: .3, r: .8 }, defs);
  [[0, mix(col, '#ffffff', .5)], [.55, col], [1, mix(col, '#000000', .42)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, hg));
  const head = mk('path', { fill: `url(#${hg.id})`, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  const ear = mk('ellipse', { rx: 7, ry: 13, fill: mix(col, '#000000', .15), stroke: line, 'stroke-width': 1.5 }, g);
  const eye = mk('circle', { r: 3.5, fill: line }, g);
  f.top = mk('g', {}, g);
  f.skin = [torso, thigh.e, shank.e, foot, head, ear, eye, ...farArm.map(a => a.e), ...nearArm.map(a => a.e)].concat(delt ? [delt] : []);
  // fade the skin to o (0..1) so the skeleton stands out; t0 = null sets it at once
  f.ghost = (o, t0 = null, dur = .6) => {
    let from = null;
    const apply = v => f.skin.forEach(e => e.setAttribute('opacity', v.toFixed(2)));
    if (t0 === null) apply(o); else prog(q => { if (from === null) from = +(f.skin[0].getAttribute('opacity') ?? 1); apply(lerp(from, o, q)); }, t0, dur);
  };
  const fv = v => v.toFixed(1), pt = P => fv(P[0]) + ' ' + fv(P[1]);
  const HEAD = [[-40, -6], [-58, -40], [-54, -96], [-14, -120], [20, -130], [54, -112], [56, -84], [60, -66], [64, -56], [72, -44], [62, -38], [62, -28], [58, -18], [56, -8], [46, 2], [30, 0], [6, -4]];
  const ILIUM = [[-62, -58], [-52, -92], [-14, -104], [22, -92], [38, -62], [30, -50], [34, -38], [24, -14], [40, 22], [36, 36], [8, 40], [-26, 50], [-40, 36], [-44, 6], [-50, -24]];
  const SACR = [[-38, -62], [-55, -72], [-66, -48], [-66, -18], [-58, 0], [-44, 0], [-46, -20], [-36, -42]], COCC = [[-58, 0], [-54, 12], [-46, 20], [-41, 14], [-44, 0]];
  const mus = [], bands = [];
  const G0 = postureGeo({ ...PSTD });
  f.set = o => {
    if (typeof o === 'string') o = POSTURE[o];
    Object.assign(f.q, o);
    const Q = postureGeo(f.q), { pts, phis } = Q;
    f.geo = Q;
    // torso outline: the front from the pubis up the column, the back down to the buttock and the thigh
    const fr = [Q.pv([46, 26])], bk = [];
    for (let u = 0; u <= 24; u++) { fr.push(Q.ant(u, P_FRONT[u])); if (u >= 1) bk.unshift(Q.ant(u, -P_BACK[u])); }
    const butt = [[-58, -40], [-68, -8], [-62, 30], [-40, 56]].map(Q.pv);
    const tN = nA(Q.tD);   // anterior normal of the thigh
    const thB = [Q.H[0] + Q.tD[0] * 80 - tN[0] * 30, Q.H[1] + Q.tD[1] * 80 - tN[1] * 30], thF = [Q.H[0] + Q.tD[0] * 40 + tN[0] * 34, Q.H[1] + Q.tD[1] * 40 + tN[1] * 34];
    const ring = fr.concat(bk, butt, [thB, thF]);
    torso.setAttribute('d', 'M' + ring.map(pt).join('L') + 'Z');
    tSh.aim(Q.H, pts[16], 80);
    thigh.set(Q.H, Q.K); shank.set(Q.K, Q.A);
    const A = Q.A, fa = f.q.ft || 0, fp = P => { const [rx, ry] = rotPt(P[0] - A[0], P[1] - A[1], fa); return pt([A[0] + rx, A[1] + ry]); };   // ft: the foot turns about the ankle (+ points the toes down)
    foot.setAttribute('d', `M${fp([A[0] - 26, A[1] - 4])}Q${fp([A[0] - 36, 2])} ${fp([A[0] - 22, 0])}L${fp([A[0] + 92, 0])}Q${fp([A[0] + 96, -10])} ${fp([A[0] + 80, -14])}L${fp([A[0] + 20, A[1] + 2])}Q${fp([A[0], A[1] - 12])} ${fp([A[0] - 26, A[1] - 4])}Z`);
    legBones.setAttribute('d', `M${pt(Q.H)}L${pt(Q.K)}M${pt([Q.K[0], Q.K[1] + 6])}L${pt(Q.A)}`);
    femHead.setAttribute('cx', fv(Q.H[0])); femHead.setAttribute('cy', fv(Q.H[1]));
    acet.setAttribute('cx', fv(Q.H[0])); acet.setAttribute('cy', fv(Q.H[1]));
    ilium.setAttribute('d', 'M' + ILIUM.map(v => pt(Q.pv(v))).join('L') + 'Z');
    const s1a = Q.pv([-18 + 20 * .866, -52 + 20 * .5]), s1p = Q.pv([-18 - 20 * .866, -52 - 20 * .5]);
    sacrum.setAttribute('d', `M${pt(s1a)}L${pt(s1p)}` + SACR.slice(2).map(v => 'L' + pt(Q.pv(v))).join('') + 'Z');
    cocc.setAttribute('d', 'M' + COCC.map(v => pt(Q.pv(v))).join('L') + 'Z');
    // vertebrae: a body on each unit, a disc in the gap, a spinous process behind
    let dd = '', sp = '';
    const corners = [];
    SEG_L.forEach((Lu, i) => {
      const a = rad(phis[i]), d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], w = SEG_W[i] / 2;
      const P0 = [pts[i][0] + d[0] * Lu * .13, pts[i][1] + d[1] * Lu * .13], P1 = [pts[i][0] + d[0] * Lu * .87, pts[i][1] + d[1] * Lu * .87];
      const c = [[P0[0] + n[0] * w, P0[1] + n[1] * w], [P1[0] + n[0] * w, P1[1] + n[1] * w], [P1[0] - n[0] * w, P1[1] - n[1] * w], [P0[0] - n[0] * w, P0[1] - n[1] * w]];
      verts[i].setAttribute('d', 'M' + c.map(pt).join('L') + 'Z');
      corners.push(c);
      const ln = i < 5 ? 15 : i < 17 ? 12 : i === 17 ? 14 : 8, dn = i < 5 ? .1 : i < 17 ? .7 : .3, M0 = [(P0[0] + P1[0]) / 2 - n[0] * w, (P0[1] + P1[1]) / 2 - n[1] * w];
      sp += `M${pt(M0)}L${pt([M0[0] - n[0] * ln - d[0] * ln * dn, M0[1] - n[1] * ln - d[1] * ln * dn])}`;
    });
    corners.forEach((c, i) => {
      const lo = i ? [corners[i - 1][1], corners[i - 1][2]] : [s1a, s1p];
      dd += `M${pt(lo[0])}L${pt(c[0])}L${pt(c[3])}L${pt(lo[1])}Z`;
    });
    discs.setAttribute('d', dd); spinous.setAttribute('d', sp);
    // ribs: from behind each thoracic vertebra, down and forward to the front of the chest
    let rb = '';
    for (let k = 1; k <= 12; k++) {
      const u = 17 - k, S0 = Q.ant(u, -P_BACK[u] + 7), drop = Math.min(4.5, 1.6 + k * .35), ue = Math.max(0.3, u - drop), fl = k > 10;
      const E0 = pAnt(Q, ue, fl ? P_FRONT[Math.round(ue)] * .45 : P_FRONT[Math.round(ue)] - 8), C0 = pAnt(Q, u + .6, P_FRONT[u] * .35);
      rb += `M${pt(S0)}Q${pt(C0)} ${pt(E0)}`;
    }
    ribsP.setAttribute('d', rb);
    sternum.setAttribute('d', `M${pt(pAnt(Q, 15.6, P_FRONT[16] - 6))}L${pt(pAnt(Q, 9.5, P_FRONT[9] - 6))}`);
    // scapula on the back, sliding forward round the chest when protracted
    const sc = 10 * Q.q.scap, sa = pAnt(Q, 15, -P_BACK[15] + 4 + sc), ia = pAnt(Q, 9.6, -P_BACK[10] + 6 + sc);
    scap.setAttribute('d', `M${pt(sa)}L${pt([Q.Sh[0] - 12, Q.Sh[1] - 10])}L${pt([Q.Sh[0] - 22, Q.Sh[1] + 14])}L${pt(ia)}Q${pt(pAnt(Q, 12, -P_BACK[12] - 2 + sc))} ${pt(sa)}Z`);
    if (arm) {
      farArm[0].set([Q.Sh[0] - 6, Q.Sh[1]], [Q.E[0] - 6, Q.E[1]]); farArm[1].set([Q.E[0] - 6, Q.E[1]], [Q.W[0] - 6, Q.W[1]]); farArm[2].set([Q.W[0] - 6, Q.W[1]], [Q.X[0] - 6, Q.X[1]]);
      nearArm[0].set(Q.Sh, Q.E); nearArm[1].set(Q.E, Q.W); nearArm[2].set(Q.W, Q.X);
      delt.setAttribute('cx', fv(Q.Sh[0] + 3)); delt.setAttribute('cy', fv(Q.Sh[1] + 4));
    }
    head.setAttribute('d', 'M' + HEAD.map(v => pt(Q.hd(v))).join('L') + 'Z');
    const ec = Q.hd([-4, -38]), ey = Q.hd([42, -62]);
    ear.setAttribute('cx', fv(ec[0])); ear.setAttribute('cy', fv(ec[1])); ear.setAttribute('transform', `rotate(${fv(Q.hA)} ${pt(ec)})`);
    eye.setAttribute('cx', fv(ey[0])); eye.setAttribute('cy', fv(ey[1]));
    mus.forEach(m => m.upd(Q)); bands.forEach(b => b.upd(Q));
    f.onSet.forEach(fn => fn(f));
    return f;
  };
  // figure point → stage, with the figure's own scale and rotation (a lying figure is rotated by ±90°)
  f.stage = P => { const s0 = st(g), [x, y] = rotPt(P[0] * s0.s, P[1] * s0.s, s0.r || 0); return [s0.x + x, s0.y + y]; };
  f.at = k => f.stage(P_MARK[k](f.geo));
  f.local = k => P_MARK[k](f.geo);
  f.unit = (u, k = 0) => f.stage(pAnt(f.geo, u, k));
  f.mus = (name, { w = 12, layer = f.mid } = {}) => {
    const [fa, fb] = P_MUS[name], a0 = fa(G0), b0 = fb(G0);
    const m = muscleEl(layer, { rest: Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), w });
    m.upd = Q => m.set(fa(Q), fb(Q));
    mus.push(m); m.upd(f.geo);
    return m;
  };
  // a straight ligament (P_LIG): taut at its length in the standard posture, slack (wavy) when shorter
  f.lig = (name, { w = 5, layer = f.mid, slack = 1 } = {}) => {
    const [fa, fb] = P_LIG[name], a0 = fa(G0), b0 = fb(G0), l = ligEl(layer, { rest: Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) * slack, w });
    l.upd = Q => l.set(fa(Q), fb(Q));
    mus.push(l); l.upd(f.geo);
    return l;
  };
  f.band = (name, { w = 4.5, layer = f.mid } = {}) => {
    const [u0, u1, k] = P_BAND[name], e = path(layer, '', { stroke: ANAT.tendon, 'stroke-width': w, 'stroke-linecap': 'round' });
    const gl = path(layer, '', { stroke: ANAT.taut, 'stroke-width': 0, 'stroke-opacity': .4 });
    layer.insertBefore(gl, e);
    const ptsOf = Q => { const r = []; for (let u = u0; u <= u1 + 1e-6; u += .5) r.push(pAnt(Q, Math.min(u, 24), SEG_W[Math.min(23, Math.floor(u))] * k)); return r; };
    const lenOf = P => P.slice(1).reduce((a, Pt, i) => a + Math.hypot(Pt[0] - P[i][0], Pt[1] - P[i][1]), 0);
    const L0 = lenOf(ptsOf(G0)), b = { e, glow: gl, tension: 0 };
    b.upd = Q => {
      const P = ptsOf(Q), r = lenOf(P) / L0, t = clamp((r - 1) / .05, 0, 1), d = 'M' + P.map(pt).join('L');
      e.setAttribute('d', d); gl.setAttribute('d', d);
      e.setAttribute('stroke', mix(mix(ANAT.tendon, COL.board, .3), ANAT.taut, t)); gl.setAttribute('stroke-width', fv(w * 3 * t));
      b.tension = t;
    };
    bands.push(b); b.upd(f.geo);
    return b;
  };
  f.to = (target, t0, dur = 1.2, ease = io) => {
    const to = typeof target === 'string' ? POSTURE[target] : target;
    let from = null;
    prog(q => { if (!from) from = { ...f.q }; const o = {}; for (const k in to) o[k] = lerp(from[k], to[k], q); f.set(o); }, t0, dur, ease);
  };
  f.set({});
  if (t0 !== null) show(g, t0);
  return f;
}
// A plumb line on the ground at x from the ground gy up to y: a dashed line with a small bob.
function plumb(p, x, gy, y, t0, col = COL.whole) {
  const g = G(p, { o: 0 });
  path(g, `M${x} ${y}V${gy - 8}`, { stroke: col, 'stroke-width': 2.5, 'stroke-dasharray': '10 7' });
  mk('path', { d: `M${x - 8} ${gy - 22}L${x + 8} ${gy - 22}L${x} ${gy - 4}Z`, fill: col }, g);
  mk('circle', { cx: x, cy: y, r: 5, fill: col }, g);
  if (t0 !== null) show(g, t0);
  return g;
}

// A lumbar motion segment in side view: two vertebrae with the disc (annulus, nucleus, end-plates), the facet joint,
// the foramen with the nerve root and four ligaments. Anterior is to the right (dir = −1 mirrors). The lower vertebra
// is fixed; set({ flex (deg, + flexion), shear (+ forward), comp (+ compression, − distraction) }) moves the upper one
// about the axis in the nucleus. hl(names, col, t0) tints parts: bodyU bodyL disc nuc epU epL pedU pedL sap iap spinU
// spinL transU transL; e.lig: all pll isl (ligEl); e.at(name): stage point (nuc, ant, post, facet, spinGap, for, root,
// all, pll, isl, bodyU, bodyL, spinU, spinL, pedU, pedL). e.room 0..1: how much space the root has.
function spineSeg(p, x, y, s, t0, { dir = 1, ligs = true, root = true } = {}) {
  const g = G(p, { x, y, s, o: 0 }), M = mk('g', { transform: `scale(${dir} 1)` }, g), defs = mk('defs', {}, M);
  const B = ANAT.bone, bl = mix(B, '#000000', .45), AX = [-8, 0];
  const VERT = {   // in the vertebra's frame: body centre at (0, 0), anterior +x
    body: 'M-70 -48H66Q74 0 66 48H-70Q-64 0 -70 -48Z',
    ped: 'M-70 -44L-112 -40L-112 -6L-70 -6Z',
    arch: 'M-112 -40L-170 -38L-178 10L-150 14L-118 -6Z',
    sap: 'M-118 -8L-118 -88Q-124 -98 -134 -94L-146 -86L-148 -8Z',
    iap: 'M-150 4L-148 60Q-152 70 -164 68L-176 58L-178 6Z',
    spin: 'M-168 -34L-244 -22Q-262 -6 -246 14L-170 22Z',
    trans: 'M-112 -30Q-128 -38 -140 -26Q-146 -12 -132 -6Q-118 -4 -112 -14Z',
  };
  const part = {};
  const vert = (par, k) => {
    const sh = shadeGrad(defs, B);
    ['ped', 'arch', 'sap', 'iap', 'spin'].forEach(n => { part[n + k] = mk('path', { d: VERT[n], fill: B, stroke: bl, 'stroke-width': 2, 'stroke-linejoin': 'round' }, par); });
    part['body' + k] = mk('path', { d: VERT.body, fill: sh.url, stroke: bl, 'stroke-width': 2, 'stroke-linejoin': 'round' }, par);
    sh.aim([0, -48], [0, 48], 70);
    part['trans' + k] = mk('path', { d: VERT.trans, fill: mix(B, '#ffffff', .25), stroke: bl, 'stroke-width': 1.5 }, par);
    part['ep' + k] = mk('path', { d: k === 'U' ? 'M-68 45H64' : 'M-68 -45H64', stroke: EP_C, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, par);
  };
  const low = G(M, { x: 0, y: 62 }); vert(low, 'L');
  part.iapL.remove(); part.sap = part.sapL;   // the lower vertebra shows its superior process, the upper its inferior one
  const forE = mk('path', { fill: '#101a17', stroke: '#5c6b68', 'stroke-width': 1.5 }, M);
  const rootE = root ? mk('circle', { r: 12, fill: NERVE_C, stroke: '#9b7d24', 'stroke-width': 2 }, M) : null;
  const disc = mk('path', { fill: DISC_C, stroke: mix(DISC_C, '#000000', .35), 'stroke-width': 2 }, M);
  const lam = path(M, '', { stroke: mix(DISC_C, '#000000', .2), 'stroke-width': 1.3, 'stroke-opacity': .8 });
  const nuc = mk('ellipse', { fill: NUC_C, stroke: mix(DISC_C, '#000000', .25), 'stroke-width': 1.5 }, M);
  part.disc = disc; part.nuc = nuc;
  const upW = G(M, {}), up = G(upW, { x: -AX[0], y: -AX[1] - 62 }); vert(up, 'U');
  part.sapU.remove(); part.iap = part.iapU;
  const spur = par => mk('path', { fill: mix(B, '#000000', .08), stroke: bl, 'stroke-width': 1.5, 'stroke-linejoin': 'round', opacity: 0 }, par);
  const spurL = spur(low), spurU = spur(up);
  const tongue = mk('path', { fill: NUC_C, stroke: mix(DISC_C, '#000000', .3), 'stroke-width': 1.5, opacity: 0 }, M);
  M.insertBefore(tongue, upW);
  const L = { all: null, pll: null, isl: null }, ligG = mk('g', {}, M);
  const S = { flex: 0, shear: 0, comp: 0, bulge: 0, osteo: 0 }, e = { g, st: S, part, lig: L, room: 1 };
  const U = ([px, py]) => {   // a point of the upper vertebra (its own frame) → segment frame
    const [rx, ry] = rotPt(px - AX[0], py - 62 - AX[1], S.flex);
    return [rx + AX[0] + S.shear, ry + AX[1] + S.comp];
  };
  const Lo = ([px, py]) => [px, py + 62];
  const f = v => v.toFixed(1), pt = P => f(P[0]) + ' ' + f(P[1]);
  const att = { all: [[70, 26], [70, -26]], pll: [[-71, 26], [-71, -26]], isl: [[-206, 22], [-206, -34]] };
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (ligs) for (const k in att) L[k] = ligEl(ligG, { rest: len(U(att[k][0]), Lo(att[k][1])) * 1.09, w: k === 'isl' ? 5 : 6 });
  e.set = o => {
    Object.assign(S, o);
    put(upW, { x: AX[0] + S.shear, y: AX[1] + S.comp, r: S.flex });
    const ua = U([66, 48]), up_ = U([-70, 48]), la = Lo([66, -48]), lp = Lo([-70, -48]);
    const hA = len(ua, la), hP = len(up_, lp), h0 = 28;
    const bA = 3 + clamp((h0 - hA) * .55, 0, 14) + clamp(S.comp, 0, 20) * .3, bP = 3 + clamp((h0 - hP) * .55, 0, 14) + clamp(S.comp, 0, 20) * .3 + 22 * S.bulge;
    disc.setAttribute('d', `M${pt(up_)}L${pt(ua)}Q${f((ua[0] + la[0]) / 2 + bA)} ${f((ua[1] + la[1]) / 2)} ${pt(la)}L${pt(lp)}Q${f((up_[0] + lp[0]) / 2 - bP)} ${f((up_[1] + lp[1]) / 2)} ${pt(up_)}Z`);
    lam.setAttribute('d', [.25, .5, .75].map(k => `M${pt([lerp(up_[0], lp[0], k), lerp(up_[1], lp[1], k)])}L${pt([lerp(ua[0], la[0], k), lerp(ua[1], la[1], k)])}`).join(''));
    const mid = [(ua[0] + la[0] + up_[0] + lp[0]) / 4, (ua[1] + la[1] + up_[1] + lp[1]) / 4], hm = (hA + hP) / 2;
    nuc.setAttribute('cx', f(mid[0] - 10 - S.flex * .25)); nuc.setAttribute('cy', f(mid[1]));
    nuc.setAttribute('rx', f(36 + clamp(h0 - hm, -8, 12) * .6)); nuc.setAttribute('ry', f(clamp(hm * .34, 4, 13)));
    nuc.setAttribute('transform', `rotate(${f(S.flex / 2)} ${pt([mid[0] - 10 - S.flex * .25, mid[1]])})`);
    // the foramen between the pedicles, the back of the disc and the facet joint
    const A = U([-72, -6]), Bq = U([-112, -6]), C = Lo([-120, -86]), D = Lo([-114, -44]), E = Lo([-72, -44]), F = [(up_[0] + lp[0]) / 2 - bP * .6, (up_[1] + lp[1]) / 2];
    forE.setAttribute('d', `M${pt(A)}Q${pt([(A[0] + Bq[0]) / 2, Bq[1] + 4])} ${pt(Bq)}Q${pt([Bq[0] - 6, (Bq[1] + C[1]) / 2])} ${pt(C)}L${pt(D)}Q${pt([(D[0] + E[0]) / 2, D[1] - 4])} ${pt(E)}L${pt(F)}Z`);
    const hgt = D[1] - A[1], wid = C[0] < A[0] ? A[0] - C[0] : 1;
    e.room = clamp(Math.min((hgt - 50) / 36, (wid - 30) / 18), 0, 1) * (1 - .75 * S.bulge) * (1 - .6 * S.osteo);
    // a posterior bulge: the nucleus pushes a tongue into the bulging annulus
    const nx0 = mid[0] - 10 - S.flex * .25 - (36 + clamp(h0 - hm, -8, 12) * .6) * .8, xa = (up_[0] + lp[0]) / 2 - bP + 5, ym = mid[1];
    tongue.setAttribute('d', `M${f(nx0)} ${f(ym - 6)}Q${f(xa)} ${f(ym - 10)} ${f(xa)} ${f(ym)}Q${f(xa)} ${f(ym + 10)} ${f(nx0)} ${f(ym + 6)}Z`);
    tongue.setAttribute('opacity', f(clamp(S.bulge * 3, 0, 1)));
    // osteophytes: lips at the body margins and a spur on the superior articular process
    const k = S.osteo;
    spurL.setAttribute('d', `M66 -40L${f(66 + 14 * k)} ${f(-52 - 6 * k)}L54 -48ZM-70 -40L${f(-70 - 12 * k)} ${f(-52 - 6 * k)}L-58 -48ZM-128 -92L${f(-126 + 4 * k)} ${f(-98 - 14 * k)}L-142 -92Z`);
    spurU.setAttribute('d', `M66 40L${f(66 + 14 * k)} ${f(52 + 6 * k)}L54 48ZM-70 40L${f(-70 - 12 * k)} ${f(52 + 6 * k)}L-58 48Z`);
    [spurL, spurU].forEach(el => el.setAttribute('opacity', f(clamp(k * 4, 0, 1))));
    if (rootE) {
      const R = [(A[0] + Bq[0]) / 2 - 2, A[1] + 22 + (1 - e.room) * 6];
      rootE.setAttribute('cx', f(R[0])); rootE.setAttribute('cy', f(R[1]));
      rootE.setAttribute('r', f(12 - 3 * (1 - e.room)));
      rootE.setAttribute('fill', mix(NERVE_C, '#ff5a3c', clamp((1 - e.room) * 1.3 - .2, 0, 1)));
    }
    if (ligs) for (const k in att) L[k].set(U(att[k][0]), Lo(att[k][1]));
    e.P = { nuc: [mid[0] - 10, mid[1]], ant: [(ua[0] + la[0]) / 2 + bA, mid[1]], post: [(up_[0] + lp[0]) / 2 - bP, mid[1]], facet: Lo([-148, -60]),
      spinGap: [(U([-210, 22])[0] + Lo([-210, -34])[0]) / 2, (U([-210, 22])[1] + Lo([-210, -34])[1]) / 2], for: [(A[0] + E[0]) / 2 - 18, (A[1] + E[1]) / 2],
      root: rootE ? [+rootE.getAttribute('cx'), +rootE.getAttribute('cy')] : A, all: [(ua[0] + la[0]) / 2 + 6, mid[1]], pll: [(up_[0] + lp[0]) / 2 - 6, mid[1]],
      isl: [(U([-206, 22])[0] + Lo([-206, -34])[0]) / 2, (U([-206, 22])[1] + Lo([-206, -34])[1]) / 2], bodyU: U([0, 0]), bodyL: Lo([0, 0]),
      spinU: U([-240, -4]), spinL: Lo([-240, -4]), pedU: U([-92, -24]), pedL: Lo([-92, -24]) };
    return e;
  };
  e.at = k => { const s0 = st(g), [px, py] = e.P[k]; return [s0.x + px * dir * s0.s, s0.y + py * s0.s]; };
  e.hl = (names, col, t0, { a = .4 } = {}) => [].concat(names).forEach(n => {
    const el = part[n], c = el.cloneNode();
    c.setAttribute('fill', col); c.setAttribute('stroke', col); c.setAttribute('stroke-width', 3.5);
    if (n === 'nuc') c.removeAttribute('transform');
    el.parentNode.insertBefore(c, el.nextSibling);
    put(c, { o: 0 }); tw(c, { o: a }, t0, .5);
    if (n === 'nuc' || n === 'disc') { e.onSet.push(() => { c.setAttribute('d', el.getAttribute('d') || ''); ['cx', 'cy', 'rx', 'ry', 'transform'].forEach(k2 => { if (el.getAttribute(k2) !== null) c.setAttribute(k2, el.getAttribute(k2)); }); }); }
  });
  e.onSet = [];
  const set0 = e.set;
  e.set = o => { set0(o); e.onSet.forEach(fn => fn()); return e; };
  e.set({});
  if (t0 !== null) show(g, t0);
  return e;
}

/* ---------- chapter 15: disc lesions ---------- */
// A lumbar disc in cross-section at the disc level (anterior up): annulus rings round the nucleus, the dural sac and
// both nerve roots behind it, the posterior arch dimmed. set({ st, side }): st 0..4 — 0 healthy, 1 layers torn and packed
// at the posterolateral corner, 2 a radial fissure with the nucleus bulging the outer annulus (protrusion), 3 nuclear
// material through the outer annulus but still attached (extrusion), 4 a separate fragment (sequestration); side 1 —
// the patient's right (the viewer's right, seen from above). The root on that side reddens as it is pressed.
function discAxial(p, x, y, s, t0) {
  const g = G(p, { x, y, s, o: 0 }), B = ANAT.bone, bl = mix(B, '#000000', .45);
  mk('path', { d: 'M-46 150L-70 196L-30 236L-10 300L10 300L30 236L70 196L46 150', fill: 'none', stroke: B, 'stroke-width': 12, 'stroke-opacity': .25, 'stroke-linejoin': 'round' }, g);
  const sac = mk('ellipse', { cx: 0, cy: 168, rx: 44, ry: 34, fill: mix(NERVE_C, COL.board, .55), stroke: NERVE_C, 'stroke-width': 2.5 }, g);
  const roots = [-1, 1].map(k => mk('circle', { cx: k * 74, cy: 150, r: 15, fill: NERVE_C, stroke: '#9b7d24', 'stroke-width': 2 }, g));
  const ann = mk('path', { fill: DISC_C, stroke: mix(DISC_C, '#000000', .35), 'stroke-width': 2.5 }, g);
  const rings = [0, 1, 2, 3].map(i => mk('path', { fill: 'none', stroke: mix(DISC_C, i % 2 ? '#ffffff' : '#000000', .22), 'stroke-width': 2 }, g));
  const fis = mk('path', { fill: 'none', stroke: '#1b2623', 'stroke-width': 0, 'stroke-linecap': 'round' }, g);
  const nuc = mk('ellipse', { cx: 0, cy: 14, rx: 56, ry: 38, fill: NUC_C, stroke: mix(DISC_C, '#000000', .3), 'stroke-width': 2 }, g);
  const tongue = mk('path', { fill: NUC_C, stroke: mix(DISC_C, '#000000', .3), 'stroke-width': 1.8 }, g);
  const frag = mk('ellipse', { rx: 20, ry: 14, fill: NUC_C, stroke: mix(DISC_C, '#000000', .3), 'stroke-width': 1.8, opacity: 0 }, g);
  T(g, 'вперёд ↑', { x: 0, y: -122, size: 17, fill: COL.dim, weight: 600, anchor: 'middle' });
  const S = { st: 0, side: 1 }, e = { g, roots, sac };
  const f = v => v.toFixed(1);
  const outline = (rx, ry, bump, k) => {   // an ellipse with a bump toward the posterolateral corner of side k
    const a0 = Math.atan2(.72, .7 * k);
    let d = '';
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * 2 * Math.PI, dA = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)), b = bump * Math.exp(-((dA / .32) ** 2));
      d += (i ? 'L' : 'M') + f((rx + b) * Math.cos(a)) + ' ' + f((ry + b) * Math.sin(a));
    }
    return d + 'Z';
  };
  e.set = o => {
    Object.assign(S, o);
    const t = S.st, k = S.side, bump = 22 * clamp(t - 1, 0, 1) - 8 * clamp(t - 3, 0, 1);
    ann.setAttribute('d', outline(150, 104, bump, k));
    rings.forEach((r, i) => r.setAttribute('d', outline(128 - i * 20, 88 - i * 14, bump * (1 - i * .2), k)));
    // the fissure from the nucleus to the outer annulus
    const fx0 = k * 34, fy0 = 38, fx1 = k * (96 + 14 * clamp(t - 1, 0, 1)), fy1 = 70 + 12 * clamp(t - 1, 0, 1);
    fis.setAttribute('d', `M${f(fx0)} ${f(fy0)}L${f(lerp(fx0, fx1, .5) + k * 6)} ${f(lerp(fy0, fy1, .5) - 4)}L${f(fx1)} ${f(fy1)}`);
    fis.setAttribute('stroke-width', f(10 * clamp(t, 0, 1)));
    // the nucleus follows the fissure: a tongue that reaches the outer layers, then passes through them
    const reach = clamp(t - 1, 0, 1) * .75 + clamp(t - 2, 0, 1) * .45, tx = fx0 + (fx1 - fx0) * reach + k * 18 * clamp(t - 2, 0, 1), ty = fy0 + (fy1 - fy0) * reach + 22 * clamp(t - 2, 0, 1);
    const w = 11 * clamp(t - 1, 0, 1) * (1 - clamp(t - 3, 0, 1));
    tongue.setAttribute('d', `M${f(k * 20)} ${f(30)}L${f(tx - w)} ${f(ty - w * .4)}Q${f(tx + k * 10)} ${f(ty + 10)} ${f(tx + w)} ${f(ty + w * .4)}L${f(k * 34)} ${f(26)}Z`);
    tongue.setAttribute('opacity', f(clamp((t - 1) * 3, 0, 1) * (1 - clamp(t - 3, 0, 1))));
    frag.setAttribute('cx', f(k * 92)); frag.setAttribute('cy', f(132)); frag.setAttribute('opacity', f(clamp(t - 3, 0, 1)));
    const press = clamp(t - 1.6, 0, 1);
    roots.forEach((r, i) => { const on = (i ? 1 : -1) === k; r.setAttribute('fill', on ? mix(NERVE_C, '#ff5a3c', press) : NERVE_C); r.setAttribute('cx', f((i ? 1 : -1) * 74 + (on ? k * 8 * press : 0))); });
    nuc.setAttribute('rx', f(56 - 8 * clamp(t - 1, 0, 1))); nuc.setAttribute('cx', f(k * 6 * clamp(t - 1, 0, 1)));
    return e;
  };
  e.at = (px, py) => { const s0 = st(g); return [s0.x + px * s0.s, s0.y + py * s0.s]; };
  e.set({});
  if (t0 !== null) show(g, t0);
  return e;
}


/* ---------- chapter 16: spine exercises on the posture figure ---------- */
// A mat or table edge from x1 to x2 at height y.
const matLine = (p, x1, x2, y, t0) => show(path(p, `M${x1} ${y}H${x2}`, { stroke: COL.dim, 'stroke-width': 6 }, { o: 0 }), t0);
// The posture figure lying on a mat (the line y): 'supine' — on the back, head to the left of x; 'prone' — on the
// belly, head to the right. The figure hangs from its ankle; f.hold(o) re-poses it and shifts the group so the hip
// stays where it was (heel slides, knees to chest, leg lifts); f.holdTo(o, t0, dur) tweens that.
function lieFig(p, x, y, s, t0, kind = 'supine', pose = {}) {
  const f = postureFig(p, 0, 0, s, t0, { pose: { shank: 0, thigh: 0, ...pose } });
  const r = kind === 'supine' ? -90 : 90, by = y - (kind === 'supine' ? 75 : 78) * s, H0 = f.geo.H.slice();
  put(f.g, { x, y: by, r });
  f.kind = kind;
  f.hold = o => {
    f.set(o);
    const [dx, dy] = rotPt((f.geo.H[0] - H0[0]) * s, (f.geo.H[1] - H0[1]) * s, r);
    put(f.g, { x: x - dx, y: by - dy });
    return f;
  };
  f.holdTo = (target, t0, dur = 1.2, ease = io) => {
    let from = null;
    prog(q => { if (!from) from = { ...f.q }; const o = {}; for (const k in target) o[k] = lerp(from[k], target[k], q); f.hold(o); }, t0, dur, ease);
  };
  return f;
}
// Hook-lying legs: hip flexed phi degrees with the heel kept on the mat (standing-frame segment angles).
const hookLegs = phi => ({ thigh: -phi, shank: Math.asin(216 * Math.sin(rad(phi)) / 221) / rad(1), ft: 90 });
// Two-link reach of the posture figure's arm (upper arm 150, forearm 132): the wrist goes to W (standing frame),
// the elbow bends the flexion way; handA — the absolute angle of the hand (0 hanging, 90 forward, 180 up).
function armIK(q, W, handA = null) {
  const S = postureGeo(q).Sh, dx = W[0] - S[0], dy = W[1] - S[1], d = clamp(Math.hypot(dx, dy), 20, 281.9), dg = rad(1);
  const th = Math.atan2(dx, dy) / dg, al = Math.acos((150 * 150 + d * d - 132 * 132) / (2 * 150 * d)) / dg, be = Math.acos((132 * 132 + d * d - 150 * 150) / (2 * 132 * d)) / dg;
  const arm = th - al - 4, elb = al + be;
  return { arm, elb, wr: handA === null ? 0 : handA - (arm + 4 + elb + 4) };
}

/* ---------- chapter 17: the shoulder (ghJoint, ghAxial, scapBack, topRot) ---------- */
const CAPS_C = '#e8d6a8', LAB_C = '#9fc4e8', BURSA_C = '#7fd0e0', CART_C = '#d8eef6';
const smooth01 = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const polar = (C, r, a) => [C[0] + r * Math.cos(rad(a)), C[1] + r * Math.sin(rad(a))];
const angDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;
const ptsD = (P, close = false) => 'M' + P.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + (close ? 'Z' : '');
const polyLen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
const offPts = (P, d) => P.map((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [q[0] - dy / L * d, q[1] + dx / L * d]; });
// Scapular upward rotation for a given elevation of the arm: little in the first 30°, then about 1° in every 3°.
const rhythmUp = a => a < 30 ? a * .1 : 3 + (a - 30) * .38;
// A cord from the outside point A around the circle (C, r) to the circle point at angle aB (degrees, the SVG sense),
// running with increasing (dir 1) or decreasing (−1) angle. If it does not reach round, it runs straight.
function wrapPts(A, C, r, aB, dir, n = 18) {
  const D = Math.hypot(A[0] - C[0], A[1] - C[1]), B = polar(C, r, aB), straight = () => ({ pts: [A, B], L: Math.hypot(B[0] - A[0], B[1] - A[1]), angs: null });
  if (D <= r + .5) return straight();
  const aT = Math.atan2(A[1] - C[1], A[0] - C[0]) / rad(1) + dir * Math.acos(r / D) / rad(1);
  const sw = (((aB - aT) * dir) % 360 + 360) % 360;
  if (sw > 300) return straight();
  const pts = [A], angs = [null];
  for (let i = 0; i <= n; i++) { const a = aT + dir * sw * i / n; angs.push(a); pts.push(polar(C, r, a)); }
  return { pts, L: Math.sqrt(D * D - r * r) + r * rad(sw), angs };
}
// A cord between two outside points A and B, wrapping round the circle (C, r) when the straight line would cut it.
function wrap2(A, B, C, r, dir, n = 18) {
  const vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy || 1, t = clamp(((C[0] - A[0]) * vx + (C[1] - A[1]) * vy) / L2, 0, 1);
  if (Math.hypot(A[0] + vx * t - C[0], A[1] + vy * t - C[1]) >= r) return { pts: [A, B], L: Math.sqrt(L2) };
  const ang = P => Math.atan2(P[1] - C[1], P[0] - C[0]) / rad(1), al = P => Math.acos(Math.min(1, r / Math.hypot(P[0] - C[0], P[1] - C[1]))) / rad(1);
  const a1 = ang(A) + dir * al(A), a2 = ang(B) - dir * al(B), sw = (((a2 - a1) * dir) % 360 + 360) % 360, pts = [A];
  for (let i = 0; i <= n; i++) pts.push(polar(C, r, a1 + dir * sw * i / n));
  pts.push(B);
  return { pts, L: polyLen(pts) };
}
// A muscle or tendon along a polyline: a shaded band with fibres. Stretched past its rest length it glows yellow,
// active (act 0..1) it turns red; hurt 0..1 (compression) tints it with the alarm colour. Short, a muscle thickens.
function bandEl(parent, { col = ANAT.muscle, w = 16, rest = null, tendon = false, opacity = 1 } = {}) {
  const g = mk('g', { opacity }, parent), cap = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
  const glow = path(g, '', { ...cap, stroke: ANAT.taut, 'stroke-opacity': .45 });
  const edge = path(g, '', { ...cap, stroke: mix(col, '#000000', .45) });
  const body = path(g, '', { ...cap });
  const fib = path(g, '', { ...cap, stroke: mix(col, '#ffffff', .45), 'stroke-width': 1.3, 'stroke-opacity': .7 });
  const b = { g, rest, strain: 0, level: 0, hurt: 0, last: null, pts: [] };
  b.act = v => { b.level = v; if (b.last) b.set(...b.last); };
  b.set = (pts, L = null) => {
    b.last = [pts, L]; b.pts = pts;
    const len = L ?? polyLen(pts);
    if (b.rest === null) b.rest = len;
    b.strain = len / b.rest - 1;
    const wN = tendon ? w : w * clamp(b.rest / len, .85, 1.3), d = ptsD(pts);
    [glow, edge, body].forEach(e => e.setAttribute('d', d));
    fib.setAttribute('d', tendon ? d : [-.28, .28].map(k => ptsD(offPts(pts, wN * k))).join(''));
    const s = clamp(b.strain / .08, 0, 1) * (1 - b.level), a = b.level;
    body.setAttribute('stroke', mix(mix(mix(col, tendon ? ANAT.taut : '#ffd2c4', s * .6), '#ff5a3c', a * .75), COL.bad, b.hurt * .85));
    body.setAttribute('stroke-width', wN.toFixed(1)); edge.setAttribute('stroke-width', (wN + 3).toFixed(1));
    const top = Math.max(s, a, b.hurt);
    glow.setAttribute('stroke', b.hurt >= top && b.hurt > 0 ? COL.bad : a >= s ? '#ff5a3c' : ANAT.taut);
    glow.setAttribute('stroke-width', (wN + top * 14).toFixed(1));
    glow.setAttribute('stroke-opacity', (.45 * top).toFixed(2));
    return b.strain;
  };
  b.mid = (k = .5) => b.pts[Math.floor((b.pts.length - 1) * k)];
  return b;
}
// A joint capsule along a wrapped polyline around the centre C: slack, it sags away from C in a pouch; at its rest
// length (× K, the capsule's tightness: K < 1 a contracted capsule) it is straight, thick and glowing.
function capEl(parent, { rest = null, w = 6, col = CAPS_C, maxSag = 34 } = {}) {
  const glow = path(parent, '', { fill: 'none', stroke: ANAT.taut, 'stroke-opacity': .4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const e = path(parent, '', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const c = { rest, K: 1, tension: 0, mid: [0, 0], pts: [], last: null, el: () => e };
  c.set = (pts, L, C) => {
    c.last = [pts, L, C];
    if (c.rest === null) c.rest = L;
    const R0 = c.rest * c.K, slack = Math.max(0, R0 - L), sag = Math.min(maxSag, slack * .45), n = 22, tot = polyLen(pts) || 1, P = [];
    for (let i = 0, k = 0, acc = 0; i <= n; i++) {   // resample evenly
      const want = tot * i / n, seg = m => Math.hypot(pts[m + 1][0] - pts[m][0], pts[m + 1][1] - pts[m][1]);
      while (k < pts.length - 2 && acc + seg(k) < want) { acc += seg(k); k++; }
      const q = clamp((want - acc) / (seg(k) || 1), 0, 1);
      P.push([lerp(pts[k][0], pts[k + 1][0], q), lerp(pts[k][1], pts[k + 1][1], q)]);
    }
    const out = P.map((q, i) => { const k = Math.sin(Math.PI * i / n), dx = q[0] - C[0], dy = q[1] - C[1], d = Math.hypot(dx, dy) || 1; return [q[0] + dx / d * sag * k, q[1] + dy / d * sag * k]; });
    const d = ptsD(out);
    e.setAttribute('d', d); glow.setAttribute('d', d);
    c.tension = clamp(1 - slack / (R0 * .15), 0, 1);
    e.setAttribute('stroke', mix(mix(col, COL.board, .3), ANAT.taut, c.tension));
    e.setAttribute('stroke-width', (w * (.8 + .5 * c.tension)).toFixed(1));
    glow.setAttribute('stroke-width', (w * 3.4 * c.tension).toFixed(1));
    c.mid = out[n >> 1]; c.pts = out;
    return c.tension;
  };
  return c;
}
// A mask that fades a group out along the line (x1, y1) → (x2, y2): stops are [offset, '#fff' shown / '#000' gone].
function fadeMask(defs, x1, y1, x2, y2, stops) {
  const id = 'fm' + (++SHADE_ID), m = mk('mask', { id, maskUnits: 'userSpaceOnUse', x: -3000, y: -3000, width: 6000, height: 6000 }, defs);
  const gr = mk('linearGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', x1, y1, x2, y2 }, defs);
  stops.forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  mk('rect', { x: -3000, y: -3000, width: 6000, height: 6000, fill: `url(#${id}g)` }, m);
  return `url(#${id})`;
}
const boneGrad = (defs, x1, y1, x2, y2, base = ANAT.bone) => { const id = 'bg' + (++SHADE_ID), gr = mk('linearGradient', { id, x1, y1, x2, y2 }, defs); [[0, mix(base, '#ffffff', .45)], [.45, base], [1, mix(base, '#000000', .42)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr)); return `url(#${id})`; };
const ballGrad = (defs, base = ANAT.bone) => { const id = 'bb' + (++SHADE_ID), gr = mk('radialGradient', { id, cx: .36, cy: .3, r: .78 }, defs); [[0, mix(base, '#ffffff', .55)], [.55, base], [1, mix(base, '#000000', .4)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr)); return `url(#${id})`; };

// The right glenohumeral joint in a frontal section, seen from the front (medial to the left). The head centre is at
// (x, y), its radius R = 60 local units. set({ elev, scap, dx, dy, er }): elev — elevation of the arm from the side
// (degrees, in the picture's frame); scap — upward rotation of the scapula (null: the scapulohumeral rhythm, or 0 with
// rhythm false); dx, dy — translation of the head in the glenoid; er — rotation (+ external): it turns the greater
// tubercle out of this plane, so it stands out less. gap — clearance between the cuff and the arch, comp 0..1 its
// compression. ssp / delt / bic — bands (act(v) to contract); capS / capI — superior and inferior capsule (K tightness).
// HG / SG / AG — the humerus, scapula and arch groups for overlays; hum(P) / scp(P) map their points to this frame.
function ghJoint(p, x, y, s = 1, t0 = .2, { acType = 1, spur = false, delt = true, bic = false, rhythm = true } = {}) {
  const R = 60, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(ANAT.bone, '#000000', .5);
  const j = { g, R, q: { elev: 0, scap: null, dx: 0, dy: 0, er: 0 }, pts: {}, gap: 99, comp: 0, acType, spur, sc: 0, rg: R + 13 };
  const outer = mk('g', { mask: fadeMask(defs, -4 * R, 0, 6 * R, 0, [[0, '#000'], [.09, '#fff'], [.86, '#fff'], [.97, '#000']]) }, g);
  const root = mk('g', { mask: fadeMask(defs, 0, -5.8 * R, 0, 5.4 * R, [[0, '#000'], [.1, '#fff'], [.88, '#fff'], [.98, '#000']]) }, outer);
  const SG = mk('g', {}, root), HG = mk('g', {}, root), capG = mk('g', {}, root), musG = mk('g', {}, root), BG = mk('g', {}, root), AG = mk('g', {}, root), dG = mk('g', {}, root);
  Object.assign(j, { SG, HG, AG, BG, root, capG, musG, dG });
  // scapula: neck and glenoid (concave towards the head), labrum, cartilage
  const P0 = [0, 0], A = (r, a) => polar(P0, r, a), F2 = P => f(P[0]) + ' ' + f(P[1]);
  mk('path', { d: `M${F2(A(R + 6, 214))}L${F2([-1.25 * R, -1.02 * R])}L${F2([-2.3 * R, -.98 * R])}L${F2([-4.1 * R, -.95 * R])}L${F2([-4.1 * R, 3.8 * R])}L${F2([-2.5 * R, 3.8 * R])}` +
    `C${F2([-1.9 * R, 2.4 * R])} ${F2([-1.5 * R, 1.5 * R])} ${F2([-1.15 * R, .86 * R])}L${F2(A(R + 6, 146))}A${R + 6} ${R + 6} 0 0 1 ${F2(A(R + 6, 214))}Z`,
    fill: boneGrad(defs, 1, 0, 0, .3), 'fill-opacity': .8, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, SG);
  path(SG, `M${F2(A(R + 3, 148))}A${R + 3} ${R + 3} 0 0 1 ${F2(A(R + 3, 212))}`, { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .9 });
  const labS = mk('path', { d: ptsD([A(R + 1, 213), A(R + 15, 207), A(R + 16, 221)], true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.5 }, SG);
  const labI = mk('path', { d: ptsD([A(R + 1, 147), A(R + 15, 153), A(R + 16, 139)], true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.5 }, SG);
  Object.assign(j, { labS, labI });
  // the arch: clavicle (medial) and acromion (lateral), the acromioclavicular joint between them; the underside
  // of the acromion: 1 flat, 2 curved, 3 hooked; spur — an osteophyte under the AC joint
  const uY = xx => {
    if (xx < -.5 * R) return -1.6 * R;
    const k = (xx + .45 * R) / (1.7 * R);
    let yy = j.acType === 1 ? -1.6 * R + 4 * k : -1.6 * R + 18 * k * k;
    if (j.acType === 3) yy += 24 * Math.pow(smooth01((xx - .5 * R) / (.72 * R)), 1.4);
    if (j.spur) yy += 15 * Math.max(0, 1 - Math.abs(xx + .45 * R) / (.22 * R));
    return yy;
  };
  j.uY = uY;
  const roofX = []; for (let xx = -1.3 * R; xx <= 1.26 * R; xx += .04 * R) roofX.push(xx);
  const acro = mk('path', { fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, AG);
  const clav = mk('path', { fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, AG);
  path(AG, `M${f(-.66 * R)} ${f(-2.04 * R)}Q${f(-.48 * R)} ${f(-2.12 * R)} ${f(-.3 * R)} ${f(-2.0 * R)}`, { stroke: ANAT.tendon, 'stroke-width': 5, 'stroke-linecap': 'round' });
  j.drawArch = () => {
    const under = roofX.filter(xx => xx >= -.43 * R).map(xx => [xx, uY(xx)]);
    acro.setAttribute('d', ptsD([[-.43 * R, -2.04 * R], [.5 * R, -2.04 * R], [1.18 * R, -1.97 * R], [1.36 * R, -1.8 * R], [1.3 * R, uY(1.26 * R) - 2], ...under.reverse()], true));
    const cy = j.spur ? uY(-.47 * R) : -1.6 * R;
    clav.setAttribute('d', ptsD([[-4.1 * R, -2.12 * R], [-1.6 * R, -2.14 * R], [-.52 * R, -2.08 * R], [-.5 * R, cy], [-1.6 * R, -1.6 * R], [-4.1 * R, -1.58 * R]], true));
  };
  j.drawArch();
  // humerus: shaft and tubercles (rebuilt as the greater tubercle turns), the head as a shaded ball
  const humP = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, HG);
  j.headEl = mk('circle', { r: R - .5, fill: ballGrad(defs), 'fill-opacity': .92 }, HG);
  path(HG, `M${F2(A(R, 150))}A${R} ${R} 0 0 1 ${F2(A(R, 298))}`, { stroke: line, 'stroke-width': 2 });
  path(HG, `M${F2(A(R - 2, 153))}A${R - 2} ${R - 2} 0 0 1 ${F2(A(R - 2, 295))}`, { stroke: CART_C, 'stroke-width': 4.5, 'stroke-opacity': .9 });
  const humD = rg => `M${F2(A(R, 150))}A${R} ${R} 0 0 1 ${F2(A(R, 298))}L${F2(A(R - 3, 305))}Q${F2(A(rg + 3, 311))} ${F2(A(rg, 322))}Q${F2(A(rg + 2, 336))} ${F2(A(rg - 3, 348))}` +
    `C${F2(A(rg - 5, 8))} ${F2([.95 * R, .7 * R])} ${F2([.9 * R, 1.35 * R])}L${F2([.9 * R, 2.7 * R])}Q${F2([1.02 * R, 3.15 * R])} ${F2([.9 * R, 3.6 * R])}L${F2([.9 * R, 5.8 * R])}L${F2([-.07 * R, 5.8 * R])}L${F2([-.07 * R, 1.7 * R])}C${F2([-.1 * R, 1.1 * R])} ${F2([-.5 * R, .78 * R])} ${F2(A(R, 150))}Z`;
  // capsule, biceps, supraspinatus, bursa, deltoid
  const capS = capEl(capG, { w: 6 }), capI = capEl(capG, { w: 6 });
  const bicB = bic ? bandEl(musG, { col: ANAT.tendon, w: 7, tendon: true }) : null;
  const sspM = bandEl(musG, { col: ANAT.muscle, w: 26 }), sspT = bandEl(musG, { col: ANAT.tendon, w: 13, tendon: true });
  const bursa = mk('path', { fill: BURSA_C, 'fill-opacity': .6, stroke: mix(BURSA_C, '#000000', .3), 'stroke-width': 1.2 }, BG);
  const delB = delt ? bandEl(dG, { col: ANAT.muscle, w: 48, opacity: .9 }) : null;
  j.ssp = { act: v => { sspM.act(v); sspT.act(v); }, get strain() { return sspM.strain; } };
  Object.assign(j, { delt: delB, bic: bicB, capS, capI, sspM, sspT, bursa });
  const sspO = [-3.95 * R, -1.27 * R], sspJ = [-.78 * R, -1.12 * R];
  let restSsp = null;
  j.set = (o = {}) => {
    Object.assign(j.q, o);
    const q = j.q, sc = q.scap ?? (rhythm ? rhythmUp(q.elev) : 0);
    j.sc = sc;
    const toW = P => rotPt(P[0], P[1], -sc), H = toW([q.dx, q.dy]);
    const hum = P => { const v = rotPt(P[0], P[1], -q.elev); return [H[0] + v[0], H[1] + v[1]]; };
    j.hum = hum; j.scp = toW; j.H = H;
    [SG, AG, BG].forEach(e => e.setAttribute('transform', `rotate(${f(-sc)})`));
    HG.setAttribute('transform', `translate(${f(H[0])} ${f(H[1])}) rotate(${f(-q.elev)})`);
    const rg = clamp(R + 9 - 9 * q.er / 90, R + 3, R + 18);
    j.rg = rg;
    humP.setAttribute('d', humD(rg));
    // supraspinatus: belly in the fossa, the tendon over the head onto the greater tubercle (it rides up over the tubercle)
    const aI = 322 - q.elev, J = toW(sspJ), aJ = Math.atan2(J[1] - H[1], J[0] - H[0]) / rad(1), DJ = Math.hypot(J[0] - H[0], J[1] - H[1]);
    let w = wrapPts(J, H, R + 7, aI, 1, 26);
    if (!w.angs || angDiff(aI, aJ) < 0) {   // the insertion is short of the tangent point (or has turned past it): a gentle curve from J
      const d = angDiff(aI, aJ), pts = [J], angs = [null];
      for (let i = 1; i <= 24; i++) { const k = i / 24, a = aJ + d * k; angs.push(a); pts.push(polar(H, lerp(DJ, R + 7, smooth01(k * 1.4)), a)); }
      w = { pts, angs };
    }
    const ten = w.pts.map((P, i) => { if (i === 0) return P; const r0 = Math.hypot(P[0] - H[0], P[1] - H[1]); return polar(H, r0 + (rg - R) * smooth01(1 - Math.abs(angDiff(w.angs[i], aI)) / 26), w.angs[i]); });
    const belly = [toW(sspO), toW([-2.2 * R, -1.24 * R]), J], Ltot = polyLen(belly) + polyLen(ten);
    if (restSsp === null) restSsp = Ltot * 1.01;
    sspM.rest = sspT.rest = restSsp;
    // clearance under the arch, measured in the scapula's frame
    const toS = P => rotPt(P[0], P[1], sc), outer2 = offPts(ten.map(toS), -7.5);
    const gtTop = []; for (let a = -8; a <= 26; a += 4) gtTop.push(toS(polar(H, rg + 1, aI + a)));
    const obst = [outer2, gtTop];
    const topAt = xx => { let best = Infinity; obst.forEach(L => { for (let i = 1; i < L.length; i++) { const P = L[i - 1], Q = L[i]; if ((P[0] - xx) * (Q[0] - xx) <= 0 && P[0] !== Q[0]) best = Math.min(best, lerp(P[1], Q[1], (xx - P[0]) / (Q[0] - P[0]))); } }); return best; };
    let gap = 99; const top = [], bot = [];
    roofX.forEach(xx => {
      const tt = topAt(xx); if (tt === Infinity || xx < -.62 * R) return;
      const ry = uY(xx); gap = Math.min(gap, tt - ry);
      const yt = Math.max(ry + 1, tt - 9), yb = Math.max(yt + 1.6, tt - .5);
      top.push([xx, yt]); bot.push([xx, yb]);
    });
    j.gap = gap; j.comp = clamp((10 - gap) / 8, 0, 1);
    bursa.setAttribute('d', top.length > 1 ? ptsD(top.concat(bot.slice().reverse()), true) : '');
    bursa.setAttribute('fill', mix(BURSA_C, COL.bad, j.comp));
    sspT.hurt = j.comp;
    sspM.set(belly, Ltot); sspT.set(ten, Ltot);
    // capsule: the superior part wraps over the top, the inferior under the head (the axillary pouch)
    const cs = wrapPts(toW(A(R + 9, 218)), H, R + 3, 300 - q.elev, 1), ci = wrap2(toW(A(R + 9, 142)), hum([-.2 * R, 1.22 * R]), H, R + 3, -1);
    capS.set(cs.pts, cs.L, H); capI.set(ci.pts, ci.L, H);
    if (bicB) { const bw = wrapPts(toW(A(R + 10, 224)), H, R + 2, 336 - q.elev, 1); bicB.set(bw.pts.concat([hum([.42 * R, 1.3 * R]), hum([.4 * R, 3.3 * R])])); }
    if (delB) { const dw = wrap2(toW([1.27 * R, -1.62 * R]), hum([.78 * R, 3.3 * R]), H, rg + 20, 1); delB.set(dw.pts, dw.L); }
    Object.assign(j.pts, { H, GT: polar(H, rg, aI + 4), ssp: ten[Math.floor(ten.length * .55)], sspM: belly[1], bursa: top.length ? toW(top[top.length >> 1]) : H,
      acro: toW([.7 * R, uY(.7 * R) - 10]), ac: toW([-.47 * R, -1.85 * R]), clav: toW([-2.2 * R, -1.85 * R]), gl: toW(A(R + 22, 180)), capI: capI.mid, capS: capS.mid,
      delt: delB ? delB.mid() : H, bic: bicB ? bicB.mid(.75) : H, shaft: hum([.45 * R, 2.6 * R]), labS: toW(A(R + 12, 214)), labI: toW(A(R + 12, 146)) });
    return j;
  };
  j.at = k => { const S = st(g), P = Array.isArray(k) ? k : j.pts[k]; return [S.x + P[0] * S.s, S.y + P[1] * S.s]; };
  // rest lengths: the cuff at 30°, the deltoid at the side, the superior capsule taut at the side, the inferior at 90° of GH elevation
  j.set({ elev: 0, scap: 0 });
  sspM.rest = sspT.rest = null; restSsp = null; j.set({ elev: 30 });
  capS.rest = null; j.set({ elev: 0 }); capS.rest *= 1.06;
  capI.rest = null; j.set({ elev: 90 });
  j.set({ elev: 0, scap: null });
  if (t0 !== null) show(g, t0);
  return j;
}

// The right glenohumeral joint in a horizontal section, seen from above: anterior up, lateral to the right. The glenoid
// faces forward-out (the plane of the scapula), the coracoid in front. set({ rot, tx, ty }): rot — humeral rotation
// (+ external: the front of the head turns out); tx, ty — translation of the head (ty < 0 forward). Capsules capA / capP
// (anterior / posterior, K tightness), muscles sub (subscapularis) and isp (infraspinatus with teres minor).
// lesion({ bankart, hs }) shows a torn-off anterior labrum and a dent at the back of the head (Hill-Sachs).
function ghAxial(p, x, y, s = 1, t0 = .2, { fore = true } = {}) {
  const R = 60, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(ANAT.bone, '#000000', .5);
  const j = { g, R, q: { rot: 0, tx: 0, ty: 0 }, pts: {}, les: { bankart: 0, hs: 0 } };
  const root = mk('g', { mask: fadeMask(defs, -4.2 * R, 2.6 * R, -1.5 * R, .2 * R, [[0, '#000'], [.3, '#fff'], [1, '#fff']]) }, g);
  const foreG = mk('g', {}, root), SG = mk('g', {}, root), capG = mk('g', {}, root), HG = mk('g', {}, root), musG = mk('g', {}, root);
  Object.assign(j, { SG, HG });
  const P0 = [0, 0], A = (r, a) => polar(P0, r, a), F2 = P => f(P[0]) + ' ' + f(P[1]);
  // the forearm (below this level), pointing where the humerus is turned
  const foreEl = fore ? limbEl(foreG, defs, '#d8d1c1', 15, 12, mix('#d8d1c1', COL.board, .6)) : null;
  if (foreEl) foreEl.e.setAttribute('opacity', .55);
  // scapula: blade running back and in, glenoid facing forward-out; coracoid in front
  mk('path', { d: `M${F2(A(R + 6, 188))}L${F2([-1.55 * R, -.22 * R])}L${F2([-4.3 * R, 1.62 * R])}L${F2([-4.2 * R, 2.05 * R])}L${F2([-1.45 * R, .92 * R])}L${F2(A(R + 6, 112))}A${R + 6} ${R + 6} 0 0 1 ${F2(A(R + 6, 188))}Z`,
    fill: boneGrad(defs, 1, 0, 0, .5), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, SG);
  mk('path', { d: ptsD([[-1.62 * R, -.3 * R], [-1.5 * R, -1.1 * R], [-.62 * R, -1.8 * R], [-.44 * R, -1.56 * R], [-1.12 * R, -.98 * R], [-1.22 * R, -.36 * R]], true),
    fill: boneGrad(defs, 0, 0, 1, 1), 'fill-opacity': .75, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, SG);
  path(SG, `M${F2(A(R + 3, 114))}A${R + 3} ${R + 3} 0 0 1 ${F2(A(R + 3, 186))}`, { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .9 });
  const labA = mk('path', { fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.5 }, SG);
  const labP = mk('path', { d: ptsD([A(R + 1, 113), A(R + 15, 119), A(R + 16, 105)], true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.5 }, SG);
  const chip = mk('path', { fill: ANAT.bone, stroke: line, 'stroke-width': 1.5, opacity: 0 }, SG);
  // the head in section: articular surface facing back-in, lesser tubercle in front, the groove, greater tubercle out
  const rH = a => {
    const d = (a % 360 + 360) % 360;
    let r = R;
    r += 10 * Math.max(0, 1 - Math.abs(d - 252) / 12);                              // lesser tubercle
    r += 12 * Math.max(0, 1 - Math.abs(d - 308) / 30) * (d > 280 && d < 345 ? 1 : 0); // greater tubercle
    r -= 5 * Math.max(0, 1 - Math.abs(d - 273) / 7);                                 // bicipital groove
    r -= 14 * j.les.hs * Math.max(0, 1 - Math.abs(d - 40) / 16);                     // Hill-Sachs dent
    return r;
  };
  const headP = mk('path', { fill: ballGrad(defs), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, HG);
  path(HG, `M${F2(A(R - 2, 80))}A${R - 2} ${R - 2} 0 0 1 ${F2(A(R - 2, 222))}`, { stroke: CART_C, 'stroke-width': 4.5, 'stroke-opacity': .9 });
  const capA = capEl(capG, { w: 6 }), capP = capEl(capG, { w: 6 });
  const sub = bandEl(musG, { col: ANAT.muscle, w: 24 }), isp = bandEl(musG, { col: ANAT.muscle, w: 24 });
  Object.assign(j, { capA, capP, sub, isp, labA, labP, musG });
  j.lesion = (o = {}) => { Object.assign(j.les, o); return j.set(); };
  j.set = (o = {}) => {
    Object.assign(j.q, o);
    const q = j.q, H = [q.tx, q.ty], hum = P => { const v = rotPt(P[0], P[1], q.rot); return [H[0] + v[0], H[1] + v[1]]; };
    j.hum = hum; j.H = H;
    HG.setAttribute('transform', `translate(${f(H[0])} ${f(H[1])}) rotate(${f(q.rot)})`);
    const hp = []; for (let a = 0; a < 360; a += 4) hp.push(A(rH(a), a));
    headP.setAttribute('d', ptsD(hp, true));
    // the anterior labrum: in place, or torn off forward and in with a fleck of the rim (Bankart)
    const b = j.les.bankart, la = [A(R + 1, 187), A(R + 15, 181), A(R + 16, 195)].map(P => [P[0] - 20 * b, P[1] - 14 * b]);
    labA.setAttribute('d', ptsD(la, true));
    chip.setAttribute('opacity', b); chip.setAttribute('d', ptsD([A(R + 7, 183), A(R + 14, 190), A(R + 4, 194)].map(P => [P[0] - 18 * b, P[1] - 12 * b]), true));
    const ca = wrapPts([la[1][0], la[1][1]], H, R + 3, 228 + q.rot, 1), cp = wrapPts(A(R + 8, 110), H, R + 3, 74 + q.rot, -1);
    capA.set(ca.pts, ca.L, H); capP.set(cp.pts, cp.L, H);
    const sw = wrapPts([-3.6 * R, .98 * R], H, R + 14, 250 + q.rot, 1), iw = wrapPts([-3.45 * R, 2.08 * R], H, R + 14, 22 + q.rot, -1);
    sub.set(sw.pts, sw.L); isp.set(iw.pts, iw.L);
    if (foreEl) { const u = polar([0, 0], 1, 270 + q.rot); foreEl.set([H[0] + u[0] * 20, H[1] + u[1] * 20], [H[0] + u[0] * 3.1 * R, H[1] + u[1] * 3.1 * R]); }
    Object.assign(j.pts, { H, capA: capA.mid, capP: capP.mid, sub: sub.mid(.4), isp: isp.mid(.4), labA: la[0], labP: A(R + 14, 112), gl: A(R + 26, 150),
      cor: [-.55 * R, -1.68 * R], LT: hum(A(R + 10, 252)), GT: hum(A(R + 12, 308)), hs: hum(A(R - 8, 40)), fore: polar(H, 3.1 * R, 270 + q.rot) });
    return j;
  };
  j.at = k => { const S = st(g), P = Array.isArray(k) ? k : j.pts[k]; return [S.x + P[0] * S.s, S.y + P[1] * S.s]; };
  // rest: the anterior capsule tightens toward end-range external rotation, the posterior toward internal rotation
  j.set({ rot: 0 });
  capA.rest = null; j.set({ rot: 62 });
  capP.rest = null; j.set({ rot: -55 });
  sub.rest = isp.rest = null; j.set({ rot: 0 });
  if (t0 !== null) show(g, t0);
  return j;
}

// A flat muscle between an origin line O1–O2 and an insertion line I1–I2 (I1 = I2 for a fan): a translucent sheet
// with fibres and a tendinous edge at the insertion. Strain is the mean change of fibre length; stretched it glows
// yellow, active (act 0..1) it turns red, and shortened its sides bow out.
function sheetEl(parent, { col = ANAT.muscle, opacity = .78, nf = 7 } = {}) {
  const g = put(mk('g', {}, parent), { o: opacity }), f = v => v.toFixed(1);
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-linejoin': 'round', 'stroke-opacity': 0 }, g);
  const body = mk('path', { stroke: mix(col, '#000000', .45), 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g);
  const fib = path(g, '', { stroke: mix(col, '#ffffff', .42), 'stroke-width': 1.5, 'stroke-opacity': .8, 'stroke-linecap': 'round' });
  const ten = path(g, '', { stroke: ANAT.tendon, 'stroke-width': 5, 'stroke-linecap': 'round' });
  const m = { g, rest: null, strain: 0, level: 0, last: null, mid: [0, 0], op: opacity };
  const L2 = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
  m.act = v => { m.level = v; if (m.last) m.set(...m.last); };
  m.set = (O1, O2, I1, I2) => {
    m.last = [O1, O2, I1, I2];
    const ks = [.1, .5, .9], L = ks.reduce((a, k) => { const O = L2(O1, O2, k), I = L2(I1, I2, k); return a + Math.hypot(I[0] - O[0], I[1] - O[1]); }, 0) / 3;
    if (m.rest === null) m.rest = L;
    m.strain = L / m.rest - 1;
    const C = L2(L2(O1, O2, .5), L2(I1, I2, .5), .5), bow = clamp(-m.strain, 0, .35) * 60 + 6;
    const side = (A, B) => { const M = L2(A, B, .5), dx = M[0] - C[0], dy = M[1] - C[1], d = Math.hypot(dx, dy) || 1; return `Q${f(M[0] + dx / d * bow)} ${f(M[1] + dy / d * bow)} ${f(B[0])} ${f(B[1])}`; };
    const d = `M${f(O1[0])} ${f(O1[1])}${side(O1, I1)}L${f(I2[0])} ${f(I2[1])}${side(I2, O2)}Z`;
    body.setAttribute('d', d); glow.setAttribute('d', d);
    let fd = '';
    for (let i = 0; i < nf; i++) { const k = (i + .5) / nf, O = L2(O1, O2, k), I = L2(I1, I2, k), a = L2(O, I, .06), b2 = L2(O, I, .9); fd += `M${f(a[0])} ${f(a[1])}L${f(b2[0])} ${f(b2[1])}`; }
    fib.setAttribute('d', fd);
    const t1 = L2(I1, L2(O1, O2, .1), .08), t2 = L2(I2, L2(O1, O2, .9), .08);
    ten.setAttribute('d', `M${f(I1[0])} ${f(I1[1])}L${f(I2[0])} ${f(I2[1])}M${f(I1[0])} ${f(I1[1])}L${f(t1[0])} ${f(t1[1])}M${f(I2[0])} ${f(I2[1])}L${f(t2[0])} ${f(t2[1])}`);
    const s = clamp(m.strain / .08, 0, 1) * (1 - m.level), a = m.level, top = Math.max(s, a);
    body.setAttribute('fill', mix(mix(col, '#ffd2c4', s * .6), '#ff5a3c', a * .75));
    glow.setAttribute('stroke', a >= s ? '#ff5a3c' : ANAT.taut);
    glow.setAttribute('stroke-width', (top * 12).toFixed(1)); glow.setAttribute('stroke-opacity', (.5 * top).toFixed(2));
    m.mid = C;
    return m.strain;
  };
  return m;
}

// The back of the upper trunk with the right scapula and arm (seen from behind, so the right side is on the right).
// set({ up, elev, pro, tilt, wing, arm }): up — upward rotation of the scapula (degrees; the girdle also rises a little;
// with rhythm true it follows the arm); elev — elevation (+ up), pro — protraction (+ out), both in units; tilt / wing
// 0..1 — the inferior angle / the medial border stand off the ribs; arm — elevation of the arm in the frontal plane
// (degrees); armL — the left arm. Muscles (sheets in mus): utr / mtr / ltr — trapezius, lev — levator scapulae,
// rh — rhomboids, sa — serratus anterior, ssp / isp — supra- and infraspinatus, del — posterior deltoid.
// only(list, t0) shows just those muscles (fading the rest).
function scapBack(p, x, y, s = 1, t0 = .2, { col = '#d8d1c1', both = true, rhythm = true, mus = true } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(ANAT.bone, '#000000', .5), skinLn = mix(col, COL.board, .6);
  const b = { g, q: { up: 0, elev: 0, pro: 0, tilt: 0, wing: 0, arm: 0, armL: 0 }, pts: {}, mus: {} };
  const SX = -175;   // the spinous processes
  // the trunk from behind: neck, shoulders, sides
  const half = [[-130, -330], [-122, -232], [-60, -205], [80, -168], [150, -150], [196, -112], [212, -40], [216, 60], [206, 180], [200, 290]];
  const sil = half.concat(half.slice().reverse().map(([a, c]) => [2 * SX - a, c]));
  mk('path', { d: ptsD(sil, true), fill: shadeGradX(defs, col), stroke: skinLn, 'stroke-width': 2, 'stroke-linejoin': 'round', 'fill-opacity': .5 }, g);
  for (let i = 0; i < 9; i++) {   // ribs, faint
    const yy = -150 + i * 46;
    path(g, `M${SX} ${yy}Q${SX + 160} ${yy - 30} ${SX + 380} ${yy + 34}M${SX} ${yy}Q${SX - 160} ${yy - 30} ${SX - 380} ${yy + 34}`, { stroke: ANAT.bone, 'stroke-width': 3, 'stroke-opacity': .16 });
  }
  for (let yy = -300; yy <= 280; yy += 34) mk('ellipse', { cx: SX, cy: yy, rx: 9, ry: 12, fill: ANAT.bone, 'fill-opacity': .55, stroke: line, 'stroke-width': 1 }, g);
  const deep = mk('g', {}, g), bonesG = mk('g', {}, g), mid = mk('g', {}, g), sup = mk('g', {}, g);
  // scapula outline in its own frame (origin near the middle of the spine of the scapula)
  const SC = [[-82, -128], [-30, -118], [18, -108], [52, -100], [78, -92], [96, -80], [96, -64], [86, -52], [40, 40], [-6, 118], [-40, 158], [-62, 120], [-84, 30], [-92, -40], [-90, -90]];
  const SPINE = [[-92, -46], [-88, -34], [40, -84], [98, -110], [100, -124], [40, -98]];
  const ACR = [[88, -130], [146, -140], [152, -118], [100, -104]];
  const HH = [114, -74], PV = [60, -100];   // the humeral head; the pivot of upward rotation (between the spine and the AC joint)
  const scapEls = (par, op) => {
    const gg = mk('g', { opacity: op }, par);
    const shadow = mk('path', { d: ptsD(SC.slice(10).concat([SC[0]])), fill: 'none', stroke: '#000000', 'stroke-opacity': 0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gg);
    const ia = mk('ellipse', { cx: -36, cy: 164, rx: 34, ry: 13, fill: '#000000', opacity: 0 }, gg);
    mk('path', { d: ptsD(SC, true), fill: boneGrad(defs, 1, 0, 0, 1), 'fill-opacity': .92, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gg);
    mk('path', { d: ptsD(SPINE, true), fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gg);
    mk('path', { d: ptsD(ACR, true), fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, gg);
    const edge = mk('path', { d: ptsD(SC.slice(10).concat([SC[0]])), fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0, 'stroke-width': 3, 'stroke-linecap': 'round' }, gg);
    return { gg, shadow, ia, edge };
  };
  const armEls = (par, op) => {
    const gg = mk('g', { opacity: op }, par);
    const ua = limbEl(gg, defs, col, 30, 22, skinLn), fa = limbEl(gg, defs, col, 21, 15, skinLn), hd = limbEl(gg, defs, col, 15, 12, skinLn);
    const bone = limbEl(gg, defs, ANAT.bone, 13, 9, line), head = mk('circle', { r: 21, fill: ballGrad(defs), stroke: line, 'stroke-width': 2 }, gg);
    [ua, fa, hd].forEach(l => l.e.setAttribute('fill-opacity', .62));
    return { gg, ua, fa, hd, bone, head };
  };
  // the left side: the same scapula mirrored, following armL (a comparison)
  let L = null;
  if (both) { const lg = mk('g', { transform: `translate(${2 * SX} 0) scale(-1 1)` }, bonesG); L = { s: scapEls(lg, .5), a: armEls(lg, .5) }; }
  const Rs = scapEls(bonesG, 1), Ra = armEls(bonesG, 1);
  // muscles: origin line (on the trunk, fixed) and insertion line (on the scapula or the arm)
  const ORG = { utr: [[SX, -330], [SX, -206]], mtr: [[SX, -206], [SX, -122]], ltr: [[SX, -122], [SX, 110]], rh: [[SX, -214], [SX, -40]], lev: [[-162, -336], [-142, -262]], sa: [[202, 30], [210, 176]] };
  const INS = { utr: [[142, -136], [70, -114]], mtr: [[72, -108], [-30, -72]], ltr: [[-60, -56], [-92, -46]], rh: [[-90, -52], [-42, 152]], lev: [[-82, -127], [-91, -96]], sa: [[-84, 30], [-42, 154]] };
  if (mus) {
    b.mus.sa = sheetEl(deep, { opacity: .5 });
    b.mus.ssp = sheetEl(mid); b.mus.isp = sheetEl(mid); b.mus.rh = sheetEl(mid); b.mus.lev = sheetEl(mid, { nf: 4 });
    b.mus.del = sheetEl(sup, { opacity: .72 });
    b.mus.utr = sheetEl(sup, { opacity: .66 }); b.mus.mtr = sheetEl(sup, { opacity: .66 }); b.mus.ltr = sheetEl(sup, { opacity: .66 });
  }
  b.only = (list, t0 = null, dur = .6) => Object.entries(b.mus).forEach(([k, m]) => { const to = list.includes(k) ? m.op : 0; if (t0 === null) put(m.g, { o: to }); else tw(m.g, { o: to }, t0, dur); });
  const pose = (q, sk, ar) => {
    const up = q.up, sy = 1 - .1 * q.tilt, T = [q.pro, -q.elev - .8 * up];   // the girdle rises as the scapula turns up
    const loc = P => { const v = rotPt(P[0] - PV[0], P[1] * sy - PV[1], -up); return [T[0] + PV[0] + v[0], T[1] + PV[1] + v[1]]; };
    sk.gg.setAttribute('transform', `translate(${f(T[0] + PV[0])} ${f(T[1] + PV[1])}) rotate(${f(-up)}) translate(${f(-PV[0])} ${f(-PV[1])}) scale(1 ${f(sy)})`);
    sk.shadow.setAttribute('stroke-opacity', (.5 * q.wing).toFixed(2)); sk.shadow.setAttribute('stroke-width', (22 * q.wing).toFixed(1));
    sk.shadow.setAttribute('transform', `translate(${f(-7 * q.wing)} 3)`);
    sk.edge.setAttribute('stroke-opacity', (.6 * q.wing).toFixed(2));
    sk.ia.setAttribute('opacity', (.5 * q.tilt).toFixed(2));
    const Hh = loc(HH), u = polar([0, 0], 1, 90 - q.arm), E = [Hh[0] + u[0] * 150, Hh[1] + u[1] * 150], Wr = [E[0] + u[0] * 132, E[1] + u[1] * 132], X = [Wr[0] + u[0] * 40, Wr[1] + u[1] * 40];
    ar.bone.set(Hh, [Hh[0] + u[0] * 140, Hh[1] + u[1] * 140]); ar.head.setAttribute('cx', f(Hh[0])); ar.head.setAttribute('cy', f(Hh[1]));
    ar.ua.set([Hh[0] + u[0] * 8, Hh[1] + u[1] * 8], E); ar.fa.set(E, Wr); ar.hd.set(Wr, X);
    return { loc, Hh, E, Wr, u };
  };
  b.set = (o = {}) => {
    Object.assign(b.q, o);
    const q = b.q;
    if (rhythm && !('up' in o)) q.up = rhythmUp(q.arm);
    const r = pose(q, Rs, Ra);
    if (L) pose({ up: rhythmUp(q.armL), elev: 0, pro: 0, tilt: 0, wing: 0, arm: q.armL }, L.s, L.a);
    if (mus) {
      Object.keys(INS).forEach(k => { const [O1, O2] = ORG[k], [I1, I2] = INS[k].map(r.loc); if (k === 'sa') b.mus.sa.set(O1, O2, I1, I2); else b.mus[k].set(O1, O2, I1, I2); });
      const along = k => [r.Hh[0] + r.u[0] * k, r.Hh[1] + r.u[1] * k], n = [-r.u[1], r.u[0]];
      const tub = along(4), gt = [tub[0] + n[0] * 10, tub[1] + n[1] * 10];
      b.mus.ssp.set(r.loc([-84, -112]), r.loc([-30, -100]), gt, gt);
      b.mus.isp.set(r.loc([-80, -20]), r.loc([-30, 116]), along(14), along(14));
      const dt = along(80);
      b.mus.del.set(r.loc([30, -94]), r.loc([146, -136]), [dt[0] - n[0] * 10, dt[1] - n[1] * 10], [dt[0] + n[0] * 10, dt[1] + n[1] * 10]);
    }
    Object.assign(b.pts, { SA: r.loc([-82, -128]), IA: r.loc([-40, 158]), root: r.loc([-92, -40]), acro: r.loc([128, -128]), GL: r.loc([96, -72]), HH: r.Hh, E: r.E, W: r.Wr,
      med: r.loc([-80, 40]), spine: r.loc([20, -92]), lat: r.loc([30, 50]) });
    if (mus) Object.keys(b.mus).forEach(k => { b.pts[k] = b.mus[k].mid; });
    return b;
  };
  b.at = k => { const S = st(g), P = Array.isArray(k) ? k : b.pts[k]; return [S.x + P[0] * S.s, S.y + P[1] * S.s]; };
  b.set({});
  if (t0 !== null) show(g, t0);
  return b;
}
const shadeGradX = (defs, base) => { const id = 'sx' + (++SHADE_ID), gr = mk('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs); [[0, mix(base, '#000000', .3)], [.5, mix(base, '#ffffff', .15)], [1, mix(base, '#000000', .3)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr)); return `url(#${id})`; };

// A person seen from above (anterior up) with the right arm at the side and the elbow bent 90°: the forearm turns in
// the horizontal plane. set(rot): + external rotation (the hand moves out), − internal (toward the belly; stops at −62).
// pts: E (elbow), W (wrist), X (hand). towel — a rolled towel between the elbow and the side.
function topRot(p, x, y, s = 1, t0 = .2, { col = '#d8d1c1', towel = false } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), line = mix(col, COL.board, .62);
  const r = { g, rot: 0, pts: {} };
  mk('ellipse', { cx: 0, cy: 0, rx: 150, ry: 78, fill: ballGrad(defs, col), stroke: line, 'stroke-width': 2 }, g);
  mk('circle', { cx: -178, cy: -6, r: 26, fill: ballGrad(defs, col), stroke: line, 'stroke-width': 2 }, g);
  mk('circle', { cx: 0, cy: -4, r: 50, fill: ballGrad(defs, col), stroke: line, 'stroke-width': 2 }, g);
  mk('path', { d: 'M-12 -52L0 -72L12 -52Z', fill: col, stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  if (towel) mk('ellipse', { cx: 166, cy: 0, rx: 14, ry: 26, fill: '#c9b8e8', stroke: mix('#c9b8e8', '#000000', .35), 'stroke-width': 2 }, g);
  const E = [188, -8], fa = limbEl(g, defs, col, 17, 13, line), hd = limbEl(g, defs, col, 13, 11, line);
  mk('circle', { cx: E[0], cy: E[1], r: 27, fill: ballGrad(defs, col), stroke: line, 'stroke-width': 2 }, g);
  r.set = rot => {
    r.rot = Math.max(-62, rot);
    const u = polar([0, 0], 1, 270 + r.rot), W = [E[0] + u[0] * 160, E[1] + u[1] * 160], X = [W[0] + u[0] * 44, W[1] + u[1] * 44];
    fa.set(E, W); hd.set(W, X);
    Object.assign(r.pts, { E, W, X });
    return r;
  };
  r.at = k => { const S = st(g), P = Array.isArray(k) ? k : r.pts[k]; return [S.x + P[0] * S.s, S.y + P[1] * S.s]; };
  r.set(0);
  if (t0 !== null) show(g, t0);
  return r;
}

// A bone drawn along a polyline: dark rim, shaded body, a light ridge on the upper side (reads as a round shaft).
function boneLine(par, w, { col = ANAT.bone } = {}) {
  const cap = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const rim = path(par, '', { ...cap, stroke: mix(col, '#000000', .5), 'stroke-width': w + 4 });
  const body = path(par, '', { ...cap, stroke: col, 'stroke-width': w });
  const shade = path(par, '', { ...cap, stroke: mix(col, '#000000', .25), 'stroke-width': w * .38 });
  const hi = path(par, '', { ...cap, stroke: mix(col, '#ffffff', .6), 'stroke-width': w * .2, 'stroke-opacity': .8 });
  return { set(P) { rim.setAttribute('d', ptsD(P)); body.setAttribute('d', ptsD(P)); shade.setAttribute('d', ptsD(offPts(P, w * .22))); hi.setAttribute('d', ptsD(offPts(P, -w * .24))); } };
}
// The shoulder girdle from the front: sternum (left), first rib and chest wall, the clavicle from the sternoclavicular
// joint to the acromioclavicular joint, the scapula behind the ribs (acromion, coracoid, glenoid), the humerus.
// set({ elev }) — elevation of the arm; the scapula turns up with the rhythm about the AC joint and the clavicle rises
// about the SC joint (up to about 30°). Ligaments: ccl (coracoclavicular: conoid and trapezoid), cost (costoclavicular),
// acl (acromioclavicular), scl (sternoclavicular). pts: SC, AC, CC, cor, GL, H, sub (subacromial), st (scapula on ribs).
function girdleAnt(p, x, y, s = 1, t0 = .2, { col = '#d8d1c1', arm = true } = {}) {
  const g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(ANAT.bone, '#000000', .5);
  const a = { g, q: { elev: 0 }, pts: {}, lig: {} };
  // chest wall: ribs, sternum
  const ribs = mk('g', {}, g);
  for (let i = 0; i < 7; i++) { const yy = 60 + i * 52; path(ribs, `M40 ${yy}Q${200 + i * 6} ${yy - 40} ${300 - i * 4} ${yy + 70}`, { stroke: ANAT.bone, 'stroke-width': 9, 'stroke-opacity': .22 }); }
  path(ribs, 'M44 -2Q190 -18 236 40', { stroke: ANAT.bone, 'stroke-width': 12, 'stroke-opacity': .45 });   // first rib
  mk('path', { d: 'M-40 -24Q0 -10 40 -24L44 88L30 100L30 420L-30 420L-30 100L-44 88Z', fill: boneGrad(defs, 0, 0, 1, 0), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
  const scapG = mk('g', {}, g), clavG = mk('g', {}, g), humG = mk('g', {}, g), ligG = mk('g', {}, g);
  // scapula in its own frame: the AC joint at the origin
  const SCAP = [[-150, 44], [-20, 52], [24, 66], [48, 92], [52, 120], [34, 160], [-90, 330], [-128, 340], [-160, 60]];
  mk('path', { d: ptsD(SCAP, true), fill: ANAT.bone, 'fill-opacity': .32, stroke: line, 'stroke-opacity': .6, 'stroke-width': 2, 'stroke-linejoin': 'round' }, scapG);
  mk('path', { d: ptsD([[0, -14], [74, -18], [86, 2], [70, 20], [0, 16]], true), fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, scapG);   // acromion
  mk('path', { d: 'M8 66C-6 40 -28 34 -52 40C-60 44 -58 54 -48 54C-30 52 -16 58 -6 76Z', fill: boneGrad(defs, 0, 0, 0, 1), stroke: line, 'stroke-width': 2, 'stroke-linejoin': 'round' }, scapG);   // coracoid
  mk('path', { d: `M50 82Q62 112 48 142`, fill: 'none', stroke: CART_C, 'stroke-width': 6 }, scapG);   // glenoid
  const clav = boneLine(clavG, 26);
  const disc = mk('ellipse', { rx: 7, ry: 15, fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.5 }, g);
  const hum = boneLine(humG, 48), head = mk('circle', { r: 44, fill: ballGrad(defs), stroke: line, 'stroke-width': 2 }, humG);
  if (!arm) humG.setAttribute('opacity', 0);
  const SC = [44, -16], CL = 300, base = 8;   // clavicle length, its rise at rest (degrees above horizontal)
  a.set = (o = {}) => {
    Object.assign(a.q, o);
    const e = a.q.elev, up = rhythmUp(e), cl = clamp(up * .5, 0, 30) + base;
    const dir = polar([0, 0], 1, -cl), AC = [SC[0] + dir[0] * CL, SC[1] + dir[1] * CL];
    const sp = P => { const v = rotPt(P[0], P[1], -up); return [AC[0] + v[0], AC[1] + v[1]]; };
    scapG.setAttribute('transform', `translate(${f(AC[0])} ${f(AC[1])}) rotate(${f(-up)})`);
    // the clavicle: a gentle S (medial part bowed forward reads as a bend down here)
    const nrm = [-dir[1], dir[0]], cp = k => { const b = 14 * Math.sin(Math.PI * k * 2) * (k < .5 ? 1 : .6); return [SC[0] + dir[0] * CL * k + nrm[0] * b, SC[1] + dir[1] * CL * k + nrm[1] * b]; };
    const cps = []; for (let i = 0; i <= 12; i++) cps.push(cp(i / 12)); cps[0] = [SC[0] + 6, SC[1]];
    clav.set(cps);
    disc.setAttribute('cx', f(SC[0] + 2)); disc.setAttribute('cy', f(SC[1] + 2));
    const H = sp([88, 112]), u = polar([0, 0], 1, 90 - e), E = [H[0] + u[0] * 360, H[1] + u[1] * 360];
    hum.set([H, E]); head.setAttribute('cx', f(H[0])); head.setAttribute('cy', f(H[1]));
    const onClav = k => cp(k), cor = sp([-50, 46]);
    const L = (k, A, B) => { if (!a.lig[k]) a.lig[k] = ligEl(ligG, { rest: Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.004, w: 6 }); a.lig[k].set(A, B); };
    L('conoid', sp([-30, 44]), onClav(.8)); L('trap', sp([-8, 56]), onClav(.88)); L('cost', [70, 32], onClav(.08));
    L('acl', onClav(.96), sp([10, -12])); L('scl', [10, -30], onClav(.03));
    Object.assign(a.pts, { SC, AC, CC: onClav(.84), cor, GL: sp([52, 112]), H, sub: sp([60, 40]), st: sp([-90, 180]), clav: onClav(.5), E, rib1: [180, -8], ster: [0, 160] });
    return a;
  };
  a.at = k => { const S = st(g), P = Array.isArray(k) ? k : a.pts[k]; return [S.x + P[0] * S.s, S.y + P[1] * S.s]; };
  a.set({});
  if (t0 !== null) show(g, t0);
  return a;
}

/* ---------- chapter 18: the elbow and forearm (elbowSag, elbowAnt, armSide, foreEnd) ---------- */
const IMPL_C = '#a9bccb', POLY_C = '#eef2f4', HO_C = '#e4cf98';
// Smooth closed (or open) path through the points (Catmull-Rom as cubic Béziers).
function smoothD(P, closed = true, k = 1) {
  const n = P.length, f = v => v.toFixed(1), at = i => P[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) * k / 6)} ${f(p1[1] + (p2[1] - p0[1]) * k / 6)} ${f(p2[0] - (p3[0] - p1[0]) * k / 6)} ${f(p2[1] - (p3[1] - p1[1]) * k / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
// Points of a circular arc about C from angle a0 to a1 (degrees, SVG sense), every step degrees.
const arcPts = (C, r, a0, a1, step = 8) => { const n = Math.max(1, Math.round(Math.abs(a1 - a0) / step)), P = []; for (let i = 0; i <= n; i++) P.push(polar(C, r, lerp(a0, a1, i / n))); return P; };
// Points evenly spaced along a polyline: n + 1 points with unit tangents.
function resample(P, n) {
  const segs = [];
  let tot = 0;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); tot += l; }
  const out = [];
  for (let i = 0, k = 0, acc = 0; i <= n; i++) {
    const want = tot * i / n;
    while (k < segs.length - 1 && acc + segs[k] < want) { acc += segs[k]; k++; }
    const q = clamp((want - acc) / (segs[k] || 1), 0, 1), A = P[k], B = P[k + 1] || P[k], l = segs[k] || 1;
    out.push({ p: [lerp(A[0], B[0], q), lerp(A[1], B[1], q)], t: [(B[0] - A[0]) / l, (B[1] - A[1]) / l] });
  }
  return { pts: out, L: tot };
}
// A muscle as a shaded spindle along a polyline, with a tendon at each end (ta, tb — fractions of the length).
// The belly keeps its volume: thinner and paler with a yellow glow when stretched past rest, thicker when short,
// red when active (act 0..1); hurt 0..1 tints it with the alarm colour. set(P, L) — L overrides the length (wraps).
function bellyEl(parent, { col = ANAT.muscle, w = 30, rest = null, ta = .1, tb = .16, tw = 5, opacity = 1 } = {}) {
  const g = mk('g', { opacity }, parent), f = v => v.toFixed(1);
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-linejoin': 'round', 'stroke-opacity': 0 }, g);
  const ten = path(g, '', { fill: 'none', stroke: ANAT.tendon, 'stroke-width': tw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const body = mk('path', { stroke: mix(col, '#000000', .5), 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g);
  const shade = mk('path', { fill: mix(col, '#000000', .28), 'fill-opacity': .55 }, g);
  const fib = path(g, '', { fill: 'none', stroke: mix(col, '#ffffff', .45), 'stroke-width': 1.3, 'stroke-opacity': .65, 'stroke-linecap': 'round' });
  const b = { g, rest, strain: 0, level: 0, hurt: 0, last: null, pts: [], col, k: 1, L: rest };
  const anat = anatEnabled();   // the live anatomy colours it by mode and level (anatBellyDisplay); the glow then marks only pain
  b.act = v => { b.level = v; if (b.last) b.set(...b.last); };
  b.set = (P, L = null) => {
    b.last = [P, L];
    const r = resample(P, 30), len = L ?? r.L;
    if (b.rest === null) b.rest = len;
    b.strain = len / b.rest - 1; b.L = len;
    const wk = anat ? w * b.k : w * clamp(Math.sqrt(b.rest / len), .72, 1.35), n = 30, i0 = Math.round(ta * n), i1 = Math.round((1 - tb) * n);
    const sideL = [], sideR = [], mid = [], lit = [];
    for (let i = i0; i <= i1; i++) {
      const u = (i - i0) / Math.max(1, i1 - i0), hw = wk / 2 * (.16 + .84 * Math.pow(Math.sin(Math.PI * u), .7)), { p: Q, t } = r.pts[i], nx = -t[1], ny = t[0];
      sideL.push([Q[0] + nx * hw, Q[1] + ny * hw]); sideR.push([Q[0] - nx * hw, Q[1] - ny * hw]); mid.push(Q);
      const sg = nx * LIGHT[0] + ny * LIGHT[1] > 0 ? -1 : 1;   // the shadow side
      lit.push([Q[0] + sg * nx * hw * .25, Q[1] + sg * ny * hw * .25]);
    }
    const ring = sideL.concat(sideR.slice().reverse()), d = smoothD(ring);
    body.setAttribute('d', d); glow.setAttribute('d', d);
    // shadow half: from the mid line to the shadow edge
    const shSide = [], sgn = (() => { const { t } = r.pts[(i0 + i1) >> 1]; return -t[1] * LIGHT[0] + t[0] * LIGHT[1] > 0 ? sideR : sideL; })();
    shade.setAttribute('d', smoothD(lit.concat(sgn.slice().reverse())));
    const fibLine = k => smoothD(mid.slice(1, -1).map((Q, i) => { const S = k >= 0 ? sideL[i + 1] : sideR[i + 1], a = Math.abs(k); return [lerp(Q[0], S[0], a), lerp(Q[1], S[1], a)]; }), false);
    fib.setAttribute('d', [-.5, 0, .5].map(fibLine).join(''));
    const tp = r.pts.map(o => o.p);
    ten.setAttribute('d', ptsD(tp.slice(0, i0 + 2)) + ptsD(tp.slice(i1 - 1)));
    b.pts = tp;
    if (anat) { b.paint && b.paint(); return b.strain; }
    const sv = clamp(b.strain / .08, 0, 1) * (1 - b.level), a = b.level, top = Math.max(sv, a, b.hurt);
    body.setAttribute('fill', mix(mix(mix(col, '#ffd2c4', sv * .6), '#ff5a3c', a * .75), COL.bad, b.hurt * .85));
    ten.setAttribute('stroke', mix(ANAT.tendon, ANAT.taut, sv));
    glow.setAttribute('stroke', b.hurt >= top && b.hurt > 0 ? COL.bad : a >= sv ? '#ff5a3c' : ANAT.taut);
    glow.setAttribute('stroke-width', f(top * 16)); glow.setAttribute('stroke-opacity', f(.5 * top));
    return b.strain;
  };
  b.mid = (k = .5) => b.pts[Math.floor((b.pts.length - 1) * k)] || [0, 0];
  if (anat) ANAT_REG.add(anatBellyDisplay(b, { body, shade, fib, glow, ten }));
  return b;
}
// A ligament between two points: a straight band at its rest length that brightens and glows only when stretched
// (L ≥ rest), wavy when slack. set(A, B) returns the tension 0..1.
function ligBand(parent, { rest, w = 6, iso = false } = {}) {
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-opacity': .4, 'stroke-linecap': 'round' }, parent);
  const e = mk('path', { fill: 'none', 'stroke-linecap': 'round' }, parent);
  const l = { rest, tension: 0, mid: [0, 0], L: null, el: () => e };   // L: the current length (the sandbox reads its stretch)
  l.set = (A, B) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, f = v => v.toFixed(1);
    const slack = iso ? 0 : Math.max(0, l.rest * .97 - L), amp = Math.min(10, Math.sqrt(slack * L) * .45);
    let d = `M${f(A[0])} ${f(A[1])}`;
    for (let i = 1; i <= 20; i++) { const q = i / 20, wv = amp * Math.sin(q * Math.PI * 3) * Math.sin(q * Math.PI); d += `L${f(A[0] + dx * q + nx * wv)} ${f(A[1] + dy * q + ny * wv)}`; }
    e.setAttribute('d', d); glow.setAttribute('d', d);
    l.L = L;
    l.tension = iso ? 0 : clamp((L / l.rest - .985) / .03, 0, 1);
    e.setAttribute('stroke', mix(mix(ANAT.tendon, COL.board, .25), ANAT.taut, l.tension));
    e.setAttribute('stroke-width', f(w * (.85 + .4 * l.tension)));
    glow.setAttribute('stroke-width', f(w * 3.2 * l.tension));
    l.mid = [A[0] + dx / 2, A[1] + dy / 2];
    return l.tension;
  };
  return l;
}
// A shaded bone shape (smooth outline through P).
const boneSh = (par, defs, P, { ax = [0, 0, 1, 0], op = 1, col = ANAT.bone } = {}) =>
  mk('path', { d: smoothD(P), fill: boneGrad(defs, ...ax, col), 'fill-opacity': op, stroke: mix(col, '#000000', .5), 'stroke-width': 2, 'stroke-linejoin': 'round' }, par);
// A metal implant part (polygon, crisp corners) with a light sheen.
const implSh = (par, defs, P, col = IMPL_C) => mk('path', { d: ptsD(P, true), fill: boneGrad(defs, 0, 0, 1, 0, col), stroke: mix(col, '#000000', .55), 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, par);
// The right elbow from the side. view 'lat' — from the lateral side (the capitulum and the radial head in front of the
// ulna); 'med' — from the medial side (the trochlea and the medial epicondyle, the ulna in front). Anterior is to the
// right in both; the humerus comes down from above and the joint axis is at (x, y); R = 40 local units.
// set({ flex }) — elbow flexion in degrees (0 straight down, 90 forward). Muscles (bellyEl: act / strain): bic, brach,
// tri, br (brachioradialis, lat), anc (anconeus, lat), pt (pronator teres, med), ext / flx (wrist extensors / flexors,
// with wrist: true). Capsule capA / capP (K < 1 — contracted). Ligaments (ligBand): lat — lcl (and the annular
// band); med — mclA (taut in extension), mclP (taut in flexion) and the transverse band. nerve: true (med) — the ulnar
// nerve behind the epicondyle, stretched by flexion (nvStrain). Groups: HG / FGb / FGf — humerus and forearm layers;
// rhG (radial head), frags (head fragments in fracG), impH / impF + implant('tea' | 'rh', t), hoG + setHO(k).
// hum(P) / fore(P) map points in R units of the humerus / forearm to the model frame; at(k) — a stage point.
function elbowSag(p, x, y, s = 1, t0 = .2, { view = 'lat', muscles = true, wrist = false, ligs = true, nerve = false, skin = true } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), lat = view === 'lat';
  const U = P => P.map(([a, b]) => [a * R, b * R]), V = (a, b) => [a * R, b * R], A2 = P => P.map(([a, b]) => [a / R, b / R]);
  const j = { g, R, view, q: { flex: 20 }, pts: {}, hoK: 0, onSet: [] };
  const topMask = fadeMask(defs, 0, -7.6 * R, 0, -6.2 * R, [[0, '#000'], [1, '#fff']]);
  const skinU = mk('g', { mask: topMask, opacity: .62 }, g), skinF = mk('g', { opacity: .62 }, g);
  const backG = mk('g', {}, g), FGb = mk('g', {}, g), HG = mk('g', { mask: topMask }, g), FGf = mk('g', {}, g);
  const capG = mk('g', {}, g), ligG = mk('g', {}, g), musG = mk('g', { mask: topMask }, g), wrG = mk('g', {}, g), nvG = mk('g', {}, g);
  const impH = mk('g', { opacity: 0 }, HG), impF = mk('g', { opacity: 0 }, FGf), hoG = mk('g', {}, g);
  Object.assign(j, { HG, FGb, FGf, impH, impF, hoG, capG, ligG, musG, wrG });
  const foreAt = (P, fl) => rotPt(P[0] * R, P[1] * R, -fl), fore = P => foreAt(P, j.q.flex), hum = P => [P[0] * R, P[1] * R];
  j.fore = fore; j.hum = hum;
  if (skin) {   // skin: upper arm, forearm and a loose fist
    const sc = '#4b5f57', sl = '#6f857b';
    limbEl(skinU, defs, sc, 1.85 * R, 1.6 * R, sl).set(V(-.35, -8), V(-.3, -.2));
    j.skinFG = G(skinF, {});
    limbEl(j.skinFG, defs, sc, 1.55 * R, 1.0 * R, sl).set(V(-.2, .1), V(.15, 7.5));
    limbEl(j.skinFG, defs, sc, .95 * R, .82 * R, sl).set(V(.2, 7.7), V(.32, 9.6));
  }
  // humerus: shaft and the lateral column with the capitulum (lat) or the medial epicondyle with the trochlea (med)
  const HUM = lat
    ? [[.22, -8], [.3, -4.2], [.42, -2.5], [.66, -1.55], [.7, -.95], ...A2(arcPts([0, 0], R, -48, 150, 14)), [-1.22, -.15], [-1.36, -.8], [-1.12, -1.7], [-.98, -3], [-.92, -8]]
    : [[.22, -8], [.3, -4.2], [.42, -2.5], [.68, -1.5], [.74, -.95], ...A2(arcPts([0, 0], 1.05 * R, -46, 120, 14)), [-.95, .45], [-1.4, .05], [-1.8, -.5], [-1.64, -1.05], [-1.15, -1.9], [-.98, -3], [-.92, -8]];
  if (lat) mk('circle', { r: 1.05 * R, cx: .04 * R, cy: .06 * R, fill: mix(ANAT.bone, COL.board, .45), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.5 }, backG);   // the trochlea behind
  j.humEl = boneSh(HG, defs, U(HUM), { op: lat ? .86 : 1 });
  j.ball = mk('circle', { r: (lat ? .98 : 1.03) * R, fill: ballGrad(defs), 'fill-opacity': .95 }, HG);
  path(HG, smoothD(arcPts([0, 0], (lat ? .97 : 1.02) * R, -44, lat ? 150 : 160, 10), false), { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .9 });
  if (!lat) path(HG, `M${f(-.2 * R)} ${f(-.95 * R)}Q${f(.25 * R)} 0 ${f(-.1 * R)} ${f(.98 * R)}`, { stroke: mix(ANAT.bone, '#000000', .35), 'stroke-width': 2, 'stroke-opacity': .6 });
  // forearm bones (forearm frame, hanging down): the ulna with the trochlear notch, the radius (head and shaft)
  const ULNA = [...A2(arcPts([0, 0], 1.09 * R, 26, 228, 8)), [-.98, -1.0], [-1.42, -.62], [-1.55, .3], [-1.2, 1.7], [-.72, 3.1], [-.58, 5.6], [-.56, 7.05], [-.62, 7.55], [-.35, 7.62], [-.1, 7.45], [-.06, 6.6], [-.02, 3.4], [.12, 2.3], [.42, 1.55], [.85, 1.0], [1.12, .68]];
  const RHEAD = [...A2(arcPts([0, 0], 1.04 * R, 64, 114, 10)), [-.47, 1.2], [-.42, 1.52], [-.2, 1.7], [-.18, 1.95], [.28, 1.95], [.26, 1.7], [.52, 1.5], [.56, 1.18]];
  const RSHAFT = [[-.2, 1.8], [-.18, 2.4], [-.06, 4.4], [.08, 6.6], [.02, 7.45], [.4, 7.62], [.82, 7.78], [1.06, 7.35], [.95, 6.5], [.68, 4.4], [.38, 2.6], [.44, 2.25], [.28, 1.85]];
  const ulnaPar = lat ? FGb : FGf, radPar = lat ? FGf : FGb, RCOL = mix(ANAT.bone, '#f6d9a8', .25);
  j.ulna = boneSh(ulnaPar, defs, U(ULNA));
  path(ulnaPar, smoothD(arcPts([0, 0], 1.11 * R, 30, 222, 8), false), { stroke: CART_C, 'stroke-width': 4.5, 'stroke-opacity': .85 });
  const radG = mk('g', { opacity: lat ? 1 : .5 }, radPar);
  j.rShaft = boneSh(radG, defs, U(RSHAFT), { col: RCOL });
  const rhG = mk('g', {}, radG);
  boneSh(rhG, defs, U(RHEAD), { col: RCOL });
  path(rhG, smoothD(arcPts([0, 0], 1.06 * R, 66, 112, 8), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .9 });
  Object.assign(j, { rhG, radG });
  FGf.appendChild(impF); HG.appendChild(impH);   // implants above the bones
  // fragments of a comminuted head fracture (hidden): the lesson moves j.frags
  const fracG = mk('g', { opacity: 0 }, radG);
  j.frags = [[[-.46, .97], [-.1, 1.02], [-.16, 1.5], [-.44, 1.5]], [[-.1, 1.02], [.22, 1.0], [.18, 1.55], [-.16, 1.5]], [[.22, 1.0], [.5, .95], [.55, 1.2], [.5, 1.5], [.18, 1.55]]]
    .map(P => { const e = G(fracG, {}); mk('path', { d: ptsD(U(P), true), fill: boneGrad(defs, 0, 0, 1, 0, RCOL), stroke: mix(RCOL, '#000000', .5), 'stroke-width': 2, 'stroke-linejoin': 'round' }, e); return e; });
  j.fracG = fracG;
  if (lat) j.ann = path(FGf, `M${f(-.6 * R)} ${f(1.3 * R)}Q${f(0)} ${f(1.52 * R)} ${f(.62 * R)} ${f(1.3 * R)}`, { stroke: ANAT.tendon, 'stroke-width': .17 * R, 'stroke-opacity': .85, 'stroke-linecap': 'round' });
  // implants: a linked total elbow (humeral stem, flange and yoke; ulnar stem with a bushing on the axle) or a radial head
  const tea = mk('g', { opacity: 0 }, impH), teaF = mk('g', { opacity: 0 }, impF), rhImp = mk('g', { opacity: 0 }, impF);
  mk('path', { d: ptsD(U([[-.7, -6.3], [-.2, -6.3], [-.18, -1.3], [-.72, -1.3]]), true), fill: '#efe9d6', 'fill-opacity': .5 }, tea);   // cement
  implSh(tea, defs, U([[-.56, -6.1], [-.34, -6.1], [-.32, -1.4], [-.6, -1.4]]));
  implSh(tea, defs, U([[.1, -3.3], [.26, -3.3], [.5, -1.2], [.34, -1.15]]));   // anterior flange
  implSh(tea, defs, U([[-.68, -1.45], [-.18, -1.45], [.45, -.35], [.5, .25], [-.5, .25], [-.62, -.3]]));
  mk('path', { d: ptsD(U([[-.58, .45], [-.06, .45], [-.1, 4.9], [-.52, 4.9]]), true), fill: '#efe9d6', 'fill-opacity': .5 }, teaF);
  implSh(teaF, defs, U([[-.44, .5], [-.2, .5], [-.24, 4.7], [-.38, 4.7]]));
  mk('circle', { r: .56 * R, fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 2 }, teaF);
  mk('circle', { r: .24 * R, fill: boneGrad(defs, 0, 0, 1, 1, '#8d9aa3'), stroke: '#4d585f', 'stroke-width': 1.5 }, teaF);
  implSh(rhImp, defs, U([[.0, 1.5], [.18, 1.5], [.15, 3.4], [.04, 3.4]]));
  implSh(rhImp, defs, U([...A2(arcPts([0, 0], 1.04 * R, 64, 114, 10)), [-.44, 1.5], [.52, 1.5]]));
  j.implant = (kind, t, dur = .6) => {
    if (kind === 'tea') [impH, impF, tea, teaF].forEach(e => show(e, t, dur));
    if (kind === 'rh') { show(impF, t, dur); show(rhImp, t, dur); hide(rhG, t, dur); }
  };
  // heterotopic bone in front of the joint (in the brachialis): setHO(k), 0..1 — inflamed cloud, speckles, solid bone;
  // with the solid mass the coronoid hits it at about 95° of flexion (hoStop)
  const hoC = [1.28 * R, -.85 * R], hoP = [[-.62, -.05], [-.35, -.62], [.05, -.75], [.5, -.5], [.68, -.05], [.5, .45], [.1, .7], [-.25, .55], [-.55, .35]].map(([a, b]) => [hoC[0] + a * R, hoC[1] + b * R]);
  const hoCloud = mk('ellipse', { cx: hoC[0], cy: hoC[1], rx: 1.0 * R, ry: .85 * R, fill: COL.bad, opacity: 0 }, hoG);
  const hoDots = mk('g', { opacity: 0 }, hoG);
  for (let i = 0; i < 22; i++) { const a = i * 137.5, r0 = .6 * R * Math.sqrt((i + .5) / 22); mk('circle', { cx: hoC[0] + r0 * Math.cos(rad(a)), cy: hoC[1] + r0 * Math.sin(rad(a)) * .9, r: 2.5 + (i % 3) * 1.2, fill: HO_C, stroke: mix(HO_C, '#000000', .4), 'stroke-width': 1 }, hoDots); }
  const hoMass = mk('path', { d: smoothD(hoP), fill: boneGrad(defs, 0, 0, 1, 1, HO_C), stroke: mix(HO_C, '#000000', .5), 'stroke-width': 2, opacity: 0 }, hoG);
  j.setHO = k => {
    j.hoK = k;
    hoCloud.setAttribute('opacity', f(.38 * clamp(k / .3, 0, 1) * (1 - .7 * clamp((k - .55) / .35, 0, 1))));
    hoDots.setAttribute('opacity', f(clamp((k - .3) / .25, 0, 1) * (1 - clamp((k - .75) / .2, 0, 1))));
    hoMass.setAttribute('opacity', f(clamp((k - .6) / .3, 0, 1)));
  };
  j.hoStop = 95;
  // capsule: anterior (taut near extension) and posterior (taut near full flexion), wrapped round the joint
  const capA = capEl(capG, { w: 5.5, maxSag: 14 }), capP = capEl(capG, { w: 5.5, maxSag: 14 }), CA = [V(.6, -1.65), [.55, 1.55]], CP = [V(-1.0, -1.8), [-1.35, -.4]];
  Object.assign(j, { capA, capP });
  // ligaments: [humerus point, forearm point, flexion at which the rest length is taken]
  const LG = lat ? { lcl: [[-.2, -.15], [.05, 1.3], 90] } : { mclA: [[-.2, -.25], [.82, .92], 0], mclP: [[-.45, -.35], [-1.05, .15], 140] }, L = {};
  const lenAt = (A, B, fl) => { const Bf = foreAt(B, fl); return Math.hypot(Bf[0] - A[0] * R, Bf[1] - A[1] * R); };
  if (ligs) for (const k in LG) { const [A, B, fl] = LG[k]; L[k] = ligBand(ligG, { rest: lenAt(A, B, fl), w: 6, iso: lat }); }
  if (ligs && !lat) j.mclT = path(FGf, `M${f(.75 * R)} ${f(1.05 * R)}Q${f(-.1 * R)} ${f(1.15 * R)} ${f(-1.0 * R)} ${f(.82 * R)}`, { stroke: ANAT.tendon, 'stroke-width': 5, 'stroke-opacity': .8 });
  Object.assign(j, L);
  // muscles, deep to superficial
  const M = {};
  if (muscles) {
    M.brach = bellyEl(musG, { col: ANAT.muscleDeep, w: 1.05 * R, ta: .04, tb: .18 });
    if (!lat) M.pt = bellyEl(musG, { w: .6 * R, ta: .08, tb: .25 });
    M.tri = bellyEl(musG, { w: 1.25 * R, ta: .03, tb: .22, tw: 8 });
    if (lat) M.anc = bellyEl(musG, { w: .5 * R, ta: .12, tb: .12 });
    M.bic = bellyEl(musG, { w: 1.2 * R, ta: .03, tb: .34, tw: 6 });
    if (lat) M.br = bellyEl(musG, { w: .78 * R, ta: .06, tb: .36 });
  }
  if (wrist) { if (lat) M.ext = bellyEl(wrG, { w: .78 * R, ta: .06, tb: .38 }); else M.flx = bellyEl(wrG, { w: .82 * R, ta: .06, tb: .38 }); }
  Object.assign(j, M);
  if (nerve && !lat) { j.nv = nerveLine(nvG, [[0, 0], [1, 1]], null, { w: 8, n: 12 }); put(j.nv.g, { o: 1 }); }
  let nvRest = null;
  j.set = (o = {}) => {
    Object.assign(j.q, o);
    const fl = j.q.flex, tr = `rotate(${f(-fl)})`, C = [0, 0];
    [FGb, FGf].forEach(e => e.setAttribute('transform', tr));
    if (j.skinFG) j.skinFG.setAttribute('transform', tr);
    const ca = wrap2(CA[0], fore(CA[1]), C, 1.22 * R, 1), cp = wrap2(CP[0], fore(CP[1]), C, 1.25 * R, -1);
    capA.set(ca.pts, ca.L, C); capP.set(cp.pts, cp.L, C);
    for (const k in L) { const [A, B] = LG[k]; L[k].set(hum(A), fore(B)); }
    if (M.brach) {
      M.brach.set([hum([.3, -4.8]), hum([.55, -2.5]), ...wrap2(hum([.85, -1.3]), fore([.3, 1.9]), C, 1.3 * R, 1).pts]);
      M.bic.set([hum([.95, -8]), hum([1.25, -4.6]), ...wrap2(hum([1.2, -2.3]), fore([.32, 2.35]), C, 1.45 * R, 1).pts]);
      M.tri.set([hum([-1.35, -8]), hum([-1.72, -4.3]), ...wrap2(hum([-1.55, -2.2]), fore([-1.22, -.62]), C, 1.35 * R, -1).pts]);
      if (M.anc) M.anc.set([hum([-1.2, -.5]), fore([-1.05, .55]), fore([-1.05, 1.6])]);
      if (M.br) M.br.set([hum([.1, -3.7]), ...wrap2(hum([.6, -2.1]), fore([1.15, 2.6]), C, 1.55 * R, 1).pts, fore([1.05, 5.2]), fore([.88, 7.1])]);
      if (M.pt) M.pt.set([...wrap2(hum([.15, -1.05]), fore([.62, 2.6]), C, .9 * R, 1).pts, fore([.55, 4.0])]);
    }
    if (M.ext) M.ext.set([hum([-.85, -.62]), fore([-.95, 1.2]), fore([-.72, 4.4]), fore([-.32, 7.3]), fore([-.2, 8.8])]);
    if (M.flx) M.flx.set([...wrap2(hum([.05, -1.05]), fore([.95, 1.9]), C, .9 * R, 1).pts, fore([.9, 4.4]), fore([.62, 7.3]), fore([.75, 8.8])]);
    if (j.nv) {
      const P = [hum([-1.25, -7.6]), hum([-1.38, -3.2]), ...wrap2(hum([-1.4, -1.6]), fore([-1.3, 1.2]), C, 1.62 * R, -1).pts, fore([-.92, 3.6]), fore([-.58, 7.2])], Ln = polyLen(P);
      if (nvRest === null) nvRest = Ln;
      j.nv.reroute(P); j.nvStrain = Ln / nvRest - 1; j.nv.set({ taut: clamp(j.nvStrain / .07, 0, 1) });
    }
    Object.assign(j.pts, {
      C, olec: fore([-1.2, -.85]), cor: fore([1.1, .62]), rh: fore([.05, 1.25]), notch: fore([0, 1.12]), ball: polar(C, R, -20), W: fore([.3, 7.5]), X: fore([.3, 9.3]),
      capA: capA.mid, capP: capP.mid, nv: hum([-1.62, -.6]), epi: lat ? hum([-1.25, -.75]) : hum([-1.6, -.6]), ho: hoC, ann: fore([.0, 1.38]), shaft: hum([-.3, -4]),
      ...Object.fromEntries(Object.keys(M).map(k => [k, M[k].mid(k === 'bic' ? .38 : k === 'tri' ? .4 : .5)])),
      ...Object.fromEntries(Object.keys(L).map(k => [k, L[k].mid]))
    });
    j.onSet.forEach(fn => fn(j));
    return j;
  };
  j.at = k => { const S0 = st(g), P = Array.isArray(k) ? k : j.pts[k], v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; }
  // rest lengths: muscles at 30° (the triceps at 95°), the anterior capsule just taut at 4°, the posterior at 142°
  j.set({ flex: 30 });
  for (const k in M) if (k !== 'tri') M[k].rest = polyLen(M[k].pts) * 1.02;
  j.set({ flex: 95 }); if (M.tri) M.tri.rest = polyLen(M.tri.pts) * 1.02;
  capA.rest = null; j.set({ flex: 4 });
  capP.rest = null; j.set({ flex: 142 });
  nvRest = null; j.set({ flex: 20 });
  j.setHO(0);
  if (t0 !== null) show(g, t0);
  return j;
}
// The right elbow and forearm from the front, in the anatomical position: lateral (the radius, the thumb) to the left.
// The joint centre is at (x, y), R = 40 local units; the forearm hangs to the wrist at about 7.5 R. set({ pro, vv, rdy,
// carry }): pro 0..1 — supination (palm forward) to pronation (the radius crosses over the ulna, the back of the hand
// shows); vv — valgus (+: the forearm swings out about the lateral contact and the medial side gaps) or varus (−);
// rdy — the radius slides along the forearm in R units (− proximally: «pushed elbow», + distally: «pulled elbow»);
// carry — the carrying angle (12°). Muscles (bellyEl): bic, brach, br, pt, pq, sup; flx / ext with wrist: true.
// Ligaments (ligBand): mcl, lcl; the annular ring round the head (annF / annB). nerves: true — med, uln, rad, pin, sr.
// capOut — the capsule outline (hidden). fore(P) / hum(P) / radP(P) map R-unit points; at(k) — a stage point.
function elbowAnt(p, x, y, s = 1, t0 = .2, { muscles = true, wrist = false, nerves = false, hand = true, ligs = true, skin = true } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const U = P => P.map(([a, b]) => [a * R, b * R]), V = (a, b) => [a * R, b * R], A2 = P => P.map(([a, b]) => [a / R, b / R]);
  const j = { g, R, q: { pro: 0, vv: 0, rdy: 0, carry: 12, cut: 0 }, pts: {}, onSet: [] };
  const topMask = fadeMask(defs, 0, -7.6 * R, 0, -6.2 * R, [[0, '#000'], [1, '#fff']]);
  const PIV_L = V(-.72, .66), PIV_M = V(.62, .66);
  // forearm frame → model frame: the carrying angle about the joint centre, then valgus / varus about a contact point
  const fr = P => {
    const q = j.q; let v = rotPt(P[0], P[1], q.carry);
    if (q.vv) { const pv = rotPt(...(q.vv > 0 ? PIV_L : PIV_M), q.carry), d = rotPt(v[0] - pv[0], v[1] - pv[1], q.vv); v = [pv[0] + d[0], pv[1] + d[1]]; }
    return v;
  };
  const trF = () => { const q = j.q; if (!q.vv) return `rotate(${f(q.carry)})`; const pv = rotPt(...(q.vv > 0 ? PIV_L : PIV_M), q.carry); return `rotate(${f(q.vv)} ${f(pv[0])} ${f(pv[1])}) rotate(${f(q.carry)})`; };
  const fore = P => fr([P[0] * R, P[1] * R]), hum = P => [P[0] * R, P[1] * R], radP = P => fr([P[0] * R, (P[1] + j.q.rdy) * R]);
  Object.assign(j, { fore, hum, radP });
  // layers
  const skinU = mk('g', { mask: topMask, opacity: .55 }, g), skinF = mk('g', { opacity: .55 }, g);
  const FG = mk('g', {}, g), annB = mk('g', {}, g), RG = mk('g', {}, g), HG = mk('g', { mask: topMask }, g), annG = mk('g', {}, g);
  const ligG = mk('g', {}, g), deepG = mk('g', { mask: topMask }, g), nvG = mk('g', {}, g), musG = mk('g', { mask: topMask }, g), wrG = mk('g', { mask: topMask }, g), handG = mk('g', {}, g), topG = mk('g', {}, g);
  Object.assign(j, { FG, RG, HG, ligG, musG, wrG, nvG, topG });
  if (skin) {
    const sc = '#4b5f57', sl = '#6f857b';
    limbEl(skinU, defs, sc, 2.25 * R, 2.35 * R, sl).set(V(.05, -8), V(.15, -.4));
    j.skinF = G(skinF, {});
    limbEl(j.skinF, defs, sc, 2.1 * R, 1.15 * R, sl).set(V(.1, .2), V(-.15, 7.4));
  }
  // humerus: shaft, epicondyles, capitulum (ball) and trochlea (spool), the two fossae
  const HUMA = [[-.72, -8], [-.78, -4.2], [-1.0, -2.7], [-1.42, -1.45], [-1.72, -.82], [-1.66, -.42], [-1.36, -.2], ...A2(arcPts(V(-.7, .02), .62 * R, 170, 20, 15)),
    [-.05, .38], [.2, .64], [.55, .58], [.88, .74], [1.15, .62], [1.35, .1], [1.78, -.18], [2.12, -.48], [2.02, -.85], [1.6, -1.12], [1.02, -2.4], [.75, -4.2], [.68, -8]];
  boneSh(HG, defs, U(HUMA));
  [[-.62, -.78, .3, .2], [.42, -.82, .36, .22]].forEach(([cx, cy, rx, ry]) => mk('ellipse', { cx: cx * R, cy: cy * R, rx: rx * R, ry: ry * R, fill: COL.board, opacity: .3 }, HG));
  mk('circle', { cx: -.7 * R, cy: .02 * R, r: .6 * R, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, HG);
  mk('path', { d: smoothD(U([[-.02, -.12], [.45, .02], [.95, -.18], [1.12, .25], [.92, .72], [.45, .55], [-.02, .66], [-.12, .25]])), fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, HG);
  path(HG, smoothD(U([[.45, .04], [.38, .3], [.45, .54]]), false), { stroke: mix(ANAT.bone, '#000000', .3), 'stroke-width': 2 });
  path(HG, smoothD(arcPts(V(-.7, .02), .57 * R, 160, 20, 14), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .85 });
  // ulna (forearm frame)
  const ULNA = [[-.18, .72], [.15, .64], [.5, .6], [.82, .68], [1.05, .82], [1.12, 1.02], [.98, 1.45], [.8, 2.6], [.66, 4.5], [.62, 6.3], [.75, 7.0], [.8, 7.55], [.62, 7.62], [.42, 7.5], [.2, 7.32], [.22, 6.4], [.26, 4.5], [.2, 2.6], [.02, 1.75], [-.18, 1.32], [-.24, 1.05]];
  boneSh(FG, defs, U(ULNA));
  path(FG, smoothD(U([[-.14, .74], [.5, .64], [1.02, .84]]), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .8 });
  // the annular ligament: its back half behind the radius, the front half over the head (forearm frame, not the radius)
  path(annB, `M${f(-.12 * R)} ${f(.86 * R)}Q${f(-.72 * R)} ${f(.62 * R)} ${f(-1.42 * R)} ${f(.88 * R)}`, { stroke: mix(ANAT.tendon, COL.board, .35), 'stroke-width': .18 * R, 'stroke-linecap': 'round' });
  const annF = path(annG, `M${f(-.12 * R)} ${f(.86 * R)}Q${f(-.72 * R)} ${f(1.24 * R)} ${f(-1.42 * R)} ${f(.88 * R)}`, { stroke: ANAT.tendon, 'stroke-width': .2 * R, 'stroke-opacity': .9, 'stroke-linecap': 'round' });
  j.annF = annF;
  // radius (radius frame): head, neck, bowed shaft to the distal end D, which swings round the ulna with pronation
  const RCOL = mix(ANAT.bone, '#f6d9a8', .25), radShaft = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0, RCOL), stroke: mix(RCOL, '#000000', .5), 'stroke-width': 2, 'stroke-linejoin': 'round' }, RG);
  const rhead = boneSh(RG, defs, U([[-1.3, .76], [-.72, .7], [-.14, .76], [-.1, .93], [-.14, 1.12], [-.72, 1.16], [-1.3, 1.12], [-1.34, .93]]), { col: RCOL });
  path(RG, smoothD(U([[-1.25, .76], [-.72, .71], [-.19, .76]]), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .85 });
  const spin = mk('path', { stroke: mix(RCOL, '#000000', .5), 'stroke-width': 3, 'stroke-linecap': 'round' }, RG);
  const tub = mk('ellipse', { rx: .16 * R, ry: .26 * R, fill: mix(RCOL, '#000000', .12), stroke: mix(RCOL, '#000000', .5), 'stroke-width': 1.5 }, RG);
  Object.assign(j, { rhead, RG });
  const Dof = pro => [lerp(-.95, 1.3, (1 - Math.cos(Math.PI * pro)) / 2), 7.35 - .12 * Math.sin(Math.PI * pro)];
  const radShape = (pro, top = 1.12) => {
    const N = [-.72, Math.max(1.55, top + .3)], D = Dof(pro), c = Math.cos(Math.PI * pro), rs = -c, L0 = [], L1 = [];
    const dx = D[0] - N[0], dy = D[1] - N[1] - .45, Ln = Math.hypot(dx, dy), nx = -dy / Ln, ny = dx / Ln;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, bow = -.22 * c * Math.sin(Math.PI * t), C = [N[0] + dx * t + bow, N[1] + (dy) * t], w = lerp(.16, .34, t * t);
      L0.push([C[0] + nx * w, C[1] + ny * w]); L1.push([C[0] - nx * w, C[1] - ny * w]);
    }
    const end = [[D[0] + rs * .55, D[1] - .3], [D[0] + rs * .66, D[1] + .3], [D[0] + .1 * rs, D[1] + .42], [D[0] - rs * .45, D[1] + .3], [D[0] - rs * .46, D[1] - .2]];
    // order: the side whose x is on the radial side meets the styloid
    const a = L0[10][0] * rs > L1[10][0] * rs ? L0 : L1, b = a === L0 ? L1 : L0;
    return [[-.86, top], ...a.slice(1), ...end, ...b.slice(1).reverse(), [-.58, top]];
  };
  // the radial head: rh(kind, t) — 'frac' (three fragments, displaced; frags move them), 'orif' (two screws),
  // 'excise' (head and neck removed: the cut shaft, a dashed ghost), 'implant' (a metal head on a stem); rhReset(t)
  const rhX = mk('g', {}, RG), RC2 = mix(ANAT.bone, '#f6d9a8', .25);
  const fragG = mk('g', { opacity: 0 }, rhX);
  j.frags = [[[-1.3, .76], [-.95, .73], [-.88, 1.15], [-1.3, 1.12], [-1.34, .93]], [[-.95, .73], [-.5, .72], [-.55, 1.15], [-.88, 1.15]], [[-.5, .72], [-.14, .76], [-.1, .93], [-.14, 1.12], [-.55, 1.15]]]
    .map(P => { const e = G(fragG, {}); mk('path', { d: ptsD(U(P), true), fill: boneGrad(defs, 0, 0, 1, 0, RC2), stroke: mix(RC2, '#000000', .55), 'stroke-width': 2, 'stroke-linejoin': 'round' }, e); return e; });
  const screwG = mk('g', { opacity: 0 }, rhX);
  [[[-1.26, .86], [-.3, .84]], [[-1.22, 1.03], [-.26, 1.01]]].forEach(([A, B]) => { path(screwG, `M${f(A[0] * R)} ${f(A[1] * R)}L${f(B[0] * R)} ${f(B[1] * R)}`, { stroke: '#7d8f9c', 'stroke-width': 5, 'stroke-linecap': 'round' }); mk('circle', { cx: A[0] * R, cy: A[1] * R, r: 5, fill: IMPL_C, stroke: '#4d585f', 'stroke-width': 1.5 }, screwG); });
  const ghost = mk('path', { d: smoothD(U([[-1.3, .76], [-.72, .7], [-.14, .76], [-.1, .93], [-.14, 1.12], [-.58, 1.16], [-.58, 1.5], [-.86, 1.5], [-.86, 1.16], [-1.3, 1.12], [-1.34, .93]])), fill: 'none', stroke: COL.dim, 'stroke-width': 2.5, 'stroke-dasharray': '7 6', opacity: 0 }, rhX);
  const impG = mk('g', { opacity: 0 }, rhX);
  implSh(impG, defs, U([[-.8, 1.1], [-.64, 1.1], [-.66, 3.0], [-.78, 3.0]]));
  implSh(impG, defs, U([[-1.28, .77], [-.72, .72], [-.16, .77], [-.13, 1.14], [-1.31, 1.14]]));
  Object.assign(j, { fragG, screwG, rhGhost: ghost, rhImp: impG });
  j.rh = (kind, t, dur = .6) => {
    if (kind === 'frac' || kind === 'excise' || kind === 'implant') hide(rhead, t, dur);
    if (kind === 'frac') show(fragG, t, dur);
    if (kind === 'orif') show(screwG, t, dur);
    if (kind === 'excise') { show(ghost, t, dur); prog(q => j.set({ cut: q > .5 ? 1 : 0 }), t, dur, lin); }
    if (kind === 'implant') show(impG, t, dur);
  };
  j.rhReset = (t, dur = .5) => { show(rhead, t, dur); [fragG, screwG, ghost, impG].forEach(e => hide(e, t, dur)); prog(q => { if (j.q.cut && q > .5) j.set({ cut: 0 }); }, t, dur, lin); };
  // a linked (semiconstrained) total elbow: the humeral stem with a yoke and the axle, the ulnar stem with a bushing;
  // tea(t) shows it and fades the joint surfaces it replaces
  const teaH = mk('g', { opacity: 0 }, HG), teaF = mk('g', { opacity: 0 }, FG);
  mk('path', { d: ptsD(U([[-.24, -6.3], [.24, -6.3], [.28, -1.3], [-.28, -1.3]]), true), fill: '#efe9d6', 'fill-opacity': .5 }, teaH);
  implSh(teaH, defs, U([[-.13, -6.1], [.13, -6.1], [.16, -1.4], [-.16, -1.4]]));
  implSh(teaH, defs, U([[-.52, -1.5], [.98, -1.5], [1.08, .42], [.8, .42], [.68, -.62], [-.1, -.62], [-.22, .42], [-.5, .42]]));
  mk('path', { d: ptsD(U([[.3, .55], [.62, .55], [.6, 4.8], [.36, 4.8]]), true), fill: '#efe9d6', 'fill-opacity': .5 }, teaF);
  implSh(teaF, defs, U([[.38, .55], [.54, .55], [.52, 4.6], [.4, 4.6]]));
  implSh(teaF, defs, U([[-.1, -.12], [.82, -.12], [.82, .6], [-.1, .6]]), POLY_C);
  const axle = mk('rect', { x: -.32 * R, y: .1 * R, width: 1.46 * R, height: .2 * R, rx: .1 * R, fill: boneGrad(defs, 0, 0, 0, 1, '#8d9aa3'), stroke: '#4d585f', 'stroke-width': 1.5, opacity: 0 }, topG);
  j.tea = (t, dur = .6) => { show(teaH, t, dur); show(teaF, t, dur); show(axle, t, dur); };
  Object.assign(j, { teaH, teaF, axle });
  // skin of the hand: palm, fingers, thumb (hand frame: fingers down, the thumb to −x; flipped by pronation)
  const HG2 = G(handG, {}), handParts = [];
  if (hand) {
    const hc = '#d8d1c1', hl = mix(hc, COL.board, .62);
    handParts.push(limbEl(HG2, defs, hc, .88 * R, .95 * R, hl));
    [0, 1, 2, 3].forEach(() => handParts.push(limbEl(HG2, defs, hc, .23 * R, .2 * R, hl)));
    handParts.push(limbEl(HG2, defs, hc, .3 * R, .24 * R, hl));
    handParts[0].set(V(0, .1), V(0, 2.0));
    [-.56, -.19, .19, .54].forEach((xx, i) => handParts[i + 1].set(V(xx * 1.05, 2.4), V(xx * 1.12, [3.85, 4.25, 4.15, 3.7][i])));
    handParts[5].set(V(-.82, .6), V(-1.5, 1.9));
    j.nails = mk('g', {}, HG2);
    [-.56, -.19, .19, .54].forEach((xx, i) => mk('ellipse', { cx: xx * 1.12 * R, cy: ([3.85, 4.25, 4.15, 3.7][i] - .14) * R, rx: .12 * R, ry: .15 * R, fill: mix(hc, '#ffffff', .4) }, j.nails));
    j.knuck = mk('g', {}, HG2);
    [-.56, -.19, .19, .54].forEach(xx => mk('circle', { cx: xx * R, cy: 2.15 * R, r: .12 * R, fill: mix(hc, '#000000', .2) }, j.knuck));
  }
  j.hand = HG2;
  // capsule outline (one capsule round the humeroulnar, humeroradial and proximal radioulnar joints)
  j.capOut = mk('path', { d: smoothD(U([[-1.45, -1.28], [0, -1.42], [1.4, -1.3], [1.55, .35], [1.2, 1.5], [.2, 1.9], [-1.05, 1.95], [-1.62, 1.1], [-1.72, -.3]])), fill: CAPS_C, 'fill-opacity': .08, stroke: CAPS_C, 'stroke-width': 3.5, 'stroke-dasharray': '10 7', opacity: 0 }, topG);
  // ligaments
  const LG = { mcl: [[1.55, -.15], [1.02, 1.0]], lcl: [[-1.52, -.25], [-1.36, 1.0]] }, L = {};
  if (ligs) for (const k in LG) { const [A, B] = LG[k], Bf = rotPt(B[0] * R, B[1] * R, 12); L[k] = ligBand(ligG, { rest: Math.hypot(Bf[0] - A[0] * R, Bf[1] - A[1] * R) * 1.0, w: 7 }); }
  Object.assign(j, L);
  // muscles
  const M = {};
  if (muscles) {
    M.brach = bellyEl(deepG, { col: ANAT.muscleDeep, w: 1.15 * R, ta: .04, tb: .2 });
    M.sup = bellyEl(deepG, { col: ANAT.muscleDeep, w: .62 * R, ta: .1, tb: .12 });
    M.bic = bellyEl(musG, { w: 1.3 * R, ta: .03, tb: .34, tw: 6 });
    M.pt = bellyEl(musG, { w: .62 * R, ta: .08, tb: .14 });
    M.pq = bellyEl(musG, { col: ANAT.muscleDeep, w: .62 * R, ta: .12, tb: .12 });
    M.br = bellyEl(musG, { w: .78 * R, ta: .06, tb: .34 });
  }
  if (wrist) { M.flx = bellyEl(wrG, { w: .95 * R, ta: .05, tb: .32 }); M.ext = bellyEl(wrG, { w: .85 * R, ta: .05, tb: .32, opacity: .85 }); }
  Object.assign(j, M);
  // nerves
  const NV = {};
  if (nerves) ['med', 'uln', 'rad', 'sr', 'pin'].forEach(k => { NV[k] = nerveLine(nvG, [[0, 0], [1, 1]], null, { w: 7, n: 10 }); put(NV[k].g, { o: 1 }); });
  Object.assign(j, { nv: NV });
  let rests = null;
  j.set = (o = {}) => {
    Object.assign(j.q, o);
    const q = j.q, pro = q.pro, c = Math.cos(Math.PI * pro), rs = -c, D = Dof(pro), tr = trF();
    [FG, annB, annG].forEach(e => e.setAttribute('transform', tr));
    if (j.skinF) j.skinF.setAttribute('transform', tr);
    RG.setAttribute('transform', tr + ` translate(0 ${f(q.rdy * R)})`);
    radShaft.setAttribute('d', smoothD(U(radShape(pro, q.cut ? 1.5 : 1.12))));
    const sx = -.72 - .46 * Math.sin(Math.PI * pro);
    spin.setAttribute('d', `M${f(sx * R)} ${f(.8 * R)}L${f(sx * R)} ${f(1.08 * R)}`); spin.setAttribute('opacity', f(clamp(c + .2, 0, 1)));
    const tx = -.72 + .27 * c;
    tub.setAttribute('cx', f(tx * R)); tub.setAttribute('cy', f(1.95 * R)); tub.setAttribute('opacity', f(clamp(.3 + .7 * c, 0, 1)));
    // the hand at the wrist, mirrored through mid-position (edge-on) as the forearm pronates
    const Uh = [.45, 7.3], W = [lerp(Uh[0], D[0], .62), 7.62], k = Math.sign(c || 1) * Math.max(.4, Math.abs(c)), Wm = radP([W[0], W[1] - q.rdy]);
    HG2.setAttribute('transform', `translate(${f(Wm[0])} ${f(Wm[1])}) rotate(${f(q.carry + q.vv)}) scale(${f(k)} 1)`);
    if (hand) { j.nails.setAttribute('opacity', c > 0 ? 1 : 0); j.knuck.setAttribute('opacity', c < 0 ? 1 : 0); }
    for (const kk in L) { const [A, B] = LG[kk]; L[kk].set(hum(A), fore(B)); }
    const shaftPt = (t, side) => { const N = [-.72, 1.55], bow = -.22 * c * Math.sin(Math.PI * t), C = [lerp(N[0], D[0], t) + bow, lerp(N[1], D[1] - .45, t)]; return radP([C[0] + side * lerp(.16, .34, t * t), C[1]]); };
    const add = {};
    if (M.bic) {
      const T = radP([tx, 1.95]);
      M.bic.set([hum([.1, -8]), hum([.25, -4.8]), hum([.1, -2.6]), hum([-.08, -1.0]), radP([-.32, .9]), T]);
      add.bic = .6 * R * pro;
      M.brach.set([hum([-.3, -4.8]), hum([-.12, -2.6]), hum([.08, -1.1]), fore([.32, .95]), fore([.36, 1.3])]);
      M.sup.set([hum([-1.5, -.35]), fore([-1.48, .85]), radP([-1.12, 1.85]), shaftPt(.3, -c * .2)]); add.sup = .8 * R * pro;
      M.pt.set([hum([1.72, -.52]), fore([1.15, 1.25]), shaftPt(.45, -c)]); add.pt = .5 * R * (1 - pro);
      M.pq.set([fore([.62, 6.85]), radP([D[0] + .32 * c, D[1] - .5])]); add.pq = .25 * R * (1 - pro);
      M.br.set([hum([-1.2, -3.9]), hum([-1.62, -1.6]), fore([-1.78, .8]), fore([-1.62, 3.0]), shaftPt(.82, rs), radP([D[0] + rs * .58, D[1] + .05])]);
      const L2 = {}; ['bic', 'sup', 'pt', 'pq'].forEach(kk => { L2[kk] = polyLen(M[kk].pts) + add[kk]; });
      if (rests === null) rests = { ...L2 };
      ['bic', 'sup', 'pt', 'pq'].forEach(kk => M[kk].set(M[kk].last[0], L2[kk]));
    }
    if (M.flx) {
      const Hc = radP([W[0], W[1] + 1.2 - q.rdy]);
      M.flx.set([hum([1.88, -.45]), fore([1.38, 1.4]), fore([.95, 4.2]), fore([lerp(.55, W[0], .5), 6.9]), Hc]);
      M.ext.set([hum([-1.75, -.62]), fore([-1.95, 1.4]), fore([-1.7, 4.2]), shaftPt(.85, rs), radP([W[0] + rs * .3, W[1] + .9 - q.rdy])]);
    }
    if (nerves) {
      NV.med.reroute([hum([.62, -7.6]), hum([.58, -4.2]), hum([.6, -2.2]), hum([.52, -.7]), fore([.62, .8]), fore([.74, 1.5]), fore([.5, 3.2]), fore([.25, 5.6]), fore([.12, 7.2])]);
      NV.uln.reroute([hum([1.35, -7.6]), hum([1.55, -4.2]), hum([1.92, -2.0]), hum([2.28, -.5]), fore([1.75, .62]), fore([1.25, 1.7]), fore([1.05, 4.2]), fore([.85, 7.0])]);
      NV.rad.reroute([hum([-.9, -7.6]), hum([-1.15, -4.5]), hum([-1.28, -2.6]), hum([-1.18, -1.2]), hum([-1.02, -.2]), fore([-.98, .55])]);
      NV.sr.reroute([fore([-.98, .55]), fore([-1.45, 2.4]), fore([-1.55, 4.5]), shaftPt(.9, rs)]);
      NV.pin.reroute([fore([-.98, .55]), fore([-1.0, 1.55]), fore([-.62, 2.6]), fore([-.3, 3.4])]);
    }
    Object.assign(j.pts, {
      C: [0, 0], cap: hum([-.7, .02]), troch: hum([.45, .25]), hu: hum([.5, .62]), hr: hum([-.7, .66]), pru: fore([-.17, .98]), dru: fore([.42, 7.2]), D: radP(D), Uh: fore(Uh),
      epiM: hum([2.0, -.55]), epiL: hum([-1.66, -.62]), rhead: radP([-.72, .93]), tub: radP([tx, 1.95]), ann: fore([-.72, 1.06]), W: Wm, X: radP([W[0], W[1] + 2.6 - q.rdy]),
      cubital: hum([2.25, -.4]), fcu: fore([1.3, 1.6]), ecrb: fore([-1.25, .95]), frohse: fore([-1.0, 1.55]), supE: fore([-.45, 3.0]), ptH: fore([.75, 1.55]),
      struthers: hum([.62, -3.2]), lacertus: hum([.5, -.4]), fds: fore([.42, 3.4]), shaftR: shaftPt(.5, 0), shaftU: fore([.45, 4.0]),
      ...Object.fromEntries(Object.keys(M).map(kk => [kk, M[kk].mid(kk === 'bic' ? .35 : kk === 'brach' ? .35 : .5)])),
      ...Object.fromEntries(Object.keys(L).map(kk => [kk, L[kk].mid]))
    });
    j.onSet.forEach(fn => fn(j));
    return j;
  };
  j.at = k => { const S0 = st(g), P = Array.isArray(k) ? k : j.pts[k], v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; }
  // rest lengths: the forearm in mid-position
  j.set({ pro: .5 });
  for (const k in M) M[k].rest = (rests && rests[k] !== undefined ? rests[k] : polyLen(M[k].pts)) * 1.02;
  j.set({ pro: 0 });
  if (t0 !== null) show(g, t0);
  return j;
}
// A right arm in side view for stretches and exercises, anterior to the right; the shoulder at (x, y), R = 40 units.
// set({ sh, el, wr, fg, pro }): sh — direction of the upper arm (screen degrees: 90 hanging, 0 forward, −90 overhead,
// 120 back in extension); el — elbow flexion; wr — wrist flexion (+, toward the palm) or extension (−); fg — finger
// curl 0..1; pro — 0 supinated (the palm on the flexion side of the forearm), 1 pronated (the palm away from it).
// Muscles (bellyEl): ext — wrist and finger extensors on the back of the forearm (from the lateral epicondyle),
// flx — flexors on the palm side (from the medial epicondyle), bic, tri (long head) over the shoulder. Each length counts
// every joint it crosses, so the stretch positions of the book light them up. Faint bones inside. pts: S, E, W, M, F
// (fingertip), grip (fist centre), palm / back (hand surfaces); at(k) — stage point; dir — the hand's direction.
function armSide(p, x, y, s = 1, t0 = .2, { muscles = ['ext', 'flx'], col = '#d8d1c1', bones = true } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(col, COL.board, .62);
  const Lu = 7.2 * R, Lf = 6.6 * R, Lp = 2.3 * R, L1 = 1.25 * R, L2 = 1.3 * R;
  const a = { g, R, q: { sh: 90, el: 30, wr: 0, fg: .2, pro: 1 }, pts: {}, onSet: [] };
  const L = (ra, rb) => limbEl(g, defs, col, ra, rb, line);
  const cap = mk('circle', { r: 1.25 * R, fill: ballGrad(defs, col), stroke: line, 'stroke-width': 2 }, g);
  const ua = L(1.12 * R, .92 * R), fa = L(.92 * R, .6 * R), palm = L(.42 * R, .44 * R), f1 = L(.3 * R, .27 * R), f2 = L(.27 * R, .23 * R), th = L(.24 * R, .2 * R);
  const boneG = mk('g', { opacity: bones ? .5 : 0 }, g), bU = boneLine(boneG, .32 * R), bF = boneLine(boneG, .26 * R);
  const musG = mk('g', {}, g), M = {};
  a.M = M;   // the muscles by key (the sandbox reads their stretch)
  muscles.forEach(k => { M[k] = bellyEl(musG, { w: (k === 'bic' || k === 'tri' ? 1.1 : .78) * R, ta: k === 'bic' || k === 'tri' ? .06 : .04, tb: k === 'bic' ? .25 : k === 'tri' ? .14 : .42, tw: 5 }); });
  Object.assign(a, M, { musG });
  const add = (A, v, k) => [A[0] + v[0] * k, A[1] + v[1] * k], P1 = ang => polar([0, 0], 1, ang);
  const geo = q => {
    const ud = P1(q.sh), E = add([0, 0], ud, Lu), faA = q.sh - q.el, fd = P1(faA), W = add(E, fd, Lf), nF = P1(faA - 90), ps = q.pro < .5 ? 1 : -1;
    const nP = [nF[0] * ps, nF[1] * ps], ha = faA - ps * q.wr, hd = P1(ha), M0 = add(W, hd, Lp), nPh = P1(ha - 90 * ps);
    const a1 = ha - ps * q.fg * 82, a2 = a1 - ps * q.fg * 100, F1 = add(M0, P1(a1), L1), F = add(F1, P1(a2), L2);
    return { ud, E, fd, W, nF, nP, ps, hd, M: M0, nPh, F1, F, ha, faA, nA: P1(q.sh - 90) };
  };
  a.geo = geo;
  a.set = (o = {}) => {
    Object.assign(a.q, o);
    const q = a.q, Q = geo(q), S = [0, 0];
    cap.setAttribute('cx', 0); cap.setAttribute('cy', 0);
    ua.set(S, Q.E); fa.set(Q.E, Q.W); palm.set(Q.W, Q.M); f1.set(Q.M, Q.F1); f2.set(Q.F1, Q.F);
    th.set(add(add(Q.W, Q.hd, .55 * R), Q.nPh, .32 * R), add(add(Q.W, Q.hd, 1.55 * R), Q.nPh, .72 * R));
    bU.set([add(S, Q.ud, .6 * R), add(Q.E, Q.ud, -.25 * R)]); bF.set([add(Q.E, Q.fd, .25 * R), add(Q.W, Q.fd, -.2 * R)]);
    const nD = [-Q.nP[0], -Q.nP[1]], nDh = [-Q.nPh[0], -Q.nPh[1]], elT = .5 * R * (1 - clamp(q.el, 0, 150) / 150);
    const side = (n, nh) => [add(add(Q.E, Q.ud, -.4 * R), n, .5 * R), add(add(Q.E, Q.fd, 1.3 * R), n, .62 * R), add(add(Q.E, Q.fd, 3.8 * R), n, .5 * R), add(Q.W, n, .4 * R), add(add(Q.W, Q.hd, 1.0 * R), nh, .32 * R), add(Q.M, nh, .26 * R)];
    if (M.ext) { const P = side(nD, nDh); M.ext.set(P, polyLen(P) + elT + .35 * R * q.pro + .55 * R * q.fg); }
    if (M.flx) { const P = side(Q.nP, Q.nPh); M.flx.set(P, polyLen(P) + elT + .35 * R * (1 - q.pro) + .55 * R * (1 - q.fg)); }
    if (M.bic) {
      const w = wrap2([.25 * R, -1.15 * R], add(add(S, Q.ud, 3.4 * R), Q.nA, .85 * R), S, 1.05 * R, 1), P = [...w.pts, add(add(Q.E, Q.ud, -1.2 * R), Q.nA, .78 * R), add(add(Q.E, Q.fd, .95 * R), Q.nF, .32 * R)];
      M.bic.set(P, polyLen(P) + .4 * R * q.pro);
    }
    if (M.tri) {
      const O = [-.3 * R, .95 * R], A1 = add(add(S, Q.ud, 3.6 * R), Q.nA, -.88 * R), I = add(add(Q.E, Q.fd, -.5 * R), Q.nF, -.3 * R);
      const w1 = wrap2(A1, I, Q.E, .62 * R, 1), w2 = wrap2(A1, I, Q.E, .62 * R, -1), w = polyLen(w1.pts) < polyLen(w2.pts) ? w1 : w2, P = [O, ...w.pts];
      M.tri.set(P);
    }
    const grip = add(add(Q.M, Q.hd, .25 * R), Q.nPh, .45 * R);
    Object.assign(a.pts, { S, E: Q.E, W: Q.W, M: Q.M, F: Q.F, grip, palm: add(add(Q.W, Q.hd, 1.2 * R), Q.nPh, .45 * R), back: add(add(Q.W, Q.hd, 1.2 * R), Q.nPh, -.45 * R),
      fore: add(Q.E, Q.fd, 3.3 * R), foreUp: add(add(Q.E, Q.fd, 3.3 * R), Q.nF, .95 * R), foreDn: add(add(Q.E, Q.fd, 3.3 * R), Q.nF, -.95 * R), dist: add(Q.W, Q.fd, -.8 * R),
      ...Object.fromEntries(Object.keys(M).map(k => [k, M[k].mid(k === 'bic' || k === 'tri' ? .55 : .35)])) });
    a.dir = Q.ha; a.Q = Q;
    a.onSet.forEach(fn => fn(a));
    return a;
  };
  a.at = k => { const S0 = st(g), P = Array.isArray(k) ? k : a.pts[k], v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; }
  // rest lengths: elbow 90°, wrist neutral, fingers relaxed, forearm in mid-position, the arm at the side
  a.set({ sh: 90, el: 90, wr: 0, fg: .3, pro: .5 });
  for (const k in M) M[k].rest = (M[k].last[1] ?? polyLen(M[k].pts)) * 1.03;
  a.set({ sh: 90, el: 30, wr: 0, fg: .2, pro: 1 });
  if (t0 !== null) show(g, t0);
  return a;
}
// The right forearm seen end-on from the hand (the elbow bent 90° at the side, the forearm pointing at us): a section
// just above the wrist with the ulna (fixed) and the radius that swings round it, and the outline of the hand beyond.
// set({ rot }): 0 — thumb up (mid-position); + supination (palm up at 90); − pronation (palm down at −90).
// bar: a short rod in the fist with a weight on its thumb end (barTorque — the turning effect of the weight, + toward
// supination); knob: a doorknob in the hand. pts: C, U (ulna), Rd (radius), thumb, palm, tip (the weighted end).
function foreEnd(p, x, y, s = 1, t0 = .2, { bar = false, knob = false, col = '#d8d1c1' } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), line = mix(col, COL.board, .62);
  const e = { g, R, q: { rot: 0 }, pts: {}, barTorque: 0, onSet: [] };
  const U = [0, .7 * R], RCOL = mix(ANAT.bone, '#f6d9a8', .25);
  const knobG = mk('g', { opacity: knob ? 1 : 0 }, g);
  mk('circle', { r: 1.9 * R, fill: ballGrad(defs, '#c9a95c'), stroke: mix('#c9a95c', '#000000', .5), 'stroke-width': 2 }, knobG);
  const knobMark = mk('path', { stroke: mix('#c9a95c', '#000000', .45), 'stroke-width': 5, 'stroke-linecap': 'round' }, knobG);
  const skin = mk('ellipse', { rx: 1.3 * R, ry: 1.95 * R, fill: shadeGradX(defs, col), stroke: line, 'stroke-width': 2 }, g);
  const ulna = mk('circle', { cx: U[0], cy: U[1], r: .48 * R, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, g);
  const radius = mk('ellipse', { rx: .78 * R, ry: .52 * R, fill: ballGrad(defs, RCOL), stroke: mix(RCOL, '#000000', .5), 'stroke-width': 2 }, g);
  const hand = mk('path', { fill: col, 'fill-opacity': .22, stroke: col, 'stroke-width': 3, 'stroke-dasharray': '9 6', 'stroke-linejoin': 'round' }, g);
  const thumb = mk('ellipse', { rx: .42 * R, ry: .55 * R, fill: col, 'fill-opacity': .35, stroke: col, 'stroke-width': 2.5 }, g);
  const palmMark = mk('path', { stroke: COL.good, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  const barG = mk('g', { opacity: bar ? 1 : 0 }, g), rod = mk('path', { stroke: '#9fb0bf', 'stroke-width': .28 * R, 'stroke-linecap': 'round' }, barG);
  const wt = mk('circle', { r: .62 * R, fill: ballGrad(defs, '#7f8f9c'), stroke: '#3f4a52', 'stroke-width': 2 }, barG);
  Object.assign(e, { skin, ulna, radius, hand, thumb, barG, knobG });
  const loc = (P, a) => { const v = rotPt(P[0], P[1], a); return v; };
  e.set = (o = {}) => {
    Object.assign(e.q, o);
    const rot = e.q.rot, a = -rot, Rd = polar(U, 1.35 * R, 270 - rot), C = [(U[0] + Rd[0]) / 2, (U[1] + Rd[1]) / 2];
    skin.setAttribute('transform', `translate(${f(C[0])} ${f(C[1])}) rotate(${f(a)})`);
    radius.setAttribute('transform', `translate(${f(Rd[0])} ${f(Rd[1])}) rotate(${f(a)})`);
    const HP = [[-.55, -1.9], [.55, -1.9], [.72, -1.2], [.72, 1.3], [.5, 1.9], [-.5, 1.9], [-.72, 1.3], [-.72, -1.2]].map(([u, v]) => { const w = loc([u * R, v * R], a); return [C[0] + w[0], C[1] + w[1]]; });
    hand.setAttribute('d', smoothD(HP));
    const th = loc([.55 * R, -1.55 * R], a), thP = [C[0] + th[0], C[1] + th[1]];
    thumb.setAttribute('cx', f(thP[0])); thumb.setAttribute('cy', f(thP[1])); thumb.setAttribute('transform', `rotate(${f(a)} ${f(thP[0])} ${f(thP[1])})`);
    const pm1 = loc([.85 * R, -.8 * R], a), pm2 = loc([.85 * R, .8 * R], a);
    palmMark.setAttribute('d', `M${f(C[0] + pm1[0])} ${f(C[1] + pm1[1])}L${f(C[0] + pm2[0])} ${f(C[1] + pm2[1])}`);
    const up = loc([0, -1], a), tip = [C[0] + up[0] * 3.3 * R, C[1] + up[1] * 3.3 * R], base = [C[0] - up[0] * .6 * R, C[1] - up[1] * .6 * R];
    rod.setAttribute('d', `M${f(base[0])} ${f(base[1])}L${f(tip[0])} ${f(tip[1])}`);
    wt.setAttribute('cx', f(tip[0])); wt.setAttribute('cy', f(tip[1]));
    e.barTorque = -up[0];   // weight on the thumb end: left of the axis turns toward supination (+)
    const km = loc([0, -1.5 * R], a);
    knobMark.setAttribute('d', `M${f(C[0])} ${f(C[1])}L${f(C[0] + km[0])} ${f(C[1] + km[1])}`);
    Object.assign(e.pts, { C, U, Rd, thumb: thP, palm: [C[0] + (pm1[0] + pm2[0]) / 2, C[1] + (pm1[1] + pm2[1]) / 2], tip, back: [C[0] - (pm1[0] + pm2[0]) / 2, C[1] - (pm1[1] + pm2[1]) / 2] });
    e.onSet.forEach(fn => fn(e));
    return e;
  };
  e.at = k => { const S0 = st(g), P = Array.isArray(k) ? k : e.pts[k], v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; }
  e.set({ rot: 0 });
  if (t0 !== null) show(g, t0);
  return e;
}

/* ---------- chapter 19: the wrist and hand (handSag, handFront) ---------- */
const ORTH_C = '#9cc4d8', SIL_C = '#dce9ef', HSKIN_C = '#4b5f57';
// A frame: origin o and angle a (degrees); map(P) takes a point of the frame to the parent space.
const hFrame = (o, a) => ({ o, a, map: P => { const v = rotPt(P[0], P[1], a); return [o[0] + v[0], o[1] + v[1]]; } });
const hChild = (F, c, th) => hFrame(F.map(c), F.a + th);
const hT = (el, F) => el.setAttribute('transform', `translate(${F.o[0].toFixed(1)} ${F.o[1].toFixed(1)}) rotate(${F.a.toFixed(2)})`);
// Point at arc length d along polyline P (from its first point), with the unit tangent.
function polyAt(P, d) {
  let acc = 0;
  for (let i = 1; i < P.length; i++) {
    const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (acc + l >= d || i === P.length - 1) { const q = l ? clamp((d - acc) / l, 0, 1) : 0, t = l ? [(P[i][0] - P[i - 1][0]) / l, (P[i][1] - P[i - 1][1]) / l] : [1, 0]; return { p: [lerp(P[i - 1][0], P[i][0], q), lerp(P[i - 1][1], P[i][1], q)], t }; }
    acc += l;
  }
  return { p: P[0], t: [1, 0] };
}
// The part of polyline P between arc lengths d0 and d1.
function polySlice(P, d0, d1) {
  const out = [polyAt(P, d0).p];
  let acc = 0;
  for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc > d0 && acc < d1) out.push(P[i]); }
  out.push(polyAt(P, d1).p);
  return out;
}

// The right wrist and hand seen from the radial side: the forearm runs to the left, the fingers to the right, the back
// of the hand up; (x, y) is the radiocarpal joint centre. Bones of the central column — radius, lunate, capitate and
// metacarpal — and one finger (proximal, middle, distal phalanx), the thumb in front, translucent skin with the other
// three fingers as ghosts behind. set({ wr, mp, pip, dip, tc, tmp, tip, g, lbv, lbd, scaph }) in degrees:
//   wr — wrist flexion (+) / extension (−), half at the radiocarpal, half at the midcarpal joint; mp, pip, dip —
//   flexion (+) / hyperextension (−); tc — thumb palmar abduction from the side of the palm; tmp, tip — thumb MP and IP
//   flexion; g — [mp, pip, dip] of the ghost fingers (null: as the finger); lbv 0..1 — the lateral bands slip volar to
//   the PIP axis (boutonnière); lbd 0..1 — they bowstring dorsally (swan neck); scaph — scaphoid tilt (+ volar).
// Tendons (drawn paths): fdp, fds — with the pulleys A1–A5 and the transverse carpal ligament; ed (to the central
// slip), lb (lateral bands to the terminal tendon). Their forearm muscles fdpM, fdsM, edM (bellyEl) slide with the
// tendon: exc.fdp / exc.fds / exc.ed — excursion in px from the straight hand (+ = pulled proximally). Tick marks on the
// tendons are material points, so gliding shows. Intrinsics lum (from the FDP tendon), io; thumb then, add (bellyEl),
// fpl tendon. Ligaments (ligBand): vpMP, vpPIP (volar plates, taut in extension), clMP (collateral, taut in flexion).
// act({ fdp, fds, ed, lum, io, then, add, wext, wflx }) — activity 0..1; cut(key, at, { gap, retract }) — a rupture
// or laceration at a stage point near the tendon (key: fdp fds ed cs tt lb); G.r / G.l / G.h / G['1'] / G['2'] / G['3'] /
// G.t1 … — bone groups (anything appended moves with the bone); fr(key, P) — a bone point in model space; at(k) —
// a stage point. pts: C0, C1, MP, PIP, DIP, tip, pad, nail, palm, dorsum, grip, radius, lunate, capitate, fdp, fds, ed,
// cs, lb, tt, lum, io, vpMP, vpPIP, clMP, A1…A5, tcl, ret, sag, tCMC, tMP, tIP, tTip, then, add.
function handSag(p, x, y, s = 1, t0 = .2, { tendons = true, intr = true, ligs = true, thumb = true, skin = true, ghost = true, muscles = true, wmus = false, flip = false } = {}) {
  const g0 = G(p, { x, y, s, o: 0 }), g = mk('g', flip ? { transform: 'scale(1 -1)' } : {}, g0), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const h = { g: g0, q: { wr: 0, mp: 15, pip: 20, dip: 10, tc: 0, tmp: 5, tip: 5, g: null, lbv: 0, lbd: 0, scaph: 0 }, pts: {}, exc: {}, onSet: [], flip, cuts: {}, lumS: null };
  const C1 = [38, 0], MPX = 212, L1 = 88, L2 = 52, L3 = 36, TC = [34, 30], T1 = 100, T2 = 66, T3 = 46;
  const foreMask = fadeMask(defs, -430, 0, -290, 0, [[0, '#000'], [1, '#fff']]);
  const lay = n => mk('g', n === 'fore' ? { mask: foreMask } : {}, g);
  const ghG = lay(), skG = lay(), skF = lay('fore'), boneF = lay('fore'), boneG = lay(), impG = lay(), ligG = lay(), musF = lay('fore'), tenG = lay(), tenF = lay('fore'), pulG = lay(), intG = lay(), extG = lay(), thG = lay(), ovG = lay();
  h.ovG = ovG; h.impG = impG;
  // bone groups: one per moving segment
  const BG = { r: mk('g', {}, boneF), l: mk('g', {}, boneG), h: mk('g', {}, boneG), '1': mk('g', {}, boneG), '2': mk('g', {}, boneG), '3': mk('g', {}, boneG) };
  h.G = BG;
  const bone = (par, P, col = ANAT.bone) => boneSh(par, defs, P, { ax: [0, 0, 0, 1], col });
  const cart = (par, C, r, a0, a1) => path(par, smoothD(arcPts(C, r, a0, a1, 10), false), { stroke: CART_C, 'stroke-width': 3.2, 'stroke-opacity': .9 });
  // radius (with the ulna faint behind) and the carpals of the central column
  boneSh(BG.r, defs, [[-470, -12], [-200, -11], [-90, -12], [-50, -16], [-32, -12], [-30, 8], [-60, 14], [-200, 11], [-470, 12]], { ax: [0, 0, 0, 1], op: .35 });   // ulna, behind
  const RAD = [[-470, -15], [-200, -16], [-90, -19], [-52, -27], [-34, -30], [-22, -24], ...arcPts([0, 0], 26, 222, 138, 10), [-18, 24], [-36, 31], [-70, 26], [-200, 18], [-470, 16]];
  h.radEl = bone(BG.r, RAD);
  cart(BG.r, [0, 0], 25, 218, 142);
  const LUN = [...arcPts([0, 0], 24, 215, 145, 10), [0, 19], [16, 16], ...arcPts(C1, 20, 145, 215, 10), [14, -15], [0, -17]];
  h.lunEl = bone(BG.l, LUN); cart(BG.l, [0, 0], 23, 212, 148); cart(BG.l, C1, 21, 150, 210);
  const scG = mk('g', { opacity: .55 }, boneG);   // the scaphoid in front (radial side), tilting with set({ scaph })
  bone(scG, [[-20, -10], [-4, -20], [26, -16], [40, -2], [38, 16], [20, 22], [-6, 18], [-22, 6]], mix(ANAT.bone, '#f6d9a8', .3));
  h.scG = scG;
  const CAPH = [...arcPts([0, 0], 18, 240, 120, 10), [12, 19], [44, 18], [60, 15], [62, 0], [60, -14], [44, -16], [12, -18]];
  h.capEl = bone(BG.h, CAPH); cart(BG.h, [0, 0], 17, 236, 124);
  const MC = [[64, -15], [72, -18], [100, -10], [160, -9], [194, -11], ...arcPts([MPX, 0], 14, -122, 122, 10), [194, 11], [160, 8], [100, 9], [72, 16], [64, 15]];
  h.mcEl = bone(BG.h, MC); cart(BG.h, [MPX, 0], 13, -110, 110);
  const phal = (par, L, rb, rh, dors, vol, tuft = false) => {
    const base = [...arcPts([0, 0], rb, 58, -58, 8)];
    const top = dors.map(([a, b]) => [a, b]), bot = vol.map(([a, b]) => [a, b]);
    const head = tuft ? [[L - 4, -5], [L, -2], [L, 3], [L - 4, 5]] : arcPts([L, 0], rh, -115, 115, 10);
    bone(par, [...base, ...top, ...head, ...bot]);
    if (!tuft) cart(par, [L, 0], rh - 1, -100, 100);
    cart(par, [0, 0], rb + .6, -48, 48);
  };
  phal(BG['1'], L1, 15.5, 10, [[26, -9.5], [55, -8], [76, -9]], [[76, 8], [55, 7], [26, 8.5], [8.6, 14]]);
  phal(BG['2'], L2, 11.5, 8, [[17, -7], [36, -6], [45, -7]], [[45, 6.5], [36, 5.5], [17, 6.5], [6.3, 10.3]]);
  phal(BG['3'], L3, 9.5, 0, [[14, -6], [26, -5]], [[26, 4], [14, 5.5], [5, 8.5]], true);
  // skin (translucent, behind the bones) and the ghosts of the other fingers
  const SKC = '#62796e', SL = '#a9c2b6', skinCap = (par, ra, rb, col = SKC) => {   // a skin capsule: softly shaded, lit from above
    const id = 'sk' + (++SHADE_ID), gr = mk('linearGradient', { id, gradientUnits: 'userSpaceOnUse' }, defs);
    [[0, mix(col, '#ffffff', .42)], [.55, col], [1, mix(col, '#000000', .1)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
    const e = mk('path', { fill: `url(#${id})`, stroke: SL, 'stroke-width': 1.6, 'stroke-opacity': .85, 'stroke-linejoin': 'round' }, par);
    return { e, set(A, B) { e.setAttribute('d', capsuleD(A, B, ra, rb)); const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, sg = ny < 0 ? -1 : 1, M0 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], r = Math.max(ra, rb);
      gr.setAttribute('x1', (M0[0] - sg * nx * r).toFixed(1)); gr.setAttribute('y1', (M0[1] - sg * ny * r).toFixed(1)); gr.setAttribute('x2', (M0[0] + sg * nx * r).toFixed(1)); gr.setAttribute('y2', (M0[1] + sg * ny * r).toFixed(1)); } };
  };
  const sk = skin ? { fore: skinCap(skF, 58, 48), palm: skinCap(skG, 48, 37), f1: skinCap(skG, 20, 17.5), f2: skinCap(skG, 17, 15), f3: skinCap(skG, 15, 12) } : null;
  if (sk) { put(skF, { o: .78 }); put(skG, { o: .78 }); }
  const nail = skin ? mk('path', { d: 'M15 -10.5C22 -13 31 -12.8 37 -9.5', fill: 'none', stroke: mix(HSKIN_C, '#ffffff', .45), 'stroke-width': 3, 'stroke-linecap': 'round' }, BG['3']) : null;
  const GH = ghost ? [[[214, -5], 1.07], [[208, -2], 1.0], [[194, 3], .84]].map(([c, k]) => ({ c, k, segs: [skinCap(ghG, 18 * k, 16 * k, mix(SKC, COL.board, .3)), skinCap(ghG, 15.5 * k, 14 * k, mix(SKC, COL.board, .3)), skinCap(ghG, 13.5 * k, 11 * k, mix(SKC, COL.board, .3))] })) : [];
  put(ghG, { o: .55 });
  // muscles in the forearm (their tendons are drawn as paths)
  const M = {};
  if (muscles && tendons) {
    M.fdsM = bellyEl(musF, { w: 30, ta: .02, tb: .05, tw: 5 });
    M.fdpM = bellyEl(musF, { col: ANAT.muscleDeep, w: 30, ta: .02, tb: .05, tw: 5 });
    M.edM = bellyEl(musF, { w: 26, ta: .02, tb: .05, tw: 5 });
  }
  if (wmus) { M.wext = bellyEl(musF, { w: 22, ta: .02, tb: .3, tw: 5 }); M.wflx = bellyEl(musF, { w: 22, ta: .02, tb: .3, tw: 5 }); }
  Object.assign(h, M);
  // tendon routes: [frame, x, y] or ['J', frame, cx, cy, r, joint, side] — a point on the bisector of a joint at
  // distance r from its centre, volar (side 1) or dorsal (−1). The last point is the insertion.
  const R = {
    fdp: [['r', -150, 33], ['J', 'r', 0, 0, 37, 'w1', 1], ['J', 'l', 38, 0, 33, 'w2', 1], ['h', 120, 21], ['J', 'h', MPX, 0, 22, 'mp', 1], ['1', 44, 15.5], ['J', '1', L1, 0, 16, 'pip', 1], ['2', 29, 11.5], ['J', '2', L2, 0, 12.5, 'dip', 1], ['3', 10, 8.5]],
    fds: [['r', -150, 44], ['J', 'r', 0, 0, 46, 'w1', 1], ['J', 'l', 38, 0, 41, 'w2', 1], ['h', 120, 27], ['J', 'h', MPX, 0, 28, 'mp', 1], ['1', 35, 13.5], ['1', 62, 11], ['J', '1', L1, 0, 12.5, 'pip', 1], ['2', 19, 8]],
    ed: [['r', -150, -32], ['J', 'r', 0, 0, 35, 'w1', -1], ['J', 'l', 38, 0, 28, 'w2', -1], ['h', 120, -15], ['J', 'h', MPX, 0, 19, 'mp', -1], ['1', 23, -12.5], ['1', 63, -11], ['J', '1', L1, 0, 12.5, 'pip', -1], ['2', 6, -10.5]],
    lb: [['1', 21, -10.5], ['1', 62, -6.5], ['LB'], ['2', 26, -7], ['2', 44, -7.5], ['J', '2', L2, 0, 9.5, 'dip', -1], ['3', 6, -8.5]],
    fpl: [['r', -150, 40], ['J', 'r', 0, 0, 44, 'w1', 1], ['h', 14, 44], ['t1', 40, 10], ['J', 't1', T1, 0, 13, 'tmp', 1], ['t2', 28, 9], ['J', 't2', T2, 0, 10, 'tip', 1], ['t3', 8, 7]],
  };
  let FRM = {}, JA = {};
  const gp = q => {
    if (q[0] === 'J') { const F = FRM[q[1]], a = q[6] * 90 + JA[q[5]] / 2; return F.map([q[2] + q[4] * Math.cos(rad(a)), q[3] + q[4] * Math.sin(rad(a))]); }
    if (q[0] === 'LB') {   // the lateral band crosses the PIP joint dorsal to its axis, or volar to it (lbv), or bowstrung (lbd)
      const a0 = -90 + JA.pip / 2, a1 = 90 + JA.pip / 2, rD = 6 + 6 * h.q.lbd, PD = polar([L1, 0], rD, a0), PV = polar([L1, 0], 7, a1);
      return FRM['1'].map([lerp(PD[0], PV[0], h.q.lbv), lerp(PD[1], PV[1], h.q.lbv)]);
    }
    return FRM[q[0]].map([q[1], q[2]]);
  };
  const route = k => R[k].map(gp);
  // drawn tendons: a pale band with tick marks at material points (every 22 px from the insertion)
  const TEN = {}, tenCol = mix(ANAT.tendon, COL.board, .12);
  const mkTen = (par, k, w) => { const t = { glow: path(par, '', { stroke: ANAT.taut, 'stroke-width': w * 2.6, 'stroke-opacity': 0 }), a: path(par, '', { stroke: tenCol, 'stroke-width': w }), b: path(par, '', { stroke: tenCol, 'stroke-width': w }), ticks: path(par, '', { stroke: mix(ANAT.tendon, '#000000', .45), 'stroke-width': 1.3, 'stroke-opacity': .75 }), w, k, pts: [], L: 0, T: null, taut: 0 }; TEN[k] = t; return t; };
  if (tendons) { mkTen(tenG, 'fds', 5.5); mkTen(tenG, 'fdp', 6); mkTen(extG, 'lb', 3.6); mkTen(extG, 'ed', 6); if (thumb) mkTen(thG, 'fpl', 4.5); }
  h.TEN = TEN;
  // pulleys over the flexor tendons, the transverse carpal ligament, the extensor retinaculum and a sagittal band
  const PUL = tendons ? [['1', -4, 12, 13, 25, 'A1'], ['1', 25, 53, 7, 20, 'A2'], ['2', -3, 7, 9, 17, 'A3'], ['2', 21, 35, 5.5, 15.5, 'A4'], ['3', -1, 6, 7, 13.5, 'A5']].map(([k, x0, x1, y0, y1, n]) => {
    const e = mk('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 3, fill: CAPS_C, 'fill-opacity': .5, stroke: mix(CAPS_C, '#000000', .35), 'stroke-width': 1.2 }, pulG);
    return { e, k, n, c: [(x0 + x1) / 2, y1] };
  }) : [];
  const tcl = tendons ? path(pulG, '', { stroke: CAPS_C, 'stroke-width': 7, 'stroke-opacity': .75 }) : null;
  const ret = tendons ? path(extG, '', { stroke: CAPS_C, 'stroke-width': 7, 'stroke-opacity': .7 }) : null;
  const sag = tendons ? path(extG, '', { stroke: CAPS_C, 'stroke-width': 8, 'stroke-opacity': .32 }) : null;
  // intrinsics
  const I = {};
  if (intr) { I.io = bellyEl(intG, { col: ANAT.muscleDeep, w: 15, ta: .02, tb: .5, tw: 3 }); I.lum = bellyEl(intG, { w: 10, ta: .02, tb: .5, tw: 2.6 }); }
  Object.assign(h, I);
  // ligaments
  const LG = {};
  if (ligs) { LG.vpMP = ligBand(ligG, { rest: 1, w: 5 }); LG.vpPIP = ligBand(ligG, { rest: 1, w: 4.5 }); LG.clMP = ligBand(ligG, { rest: 1, w: 5 }); }
  Object.assign(h, LG);
  const LGP = { vpMP: [['h', 198, 13], ['1', 9, 13.5], -10], vpPIP: [['1', 78, 8.5], ['2', 6, 10], -10], clMP: [['h', MPX - 2, -10], ['1', 10, -1], 70] };
  // the thumb, in front: trapezium, metacarpal, two phalanges, the thenar muscles and the adductor
  const TG = {};
  if (thumb) {
    const tsk = skin ? [skinCap(thG, 24, 19), skinCap(thG, 18, 16), skinCap(thG, 16, 13)] : [];
    if (skin) tsk.forEach(c => c.e.setAttribute('opacity', .6));
    h.tsk = tsk;
    const tb = mk('g', {}, thG);
    TG.tz = mk('g', {}, tb); bone(TG.tz, [[-14, -10], [8, -12], [14, 0], [8, 12], [-12, 12]], mix(ANAT.bone, '#f6d9a8', .3));
    TG.t1 = mk('g', {}, tb); bone(TG.t1, [[2, -12], [14, -9], [56, -7], [88, -9], ...arcPts([T1, 0], 11, -115, 115, 10), [88, 9], [56, 7], [14, 9], [2, 12], [6, 0]]); cart(TG.t1, [T1, 0], 10, -100, 100);
    TG.t2 = mk('g', {}, tb); phal(TG.t2, T2, 12.5, 8.5, [[18, -9], [44, -7.5], [56, -8]], [[56, 7.5], [44, 6.5], [18, 8], [6.6, 11]]);
    TG.t3 = mk('g', {}, tb); phal(TG.t3, T3, 10, 0, [[16, -6.5], [36, -5.5]], [[36, 5], [16, 6], [5, 9]], true);
    mk('ellipse', { cx: T1 - 3, cy: 12, rx: 4, ry: 3, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1 }, TG.t1);   // a sesamoid
    if (intr) { TG.then = bellyEl(thG, { w: 26, ta: .04, tb: .12, opacity: .85 }); TG.add = bellyEl(intG, { col: ANAT.muscleDeep, w: 22, ta: .03, tb: .15, opacity: .9 }); }
    Object.assign(h, { then: TG.then, add: TG.add });
  }
  Object.assign(BG, { t0: TG.tz, t1: TG.t1, t2: TG.t2, t3: TG.t3 });
  // rest state: tendon lengths taken with the hand straight; the forearm guide point and the length behind it
  const ORIG = { fdp: [-480, 34], fds: [-480, 46], ed: [-480, -34] };
  const geo = () => {
    const q = h.q, w1 = q.wr * .5, w2 = q.wr * .5;
    const Fr = hFrame([0, 0], 0), Fl = hFrame([0, 0], w1), Fh = hChild(Fl, C1, w2), F1 = hChild(Fh, [MPX, 0], q.mp), F2 = hChild(F1, [L1, 0], q.pip), F3 = hChild(F2, [L2, 0], q.dip);
    FRM = { r: Fr, l: Fl, h: Fh, '1': F1, '2': F2, '3': F3 };
    JA = { w1, w2, mp: q.mp, pip: q.pip, dip: q.dip, tmp: q.tmp, tip: q.tip };
    if (thumb) { const Ft1 = hChild(Fh, TC, 8 + q.tc), Ft2 = hChild(Ft1, [T1, 0], q.tmp), Ft3 = hChild(Ft2, [T2, 0], q.tip); Object.assign(FRM, { t0: hChild(Fh, TC, 8), t1: Ft1, t2: Ft2, t3: Ft3 }); }
  };
  h.fr = (k, P) => FRM[k].map(P);
  h.toLocal = (k, P) => { const F = FRM[k]; return rotPt(P[0] - F.o[0], P[1] - F.o[1], -F.a); };
  // put the thumb pad on a model point P: two-link IK (metacarpal, then the phalanges with the IP flexed tip°)
  h.thumbTo = (P, tip = 15) => {
    const T = h.toLocal('h', P), B = TC, l1 = T1, v2 = (() => { const w = rotPt(30, 11, tip); return [T2 + w[0], w[1]]; })(), l2 = Math.hypot(...v2), f2 = Math.atan2(v2[1], v2[0]) / rad(1);
    const d = clamp(Math.hypot(T[0] - B[0], T[1] - B[1]), 1, l1 + l2 - .5), base = Math.atan2(T[1] - B[1], T[0] - B[0]) / rad(1), c = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) / rad(1);
    const th1 = base - c, M = [B[0] + l1 * Math.cos(rad(th1)), B[1] + l1 * Math.sin(rad(th1))], dir = Math.atan2(T[1] - M[1], T[0] - M[0]) / rad(1);
    return { tc: th1 - 8, tmp: dir - th1 - f2, tip };
  };
  // a rupture: [material arc length from the insertion, gap, retraction of the proximal stump]
  h.cut = (k, at, { gap = 10, retract = 0 } = {}) => {
    const t = TEN[k]; if (!t) return;
    let best = 0, bd = 1e9; const L = t.L;
    for (let d = 0; d <= L; d += 2) { const P = polyAt(t.pts, d).p, dd = Math.hypot(P[0] - at[0], P[1] - at[1]); if (dd < bd) { bd = dd; best = d; } }
    h.cuts[k] = { s: L - best, gap, retract };   // measured from the insertion
    h.set();
  };
  h.uncut = k => { delete h.cuts[k]; h.set(); };
  h.act = (o = {}) => { for (const k in o) { const m = M[k + 'M'] || M[k] || I[k] || TG[k]; if (m) m.act(o[k]); } return h; };
  const drawTen = (t, P, actK) => {
    const L = polyLen(P), c = h.cuts[t.k];
    t.pts = P; t.L = L;
    if (!c) { t.a.setAttribute('d', smoothD(P, false)); t.b.setAttribute('d', ''); }
    else {   // the distal piece stays, the proximal one is shifted back along the route by the retraction
      const d0 = L - c.s - c.gap / 2, d1 = L - c.s + c.gap / 2;
      t.a.setAttribute('d', smoothD(polySlice(P, d1, L), false));
      const pr = polySlice(P, 0, Math.max(1, d0 - c.retract));
      t.b.setAttribute('d', pr.length > 1 ? smoothD(pr, false) : '');
    }
    let tk = '';
    for (let d = 12; d < L - 6; d += 26) {
      const sh = c && (L - d) > c.s ? c.retract : 0, { p: Q, t: v } = polyAt(P, d - sh);
      if (c && Math.abs((L - d) - c.s) < c.gap / 2 + 3) continue;
      tk += `M${f(Q[0] - v[1] * t.w * .42)} ${f(Q[1] + v[0] * t.w * .42)}L${f(Q[0] + v[1] * t.w * .42)} ${f(Q[1] - v[0] * t.w * .42)}`;
    }
    t.ticks.setAttribute('d', tk);
    const m = M[actK], lv = m ? Math.max(m.level, clamp(m.strain / .08, 0, 1)) : 0;
    t.taut = c ? 0 : lv;
    t.a.setAttribute('stroke', mix(tenCol, ANAT.taut, t.taut)); t.b.setAttribute('stroke', tenCol);
    t.glow.setAttribute('d', c ? '' : t.a.getAttribute('d')); t.glow.setAttribute('stroke-opacity', f(.35 * t.taut));
  };
  h.set = (o = {}) => {
    Object.assign(h.q, o);
    const q = h.q;
    geo();
    ['r', 'l', 'h', '1', '2', '3'].forEach(k => hT(BG[k], FRM[k]));
    scG.setAttribute('transform', `translate(${f(FRM.l.o[0])} ${f(FRM.l.o[1])}) rotate(${f(FRM.l.a + q.scaph)})`);
    if (sk) {
      sk.fore.set([-480, 3], [-14, 4]);
      sk.palm.set(FRM.l.map([2, 13]), FRM.h.map([MPX + 4, 12]));
      sk.f1.set(FRM['1'].map([2, 3]), FRM['1'].map([L1, 2])); sk.f2.set(FRM['2'].map([0, 2]), FRM['2'].map([L2, 2])); sk.f3.set(FRM['3'].map([0, 2]), FRM['3'].map([L3, 2]));
    }
    const ga = q.g || [q.mp, q.pip, q.dip];
    GH.forEach(({ c, k, segs }) => {
      const A = hChild(FRM.h, c, ga[0]), B = hChild(A, [L1 * k, 0], ga[1]), C = hChild(B, [L2 * k, 0], ga[2]);
      segs[0].set(A.o, B.o); segs[1].set(B.o, C.o); segs[2].set(C.o, C.map([L3 * k, 0]));
    });
    if (thumb) {
      ['t1', 't2', 't3'].forEach(k => hT(TG[k], FRM[k])); hT(TG.tz, FRM.t0);
      if (h.tsk.length) { h.tsk[0].set(FRM.t1.map([4, 6]), FRM.t1.map([T1, 3])); h.tsk[1].set(FRM.t2.map([0, 2]), FRM.t2.map([T2, 2])); h.tsk[2].set(FRM.t3.map([0, 2]), FRM.t3.map([T3, 2])); }
      if (TG.then) { TG.then.set([FRM.h.map([16, 44]), FRM.t1.map([26, 17]), FRM.t1.map([62, 14]), FRM.t2.map([6, 9])]); TG.add.set([FRM.h.map([150, 26]), FRM.h.map([100, 34]), FRM.t1.map([60, 4]), FRM.t2.map([4, 4])]); }
    }
    // tendons and their muscles
    for (const k in TEN) {
      const P = route(k), t = TEN[k];
      if (k === 'lb') { drawTen(t, P, 'edM'); continue; }
      const head = P.slice(1), Ld = polyLen(head);
      if (t.T === null) t.T = Ld + 70;
      const back = Math.max(8, t.T - Ld), MTJ = [P[1][0] - back, P[1][1]];   // the tendon runs straight back in the forearm
      h.exc[k] = (t.T - 70) - Ld;
      const m = M[k + 'M'];
      if (m && ORIG[k]) m.set([ORIG[k], MTJ]);
      drawTen(t, [MTJ, ...head], k + 'M');
    }
    if (tcl) { tcl.setAttribute('d', smoothD([FRM.l.map([-6, 50]), FRM.h.map([0, 48]), FRM.h.map([44, 42])], false)); }
    if (ret) ret.setAttribute('d', smoothD([[-46, -42], FRM.l.map([0, -37]), FRM.h.map([16, -32])], false));
    if (sag) { const a0 = -90 + q.mp / 2; sag.setAttribute('d', smoothD(arcPts([MPX, 0], 18, a0 - 4, a0 + 150, 12).map(P => FRM.h.map(P)), false)); }
    PUL.forEach(pl => hT(pl.e, FRM[pl.k]));
    // intrinsics: the interosseous from the metacarpal, the lumbrical from the FDP tendon in the palm
    if (I.io) I.io.set([FRM.h.map([70, 4]), FRM.h.map([160, 8]), gp(['J', 'h', MPX, 0, 11, 'mp', 1]), FRM['1'].map([20, 1]), FRM['1'].map([34, -7])]);
    if (I.lum && TEN.fdp) {
      const t = TEN.fdp, O = h.lumS !== null ? polyAt(t.pts, t.L - h.lumS).p : FRM.h.map([120, 21]);
      I.lum.set([O, FRM.h.map([172, 18]), gp(['J', 'h', MPX, 0, 14, 'mp', 1]), FRM['1'].map([16, 5]), FRM['1'].map([30, -7])]);
    }
    for (const k in LG) { const [A, B] = LGP[k]; LG[k].set(FRM[A[0]].map(A.slice(1)), FRM[B[0]].map(B.slice(1))); }
    if (M.wext) { M.wext.set([[-480, -40], [-150, -36], FRM.l.map([0, -30]), FRM.h.map([70, -20])]); M.wflx.set([[-480, 40], [-150, 40], FRM.l.map([0, 36]), FRM.h.map([70, 18])]); }
    // stage points
    const tp = (k, d) => TEN[k] ? polyAt(TEN[k].pts, TEN[k].L - d).p : [0, 0];
    Object.assign(h.pts, {
      C0: [0, 0], C1: FRM.l.map(C1), MP: FRM.h.map([MPX, 0]), PIP: FRM['1'].map([L1, 0]), DIP: FRM['2'].map([L2, 0]), tip: FRM['3'].map([L3 + 8, 2]),
      pad: FRM['3'].map([30, 12]), nail: FRM['3'].map([30, -11]), palm: FRM.h.map([130, 42]), dorsum: FRM.h.map([130, -22]), grip: FRM.h.map([175, 66]),
      radius: [-90, 0], lunate: FRM.l.map([0, 0]), capitate: FRM.h.map([30, 0]), mc: FRM.h.map([140, 0]), p1: FRM['1'].map([50, 0]), p2: FRM['2'].map([30, 0]), p3: FRM['3'].map([22, 0]),
      fdp: tp('fdp', 150), fds: tp('fds', 120), ed: TEN.ed ? polyAt(TEN.ed.pts, TEN.ed.L - 200).p : [0, 0], cs: tp('ed', 30), lb: tp('lb', 95), tt: tp('lb', 25),
      lum: I.lum ? I.lum.mid(.3) : [0, 0], io: I.io ? I.io.mid(.25) : [0, 0], fpl: TEN.fpl ? polyAt(TEN.fpl.pts, TEN.fpl.L - 70).p : [0, 0],
      ...Object.fromEntries(Object.keys(LG).map(k => [k, LG[k].mid])),
      ...Object.fromEntries(PUL.map(pl => [pl.n, FRM[pl.k].map(pl.c)])),
      tcl: FRM.h.map([10, 50]), ret: FRM.l.map([0, -39]), sag: FRM.h.map([MPX - 6, -6]),
      fdpM: M.fdpM ? M.fdpM.mid(.6) : [0, 0], fdsM: M.fdsM ? M.fdsM.mid(.6) : [0, 0], edM: M.edM ? M.edM.mid(.6) : [0, 0],
      ...(thumb ? { tCMC: FRM.t1.o, tMP: FRM.t2.o, tIP: FRM.t3.o, tTip: FRM.t3.map([T3 + 6, 2]), tPad: FRM.t3.map([30, 11]), then: TG.then ? TG.then.mid(.45) : FRM.t1.o, add: TG.add ? TG.add.mid(.4) : FRM.t1.o } : {}),
    });
    h.onSet.forEach(fn => fn(h));
    return h;
  };
  h.at = k => { const S0 = st(g0), P0 = Array.isArray(k) ? k : h.pts[k], P = flip ? [P0[0], -P0[1]] : P0, v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  // rest lengths: muscles with the hand straight (finger flexors a little shorter), ligaments at their angles
  h.set({ wr: 0, mp: 0, pip: 0, dip: 0, tc: 0, tmp: 0, tip: 0 });
  for (const k in M) if (M[k].last) M[k].rest = polyLen(M[k].pts) * (k === 'edM' ? 1.0 : 1.04);
  if (I.lum && TEN.fdp) { const t = TEN.fdp, O = FRM.h.map([120, 21]); let best = 0, bd = 1e9; for (let d = 0; d <= t.L; d += 2) { const P = polyAt(t.pts, d).p, dd = Math.hypot(P[0] - O[0], P[1] - O[1]); if (dd < bd) { bd = dd; best = d; } } h.lumS = t.L - best; }
  for (const k in I) I[k].rest = null;
  if (TG.then) { TG.then.rest = null; TG.add.rest = null; }
  for (const k in LG) {
    const [A, B, ang] = LGP[k], save = { ...h.q };
    h.set(k === 'vpPIP' ? { pip: ang } : { mp: ang });
    LG[k].rest = Math.hypot(...[0, 1].map(i => FRM[A[0]].map(A.slice(1))[i] - FRM[B[0]].map(B.slice(1))[i]));
    Object.assign(h.q, save);
  }
  h.set({ wr: 0, mp: 15, pip: 20, dip: 10, tc: 0, tmp: 5, tip: 5 });
  if (t0 !== null) show(g0, t0);
  return h;
}
// The right wrist and hand seen from the back (view 'back': the thumb to the left) or from the palm (view 'palm':
// mirrored, the thumb to the right); fingers up, (x, y) is the middle of the radiocarpal joint. Shaded bones (radius,
// ulna, the eight carpals, metacarpals, phalanges) under translucent skin. set({ dev, f, spread, drift, cup, shift,
// rabd, pabd, tmp, tip, opp, oppTo }):
//   dev — radial (−) / ulnar (+) deviation in degrees (the hand turns about the capitate head, the proximal row half as
//   much and slides the other way; the scaphoid shortens in radial deviation); f — finger flexion: { 2: [mp, pip, dip],
//   … } or one [mp, pip, dip] for all (segments foreshorten; flexed segments pass behind the palm in the back view);
//   spread — finger abduction (deg); drift — ulnar drift at the MP joints (deg); cup — 0..1, the 4th and 5th
//   metacarpals fold toward the middle; shift — ulnar translation of the carpus (px); rabd — thumb radial abduction
//   (deg), pabd — palmar abduction 0..1 (the metacarpal foreshortens), tmp / tip — thumb MP / IP flexion (deg, toward
//   the palm); opp 0..1 — opposition toward the pad of finger oppTo (2–5).
// tendons: 'ext' (back) — ED to each finger, EI, EDM, EPL, EPB, APL, ECRL, ECRB, ECU, the dorsal retinaculum and
// juncturae; 'flex' (palm) — FDS + FDP pairs, FPL, FCR, FCU, PL, the transverse carpal ligament. Methods: zones(kind, t0)
// — flexor ('flex') or extensor ('ext') zones; tunnel(t0) — the carpal tunnel and the canal of Guyon with the nerves;
// intr(t0, which) — intrinsic muscles; implant(kind, t0) — 'wrist' | 'mp' | 'lrti'; dot(names, col, t0) / swell(name,
// col, t0) as in handMap. pts: R U S L Tri P Tm Tz C H hook W palm lister MC1–MC5 CMC1 MP1–MP5 PIP2–5 DIP2–5 IP1
// TIP1–TIP5 PAD2–PAD5 tunnel guyon; at(k) — a stage point.
function handFront(p, x, y, s = 1, t0 = .2, { view = 'back', tendons = null, skin = true, bones = true } = {}) {
  const g0 = G(p, { x, y, s, o: 0 }), palmV = view === 'palm', g = mk('g', palmV ? { transform: 'scale(-1 1)' } : {}, g0), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const h = { g: g0, view, q: { dev: 0, f: [5, 8, 4], spread: 0, drift: 0, cup: 0, shift: 0, rabd: 0, pabd: 0, tmp: 8, tip: 6, opp: 0, oppTo: 2, oppPt: null }, pts: {}, onSet: [] };
  const PIV = [-8, -38], SKC = '#62796e', SL = '#a9c2b6', RCOL = mix(ANAT.bone, '#f6d9a8', .25);
  const skinFill = (par, col = SKC) => {
    const id = 'sk' + (++SHADE_ID), gr = mk('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [[0, mix(col, '#ffffff', .32)], [.5, col], [1, mix(col, '#000000', .1)]].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
    return mk('path', { fill: `url(#${id})`, stroke: SL, 'stroke-width': 1.6, 'stroke-opacity': .85, 'stroke-linejoin': 'round' }, par);
  };
  const skinCap = (par, ra, rb) => { const e = skinFill(par); return { e, set(A, B) { e.setAttribute('d', capsuleD(A, B, ra, rb)); } }; };
  const bone = (par, P, col = ANAT.bone, op = 1) => boneSh(par, defs, P, { ax: [0, 0, 1, 0], col, op });
  // layers
  const foreSk = mk('g', { opacity: skin ? .78 : 0 }, g), handSkG = mk('g', {}, g), foreB = mk('g', { opacity: bones ? 1 : 0 }, g), proxG = mk('g', { opacity: bones ? 1 : 0 }, g), handG = mk('g', {}, g);
  const backF = mk('g', {}, handSkG), palmSk = mk('g', { opacity: skin ? .78 : 0 }, handSkG), distG = mk('g', { opacity: bones ? 1 : 0 }, handG), objL = mk('g', {}, handG), thumbG = mk('g', {}, handG), frontF = mk('g', {}, handG), handOv = mk('g', {}, handG);
  const tenL = mk('g', {}, g), ovL = mk('g', {}, g);
  Object.assign(h, { handG, handOv, ovL, tenL, proxG, objL });
  // forearm
  const fsk = skinFill(foreSk); fsk.setAttribute('d', 'M-74 260L-72 40C-70 20 -66 8 -60 0L48 0C54 10 56 22 56 40L58 260Z');
  bone(foreB, [[-60, 260], [-56, 70], [-62, 30], [-68, 6], [-64, -6], [-48, -4], [-30, -8], [-12, -5], [-2, -3], [0, 8], [-4, 32], [-14, 70], [-18, 260]], RCOL);
  bone(foreB, [[6, 260], [10, 70], [6, 32], [6, 12], [12, 3], [26, 1], [38, 4], [42, 14], [36, 26], [30, 70], [28, 260]]);
  path(foreB, 'M-64 -4C-44 -10 -22 -9 -2 -3', { stroke: CART_C, 'stroke-width': 3, 'stroke-opacity': .85 });
  mk('path', { d: 'M4 -2C12 -6 26 -6 34 -2', fill: 'none', stroke: CAPS_C, 'stroke-width': 4, 'stroke-opacity': .8 }, foreB);   // the articular disc
  // carpals: proximal row (moves half), distal row with the hand
  const CB = {
    S: [proxG, [[-54, -8], [-40, -6], [-26, -14], [-18, -30], [-24, -42], [-38, -40], [-50, -28], [-58, -16]]],
    L: [proxG, [[-18, -6], [-2, -6], [6, -14], [4, -30], [-6, -34], [-16, -30], [-20, -18]]],
    Tri: [proxG, [[8, -10], [24, -6], [34, -14], [34, -26], [24, -34], [10, -30], [6, -20]]],
    Tm: [distG, [[-62, -36], [-46, -40], [-40, -50], [-44, -64], [-56, -66], [-68, -54], [-68, -42]]],
    Tz: [distG, [[-40, -42], [-28, -44], [-24, -56], [-28, -66], [-40, -66], [-44, -54]]],
    C: [distG, [[-22, -34], [-8, -34], [0, -40], [4, -56], [2, -70], [-12, -72], [-22, -66], [-24, -50]]],
    H: [distG, [[4, -34], [18, -34], [32, -38], [34, -52], [26, -66], [10, -68], [6, -56]]],
  };
  const CE = {};
  for (const k in CB) { const [par, P] = CB[k]; CE[k] = bone(par, P, k === 'S' || k === 'Tm' ? mix(ANAT.bone, '#f6d9a8', .3) : ANAT.bone); }
  const pis = mk('ellipse', { cx: 28, cy: -18, rx: 9, ry: 8, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.6, opacity: palmV ? 1 : .35 }, proxG);
  const hook = mk('path', { d: 'M18 -44Q30 -46 28 -56', fill: 'none', stroke: mix(ANAT.bone, '#000000', .35), 'stroke-width': 4, 'stroke-linecap': 'round', opacity: palmV ? 1 : .3 }, distG);
  Object.assign(h, { CE, pis });
  // metacarpals [base, head] and fingers: direction (deg from vertical, + ulnar) and phalanx lengths
  const MCD = { 1: [[-58, -64], [-100, -122]], 2: [[-32, -68], [-36, -176]], 3: [[-10, -72], [-10, -182]], 4: [[12, -68], [16, -174]], 5: [[30, -64], [40, -160]] };
  const FD = { 2: [-6, [64, 38, 26], 1], 3: [0, [72, 44, 29], 1.06], 4: [5, [67, 42, 28], 1], 5: [12, [52, 32, 25], .86] };
  const mcEl = {}, mcG = {};
  const longShape = (L, wb, ws, wh, tuft = false) => {
    const head = tuft ? [[L - 4, -wh], [L, -wh * .5], [L, wh * .5], [L - 4, wh]] : [[L - wh * 1.1, -wh * .85], ...arcPts([L - wh * .9, 0], wh, -100, 100, 20)].concat([[L - wh * 1.1, wh * .85]]);
    return [[0, -wb], [L * .25, -ws * 1.1], [L * .6, -ws], ...head, [L * .6, ws], [L * .25, ws * 1.1], [0, wb], [wb * .25, 0]];
  };
  for (const n of [5, 4, 3, 2, 1]) { mcG[n] = mk('g', {}, n === 1 ? thumbG : distG); const [A, B] = MCD[n], L = Math.hypot(B[0] - A[0], B[1] - A[1]); mcEl[n] = bone(mcG[n], longShape(L, n === 1 ? 10 : 9, n === 1 ? 6.5 : 5.5, n === 1 ? 8.5 : 7.5)); }
  // palm skin (with the thenar and hypothenar eminences)
  const psk = skinFill(palmSk); psk.setAttribute('d', smoothD([[50, 6], [52, -30], [58, -100], [54, -148], [44, -168], [20, -184], [-10, -192], [-38, -186], [-50, -168], [-58, -142], [-80, -112], [-86, -80], [-76, -40], [-64, 4]]));
  // fingers: per segment a skin capsule and a bone in its own group (scaled along the finger by the cosine of flexion)
  const W = { 1: [8, 5, 6.5], 2: [6.5, 4.2, 5.2], 3: [5.2, 3.5, 4.5] }, SR = [[13.5, 12], [12, 11], [11, 9.5]];
  const FG = {};
  for (const n of [5, 4, 3, 2]) {
    const k = FD[n][2], segs = [0, 1, 2].map(i => {
      const sg = mk('g', {}), sk = skin ? skinCap(sg, SR[i][0] * k, SR[i][1] * k) : null; if (sk) sk.e.setAttribute('opacity', .78);
      const bg = mk('g', { opacity: bones ? 1 : 0 }, sg), L = FD[n][1][i];
      bone(bg, longShape(L, ...W[i + 1].map(v => v * k), i === 2));
      const nail = i === 2 && skin ? mk('path', { d: '', fill: mix(SKC, '#ffffff', .35), 'fill-opacity': .5, stroke: SL, 'stroke-width': 1.2 }, sg) : null;
      return { sg, sk, bg, L, nail };
    });
    FG[n] = segs;
  }
  // thumb: metacarpal (above), two phalanges
  const TH = [0, 1].map(i => { const sg = mk('g', {}, thumbG), sk = skin ? skinCap(sg, i ? 12.5 : 15, i ? 10.5 : 13) : null; if (sk) sk.e.setAttribute('opacity', .78); const bg = mk('g', { opacity: bones ? 1 : 0 }, sg), L = i ? 36 : 46; bone(bg, longShape(L, i ? 6.5 : 8.5, i ? 4.5 : 5.5, i ? 5.5 : 6.5, !!i)); return { sg, sk, bg, L }; });
  const thSk = skin ? skinCap(thumbG, 17, 15) : null; if (thSk) { thSk.e.setAttribute('opacity', .6); thumbG.insertBefore(thSk.e, thumbG.firstChild); }
  thumbG.appendChild(mcG[1]); TH.forEach(t => thumbG.appendChild(t.sg));
  // geometry helpers
  const unit = a => [Math.sin(rad(a)), -Math.cos(rad(a))], add = (A, v, k) => [A[0] + v[0] * k, A[1] + v[1] * k];
  const placeBone = (bg, A, u, kx) => bg.setAttribute('transform', `translate(${f(A[0])} ${f(A[1])}) rotate(${f(Math.atan2(u[1], u[0]) / rad(1))}) scale(${f(kx)} 1)`);
  const handM = P => { const v = rotPt(P[0] - PIV[0], P[1] - PIV[1], h.q.dev); return [PIV[0] + v[0], PIV[1] + v[1]]; };   // hand-local → model
  h.handM = handM;
  const J = {};
  h.set = (o = {}) => {
    Object.assign(h.q, o);
    const q = h.q;
    [handG, handSkG].forEach(e => e.setAttribute('transform', `rotate(${f(q.dev)} ${PIV[0]} ${PIV[1]})`));
    proxG.setAttribute('transform', `translate(${f(-q.dev * .25 + q.shift)} 0) rotate(${f(q.dev * .5)} ${PIV[0]} ${PIV[1]})`);
    distG.setAttribute('transform', `translate(${f(q.shift)} 0)`);
    const sk = clamp(1 + .012 * q.dev, .7, 1.25);   // the scaphoid looks shorter in radial deviation
    CE.S.setAttribute('transform', `translate(-38 -24) scale(1 ${f(sk)}) translate(38 24)`);
    // metacarpals (the 4th and 5th fold in with cup)
    const heads = {};
    for (const n of [2, 3, 4, 5]) {
      const [A, B0] = MCD[n], B = n === 4 ? add(B0, [-5, 4], q.cup) : n === 5 ? add(B0, [-12, 8], q.cup) : B0;
      heads[n] = B; const L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      mcG[n].setAttribute('transform', `translate(${f(A[0])} ${f(A[1])}) rotate(${f(Math.atan2(u[1], u[0]) / rad(1))}) scale(${f(L / Math.hypot(MCD[n][1][0] - A[0], MCD[n][1][1] - A[1]))} 1)`);
      J['CMC' + n] = A; J['MC' + n] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    }
    // fingers
    for (const n of [2, 3, 4, 5]) {
      const fl = Array.isArray(q.f) ? q.f : (q.f[n] || [0, 0, 0]), a = FD[n][0] + q.drift * [0, 0, .7, .9, 1, 1.1][n] + q.spread * [0, 0, -1, -.15, .7, 1.4][n], u = unit(a);
      let P = add(heads[n], u, 5), phi = 0;
      J['MP' + n] = P;
      FG[n].forEach((sgm, i) => {
        phi += fl[i];
        const c = Math.cos(rad(phi)), Q = add(P, u, sgm.L * c);
        if (sgm.sk) sgm.sk.set(P, Q);
        placeBone(sgm.bg, P, u, Math.sign(c || 1) * Math.max(Math.abs(c), .18));
        if (sgm.nail) { const N0 = add(P, u, sgm.L * c * .55), N1 = add(P, u, sgm.L * c * .95), w = 6 * FD[n][2], nx = -u[1] * w, ny = u[0] * w, vis = !palmV && c > .3; sgm.nail.setAttribute('d', vis ? `M${f(N0[0] + nx)} ${f(N0[1] + ny)}L${f(N1[0] + nx * .8)} ${f(N1[1] + ny * .8)}Q${f(N1[0] + u[0] * 5)} ${f(N1[1] + u[1] * 5)} ${f(N1[0] - nx * .8)} ${f(N1[1] - ny * .8)}L${f(N0[0] - nx)} ${f(N0[1] - ny)}Z` : ''); }
        // in the back view a segment folded under (> 100°) passes behind the palm
        (palmV || phi < 100 ? frontF : backF).appendChild(sgm.sg);
        J[['PIP', 'DIP', 'TIP'][i] + n] = Q; P = Q;
      });
      J['PAD' + n] = add(P, u, -8);
    }
    // thumb: metacarpal from the trapezium, then two phalanges; opposition bends it toward a finger pad
    const B0 = MCD[1][0], fk = Math.cos(rad(55 * q.pabd));
    let a1 = -32 - q.rabd, a2 = a1 + q.tmp, a3 = a2 + q.tip, L1 = 70 * fk;
    if (q.opp > 0) {
      const T = q.oppPt || J['PAD' + q.oppTo] || J.PAD2, l1 = 70 * Math.cos(rad(44)), l2 = 46 + 36 * .97, d = Math.min(Math.hypot(T[0] - B0[0], T[1] - B0[1]), l1 + l2 - 1);
      const base = Math.atan2(T[0] - B0[0], -(T[1] - B0[1])) / rad(1), cA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), A1 = base - Math.acos(cA) / rad(1);
      const M1 = add(B0, unit(A1), l1), A2 = Math.atan2(T[0] - M1[0], -(T[1] - M1[1])) / rad(1);
      a1 = lerp(a1, A1, q.opp); a2 = lerp(a2, A2 - 8, q.opp); a3 = lerp(a3, A2 + 10, q.opp); L1 = lerp(L1, l1, q.opp);
    }
    const u1 = unit(a1), MP1 = add(B0, u1, L1);
    mcG[1].setAttribute('transform', `translate(${f(B0[0])} ${f(B0[1])}) rotate(${f(Math.atan2(u1[1], u1[0]) / rad(1))}) scale(${f(L1 / Math.hypot(MCD[1][1][0] - B0[0], MCD[1][1][1] - B0[1]))} 1)`);
    if (thSk) thSk.set(add(B0, u1, 18), MP1);
    let P = MP1;
    [a2, a3].forEach((a, i) => { const u = unit(a), Q = add(P, u, TH[i].L); if (TH[i].sk) TH[i].sk.set(P, Q); placeBone(TH[i].bg, P, u, 1); if (i === 0) J.IP1 = Q; else J.TIP1 = Q; P = Q; });
    Object.assign(J, { CMC1: B0, MP1, MC1: add(B0, u1, L1 / 2) });
    // stage points (hand-local points pass through the deviation)
    const loc = { S: [-38, -24], L: [-7, -20], Tri: [20, -20], P: [28, -18], Tm: [-54, -52], Tz: [-34, -54], C: [-10, -52], H: [20, -50], hook: [26, -52], palm: [0, -110], tunnel: [-8, -40], guyon: [36, -32] };
    const out = {};
    for (const k in J) out[k] = handM(J[k]);
    for (const k in loc) out[k] = handM(['S', 'L', 'Tri', 'P'].includes(k) ? [loc[k][0] - q.dev * .25 + q.shift, loc[k][1]] : [loc[k][0] + q.shift, loc[k][1]]);
    Object.assign(h.pts, out, { R: [-36, 30], U: [20, 30], W: [-6, 0], lister: [-30, 18] });
    h.J = J;
    if (h.tenUpd) h.tenUpd();
    h.onSet.forEach(fn => fn(h));
    return h;
  };
  h.at = k => { const S0 = st(g0), P0 = Array.isArray(k) ? k : h.pts[k], P = palmV ? [-P0[0], P0[1]] : P0, v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  // tendons (model space; recomputed on set)
  if (tendons) {
    const TL = [];
    const ten = (fn, w, col = ANAT.tendon) => { const e = path(tenL, '', { stroke: mix(col, COL.board, .1), 'stroke-width': w, 'stroke-opacity': .95 }); TL.push({ e, fn }); return e; };
    const P = k => h.pts[k], mid = (A, B, k = .5) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
    h.ten = {};
    if (tendons === 'ext') {
      h.ret = path(tenL, 'M-70 22L56 22', { stroke: CAPS_C, 'stroke-width': 22, 'stroke-opacity': .32 });
      [2, 3, 4, 5].forEach(n => { h.ten['ed' + n] = ten(() => [[-10 + n * 4, 200], [-14 + n * 6, 40], mid(P('CMC' + n), P('MP' + n), .3), P('MP' + n), P('PIP' + n), P('DIP' + n), mid(P('DIP' + n), P('TIP' + n), .25)], 4.5); });
      h.ten.ei = ten(() => [[-16, 200], [-10, 40], mid(P('CMC2'), P('MP2'), .4), mid(P('MP2'), P('PIP2'), .15)], 3.2);
      h.ten.edm = ten(() => [[34, 200], [32, 40], mid(P('CMC5'), P('MP5'), .4), mid(P('MP5'), P('PIP5'), .15)], 3.2);
      h.ten.epl = ten(() => [[-26, 200], [-30, 40], [-34, 8], [-44, -30], P('MC1'), P('MP1'), P('IP1'), mid(P('IP1'), P('TIP1'), .3)], 3.6);
      h.ten.epb = ten(() => [[-58, 200], [-64, 30], [-66, -20], P('MC1'), P('MP1'), mid(P('MP1'), P('IP1'), .2)], 3.2);
      h.ten.apl = ten(() => [[-50, 200], [-62, 30], [-68, -20], mid(P('CMC1'), P('MP1'), .12)], 3.6);
      h.ten.ecrl = ten(() => [[-44, 200], [-46, 30], mid(P('CMC2'), P('MP2'), .05)], 4.2);
      h.ten.ecrb = ten(() => [[-30, 200], [-32, 30], mid(P('CMC3'), P('MP3'), .05)], 4.2);
      h.ten.ecu = ten(() => [[24, 200], [30, 30], mid(P('CMC5'), P('MP5'), .04)], 4.2);
      h.jt = [3, 4].map(n => ten(() => [mid(P('CMC' + n), P('MP' + n), .72), mid(P('CMC' + (n + 1)), P('MP' + (n + 1)), .62)], 3));
    } else {
      [5, 4, 3, 2].forEach(n => {
        h.ten['fdp' + n] = ten(() => [[-14 + n * 5, 200], [-14 + n * 4, 0], mid(P('CMC' + n), P('MP' + n), .5), P('MP' + n), P('PIP' + n), P('DIP' + n), mid(P('DIP' + n), P('TIP' + n), .25)], 4.4, mix(ANAT.tendon, '#d9b860', .25));
        h.ten['fds' + n] = ten(() => [[-12 + n * 5, 200], [-12 + n * 4, 4], mid(P('CMC' + n), P('MP' + n), .5), P('MP' + n), mid(P('PIP' + n), P('DIP' + n), .4)], 5.2);
      });
      h.ten.fpl = ten(() => [[-30, 200], [-28, 10], [-36, -40], P('MC1'), P('MP1'), P('IP1'), mid(P('IP1'), P('TIP1'), .3)], 4.2);
      h.ten.fcr = ten(() => [[-40, 200], [-42, 20], mid(P('CMC2'), P('MP2'), .04)], 4.2);
      h.ten.fcu = ten(() => [[32, 200], [30, 20], P('P')], 4.2);
      h.ten.pl = ten(() => [[-8, 200], [-8, 10], [-8, -70]], 3.4);
      h.tcl = path(tenL, '', { stroke: CAPS_C, 'stroke-width': 18, 'stroke-opacity': .5 });
      TL.push({ e: h.tcl, fn: () => [P('Tm'), mid(P('Tm'), P('hook'), .5), P('hook')] });
    }
    h.tenUpd = () => TL.forEach(({ e, fn }) => e.setAttribute('d', smoothD(fn(), false)));
  }
  // zones: bands across the fingers and the hand with Roman numerals
  h.zones = (kind, t0z, { col = COL.task } = {}) => {
    const zAll = G(g0, { o: 0 }), zg = mk('g', palmV ? { transform: 'scale(-1 1)' } : {}, zAll), P = k => h.pts[k], mid = (A, B, k = .5) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)], cols = [mix(col, COL.board, .15), mix(col, COL.board, .55)];
    const band = (pts, i, w = 22) => path(zg, smoothD(pts, false), { stroke: cols[i % 2], 'stroke-width': w, 'stroke-opacity': .55, 'stroke-linecap': 'butt' });
    const label = (str, Q, dx) => T(zAll, str, { x: (palmV ? -1 : 1) * (Q[0] + dx), y: Q[1] + 6, size: 15, fill: COL.chalk, weight: 700, anchor: 'middle' });
    const fingersSeg = (a, b) => [2, 3, 4, 5].map(n => { const chain = [P('CMC' + n), P('MP' + n), P('PIP' + n), P('DIP' + n), P('TIP' + n)], at = v => { const i = Math.min(3, Math.floor(v)), k = v - i; return mid(chain[i], chain[i + 1], k); }; return [at(a), at((a + b) / 2), at(b)]; });
    const Z = kind === 'flex'
      ? [['I', 2.45, 4, 0], ['II', .88, 2.45, 1], ['III', .25, .88, 0]]
      : [['I', 2.82, 3.18, 0], ['II', 2.18, 2.82, 1], ['III', 1.82, 2.18, 0], ['IV', 1.18, 1.82, 1], ['V', .85, 1.18, 0], ['VI', .1, .85, 1]];
    Z.forEach(([n, a, b, i]) => { fingersSeg(a, b).forEach(pts => band(pts, i)); const Q = fingersSeg(a, b)[0][1]; label(n, Q, -30); });
    if (kind === 'flex') {
      band([[-62, -50], [-8, -56], [44, -50]], 1, 34); label('IV', [-62, -50], -18);
      band([[-66, 30], [-6, 34], [52, 30]], 0, 40); label('V', [-66, 34], -18);
      [['TI', P('IP1'), P('TIP1'), 0], ['TII', P('MP1'), P('IP1'), 1], ['TIII', P('CMC1'), P('MP1'), 0]].forEach(([n, A, B, i]) => { band([A, mid(A, B), B], i, 20); label(n, mid(A, B), -28); });
    } else {
      band([[-66, 16], [-6, 22], [54, 16]], 0, 38); label('VII', [-66, 18], -22);
      band([[-70, 110], [-6, 114], [56, 110]], 1, 60); label('VIII', [-70, 110], -24);
      [['TI', mid(P('IP1'), P('TIP1'), .1), mid(P('IP1'), P('MP1'), .1), 0], ['TII', P('IP1'), P('MP1'), 1], ['TIII', mid(P('MP1'), P('IP1'), .15), mid(P('MP1'), P('MC1'), .3), 0], ['TIV', mid(P('MP1'), P('MC1'), .3), mid(P('CMC1'), P('MC1'), .3), 1], ['TV', mid(P('CMC1'), P('MC1'), .3), mid(P('CMC1'), [-60, -40], .6), 0]].forEach(([n, A, B, i]) => { band([A, mid(A, B), B], i, 20); label(n, mid(A, B), -30); });
    }
    if (t0z !== null) show(zAll, t0z);
    return zAll;
  };
  // the carpal tunnel (transverse carpal ligament, median nerve) and the canal of Guyon (ulnar nerve), palm view
  h.tunnel = t0t => {
    const tg = G(ovL, { o: 0 }), P = k => h.pts[k];
    const mn = nerveLine(tg, [[-12, 200], [-14, 40], [-12, -40], [-14, -90], [-30, -120], [-36, -150]], null, { w: 8, n: 12 }); put(mn.g, { o: 1 });
    const un = nerveLine(tg, [[30, 200], [34, 40], [36, -30], [40, -90], [44, -130]], null, { w: 7, n: 12 }); put(un.g, { o: 1 });
    h.tclT = path(tg, smoothD([P('Tm'), [-8, -46], P('hook')], false), { stroke: CAPS_C, 'stroke-width': 22, 'stroke-opacity': .55 });
    path(tg, smoothD([P('P'), [40, -36], P('hook')], false), { stroke: CAPS_C, 'stroke-width': 8, 'stroke-opacity': .5 });
    Object.assign(h, { medN: mn, ulnN: un });
    if (t0t !== null) show(tg, t0t);
    return tg;
  };
  // intrinsic muscles (bellyEl), drawn at the current pose: thenar, hypothenar, add (palm view); di (dorsal interossei)
  h.intr = (t0i, which = ['then', 'hyp', 'add', 'lum']) => {
    const ig = G(handOv, { o: 0 }), M = {}, P = k => J[k], mid = (A, B, k = .5) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)], mkB = (k, o) => M[k] || (M[k] = bellyEl(ig, o));
    const place = () => {
    if (which.includes('add')) { mkB('add', { col: ANAT.muscleDeep, w: 30, ta: .04, tb: .2 }); M.add.set([mid(P('CMC3'), P('MC3'), 1.2), mid(P('MC2'), P('MC1'), .6), mid(P('MP1'), P('IP1'), .1)]); }
    if (which.includes('then')) { mkB('then', { w: 34, ta: .05, tb: .16 }); M.then.set([[-44, -50], mid(P('CMC1'), P('MP1'), .5), mid(P('MP1'), P('IP1'), .15)]); }
    if (which.includes('hyp')) { mkB('hyp', { w: 30, ta: .05, tb: .16 }); M.hyp.set([[30, -40], [48, -100], mid(P('MP5'), P('PIP5'), .2)]); }
    if (which.includes('lum')) [2, 3, 4, 5].forEach(n => { mkB('lum' + n, { w: 9, ta: .05, tb: .3 }); const side = n === 2 ? -1 : -1; M['lum' + n].set([mid(P('CMC' + n), P('MC' + n), 1.1), mid(P('MC' + n), P('MP' + n), .6), [P('MP' + n)[0] + side * 9, P('MP' + n)[1] - 6], [mid(P('MP' + n), P('PIP' + n), .4)[0] + side * 8, mid(P('MP' + n), P('PIP' + n), .4)[1]]]); });
    if (which.includes('di')) [[1, 2], [2, 3], [3, 4], [4, 5]].forEach(([a, b], i) => { mkB('di' + (i + 1), { col: ANAT.muscleDeep, w: 14, ta: .05, tb: .2 }); M['di' + (i + 1)].set([mid(P('MC' + a), P('MC' + b), .5), mid(mid(P('MC' + a), P('MP' + a)), mid(P('MC' + b), P('MP' + b)), .5), mid(P('MP' + b), P('MP' + a), i === 0 ? .15 : .5)]); });
    };
    place(); h.onSet.push(place);
    if (t0i !== null) show(ig, t0i);
    Object.assign(ig, { M });
    return ig;
  };
  h.implant = (kind, t0m, dur = .6) => {
    const ig = G(kind === 'wrist' ? ovL : handOv, { o: 0 });
    if (kind === 'mp') [2, 3, 4, 5].forEach(n => { const A = J['MP' + n], B = J['MC' + n], C = J['PIP' + n], a = Math.atan2(C[1] - A[1], C[0] - A[0]) / rad(1); const e = G(ig, {}); e.setAttribute('transform', `translate(${f(A[0])} ${f(A[1])}) rotate(${f(a)})`); mk('rect', { x: -10, y: -9, width: 20, height: 18, rx: 7, fill: SIL_C, 'fill-opacity': .9, stroke: mix(SIL_C, '#000000', .45), 'stroke-width': 1.5 }, e); mk('path', { d: 'M-10 -3L-44 -2L-44 2L-10 3ZM10 -3L34 -2L34 2L10 3Z', fill: SIL_C, 'fill-opacity': .85, stroke: mix(SIL_C, '#000000', .45), 'stroke-width': 1.2 }, e); });
    if (kind === 'lrti') {   // the trapezium removed, a rolled tendon in its place, a slip of FCR through the metacarpal base
      hide(CE.Tm, t0m ?? 0, dur);
      mk('path', { d: 'M-64 -48c6 -9 15 -3 11 6s-15 7 -13 -2s13 -11 17 -2s-6 12 -12 8', fill: 'none', stroke: ANAT.tendon, 'stroke-width': 4.5 }, ig);
      path(ig, smoothD([[-44, -30], [-50, -44], J.CMC1, [J.CMC1[0] + 8, J.CMC1[1] - 10], [-34, -70]], false), { stroke: ANAT.tendon, 'stroke-width': 4 });
    }
    if (kind === 'wrist') {
      mk('path', { d: 'M-50 -6C-30 -14 -10 -14 4 -6L2 4L-48 4Z', fill: boneGrad(defs, 0, 0, 0, 1, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, ig);
      mk('path', { d: 'M-28 4L-24 90L-18 90L-16 4Z', fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.4 }, ig);
      mk('ellipse', { cx: -22, cy: -22, rx: 28, ry: 12, fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.6 }, ig);
      mk('path', { d: 'M-52 -36L10 -36L8 -30L-50 -30Z', fill: boneGrad(defs, 0, 0, 0, 1, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.4 }, ig);
      mk('path', { d: 'M-14 -36L-12 -110L-6 -110L-4 -36Z', fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.4 }, ig);
      [[-40, -36, -44, -70], [4, -36, 10, -66]].forEach(([a, b, c, d]) => path(ig, `M${a} ${b}L${c} ${d}`, { stroke: '#7d8a92', 'stroke-width': 4 }));
    }
    if (t0m !== null) show(ig, t0m, dur);
    return ig;
  };
  h.dot = (names, c, t0d, { r = 9 } = {}) => { const dg = G(ovL, { o: 0 }); names.forEach(n => mk('circle', { cx: h.pts[n][0], cy: h.pts[n][1], r, fill: c, stroke: COL.board, 'stroke-width': 2 }, dg)); if (t0d !== null) show(dg, t0d); return dg; };
  h.swell = (n, c, t0d, { rx = 14, ry = 10 } = {}) => { const e = mk('ellipse', { cx: h.pts[n][0], cy: h.pts[n][1], rx, ry, fill: c, 'fill-opacity': .4, stroke: c, 'stroke-width': 2.5 }, ovL); put(e, { o: 0 }); if (t0d !== null) show(e, t0d); return e; };
  h.set({});
  if (t0 !== null) show(g0, t0);
  return h;
}

/* ---------- chapter 20: the hip (hipFront, hipSag) ---------- */
const FRAC_C = '#ff7a6b', HIPSK_C = '#4b5f57', HIPSL_C = '#6f857b';
// The pelvis, the lumbar spine and both legs from the front, drawn like an X-ray over a soft skin. Local unit R = 40;
// (x, y) is the midpoint between the two hip joint centres. The patient faces us: the right hip ('R') is on the screen
// left. set({ tilt, pivot, sx, sy, abdR, abdL, incR, incL, rotR, rotL, vgR, vgL, migR, migL }):
//   tilt — pelvic obliquity in degrees (+ = clockwise on screen: the left crest, screen right, drops);
//   pivot — 'R' | 'L' | null: the hip centre that stays put when the pelvis tilts (the stance hip);
//   abdR / abdL — femur angle from the vertical (+ = away from the midline); j.rel.R / j.rel.L — the hip abduction
//   relative to the pelvis (+ abduction, − adduction);
//   incR / incL — neck-shaft angle (125 normal); rotR / rotL — femoral rotation (+ internal): the neck foreshortens
//   in external rotation and the lesser trochanter shows; vgR / vgL — knee valgus (+) of the tibia;
//   migR / migL — the femoral head moving up into a narrowed joint (R units); sx, sy — shift of the pelvis;
//   knR / knL — knee flexion: the shank foreshortens (a leg lifted off the floor behind the body).
// Muscles (bellyEl, j.M.R / j.M.L): gmed, gmin, tfl (its long tendon is the IT band), add, ilio, ql, rf.
// Ligaments (ligBand, j.L.R / j.L.L): ifL, ifM (iliofemoral bands), pf (pubofemoral). Capsule j.C.R / j.C.L: sup, inf.
// Options: tibia (legs to the ankles), spine, skin, muscles (list), ligs, caps.
// Methods: implant(kind, side, t) 'tha' | 'bipolar' | 'uni' | 'screws' | 'dhs' | 'nail'; frac(kind, side, t)
// 'head' | 'subcap' | 'neck' | 'basi' | 'inter' | 'sub'; capsule(side, t) — the capsule's extent; oa(side, t);
// fai(kind, side, t) 'cam' | 'pincer' | 'tear'; bursa(kind, side, t) 'troch' | 'psoas' | 'isch'.
// at(name, side) — a stage point (H head top GT LT neck shaft K ankle ASIS AIIS crest isch sym SI L1..L5 lab acet
// pubis); fem(side, P), pel(P) — model points (R units) of the femur / pelvis frames; femG / pelF — groups.
function hipFront(p, x, y, s = 1, t0 = .2, { tibia = false, spine = true, skin = true, muscles = ['gmed', 'tfl', 'add', 'ilio'], ligs = false, caps = false } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const HW = 2.3, FLS = 8.9, NL = 1.7, SA = 8, TL = 8.8, SG = { R: -1, L: 1 }, SIDES = ['R', 'L'];
  const j = { g, R, q: { tilt: 0, pivot: null, sx: 0, sy: 0, abdR: 0, abdL: 0, incR: 125, incL: 125, rotR: 0, rotL: 0, vgR: 0, vgL: 0, migR: 0, migL: 0, knR: 0, knL: 0 },
    rel: { R: 0, L: 0 }, M: { R: {}, L: {} }, L: { R: {}, L: {} }, C: { R: {}, L: {} }, geo: {}, onSet: [] };
  const add = (A, v, k = 1) => [A[0] + v[0] * k, A[1] + v[1] * k], sc = (P, k) => [P[0] * k, P[1] * k];
  const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  // femur geometry in its own frame (R units, lateral = +x, head centre at the origin)
  const femGeo = (inc, rot) => {
    const sd = [-Math.sin(rad(SA)), Math.cos(rad(SA))], l = [Math.cos(rad(SA)), Math.sin(rad(SA))], n = dir(98 + inc);
    const m = [-n[1], n[0]], nl = NL * clamp(Math.cos(rad(12 - rot)) / Math.cos(rad(12)), .45, 1.03), H = [0, 0];
    const N = add(H, n, -nl), K = add(N, sd, FLS), lt = .42 * clamp((22 - rot) / 26, 0, 1.25);
    const Gt = add(add(N, l, .55), sd, -1.25), Gl = add(add(N, l, .95), sd, -.35), mid = sc(add(H, N), .5);
    const P = [add(add(H, m, .52), n, -.5), add(mid, m, .5), Gt, add(add(N, l, .82), sd, -.95), Gl, add(add(N, l, .6), sd, 1.2),
      add(add(N, l, .45), sd, 4.5), add(add(K, l, .58), sd, -2.4), add(add(K, l, 1.1), sd, -.8), add(add(K, l, 1.18), sd, -.1),
      add(add(K, l, .78), sd, .42), add(K, sd, .2), add(add(K, l, -.82), sd, .45), add(add(K, l, -1.22), sd, -.05),
      add(add(K, l, -1.12), sd, -.82), add(add(K, l, -.5), sd, -2.4), add(add(N, l, -.42), sd, 4.4), add(add(N, l, -.5), sd, 1.85),
      add(add(N, l, -.5 - lt), sd, 1.4), add(add(N, l, -.52), sd, .9), add(mid, m, -.5), add(add(H, m, -.52), n, -.5)];
    return { sd, l, n, m, N, K, Gt, Gl, H, P, LT: add(add(N, l, -.5 - lt), sd, 1.4), A: add(K, sd, .35 + TL) };
  };
  // layers
  const topMask = spine ? fadeMask(defs, 0, -7.4 * R, 0, -6.3 * R, [[0, '#000'], [1, '#fff']]) : fadeMask(defs, 0, -5.6 * R, 0, -4.4 * R, [[0, '#000'], [1, '#fff']]);
  const skinO = mk('g', { mask: topMask }, g), skinG = mk('g', { opacity: .55 }, skinO), spG = mk('g', spine ? { mask: topMask } : {}, g), pelG = mk('g', {}, g);
  const deepG = mk('g', spine ? { mask: topMask } : {}, g), capG = mk('g', {}, g), femW = mk('g', {}, g), pelF = mk('g', {}, g);
  const ligG = mk('g', {}, g), musG = mk('g', {}, g), topG = mk('g', {}, g);
  Object.assign(j, { skinG, spG, pelG, deepG, femW, pelF, ligG, musG, topG });
  // skin: trunk-and-hips silhouette + thigh and shank capsules (rebuilt on set)
  const skT = skin ? mk('path', { fill: shadeGrad(defs, HIPSK_C).url, stroke: HIPSL_C, 'stroke-width': 2, 'stroke-linejoin': 'round' }, skinG) : null;
  const skL = skin ? SIDES.map(() => [limbEl(skinG, defs, HIPSK_C, 2.15 * R, 1.38 * R, HIPSL_C), tibia ? limbEl(skinG, defs, HIPSK_C, 1.3 * R, .72 * R, HIPSL_C) : null]) : null;
  if (skin && !tibia) skinG.setAttribute('mask', fadeMask(defs, 0, 8.6 * R, 0, 10.8 * R, [[0, '#fff'], [1, '#000']]));
  // the pelvis (pelvis frame, R units)
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  const sacrum = [[-1.35, -2.55], [1.35, -2.55], [1.22, -1.6], [.95, -.6], [.55, .3], [.2, .78], [-.2, .78], [-.55, .3], [-.95, -.6], [-1.22, -1.6]];
  boneSh(pelG, defs, U(sacrum), { col: mix(ANAT.bone, '#c9d6e0', .2) });
  [[-.55, -1.9], [.55, -1.9], [-.48, -1.15], [.48, -1.15], [-.38, -.45], [.38, -.45]].forEach(([a, b]) => mk('circle', { cx: a * R, cy: b * R, r: .16 * R, fill: COL.board, opacity: .45 }, pelG));
  boneSh(pelG, defs, U([[-.16, .8], [.16, .8], [.1, 1.25], [0, 1.4], [-.1, 1.25]]));
  const INN = [[1.3, -2.6], [1.55, -3.35], [2.35, -3.92], [3.25, -3.82], [3.75, -3.18], [3.82, -2.4], [3.5, -1.92], [3.6, -1.36], [3.38, -.82], [3.22, -.42],
    [3.02, .45], [2.82, 1.22], [2.38, 1.86], [1.66, 1.98], [1.02, 1.66], [.14, 1.3], [.14, .56], [.65, .4], [1.6, .2], [2.0, -.42], [1.78, -1.22], [1.32, -1.72], [1.24, -2.2]];
  SIDES.forEach(sd => {
    const sg = SG[sd], P = INN.map(([a, b]) => [a * sg * R, b * R]);
    boneSh(pelG, defs, P, { ax: sg > 0 ? [1, 0, 0, 0] : [0, 0, 1, 0] });
    mk('ellipse', { cx: 1.42 * sg * R, cy: 1.05 * R, rx: .52 * R, ry: .36 * R, transform: `rotate(${-28 * sg} ${f(1.42 * sg * R)} ${f(1.05 * R)})`, fill: COL.board, opacity: .55, stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, pelG);
    path(pelG, smoothD(U([[1.62 * sg, .18], [2.0 * sg, -.42], [1.78 * sg, -1.22], [1.32 * sg, -1.72]]), false), { stroke: mix(ANAT.bone, '#000000', .35), 'stroke-width': 2.2 });   // the pelvic brim
    path(pelG, `M${f(1.3 * sg * R)} ${f(-2.58 * R)}L${f(1.24 * sg * R)} ${f(-1.75 * R)}`, { stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 2.5 });   // the SI joint
  });
  path(pelG, `M0 ${f(.56 * R)}V${f(1.3 * R)}`, { stroke: DISC_C, 'stroke-width': 4 });   // the symphysis disc
  // acetabular rims, cartilage and labrum over the heads (pelvis front layer)
  const lab = {}, rimG = {};
  SIDES.forEach(sd => {
    const sg = SG[sd], C = [HW * sg * R, 0], a0 = sg > 0 ? -168 : -12, a1 = sg > 0 ? -18 : -162;
    rimG[sd] = mk('g', {}, pelF);
    path(rimG[sd], smoothD(arcPts(C, 1.0 * R, a0, a1, 10), false), { stroke: mix(ANAT.bone, '#000000', .3), 'stroke-width': 5, 'stroke-opacity': .8 });
    path(rimG[sd], smoothD(arcPts(C, .95 * R, sg > 0 ? -150 : -30, sg > 0 ? -25 : -155, 10), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .8 });
    lab[sd] = mk('path', { d: ptsD([[3.18 * sg * R, -.32 * R], [3.48 * sg * R, -.52 * R], [3.3 * sg * R, -.04 * R]], true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.2 }, rimG[sd]);
    mk('path', { d: ptsD([[1.48 * sg * R, .62 * R], [1.4 * sg * R, .96 * R], [1.72 * sg * R, .78 * R]], true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.2 }, rimG[sd]);
  });
  Object.assign(j, { lab, rimG });
  // the lumbar column (rebuilt on set: it side-bends against the pelvic tilt so L1 stays level)
  const VB = [], VW = [.82, .85, .86, .84, .8], TP = [1.55, 1.75, 2.0, 1.85, 1.5], VH = .9;
  if (spine) for (let i = 0; i < 5; i++) {
    const vg = mk('g', {}, spG);
    const disc = mk('rect', { x: -VW[i] * R, y: -.12 * R, width: 2 * VW[i] * R, height: .26 * R, rx: .1 * R, fill: DISC_C, opacity: .8 }, vg);
    const body = mk('path', { d: smoothD(U([[-VW[i], -.2], [VW[i], -.2], [VW[i] + .06, -.5], [VW[i], -.82], [-VW[i], -.82], [-VW[i] - .06, -.5]])), fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, vg);
    path(vg, `M${f(-TP[i] * R)} ${f(-.45 * R)}Q0 ${f(-.62 * R)} ${f(TP[i] * R)} ${f(-.45 * R)}`, { stroke: ANAT.bone, 'stroke-width': .2 * R, 'stroke-linecap': 'round', 'stroke-opacity': .75 });
    mk('ellipse', { cx: 0, cy: -.5 * R, rx: .16 * R, ry: .26 * R, fill: mix(ANAT.bone, '#000000', .2), opacity: .7 }, vg);
    [-1, 1].forEach(k => mk('ellipse', { cx: k * .5 * VW[i] * R, cy: -.52 * R, rx: .14 * R, ry: .17 * R, fill: 'none', stroke: mix(ANAT.bone, '#000000', .4), 'stroke-width': 1.5 }, vg));
    VB.push(vg);
    void disc; void body;
  }
  const rib = spine ? path(spG, '', { stroke: ANAT.bone, 'stroke-width': .18 * R, 'stroke-opacity': .5, 'stroke-linecap': 'round' }) : null;
  // the femora (femur frames)
  const FB = {}, head = {}, tibG = {}, femP = {}, canal = {}, impL = {}, fxL = {};
  SIDES.forEach(sd => {
    const fg = mk('g', {}, femW);
    const tg = mk('g', {}, fg);
    if (tibia) {
      const tc = mix(ANAT.bone, '#f6d9a8', .2);
      boneSh(tg, defs, U([[1.15, .35], [1.05, .95], [.7, 1.55], [.42, 3.5], [.45, 7.8], [.62, 8.6], [.25, 8.95], [-.35, 8.95], [-.72, 8.75], [-.5, 7.8], [-.42, 3.5], [-.72, 1.5], [-1.12, .9], [-1.15, .35], [0, .28]]), { col: tc });
      boneSh(tg, defs, U([[.95, 1.0], [1.18, 1.15], [1.05, 1.6], [.95, 7.6], [1.05, 8.4], [.88, 8.95], [.7, 8.4], [.72, 7.6], [.8, 1.6]]), { col: tc, op: .85 });
      path(tg, `M${f(-1.1 * R)} ${f(.34 * R)}Q0 ${f(.22 * R)} ${f(1.12 * R)} ${f(.34 * R)}`, { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .8 });
    }
    femP[sd] = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2, 'stroke-linejoin': 'round' }, fg);
    canal[sd] = path(fg, '', { stroke: mix(ANAT.bone, '#000000', .18), 'stroke-width': .34 * R, 'stroke-opacity': .5, 'stroke-linecap': 'round' });
    const hg = mk('g', {}, fg);
    mk('circle', { cx: 0, cy: 0, r: .92 * R, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, hg);
    path(hg, smoothD(arcPts([0, 0], .86 * R, -170, -10, 10), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .75 });
    const pat = mk('ellipse', { rx: .62 * R, ry: .8 * R, fill: ANAT.bone, opacity: .35, stroke: mix(ANAT.bone, '#000000', .4), 'stroke-width': 1.2 }, fg);
    impL[sd] = mk('g', {}, fg); fxL[sd] = mk('g', {}, fg);
    FB[sd] = { fg, tg, pat }; head[sd] = hg;
  });
  Object.assign(j, { head, impL, fxL, femP });
  // muscles, ligaments, capsule
  const MW = { gmed: [1.05, ANAT.muscle, .06, .12], gmin: [.7, ANAT.muscleDeep, .06, .2], tfl: [.62, ANAT.muscle, .03, .72], add: [1.05, ANAT.muscle, .1, .14],
    ilio: [.85, ANAT.muscle, .04, .14], ql: [.75, ANAT.muscleDeep, .08, .1], rf: [.9, ANAT.muscle, .1, .18] };
  SIDES.forEach(sd => {
    muscles.forEach(k => { if (k === 'ql' && !spine) return; const [w, col, ta, tb] = MW[k]; j.M[sd][k] = bellyEl(['ilio', 'gmin', 'ql'].includes(k) ? deepG : musG, { w: w * R, col, ta, tb, tw: k === 'tfl' ? 7 : 5 }); });
    if (ligs) ['ifL', 'ifM', 'pf'].forEach(k => { j.L[sd][k] = ligBand(ligG, { rest: null, w: 6 }); });
    if (caps) ['sup', 'inf'].forEach(k => { j.C[sd][k] = capEl(capG, { w: 5 }); });
  });
  // geometry per pose
  const pel = P => { const q = j.q, pv = q.pivot ? [HW * SG[q.pivot], 0] : [0, 0], v = rotPt(P[0] - pv[0], P[1] - pv[1], q.tilt); return [(pv[0] + v[0] + q.sx) * R, (pv[1] + v[1] + q.sy) * R]; };
  const Hc = sd => { const P = pel([HW * SG[sd], 0]); return [P[0], P[1] - j.q['mig' + sd] * R]; };
  const fem = (sd, P) => { const sg = SG[sd], H = Hc(sd), v = rotPt(sg * P[0] * R, P[1] * R, -sg * j.q['abd' + sd]); return [H[0] + v[0], H[1] + v[1]]; };
  const tib = (sd, P) => { const G0 = j.geo[sd], v = rotPt(P[0], P[1] * Math.cos(rad(j.q['kn' + sd])), -j.q['vg' + sd]); return fem(sd, [G0.K[0] + v[0], G0.K[1] + v[1]]); };
  Object.assign(j, { pel, fem, tib, Hc });
  let lastFem = {};
  const draw = () => {
    const q = j.q, tr = q.pivot ? `translate(${f(q.sx * R)} ${f(q.sy * R)}) rotate(${f(q.tilt)} ${f(HW * SG[q.pivot] * R)} 0)` : `translate(${f(q.sx * R)} ${f(q.sy * R)}) rotate(${f(q.tilt)})`;
    pelG.setAttribute('transform', tr); pelF.setAttribute('transform', tr);
    SIDES.forEach(sd => {
      const sg = SG[sd], key = q['inc' + sd] + ',' + q['rot' + sd];
      if (lastFem[sd] !== key) {
        const G0 = femGeo(q['inc' + sd], q['rot' + sd]); j.geo[sd] = G0; lastFem[sd] = key;
        femP[sd].setAttribute('d', smoothD(U(G0.P)));
        canal[sd].setAttribute('d', ptsD(U([add(G0.N, G0.sd, 2.2), add(G0.K, G0.sd, -2.6)])));
        FB[sd].pat.setAttribute('cx', f(G0.K[0] * R)); FB[sd].pat.setAttribute('cy', f((G0.K[1] - .55) * R));
      }
      const G0 = j.geo[sd], H = Hc(sd);
      FB[sd].fg.setAttribute('transform', `translate(${f(H[0])} ${f(H[1])}) rotate(${f(-sg * q['abd' + sd])}) scale(${sg} 1)`);
      FB[sd].tg.setAttribute('transform', `translate(${f(G0.K[0] * R)} ${f(G0.K[1] * R)}) rotate(${f(-q['vg' + sd])}) scale(1 ${Math.cos(rad(q['kn' + sd])).toFixed(3)})`);
      j.rel[sd] = q['abd' + sd] + sg * q.tilt;
    });
    // spine: L5 sits on S1 and the column bends back to vertical
    if (spine) {
      const W = [.15, .2, .22, .22, .21];
      let P = pel([0, -2.55]), a = q.tilt, cum = 0;
      for (let i = 0; i < 5; i++) {
        cum += W[i]; const a1 = q.tilt * (1 - cum), am = (a + a1) / 2;
        VB[i].setAttribute('transform', `translate(${f(P[0])} ${f(P[1])}) rotate(${f(am)})`);
        j.geo['L' + (5 - i)] = { P, a: am };
        P = [P[0] + Math.sin(rad(am)) * VH * R, P[1] - Math.cos(rad(am)) * VH * R]; a = a1;
      }
      j.geo.top = P;
      if (rib) rib.setAttribute('d', `M${f(P[0] - 1.6 * R)} ${f(P[1] + .1 * R)}Q${f(P[0] - 2.6 * R)} ${f(P[1] + .2 * R)} ${f(P[0] - 3.1 * R)} ${f(P[1] + .9 * R)}M${f(P[0] + 1.6 * R)} ${f(P[1] + .1 * R)}Q${f(P[0] + 2.6 * R)} ${f(P[1] + .2 * R)} ${f(P[0] + 3.1 * R)} ${f(P[1] + .9 * R)}`);
    }
    // muscles
    SIDES.forEach(sd => {
      const sg = SG[sd], G0 = j.geo[sd], M = j.M[sd], F = P => fem(sd, P), Pl = P => pel([P[0] * sg, P[1]]);
      if (M.gmed) M.gmed.set([Pl([2.55, -3.45]), Pl([3.55, -2.3]), F(add(G0.Gt, G0.l, .1))]);
      if (M.gmin) M.gmin.set([Pl([2.8, -2.5]), Pl([3.35, -1.35]), F(add(add(G0.Gt, G0.sd, .35), G0.l, -.1))]);
      if (M.tfl) M.tfl.set([Pl([3.8, -2.35]), F(add(add(G0.Gl, G0.l, .65), G0.sd, 1.2)), F(add(add(G0.K, G0.l, 1.05), G0.sd, -1.6)), tibia ? tib(sd, [1.0, .9]) : F(add(add(G0.K, G0.l, 1.15), G0.sd, .1))]);
      if (M.add) M.add.set([Pl([.6, 1.32]), Pl([1.05, 1.82]), F(add(add(G0.N, G0.l, -.55), G0.sd, 6.4))]);
      if (M.ilio) M.ilio.set([spine ? (() => { const L = j.geo.L3; return [L.P[0] + sg * .75 * R, L.P[1] - .5 * R]; })() : Pl([1.2, -3.0]), Pl([2.0, -1.55]), Pl([2.2, .2]), F(add(G0.LT, G0.l, .12))]);
      if (M.ql) { const T = j.geo.top; M.ql.set([Pl([1.75, -3.55]), [T[0] + sg * 1.45 * R, T[1] + .25 * R]]); }
      if (M.rf) M.rf.set([Pl([3.55, -1.3]), F(add(G0.N, G0.sd, 3.2)), F(add(G0.K, G0.sd, -.7))]);
      const L = j.L[sd];
      const lig = (e, A, B) => { if (!e) return; if (e.rest === null) e.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02; e.set(A, B); };
      lig(L.ifL, Pl([3.38, -1.0]), F(add(add(G0.N, G0.l, .45), G0.sd, .1)));
      lig(L.ifM, Pl([3.2, -.92]), F(add(add(G0.N, G0.l, -.38), G0.sd, 1.0)));
      lig(L.pf, Pl([1.75, .32]), F(add(add(G0.N, G0.l, -.42), G0.sd, .5)));
      const C = j.C[sd];
      if (C.sup) { const P = [Pl([3.25, -.45]), F(sc(G0.m, 1.05)), F(add(add(G0.N, G0.l, .5), G0.sd, -.25))]; C.sup.set(P, polyLen(P), F(G0.N)); }
      if (C.inf) { const P = [Pl([1.6, .72]), F(sc(G0.m, -1.05)), F(add(add(G0.N, G0.l, -.45), G0.sd, 1.25))]; C.inf.set(P, polyLen(P), F(G0.N)); }
    });
    // skin
    if (skin) {
      const T = spine ? j.geo.top : pel([0, -6.8]), hip = sd => { const G0 = j.geo[sd]; return fem(sd, add(G0.Gl, G0.l, 1.05)); };
      const P = [[T[0] - 3.35 * R, T[1] - .2 * R], pel([-3.95, -3.2]), hip('R'), fem('R', [-.3, 3.0]), pel([0, 2.55]), fem('L', [-.3, 3.0]), hip('L'), pel([3.95, -3.2]), [T[0] + 3.35 * R, T[1] - .2 * R], [T[0], T[1] - 1.5 * R]];
      skT.setAttribute('d', smoothD(P));
      SIDES.forEach((sd, i) => {
        const G0 = j.geo[sd], [th, sh] = skL[i];
        th.set(fem(sd, [.35, .6]), fem(sd, add(G0.K, G0.sd, .2)));
        if (sh) sh.set(tib(sd, [0, .6]), tib(sd, [0, TL - .1]));
      });
    }
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); j.onSet.forEach(fn => fn(j)); return j; };
  // rest lengths in the neutral pose: ligaments a little slack (set on their first draw), the capsule loose
  draw();
  SIDES.forEach(sd => Object.values(j.C[sd]).forEach(c => { c.rest *= 1.08; }));
  // named points
  const PN = {
    ASIS: [3.82, -2.4], AIIS: [3.6, -1.36], crest: [3.25, -3.82], isch: [2.38, 1.86], sym: [0, .9], pubis: [1.5, .3], SI: [1.28, -2.2], acet: [3.22, -.42], lab: [3.4, -.38], sacrum: [0, -1.4],
  };
  j.at = (name, sd = 'L') => {
    const sg = SG[sd], G0 = j.geo[sd];
    let P;
    if (PN[name]) P = pel([PN[name][0] * sg, PN[name][1]]);
    else if (/^L[1-5]$/.test(name)) { const L = j.geo[name]; P = L ? [L.P[0] + Math.sin(rad(L.a)) * .5 * R, L.P[1] - Math.cos(rad(L.a)) * .5 * R] : pel([0, -3]); }
    else {
      const FP = { H: [0, 0], head: [0, -.92], GT: G0.Gt, LT: G0.LT, neck: sc(add(G0.H, G0.N), .5), shaft: add(G0.N, G0.sd, 4.4), K: G0.K, Klat: add(G0.K, G0.l, 1.15), N: G0.N, Gl: G0.Gl };
      if (name === 'ankle') P = tib(sd, [0, TL]);
      else P = fem(sd, FP[name] || [0, 0]);
    }
    const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0);
    return [S0.x + v[0], S0.y + v[1]];
  };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  // implants and fixation devices (femur frame; acetabular parts in the pelvis front layer)
  j.implant = (kind, sd, t, dur = .6, { fix = null } = {}) => {
    const G0 = j.geo[sd], sg = SG[sd], ig = mk('g', { opacity: 0 }, impL[sd]), F = P => sc(P, R);
    const stem = () => {
      const a = add(G0.N, G0.sd, -.2), P = [add(add(a, G0.l, .45), G0.sd, -.1), add(add(G0.N, G0.l, .3), G0.sd, 1.4), add(add(G0.N, G0.l, .18), G0.sd, 5.0), add(add(G0.N, G0.l, -.02), G0.sd, 5.4),
        add(add(G0.N, G0.l, -.2), G0.sd, 5.0), add(add(G0.N, G0.l, -.3), G0.sd, 1.6), add(add(G0.N, G0.l, -.45), G0.sd, .6)];
      if (fix === 'cem') mk('path', { d: smoothD(P.map(q => add(sc(add(q, sc(add(G0.N, G0.sd, 2.6), -1)), 1.22), add(G0.N, G0.sd, 2.6))).map(F)), fill: '#e8e0c4', 'fill-opacity': .8, stroke: '#b8ad86', 'stroke-width': 1.5 }, ig);
      implSh(ig, defs, P.map(F));
      if (fix === 'porous') for (let i = 0; i < 18; i++) { const q = add(add(G0.N, G0.sd, .3 + (i % 6) * .3), G0.l, -.22 + Math.floor(i / 6) * .22); mk('circle', { cx: f(q[0] * R), cy: f(q[1] * R), r: 3, fill: '#7d8f9c' }, ig); }
      const nk = [add(add(G0.N, G0.m, .18), G0.n, .2), add(G0.H, G0.m, .14), add(G0.H, G0.m, -.14), add(add(G0.N, G0.m, -.18), G0.n, .2)];
      implSh(ig, defs, nk.map(F));
    };
    const ball = r => mk('circle', { cx: 0, cy: 0, r: r * R, fill: ballGrad(defs, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, ig);
    let cupG = null;
    if (kind === 'tha' || kind === 'bipolar' || kind === 'uni') {
      hide(head[sd], t, dur);
      stem();
      if (kind === 'tha') {
        cupG = mk('g', { opacity: 0 }, pelF); const C = [HW * sg * R, 0];
        mk('path', { d: smoothD([...arcPts(C, 1.05 * R, sg > 0 ? -175 : -5, sg > 0 ? -5 : -175, 10), ...arcPts(C, .82 * R, sg > 0 ? -5 : -175, sg > 0 ? -175 : -5, 10)], true), fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, cupG);
        mk('path', { d: smoothD([...arcPts(C, .82 * R, sg > 0 ? -175 : -5, sg > 0 ? -5 : -175, 10), ...arcPts(C, .64 * R, sg > 0 ? -5 : -175, sg > 0 ? -175 : -5, 10)], true), fill: POLY_C, stroke: mix(POLY_C, '#000000', .4), 'stroke-width': 1.2 }, cupG);
        show(cupG, t, dur); ball(.62);
      } else if (kind === 'bipolar') { ball(.92); mk('circle', { r: .74 * R, fill: POLY_C, stroke: mix(POLY_C, '#000000', .4), 'stroke-width': 1.2 }, ig); ball(.55); }
      else ball(.92);
    }
    const screw = (A, B, w = 9) => { path(ig, `M${f(A[0] * R)} ${f(A[1] * R)}L${f(B[0] * R)} ${f(B[1] * R)}`, { stroke: '#8fa2b0', 'stroke-width': w, 'stroke-linecap': 'round' }); path(ig, `M${f(A[0] * R)} ${f(A[1] * R)}L${f(B[0] * R)} ${f(B[1] * R)}`, { stroke: '#dfe8ee', 'stroke-width': w * .3, 'stroke-dasharray': '3 4' }); };
    if (kind === 'screws') [-.42, 0, .42].forEach(k => { const B = add(add(G0.H, G0.m, k * .9), G0.n, .35); screw(add(B, G0.n, -(NL + 1.6)), B, 8); });
    if (kind === 'dhs' || kind === 'nail') {
      const B = add(G0.H, G0.n, .3), A = add(B, G0.n, -(NL + 1.9));
      screw(A, B, 13);
      if (kind === 'dhs') {
        const P0 = add(add(G0.N, G0.l, .62), G0.sd, .6), P1 = add(add(G0.N, G0.l, .62), G0.sd, 4.6);
        implSh(ig, defs, [add(P0, G0.l, -.02), add(P0, G0.l, .2), add(P1, G0.l, .2), add(P1, G0.l, -.02)].map(F));
        [1.6, 2.6, 3.6].forEach(k => screw(add(add(G0.N, G0.l, .82), G0.sd, k), add(add(G0.N, G0.l, -.5), G0.sd, k), 7));
      } else {
        const T0 = add(add(G0.Gt, G0.sd, -.15), G0.l, -.2), T1 = add(G0.N, G0.sd, 7.4);
        implSh(ig, defs, [add(T0, G0.l, -.22), add(T0, G0.l, .22), add(T1, G0.l, .16), add(T1, G0.l, -.16)].map(F));
        screw(add(add(G0.N, G0.l, .5), G0.sd, 6.6), add(add(G0.N, G0.l, -.5), G0.sd, 6.6), 7);
      }
    }
    show(ig, t, dur);
    return cupG ? Object.assign(ig, { cup: cupG }) : ig;
  };
  // fracture lines (femur frame)
  j.frac = (kind, sd, t, dur = .5) => {
    const G0 = j.geo[sd], fg = mk('g', { opacity: 0 }, fxL[sd]);
    const jag = (A, B) => { const P = []; for (let i = 0; i <= 8; i++) { const k = i / 8, d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(...d), nn = [-d[1] / L, d[0] / L], w = i % 2 ? .1 : -.1; P.push(add(add(A, d, k), nn, i === 0 || i === 8 ? 0 : w)); } return P; };
    const seg = {
      head: [add(add(G0.H, G0.m, .7), G0.n, .2), add(add(G0.H, G0.m, -.75), G0.n, .35)],
      subcap: [add(add(G0.H, G0.m, .62), G0.n, -.72), add(add(G0.H, G0.m, -.62), G0.n, -.72)],
      neck: [add(sc(add(G0.H, G0.N), .5), G0.m, .58), add(sc(add(G0.H, G0.N), .5), G0.m, -.58)],
      basi: [add(add(G0.N, G0.m, .6), G0.n, .25), add(add(G0.N, G0.m, -.6), G0.n, .25)],
      inter: [add(add(G0.Gt, G0.sd, .75), G0.l, .25), add(G0.LT, G0.sd, .2)],
      sub: [add(add(G0.N, G0.l, .5), G0.sd, 2.4), add(add(G0.N, G0.l, -.5), G0.sd, 2.9)],
    }[kind];
    const d = ptsD(U(jag(...seg)));
    path(fg, d, { stroke: FRAC_C, 'stroke-width': 9, 'stroke-opacity': .3, 'stroke-linejoin': 'round' });
    path(fg, d, { stroke: FRAC_C, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
    show(fg, t, dur);
    return fg;
  };
  // the capsule's extent: rim to the intertrochanteric line (pose at creation)
  j.capsule = (sd, t, dur = .5) => {
    const G0 = j.geo[sd], sg = SG[sd], cg = mk('g', { opacity: 0 }, topG), F = P => fem(sd, P), Pl = P => pel([P[0] * sg, P[1]]);
    const P = [Pl([3.3, -.62]), F(sc(G0.m, 1.12)), F(add(add(G0.N, G0.l, .62), G0.sd, -.35)), F(add(add(G0.N, G0.l, .5), G0.sd, .45)), F(add(add(G0.N, G0.l, -.55), G0.sd, 1.35)), F(sc(G0.m, -1.12)), Pl([1.55, .75]), Pl([1.9, -.2])];
    mk('path', { d: smoothD(P), fill: CAPS_C, 'fill-opacity': .22, stroke: CAPS_C, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }, cg);
    show(cg, t, dur);
    return cg;
  };
  j.oa = (sd, t, dur = 1.2) => {
    const sg = SG[sd], og = mk('g', { opacity: 0 }, pelF), C = [HW * sg * R, -.08 * R];
    path(og, smoothD(arcPts(C, 1.05 * R, sg > 0 ? -150 : -30, sg > 0 ? -30 : -150, 10), false), { stroke: '#ffffff', 'stroke-width': 7, 'stroke-opacity': .55 });
    [[3.42, -.62, 3.62, -.3, 3.3, -.28], [1.55, .55, 1.4, .85, 1.75, .7]].forEach(([a, b, c, d, e, h]) => mk('path', { d: ptsD([[a * sg * R, b * R], [c * sg * R, d * R], [e * sg * R, h * R]], true), fill: ANAT.bone, stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, og));
    const G0 = j.geo[sd], fo = mk('g', { opacity: 0 }, fxL[sd]);
    mk('path', { d: ptsD(U([add(add(G0.H, G0.m, .55), G0.n, -.65), add(add(G0.H, G0.m, .95), G0.n, -.55), add(add(G0.H, G0.m, .6), G0.n, -.95)]), true), fill: ANAT.bone, stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, fo);
    show(og, t, dur); show(fo, t, dur);
    prog(q => j.set({ ['mig' + sd]: .32 * q }), t, dur);
    return og;
  };
  j.fai = (kind, sd, t, dur = .6) => {
    const sg = SG[sd], G0 = j.geo[sd];
    let e;
    if (kind === 'cam') { e = mk('path', { opacity: 0, d: smoothD(U([add(add(G0.H, G0.m, .78), G0.n, -.35), add(add(G0.H, G0.m, 1.05), G0.n, -.95), add(add(G0.H, G0.m, .6), G0.n, -1.3)])), fill: mix(ANAT.bone, FRAC_C, .35), stroke: FRAC_C, 'stroke-width': 2 }, fxL[sd]); }
    if (kind === 'pincer') e = mk('path', { opacity: 0, d: ptsD([[3.05 * sg * R, -.8 * R], [3.78 * sg * R, -.55 * R], [3.55 * sg * R, -.05 * R], [3.2 * sg * R, -.3 * R]], true), fill: mix(ANAT.bone, FRAC_C, .35), stroke: FRAC_C, 'stroke-width': 2 }, rimG[sd]);
    if (kind === 'tear') e = path(rimG[sd], `M${f(3.25 * sg * R)} ${f(-.5 * R)}L${f(3.36 * sg * R)} ${f(-.22 * R)}`, { opacity: 0, stroke: FRAC_C, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    show(e, t, dur);
    return e;
  };
  j.bursa = (kind, sd, t, dur = .5) => {
    const sg = SG[sd], G0 = j.geo[sd];
    const P = kind === 'troch' ? fem(sd, add(G0.Gl, G0.l, .55)) : kind === 'psoas' ? pel([1.95 * sg, .25]) : pel([2.25 * sg, 2.05]);
    const e = mk('ellipse', { cx: f(P[0]), cy: f(P[1]), rx: .42 * R, ry: .62 * R, fill: BURSA_C, 'fill-opacity': .55, stroke: mix(BURSA_C, '#000000', .3), 'stroke-width': 1.5, opacity: 0 }, topG);
    show(e, t, dur);
    return e;
  };
  j.set({});
  if (t0 !== null) show(g, t0);
  return j;
}
// The lumbar spine, the pelvis and the leg from the side, facing right (anterior = +x), drawn like an X-ray over a
// soft skin; the far leg is a fainter copy behind. Local unit R = 40, (x, y) is the hip joint centre. Rotate the whole
// model for lying (put(j.g, { r: -90 }) — supine, head to the left; r: 90 — prone).
// set({ tilt, th, kn, an, th2, kn2, an2, trunk, disl }): tilt — pelvic tilt (+ anterior: the ASIS goes forward and
// down); th / th2 — thigh angle of the near / far leg from the vertical (+ forward); kn / kn2 — knee flexion; an / an2 —
// ankle dorsiflexion; trunk — extra lean of the lumbar column (+ forward flexion of the lumbar spine); disl — 0..1, the
// femoral head levering out of the socket backwards. j.hip — near hip flexion relative to the pelvis (th + tilt).
// The lumbar column keeps the trunk upright: its lordosis grows with anterior tilt. Muscles (bellyEl, j.M): ilio, rf,
// tfl, gmax, gmed, piri (piriformis and the short external rotators), ham, gast, abd (rectus abdominis), erect; j.M2 — far-leg copies of rf / ham / ilio
// when requested in far. Ligaments (ligBand, j.L): iliofem, ischfem. Capsule j.C: ant, post.
// Options: muscles (list), far (list of far-leg muscles), ligs, caps, skin, foot, farLeg, fade (where the column fades,
// R units above the hip), plant (keep the near ankle fixed: squats and lunges move the hip). j.stage(P) — model → stage.
// Methods: implant('tha', t); at(name) — a stage point (H GT K patella ankle heel toe ASIS AIIS PSIS crest isch pubis
// S1 L1..L5 knee2 ankle2 heel2 toe2 thigh shin top); pv(P), fm(P, far), tb(P, far) — model points in R units.
// Chapter 22: toes: true — the toes hinge at the MTP joints (q.mtp / q.mtp2, extension +; tt(P, far) — toe points);
// plant: 'ball' — the ball of the foot stays (heel raises); muscles 'sol' (soleus, under the gastrocnemius) and 'ta'.
function hipSag(p, x, y, s = 1, t0 = .2, { muscles = ['ilio', 'rf', 'gmax', 'ham'], far = [], ligs = false, caps = false, skin = true, foot = true, farLeg = true, fade = 8, plant = false, toes = false } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), root = mk('g', {}, g);
  const FL = 10, TL = 9, SL0 = 37.6;
  const j = { g, R, q: { tilt: 0, th: 0, kn: 0, an: 0, th2: 0, kn2: 0, an2: 0, trunk: 0, disl: 0, mtp: 0, mtp2: 0 }, M: {}, M2: {}, L: {}, C: {}, geo: {}, onSet: [], hip: 0 };
  const U = P => P.map(([a, b]) => [a * R, b * R]), add = (A, v, k = 1) => [A[0] + v[0] * k, A[1] + v[1] * k];
  // frames
  const pv = P => { const v = rotPt(P[0], P[1], j.q.tilt); return [v[0] * R, v[1] * R]; };
  const legT = (far) => { const q = j.q, th = far ? q.th2 : q.th, kn = far ? q.kn2 : q.kn, d = far ? 0 : q.disl; return { th, kn, off: [-1.35 * d, -.25 * d] }; };
  const fm = (P, far = false) => { const L = legT(far), v = rotPt(P[0], P[1], -L.th); return [(v[0] + L.off[0]) * R, (v[1] + L.off[1]) * R]; };
  const tb = (P, far = false) => { const L = legT(far), K = rotPt(0, FL, -L.th), v = rotPt(P[0], P[1], -L.th + L.kn); return [(K[0] + v[0] + L.off[0]) * R, (K[1] + v[1] + L.off[1]) * R]; };
  const ft = (P, far = false) => { const q = j.q, L = legT(far), an = far ? q.an2 : q.an, K = rotPt(0, FL, -L.th), A = rotPt(0, TL, -L.th + L.kn), v = rotPt(P[0], P[1], -L.th + L.kn - an); return [(K[0] + A[0] + v[0] + L.off[0]) * R, (K[1] + A[1] + v[1] + L.off[1]) * R]; };
  const tt = (P, far = false) => { const m0 = far ? j.q.mtp2 : j.q.mtp, v = rotPt(P[0] - 2.3, P[1] - .75, -m0); return ft([2.3 + v[0], .75 + v[1]], far); };
  Object.assign(j, { pv, fm, tb, ft, tt });
  // layers
  const topMask = fadeMask(defs, 0, -(fade + 1.2) * R, 0, -fade * R, [[0, '#000'], [1, '#fff']]);
  const skinF = mk('g', { opacity: .3 }, root), farG = mk('g', { opacity: farLeg ? .45 : 0 }, root), farMus = mk('g', {}, root);
  const skinO = mk('g', { mask: topMask }, root), skinG = mk('g', { opacity: .55 }, skinO);
  const spG = mk('g', { mask: topMask }, root), pelG = mk('g', {}, root), capG = mk('g', {}, root), femG = mk('g', {}, root), tibG = mk('g', {}, femG), footG = mk('g', {}, tibG);
  const pelF = mk('g', {}, root), ligG = mk('g', {}, root), solG = mk('g', {}, root), musG = mk('g', { mask: topMask }, root), topG = mk('g', {}, root);
  j.off = [0, 0]; j.root = root;
  Object.assign(j, { pelG, pelF, femG, tibG, footG, farG, musG, topG, spG });
  // skin
  const skT = skin ? mk('path', { fill: shadeGrad(defs, HIPSK_C).url, stroke: HIPSL_C, 'stroke-width': 2, 'stroke-linejoin': 'round' }, skinG) : null;
  const skN = skin ? [limbEl(skinG, defs, HIPSK_C, 2.4 * R, 1.35 * R, HIPSL_C), limbEl(skinG, defs, HIPSK_C, 1.32 * R, .72 * R, HIPSL_C), foot ? limbEl(skinG, defs, HIPSK_C, .7 * R, .45 * R, HIPSL_C) : null, toes ? limbEl(skinG, defs, HIPSK_C, .42 * R, .3 * R, HIPSL_C) : null] : null;
  const skFar = skin && farLeg ? [limbEl(skinF, defs, HIPSK_C, 2.3 * R, 1.3 * R, HIPSL_C), limbEl(skinF, defs, HIPSK_C, 1.25 * R, .7 * R, HIPSL_C), foot ? limbEl(skinF, defs, HIPSK_C, .68 * R, .44 * R, HIPSL_C) : null, toes ? limbEl(skinF, defs, HIPSK_C, .4 * R, .3 * R, HIPSL_C) : null] : null;
  // pelvis (pelvis frame): innominate, acetabulum, sacrum, coccyx
  const INNL = [[-2.45, -2.55], [-1.95, -3.55], [-.8, -4.1], [.7, -3.95], [1.65, -3.15], [1.95, -2.55], [1.62, -2.05], [1.72, -1.5], [1.25, -1.0], [1.15, -.35], [1.75, .05], [2.15, .45],
    [2.05, .95], [1.25, 1.2], [.45, 1.55], [-.35, 1.98], [-.95, 1.75], [-1.0, 1.05], [-1.25, .45], [-1.45, -.4], [-1.75, -1.15], [-2.3, -1.7]];
  const SAC = [[-2.3, -3.6], [-.95, -2.55], [-1.5, -1.6], [-2.1, -.6], [-2.5, .15], [-2.85, -.35], [-2.95, -1.55], [-2.8, -2.85]];
  const pelS = mk('g', {}, pelG);
  boneSh(pelS, defs, U(SAC), { col: mix(ANAT.bone, '#c9d6e0', .2) });
  boneSh(pelS, defs, U([[-2.48, .1], [-2.2, .8], [-2.0, 1.05], [-2.15, .55], [-2.32, .05]]));
  boneSh(pelS, defs, U(INNL));
  mk('ellipse', { cx: 1.0 * R, cy: .72 * R, rx: .55 * R, ry: .38 * R, transform: `rotate(20 ${f(1.0 * R)} ${f(.72 * R)})`, fill: COL.board, opacity: .5, stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5 }, pelS);
  mk('circle', { cx: 0, cy: 0, r: 1.0 * R, fill: mix(ANAT.bone, '#000000', .28), opacity: .55 }, pelS);
  const rimF = mk('g', {}, pelF);
  path(rimF, smoothD(arcPts([0, 0], 1.0 * R, -205, 25, 10), false), { stroke: mix(ANAT.bone, '#000000', .3), 'stroke-width': 5, 'stroke-opacity': .8 });
  path(rimF, smoothD(arcPts([0, 0], .95 * R, -190, 10, 10), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .75 });
  j.labA = mk('path', { d: ptsD(U([[.88, -.48], [1.18, -.62], [1.02, -.18]]), true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.2 }, rimF);
  j.labP = mk('path', { d: ptsD(U([[-.88, -.48], [-1.18, -.62], [-1.02, -.18]]), true), fill: LAB_C, stroke: mix(LAB_C, '#000000', .4), 'stroke-width': 1.2 }, rimF);
  // lumbar column (rebuilt on set)
  const VB = [];
  for (let i = 0; i < 5; i++) {
    const vg = mk('g', {}, spG);
    mk('rect', { x: -.05 * R, y: -.14 * R, width: 1.1 * R, height: .28 * R, rx: .1 * R, fill: DISC_C, opacity: .8 }, vg);
    mk('path', { d: smoothD(U([[0, -.2], [1.0, -.2], [1.06, -.5], [1.0, -.82], [0, -.82], [-.06, -.5]])), fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, vg);
    mk('path', { d: smoothD(U([[-.05, -.35], [-.5, -.32], [-.62, -.55], [-1.45, -.18], [-1.55, -.42], [-.75, -.88], [-.2, -.78]])), fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.6, opacity: .9 }, vg);
    VB.push(vg);
  }
  // femur, patella, tibia, fibula, foot (near), drawn again faintly for the far leg
  const FEM = [[.62, -.25], [.45, .55], [.55, 2.6], [.62, 5.4], [.48, 7.9], [.82, 8.9], [.78, 9.6], [.42, 10.05], [-.35, 10.1], [-.9, 9.65], [-.85, 9.0], [-.5, 8.3], [-.45, 5.5], [-.48, 2.6],
    [-.62, 1.5], [-1.0, .6], [-1.02, -.05], [-.7, -.6], [-.25, -.42]];
  const TIB = [[.8, .3], [.75, 1.0], [.78, 1.45], [.45, 2.6], [.42, 7.8], [.52, 8.75], [.2, 9.1], [-.45, 9.05], [-.55, 8.2], [-.45, 3.0], [-.75, 1.0], [-.88, .35], [0, .26]];
  const FIB = [[-.5, 1.0], [-.78, 1.05], [-.75, 1.5], [-.62, 8.4], [-.75, 9.4], [-.48, 9.35], [-.42, 8.4], [-.5, 1.6]];
  const FOOT = [[-.62, .35], [-.4, .02], [.3, -.05], [.8, .2], [2.3, .48], [3.0, .72], [3.05, .9], [1.9, .95], [.2, 1.0], [-.75, .9], [-.95, .55]];
  const legBones = (par, op = 1) => {
    const fg = mk('g', {}, par), tg = mk('g', {}, par), pg = mk('g', {}, par), og = mk('g', {}, tg);
    boneSh(tg, defs, U(FIB), { col: mix(ANAT.bone, '#f6d9a8', .2), op: .8 * op });
    boneSh(tg, defs, U(TIB), { col: mix(ANAT.bone, '#f6d9a8', .2), op });
    path(tg, `M${f(-.85 * R)} ${f(.32 * R)}Q0 ${f(.2 * R)} ${f(.8 * R)} ${f(.3 * R)}`, { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .7 });
    if (foot && !toes) boneSh(og, defs, U(FOOT), { op });
    if (foot && toes) { boneSh(og, defs, U([[-.62, .35], [-.4, .02], [.3, -.05], [.8, .2], [2.25, .47], [2.42, .72], [2.3, .97], [1.9, .95], [.2, 1.0], [-.75, .9], [-.95, .55]]), { op }); og.toe = mk('g', {}, og); boneSh(og.toe, defs, U([[2.3, .5], [3.0, .72], [3.05, .9], [2.95, .98], [2.32, .98], [2.2, .75]]), { op }); }
    boneSh(fg, defs, U(FEM), { op });
    mk('circle', { cx: 0, cy: 0, r: .92 * R, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5, opacity: op }, fg);
    path(fg, smoothD(U([[-.95, -.15], [-.6, -.62], [-.15, -.5]]), false), { stroke: mix(ANAT.bone, '#000000', .35), 'stroke-width': 2 });
    mk('ellipse', { rx: .32 * R, ry: .62 * R, fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.6, opacity: op }, pg);
    return { fg, tg, og, pg };
  };
  const farB = legBones(farG, 1), nearB = legBones(femG, 1);
  j.headN = nearB.fg.querySelector('circle');
  j.fg = nearB.fg; j.fg2 = farB.fg;   // femur groups (femur frame, R = 40) for extra drawings that move with the thigh
  // muscles, ligaments, capsule
  const MW = { ilio: [.9, ANAT.muscle, .04, .14], rf: [.95, ANAT.muscle, .08, .26], tfl: [.62, ANAT.muscle, .03, .7], gmax: [1.6, ANAT.muscle, .05, .12], gmed: [1.2, ANAT.muscleDeep, .05, .1],
    ham: [1.1, ANAT.muscle, .08, .18], gast: [1.0, ANAT.muscle, .1, .3], piri: [.7, ANAT.muscleDeep, .06, .12], abd: [.7, ANAT.muscle, .06, .06], erect: [.95, ANAT.muscleDeep, .06, .08], sol: [.95, ANAT.muscleDeep, .05, .32], ta: [.6, ANAT.muscle, .04, .5] };
  muscles.forEach(k => { const [w, col, ta, tb2] = MW[k]; j.M[k] = bellyEl(k === 'sol' ? solG : musG, { w: w * R, col, ta, tb: tb2 }); });
  far.forEach(k => { const [w, col, ta, tb2] = MW[k]; j.M2[k] = bellyEl(farMus, { w: w * R, col: mix(col, COL.board, .25), ta, tb: tb2, opacity: .8 }); });
  if (ligs) { j.L.iliofem = ligBand(ligG, { rest: null, w: 6 }); j.L.ischfem = ligBand(ligG, { rest: null, w: 5 }); }
  if (caps) { j.C.ant = capEl(capG, { w: 5 }); j.C.post = capEl(capG, { w: 5 }); }
  // geometry
  const draw = () => {
    const q = j.q;
    pelG.setAttribute('transform', `rotate(${f(q.tilt)})`); pelF.setAttribute('transform', `rotate(${f(q.tilt)})`);
    j.hip = q.th + q.tilt;
    // spine: from the S1 endplate, the lordosis bends the column back to (nearly) vertical, plus a forward lean
    const E = pv([-1.62, -3.07]); let a = SL0 + q.tilt, P = E;
    const tot = SL0 + q.tilt - q.trunk;
    for (let i = 0; i < 5; i++) {
      const a1 = a - tot / 5, am = (a + a1) / 2;
      VB[i].setAttribute('transform', `translate(${f(P[0] - .5 * R * Math.cos(rad(am)))} ${f(P[1] - .5 * R * Math.sin(rad(am)))}) rotate(${f(am)})`);
      j.geo['L' + (5 - i)] = { P, a: am };
      P = [P[0] + Math.sin(rad(am)) * .9 * R, P[1] - Math.cos(rad(am)) * .9 * R]; a = a1;
    }
    j.geo.top = P; j.geo.topA = a;
    // legs
    [[nearB, false], [farB, true]].forEach(([B, far]) => {
      const L = legT(far), an = far ? q.an2 : q.an, K = rotPt(0, FL, -L.th);
      B.fg.setAttribute('transform', `translate(${f(L.off[0] * R)} ${f(L.off[1] * R)}) rotate(${f(-L.th)})`);
      B.tg.setAttribute('transform', `translate(${f((K[0] + L.off[0]) * R)} ${f((K[1] + L.off[1]) * R)}) rotate(${f(-L.th + L.kn)})`);
      B.og.setAttribute('transform', `translate(0 ${f(TL * R)}) rotate(${f(-an)})`);
      if (B.og.toe) B.og.toe.setAttribute('transform', `translate(${f(2.3 * R)} ${f(.75 * R)}) rotate(${f(-(far ? q.mtp2 : q.mtp))}) translate(${f(-2.3 * R)} ${f(-.75 * R)})`);
      const Pp = fm(rotPt(1.05, -.62, L.kn * .55).map((v, i) => v + (i ? FL : 0)), far);
      B.pg.setAttribute('transform', `translate(${f(Pp[0])} ${f(Pp[1])}) rotate(${f(-L.th + L.kn * .55)})`);
      j.geo[far ? 'pat2' : 'pat'] = Pp;
    });
    // muscles
    const M = j.M, L2 = j.geo.L2, T = j.geo.top;
    const sp = (u, k) => { const G0 = j.geo['L' + u], c = Math.cos(rad(G0.a)), sn = Math.sin(rad(G0.a)); return [G0.P[0] + (sn * .5 + c * k) * R, G0.P[1] + (-c * .5 + sn * k) * R]; };
    if (M.ilio) M.ilio.set([sp(2, .7), pv([1.15, -2.3]), pv([1.55, -.15]), fm([-.25, 1.3])]);
    if (M.rf) M.rf.set([pv([1.72, -1.5]), fm([.95, 4.0]), fm([.95, 8.4]), j.geo.pat, tb([.78, 1.3])]);
    if (M.tfl) M.tfl.set([pv([1.85, -2.5]), fm([.35, 2.6]), fm([.05, 8.4]), tb([.25, .9])]);
    if (M.gmax) M.gmax.set([pv([-2.75, -2.1]), pv([-2.5, -.4]), fm([-1.1, 1.3]), fm([-.62, 2.6])]);
    if (M.gmed) M.gmed.set([pv([-.4, -3.75]), pv([-.6, -1.9]), fm([-.62, -.62])]);
    if (M.piri) M.piri.set([pv([-2.65, -1.75]), pv([-1.6, -1.05]), fm([-.75, -.5])]);
    if (M.ham) M.ham.set([pv([-.3, 1.95]), fm([-.85, 4.6]), fm([-.75, 8.9]), tb([-.62, 1.25])]);
    if (M.gast) M.gast.set([fm([-.55, 9.35]), tb([-.95, 3.0]), tb([-.45, 8.2]), ft([-.85, .55])]);
    if (M.sol) M.sol.set([tb([-.3, 2.2]), tb([-.82, 5.0]), tb([-.5, 8.0]), ft([-.85, .58])]);
    if (M.ta) M.ta.set([tb([.42, 1.8]), tb([.58, 5.2]), tb([.5, 8.4]), ft([1.35, .18])]);
    if (M.abd) M.abd.set([pv([2.1, .55]), [T[0] + 3.4 * R, T[1] + 1.4 * R], [T[0] + 3.3 * R, T[1] - .6 * R]]);
    if (M.erect) M.erect.set([pv([-3.0, -1.6]), sp(5, -1.9), sp(3, -1.95), [T[0] - 1.9 * R, T[1] + .2 * R]]);
    const M2 = j.M2;
    if (M2.rf) M2.rf.set([pv([1.72, -1.5]), fm([.95, 4.0], true), fm([.95, 8.4], true), j.geo.pat2, tb([.78, 1.3], true)]);
    if (M2.ham) M2.ham.set([pv([-.3, 1.95]), fm([-.85, 4.6], true), fm([-.75, 8.9], true), tb([-.62, 1.25], true)]);
    if (M2.ilio) M2.ilio.set([sp(2, .7), pv([1.15, -2.3]), pv([1.55, -.15]), fm([-.25, 1.3], true)]);
    const lig = (e, A, B) => { if (!e) return; if (e.rest === null) e.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02; e.set(A, B); };
    lig(j.L.iliofem, pv([1.62, -1.32]), fm([.62, 1.0]));
    lig(j.L.ischfem, pv([-.75, 1.0]), fm([-.75, -.2]));
    if (j.C.ant) { const P0 = [pv([1.05, -.85]), fm([1.15, .2]), fm([.55, 1.15])]; j.C.ant.set(P0, polyLen(P0), [0, 0]); }
    if (j.C.post) { const P0 = [pv([-1.0, .75]), fm([-1.2, .3]), fm([-.8, -.45])]; j.C.post.set(P0, polyLen(P0), [0, 0]); }
    // skin
    if (skin) {
      const P = [[T[0] - 2.2 * R, T[1] - .4 * R], pv([-2.9, -3.4]), pv([-3.4, -1.8]), pv([-3.35, -.2]), fm([-1.9, 1.6]), fm([1.5, .9]), pv([2.6, .1]), pv([2.35, -2.8]), [T[0] + 3.7 * R, T[1] + 2.2 * R], [T[0] + 3.6 * R, T[1] - .4 * R]];
      skT.setAttribute('d', smoothD(P));
      skN[0].set(fm([-.1, .3]), fm([0, FL - .2])); skN[1].set(tb([0, .4]), tb([-.05, TL - .2]));
      if (skN[2]) skN[2].set(ft([-.4, .45]), ft(toes ? [2.2, .62] : [2.6, .65])); if (skN[3]) skN[3].set(tt([2.25, .74]), tt([3.0, .82]));
      if (skFar) { skFar[0].set(fm([-.1, .3], true), fm([0, FL - .2], true)); skFar[1].set(tb([0, .4], true), tb([-.05, TL - .2], true)); if (skFar[2]) skFar[2].set(ft([-.4, .45], true), ft(toes ? [2.2, .62] : [2.6, .65], true)); if (skFar[3]) skFar[3].set(tt([2.25, .74], true), tt([3.0, .82], true)); }
    }
  };
  // planted: keep the near ankle where it was in the neutral pose (closed chain); the hip moves instead
  const pinP = () => plant === 'ball' ? ft([2.3, .98]) : tb([0, TL]), A0 = pinP();
  const place = () => { if (!plant) return; const A = pinP(); j.off = [A0[0] - A[0], A0[1] - A[1]]; root.setAttribute('transform', `translate(${f(j.off[0])} ${f(j.off[1])})`); };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); place(); j.onSet.forEach(fn => fn(j)); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt((P[0] + j.off[0]) * S0.s, (P[1] + j.off[1]) * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  Object.values(j.C).forEach(c => { c.rest *= 1.08; });
  const PN = { ASIS: [1.95, -2.55], AIIS: [1.72, -1.5], PSIS: [-2.45, -2.55], crest: [-.4, -4.05], isch: [-.35, 1.98], pubis: [2.1, .6], S1: [-1.62, -3.07], sacrum: [-2.4, -1.5] };
  j.at = name => {
    let P;
    if (PN[name]) P = pv(PN[name]);
    else if (/^L[1-5]$/.test(name)) { const G0 = j.geo[name]; P = [G0.P[0] + Math.sin(rad(G0.a)) * .45 * R, G0.P[1] - Math.cos(rad(G0.a)) * .45 * R]; }
    else P = ({ H: () => fm([0, 0]), GT: () => fm([-.7, -.45]), K: () => fm([0, FL]), knee: () => fm([0, FL]), thigh: () => fm([0, FL / 2]), patella: () => j.geo.pat, shin: () => tb([0, TL / 2]),
      ankle: () => tb([0, TL]), heel: () => ft([-.8, .7]), toe: () => toes ? tt([2.95, .9]) : ft([2.9, .8]), ball: () => ft([2.3, .98]), ball2: () => ft([2.3, .98], true), toe2t: () => toes ? tt([2.95, .9], true) : ft([2.9, .8], true), knee2: () => fm([0, FL], true), ankle2: () => tb([0, TL], true), heel2: () => ft([-.8, .7], true), toe2: () => ft([2.9, .8], true),
      top: () => j.geo.top })[name]();
    return j.stage(P);
  };
  j.implant = (kind, t, dur = .6) => {
    const ig = mk('g', { opacity: 0 }, nearB.fg), cg = mk('g', { opacity: 0 }, pelF);
    hide(j.headN, t, dur);
    implSh(ig, defs, U([[.35, .05], [.42, 1.2], [.25, 5.2], [-.05, 5.5], [-.25, 5.0], [-.55, 1.2], [-.6, .35]]));
    implSh(ig, defs, U([[.12, .1], [.12, -.1], [-.12, -.1], [-.12, .1]]));
    mk('circle', { r: .62 * R, fill: ballGrad(defs, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, ig);
    mk('path', { d: smoothD([...arcPts([0, 0], 1.05 * R, -200, 20, 10), ...arcPts([0, 0], .82 * R, 20, -200, 10)], true), fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, cg);
    mk('path', { d: smoothD([...arcPts([0, 0], .82 * R, -200, 20, 10), ...arcPts([0, 0], .64 * R, 20, -200, 10)], true), fill: POLY_C, stroke: mix(POLY_C, '#000000', .4), 'stroke-width': 1.2 }, cg);
    show(ig, t, dur); show(cg, t, dur);
    return Object.assign(ig, { cup: cg });
  };
  if (t0 !== null) show(g, t0);
  return j;
}

/* ---------- chapter 21: the knee ---------- */
const MEN_C = '#a8d8c8', GRAFT_C = '#f0c87a';
// A mask that shows a disc of radius r0 about (cx, cy) and fades out by r1.
function kRadMask(defs, cx, cy, r0, r1) {
  const id = 'rm' + (++SHADE_ID), m = mk('mask', { id, maskUnits: 'userSpaceOnUse', x: -3000, y: -3000, width: 6000, height: 6000 }, defs);
  const gr = mk('radialGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', cx, cy, r: r1 }, defs);
  [[0, '#fff'], [r0 / r1, '#fff'], [1, '#000']].forEach(([o, c]) => mk('stop', { offset: o, 'stop-color': c }, gr));
  mk('rect', { x: -3000, y: -3000, width: 6000, height: 6000, fill: `url(#${id}g)` }, m);
  return `url(#${id})`;
}
// The right knee from the lateral side, anterior to the right, drawn like an X-ray over a soft skin. Local unit R = 40;
// (x, y) is the centre of the femoral condyle (the flexion axis). The thigh and the shank fade out about 5 R away.
// set({ th, kn, ap }): th — thigh angle from the vertical (+ the knee goes forward, as in hipSag); kn — knee flexion;
// ap — anterior (+) or posterior (−) translation of the tibia in R units (drawer). The patella rides down and round the
// trochlea with flexion. Muscles (bellyEl, j.M): quad, ham, gast, pop, sol. Ligaments (ligBand, j.L): acl, pcl, lcl;
// capsule j.C.post; the patellar tendon is a fixed tendon band. j.geo.pfc — patellofemoral contact point.
// Methods: tka(t, { ps, patella }), aclr(t, { graft: 'bptb' | 'ham' }), pclr(t), defect(kind, t) with kind 'lesion',
// 'mfx', 'oat', 'aci', 'allo'; men(kind, t) with 'tear', 'repair', 'pmx'; at(name) — a stage point (K pat tub acl pcl
// lcl plat ant post hamI quadT fib); fm(P) / tb(P) — model points in R units from the femur / tibia frames.
function kneeSag(p, x, y, s = 1, t0 = .2, { muscles = ['quad', 'ham', 'gast'], ligs = true, caps = false, skin = true, men = true, fade = 5.2 } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), root = mk('g', { mask: kRadMask(defs, 0, 0, (fade - 1.3) * R, fade * R) }, g);
  const j = { g, R, q: { th: 0, kn: 0, ap: 0 }, M: {}, L: {}, C: {}, geo: {}, onSet: [] };
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  const fm = P => { const v = rotPt(P[0], P[1], -j.q.th); return [v[0] * R, v[1] * R]; };
  const tb = P => { const v = rotPt(P[0] + j.q.ap, P[1], -j.q.th + j.q.kn); return [v[0] * R, v[1] * R]; };
  Object.assign(j, { fm, tb });
  const skinG = mk('g', { opacity: .5 }, root), backG = mk('g', {}, root), femG = mk('g', {}, root), tibG = mk('g', {}, root);
  const ligG = mk('g', {}, root), patG = mk('g', {}, root), musG = mk('g', {}, root), femTop = mk('g', {}, root), topG = mk('g', {}, root);
  Object.assign(j, { femG, tibG, patG, topG, ligG });
  const skN = skin ? [limbEl(skinG, defs, HIPSK_C, 1.95 * R, 1.75 * R, HIPSL_C), limbEl(skinG, defs, HIPSK_C, 1.6 * R, 1.15 * R, HIPSL_C)] : null;
  // bones
  const FEM = [[.55, -7], [.52, -4.2], [.62, -2.6], [.92, -1.7], [1.1, -1.0], [1.16, -.35], [1.05, .32], [.75, .8], [.28, 1.1], [-.25, 1.12], [-.72, .92], [-1.06, .55],
    [-1.2, .05], [-1.14, -.45], [-.92, -.88], [-.62, -1.38], [-.48, -2.4], [-.45, -4.2], [-.45, -7]];
  const TIB = [[.95, 1.2], [1.0, 1.48], [.9, 1.75], [.95, 1.95], [.66, 2.6], [.5, 4.2], [.46, 7], [-.42, 7], [-.44, 4.2], [-.56, 2.5], [-.86, 1.72], [-1.02, 1.32], [-.94, 1.2], [0, 1.16]];
  const FIB = [[-.48, 1.7], [-.62, 1.55], [-.95, 1.6], [-1.02, 1.95], [-.86, 2.35], [-.7, 7], [-.48, 7], [-.62, 2.4], [-.5, 2.0]];
  boneSh(tibG, defs, U(TIB), { col: mix(ANAT.bone, '#f6d9a8', .2) });
  const plat = path(tibG, `M${f(-.94 * R)} ${f(1.19 * R)}Q0 ${f(1.12 * R)} ${f(.95 * R)} ${f(1.17 * R)}`, { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .85 });
  const fibE = boneSh(tibG, defs, U(FIB), { col: mix(ANAT.bone, '#f6d9a8', .3), op: .85 });
  const menG = mk('g', { opacity: men ? 1 : 0 }, tibG);
  const menA = mk('path', { fill: MEN_C, stroke: mix(MEN_C, '#000000', .45), 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, menG);
  const menP = mk('path', { fill: MEN_C, stroke: mix(MEN_C, '#000000', .45), 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, menG);
  const femB = boneSh(femG, defs, U(FEM));
  const cartF = path(femG, smoothD(arcPts([0, 0], 1.12 * R, -12, 205, 8), false), { stroke: CART_C, 'stroke-width': 6, 'stroke-opacity': .8 });
  const troch = path(femG, smoothD(U([[.92, -1.62], [1.08, -1.0], [1.13, -.35], [1.03, .3]]), false), { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .7 });
  mk('ellipse', { cx: -.25 * R, cy: -.35 * R, rx: .24 * R, ry: .2 * R, fill: mix(ANAT.bone, '#000000', .18), opacity: .55 }, femG);   // lateral epicondyle
  // patella with its cartilage
  const pat = mk('g', {}, patG);
  mk('ellipse', { rx: .46 * R, ry: .98 * R, fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.8 }, pat);
  const patCart = path(pat, `M${f(-.36 * R)} ${f(-.72 * R)}Q${f(-.55 * R)} 0 ${f(-.36 * R)} ${f(.62 * R)}`, { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .85 });
  j.patEl = pat; j.patCart = patCart;
  const ptT = path(ligG, '', { stroke: ANAT.tendon, 'stroke-width': .42 * R, 'stroke-linecap': 'round', 'stroke-opacity': .95 });
  const ptE = path(ligG, '', { stroke: mix(ANAT.tendon, '#000000', .35), 'stroke-width': 1.2, 'stroke-opacity': .7, fill: 'none' });
  j.ptT = ptT;
  // muscles
  const MW = { quad: [1.25, ANAT.muscle, .02, .2], ham: [1.1, ANAT.muscle, .04, .22], gast: [1.15, ANAT.muscle, .12, .05], pop: [.42, ANAT.muscleDeep, .15, .25], sol: [.95, ANAT.muscleDeep, .08, .02] };
  muscles.forEach(k => { const [w, col, ta, tb2] = MW[k]; j.M[k] = bellyEl(['pop', 'sol'].includes(k) ? backG : musG, { w: w * R, col, ta, tb: tb2 }); });
  j.LG = {};
  if (ligs) [['acl', 6], ['pcl', 7], ['lcl', 5]].forEach(([k, w]) => { j.LG[k] = mk('g', {}, ligG); j.L[k] = ligBand(j.LG[k], { rest: null, w }); });
  if (caps) j.C.post = capEl(backG, { w: 5 });
  const pfc = mk('ellipse', { rx: .2 * R, ry: .38 * R, fill: '#ff7a6b', opacity: 0 }, patG);
  j.pfc = pfc;
  const draw = () => {
    const q = j.q, k = clamp(q.kn / 120, 0, 1.2);
    femG.setAttribute('transform', `rotate(${f(-q.th)})`); femTop.setAttribute('transform', `rotate(${f(-q.th)})`);
    tibG.setAttribute('transform', `rotate(${f(-q.th + q.kn)}) translate(${f(q.ap * R)} 0)`);
    // menisci ride back on the plateau with flexion
    const mo = -.22 * Math.min(1, k);
    menA.setAttribute('d', ptsD(U([[.96 + mo * .5, 1.17], [.38 + mo * .5, 1.14], [.9 + mo * .5, .93]]), true));
    menP.setAttribute('d', ptsD(U([[-.96 + mo, 1.18], [-.4 + mo, 1.15], [-.92 + mo, .88]]), true));
    // patella: on a path round the trochlea, tilting with flexion
    const a = -43 + .72 * q.kn, rp = lerp(1.91, 1.62, Math.min(1, q.kn / 90)), Pc = [rp * Math.cos(rad(a)), -.3 + rp * Math.sin(rad(a))], pr = -5 + .62 * q.kn;
    const P = fm(Pc), rotA = pr - q.th;
    pat.setAttribute('transform', `translate(${f(P[0])} ${f(P[1])}) rotate(${f(rotA)})`);
    pfc.setAttribute('transform', `translate(${f(P[0])} ${f(P[1])}) rotate(${f(rotA)}) translate(${f(-.38 * R)} ${f(lerp(-.45, .25, Math.min(1, q.kn / 90)) * R)})`);
    const loc = (u, v) => { const c = Math.cos(rad(rotA)), sn = Math.sin(rad(rotA)); return [P[0] + (u * c - v * sn) * R, P[1] + (u * sn + v * c) * R]; };
    j.geo.pat = P; j.geo.patTop = loc(.05, -.95); j.geo.patBot = loc(-.02, .95); j.geo.pfc = loc(-.42, lerp(-.45, .25, Math.min(1, q.kn / 90)));
    const TU = tb([.9, 1.92]); j.geo.tub = TU;
    const Pb = j.geo.patBot;
    ptT.setAttribute('d', `M${f(Pb[0])} ${f(Pb[1])}L${f(TU[0])} ${f(TU[1])}`);
    ptE.setAttribute('d', `M${f(Pb[0])} ${f(Pb[1])}L${f(TU[0])} ${f(TU[1])}`);
    const M = j.M;
    if (M.quad) M.quad.set([fm([.6, -7.2]), fm([.95, -4.0]), fm([1.12, -2.6]), j.geo.patTop]);
    if (M.ham) M.ham.set([fm([-.85, -7.2]), fm([-1.15, -3.6]), fm([-1.25, -1.2]), tb([-.98, 1.72])]);
    if (M.gast) M.gast.set([fm([-.85, -.95]), fm([-1.25, .2]), tb([-1.35, 3.0]), tb([-1.0, 6.2]), tb([-.6, 7.4])]);
    if (M.pop) M.pop.set([fm([-.35, .25]), tb([-.85, 1.75]), tb([-.62, 2.8])]);
    if (M.sol) M.sol.set([tb([-.85, 2.1]), tb([-1.2, 3.8]), tb([-.85, 6.4]), tb([-.55, 7.4])]);
    const lig = (e, A, B) => { if (!e) return; if (e.rest === null) e.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02; e.set(A, B); };
    lig(j.L.acl, fm([-.55, -.35]), tb([.35, 1.1]));
    lig(j.L.pcl, fm([.55, .32]), tb([-.72, 1.36]));
    lig(j.L.lcl, fm([-.25, -.35]), tb([-.78, 1.62]));
    if (j.C.post) { const P0 = [fm([-.55, -1.55]), fm([-1.25, -.6]), fm([-1.32, .45]), tb([-1.05, 1.55])]; j.C.post.set(P0, polyLen(P0), [0, 0]); }
    if (skin) { skN[0].set(fm([0, -7]), fm([.05, .1])); skN[1].set(tb([.05, .9]), tb([-.05, 7.2])); }
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  Object.values(j.C).forEach(c => { c.rest *= 1.06; });
  j.at = name => j.stage(({ K: () => [0, 0], pat: () => j.geo.pat, tub: () => j.geo.tub, pfc: () => j.geo.pfc, acl: () => j.L.acl ? j.L.acl.mid : [0, 0], pcl: () => j.L.pcl ? j.L.pcl.mid : [0, 0],
    lcl: () => j.L.lcl ? j.L.lcl.mid : [0, 0], plat: () => tb([0, 1.16]), ant: () => tb([.95, 1.2]), post: () => tb([-.95, 1.2]), hamI: () => tb([-.98, 1.72]), quadT: () => fm([1.05, -2.2]),
    fib: () => tb([-.8, 1.9]), condyle: () => fm([0, 1.12]), menP: () => tb([-.7, 1.05]), menA: () => tb([.68, 1.08]), shin: () => tb([.5, 3.4]), thigh: () => fm([.6, -3.4]) })[name]());
  // --- implants and repairs (drawn into the bone frames so they move with them) ---
  j.tka = (t, { ps = false, patella = false } = {}) => {
    const fc = mk('g', { opacity: 0 }, femG), tc = mk('g', { opacity: 0 }, tibG), out = [], inn = [];
    for (let a = -30; a <= 200; a += 10) { out.push(polar([0, 0], 1.2 * R, a)); inn.push(polar([0, 0], .98 * R, a)); }
    const flange = U([[1.0, -1.62], [1.24, -1.55], [1.26, -.6]]);
    implSh(fc, defs, [...flange, ...out, ...inn.reverse(), ...U([[.98, -.6], [.92, -1.55]])]);
    if (ps) implSh(fc, defs, U([[-.35, .55], [.0, .55], [.0, .82], [-.35, .82]]));
    implSh(tc, defs, U([[-1.0, 1.12], [1.0, 1.12], [1.0, 1.26], [.18, 1.26], [.12, 2.6], [-.12, 2.6], [-.18, 1.26], [-1.0, 1.26]]));
    mk('path', { d: ptsD(U([[-1.0, .98], [-.55, 1.0], [0, 1.02], [.55, 1.0], [.98, .97], [.98, 1.12], [-1.0, 1.12]]), true), fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4 }, tc);
    if (ps) mk('path', { d: ptsD(U([[-.12, 1.0], [-.12, .62], [.12, .62], [.12, 1.0]]), true), fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4 }, tc);
    let pb = null;
    if (patella) { pb = mk('path', { d: `M${f(-.36 * R)} ${f(-.55 * R)}Q${f(-.72 * R)} 0 ${f(-.36 * R)} ${f(.55 * R)}Z`, fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4, opacity: 0 }, pat); show(pb, t, .6); hide(patCart, t, .4); }
    [cartF, troch, plat, menG].forEach(e => hide(e, t, .4));
    if (j.LG.acl) hide(j.LG.acl, t, .4);
    if (ps && j.LG.pcl) hide(j.LG.pcl, t, .4);
    show(fc, t, .6); show(tc, t + .2, .6);
    return { fc, tc, pb };
  };
  j.aclr = (t, { graft = 'bptb' } = {}) => {
    const gg = mk('g', { opacity: 0 }, ligG), tun = mk('g', { opacity: 0 }, root);
    const ftun = mk('path', { fill: 'none', stroke: COL.board, 'stroke-opacity': .75, 'stroke-width': .36 * R, 'stroke-linecap': 'round' }, tun);
    const ttun = mk('path', { fill: 'none', stroke: COL.board, 'stroke-opacity': .75, 'stroke-width': .36 * R, 'stroke-linecap': 'round' }, tun);
    const gline = path(gg, '', { stroke: GRAFT_C, 'stroke-width': 11, 'stroke-linecap': 'round' }), gr = ligBand(gg, { rest: null, w: 4 });
    const plugs = graft === 'bptb' ? [mk('rect', { x: -.16 * R, y: -.32 * R, width: .32 * R, height: .64 * R, rx: 4, fill: ANAT.bone, stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.4 }, gg),
      mk('rect', { x: -.16 * R, y: -.32 * R, width: .32 * R, height: .64 * R, rx: 4, fill: ANAT.bone, stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.4 }, gg)] : [];
    const upd = () => {
      const A = fm([-.55, -.35]), A2 = fm([-1.05, -1.55]), B = tb([.35, 1.1]), B2 = tb([.95, 2.55]);
      ftun.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(A2[0])} ${f(A2[1])}`); ttun.setAttribute('d', `M${f(B[0])} ${f(B[1])}L${f(B2[0])} ${f(B2[1])}`);
      if (gr.rest === null) gr.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02;
      gr.set(A, B); gline.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`);
      if (plugs.length) { const pa = lerp(0, 1, .35), PA = [lerp(A[0], A2[0], pa), lerp(A[1], A2[1], pa)], PB = [lerp(B[0], B2[0], pa), lerp(B[1], B2[1], pa)], ang = (U0, V0) => Math.atan2(V0[1] - U0[1], V0[0] - U0[0]) * 180 / Math.PI - 90;
        plugs[0].setAttribute('transform', `translate(${f(PA[0])} ${f(PA[1])}) rotate(${f(ang(A, A2))})`); plugs[1].setAttribute('transform', `translate(${f(PB[0])} ${f(PB[1])}) rotate(${f(ang(B, B2))})`); }
    };
    j.onSet.push(upd); upd();
    if (j.LG.acl) hide(j.LG.acl, t, .4);
    show(tun, t, .5); show(gg, t + .3, .6);
    return { gg, tun, gr };
  };
  j.pclr = t => {
    const gg = mk('g', { opacity: 0 }, ligG), gline = path(gg, '', { stroke: GRAFT_C, 'stroke-width': 12, 'stroke-linecap': 'round' }), gr = ligBand(gg, { rest: null, w: 4 });
    const upd = () => { const A = fm([.55, .32]), B = tb([-.72, 1.36]); if (gr.rest === null) gr.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02; gr.set(A, B); gline.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`); };
    j.onSet.push(upd); upd();
    if (j.LG.pcl) hide(j.LG.pcl, t, .4);
    show(gg, t, .6);
    return { gg, gr };
  };
  // cartilage defect on the weight-bearing femoral condyle (bottom of the condyle, femur frame)
  j.defect = (kind, t) => {
    const dg = mk('g', { opacity: 0 }, femTop), C0 = polar([0, 0], 1.12 * R, 80), a0 = 62, a1 = 96;
    const gap = path(dg, smoothD(arcPts([0, 0], 1.12 * R, a0, a1, 4), false), { stroke: kind === 'lesion' ? FRAC_C : COL.board, 'stroke-width': 9, 'stroke-linecap': 'round' });
    if (kind === 'mfx') for (let a = a0 + 3; a <= a1 - 3; a += 6) { const P0 = polar([0, 0], 1.08 * R, a), P1 = polar([0, 0], .78 * R, a); path(dg, `M${f(P0[0])} ${f(P0[1])}L${f(P1[0])} ${f(P1[1])}`, { stroke: '#c0392b', 'stroke-width': 3.5, 'stroke-linecap': 'round' }); }
    if (kind === 'mfx' || kind === 'lesion') { /* only the marks */ }
    if (kind === 'oat') for (let a = a0 + 5; a <= a1 - 4; a += 11) { const P0 = polar([0, 0], 1.12 * R, a), ang = a + 90; mk('rect', { x: -.17 * R, y: -.02 * R, width: .34 * R, height: .48 * R, rx: 3, fill: ANAT.bone, stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.2, transform: `translate(${f(P0[0])} ${f(P0[1])}) rotate(${f(ang - 180)})` }, dg); path(dg, smoothD(arcPts([0, 0], 1.12 * R, a - 4.5, a + 4.5, 2), false), { stroke: CART_C, 'stroke-width': 6 }); }
    if (kind === 'aci') { path(dg, smoothD(arcPts([0, 0], 1.2 * R, a0 - 3, a1 + 3, 3), false), { stroke: '#e9c8a0', 'stroke-width': 4 }); for (let a = a0 + 2; a <= a1 - 2; a += 3) { const P0 = polar([0, 0], 1.13 * R, a); mk('circle', { cx: P0[0], cy: P0[1], r: 2.2, fill: '#7fd0e0' }, dg); } }
    if (kind === 'allo') { const B0 = polar([0, 0], 1.12 * R, 92); mk('path', { d: smoothD([...arcPts([0, 0], 1.12 * R, a0, a1, 4), ...arcPts([0, 0], .72 * R, a1, a0, 4)]), fill: mix(ANAT.bone, '#c8d8ff', .35), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.4 }, dg); path(dg, smoothD(arcPts([0, 0], 1.12 * R, a0, a1, 4), false), { stroke: CART_C, 'stroke-width': 6 }); void B0; }
    show(dg, t, .5);
    dg.C = C0;
    return dg;
  };
  // the posterior horn of the meniscus: a tear, its repair or a partial resection
  j.men = (kind, t) => {
    const mg = mk('g', { opacity: 0 }, menG), A = [-.62, 1.16], B = [-.72, .96];
    if (kind === 'tear') path(mg, `M${f(-.58 * R)} ${f(1.17 * R)}L${f(-.78 * R)} ${f(.98 * R)}`, { stroke: FRAC_C, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    if (kind === 'repair') { path(mg, `M${f(-.58 * R)} ${f(1.17 * R)}L${f(-.78 * R)} ${f(.98 * R)}`, { stroke: mix(FRAC_C, COL.board, .5), 'stroke-width': 2 }); [[-.5, 1.04], [-.6, 1.0], [-.7, 1.09]].forEach(([u, v]) => path(mg, `M${f((u - .14) * R)} ${f(v * R)}L${f((u + .14) * R)} ${f(v * R)}`, { stroke: '#4d7cfe', 'stroke-width': 2.4 })); }
    if (kind === 'pmx') mk('path', { d: ptsD(U([[-.4, 1.15], [-.6, 1.155], [-.62, 1.06]]), true), fill: COL.board, stroke: FRAC_C, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }, mg);
    void A; void B;
    show(mg, t, .5);
    return mg;
  };
  if (t0 !== null) show(g, t0);
  return j;
}
// The right knee from the front (the patient's lateral side to the left), like an X-ray over a soft skin: the femur with
// its built-in anatomical valgus, the tibia and fibula, the menisci, the collateral and cruciate ligaments and the
// patella with its tendons, retinacula and the vasti. Local unit R = 40; (x, y) is the middle of the joint line.
// set({ vv, px, tub, qa }): vv — varus (+, the medial side closes) or valgus (−) of the tibia in degrees; px — patellar
// shift in R units (− lateral); tub — shift of the tibial tubercle (+ medial); qa — direction of the ASIS line (degrees
// from the vertical, toward lateral). j.Q — the resulting Q-angle; setQ(v) aims the ASIS line for a Q-angle of v.
// Muscles (bellyEl, j.M): vl, vmo, rf. Ligaments (ligBand, j.L): mcl, lcl, acl, pcl, mpfl, lret.
// Methods: qAngle(t) — the two lines and the angle; oa(t) — medial OA (thin cartilage, osteophytes, varus);
// tka(t), uka(t), hto(t), tto(t, dx) — tubercle transfer; at(name) — stage points (pat tub medJ latJ mcl lcl mpfl lret asis gerdy pes).
function kneeFront(p, x, y, s = 1, t0 = .2, { muscles = ['vl', 'vmo', 'rf'], ligs = true, cruc = true, skin = true, itb = true, pes = false, fade = 5.6 } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), root = mk('g', { mask: kRadMask(defs, 0, -.6 * R, (fade - 1.3) * R, fade * R) }, g);
  const j = { g, R, Q: 0, q: { vv: 0, px: 0, tub: 0, qa: 15 }, M: {}, L: {}, LG: {}, geo: {}, onSet: [], cart: { med: 1, lat: 1 } };
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  const OB = Math.tan(rad(6)), ob = ([a, b]) => [b < -1.6 ? a + (b + 1.6) * OB : a, b];   // anatomical valgus of the shaft
  const piv = () => j.q.vv >= 0 ? [1.05, .92] : [-1.05, .92];
  const tb = P => { const C = piv(), v = rotPt(P[0] - C[0], P[1] - C[1], -j.q.vv); return [(C[0] + v[0]) * R, (C[1] + v[1]) * R]; };
  const fm = P => { const Q = ob(P); return [Q[0] * R, Q[1] * R]; };
  Object.assign(j, { fm, tb });
  const skinG = mk('g', { opacity: .5 }, root), tibG = mk('g', {}, root), femG = mk('g', {}, root), menG = mk('g', {}, root);
  const crucG = mk('g', { opacity: cruc ? .8 : 0 }, root), ligG = mk('g', {}, root), musG = mk('g', {}, root), patG = mk('g', {}, root), topG = mk('g', {}, root);
  Object.assign(j, { tibG, femG, patG, topG, ligG });
  const skN = skin ? [limbEl(skinG, defs, HIPSK_C, 2.6 * R, 2.35 * R, HIPSL_C), limbEl(skinG, defs, HIPSK_C, 2.15 * R, 1.5 * R, HIPSL_C)] : null;
  const FEMF = [[-.6, -7.5], [-.62, -3.0], [-.95, -1.9], [-1.6, -1.25], [-1.98, -.8], [-2.0, -.2], [-1.85, .4], [-1.5, .78], [-.95, .88], [-.45, .72], [-.25, .2], [0, -.08], [.25, .2], [.45, .75],
    [1.0, .92], [1.6, .82], [1.95, .42], [2.05, -.2], [2.02, -.8], [1.7, -1.3], [1.0, -1.95], [.65, -3.0], [.62, -7.5]];
  const TIBF = [[-1.98, 1.0], [-1.92, 1.36], [-1.55, 1.75], [-.92, 2.3], [-.62, 3.5], [-.56, 7.5], [.6, 7.5], [.64, 3.5], [1.02, 2.3], [1.78, 1.72], [2.08, 1.3], [2.08, .99], [1.0, 1.02],
    [.35, .96], [.2, .74], [0, .9], [-.2, .72], [-.35, .96], [-1.0, 1.0]];
  const FIBF = [[-1.5, 1.68], [-2.12, 1.72], [-2.18, 2.15], [-1.88, 2.55], [-1.58, 7.5], [-1.32, 7.5], [-1.52, 2.6], [-1.4, 2.05]];
  const fibE = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0, mix(ANAT.bone, '#f6d9a8', .3)), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2, 'fill-opacity': .85 }, tibG);
  const tibE = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0, mix(ANAT.bone, '#f6d9a8', .2)), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, tibG);
  const tubE = mk('ellipse', { rx: .32 * R, ry: .22 * R, fill: mix(ANAT.bone, '#000000', .16), opacity: .7 }, tibG);
  const cartT = [path(tibG, '', { stroke: CART_C, 'stroke-width': 6, 'stroke-opacity': .85 }), path(tibG, '', { stroke: CART_C, 'stroke-width': 6, 'stroke-opacity': .85 })];
  const femE = boneSh(femG, defs, U(FEMF.map(ob)));
  const cartF = [path(femG, smoothD(U([[-1.82, .45], [-1.5, .8], [-.95, .9], [-.5, .76]]), false), { stroke: CART_C, 'stroke-width': 6, 'stroke-opacity': .8 }),
    path(femG, smoothD(U([[.5, .78], [1.0, .94], [1.6, .84], [1.92, .45]]), false), { stroke: CART_C, 'stroke-width': 6, 'stroke-opacity': .8 })];
  j.cartF = cartF; j.cartT = cartT;
  const menL = mk('path', { fill: MEN_C, stroke: mix(MEN_C, '#000000', .45), 'stroke-width': 1.5 }, menG), menM = mk('path', { fill: MEN_C, stroke: mix(MEN_C, '#000000', .45), 'stroke-width': 1.5 }, menG);
  j.menG = menG;
  // ITB and pes anserinus
  const itbE = itb ? path(musG, '', { stroke: ANAT.tendon, 'stroke-width': .32 * R, 'stroke-opacity': .7, 'stroke-linecap': 'round' }) : null;
  const pesE = pes ? path(musG, '', { stroke: ANAT.tendon, 'stroke-width': .28 * R, 'stroke-opacity': .75, 'stroke-linecap': 'round', fill: 'none' }) : null;
  // muscles
  const MW = { vl: [1.15, ANAT.muscle, .02, .2], vmo: [.95, ANAT.muscle, .02, .28], rf: [.95, ANAT.muscle, .02, .25] };
  muscles.forEach(k => { const [w, col, ta, tb2] = MW[k]; j.M[k] = bellyEl(musG, { w: w * R, col, ta, tb: tb2 }); });
  // ligaments
  if (ligs) [['mcl', 11, ligG], ['lcl', 6, ligG], ['mpfl', 6, patG], ['lret', 7, patG]].forEach(([k, w, par]) => { j.LG[k] = mk('g', {}, par); j.L[k] = ligBand(j.LG[k], { rest: null, w }); });
  if (cruc) [['acl', 6], ['pcl', 7]].forEach(([k, w]) => { j.LG[k] = mk('g', {}, crucG); j.L[k] = ligBand(j.LG[k], { rest: null, w }); });
  // patella and tendons
  const ptT = path(patG, '', { stroke: ANAT.tendon, 'stroke-width': .62 * R, 'stroke-linecap': 'round', 'stroke-opacity': .9 });
  const qtT = path(patG, '', { stroke: ANAT.tendon, 'stroke-width': .78 * R, 'stroke-linecap': 'round', 'stroke-opacity': .85 });
  const pat = mk('g', {}, patG);
  mk('ellipse', { rx: .82 * R, ry: 1.0 * R, fill: ballGrad(defs), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.8, opacity: .9 }, pat);
  j.patEl = pat;
  const qG = mk('g', { opacity: 0 }, topG);
  const qA = path(qG, '', { stroke: '#7fd0e0', 'stroke-width': 3.5 }), qX = path(qG, '', { stroke: '#7fd0e0', 'stroke-width': 2.6, 'stroke-dasharray': '7 6' }), qT = path(qG, '', { stroke: '#c9a0ff', 'stroke-width': 3.5 });
  const qArc = path(qG, '', { stroke: '#ff9f7a', 'stroke-width': 4, fill: 'none' }), qTxt = T(qG, '', { x: 0, y: 0, size: 22, fill: '#ff9f7a', weight: 700 });
  const draw = () => {
    const q = j.q;
    tibE.setAttribute('d', smoothD(TIBF.map(tb))); fibE.setAttribute('d', smoothD(FIBF.map(tb)));
    const TU = tb([-.2 + q.tub, 1.95]); tubE.setAttribute('cx', f(TU[0])); tubE.setAttribute('cy', f(TU[1]));
    cartT[0].setAttribute('d', ptsD([tb([-1.85, .99]), tb([-.45, .99])])); cartT[1].setAttribute('d', ptsD([tb([.45, 1.0]), tb([1.95, 1.0])]));
    cartT[0].setAttribute('stroke-width', f(6 * j.cart.lat)); cartT[1].setAttribute('stroke-width', f(6 * j.cart.med));
    menL.setAttribute('d', ptsD([tb([-2.02, .98]), tb([-1.32, .98]), tb([-1.92, .62])], true)); menM.setAttribute('d', ptsD([tb([2.1, 1.0]), tb([1.32, 1.0]), tb([2.0, .64])], true));
    const PC = [q.px * R, -1.55 * R]; pat.setAttribute('transform', `translate(${f(PC[0])} ${f(PC[1])})`);
    j.geo.pat = PC; j.geo.tub = TU;
    ptT.setAttribute('d', `M${f(PC[0])} ${f(PC[1] + .75 * R)}L${f(TU[0])} ${f(TU[1])}`);
    const QT = fm([-.18, -3.4]); qtT.setAttribute('d', `M${f(PC[0])} ${f(PC[1] - .7 * R)}L${f(QT[0])} ${f(QT[1])}`);
    const M = j.M;
    if (M.vl) M.vl.set([fm([-1.05, -6.8]), fm([-1.25, -4.2]), fm([-.95, -2.6]), [PC[0] - .55 * R, PC[1] - .78 * R]]);
    if (M.vmo) M.vmo.set([fm([.75, -5.0]), fm([1.25, -3.1]), [PC[0] + .78 * R, PC[1] - .5 * R]]);
    if (M.rf) M.rf.set([fm([-.3, -7.2]), fm([-.2, -4.6]), QT]);
    if (itbE) { const A = fm([-2.05, -6.5]), B = tb([-1.6, 1.42]); itbE.setAttribute('d', `M${f(A[0])} ${f(A[1])}Q${f(-2.35 * R)} ${f(-1.0 * R)} ${f(B[0])} ${f(B[1])}`); }
    if (pesE) { const A = fm([1.3, -5.5]), B = tb([1.05, 2.5]); pesE.setAttribute('d', `M${f(A[0])} ${f(A[1])}Q${f(2.25 * R)} ${f(.6 * R)} ${f(B[0])} ${f(B[1])}`); }
    const lig = (k, A, B) => { const e = j.L[k]; if (!e) return; if (e.rest === null) e.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.02; e.set(A, B); };
    lig('mcl', fm([2.02, -.55]), tb([1.78, 3.0])); lig('lcl', fm([-2.0, -.5]), tb([-2.05, 1.85]));
    lig('acl', fm([-.32, .05]), tb([.18, .9])); lig('pcl', fm([.3, -.02]), tb([-.12, .98]));
    lig('mpfl', [PC[0] + .78 * R, PC[1] - .2 * R], fm([2.0, -1.05])); lig('lret', [PC[0] - .8 * R, PC[1]], fm([-2.0, -.95]));
    if (skin) { skN[0].set(fm([0, -7.5]), fm([0, .2])); skN[1].set(tb([0, 1.1]), tb([0, 7.6])); }
    // Q-angle: ASIS line through the patella centre, extended down, against the tubercle line
    const tx = TU[0] - PC[0], ty = TU[1] - PC[1], thT = Math.atan2(-tx, ty), ext = rad(q.qa), Lq = 5.6 * R;
    j.Q = (ext + thT) * 180 / Math.PI;
    const A = [PC[0] - Math.sin(ext) * Lq, PC[1] - Math.cos(ext) * Lq], X2 = [PC[0] + Math.sin(ext) * 2.6 * R, PC[1] + Math.cos(ext) * 2.6 * R];
    qA.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(PC[0])} ${f(PC[1])}`); qX.setAttribute('d', `M${f(PC[0])} ${f(PC[1])}L${f(X2[0])} ${f(X2[1])}`); qT.setAttribute('d', `M${f(PC[0])} ${f(PC[1])}L${f(TU[0])} ${f(TU[1])}`);
    const a0 = 90 - ext * 180 / Math.PI, a1 = 90 + thT * 180 / Math.PI, rr = 3.1 * R;
    qArc.setAttribute('d', smoothD(arcPts(PC, rr, Math.min(a0, a1), Math.max(a0, a1), 2), false));
    const am = rad((a0 + a1) / 2); put(qTxt, { x: PC[0] + Math.cos(am) * (rr + 16) + 14, y: PC[1] + Math.sin(am) * (rr + 16) + 8 }); qTxt.textContent = Math.round(j.Q) + '°';
    j.geo.asis = A;
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); return j; };
  j.setQ = v => { j.set({}); return j.set({ qa: j.q.qa + (v - j.Q) }); };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  j.at = name => j.stage(({ pat: () => j.geo.pat, tub: () => j.geo.tub, medJ: () => tb([1.5, .95]), latJ: () => tb([-1.5, .95]), mcl: () => j.L.mcl.mid, lcl: () => j.L.lcl.mid, mpfl: () => j.L.mpfl.mid,
    lret: () => j.L.lret.mid, asis: () => j.geo.asis, gerdy: () => tb([-1.6, 1.42]), pes: () => tb([1.05, 2.5]), medC: () => fm([1.6, .2]), latC: () => fm([-1.5, .2]), vmo: () => j.M.vmo ? j.M.vmo.mid(.5) : [0, 0] })[name]());
  j.qAngle = (t, dur = .6) => show(qG, t, dur);
  j.qG = qG;
  j.oa = (t, dur = 1.2) => {
    const og = mk('g', { opacity: 0 }, femG);
    [[[1.98, .45], [2.42, .66], [2.02, .8]], [[1.98, .15], [2.38, .05], [2.0, -.12]]].forEach(P => mk('path', { d: ptsD(U(P), true), fill: mix(ANAT.bone, '#000000', .12), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.2 }, og));
    const tg = mk('g', { opacity: 0 }, topG), op = mk('path', { fill: mix(ANAT.bone, '#000000', .12), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.2 }, tg);
    j.onSet.push(() => op.setAttribute('d', ptsD([tb([2.06, 1.02]), tb([2.5, .9]), tb([2.08, 1.36])], true)));
    show(og, t, .6); show(tg, t, .6);
    prog(k => { j.cart.med = 1 - .8 * k; j.set({ vv: 6 * k }); }, t, dur);
    return { og, tg };
  };
  j.tka = (t, { uni = false } = {}) => {
    const fc = mk('g', { opacity: 0 }, femG), tc = mk('g', { opacity: 0 }, topG);
    const run = (a, b) => implSh(fc, defs, U([[a, .25], [a + .1, .8], [lerp(a, b, .5), 1.0], [b - .1, .8], [b, .25], [b - .15, .55], [lerp(a, b, .5), .78], [a + .15, .55]]));
    if (uni) run(.45, 1.95); else { run(-1.95, -.45); run(.45, 1.95); implSh(fc, defs, U([[-.45, .25], [.45, .25], [.45, .5], [-.45, .5]])); }
    const tray = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .55), 'stroke-width': 1.8 }, tc), poly = mk('path', { fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4 }, tc);
    const a = uni ? .4 : -1.95, b = 2.0;
    j.onSet.push(() => {
      tray.setAttribute('d', ptsD(uni ? [tb([a, 1.0]), tb([b, 1.0]), tb([b, 1.16]), tb([a, 1.16])] : [tb([a, 1.0]), tb([b, 1.0]), tb([b, 1.16]), tb([.22, 1.16]), tb([.16, 3.0]), tb([-.16, 3.0]), tb([-.22, 1.16]), tb([a, 1.16])], true));
      poly.setAttribute('d', ptsD([tb([a, .82]), tb([b, .82]), tb([b, 1.0]), tb([a, 1.0])], true));
    });
    j.set({});
    const hideN = uni ? [cartF[1], cartT[1], menM] : [...cartF, ...cartT, menG, crucG];
    hideN.forEach(e => hide(e, t, .4));
    show(fc, t, .6); show(tc, t + .2, .6);
    return { fc, tc };
  };
  j.uka = t => j.tka(t, { uni: true });
  j.hto = t => {
    const hg = mk('g', { opacity: 0 }, topG), wedge = mk('path', { fill: COL.board, stroke: '#ffd75e', 'stroke-width': 1.6 }, hg), plate = mk('path', { fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .55), 'stroke-width': 1.4 }, hg);
    j.onSet.push(() => { wedge.setAttribute('d', ptsD([tb([2.0, 1.7]), tb([.2, 2.05]), tb([2.02, 2.0])], true)); plate.setAttribute('d', ptsD([tb([1.95, 1.45]), tb([2.12, 1.45]), tb([2.08, 3.0]), tb([1.9, 3.0])], true)); });
    j.set({}); show(hg, t, .6);
    return hg;
  };
  j.tto = (t, dx = .6, dur = 1.5) => { const t0b = j.q.tub; prog(k => j.set({ tub: t0b + dx * k }), t, dur); };
  if (t0 !== null) show(g, t0);
  return j;
}
// The right patellofemoral joint in an axial (skyline) view, the knee bent: the trochlea of the femur below with its
// higher lateral ridge (left) and the patella above, sitting with its ridge in the groove. Local unit R = 40; (x, y) is
// the bottom of the trochlear groove. set({ shift, tilt, dys, press }): shift — patellar shift in R units (− lateral);
// tilt — lateral tilt in degrees (the lateral edge goes down); dys — trochlear dysplasia 0..1 (a flat groove and a low
// lateral ridge); press — 0..1 the lateral facet compression shown in red. Ligaments (ligBand, j.L): mpfl, lret
// (lateral retinaculum; tightLat makes it short). Methods: pulls(t, { vmo, vl }) — pull arrows (j.pull.vmo / vl scale
// them by set({ pvmo, pvl })); mpflR(t) — an MPFL graft; lrr(t) — lateral release; troch(t) — trochleoplasty;
// at(name) — stage points (pat med lat groove mpfl lret latF medF).
function patAxial(p, x, y, s = 1, t0 = .2, { tightLat = false } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const j = { g, R, q: { shift: 0, tilt: 0, dys: 0, press: 0, pvmo: 1, pvl: 1 }, L: {}, LG: {}, geo: {}, onSet: [] };
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  const fade = fadeMask(defs, 0, 1.4 * R, 0, 2.6 * R, [[0, '#fff'], [1, '#000']]);
  const femG = mk('g', { mask: fade }, g), ligG = mk('g', {}, g), patG = mk('g', {}, g), topG = mk('g', {}, g);
  Object.assign(j, { femG, patG, topG, ligG });
  const femE = mk('path', { fill: boneGrad(defs, 0, 0, 0, 1), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, femG);
  const cartF = path(femG, '', { stroke: CART_C, 'stroke-width': 7, 'stroke-opacity': .85, fill: 'none' });
  [['mpfl', 7], ['lret', 9]].forEach(([k, w]) => { j.LG[k] = mk('g', {}, ligG); j.L[k] = ligBand(j.LG[k], { rest: null, w }); });
  const pat = mk('g', {}, patG);
  mk('path', { d: smoothD(U([[-1.95, -1.05], [-1.55, -1.75], [-.4, -2.08], [.7, -2.0], [1.5, -1.65], [1.78, -1.2], [.9, -.62], [0, -.12], [-1.0, -.6]])), fill: boneGrad(defs, 0, 0, 0, 1), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.8 }, pat);
  const facL = path(pat, smoothD(U([[-1.9, -1.02], [-1.0, -.58], [0, -.12]]), false), { stroke: CART_C, 'stroke-width': 7, 'stroke-opacity': .85 });
  const facM = path(pat, smoothD(U([[0, -.12], [.9, -.6], [1.72, -1.18]]), false), { stroke: CART_C, 'stroke-width': 7, 'stroke-opacity': .85 });
  const pressE = path(pat, smoothD(U([[-1.75, -.95], [-1.0, -.58], [-.35, -.3]]), false), { stroke: '#ff5a3c', 'stroke-width': 10, 'stroke-opacity': 0, 'stroke-linecap': 'round' });
  Object.assign(j, { pat, facL, facM });
  const pullG = mk('g', { opacity: 0 }, topG), pV = path(pullG, '', { stroke: '#ff9f7a', 'stroke-width': 6, 'stroke-linecap': 'round' }), pL = path(pullG, '', { stroke: '#ff9f7a', 'stroke-width': 6, 'stroke-linecap': 'round' });
  const hV = mk('path', { fill: '#ff9f7a' }, pullG), hL = mk('path', { fill: '#ff9f7a' }, pullG);
  const tV = T(pullG, 'косая порция медиальной', { x: 0, y: 0, size: 15, fill: '#ff9f7a', weight: 700, anchor: 'middle' }), tL = T(pullG, 'латеральная широкая', { x: 0, y: 0, size: 15, fill: '#ff9f7a', weight: 700, anchor: 'middle' });
  const arrow = (line, head, A, d, len) => { const B = [A[0] + d[0] * len, A[1] + d[1] * len], n = [-d[1], d[0]]; line.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`);
    head.setAttribute('d', ptsD([[B[0] + d[0] * 14, B[1] + d[1] * 14], [B[0] + n[0] * 9, B[1] + n[1] * 9], [B[0] - n[0] * 9, B[1] - n[1] * 9]], true)); return B; };
  const draw = () => {
    const q = j.q, dz = q.dys;
    const F = [[-2.55, 2.6], [-2.65, .55], [-2.4, lerp(-.42, .1, dz)], [-1.7, lerp(-.6, -.15, dz)], [-.9, lerp(-.2, -.05, dz)], [0, lerp(.42, .02, dz)], [.85, lerp(-.06, -.04, dz)], [1.6, -.3], [2.2, -.15], [2.52, .5], [2.45, 2.6]];
    femE.setAttribute('d', smoothD(U(F)));
    cartF.setAttribute('d', smoothD(U(F.slice(2, 9)), false));
    const Pc = [q.shift * R, lerp(0, -.25, dz) * R];
    pat.setAttribute('transform', `translate(${f(Pc[0])} ${f(Pc[1])}) rotate(${f(-q.tilt)})`);
    pressE.setAttribute('stroke-opacity', f(.85 * q.press));
    const loc = (u, v) => { const c = Math.cos(rad(-q.tilt)), sn = Math.sin(rad(-q.tilt)); return [Pc[0] + (u * c - v * sn) * R, Pc[1] + (u * sn + v * c) * R]; };
    j.geo.med = loc(1.75, -1.2); j.geo.lat = loc(-1.92, -1.05); j.geo.pat = loc(0, -1.1);
    const lig = (k, A, B, k0 = 1.02) => { const e = j.L[k]; if (!e) return; if (e.rest === null) e.rest = Math.hypot(B[0] - A[0], B[1] - A[1]) * k0; e.set(A, B); };
    lig('mpfl', j.geo.med, [2.75 * R, .75 * R]); lig('lret', j.geo.lat, [-2.85 * R, .8 * R], tightLat ? .76 : 1.02);
    const mv = j.geo.med, lv = j.geo.lat;
    const BV = arrow(pV, hV, [mv[0] - .2 * R, mv[1] - .35 * R], [.82, -.57], 1.6 * R * q.pvmo), BL = arrow(pL, hL, [lv[0] + .2 * R, lv[1] - .35 * R], [-.82, -.57], 1.6 * R * q.pvl);
    put(tV, { x: BV[0] + 20, y: BV[1] - 22 }); put(tL, { x: BL[0] - 20, y: BL[1] - 22 });
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  j.at = name => j.stage(({ pat: () => j.geo.pat, med: () => j.geo.med, lat: () => j.geo.lat, groove: () => [0, .3 * R], mpfl: () => j.L.mpfl.mid, lret: () => j.L.lret.mid, latF: () => [-1.8 * R, -.2 * R], medF: () => [1.6 * R, 0] })[name]());
  j.pulls = (t, dur = .5) => show(pullG, t, dur);
  j.pullG = pullG;
  j.mpflR = t => {
    const gg = mk('g', { opacity: 0 }, ligG), gl = path(gg, '', { stroke: GRAFT_C, 'stroke-width': 10, 'stroke-linecap': 'round' }), d1 = mk('circle', { r: 6, fill: IMPL_C, stroke: '#333', 'stroke-width': 1 }, gg), d2 = mk('circle', { r: 6, fill: IMPL_C, stroke: '#333', 'stroke-width': 1 }, gg);
    j.onSet.push(() => { const A = j.geo.med, B = [2.75 * R, .75 * R]; gl.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`); put(d1, { x: A[0], y: A[1] }); put(d2, { x: B[0], y: B[1] }); });
    j.set({}); hide(j.LG.mpfl, t, .4); show(gg, t, .6);
    return gg;
  };
  j.lrr = t => {
    const cg = mk('g', { opacity: 0 }, ligG), c1 = path(cg, '', { stroke: mix(ANAT.tendon, COL.board, .25), 'stroke-width': 9, 'stroke-linecap': 'round' }), c2 = path(cg, '', { stroke: mix(ANAT.tendon, COL.board, .25), 'stroke-width': 9, 'stroke-linecap': 'round' });
    const cut = T(cg, '✂', { x: 0, y: 0, size: 26, fill: FRAC_C, anchor: 'middle' });
    j.onSet.push(() => { const A = j.geo.lat, B = [-2.85 * R, .8 * R], m1 = [lerp(A[0], B[0], .38), lerp(A[1], B[1], .38)], m2 = [lerp(A[0], B[0], .62), lerp(A[1], B[1], .62)];
      c1.setAttribute('d', `M${f(A[0])} ${f(A[1])}L${f(m1[0])} ${f(m1[1])}`); c2.setAttribute('d', `M${f(m2[0])} ${f(m2[1])}L${f(B[0])} ${f(B[1])}`); put(cut, { x: (m1[0] + m2[0]) / 2, y: (m1[1] + m2[1]) / 2 - 12 }); });
    j.set({}); hide(j.LG.lret, t, .3); show(cg, t, .4);
    return cg;
  };
  j.troch = (t, dur = 1.5) => { const d0 = j.q.dys; prog(k => j.set({ dys: d0 * (1 - k) }), t, dur); };
  if (t0 !== null) show(g, t0);
  return j;
}
// The right tibial plateau from above, anterior up, medial to the right: the C-shaped medial meniscus and the nearly
// round lateral one, the cruciate insertions and the transverse ligament. Local unit R = 40; (x, y) is the middle of the
// plateau. Methods: zones(t) — the outer (vascular, red), middle and inner (white) thirds; tear(kind, t, side = 'M')
// with kind 'long' (peripheral, longitudinal), 'radial', 'bucket' (a bucket-handle flipped into the notch), 'complex';
// repair(t) — sutures across a longitudinal tear; pmx(t) — the inner rim removed; at(name) — stage points (med lat acl pcl
// outerM midM innerM post ant).
function menTop(p, x, y, s = 1, t0 = .2) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const j = { g, R, geo: {} };
  const ell = (C, rx, ry, a) => [C[0] + rx * Math.cos(rad(a)), C[1] + ry * Math.sin(rad(a))];
  const MED = { C: [1.2, 0], o: [1.3, 1.62], i: [.7, 1.12], ic: [1.42, -.1], a0: -128, a1: 132 };
  const LAT = { C: [-1.22, -.04], o: [1.18, 1.36], i: [.5, .66], ic: [-1.25, -.04], a0: 14, a1: 346 };
  // a band of the meniscus between fractions u0..u1 of its width (0 inner, 1 outer), from angle b0 to b1
  const band = (M, u0, u1, b0 = M.a0, b1 = M.a1) => {
    const P = [], Q = [], n = 40, lerpP = (a, u) => { const O = ell(M.C, M.o[0], M.o[1], a), I = ell(M.ic, M.i[0], M.i[1], a); return [lerp(I[0], O[0], u) * R, lerp(I[1], O[1], u) * R]; };
    for (let i = 0; i <= n; i++) { const a = lerp(b0, b1, i / n); P.push(lerpP(a, u1)); Q.push(lerpP(a, u0)); }
    return smoothD([...P, ...Q.reverse()]);
  };
  j.band = band; j.MED = MED; j.LAT = LAT;
  mk('path', { d: smoothD(kneeU([[-2.75, -.2], [-2.45, -1.35], [-1.3, -1.75], [0, -1.35], [1.3, -1.9], [2.6, -1.3], [2.85, .2], [2.4, 1.55], [1.2, 1.95], [0, 1.45], [-1.35, 1.7], [-2.5, 1.2]], R)),
    fill: boneGrad(defs, 0, 0, 1, 1, mix(ANAT.bone, '#f6d9a8', .2)), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 2 }, g);
  mk('path', { d: smoothD(kneeU([[-.38, -.95], [.38, -.95], [.32, .9], [-.32, .9]], R)), fill: mix(ANAT.bone, '#000000', .12), opacity: .6 }, g);   // intercondylar area
  const plain = mk('g', {}, g), zoneG = mk('g', { opacity: 0 }, g);
  [MED, LAT].forEach(M => mk('path', { d: band(M, 0, 1), fill: MEN_C, stroke: mix(MEN_C, '#000000', .45), 'stroke-width': 1.6 }, plain));
  [MED, LAT].forEach(M => [[0, 1 / 3, '#f6efe6'], [1 / 3, 2 / 3, '#f2c2b0'], [2 / 3, 1, '#e48a80']].forEach(([u0, u1, c]) => mk('path', { d: band(M, u0, u1), fill: c, stroke: mix(c, '#000000', .3), 'stroke-width': 1 }, zoneG)));
  path(g, `M${f(-.55 * R)} ${f(-1.3 * R)}Q0 ${f(-1.55 * R)} ${f(.55 * R)} ${f(-1.42 * R)}`, { stroke: ANAT.tendon, 'stroke-width': 4 });   // transverse ligament
  const acl = mk('ellipse', { cx: .05 * R, cy: -.62 * R, rx: .26 * R, ry: .2 * R, fill: ANAT.tendon, opacity: .85 }, g), pcl = mk('ellipse', { cx: 0, cy: 1.15 * R, rx: .3 * R, ry: .2 * R, fill: ANAT.tendon, opacity: .85 }, g);
  const tG = mk('g', {}, g);
  Object.assign(j, { plain, zoneG, tG, acl, pcl });
  j.zones = (t, dur = .6) => { show(zoneG, t, dur); return zoneG; };
  const mPt = (M, a, u) => { const O = ell(M.C, M.o[0], M.o[1], a), I = ell(M.ic, M.i[0], M.i[1], a); return [lerp(I[0], O[0], u) * R, lerp(I[1], O[1], u) * R]; };
  j.mPt = (side, a, u) => mPt(side === 'L' ? LAT : MED, a, u);
  j.tear = (kind, t, side = 'M') => {
    const M = side === 'L' ? LAT : MED, tg = mk('g', { opacity: 0 }, tG), st0 = { stroke: FRAC_C, 'stroke-width': 3.5, 'stroke-linecap': 'round', fill: 'none' };
    if (kind === 'long') { const P = []; for (let a = 20; a <= 120; a += 5) P.push(mPt(M, a, .78)); path(tg, smoothD(P, false), st0); }
    if (kind === 'radial') path(tg, ptsD([mPt(M, 60, 0), mPt(M, 60, .62)]), st0);
    if (kind === 'complex') { path(tg, ptsD([mPt(M, 70, 0), mPt(M, 75, .5), mPt(M, 95, .55), mPt(M, 100, .1)]), st0); path(tg, ptsD([mPt(M, 85, .3), mPt(M, 88, .7)]), st0); }
    if (kind === 'bucket') {
      const P = []; for (let a = -40; a <= 120; a += 5) P.push(mPt(M, a, .55)); path(tg, smoothD(P, false), st0);
      const hd = []; for (let a = -40; a <= 120; a += 5) { const A = mPt(M, a, .5), B = [lerp(A[0], .3 * R, .55), lerp(A[1], A[1] * .7, .55)]; hd.push(B); }
      mk('path', { d: smoothD(hd, false), fill: 'none', stroke: MEN_C, 'stroke-width': 10, 'stroke-linecap': 'round', opacity: .9 }, tg);
    }
    show(tg, t, .5);
    return tg;
  };
  j.repair = (t, side = 'M') => {
    const M = side === 'L' ? LAT : MED, rg = mk('g', { opacity: 0 }, tG);
    for (let a = 25; a <= 115; a += 15) path(rg, ptsD([mPt(M, a, .62), mPt(M, a, .95)]), { stroke: '#4d7cfe', 'stroke-width': 3, 'stroke-linecap': 'round' });
    show(rg, t, .5);
    return rg;
  };
  j.pmx = (t, side = 'M', b0 = 30, b1 = 120) => {
    const M = side === 'L' ? LAT : MED, cg = mk('g', { opacity: 0 }, tG);
    mk('path', { d: band(M, 0, .45, b0, b1), fill: mix(ANAT.bone, '#f6d9a8', .2), stroke: FRAC_C, 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }, cg);
    show(cg, t, .5);
    return cg;
  };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  j.at = name => j.stage(({ med: () => [1.4 * R, 0], lat: () => [-1.3 * R, 0], acl: () => [.05 * R, -.62 * R], pcl: () => [0, 1.15 * R], outerM: () => mPt(MED, 60, .85), midM: () => mPt(MED, 60, .5),
    innerM: () => mPt(MED, 60, .15), post: () => [0, 1.75 * R], ant: () => [0, -1.75 * R] })[name]());
  if (t0 !== null) show(g, t0);
  return j;
}
function kneeU(P, R) { return P.map(([a, b]) => [a * R, b * R]); }

/* ---------- chapter 22: the ankle and foot ---------- */
// A ligament, capsule or fascia along a polyline whose tension is given: set(P, k), k −1 (slack) … 0 … 1 (taut).
// Slack — wavy and dim; taut — straight, brighter, with a yellow glow. b.torn 0..1 opens a red gap in the middle.
function tBand(parent, { w = 6, col = ANAT.tendon } = {}) {
  const glow = mk('path', { fill: 'none', stroke: ANAT.taut, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': 0 }, parent);
  const e = mk('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
  const b = { k: 0, torn: 0, mid: [0, 0], pts: [], el: e, glowEl: glow, w };
  b.set = (P, k) => {
    b.k = k;
    const r = resample(P, 24), amp = Math.max(0, -k) * Math.min(8, r.L * .09);
    const Q = r.pts.map(({ p: q, t }, i) => { const u = i / 24, wv = amp * Math.sin(u * Math.PI * 3) * Math.sin(u * Math.PI); return [q[0] - t[1] * wv, q[1] + t[0] * wv]; });
    const d = ptsD(Q), tk = clamp(k, 0, 1) * (1 - b.torn);
    e.setAttribute('d', d); glow.setAttribute('d', d);
    e.setAttribute('stroke', b.torn > 0 ? mix(ANAT.tendon, FRAC_C, b.torn) : mix(mix(col, COL.board, .25), ANAT.taut, tk));
    e.setAttribute('stroke-width', (b.w * (.85 + .4 * tk)).toFixed(1));
    glow.setAttribute('stroke-width', (b.w * 3.2 * tk).toFixed(1)); glow.setAttribute('stroke-opacity', (.45 * tk).toFixed(2));
    const L = polyLen(Q);
    if (b.torn > 0) e.setAttribute('stroke-dasharray', `${(L * (.5 - .14 * b.torn)).toFixed(1)} ${(L * .28 * b.torn).toFixed(1)} ${L.toFixed(1)}`); else e.removeAttribute('stroke-dasharray');
    b.mid = Q[12]; b.pts = Q;
    return tk;
  };
  return b;
}
// The right ankle and foot from the side, toes to the right (anterior = +x), drawn like an X-ray over a soft skin.
// view 'lat' — from the lateral side (fibula and lateral malleolus, cuboid, 5th ray, fibularis tendons, sural nerve);
// 'med' — from the medial side (medial malleolus, navicular, medial cuneiform, 1st ray, tibialis posterior, flexor
// hallucis longus, abductor hallucis, the tibial nerve in the tarsal tunnel). R = 40; (x, y) — centre of the talar dome.
// set({ df, mtp, arch, lean, inv, ap, knee }): df — ankle dorsiflexion (+) / plantarflexion (−); mtp — toe extension at
// the MTP joint; arch — −1 flat (pronated) … +1 high (supinated), the toes raised (mtp) lift it (windlass); lean — tilt
// of the shank from vertical (+ forward); inv — inversion (+) / eversion (−), for the ligament tension only; ap —
// anterior (+) translation of the talus under the tibia in R (drawer); knee — knee flexion (slackens the gastrocnemius).
// plant: false — open chain (the foot turns under a still shank); 'flat' — the sole stays on the ground and the shank
// leans by df (closed chain); 'ball' — the metatarsal heads stay on the ground (a heel raise; the toes stay flat).
// Muscles (bellyEl, j.M): gast, sol, ta, tp, fhl (med), ext, fib (fibularis brevis), fibl (longus) (lat), abh (med).
// Bands (tBand, j.L): lat — atf, cf, ptf, aitf; med — dta, dtn, dtc, dtp, spring; both — fascia; caps: true adds
// j.C.ant / j.C.post (the ankle capsule). Methods: taa(t), fuse(kind, t) ('ankle' | 'subtalar' | 'mtp1' | 'triple'),
// ach(kind, t) ('rupture' | 'repair' | 'thick' | 'insert' | 'bursa'), latOp(kind, t) ('tear' | 'brostrom' | 'graft'),
// spur(t), nerve(t); frames S / Tl / C / M (column) / Tt (toes) map R-unit points to the model; at(name) — a stage point.
function ankleSag(p, x, y, s = 1, t0 = .2, { view = 'lat', muscles = null, ligs = true, caps = false, skin = true, plant = false, fade = 10, nerve = false } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1), lat = view === 'lat';
  const j = { g, R, view, q: { df: 0, mtp: 0, arch: 0, lean: 0, inv: 0, ap: 0, knee: 0 }, M: {}, L: {}, C: {}, geo: {}, onSet: [], off: [0, 0], fr: {} };
  const topMask = fadeMask(defs, 0, -(fade + 1.3) * R, 0, -fade * R, [[0, '#000'], [1, '#fff']]);
  const root = mk('g', {}, g);
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  // frames: { a (deg), o (model point of the local origin) }; F(fr, P) maps local R-unit points
  const F = (fr, P) => { const v = rotPt(P[0] * R, P[1] * R, fr.a); return [fr.o[0] + v[0], fr.o[1] + v[1]]; };
  const sub = (base, Q0, a) => { const A = F(base, Q0), v = rotPt(Q0[0] * R, Q0[1] * R, base.a + a); return { a: base.a + a, o: [A[0] - v[0], A[1] - v[1]] }; };
  const H0 = [-1.4, 2.4], M0 = lat ? [5.6, 2.42] : [6.0, 2.17], HC = lat ? [5.6, 2.15] : [6.0, 1.75];
  const skinG = mk('g', { opacity: .5 }, root), skinS = mk('g', { mask: topMask }, skinG);
  const backG = mk('g', {}, root), calG = mk('g', {}, root), talG = mk('g', {}, root), colG = mk('g', {}, root), toeG = mk('g', {}, root);
  const shG = mk('g', { mask: topMask }, root), malG = mk('g', {}, root), capG = mk('g', {}, root), ligG = mk('g', {}, root);
  const musG = mk('g', { mask: topMask }, root), tenG = mk('g', {}, root), nvG = mk('g', {}, root), topG = mk('g', {}, root);
  Object.assign(j, { calG, talG, colG, toeG, shG, malG, ligG, musG, topG, root });
  // --- skin
  const skFoot = skin ? mk('path', { fill: shadeGrad(defs, HIPSK_C).url, stroke: HIPSL_C, 'stroke-width': 2, 'stroke-linejoin': 'round' }, skinS) : null;
  // --- bones (local shapes)
  const bone = (par, P, o = {}) => boneSh(par, defs, U(P), o);
  const TIB = [[-.62, -12.6], [-.68, -4.2], [-.88, -2.0], [-1.06, -1.25], [-1.0, -.95], ...arcPts([0, 0], 1.04, -158, -22, 12).map(([a, b]) => [a, b]), [.98, -.55], [1.05, -1.25], [.85, -2.2], [.62, -4.2], [.6, -12.6]];
  const FIB = [[-.95, -12.6], [-.55, -12.6], [-.36, -3.0], [.18, -1.3], [.3, -.2], [.16, .6], [-.22, .8], [-.62, .45], [-.76, -.6], [-.92, -3.0]];
  const MMAL = [[.42, -1.0], [.55, -.35], [.36, .25], [.0, .36], [-.32, .1], [-.38, -.6]];
  const TAL = [[-1.12, .25], [-1.02, -.25], ...arcPts([0, 0], 1.0, -165, -18, 11).map(([a, b]) => [a, b]), [1.3, -.12], [1.8, .02], [2.2, .32], [2.26, .72], [2.02, 1.0], [1.6, 1.0], [1.12, .78], [.55, .95], [-.25, .98], [-.82, .78]];
  const CAL = [[-1.35, .86], [-.6, .98], [.1, 1.06], [.75, 1.14], [1.45, 1.18], [1.56, 1.55], [1.42, 1.86], [.6, 1.98], [-.4, 2.2], [-1.3, 2.4], [-1.86, 2.3], [-2.12, 1.85], [-2.06, 1.2], [-1.76, .9]];
  const SUST = [[-.25, 1.12], [.78, 1.1], [.84, 1.34], [-.1, 1.46]];
  const NAV = [[2.08, .14], [2.56, .08], [2.76, .34], [2.82, .9], [2.66, 1.36], [2.36, 1.48], [2.16, 1.2], [2.27, .7]];
  const CUN = [[2.84, .2], [3.46, .2], [3.56, .6], [3.5, 1.55], [3.3, 1.72], [2.76, 1.46], [2.88, .9]];
  const MT1 = [[3.56, .4], [3.86, .54], [5.6, 1.22], [6.1, 1.3], [6.42, 1.62], [6.32, 2.04], [5.95, 2.16], [5.55, 1.98], [3.86, 1.56], [3.56, 1.66]];
  const CUB = [[1.46, 1.2], [2.26, 1.18], [2.38, 1.6], [2.26, 2.1], [1.86, 2.2], [1.52, 1.86]];
  const LCUN = [[2.22, .45], [2.86, .4], [2.96, 1.2], [2.32, 1.26]];
  const MT5 = [[2.32, 1.45], [2.72, 1.36], [3.02, 1.55], [5.3, 1.92], [5.62, 1.9], [5.86, 2.12], [5.72, 2.4], [5.34, 2.38], [3.0, 2.06], [2.56, 2.32], [2.3, 2.16], [2.4, 1.8]];
  const RAYS = lat ? [[2.9, .4], [4.4, .62], [6.2, 1.25], [7.3, 1.5], [7.4, 1.82], [6.2, 1.85], [4.4, 1.52], [2.95, 1.35]] : [[3.4, .1], [4.6, .4], [6.4, 1.05], [7.5, 1.28], [7.6, 1.62], [6.4, 1.6], [4.6, 1.1], [3.45, .9]];
  // toes in column-local coordinates (rotate about HC)
  const TOES = lat ? [[[5.82, 1.98], [6.5, 2.0], [6.62, 2.18], [6.48, 2.36], [5.84, 2.36]], [[6.64, 2.04], [7.02, 2.06], [7.1, 2.22], [7.0, 2.34], [6.64, 2.34]], [[7.12, 2.08], [7.42, 2.12], [7.5, 2.26], [7.38, 2.36], [7.12, 2.34]]]
    : [[[6.32, 1.46], [7.35, 1.54], [7.5, 1.76], [7.35, 2.02], [6.32, 2.08]], [[7.52, 1.56], [8.2, 1.64], [8.36, 1.84], [8.16, 1.98], [7.52, 2.0]]];
  // draw the static shapes into their frame groups
  const tibE = bone(shG, TIB, { col: mix(ANAT.bone, '#f6d9a8', .2) });
  const plaf = path(shG, smoothD(arcPts([0, 0], 1.04 * R, -156, -24, 8), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .75 });
  let fibE = null, mmalE = null;
  malG.setAttribute('mask', topMask); backG.setAttribute('mask', topMask);
  if (lat) fibE = bone(malG, FIB, { col: mix(ANAT.bone, '#f6d9a8', .3), op: .88 });
  else { bone(backG, FIB.map(([a, b]) => [a + .15, b]), { col: mix(ANAT.bone, '#f6d9a8', .3), op: .25 }); mmalE = bone(malG, MMAL, { col: mix(ANAT.bone, '#f6d9a8', .2), op: .82 }); }
  const raysE = mk('g', {}, colG); bone(raysE, RAYS, { op: .32 });
  bone(calG, CAL);
  if (!lat) bone(calG, SUST, { col: mix(ANAT.bone, '#000000', .08) });
  else mk('ellipse', { cx: .25 * R, cy: 1.5 * R, rx: .22 * R, ry: .12 * R, fill: mix(ANAT.bone, '#000000', .2), opacity: .6 }, calG);   // fibular trochlea
  const talE = bone(talG, TAL);
  const dome = path(talG, smoothD(arcPts([0, 0], 1.0 * R, -160, -20, 8), false), { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .8 });
  if (lat) { bone(colG, LCUN, { op: .55 }); bone(colG, CUB); bone(colG, MT5); }
  else { bone(colG, NAV); bone(colG, CUN); bone(colG, MT1); mk('ellipse', { cx: 6.02 * R, cy: 2.1 * R, rx: .2 * R, ry: .13 * R, fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.2 }, colG); }
  const mtCart = path(colG, smoothD(arcPts(HC, lat ? .26 : .4, -70, 60, 10).map(([a, b]) => [a * R, b * R]), false), { stroke: CART_C, 'stroke-width': 3.5, 'stroke-opacity': .7 });
  void mtCart;
  TOES.forEach(P => bone(toeG, P));
  // --- frames and geometry
  const frames = () => {
    const q = j.q, k = clamp(q.mtp / 40, 0, 1), arch = clamp(q.arch + .55 * k * (plant === 'ball' || q.mtp > 0 ? 1 : 0), -1.2, 1.2);
    let aF = q.lean - q.df;
    const sh = { a: q.lean, o: [0, 0] };
    const ap = rotPt(q.ap * R, 0, q.lean), foot = { a: aF, o: ap };
    const Tl = sub(foot, [0, 0], -arch * 7), C = sub(foot, H0, -arch * 4), M = sub(foot, M0, arch * (lat ? 3 : 6));
    const Tt = sub(M, HC, -q.mtp);
    return { sh, foot, Tl, C, M, Tt, arch };
  };
  const pin = fr => {   // contact point of the chosen plant mode, in model coordinates
    if (plant === 'ball') return F(fr.M, [M0[0], 2.62]);
    return F(fr.C, [H0[0], 2.62]);
  };
  let pin0 = null;
  const L = j.L, Mu = j.M;
  // muscles
  const MS = lat ? ['gast', 'sol', 'ext', 'fib', 'fibl'] : ['gast', 'sol', 'ta', 'tp', 'fhl'];
  const MW = { gast: [1.6, ANAT.muscle, .02, .54], sol: [1.3, ANAT.muscleDeep, .03, .36], ta: [.72, ANAT.muscle, .02, .56], tp: [.62, ANAT.muscleDeep, .03, .52], fhl: [.6, ANAT.muscleDeep, .03, .62],
    ext: [.66, ANAT.muscle, .02, .62], fib: [.62, ANAT.muscle, .03, .5], fibl: [.62, ANAT.muscleDeep, .02, .56], abh: [.42, ANAT.muscleDeep, .14, .16] };
  (muscles || MS).forEach(k0 => { const [w, col, ta, tb2] = MW[k0]; Mu[k0] = bellyEl(k0 === 'abh' ? tenG : musG, { w: w * R, col, ta, tb: tb2, tw: 6 }); });
  // ligaments: [name, width, frameA, pointA, frameB, pointB, tension(q, arch)]
  const neg = v => Math.max(0, -v), pos = v => Math.max(0, v);
  const LD = lat ? [
    ['aitf', 5, 'sh', [.5, -1.15], 'sh', [.12, -.62], q => -.3 + pos(q.df) / 18],
    ['ptf', 6, 'sh', [-.55, .2], 'Tl', [-1.05, .45], q => -.35 + pos(q.df) / 22 + neg(q.ap) / .3],
    ['cf', 6, 'sh', [-.12, .62], 'C', [-.72, 1.72], q => -.25 + pos(q.inv) / 14 + pos(q.df) / 30],
    ['atf', 7, 'sh', [.32, -.08], 'Tl', [1.15, .45], q => -.25 + neg(q.df) / 25 + pos(q.inv) / 18 + pos(q.ap) / .25 - pos(q.df) / 40],
  ] : [
    ['dtp', 6, 'sh', [-.25, .1], 'Tl', [-.92, .6], q => -.3 + pos(q.df) / 20 + neg(q.inv) / 18],
    ['dtc', 6, 'sh', [.02, .3], 'C', [.1, 1.12], q => -.3 + neg(q.inv) / 12],
    ['dta', 6, 'sh', [.38, .05], 'Tl', [1.15, .5], q => -.3 + neg(q.df) / 25 + neg(q.inv) / 18],
    ['dtn', 6, 'sh', [.45, -.1], 'M', [2.3, .55], (q, a) => -.3 + neg(q.df) / 22 + neg(q.inv) / 15 + neg(a) * .5],
    ['spring', 8, 'C', [.55, 1.42], 'M', [2.38, 1.36], (q, a) => -.3 + neg(a) * 1.1],
  ];
  if (ligs) LD.forEach(([k0, w]) => { L[k0] = tBand(ligG, { w }); });
  L.fascia = tBand(ligG, { w: 7 });
  if (caps) { j.C.ant = tBand(capG, { w: 5, col: CAPS_C }); j.C.post = tBand(capG, { w: 5, col: CAPS_C }); }
  j.capK = 1;
  // nerves (med: tibial nerve in the tarsal tunnel and its branches; lat: sural nerve)
  const nvLine = w => { const a = path(nvG, '', { stroke: COL.board, 'stroke-width': w + 4, 'stroke-linecap': 'round', 'stroke-opacity': .8 }), b = path(nvG, '', { stroke: '#ffe14d', 'stroke-width': w, 'stroke-linecap': 'round' }); return { setAttribute: (k, v) => { a.setAttribute(k, v); b.setAttribute(k, v); } }; };
  const nv = nerve ? [nvLine(4), nvLine(3), nvLine(3)] : null;
  const ret = !lat ? path(tenG, '', { stroke: mix(ANAT.tendon, COL.board, .3), 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-opacity': .55 }) : null;
  const draw = () => {
    const q = j.q, fr = frames(), Sx = P => F(fr.sh, P), Tx = P => F(fr.Tl, P), Cx = P => F(fr.C, P), Mx = P => F(fr.M, P), Ox = P => F(fr.Tt, P);
    j.fr = fr; Object.assign(j, { S: Sx, Tl: Tx, Cf: Cx, Mc: Mx, Tt: Ox });
    if (plant) { const P = pin(fr); if (!pin0) pin0 = P; j.off = [pin0[0] - P[0], pin0[1] - P[1]]; }
    root.setAttribute('transform', `translate(${f(j.off[0])} ${f(j.off[1])})`);
    const tr = fr0 => `translate(${f(fr0.o[0])} ${f(fr0.o[1])}) rotate(${f(fr0.a)})`;
    [shG, malG, backG].forEach(e => e.setAttribute('transform', tr(fr.sh)));
    talG.setAttribute('transform', tr(fr.Tl)); calG.setAttribute('transform', tr(fr.C)); colG.setAttribute('transform', tr(fr.M)); toeG.setAttribute('transform', tr(fr.Tt));
    // muscles
    const kn = clamp(q.knee / 90, 0, 1.2);
    if (Mu.tp) Mu.tp.set([Sx([-.3, -11.0]), Sx([-.72, -7.0]), Sx([-.6, -3.5]), Sx([-.48, -1.2]), Sx([-.42, -.35]), Sx([-.1, .55]), Cx([1.0, 1.0]), Mx([2.4, 1.42])]);
    if (Mu.fhl) Mu.fhl.set([Sx([-.9, -9.6]), Sx([-1.05, -5.6]), Sx([-.98, -2.2]), Sx([-.92, -.7]), Tx([-.88, .7]), Cx([.1, 1.6]), Mx([3.5, 2.02]), Mx([5.7, 2.28]), Ox([7.0, 2.15]), Ox([8.1, 1.98])]);
    if (Mu.fibl) Mu.fibl.set([Sx([-.75, -12.2]), Sx([-.9, -8.0]), Sx([-.88, -4.5]), Sx([-.82, -.3]), Sx([-.6, 1.0]), Cx([.7, 1.98]), Mx([1.9, 2.24]), Mx([2.3, 2.42])]);
    if (Mu.fib) Mu.fib.set([Sx([-.55, -8.6]), Sx([-.74, -5.0]), Sx([-.72, -2.2]), Sx([-.66, -.4]), Sx([-.42, .82]), Cx([.55, 1.66]), Mx([2.42, 1.86])]);
    if (Mu.sol) Mu.sol.set([Sx([-.75, -11.2]), Sx([-1.4, -8.6]), Sx([-1.38, -5.2]), Sx([-1.22, -2.8]), Sx([-1.38, -.55]), Cx([-2.0, 1.25])]);
    if (Mu.gast) Mu.gast.set([Sx([-1.15, -13.0 + 1.6 * kn]), Sx([-1.9, -10.2]), Sx([-1.8, -8.0]), Sx([-1.5, -6.0]), Sx([-1.3, -3.5]), Sx([-1.42, -.6]), Cx([-2.02, 1.18])]);
    if (Mu.ta) Mu.ta.set([Sx([.5, -11.6]), Sx([1.0, -8.5]), Sx([1.05, -5.0]), Sx([1.08, -2.4]), Sx([1.1, -1.05]), Tx([1.55, -.42]), Mx([2.75, .2]), Mx([3.2, 1.38])]);
    if (Mu.ext) Mu.ext.set([Sx([.25, -11.4]), Sx([.82, -8.2]), Sx([.95, -4.6]), Sx([1.02, -2.0]), Sx([1.08, -1.0]), Tx([1.6, -.42]), Mx([3.3, .55]), Mx([5.4, 1.42]), Ox([6.6, 1.88]), Ox([7.45, 2.08])]);
    if (Mu.abh) Mu.abh.set([Cx([-1.5, 2.08]), Cx([.3, 2.18]), Mx([3.5, 2.14]), Mx([5.5, 2.22]), Ox([6.5, 2.06])]);
    // ligaments and fascia
    const FX = { sh: Sx, Tl: Tx, C: Cx, M: Mx };
    if (ligs) LD.forEach(([k0, , fa, A, fb, B, ten]) => L[k0].set([FX[fa](A), FX[fb](B)], clamp(ten(q, fr.arch), -1, 1)));
    const fk = -.35 + neg(fr.arch) * .9 + clamp(q.mtp / 35, 0, 1) + pos(q.df) / 40;
    L.fascia.set([Cx([-1.25, 2.38]), Cx([-.2, 2.3]), Mx([3.2, 2.22]), Mx([HC[0], HC[1] + (lat ? .38 : .5)]), Ox([HC[0] + .5, HC[1] + (lat ? .32 : .42)])], clamp(fk, -1, 1));
    if (j.C.ant) { j.C.ant.set([Sx([.95, -.62]), Sx([1.25, -.3]), Tx([1.3, -.05])], clamp((-.3 + neg(q.df) / 30) * j.capK + (j.capK - 1) * .4, -1, 1)); j.C.post.set([Sx([-1.0, -.95]), Sx([-1.3, -.4]), Tx([-1.05, .2])], clamp((-.3 + pos(q.df) / 15) * j.capK + (j.capK - 1) * .4, -1, 1)); }
    if (ret) ret.setAttribute('d', ptsD([Sx([-.05, -.2]), Sx([-.75, .5]), Cx([-1.45, 1.3])]));
    if (nv) {
      if (lat) { nv[0].setAttribute('d', smoothD([Sx([-1.25, -4.5]), Sx([-1.1, -1.4]), Sx([-.75, .9]), Cx([.4, 1.82]), Mx([2.6, 2.02]), Mx([4.6, 2.12])], false)); nv[1].setAttribute('d', ''); nv[2].setAttribute('d', ''); }
      else {
        nv[0].setAttribute('d', smoothD([Sx([-.7, -5.0]), Sx([-.8, -1.4]), Sx([-.6, .25]), Cx([-.2, 1.4])], false));
        nv[1].setAttribute('d', smoothD([Cx([-.2, 1.4]), Cx([.6, 1.78]), Mx([3.0, 1.95]), Mx([5.4, 2.1])], false));
        nv[2].setAttribute('d', smoothD([Cx([-.35, 1.5]), Cx([-1.0, 1.95]), Cx([-1.5, 2.2])], false));
      }
    }
    // skin
    if (skin) {
      const P = lat ? [Cx([-2.3, .95]), Cx([-2.38, 1.95]), Cx([-1.85, 2.62]), Cx([-.4, 2.62]), Mx([2.6, 2.62]), Mx([5.4, 2.62]), Ox([6.4, 2.62]), Ox([7.6, 2.56]), Ox([7.9, 2.28]), Ox([7.6, 1.84]),
        Ox([6.4, 1.74]), Mx([5.0, 1.36]), Mx([3.2, .45]), Tx([1.7, -.55]), Sx([1.05, -1.25]), Sx([1.1, -3.5]), Sx([1.32, -7.5]), Sx([1.38, -13.2]), Sx([-2.4, -13.2]), Sx([-2.62, -9.8]), Sx([-2.3, -7.0]), Sx([-1.85, -4.2]), Sx([-1.62, -2.4])]
        : [Cx([-2.3, .95]), Cx([-2.38, 1.95]), Cx([-1.85, 2.62]), Cx([-.3, 2.6]), Mx([2.6, 2.32]), Mx([4.6, 2.5]), Mx([6.0, 2.62]), Ox([7.2, 2.4]), Ox([8.3, 2.26]), Ox([8.62, 2.0]), Ox([8.42, 1.62]),
          Ox([7.2, 1.34]), Mx([5.6, .98]), Mx([3.4, .02]), Tx([1.7, -.55]), Sx([1.05, -1.25]), Sx([1.1, -3.5]), Sx([1.32, -7.5]), Sx([1.38, -13.2]), Sx([-2.4, -13.2]), Sx([-2.62, -9.8]), Sx([-2.3, -7.0]), Sx([-1.85, -4.2]), Sx([-1.62, -2.4])];
      skFoot.setAttribute('d', smoothD(P));
    }
    j.geo.arch = fr.arch;
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); if (plant === 'flat' && o.df !== undefined && o.lean === undefined) j.q.lean = j.q.df; if (plant === 'ball' && (o.df !== undefined || o.lean !== undefined) && o.mtp === undefined) j.q.mtp = Math.max(0, j.q.lean - j.q.df); draw(); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt((P[0] + j.off[0]) * S0.s, (P[1] + j.off[1]) * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  if (plant) pin0 = pin(j.fr);
  const PT = {
    ankle: () => j.S([0, 0]), malL: () => j.S([0, .6]), malM: () => j.S([.05, .3]), tibia: () => j.S([0, -1.2]), shin: () => j.S([.65, -6.0]), calf: () => j.S([-1.8, -8.8]), ach: () => j.S([-1.4, -1.2]),
    achIns: () => j.Cf([-2.05, 1.3]), heel: () => j.Cf([-1.5, 2.62]), heelBack: () => j.Cf([-2.3, 1.6]), sole: () => j.Cf([-1.0, 2.62]), fasciaIns: () => j.Cf([-1.15, 2.32]),
    talus: () => j.Tl([.3, .3]), neck: () => j.Tl([1.25, .45]), head: () => j.Tl([1.8, .55]), sust: () => j.Cf([.3, 1.25]), tunnel: () => j.S([-.6, .25]), nav: () => j.Mc([2.42, 1.42]),
    cub: () => j.Mc([1.9, 1.7]), base5: () => j.Mc([2.42, 1.95]), mtHead: () => j.Mc([HC[0], HC[1]]), ball: () => j.Mc([M0[0], 2.62]), arch: () => j.Mc([3.0, 2.3]), dorsum: () => j.Mc([4.0, .8]),
    toe: () => j.Tt(lat ? [7.45, 2.2] : [8.3, 1.85]), mtp: () => j.Mc(HC),
    atf: () => L.atf ? L.atf.mid : [0, 0], cf: () => L.cf ? L.cf.mid : [0, 0], ptf: () => L.ptf ? L.ptf.mid : [0, 0], spring: () => L.spring ? L.spring.mid : [0, 0], fascia: () => L.fascia.mid,
    dtn: () => L.dtn ? L.dtn.mid : [0, 0], dtc: () => L.dtc ? L.dtc.mid : [0, 0] };
  j.at = name => j.stage(PT[name]());
  // --- operations and lesions
  const fx = (fr0, par) => { const e = mk('g', { opacity: 0 }, par); return e; };
  j.taa = t => {
    const tg = fx(0, shG), ug = fx(0, talG);
    implSh(tg, defs, U([[-.95, -1.18], [1.0, -1.18], [1.0, -.98], [.18, -.98], [.12, -2.7], [-.12, -2.7], [-.18, -.98], [-.95, -.98]]));
    mk('path', { d: smoothD([...arcPts([0, 0], 1.12 * R, -158, -22, 10), ...arcPts([0, 0], .98 * R, -22, -158, 10)]), fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4 }, ug);
    mk('path', { d: smoothD([...arcPts([0, 0], .98 * R, -165, -15, 10), ...arcPts([0, 0], .82 * R, -15, -165, 10)]), fill: boneGrad(defs, 0, 0, 1, 0, IMPL_C), stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.6 }, ug);
    implSh(ug, defs, U([[-.1, -.85], [.1, -.85], [.08, -.35], [-.08, -.35]]));
    [dome, plaf].forEach(e => hide(e, t, .4));
    show(tg, t, .6); show(ug, t + .2, .6);
    return { tg, ug };
  };
  const screw = (par, A, B, w = .16) => { const dx = B[0] - A[0], dy = B[1] - A[1], Ln = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI, e = mk('g', { transform: `translate(${f(A[0] * R)} ${f(A[1] * R)}) rotate(${f(a)})` }, par);
    implSh(e, defs, [[0, -w * R], [Ln * R * .92, -w * .8 * R], [Ln * R, 0], [Ln * R * .92, w * .8 * R], [0, w * R]]);
    for (let u = .3; u < .9; u += .12) path(e, `M${f(u * Ln * R)} ${f(-w * .8 * R)}L${f((u + .05) * Ln * R)} ${f(w * .8 * R)}`, { stroke: mix(IMPL_C, '#000000', .45), 'stroke-width': 1.2 });
    mk('rect', { x: -.08 * R, y: -w * 1.6 * R, width: .14 * R, height: w * 3.2 * R, rx: 2, fill: IMPL_C, stroke: mix(IMPL_C, '#000000', .5), 'stroke-width': 1.2 }, e);
    return e; };
  j.fuse = (kind, t) => {
    const out = [];
    if (kind === 'ankle') {
      const fg = fx(0, shG);
      mk('path', { d: smoothD([...arcPts([0, 0], 1.08 * R, -160, -20, 10), ...arcPts([0, 0], .94 * R, -20, -160, 10)]), fill: mix(ANAT.bone, '#c8d8ff', .35), stroke: mix(ANAT.bone, '#000000', .4), 'stroke-width': 1.2 }, fg);
      screw(fg, [-.55, -3.0], [.35, .55]); screw(fg, [.75, -2.8], [-.25, .6]); screw(fg, [.15, -3.2], [.1, .7], .14);
      [dome, plaf].forEach(e => hide(e, t, .4)); show(fg, t, .6); out.push(fg);
    }
    if (kind === 'subtalar' || kind === 'triple') { const fg = fx(0, calG); mk('path', { d: smoothD(U([[-1.3, .86], [1.3, 1.14], [1.3, 1.3], [-1.3, 1.02]])), fill: mix(ANAT.bone, '#c8d8ff', .35), opacity: .9 }, fg); screw(fg, [-1.75, 2.2], [.25, .55], .17); show(fg, t, .6); out.push(fg); }
    if (kind === 'triple') { const fg = fx(0, colG); mk('path', { d: smoothD(U(lat ? [[1.4, 1.2], [1.56, 1.2], [1.6, 2.0], [1.44, 2.0]] : [[2.1, .2], [2.32, .2], [2.3, 1.3], [2.1, 1.3]])), fill: mix(ANAT.bone, '#c8d8ff', .45) }, fg); screw(fg, lat ? [2.3, 1.45] : [3.0, .55], lat ? [.9, 1.5] : [1.5, .55], .14); show(fg, t + .2, .6); out.push(fg); }
    if (kind === 'mtp1') { const fg = fx(0, toeG); implSh(fg, defs, U([[5.0, 1.12], [7.1, 1.4], [7.08, 1.56], [4.98, 1.28]])); [[5.3], [5.75], [6.6], [6.95]].forEach(([u]) => mk('circle', { cx: u * R, cy: (1.2 + (u - 5) * .13) * R, r: 3.2, fill: mix(IMPL_C, '#000000', .3) }, fg)); show(fg, t, .6); out.push(fg); }
    return out;
  };
  j.ach = (kind, t) => {
    const e = mk('g', { opacity: 0 }, topG), upd = () => {
      e.innerHTML = '';
      const A = j.S([-1.33, -1.1]), B = j.S([-1.38, -.55]), C0 = j.Cf([-2.05, 1.3]);
      if (kind === 'rupture') {
        mk('path', { d: ptsD([[A[0] - 12, A[1]], [A[0] + 12, A[1]], [B[0] + 12, B[1]], [B[0] - 12, B[1]]], true), fill: COL.board }, e);
        [A, B].forEach((P, i) => path(e, `M${f(P[0] - 9)} ${f(P[1])}l4 ${i ? -7 : 7}l4 ${i ? 7 : -7}l4 ${i ? -7 : 7}l4 ${i ? 7 : -7}`, { stroke: FRAC_C, 'stroke-width': 2.4 }));
      }
      if (kind === 'repair') { for (let k = 0; k < 4; k++) { const P = [lerp(A[0], B[0], k / 3), lerp(A[1], B[1], k / 3)]; path(e, `M${f(P[0] - 11)} ${f(P[1] - 4)}L${f(P[0] + 11)} ${f(P[1] + 4)}`, { stroke: '#4d7cfe', 'stroke-width': 2.6 }); } }
      if (kind === 'thick') { const P = j.S([-1.36, -1.7]); mk('ellipse', { cx: f(P[0]), cy: f(P[1]), rx: 13, ry: 30, fill: '#ff9a7a', 'fill-opacity': .55, stroke: FRAC_C, 'stroke-width': 2 }, e); }
      if (kind === 'insert') mk('ellipse', { cx: f(C0[0] - 4), cy: f(C0[1]), rx: 12, ry: 17, fill: '#ff9a7a', 'fill-opacity': .55, stroke: FRAC_C, 'stroke-width': 2 }, e);
      if (kind === 'bursa') { const P = j.Cf([-1.86, .78]); mk('ellipse', { cx: f(P[0]), cy: f(P[1]), rx: 10, ry: 14, fill: BURSA_C, 'fill-opacity': .6, stroke: BURSA_C, 'stroke-width': 2 }, e); }
    };
    j.onSet.push(upd); upd(); show(e, t, .5);
    return e;
  };
  j.latOp = (kind, t) => {
    const e = mk('g', { opacity: 0 }, topG);
    if (kind === 'tear') { prog(q => { ['atf', 'cf'].forEach(k0 => { if (L[k0]) L[k0].torn = q; }); draw(); }, t, .8); return e; }
    const upd = () => {
      e.innerHTML = '';
      if (kind === 'brostrom') {
        ['atf', 'cf'].forEach(k0 => { if (!L[k0]) return; const P = L[k0].pts; [6, 12, 18].forEach(i => { const A = P[i], B = P[i + 1] || P[i], nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny) || 1; path(e, `M${f(A[0] - nx / l * 9)} ${f(A[1] - ny / l * 9)}L${f(A[0] + nx / l * 9)} ${f(A[1] + ny / l * 9)}`, { stroke: '#4d7cfe', 'stroke-width': 2.6 }); }); });
        path(e, smoothD([j.Mc([2.8, .35]), j.Tl([1.5, -.2]), j.S([.55, -.6]), j.S([.15, -.55])], false), { stroke: mix(ANAT.tendon, '#ffffff', .2), 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-opacity': .75 });
      }
      if (kind === 'graft') {
        path(e, smoothD([j.Mc([2.42, 1.86]), j.Tl([1.18, .48]), j.S([.2, -.05]), j.S([-.38, .3]), j.Cf([-.66, 1.72]), j.Cf([.55, 1.9]), j.Mc([2.3, 2.0])], false), { stroke: GRAFT_C, 'stroke-width': 7, 'stroke-linecap': 'round' });
        [j.S([-.1, .12]), j.Cf([-.66, 1.72])].forEach(P => mk('circle', { cx: f(P[0]), cy: f(P[1]), r: 7, fill: COL.board, stroke: COL.dim, 'stroke-width': 2 }, e));
      }
    };
    j.onSet.push(upd); upd(); show(e, t, .6);
    return e;
  };
  j.spur = t => { const e = mk('path', { d: ptsD(U([[-1.25, 2.3], [-.65, 2.42], [-1.15, 2.48]]), true), fill: ANAT.bone, stroke: FRAC_C, 'stroke-width': 1.8, opacity: 0 }, calG); show(e, t, .5); return e; };
  if (t0 !== null) show(g, t0);
  return j;
}
// The right ankle from behind (posterior view; medial = screen left, lateral = screen right), like an X-ray over a soft
// skin. R = 40; (x, y) — centre of the talar dome. set({ inv, tilt, syn, dfk }): inv — inversion (+) / eversion (−) of
// the calcaneus under the talus (subtalar joint); tilt — inversion (+) of the talus in the mortise (talar tilt: the
// lateral joint opens); syn — the fibula pulled away from the tibia (R units, syndesmosis injury); dfk 0..1 — the wider
// front of the talus wedged into the mortise in dorsiflexion (the fibula moves slightly out).
// Muscles (bellyEl, j.M): gast, sol, fib (fibularis), tp (tibialis posterior). Bands (tBand, j.L): cf, ptf, dtc, dtp,
// syn (posterior tibiofibular). Methods: taa(t), fuse(kind, t) ('ankle' | 'subtalar'), synFuse(t); at(name).
function ankleRear(p, x, y, s = 1, t0 = .2, { muscles = ['gast', 'sol', 'fib', 'tp'], ligs = true, skin = true, fade = 10 } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const j = { g, R, q: { inv: 0, tilt: 0, syn: 0, dfk: 0 }, M: {}, L: {}, onSet: [] };
  const topMask = fadeMask(defs, 0, -(fade + 1.3) * R, 0, -fade * R, [[0, '#000'], [1, '#fff']]);
  const U = P => P.map(([a, b]) => [a * R, b * R]);
  const F = (fr, P) => { const v = rotPt(P[0] * R, P[1] * R, fr.a); return [fr.o[0] + v[0], fr.o[1] + v[1]]; };
  const sub = (base, Q0, a) => { const A = F(base, Q0), v = rotPt(Q0[0] * R, Q0[1] * R, base.a + a); return { a: base.a + a, o: [A[0] - v[0], A[1] - v[1]] }; };
  const skinG = mk('g', { opacity: .5 }, g), skinS = mk('g', { mask: topMask }, skinG);
  const solG = mk('g', { mask: topMask }, g), calG = mk('g', {}, g), talG = mk('g', {}, g), tibG = mk('g', { mask: topMask }, g), fibG = mk('g', { mask: topMask }, g);
  const ligG = mk('g', {}, g), tenG = mk('g', { mask: topMask }, g), topG = mk('g', {}, g);
  Object.assign(j, { calG, talG, tibG, fibG, topG });
  const skHeel = skin ? mk('path', { fill: shadeGrad(defs, HIPSK_C).url, stroke: HIPSL_C, 'stroke-width': 2 }, skinS) : null;
  const bone = (par, P, o = {}) => boneSh(par, defs, U(P), o);
  const PLAF = [[-.85, -.95], [-.4, -1.05], [0, -1.08], [.4, -1.06], [.8, -.98]];
  const TIBB = [[-.95, -12.6], [-1.0, -4.0], [-1.25, -2.0], [-1.42, -1.1], [-1.46, -.3], [-1.3, .22], [-1.0, .26], [-.88, -.5], ...PLAF, [.84, -1.25], [.75, -2.2], [.55, -4.0], [.55, -12.6]];
  const FIBB = [[.86, -12.6], [1.22, -12.6], [1.16, -4.0], [1.32, -1.6], [1.5, -.6], [1.44, .42], [1.22, .84], [.96, .72], [.87, -.1], [.89, -1.2], [.8, -4.0]];
  const TALB = [[-.86, -.6], [-.85, -.93], [-.4, -1.02], [0, -1.05], [.4, -1.03], [.82, -.95], [.88, -.6], [.9, 0], [.72, .55], [.35, .8], [-.3, .84], [-.75, .62], [-.87, 0]];
  const CALB = [[-1.0, .95], [-.3, .86], [.45, .83], [.96, .92], [1.16, 1.3], [1.26, 1.9], [1.1, 2.45], [.6, 2.7], [-.35, 2.72], [-.95, 2.5], [-1.1, 1.9], [-1.02, 1.4]];
  const SUSTB = [[-.98, .95], [-1.55, .98], [-1.62, 1.18], [-1.0, 1.26]];
  bone(calG, CALB); bone(calG, SUSTB, { col: mix(ANAT.bone, '#000000', .08) });
  const subC = path(calG, smoothD(U([[-.85, .9], [-.3, .84], [.4, .82], [.85, .88]]), false), { stroke: CART_C, 'stroke-width': 3.5, 'stroke-opacity': .7 });
  bone(talG, TALB);
  const dome = path(talG, smoothD(U([[-.82, -.93], [-.4, -1.0], [0, -1.03], [.4, -1.01], [.8, -.94]]), false), { stroke: CART_C, 'stroke-width': 5, 'stroke-opacity': .8 });
  const tibE = bone(tibG, TIBB, { col: mix(ANAT.bone, '#f6d9a8', .2) });
  const plafE = path(tibG, smoothD(U(PLAF), false), { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .75 });
  bone(fibG, FIBB, { col: mix(ANAT.bone, '#f6d9a8', .3), op: .92 });
  void subC; void tibE;
  const MW = { gast: [2.5, ANAT.muscle, .02, .52], sol: [3.0, ANAT.muscleDeep, .03, .32], fib: [.62, ANAT.muscle, .03, .5], tp: [.62, ANAT.muscleDeep, .03, .5] };
  muscles.forEach(k0 => { const [w, col, ta, tb2] = MW[k0]; j.M[k0] = bellyEl(k0 === 'sol' ? solG : tenG, { w: w * R, col, ta, tb: tb2, tw: 6 }); });
  const neg = v => Math.max(0, -v), pos = v => Math.max(0, v);
  const LD = [['syn', 6, 'S', [.42, -1.42], 'Fb', [.98, -1.05], q => -.3 + q.dfk * .6 + q.syn * 4],
    ['ptf', 6, 'Fb', [1.05, .25], 'Tl', [.45, .52], q => -.35 + pos(q.tilt) / 10],
    ['dtp', 6, 'S', [-.95, 0], 'Tl', [-.55, .45], q => -.3 + neg(q.inv) / 16 + neg(q.tilt) / 8],
    ['dtc', 6, 'S', [-1.18, .15], 'C', [-1.35, 1.05], q => -.25 + neg(q.inv) / 12 + neg(q.tilt) / 6],
    ['cf', 7, 'Fb', [1.28, .72], 'C', [1.2, 1.78], q => -.25 + pos(q.inv) / 14 + pos(q.tilt) / 6]];
  if (ligs) LD.forEach(([k0, w]) => { j.L[k0] = tBand(ligG, { w }); });
  const draw = () => {
    const q = j.q, S = { a: 0, o: [0, 0] }, Fb = { a: 0, o: [(q.syn + q.dfk * .06) * R, 0] }, Tl = sub(S, [-.86, -.93], q.tilt), C = sub(Tl, [0, .86], q.inv);
    const Sx = P => F(S, P), Fx = P => F(Fb, P), Tx = P => F(Tl, P), Cx = P => F(C, P);
    Object.assign(j, { S: Sx, Fb: Fx, Tl: Tx, Cf: Cx });
    const tr = fr0 => `translate(${f(fr0.o[0])} ${f(fr0.o[1])}) rotate(${f(fr0.a)})`;
    fibG.setAttribute('transform', tr(Fb)); talG.setAttribute('transform', tr(Tl)); calG.setAttribute('transform', tr(C));
    const M = j.M;
    if (M.gast) M.gast.set([Sx([0, -13.0]), Sx([0, -10.0]), Sx([0, -7.6]), Sx([.02, -5.6]), Sx([.03, -2.0]), Cx([.05, 1.45])]);
    if (M.sol) M.sol.set([Sx([0, -11.4]), Sx([0, -8.0]), Sx([.02, -4.6]), Sx([.03, -1.4]), Cx([.05, 1.5])]);
    if (M.fib) M.fib.set([Sx([1.05, -10.8]), Sx([1.2, -6.6]), Sx([1.3, -2.8]), Sx([1.32, -.8]), Fx([1.5, .55]), Cx([1.36, 1.5]), Cx([1.26, 2.15])]);
    if (M.tp) M.tp.set([Sx([-.5, -10.8]), Sx([-.78, -6.6]), Sx([-1.02, -2.8]), Sx([-1.12, -.9]), Sx([-1.38, .25]), Cx([-1.55, .95]), Cx([-1.45, 1.35])]);
    const FX = { S: Sx, Fb: Fx, Tl: Tx, C: Cx };
    if (ligs) LD.forEach(([k0, , fa, A, fb, B, ten]) => { const L0 = j.L[k0]; L0.set([FX[fa](A), FX[fb](B)], clamp(ten(q), -1, 1)); });
    if (skin) {
      skHeel.setAttribute('d', smoothD([Sx([-2.1, -13.2]), Sx([-2.35, -9.6]), Sx([-2.0, -6.0]), Sx([-1.7, -2.6]), Sx([-1.75, .2]), Cx([-1.5, 1.6]), Cx([-1.25, 2.6]), Cx([-.3, 3.0]), Cx([.7, 2.98]), Cx([1.45, 2.5]), Cx([1.6, 1.6]), Sx([1.8, .3]), Sx([1.78, -2.6]), Sx([2.1, -6.0]), Sx([2.45, -9.6]), Sx([2.2, -13.2])]));
    }
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  const PT = { malM: () => j.S([-1.2, .2]), malL: () => j.Fb([1.3, .75]), talus: () => j.Tl([0, 0]), sub: () => j.Tl([0, .86]), calc: () => j.Cf([0, 1.8]), heel: () => j.Cf([.1, 2.72]),
    sust: () => j.Cf([-1.35, 1.1]), ach: () => j.S([0, -1.4]), gapL: () => j.S([.82, -.95]), gapM: () => j.S([-.86, -.93]), fibT: () => j.Fb([1.42, .3]), tpT: () => j.S([-1.32, .3]),
    cf: () => j.L.cf ? j.L.cf.mid : [0, 0], ptf: () => j.L.ptf ? j.L.ptf.mid : [0, 0], dtc: () => j.L.dtc ? j.L.dtc.mid : [0, 0], dtp: () => j.L.dtp ? j.L.dtp.mid : [0, 0], syn: () => j.L.syn ? j.L.syn.mid : [0, 0],
    shin: () => j.S([0, -6.0]), calf: () => j.S([0, -9.0]) };
  j.at = name => j.stage(PT[name]());
  const screw = (par, A, B, w = .16) => { const dx = B[0] - A[0], dy = B[1] - A[1], Ln = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI, e = mk('g', { transform: `translate(${f(A[0] * R)} ${f(A[1] * R)}) rotate(${f(a)})` }, par);
    implSh(e, defs, [[0, -w * R], [Ln * R * .92, -w * .8 * R], [Ln * R, 0], [Ln * R * .92, w * .8 * R], [0, w * R]]);
    for (let u = .3; u < .9; u += .12) path(e, `M${f(u * Ln * R)} ${f(-w * .8 * R)}L${f((u + .05) * Ln * R)} ${f(w * .8 * R)}`, { stroke: mix(IMPL_C, '#000000', .45), 'stroke-width': 1.2 });
    return e; };
  j.taa = t => {
    const tg = mk('g', { opacity: 0 }, tibG), ug = mk('g', { opacity: 0 }, talG);
    implSh(tg, defs, U([[-.84, -1.2], [.8, -1.2], [.8, -1.0], [.14, -1.0], [.1, -2.6], [-.1, -2.6], [-.14, -1.0], [-.84, -1.0]]));
    mk('path', { d: ptsD(U([[-.82, -1.0], [.78, -1.0], [.78, -.84], [-.82, -.84]]), true), fill: POLY_C, stroke: mix(POLY_C, '#000000', .45), 'stroke-width': 1.4 }, ug);
    implSh(ug, defs, U([[-.8, -.84], [.78, -.84], [.84, -.62], [.7, -.5], [-.72, -.5], [-.86, -.62]]));
    [dome, plafE].forEach(e => hide(e, t, .4));
    show(tg, t, .6); show(ug, t + .2, .6);
    return { tg, ug };
  };
  j.fuse = (kind, t) => {
    const e = mk('g', { opacity: 0 }, kind === 'ankle' ? tibG : calG);
    if (kind === 'ankle') { mk('path', { d: smoothD(U([[-.85, -1.1], [.8, -1.1], [.8, -.85], [-.85, -.85]])), fill: mix(ANAT.bone, '#c8d8ff', .35) }, e); screw(e, [-.7, -3.0], [.2, .4]); screw(e, [.55, -3.0], [-.3, .4]); hide(dome, t, .4); hide(plafE, t, .4); }
    else { mk('path', { d: smoothD(U([[-.9, .8], [.9, .8], [.9, 1.0], [-.9, 1.0]])), fill: mix(ANAT.bone, '#c8d8ff', .35) }, e); screw(e, [.2, 2.55], [-.1, .1], .17); }
    show(e, t, .6);
    return e;
  };
  j.synFuse = t => { const e = mk('g', { opacity: 0 }, topG), upd = () => { e.innerHTML = ''; const A = j.S([-.4, -1.7]), B = j.Fb([1.35, -1.75]); const a = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI, Ln = Math.hypot(B[0] - A[0], B[1] - A[1]); const sg = mk('g', { transform: `translate(${f(A[0])} ${f(A[1])}) rotate(${f(a)})` }, e); implSh(sg, defs, [[0, -6], [Ln * .92, -5], [Ln, 0], [Ln * .92, 5], [0, 6]]); }; j.onSet.push(upd); upd(); show(e, t, .6); return e; };
  if (t0 !== null) show(g, t0);
  return j;
}
// The right foot from above (dorsal view, toes up; medial = screen left), bones over a soft skin. R = 40; (x, y) — the
// centre of the talar trochlea. set({ abd, hv }): abd — abduction (+) / adduction (−) of the forefoot at the transverse
// tarsal joint; hv — hallux valgus angle (the first metatarsal drifts medially, the big toe laterally). Methods: seg(t)
// → { hind, mid, fore } colour overlays; jl(name, t) — a joint line ('chopart' | 'lisfranc' | 'mtp'); axis(t) — the
// talocrural axis through the malleoli; press(t, dur) — the path of pressure in a step; derm(t) → { L4, L5, S1 };
// fuse(kind, t) ('triple' | 'tn' | 'mtp1'); bunion(t); at(name). Frames: H (hindfoot), Fo (forefoot), M1, Hx.
function footTop(p, x, y, s = 1, t0 = .2, { skin = true, mal = true } = {}) {
  const R = 40, g = G(p, { x, y, s, o: 0 }), defs = mk('defs', {}, g), f = v => v.toFixed(1);
  const j = { g, R, q: { abd: 0, hv: 0 }, onSet: [] };
  const KX = 1.3, U = P => P.map(([a, b]) => [a * KX * R, b * R]);
  const F = (fr, P) => { const v = rotPt(P[0] * KX * R, P[1] * R, fr.a); return [fr.o[0] + v[0], fr.o[1] + v[1]]; };
  const sub = (base, Q0, a) => { const A = F(base, Q0), v = rotPt(Q0[0] * KX * R, Q0[1] * R, base.a + a); return { a: base.a + a, o: [A[0] - v[0], A[1] - v[1]] }; };
  const skinG = mk('g', { opacity: .5 }, g), hindG = mk('g', {}, g), foreG = mk('g', {}, g), m1G = mk('g', {}, g), hxG = mk('g', {}, g), ovG = mk('g', {}, g), topG = mk('g', {}, g);
  Object.assign(j, { hindG, foreG, m1G, hxG, topG });
  const skE = skin ? mk('path', { fill: shadeGrad(defs, HIPSK_C).url, stroke: HIPSL_C, 'stroke-width': 2, 'stroke-linejoin': 'round' }, skinG) : null;
  const bone = (par, P, o = {}) => boneSh(par, defs, U(P), o);
  // a long bone between joint points A (base) and B (head): widths at the base, shaft and head
  const longB = (par, A0, B0, wb, ws, wh, o = {}) => {
    const A = [A0[0] * KX, A0[1]], B = [B0[0] * KX, B0[1]], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const at = (u, w) => [A[0] + ux * u * L + nx * w, A[1] + uy * u * L + ny * w];
    const P = [at(0, wb / 2), at(.18, ws * .62), at(.5, ws / 2), at(.8, ws * .6), at(.93, wh / 2), at(1.02, wh * .28), at(1.02, -wh * .28), at(.93, -wh / 2), at(.8, -ws * .6), at(.5, -ws / 2), at(.18, -ws * .62), at(0, -wb / 2), at(-.03, 0)];
    return boneSh(par, defs, P.map(([a, b]) => [a * R, b * R]), o);
  };
  const CALT = [[-.5, 1.0], [-.45, 1.9], [-.25, 2.6], [.35, 2.82], [.88, 2.5], [1.08, 1.6], [1.22, .5], [1.32, -.4], [1.36, -1.0], [.86, -1.06], [.7, -.5], [.6, .4]];
  const TALT = [[-.55, .95], [-.6, .2], [-.68, -.45], [-.85, -.95], [-.98, -1.45], [-.78, -1.92], [-.26, -2.0], [.12, -1.66], [.3, -1.0], [.62, -.55], [.62, .2], [.5, .95]];
  const NAVT = [[-1.32, -1.5], [-1.2, -1.86], [-.75, -2.16], [-.15, -2.22], [.26, -2.06], [.3, -1.86], [-.04, -1.96], [-.45, -2.02], [-.86, -1.84], [-1.06, -1.48]];
  const CUBT = [[.35, -1.02], [1.3, -1.07], [1.42, -1.6], [1.3, -2.36], [.76, -2.46], [.36, -2.12], [.3, -1.6]];
  const CUN = [[[-1.26, -2.16], [-.63, -2.22], [-.61, -3.2], [-1.2, -3.26]], [[-.6, -2.22], [-.13, -2.24], [-.12, -2.9], [-.6, -2.92]], [[-.1, -2.18], [.34, -2.14], [.4, -3.0], [-.1, -3.02]]];
  const MT = [[[-.9, -3.3], [-1.05, -6.35], .58, .32, .56], [[-.36, -2.95], [-.42, -6.75], .42, .2, .38], [[.14, -3.05], [.12, -6.55], .4, .19, .36], [[.62, -2.5], [.6, -6.2], .4, .19, .34], [[1.1, -2.45], [1.08, -5.8], .42, .2, .32]];
  const TOES = [[[-.42, -6.95], [-.45, -7.85], .27], [[-.45, -7.92], [-.46, -8.35], .25], [[-.46, -8.42], [-.47, -8.76], .24],
    [[.12, -6.75], [.1, -7.58], .26], [[.1, -7.64], [.08, -8.05], .24], [[.08, -8.12], [.07, -8.42], .23],
    [[.6, -6.4], [.58, -7.16], .25], [[.58, -7.22], [.56, -7.6], .23], [[.56, -7.66], [.55, -7.94], .22],
    [[1.08, -6.0], [1.05, -6.62], .24], [[1.05, -6.68], [1.03, -6.98], .22], [[1.03, -7.04], [1.02, -7.26], .21]];
  if (mal) { [[-.98, .25], [1.05, .95]].forEach(([a, b]) => mk('circle', { cx: a * KX * R, cy: b * R, r: .3 * R, fill: ballGrad(defs, mix(ANAT.bone, '#f6d9a8', .25)), stroke: mix(ANAT.bone, '#000000', .45), 'stroke-width': 1.5, opacity: .7 }, hindG)); }
  bone(hindG, CALT); bone(hindG, TALT);
  const tro = mk('g', {}, hindG);
  path(tro, `M${f(-.6 * KX * R)} ${f(-.45 * R)}L${f(-.5 * KX * R)} ${f(.9 * R)}M${f(.62 * KX * R)} ${f(-.55 * R)}L${f(.5 * KX * R)} ${f(.9 * R)}`, { stroke: CART_C, 'stroke-width': 4, 'stroke-opacity': .7 });
  bone(foreG, NAVT); bone(foreG, CUBT); CUN.forEach(P => bone(foreG, P));
  mk('ellipse', { cx: 1.5 * KX * R, cy: -2.3 * R, rx: .22 * R, ry: .18 * R, fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.5 }, foreG);
  MT.slice(1).forEach(([A, B, wb, ws, wh]) => longB(foreG, A, B, wb, ws, wh));
  TOES.forEach(([A, B, w]) => longB(foreG, A, B, w, w * .62, w * .9));
  const [m1A, m1B, m1wb, m1ws, m1wh] = MT[0];
  const bunE = mk('ellipse', { cx: -1.32 * KX * R, cy: -6.3 * R, rx: .1 * R, ry: .22 * R, fill: boneGrad(defs, 0, 0, 1, 0), stroke: mix(ANAT.bone, '#000000', .5), 'stroke-width': 1.4 }, m1G);
  longB(m1G, m1A, m1B, m1wb, m1ws, m1wh);
  longB(hxG, [-1.05, -6.66], [-1.1, -7.76], .46, .32, .42); longB(hxG, [-1.1, -7.84], [-1.12, -8.72], .42, .3, .38);
  const draw = () => {
    const q = j.q, H = { a: 0, o: [0, 0] }, Fo = sub(H, [.05, -1.6], q.abd), M1 = sub(Fo, m1A, -.35 * q.hv), Hx = sub(M1, m1B, q.hv);
    const Hp = P => F(H, P), Fp = P => F(Fo, P), Mp = P => F(M1, P), Xp = P => F(Hx, P);
    Object.assign(j, { H: Hp, Fo: Fp, M1: Mp, Hx: Xp });
    const tr = fr0 => `translate(${f(fr0.o[0])} ${f(fr0.o[1])}) rotate(${f(fr0.a)})`;
    foreG.setAttribute('transform', tr(Fo)); m1G.setAttribute('transform', tr(M1)); hxG.setAttribute('transform', tr(Hx));
    const kb = clamp(q.hv / 30, 0, 1.3);
    put(bunE, { o: kb > .05 ? 1 : 0 }); bunE.setAttribute('rx', f((.1 + .16 * kb) * R)); bunE.setAttribute('cx', f((-1.32 - .08 * kb) * KX * R));
    if (skin) skE.setAttribute('d', smoothD([Hp([.3, 3.05]), Hp([1.4, 1.6]), Hp([1.56, -.4]), Fp([1.72, -2.4]), Fp([1.5, -5.0]), Fp([1.38, -6.1]), Fp([1.2, -7.4]), Fp([.62, -8.15]), Fp([.08, -8.66]), Fp([-.46, -9.0]),
      Xp([-1.0, -9.02]), Xp([-1.42, -8.6]), Xp([-1.42, -7.4]), Mp([-1.48 - .14 * kb, -6.3]), Fp([-1.52, -4.2]), Fp([-1.58, -2.2]), Hp([-1.32, -.2]), Hp([-.85, 1.6]), Hp([-.45, 2.85])]));
    j.onSet.forEach(fn => fn(j));
  };
  j.set = (o = {}) => { Object.assign(j.q, o); draw(); return j; };
  j.stage = P => { const S0 = st(g), v = rotPt(P[0] * S0.s, P[1] * S0.s, S0.r || 0); return [S0.x + v[0], S0.y + v[1]]; };
  draw();
  const PT = { talus: () => j.H([0, .2]), head: () => j.H([-.45, -1.55]), nav: () => j.Fo([-.55, -2.0]), navTub: () => j.Fo([-1.3, -1.55]), cub: () => j.Fo([.85, -1.7]), cun: () => j.Fo([-.6, -2.7]),
    calc: () => j.H([.5, 1.9]), heel: () => j.H([.3, 2.5]), malM: () => j.H([-.98, .25]), malL: () => j.H([1.05, .95]), mt1h: () => j.M1([-1.05, -6.35]), mt1hM: () => j.M1([-1.4, -6.3]),
    mt5b: () => j.Fo([1.5, -2.3]), mt5h: () => j.Fo([1.08, -5.8]), mt2h: () => j.Fo([-.42, -6.75]), hallux: () => j.Hx([-1.12, -8.6]), toe2: () => j.Fo([-.46, -8.6]), toe5: () => j.Fo([1.02, -7.1]),
    chopart: () => j.Fo([.3, -1.5]), lisfranc: () => j.Fo([0, -3.05]), arch: () => j.Fo([-1.45, -2.6]), lat: () => j.Fo([1.55, -3.2]), mtp1: () => j.M1([-1.05, -6.45]) };
  j.at = name => j.stage(PT[name]());
  // --- overlays
  const ov = (par, P, col, t) => { const e = mk('path', { d: smoothD(U(P)), fill: col, 'fill-opacity': .3, stroke: col, 'stroke-width': 2.5, opacity: 0 }, par); if (t !== null) show(e, t, .5); return e; };
  j.seg = (t, gap = .8) => ({ hind: ov(hindG, [[-.75, 1.0], [-1.05, -1.5], [-.75, -2.05], [.2, -1.75], [1.42, -1.1], [1.25, .6], [.9, 2.6], [.3, 2.95], [-.4, 2.7]], '#f3c95c', t),
    mid: ov(foreG, [[-1.42, -1.45], [-1.2, -1.95], [-.4, -2.3], [.35, -2.05], [1.5, -1.0], [1.5, -2.45], [.45, -3.12], [-1.3, -3.35]], '#86c9e8', t === null ? null : t + gap),
    fore: ov(foreG, [[-1.45, -3.3], [1.35, -2.45], [1.45, -5.8], [1.2, -7.4], [-.5, -9.0], [-1.45, -8.9], [-1.5, -6.3]], '#8fd6b0', t === null ? null : t + 2 * gap) });
  j.jl = (name, t) => {
    const P = { chopart: [[-1.22, -1.42], [-.95, -1.82], [-.5, -2.02], [-.05, -1.92], [.32, -1.62], [.36, -1.05], [.86, -1.04], [1.36, -1.05]],
      lisfranc: [[-1.24, -3.26], [-.6, -3.24], [-.6, -2.93], [-.12, -2.92], [-.1, -3.03], [.4, -3.02], [.42, -2.5], [.86, -2.47], [1.36, -2.38]],
      mtp: [[-1.32, -6.5], [-.6, -6.88], [.12, -6.68], [.6, -6.33], [1.1, -5.94]] }[name];
    const e = path(name === 'chopart' ? foreG : foreG, ptsD(U(P)), { stroke: '#ff7aa8', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '10 6' }, { o: 0 });
    if (t !== null) show(e, t, .5);
    return e;
  };
  j.axis = t => { const e = G(topG, { o: 0 }), A = j.H([-.98, .25]), B = j.H([1.05, .95]), dx = B[0] - A[0], dy = B[1] - A[1];
    path(e, `M${f(A[0] - dx * .55)} ${f(A[1] - dy * .55)}L${f(B[0] + dx * .55)} ${f(B[1] + dy * .55)}`, { stroke: COL.task, 'stroke-width': 3.5, 'stroke-dasharray': '9 6' });
    if (t !== null) show(e, t, .5); e.A = A; e.B = B; return e; };
  j.press = (t, dur) => {
    const e = G(topG, { o: 0 }), P = [[.3, 2.5], [.95, 1.2], [1.2, -.6], [1.3, -2.6], [1.15, -4.8], [1.0, -5.9], [.1, -6.5], [-1.0, -6.5], [-1.12, -7.6], [-1.12, -8.4]];
    const tr = path(e, '', { stroke: '#ff9a5a', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-opacity': .6 }), dot = mk('circle', { r: 11, fill: '#ff9a5a', stroke: COL.board, 'stroke-width': 2 }, e);
    show(e, t, .3);
    prog(q => { const r = resample(P.map((Q, i) => i >= 8 ? j.Hx(Q) : Q[1] < -1.6 ? j.Fo(Q) : j.H(Q)), 60), n = Math.max(1, Math.round(q * 60)), pts = r.pts.slice(0, n + 1).map(o => o.p); tr.setAttribute('d', ptsD(pts)); const D0 = pts[pts.length - 1]; put(dot, { x: D0[0], y: D0[1] }); }, t, dur, lin);
    return e;
  };
  j.derm = t => ({ L4: ov(hindG, [[-1.2, 1.5], [-.75, 1.0], [-.85, -1.2], [-1.05, -3.5], [-1.15, -5.5], [-1.42, -5.5], [-1.52, -3.0], [-1.42, -.5]], '#c9b8e8', t),
    L5: ov(foreG, [[-.95, -1.0], [.6, -1.0], [.92, -4.6], [.85, -8.4], [-.55, -9.0], [-1.1, -8.8], [-1.18, -4.6]], '#86c9e8', t === null ? null : t + .8),
    S1: ov(hindG, [[.6, 2.9], [1.5, 1.0], [1.62, -2.5], [1.42, -6.2], [1.16, -7.45], [.86, -7.2], [1.02, -4.5], [1.0, -1.0], [.55, 1.6]], '#f3c95c', t === null ? null : t + 1.6) });
  j.fuse = (kind, t) => {
    const out = [];
    const bar = (par, P) => { const e = mk('path', { d: smoothD(U(P)), fill: mix(ANAT.bone, '#c8d8ff', .45), stroke: '#4d7cfe', 'stroke-width': 2.5, opacity: 0 }, par); show(e, t, .6); out.push(e); };
    if (kind === 'triple' || kind === 'tn') bar(foreG, [[-1.2, -1.45], [-.9, -1.85], [-.45, -2.06], [-.05, -1.98], [.3, -1.7], [.2, -1.5], [-.1, -1.72], [-.5, -1.84], [-.9, -1.66], [-1.08, -1.38]]);
    if (kind === 'triple') { bar(foreG, [[.36, -.95], [1.36, -1.0], [1.36, -1.16], [.36, -1.12]]); const e = path(hindG, ptsD(U([[-.4, .6], [.5, .5], [.55, -.6], [-.45, -.5]]), true), { stroke: '#4d7cfe', 'stroke-width': 2.5, 'stroke-dasharray': '6 5' }, { o: 0 }); show(e, t, .6); out.push(e); }
    if (kind === 'mtp1') { const e = mk('g', { opacity: 0 }, topG), upd = () => { e.innerHTML = ''; const A = j.M1([-1.0, -5.6]), B = j.Hx([-1.08, -7.5]); path(e, `M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`, { stroke: IMPL_C, 'stroke-width': 11, 'stroke-linecap': 'round' }); [0, .3, .7, 1].forEach(u => mk('circle', { cx: f(lerp(A[0], B[0], u)), cy: f(lerp(A[1], B[1], u)), r: 3.5, fill: mix(IMPL_C, '#000000', .35) }, e)); }; j.onSet.push(upd); upd(); show(e, t, .6); out.push(e); }
    return out;
  };
  j.bunion = t => { const e = mk('ellipse', { cx: -1.5 * KX * R, cy: -6.3 * R, rx: .28 * R, ry: .34 * R, fill: '#ff8a7a', 'fill-opacity': .45, stroke: FRAC_C, 'stroke-width': 2, opacity: 0 }, m1G); show(e, t, .5); return e; };
  void ovG;
  if (t0 !== null) show(g, t0);
  return j;
}

/* ---------- anat3 begin: live anatomy — glass mannequin, muscle modes, one colour code ---------- */
// Spec: docs/superpowers/specs/2026-10-24-live-anatomy-design.md. Off unless ANAT3.on, CHAPTER.anat or ?anat=1 (?anat=0 forces off).
// A muscle's mode comes from its length on the lesson clock: shortening (concentric), lengthening (eccentric) or still (isometric);
// its level from the lesson's act(v): 1 agonist, 2 synergist, 3 the rest (rest colour, blue when passively stretched).
const ANAT3 = {
  on: true,
  col: { con: '#E53935', ecc: '#FB8C00', iso: '#8E24AA', str: '#1E88E5', rest: '#D7CCC8', focus: '#F4A48C', lig: '#FDD835' },
  name: { con: 'укорачивается', ecc: 'удлиняется', iso: 'держит', str: 'растягивается пассивно', focus: 'мышца урока, не работает', rest: 'отдыхает', syn: 'пунктир — синергист' },
  order: ['con', 'ecc', 'iso', 'str', 'focus', 'rest', 'syn'],
  bone: '#E8E4DC', skinFill: .13, skinFillFar: .09, skinLine: 1.6, boneLine: 1.6, spineLine: 2.1, boneFill: .09, boneFarOp: .55,
  far: .28, farMix: .45, synMix: .38, restOp: .6, strOp: .85, strFull: .14,
  amp: { 1: .25, 2: .16, 3: .15, far: .15 },
  rate: .03, still: .15, fade: .12, sample: .03, jump: .3,
  legY: 884, store: 'animebook:anat-all', autoSyn: false,
  under: .85, skinLineMix: .15,   // board-coloured underlay below each body part (0 = none); contour: < 0 darker than the skin, > 0 lighter
  lvl: v => v >= .6 ? 1 : v >= .15 ? 2 : 3,
};
let ANAT_ON = null, ANAT_ALL = false, ANAT_T = null, ANAT_LEG = null, ANAT_LEGSIG = '', ANAT_LEGW = 0, ANAT_LEGAT = 0;
const ANAT_REG = new Set(), ANAT_FIGS = new Set();

// On or off for this page, resolved once: when the lesson boots, or at its first figure. Only a lesson page (#stage) can be on.
function anatInit() {
  if (ANAT_ON !== null) return;
  const stage = document.getElementById('stage'), q = new URLSearchParams(location.search);
  const ch = typeof CHAPTER !== 'undefined' ? CHAPTER : {};
  ANAT_ON = !!stage && (q.get('anat') === '1' || (q.get('anat') !== '0' && (ANAT3.on || !!ch.anat)));
  ANAT.stretch = ANAT_ON ? ANAT3.col.str : ANAT.taut;
  if (!ANAT_ON) return;
  ANAT.taut = ANAT3.col.lig;
  try { ANAT_ALL = localStorage.getItem(ANAT3.store) === '1'; } catch {}
  ANAT_LEG = mk('g', { id: 'anatLegend' }, stage);
  const help = document.getElementById('helpAnat');
  if (help) help.hidden = false;
  document.addEventListener('keydown', anatKey);
}
function anatEnabled() { if (ANAT_ON === null) anatInit(); return ANAT_ON; }

// Mode from length samples at least ANAT3.sample apart; a jump of the clock (a seek, a new step) restarts the samples.
function anatSense(s, L, t, rest) {
  if (s.t == null || t < s.t || t - s.t > ANAT3.jump) { s.t = t; s.L = L; s.still = 0; s.mode = s.mode || 'iso'; return s.mode; }
  const dt = t - s.t;
  if (dt < ANAT3.sample) return s.mode;
  const rel = (L - s.L) / dt / rest;
  s.t = t; s.L = L;
  if (Math.abs(rel) < ANAT3.rate) { s.still += dt; if (s.still >= ANAT3.still) s.mode = 'iso'; }
  else { s.still = 0; s.mode = rel < 0 ? 'con' : 'ecc'; }
  return s.mode;
}
// Fill, opacity, outline width (stage px), dash and legend key of a muscle at a level, in a mode, with a strain (length / rest − 1).
// focus: a resting muscle the lesson points at (attached and shown, or drawn by a model) keeps the anatomical muscle colour,
// opaque with a full outline, so it reads as "this muscle, not working" on glass and on opaque bodies alike.
function anatStyle(level, mode, strain, far = false, focus = false) {
  const C = ANAT3.col;
  let fill, op = 1, dash = null, key, sw = 1;
  if (level === 1) { key = mode; fill = C[mode]; }
  else if (level === 2) { key = mode; fill = mix(C[mode], COL.board, ANAT3.synMix); dash = '4 3'; }
  else {
    const q = clamp(strain / ANAT3.strFull, 0, 1);
    key = q > .3 ? 'str' : 'rest'; fill = mix(C.rest, C.str, q); op = ANAT3.restOp + (ANAT3.strOp - ANAT3.restOp) * q; sw = .7;
    if (focus) { key = q > .3 ? 'str' : 'focus'; fill = mix(C.focus, C.str, q); op = 1; sw = 1; }
  }
  if (far) { fill = mix(fill, COL.board, ANAT3.farMix); op *= ANAT3.far; }
  return { fill, op, dash, key, sw, stroke: mix(fill, '#000000', .45), amp: far ? ANAT3.amp.far : ANAT3.amp[level] };
}
// Thickness factor: thicker when short, thinner when long, within ±amp.
const anatK = (strain, amp) => clamp(1 - strain * 1.8, 1 - amp, 1 + amp);
// Scale of an element relative to the scene, so line widths can stay in stage pixels.
function anatScale(e) {
  const sc = document.getElementById('scene'), a = e.getCTM && e.getCTM(), b = sc && sc.getCTM && sc.getCTM();
  if (!a || !b) return 1;
  const m = b.inverse().multiply(a);
  return Math.hypot(m.a, m.b) || 1;
}
// Effective opacity of an element inside the scene.
function anatVis(e) {
  let o = 1;
  for (let n = e; n && n.getAttribute && n.id !== 'scene'; n = n.parentNode) {
    if (n.getAttribute('display') === 'none' || n.getAttribute('visibility') === 'hidden') return 0;
    o *= n._st ? (n._st.o ?? 1) : +(n.getAttribute('opacity') ?? 1);
  }
  return o;
}
// One step of the anatomy: every live muscle display senses its mode and repaints; then the legend follows what is on screen.
function anatTick(t, force = false) {
  if (!ANAT_ON) return;
  const dt = ANAT_T == null ? Infinity : t - ANAT_T;
  const q = force ? 1 : dt === 0 ? 0 : dt > 0 && dt <= ANAT3.jump ? 1 - Math.exp(-dt / ANAT3.fade) : 1;
  ANAT_T = t;
  const keys = new Set();
  ANAT_REG.forEach(d => { if (!d.alive()) ANAT_REG.delete(d); else d.tick(t, q, keys); });
  anatLegend(keys);
  anatLegPlace(false);
}
// The strip in the lower left corner: only the modes visible now; redrawn when that set changes.
function anatLegend(keys) {
  if (!ANAT_LEG) return;
  const list = ANAT3.order.filter(k => keys.has(k)), sig = list.join();
  if (sig === ANAT_LEGSIG) return;
  ANAT_LEGSIG = sig; ANAT_LEG.replaceChildren();
  if (!list.length) return;
  const y = ANAT3.legY, bg = mk('rect', { x: 14, y: y - 16, height: 22, rx: 6, fill: COL.board, 'fill-opacity': .85 }, ANAT_LEG);
  let x = 24;
  list.forEach(k => {
    mk('rect', k === 'syn' ? { x, y: y - 11, width: 12, height: 12, rx: 3, fill: 'none', stroke: COL.chalk, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }
      : { x, y: y - 11, width: 12, height: 12, rx: 3, fill: ANAT3.col[k] }, ANAT_LEG);
    const tx = mk('text', { x: x + 17, y, 'font-size': 14, 'font-family': UI, fill: COL.chalk }, ANAT_LEG);
    tx.textContent = ANAT3.name[k];
    x += 17 + (tx.getComputedTextLength() || ANAT3.name[k].length * 7.4) + 18;
  });
  bg.setAttribute('width', x - 22); ANAT_LEGW = x - 22;
  anatLegPlace(true);
}
// Where the strip goes: the first corner where it covers no visible text or card (lower left first). Checked when it changes
// and every half second, as lessons add labels while they play.
function anatLegPlace(force) {
  if (!ANAT_LEG || !ANAT_LEGW || !ANAT_LEG.firstChild) return;
  const now = performance.now();
  if (!force && now - ANAT_LEGAT < 500) return;
  ANAT_LEGAT = now;
  const stage = document.getElementById('stage'), M = stage && stage.getScreenCTM && stage.getScreenCTM();
  if (!M) return;
  const inv = M.inverse(), boxes = [];
  const add = r => {
    if (!r.width || !r.height) return;
    const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
    boxes.push([a.x, a.y, b.x, b.y]);
  };
  document.querySelectorAll('#scene text').forEach(t => { if (anatVis(t) > .2) add(t.getBoundingClientRect()); });
  document.querySelectorAll('#ui > *').forEach(e => add(e.getBoundingClientRect()));
  const w = ANAT_LEGW, h = 24, y0 = ANAT3.legY - 18, spots = [[14, y0], [1586 - w, y0], [14, 6], [1586 - w, 6]];
  const free = ([x, y]) => !boxes.some(([a, b, c, d]) => a < x + w && c > x && b < y + h && d > y);
  const [x, y] = spots.find(free) || spots[0];
  ANAT_LEG.setAttribute('transform', `translate(${(x - 14).toFixed(0)} ${(y - y0).toFixed(0)})`);
}
// The A key (Ф on the Russian layout): anatomy on every figure of the scene, or back to the lesson's choice.
function anatKey(e) {
  if (e.code !== 'KeyA' || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  const help = document.getElementById('help');
  if (help && !help.hidden) return;
  e.preventDefault();
  anatAll(!ANAT_ALL);
}
function anatAll(v) {
  ANAT_ALL = v;
  try { localStorage.setItem(ANAT3.store, v ? '1' : '0'); } catch {}
  ANAT_FIGS.forEach(f => {
    if (!f.g.isConnected) { ANAT_FIGS.delete(f); return; }
    if (v) anatFig(f, true).show(true); else if (f.anat && f.anat.byKey) f.anat.show(false);
  });
  if (ANAT_T != null) anatTick(ANAT_T, true);
}
// The lesson clock drives the modes: every evaluation of the main timeline ends with a tick; the lesson's boot resolves the switch.
const anatEvalTo0 = evalTo;
evalTo = function (t, list = TW) { anatEvalTo0(t, list); if (ANAT_ON && list === TW) anatTick(t); };
const anatBoot0 = boot;
boot = function () { anatInit(); return anatBoot0(); };
// Side-view attachments the glass figure needs that lessons before chapter 23 do not define (the chapter 23 values).
const ANAT_EXTRA = {
  glutMax: [['H', 'Sh', 14, -24], ['H', 'KN', 34, 12]],
  soleus: [['KN', 'AN', 20, 8], ['AN', 'heelN', 10, 0]],
  deltA: [['Sh', 'H', -7, -9], ['Sh', 'EN', 34, -7]],
  deltP: [['Sh', 'H', -7, 9], ['Sh', 'EN', 34, 7]],
  pecMaj: [['Sh', 'H', 26, -17], ['Sh', 'EN', 20, -6]],
  lat: [['H', 'Sh', 40, -21], ['Sh', 'EN', 16, 6]],
  foreFlex: [['EN', 'WN', 4, -7], ['WN', 'EN', -12, -3]],
  foreExt: [['EN', 'WN', 4, 7], ['WN', 'EN', -12, 3]],
};
for (const k in ANAT_EXTRA) if (!MUSCLE[k]) MUSCLE[k] = ANAT_EXTRA[k];
// Rig v2 segments: ends, radii, and the sign that turns the left-hand normal toward the front of the body (× f.dir).
const ANAT_SEG = {
  thN: ['H', 'KN', 16.5, 12, -1], shN: ['KN', 'AN', 12, 8, -1], torso: ['H', 'Sh', 23, 28, 1], uaN: ['Sh', 'EN', 11, 9, -1], faN: ['EN', 'WN', 9, 7, -1],
  thF: ['H', 'KF', 16, 11.5, -1], shF: ['KF', 'AF', 11.5, 7.5, -1], uaF: ['Sh', 'EF', 10.5, 8.5, -1], faF: ['EF', 'WF', 8.5, 6.5, -1],
};
// Muscles that hug a segment: name, segment, front (+1) or back (−1), from–to along it, depth (share of the radius), MUSCLE preset.
const ANAT_HUG = [
  ['erector', 'torso', -1, .02, .95, .34, 'parasp'], ['lat', 'torso', -1, .42, .86, .5, 'lat'], ['glutMax', 'torso', -1, -.2, .3, .78, 'glutMax'],
  ['rectAbd', 'torso', 1, .1, .62, .42, 'abdom'], ['pec', 'torso', 1, .62, .93, .55, 'pecMaj'],
  ['quads', 'thN', 1, .06, .94, .96, 'quads'], ['rectFem', 'thN', 1, .03, .86, .4, 'rectus'], ['hamstrings', 'thN', -1, .14, .93, .9, 'hamstrings'],
  ['soleus', 'shN', -1, .3, .86, .62, 'soleus'], ['gastroc', 'shN', -1, -.04, .58, .98, 'gastroc'], ['tibAnt', 'shN', 1, .08, .72, .6, 'tibAnt'],
  ['deltA', 'uaN', 1, -.14, .46, .95, 'deltA'], ['deltP', 'uaN', -1, -.14, .46, .95, 'deltP'],
  ['biceps', 'uaN', 1, .3, .88, .9, 'biceps'], ['triceps', 'uaN', -1, .3, .92, .9, 'triceps'],
  ['foreFlex', 'faN', 1, .04, .7, .9, 'foreFlex'], ['foreExt', 'faN', -1, .04, .7, .9, 'foreExt'],
];
const ANAT_FAR = [
  ['quads', 'thF', 1, .06, .94, .96, 'quads'], ['hamstrings', 'thF', -1, .14, .93, .9, 'hamstrings'],
  ['soleus', 'shF', -1, .3, .86, .62, 'soleus'], ['gastroc', 'shF', -1, -.04, .58, .98, 'gastroc'], ['tibAnt', 'shF', 1, .08, .72, .6, 'tibAnt'],
  ['biceps', 'uaF', 1, .3, .88, .9, 'biceps'], ['triceps', 'uaF', -1, .3, .92, .9, 'triceps'],
];
// Parts of the body from far to near; inside each, bones, muscles and skin are drawn in that order.
const ANAT_PLANES = [
  { parts: ['uaF', 'faF', 'hdF'], segs: ['uaF', 'faF'], bones: [['Sh', 'EF'], ['EF', 'WF']], far: true },
  { parts: ['thF', 'shF', 'ftF'], segs: ['thF', 'shF'], bones: [['H', 'KF'], ['KF', 'AF'], ['AF', 'toeF']], far: true },
  { parts: ['neck', 'torso'], segs: ['torso'], bones: [], head: true },
  { parts: ['thN', 'shN', 'ftN'], segs: ['thN', 'shN'], bones: [['H', 'KN'], ['KN', 'AN'], ['AN', 'toeN']] },
  { parts: ['uaN', 'faN', 'hdN'], segs: ['uaN', 'faN'], bones: [['Sh', 'EN'], ['EN', 'WN']] },
];
// Synergists lit automatically when the agonist is lit (only with ANAT3.autoSyn or CHAPTER.anatSyn; checked lesson by lesson).
const ANAT_SYN = { glutMax: ['hamstrings'], hamstrings: ['glutMax', 'gastroc'], gastroc: ['soleus'], soleus: ['gastroc'],
  parasp: ['glutMax'], deltA: ['pecMaj', 'biceps'], deltP: ['lat', 'triceps'], pecMaj: ['deltA'], lat: ['deltP', 'triceps'], biceps: ['foreFlex'], triceps: ['deltP'] };
const anatFarPt = n => n.endsWith('N') ? n.slice(0, -1) + 'F' : n;
const anatSpec = (preset, far) => { const [a, b] = MUSCLE[preset]; return far ? [a, b].map(([p0, p1, al, off]) => [anatFarPt(p0), anatFarPt(p1), al, off]) : [a, b]; };
// A point fixed to a body segment: `along` units from joint p0 toward p1, then `off` units sideways (the muscleOn convention).
function anatAttPt(f, [p0, p1, along, off]) {
  const A = f.pts[p0], B = f.pts[p1], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  return [A[0] + ux * along - uy * f.dir * off, A[1] + uy * along + ux * f.dir * off];
}
const anatLen = (f, [a, b]) => { const P = anatAttPt(f, a), Q = anatAttPt(f, b); return Math.hypot(P[0] - Q[0], P[1] - Q[1]); };
// Length of a drawn muscle from the joint angles: its standing length plus moment arm × the change of each joint it crosses
// (a straight line between attachment points misses most of the change at large angles). Arms in rig units (1 ≈ 0.43 cm);
// sign +1 when flexion of that joint lengthens the muscle. Joints: h hip (hN), k knee (kN), a ankle dorsiflexion (fN),
// s shoulder flexion (aN), e elbow (eN); the trunk is one segment, so the trunk muscles keep their length.
const ANAT_ARM = {
  quads: [['k', 10, 1]], rectus: [['h', 9, -1], ['k', 10, 1]], hamstrings: [['h', 14, 1], ['k', 7, -1]], glutMax: [['h', 14, 1]],
  gastroc: [['k', 5, -1], ['a', 12, 1]], soleus: [['a', 12, 1]], tibAnt: [['a', 9, -1]],
  deltA: [['s', 5, -1]], deltP: [['s', 5, 1]], pecMaj: [['s', 4, -1]], lat: [['s', 6, 1]],
  biceps: [['s', 2, -1], ['e', 8, -1]], triceps: [['s', 5, 1], ['e', 5, 1]],
};
const ANAT_JOINT = { h: 'h', k: 'k', a: 'f', s: 'a', e: 'e' };
function anatMuscleLen(f, preset, far, L0) {
  const side = far ? 'F' : 'N';
  return (ANAT_ARM[preset] || []).reduce((L, [j, r, sg]) => { const k = ANAT_JOINT[j] + side; return L + r * sg * rad((f.pose[k] ?? 0) - (STAND[k] ?? 0)); }, L0);
}
// The shared muscle a lesson passed (…MUSCLE[k] hands over the same arrays); looked up at call time, as lessons extend MUSCLE.
function anatPreset(a) { for (const k in MUSCLE) if (MUSCLE[k][0] === a) return k; return null; }
// Outline of a muscle hugging one side of a segment: the outer edge follows the skin, the inner edge curves in; k scales its thickness.
function anatHugPath(f, sh, k) {
  const [a, b, ra, rb, front] = ANAT_SEG[sh.seg], A = f.pts[a], B = f.pts[b];
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, sg = front * sh.side * f.dir;
  const nx = -uy * sg, ny = ux * sg, N = 14, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = sh.u0 + (sh.u1 - sh.u0) * s, r = ra + (rb - ra) * clamp(u, 0, 1);
    const h = sh.depth * r, mid = r - h / 2, th = h / 2 * Math.sin(Math.PI * s) ** .65 * k;
    const cx = A[0] + ux * L * u, cy = A[1] + uy * L * u, o = Math.min(mid + th, r * 1.12), n = Math.max(mid - th, 0);
    out.push([cx + nx * o, cy + ny * o]); inn.push([cx + nx * n, cy + ny * n]);
  }
  const f1 = v => v.toFixed(1), pts = [...out, ...[...inn].reverse()];
  const fib = [-.45, 0, .45].map(w0 => { const w = (1 + w0) / 2; return 'M' + out.map((p, i) => f1(p[0] * (1 - w) + inn[i][0] * w) + ' ' + f1(p[1] * (1 - w) + inn[i][1] * w)).join('L'); }).join('');
  return { d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z', fib };
}
// The glass layer of a rig v2 figure, built once: per part of the body (far → near) its bones, muscles and skin.
// The original capsules stay as the geometry source but are hidden. byKey: made anatomical only by the A key.
function anatFig(f, byKey = false) {
  if (f.anat) { if (!byKey) f.anat.byKey = false; return f.anat; }
  const P = f.parts, A = { f, byKey, on: true, shapes: [], src: {}, roles: {}, groups: [], skins: [], lines: [], sc: 0, gmOf: {} };
  f.anat = A;
  const save = { ...f.pose };
  Object.assign(f.pose, STAND); figDraw(f);                  // rest lengths of the own sensors: the standing pose
  ANAT_PLANES.forEach(pl => {
    const anchor = pl.head ? f.nose : P[pl.parts[pl.parts.length - 1]].e, g = mk('g', {});
    f.g.insertBefore(g, anchor.nextSibling); A.groups.push(g);
    if (ANAT3.under > 0) {   // hides what lies behind this part of the body, so the glass shows only the body itself
      const gu = mk('g', {}, g), under = src => {
        const o = src.cloneNode(); ['visibility', 'opacity', 'filter', 'stroke'].forEach(at => o.removeAttribute(at));
        o.setAttribute('fill', COL.board); o.setAttribute('fill-opacity', ANAT3.under); gu.appendChild(o); A.skins.push({ o, src, under: true });
      };
      pl.parts.forEach(k => under(P[k].e));
      if (pl.head) under(f.head);
    }
    const gb = mk('g', {}, g), gm = mk('g', {}, g), gs = mk('g', {}, g);
    pl.parts.forEach(k => { A.gmOf[k] = gm; }); A.gmTop = gm;
    pl.bones.forEach(([a, b]) => A.lines.push({ e: mk('line', { stroke: ANAT3.bone, 'stroke-linecap': 'round', opacity: pl.far ? ANAT3.boneFarOp : .9 }, gb), a, b, w: ANAT3.boneLine }));
    if (pl.head) {
      A.spine = mk('path', { fill: ANAT3.bone, 'fill-opacity': ANAT3.boneFill, stroke: ANAT3.bone }, gb);
      A.pelvis = mk('ellipse', { rx: 13, ry: 16, fill: ANAT3.bone, 'fill-opacity': ANAT3.boneFill, stroke: ANAT3.bone }, gb);
    }
    (pl.far ? ANAT_FAR : ANAT_HUG).filter(h => pl.segs.includes(h[1])).forEach(([name, seg, side, u0, u1, depth, preset]) => {
      const spec = anatSpec(preset, pl.far);
      A.shapes.push({ name: pl.far ? name + 'F' : name, seg, side, u0, u1, depth, preset, far: !!pl.far, spec, rest: anatLen(f, spec),
        body: mk('path', { 'stroke-linejoin': 'round' }, gm), fib: mk('path', { fill: 'none', stroke: '#ffffff', 'stroke-linecap': 'round' }, gm),
        k: 1, col: ANAT3.col.rest, s: {}, key: 'rest', lv: 3 });
    });
    const skin = src => {
      const o = src.cloneNode(); ['visibility', 'opacity', 'filter'].forEach(at => o.removeAttribute(at));
      o.setAttribute('fill', f.col); o.setAttribute('fill-opacity', pl.far ? ANAT3.skinFillFar : ANAT3.skinFill);
      o.setAttribute('stroke', mix(f.col, ANAT3.skinLineMix < 0 ? '#000000' : '#ffffff', Math.abs(ANAT3.skinLineMix))); gs.appendChild(o); A.skins.push({ o, src });
    };
    pl.parts.forEach(k => skin(P[k].e));
    if (pl.head) { skin(f.head); skin(f.nose); }
  });
  Object.assign(f.pose, save); figDraw(f);
  A.hidden = [...Object.values(P).map(p => p.e), f.head, f.nose];
  A.show = v => {
    A.on = v;
    A.groups.forEach(g => g.setAttribute('display', v ? 'inline' : 'none'));
    A.hidden.forEach(e => e.setAttribute('visibility', v ? 'hidden' : 'visible'));
    if (v) A.sync();
  };
  A.attach = (preset, mu) => { (A.src[preset] = A.src[preset] || []).push(mu); };
  // a lesson's own muscle goes into the muscle layer of the part it was drawn after (above the underlay, under the skin)
  A.custom = (mu, after) => (after && A.gmOf[after] || A.gmTop).appendChild(mu.g);
  A.sync = () => anatFigGeom(A);
  A.alive = () => f.g.isConnected;
  A.tick = (t, q, keys) => anatFigTick(A, t, q, keys);
  f.onSet.push(A.sync);
  A.show(true); ANAT_REG.add(A);
  return A;
}
// Geometry only (after every pose change): skin, bones, spine and pelvis, muscle outlines at their current thickness.
function anatFigGeom(A) {
  if (!A.on) return;
  const f = A.f, p = f.pts, f1 = v => v.toFixed(1);
  A.skins.forEach(({ o, src }) => {
    if (src.tagName === 'circle') { o.setAttribute('cx', src.getAttribute('cx')); o.setAttribute('cy', src.getAttribute('cy')); }
    else o.setAttribute('d', src.getAttribute('d'));
  });
  A.lines.forEach(({ e, a, b }) => { e.setAttribute('x1', f1(p[a][0])); e.setAttribute('y1', f1(p[a][1])); e.setAttribute('x2', f1(p[b][0])); e.setAttribute('y2', f1(p[b][1])); });
  const H = p.H, Sh = p.Sh, dx = Sh[0] - H[0], dy = Sh[1] - H[1], cx = H[0] - 2 * f.dir, cy = H[1] - 6;
  A.spine.setAttribute('d', capsuleD([H[0] + dx * .12, H[1] + dy * .12], [H[0] + dx * .97, H[1] + dy * .97], 3.2, 3.2));
  A.pelvis.setAttribute('cx', f1(cx)); A.pelvis.setAttribute('cy', f1(cy));
  A.pelvis.setAttribute('transform', `rotate(${f1(Math.atan2(dx, -dy) * 180 / Math.PI)} ${f1(cx)} ${f1(cy)})`);
  A.shapes.forEach(sh => { const { d, fib } = anatHugPath(f, sh, sh.k); sh.body.setAttribute('d', d); sh.fib.setAttribute('d', fib); });
}
// Level of a drawn muscle: an explicit role, else the lesson's muscle while it is shown (hidden → level 3), else a synergist rule, else 3.
// Parts of one muscle group: older lessons mark the whole quadriceps with the rectus preset, so a marked part lends its level.
const ANAT_GROUP = { rectus: ['quads'], quads: ['rectus'] };
const anatShown = (A, p) => (A.src[p] || []).filter(m => m.g.isConnected && (m.g._st ? m.g._st.o : 1) > .5);
function anatLevel(A, sh, lit) {
  if (A.roles[sh.name] != null) return A.roles[sh.name];
  if (sh.far) return 3;
  let src = anatShown(A, sh.preset);
  if (!src.length && !(A.src[sh.preset] || []).length) src = (ANAT_GROUP[sh.preset] || []).flatMap(p => anatShown(A, p));
  if (src.length) return Math.min(...src.map(m => ANAT3.lvl(m.level)));
  return lit.has(sh.preset) ? 2 : 3;
}
// One step of a glass figure: line widths in stage pixels, each muscle's mode, level, colour and thickness, the legend keys.
function anatFigTick(A, t, q, keys) {
  if (!A.on) return;
  const f = A.f, sc = anatScale(f.g), vis = anatVis(f.g) > .2;
  if (Math.abs(sc - A.sc) > .01) {
    A.sc = sc;
    A.skins.forEach(({ o, under }) => { if (!under) o.setAttribute('stroke-width', (ANAT3.skinLine / sc).toFixed(2)); });
    A.lines.forEach(({ e, w }) => e.setAttribute('stroke-width', (w / sc).toFixed(2)));
    [A.spine, A.pelvis].forEach(e => e.setAttribute('stroke-width', (ANAT3.spineLine / sc).toFixed(2)));
  }
  const syn = ANAT3.autoSyn || (typeof CHAPTER !== 'undefined' && !!CHAPTER.anatSyn), lit = new Set();
  if (syn) for (const k in A.src) if (A.src[k].some(m => m.g.isConnected && ANAT3.lvl(m.level) === 1)) (ANAT_SYN[k] || []).forEach(s => lit.add(s));
  A.shapes.forEach(sh => {
    const rest = sh.rest, L = anatMuscleLen(f, sh.preset, sh.far, rest);
    const lv = anatLevel(A, sh, lit), strain = L / rest - 1, focus = !sh.far && (A.roles[sh.name] != null || anatShown(A, sh.preset).length > 0);
    const st = anatStyle(lv, anatSense(sh.s, L, t, rest), strain, sh.far, focus);
    sh.k += (anatK(strain, st.amp) - sh.k) * q;
    sh.col = q >= 1 ? st.fill : mix(sh.col, st.fill, q);
    sh.lv = lv; sh.key = st.key;
    const { d, fib } = anatHugPath(f, sh, sh.k), b = sh.body;
    b.setAttribute('d', d); sh.fib.setAttribute('d', fib);
    b.setAttribute('fill', sh.col); b.setAttribute('fill-opacity', st.op.toFixed(3));
    b.setAttribute('stroke', mix(sh.col, '#000000', .45)); b.setAttribute('stroke-width', (st.sw / sc).toFixed(2)); b.setAttribute('stroke-opacity', sh.far ? .3 : 1);
    if (st.dash) b.setAttribute('stroke-dasharray', `${(4 / sc).toFixed(1)} ${(3 / sc).toFixed(1)}`); else b.removeAttribute('stroke-dasharray');
    sh.fib.setAttribute('stroke-width', (.8 / sc).toFixed(2)); sh.fib.setAttribute('stroke-opacity', sh.far ? .08 : .25);
    if (vis && !sh.far) { keys.add(st.key); if (lv === 2) keys.add('syn'); }
  });
}
// A muscle drawn by muscleEl (joint models, ribbons): mode, level, colour, outline and thickness on the shared code.
function anatMuscleDisplay(m, belly, fib) {
  const s = {};
  return {
    alive: () => m.g.isConnected,
    tick(t, q, keys) {
      if (!m.last) return;
      const lv = ANAT3.lvl(m.level), st = anatStyle(lv, anatSense(s, m.L, t, m.rest), m.strain, false, true);
      const k0 = m.k; m.k += (anatK(m.strain, st.amp) - m.k) * q;
      if (Math.abs(m.k - k0) > .002) m.set(...m.last);
      m.col = q >= 1 || !m.col ? st.fill : mix(m.col, st.fill, q);
      const sc = anatScale(m.g);
      belly.setAttribute('fill', m.col); belly.setAttribute('fill-opacity', st.op.toFixed(3));
      belly.setAttribute('stroke', mix(m.col, '#000000', .45)); belly.setAttribute('stroke-width', (st.sw / sc).toFixed(2));
      if (st.dash) belly.setAttribute('stroke-dasharray', `${(4 / sc).toFixed(1)} ${(3 / sc).toFixed(1)}`); else belly.removeAttribute('stroke-dasharray');
      fib.setAttribute('stroke', '#ffffff'); fib.setAttribute('stroke-opacity', .25);
      if (anatVis(m.g) > .2) { keys.add(st.key); if (lv === 2) keys.add('syn'); }
    },
  };
}
// A spindle muscle of a joint model (bellyEl): the same mode, level, colour and thickness rules; the glow stays only for pain (hurt).
// paint() repaints with the last style right after a pose change, so the body is never drawn without its colour.
function anatBellyDisplay(b, { body, shade, fib, glow, ten }) {
  const s = {};
  let st = anatStyle(3, 'iso', 0, false, true);
  b.paint = () => {
    const fill = mix(st.fill, COL.bad, b.hurt * .85), sc = anatScale(b.g);
    body.setAttribute('fill', fill); body.setAttribute('fill-opacity', st.op.toFixed(3));
    body.setAttribute('stroke', mix(fill, '#000000', .45)); body.setAttribute('stroke-width', (1.2 * st.sw / sc).toFixed(2));
    if (st.dash) body.setAttribute('stroke-dasharray', `${(4 / sc).toFixed(1)} ${(3 / sc).toFixed(1)}`); else body.removeAttribute('stroke-dasharray');
    shade.setAttribute('fill', mix(fill, '#000000', .28)); fib.setAttribute('stroke', mix(fill, '#ffffff', .45));
    ten.setAttribute('stroke', ANAT.tendon);
    glow.setAttribute('stroke', COL.bad); glow.setAttribute('stroke-width', (b.hurt * 16).toFixed(1)); glow.setAttribute('stroke-opacity', (.5 * b.hurt).toFixed(2));
  };
  return {
    alive: () => b.g.isConnected,
    tick(t, q, keys) {
      if (!b.last || b.rest == null) return;
      const lv = ANAT3.lvl(b.level), nst = anatStyle(lv, anatSense(s, b.L, t, b.rest), b.strain, false, true);
      const k0 = b.k; b.k += (anatK(b.strain, nst.amp) - b.k) * q;
      const col = q >= 1 || !st.fill ? nst.fill : mix(st.fill, nst.fill, q);
      st = { ...nst, fill: col };
      if (Math.abs(b.k - k0) > .002) b.set(...b.last); else b.paint();
      if (anatVis(b.g) > .2) { keys.add(nst.key); if (lv === 2) keys.add('syn'); }
    },
  };
}
// Colour for a lesson's caption about a muscle being stretched: blue with the live anatomy, the old yellow without it.
// Set when te.js loads (top-level lesson constants read it before the lesson boots) and again by anatInit.
ANAT.stretch = !/[?&]anat=0/.test(location.search) && (ANAT3.on || /[?&]anat=1/.test(location.search)) ? ANAT3.col.str : ANAT.taut;
// An explicit role for a drawn muscle of a figure (new scenes): name from ANAT_HUG, far ones with F (quadsF); level 1, 2 or 3.
function anatRole(f, name, level) { anatFig(f).roles[name] = level; }
/* ---------- anat3 end ---------- */
/* ---------- bio begin: biomechanics layer — goniometer, forces, lever arms, moment bars, moment–angle curve ---------- */
// Spec: docs/superpowers/specs/2026-10-30-biomechanics-layer-design.md. A lesson lists its places in `const BIO = [...]`
// (tools/therapeutic-exercise/bio.py writes it from content/…/chNNN/bio.ru.json); the B key cycles the modes for every figure.
// Angles are the pose angles (clinical zero); forces and moments are relative: only degrees reach the screen as numbers.
const BIO3 = {
  store: 'animebook:bio', modes: ['lesson', 'angle', 'forces', 'full', 'off'],
  name: { lesson: 'биомеханика: по уроку', angle: 'биомеханика: угломер', forces: 'биомеханика: угломер и силы', full: 'биомеханика: всё', off: 'биомеханика: выкл.' },
  col: { grav: '#8fd6b0', res: '#e8a0c8', gon: '#ece8dc', move: '#ffe082' },
  arrow: 110, gonR: 92, gonMin: 50, segOp: .55, toast: 1200, still: 3, hold: 1,
  // share of body mass and centre of mass (share of the segment from its proximal end): Dempster via Winter — not from the book
  SEG: { ua: [.028, .436], fa: [.016, .43], hd: [.006, .506], th: [.1, .433], sh: [.0465, .433], ft: [.0145, .5] },
  RANGE: { a: [0, 180], e: [0, 145], h: [-30, 120], k: [0, 140], f: [-50, 20] },
  // per joint (pose key without its side): centre, the point the stationary arm points at, the distal chain [from, to, segment];
  // dir −1 where a larger angle turns the segment the other way in figDraw (the knee)
  J: {
    a: { c: 'Sh', prox: 'H', chain: [['Sh', 'E', 'ua'], ['E', 'W', 'fa'], ['W', 'X', 'hd']], dir: 1 },
    e: { c: 'E', prox: 'Sh', chain: [['E', 'W', 'fa'], ['W', 'X', 'hd']], dir: 1 },
    h: { c: 'H', prox: 'Sh', chain: [['H', 'K', 'th'], ['K', 'A', 'sh'], ['A', 'toe', 'ft']], dir: 1 },
    k: { c: 'K', prox: 'H', chain: [['K', 'A', 'sh'], ['A', 'toe', 'ft']], dir: -1 },
    f: { c: 'A', prox: 'K', chain: [['A', 'toe', 'ft']], dir: 1 },
  },
  // body segment of a muscle attachment [from, to] (the muscleOn convention) and the joints between the segments of each limb
  SEGOF: { 'H|Sh': 'tr', 'Sh|H': 'tr', 'Sh|E': 'ua', 'E|Sh': 'ua', 'E|W': 'fa', 'W|E': 'fa', 'H|K': 'th', 'K|H': 'th', 'K|A': 'sh', 'A|K': 'sh', 'A|heel': 'ft', 'A|toe': 'ft' },
  LIMB: { arm: ['tr', 'ua', 'fa'], leg: ['tr', 'th', 'sh', 'ft'] },
  JOINTS: { arm: ['a', 'e'], leg: ['h', 'k', 'f'] },
};
let BIO_MODE = null, BIO_BEAT = null, BIO_FIGN = 0, BIO_TOAST = null, BIO_T = null;
const BIO_REG = new Set(), BIO_KEYS = ['aN', 'eN', 'hN', 'kN', 'fN'];
const bf = v => v.toFixed(1);
const bioBase = k => k === 'Sh' || k === 'H' ? k : k.replace(/[NF]$/, '');
const bioPt = (f, name, side) => figPt(f, f.pts[name === 'Sh' || name === 'H' ? name : name + side]);
const bioRot = (P, C, deg) => { const [x, y] = rotPt(P[0] - C[0], P[1] - C[1], deg); return [C[0] + x, C[1] + y]; };
const bioAng = v => Math.atan2(v[1], v[0]) * 180 / Math.PI;
const bioUnit = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
const bioCross = (r, F) => r[0] * F[1] - r[1] * F[0];

// A figure's layer record (no drawing yet): its beat and its number in that beat, as the BIO places name it.
// helper: a bluish figure — the book draws therapists so; the key modes leave them out (a place in the file still can name one).
function bioReg(f) {
  const c = /^#[0-9a-f]{6}$/i.test(f.col) ? [1, 5].map(i => parseInt(f.col.slice(i, i + 2), 16)) : [0, 0];
  const L = { f, custom: false, beat: BIO_BEAT, n: BIO_FIGN++, helper: c[1] > c[0] + 8, parent: () => f.g.parentNode, alive: () => f.g.isConnected, vis: () => anatVis(f.g), hist: [], key: null, keyT: -1 };
  f.bio = L; BIO_REG.add(L);
  return L;
}
// A lesson's own joint (not a figure joint): geom() returns, in p's coordinates, { C, end, zero, prox?, k?, seg?, range? } —
// the axis, the end of the moving segment, the clinical-zero direction, the stationary-arm direction (default: opposite zero),
// k = +1 when the angle grows clockwise on screen, the segment for its mass (fa: forearm + hand), the dial range and abs (a turn
// both ways from zero, e.g. external and internal rotation: the pill shows the size of the angle).
// el: an element of the joint (the moving segment) whose visibility the layer follows; default p.
function bioJoint(name, p, geom, el = p) {
  const L = { custom: true, name, geom, beat: BIO_BEAT, parent: () => p, alive: () => p.isConnected, vis: () => anatVis(el), hist: [] };
  BIO_REG.add(L);
  return L;
}
// Geometry of a figure joint in its parent's coordinates: centre C, stationary-arm direction prox, moving direction u, clinical zero,
// angle th (degrees), k = screen degrees per degree of the angle, length of the first distal segment, the distal masses.
function bioGeoFig(f, key) {
  const j = BIO3.J[key[0]], side = key.slice(1), C = bioPt(f, j.c, side), P0 = bioPt(f, j.chain[0][1], side), Pp = bioPt(f, j.prox, side);
  const k = -f.dir * j.dir, th = f.pose[key] ?? 0, u = bioUnit([P0[0] - C[0], P0[1] - C[1]]), prox = bioUnit([Pp[0] - C[0], Pp[1] - C[1]]);
  const mass = j.chain.map(([a, b, s]) => { const A = bioPt(f, a, side), B = bioPt(f, b, side), [m, q] = BIO3.SEG[s]; return { P: [lerp(A[0], B[0], q), lerp(A[1], B[1], q)], m }; });
  return { C, u, prox, zero: rotPt(u[0], u[1], -k * th), th, k, len: Math.hypot(P0[0] - C[0], P0[1] - C[1]), mass, range: BIO3.RANGE[key[0]],
    pt: n => f.pts[n] ? figPt(f, f.pts[n]) : null };
}
function bioGeoCustom(L) {
  const g = L.geom(), u = bioUnit([g.end[0] - g.C[0], g.end[1] - g.C[1]]), zero = bioUnit(g.zero), k = g.k || 1, seg = g.seg || 'fa';
  const th = ((bioAng(u) - bioAng(zero)) * k % 360 + 540) % 360 - 180, [m, q] = BIO3.SEG[seg];
  return { C: g.C, u, prox: bioUnit(g.prox || [-zero[0], -zero[1]]), zero, th, k, len: Math.hypot(g.end[0] - g.C[0], g.end[1] - g.C[1]),
    mass: [{ P: [lerp(g.C[0], g.end[0], q), lerp(g.C[1], g.end[1], q)], m: m + (seg === 'fa' ? BIO3.SEG.hd[0] : 0) }], range: g.range || [0, 180], pt: () => null,
    abs: !!g.abs };   // abs: a turn both ways from zero (rotation): the pill shows the size of the angle, the dial keeps its sides
}
// Forces on the distal part: its weight at the combined centre of mass and the place's load (q.load), in the parent's coordinates.
// down: the direction of gravity there; local(P): a stage point in the parent's coordinates (band and pulley anchors).
function bioForces(G0, q, down, local) {
  const W = G0.mass.reduce((s, x) => s + x.m, 0), P = G0.mass.reduce((s, x) => [s[0] + x.P[0] * x.m / W, s[1] + x.P[1] * x.m / W], [0, 0]);
  const seg = { P, F: [down[0] * W, down[1] * W], kind: 'seg' }, ld = q && q.load && q.load.type && q.load.type !== 'none' ? q.load : null;
  if (!ld) return { seg, load: null, W };
  const w = (ld.w ?? 1) * W, A = typeof ld.at === 'number' ? [G0.C[0] + G0.u[0] * G0.len * ld.at, G0.C[1] + G0.u[1] * G0.len * ld.at]
    : (typeof ld.at === 'string' && G0.pt(ld.at)) || P;
  let F;
  if (ld.type === 'weight') F = [down[0] * w, down[1] * w];
  else if (ld.type === 'hand') { const s = (ld.dir ?? 1) * Math.sign(G0.k); F = [-G0.u[1] * s * w, G0.u[0] * s * w]; }
  else {
    const an = local(ld.anchor), d = [an[0] - A[0], an[1] - A[1]], len = Math.hypot(d[0], d[1]) || 1;
    const mag = ld.type === 'band' ? w * Math.max(0, len / (ld.rest || len) - 1) / .6 : w;
    F = [d[0] / len * mag, d[1] / len * mag];
  }
  return { seg, load: { P: A, F, kind: ld.type === 'weight' ? 'weight' : 'res' }, W };
}
// Moment of forces about C: + when it resists a growing angle (z of r × F is + clockwise on screen; the angle turns by k).
const bioM = (C, k, list) => -k * list.reduce((s, x) => s + bioCross([x.P[0] - C[0], x.P[1] - C[1]], x.F), 0);
// The distal part turned rigidly by d degrees of the angle about the axis (gravity and anchors stay put).
function bioTurn(G0, d) {
  const r = G0.k * d, R = P => bioRot(P, G0.C, r);
  return { ...G0, u: rotPt(G0.u[0], G0.u[1], r), th: G0.th + d, mass: G0.mass.map(x => ({ P: R(x.P), m: x.m })), pt: n => { const P = G0.pt(n); return P && R(P); } };
}
// Moment of the load over the range (n + 1 samples) and its largest size. A curve that changes sign keeps its sign (first sample +),
// one that does not is shown as its size.
function bioCurve(G0, q, down, local, n = 60) {
  const [a0, a1] = q && q.range || G0.range, raw = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n), F = bioForces(bioTurn(G0, a - G0.th), q, down, local);
    raw.push([a, bioM(G0.C, G0.k, [F.seg, F.load].filter(Boolean))]);
  }
  const v = raw.map(p => p[1]), max = Math.max(...v.map(Math.abs)) || 1, eps = max * 1e-3;
  const signed = v.some(x => x > eps) && v.some(x => x < -eps), s0 = Math.sign(v.find(x => Math.abs(x) > eps) || 1);
  return { pts: raw.map(([a, x]) => [a, signed ? x * s0 : Math.abs(x)]), max, a0, a1, signed, s0 };
}
// The muscle acting at this joint: the place's (MUSCLE preset name; null = none), else a working (level 1), shown lesson muscle
// that crosses the joint. Returns { O, I, col }: origin and insertion in the parent's coordinates, the muscle's current colour.
function bioMuscle(f, key, q) {
  if (!f || (q && q.muscle === null)) return null;
  const side = key.slice(1), ji = key[0], segOf = s => BIO3.SEGOF[bioBase(s[0]) + '|' + bioBase(s[1])];
  const segIx = s => Math.max(BIO3.LIMB.arm.indexOf(segOf(s)), BIO3.LIMB.leg.indexOf(segOf(s)));
  const crosses = (a, b) => {
    if ([a, b].some(s => [s[0], s[1]].some(n => n !== 'Sh' && n !== 'H' && n.slice(-1) !== side))) return false;
    for (const lb in BIO3.LIMB) {
      const S = BIO3.LIMB[lb], i = S.indexOf(segOf(a)), k = S.indexOf(segOf(b)), J = BIO3.JOINTS[lb].indexOf(ji);
      if (i >= 0 && k >= 0 && J >= 0 && Math.min(i, k) <= J && J < Math.max(i, k)) return true;
    }
    return false;
  };
  const list = (f.muscles || []).filter(x => x.mu.g.isConnected);
  const pick = q && q.muscle ? list.find(x => x.preset === q.muscle) || (MUSCLE[q.muscle] ? { a: MUSCLE[q.muscle][0], b: MUSCLE[q.muscle][1], preset: q.muscle } : null)
    : list.find(x => ANAT3.lvl(x.mu.level) === 1 && (x.mu.g._st ? x.mu.g._st.o : 1) > .5 && crosses(x.a, x.b));
  if (!pick || !crosses(pick.a, pick.b)) return null;
  const [O, I] = segIx(pick.a) <= segIx(pick.b) ? [pick.a, pick.b] : [pick.b, pick.a];
  const sh = f.anat && pick.preset && f.anat.shapes.find(s => s.preset === pick.preset && !s.far);
  return { O: figPt(f, anatAttPt(f, O)), I: figPt(f, anatAttPt(f, I)), col: (sh && sh.col) || (pick.mu && pick.mu.col) || ANAT3.col.con };
}
// The mode: ?bio= wins, then the stored choice, else "lesson" (only the places of the lesson file).
function bioMode() {
  if (BIO_MODE) return BIO_MODE;
  let m = new URLSearchParams(location.search).get('bio');
  if (!BIO3.modes.includes(m)) { m = null; try { m = localStorage.getItem(BIO3.store); } catch {} }
  return (BIO_MODE = BIO3.modes.includes(m) ? m : 'lesson');
}
function bioSet(m, toast = false) {
  BIO_MODE = m;
  try { localStorage.setItem(BIO3.store, m); } catch {}
  if (toast) bioToast(BIO3.name[m]);
  if (BIO_T != null) bioTick(BIO_T);
}
const bioPlaces = () => typeof BIO !== 'undefined' ? BIO : [];
// A place's from/to: seconds, a mark of its beat, or the default.
function bioWhen(beat, v, dflt) {
  if (v == null) return dflt;
  if (typeof v === 'number') return v;
  const tm = typeof TIMINGS !== 'undefined' && TIMINGS[beat];
  return tm && v in tm.marks ? tm.marks[v] : dflt;
}
// The place a layer shows at lesson time t (index into BIO), or −1. fig: number in the beat (default 0); null — a bioJoint by name.
function bioPlace(L, t) {
  const P = bioPlaces();
  for (let i = 0; i < P.length; i++) {
    const q = P[i], fi = q.fig === undefined ? 0 : q.fig;
    if (q.enabled === false || q.beat !== L.beat) continue;
    if (L.custom ? fi !== null || q.joint !== L.name : fi !== L.n) continue;
    if (t >= bioWhen(q.beat, q.from, 0) && t <= bioWhen(q.beat, q.to, Infinity)) return i;
  }
  return -1;
}
// The place that shows the «плечо» caption: the first enabled place with forces.
const bioLabelPlace = () => bioPlaces().findIndex(q => q.enabled !== false && (q.level || 'full') !== 'angle');
function bioKey(e) {
  if (e.code !== 'KeyB' || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  const help = document.getElementById('help');
  if (help && !help.hidden) return;
  e.preventDefault();
  const M = BIO3.modes; bioSet(M[(M.indexOf(bioMode()) + 1) % M.length], true);
}
// The name of the new mode, at the top of the picture for a moment.
function bioToast(str) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  if (BIO_TOAST) BIO_TOAST.remove();
  const g = BIO_TOAST = mk('g', { id: 'bioToast' }, stage), w = uiW(str, 24) + 40;
  mk('rect', { x: 800 - w / 2, y: 26, width: w, height: 44, rx: 22, fill: COL.board, 'fill-opacity': .92, stroke: BIO3.col.move, 'stroke-width': 2 }, g);
  T(g, str, { x: 800, y: 56, size: 24, fill: BIO3.col.move, weight: 600, anchor: 'middle' });
  setTimeout(() => { if (BIO_TOAST === g) { g.remove(); BIO_TOAST = null; } }, BIO3.toast);
}
function bioInit() {
  if (bioInit.done) return;
  bioInit.done = true; bioMode();
  const help = document.getElementById('helpBio');
  if (help) help.hidden = false;
  document.addEventListener('keydown', bioKey);
}
// Direction of gravity and a stage point in the coordinates of g; the matrix from the stage to g.
function bioMat(g) {
  const sc = document.getElementById('scene'), a = g.getCTM && g.getCTM(), b = sc && sc.getCTM && sc.getCTM();
  return a && b ? a.inverse().multiply(b) : null;
}
function bioDown(g) { const m = bioMat(g); return m ? bioUnit([m.c, m.d]) : [0, 1]; }
function bioLocal(g, P) { const m = bioMat(g); if (!m) return P; const q = new DOMPoint(P[0], P[1]).matrixTransform(m); return [q.x, q.y]; }
function bioStageTf(g) { const m = bioMat(g); return m ? `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(v => +v.toFixed(5)).join(' ')})` : ''; }
function bioLine(g, A, B, col, w, { dash = null, op = 1 } = {}) {
  const e = mk('path', { d: `M${bf(A[0])} ${bf(A[1])}L${bf(B[0])} ${bf(B[1])}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-opacity': op }, g);
  if (dash) e.setAttribute('stroke-dasharray', dash);
  return e;
}
// A force arrow from P along u (length len, width w): a line, a filled head, a dot at the point of application.
function bioArrow(g, kind, P, u, len, col, w, op = 1) {
  const a = mk('g', { 'data-b': 'arrow-' + kind, 'data-len': len.toFixed(1) }, g);
  const B = [P[0] + u[0] * len, P[1] + u[1] * len], hb = [B[0] - u[0] * w * 3.4, B[1] - u[1] * w * 3.4], n = [-u[1] * w * 1.9, u[0] * w * 1.9];
  bioLine(a, P, hb, col, w, { op });
  mk('path', { d: `M${bf(B[0])} ${bf(B[1])}L${bf(hb[0] + n[0])} ${bf(hb[1] + n[1])}L${bf(hb[0] - n[0])} ${bf(hb[1] - n[1])}Z`, fill: col, 'fill-opacity': op }, a);
  mk('circle', { cx: bf(P[0]), cy: bf(P[1]), r: bf(w * .85), fill: col, 'fill-opacity': op }, a);
  return a;
}
// Lever arm of force F at P about C: the perpendicular from C to the line of action, that line extended, a right-angle mark.
function bioLever(g, C, P, F, col, sc, label) {
  const u = bioUnit(F), s = (C[0] - P[0]) * u[0] + (C[1] - P[1]) * u[1], X = [P[0] + u[0] * s, P[1] + u[1] * s], d = Math.hypot(X[0] - C[0], X[1] - C[1]);
  if (d < 3 / sc) return 0;
  const a = mk('g', { 'data-b': 'lever' }, g), v = [(X[0] - C[0]) / d, (X[1] - C[1]) / d], m = 12 / sc, sg = Math.sign(-s) || 1;
  bioLine(a, P, X, col, 1.8 / sc, { dash: `${bf(6 / sc)} ${bf(6 / sc)}`, op: .8 });
  bioLine(a, C, X, col, 3 / sc, { dash: `${bf(10 / sc)} ${bf(7 / sc)}` });
  const A = [X[0] - v[0] * m, X[1] - v[1] * m], B = [A[0] + u[0] * m * sg, A[1] + u[1] * m * sg], D = [X[0] + u[0] * m * sg, X[1] + u[1] * m * sg];
  mk('path', { d: `M${bf(A[0])} ${bf(A[1])}L${bf(B[0])} ${bf(B[1])}L${bf(D[0])} ${bf(D[1])}`, fill: 'none', stroke: col, 'stroke-width': 2 / sc }, a);
  // the caption at the middle of the arm, on the side away from the force (off the arrow and its line)
  if (label && d * sc >= 25) T(a, 'плечо силы', { x: (C[0] + X[0]) / 2 - u[0] * 30 / sc, y: (C[1] + X[1]) / 2 - u[1] * 30 / sc + 7 / sc, size: 20 / sc, fill: col, weight: 700, anchor: 'middle' });
  return d;
}
// The goniometer: dial over the joint's range, ticks, numbers, the clinical-zero line, two arms, the axis, the angle pill.
function bioGon(g, G0, sc, compact) {
  const { C, u, zero, prox, th, k } = G0, R = clamp(G0.len * .9, BIO3.gonMin / sc, BIO3.gonR / sc), az = bioAng(zero), col = BIO3.col.gon, mv = BIO3.col.move;
  const at = (a, r) => { const q = rad(az + k * a); return [C[0] + r * Math.cos(q), C[1] + r * Math.sin(q)]; };
  if (!compact) {
    const [a0, a1] = G0.range; let d = `M${bf(C[0])} ${bf(C[1])}`;
    for (let i = 0; i <= 36; i++) { const P = at(lerp(a0, a1, i / 36), R); d += `L${bf(P[0])} ${bf(P[1])}`; }
    mk('path', { d: d + 'Z', fill: '#ffffff', 'fill-opacity': .1, stroke: col, 'stroke-width': 1.6 / sc }, g);
    let tk = '';
    for (let a = Math.ceil(a0 / 10) * 10; a <= a1; a += 10) {
      const big = a % 30 === 0, P = at(a, R), Q = at(a, R - (big ? 15 : 8) / sc);
      tk += `M${bf(P[0])} ${bf(P[1])}L${bf(Q[0])} ${bf(Q[1])}`;
      if (big) { const N = at(a, R - 30 / sc); T(g, (a < 0 ? '−' : '') + Math.abs(a), { x: N[0], y: N[1] + 5 / sc, size: 15 / sc, fill: col, anchor: 'middle' }); }
    }
    mk('path', { d: tk, fill: 'none', stroke: col, 'stroke-width': 1.4 / sc }, g);
    const strip = (v, len, c) => {
      const n = [-v[1] * 9 / sc, v[0] * 9 / sc], e = [C[0] + v[0] * len, C[1] + v[1] * len], s0 = [C[0] - v[0] * 12 / sc, C[1] - v[1] * 12 / sc];
      mk('path', { d: `M${bf(s0[0] + n[0])} ${bf(s0[1] + n[1])}L${bf(e[0] + n[0])} ${bf(e[1] + n[1])}L${bf(e[0] - n[0])} ${bf(e[1] - n[1])}L${bf(s0[0] - n[0])} ${bf(s0[1] - n[1])}Z`,
        fill: c, 'fill-opacity': .28, stroke: c, 'stroke-width': 1.6 / sc }, g);
    };
    strip(prox, R * 1.6, col); strip(u, R * 1.85, mv);
  }
  const zl = compact ? R * .8 : R + 40 / sc;
  bioLine(g, C, [C[0] + zero[0] * zl, C[1] + zero[1] * zl], col, 1.6 / sc, { dash: `${bf(7 / sc)} ${bf(6 / sc)}`, op: .7 });
  if (compact) {
    let d = ''; for (let i = 0; i <= 24; i++) { const P = at(th * i / 24, R * .45); d += `${i ? 'L' : 'M'}${bf(P[0])} ${bf(P[1])}`; }
    mk('path', { d, fill: 'none', stroke: mv, 'stroke-width': 3 / sc }, g);
  }
  mk('circle', { cx: bf(C[0]), cy: bf(C[1]), r: bf(7 / sc), fill: COL.board, stroke: col, 'stroke-width': 2 / sc }, g);
  const str = (th < -.5 && !G0.abs ? '−' : '') + Math.abs(Math.round(th)) + '°', sz = 24 / sc, w = (uiW(str, 24) + 26) / sc;
  // on the bisector of the angle, outside the dial (between the segments it is mostly free); a small angle pushes it past the arm
  const P = at(Math.abs(th) >= 40 ? th / 2 : th + (th < 0 ? -24 : 24), (compact ? R * .45 + 12 / sc : R) + 40 / sc);
  mk('rect', { x: bf(P[0] - w / 2), y: bf(P[1] - sz * .95), width: bf(w), height: bf(sz * 1.5), rx: bf(sz * .75), fill: COL.board, stroke: mv, 'stroke-width': 2.2 / sc }, g);
  T(g, str, { x: P[0], y: P[1] + sz * .3, size: sz, fill: mv, weight: 600, anchor: 'middle' });
}
// The block of bars (and the curve) in stage units: its size, then the drawing at pos (top left). rows: 2 when the place can
// have a muscle (its row stays, empty while no muscle works, so the block keeps its height). With a curve the block is compact,
// to fit where lessons drew their own charts.
const bioBarsSize = (rows, curve) => curve ? [440, 12 + rows * 30 + 138] : [530, rows * 44 + 20];
function bioBars(g, pos, M, cv, loadCol, rows, mus, curve, th) {
  const [w, h] = bioBarsSize(rows, curve), [x0, y0] = pos, frac = clamp(Math.abs(M) / cv.max, 0, 1);
  const S = curve ? { y: 30, row: 30, size: 18, x: 178, tw: 208, th: 16 } : { y: 38, row: 44, size: 21, x: 200, tw: 286, th: 22 };
  mk('rect', { x: x0, y: y0, width: w, height: h, rx: 14, fill: COL.board, 'fill-opacity': .85 }, g);
  const row = (i, lab, col, v) => {
    const y = y0 + S.y + i * S.row;
    T(g, lab, { x: x0 + 16, y, size: S.size, fill: col, weight: 700 });
    mk('rect', { x: x0 + S.x, y: y - S.th + 3, width: S.tw, height: S.th, rx: S.th / 2, fill: 'none', stroke: COL.faint, 'stroke-width': 2 }, g);
    if (v > 0) mk('rect', { x: x0 + S.x, y: y - S.th + 3, width: bf(S.tw * v), height: S.th, rx: S.th / 2, fill: col, 'fill-opacity': .85 }, g);
  };
  row(0, 'момент нагрузки', loadCol, frac);
  if (rows > 1) row(1, 'момент мышцы', mus ? mus.col : COL.dim, mus ? frac : 0);
  if (mus) T(g, '≈', { x: x0 + S.x + S.tw + 22, y: y0 + S.y + S.row, size: S.size + 5, fill: COL.chalk, weight: 700, anchor: 'middle' });
  if (!curve) return;
  const cx = x0 + 40, cw = 380, ch = 80, cy0 = y0 + h - 34, base = cv.signed ? cy0 - ch / 2 : cy0, sy = cv.signed ? ch / 2 : ch;
  const X = a => cx + (a - cv.a0) / (cv.a1 - cv.a0) * cw, Y = v => base - v / cv.max * sy;
  bioLine(g, [cx, cy0 - ch], [cx, cy0], COL.dim, 2); bioLine(g, [cx, base], [cx + cw, base], COL.dim, 2);
  T(g, 'момент', { x: cx - 8, y: cy0 - ch - 8, size: 16, fill: COL.dim });
  T(g, cv.a0 + '°', { x: cx, y: cy0 + 24, size: 16, fill: COL.dim, anchor: 'middle' });
  T(g, cv.a1 + '°', { x: cx + cw, y: cy0 + 24, size: 16, fill: COL.dim, anchor: 'middle' });
  T(g, 'угол сустава', { x: cx + cw / 2, y: cy0 + 24, size: 16, fill: COL.dim, anchor: 'middle' });
  mk('path', { d: 'M' + cv.pts.map(([a, v]) => bf(X(a)) + ' ' + bf(Y(v))).join('L'), fill: 'none', stroke: loadCol, 'stroke-width': 4 }, g);
  const a = clamp(th, Math.min(cv.a0, cv.a1), Math.max(cv.a0, cv.a1)), v = cv.signed ? M * cv.s0 : Math.abs(M);
  mk('circle', { cx: bf(X(a)), cy: bf(Y(v)), r: 9, fill: COL.board, stroke: loadCol, 'stroke-width': 4 }, g);
}
// Where the bars go: a named corner, stage coordinates, or the first free corner (right top, right bottom, left top) that covers no
// visible text, card, the anatomy legend or another layer's bars; chosen when the place or mode changes and checked again every
// quarter second of lesson time, as lessons add cards while they play (a corner stays while it is still free).
function bioPos(L, q, size, t) {
  const b = q && q.bars, named = { top_right: [1586 - size[0], 96], bottom_right: [1586 - size[0], 860 - size[1]], top_left: [14, 96], bottom_left: [14, 860 - size[1]] };
  if (Array.isArray(b)) return b;
  if (b && named[b]) return named[b];
  if (L.spot && t >= L.spotT && t - L.spotT < .25) return L.spot;
  L.spotT = t;
  const spots = [named.top_right, named.bottom_right, named.top_left, [1586 - size[0], (900 - size[1]) / 2], [14, (900 - size[1]) / 2], named.bottom_left];
  const stage = document.getElementById('stage'), S = stage && stage.getScreenCTM && stage.getScreenCTM();
  if (!S) return (L.spot = spots[0]);
  const inv = S.inverse(), boxes = [];
  const add = r => { if (!r.width || !r.height) return; const a = new DOMPoint(r.left, r.top).matrixTransform(inv), c = new DOMPoint(r.right, r.bottom).matrixTransform(inv); boxes.push([a.x, a.y, c.x, c.y]); };
  document.querySelectorAll('#scene text, #scene rect[rx="22"], #anatLegend rect, #scene [data-b="bars"] > rect:first-child').forEach(e => {
    if (L.g.contains(e)) return;
    if (e.closest('.bio') ? e.closest('.bio').getAttribute('display') !== 'none' : e.closest('#anatLegend') || anatVis(e) > .2) add(e.getBoundingClientRect());
  });
  BIO_REG.forEach(o => { if (!o.custom && o.alive() && o.vis() > .2) add(o.f.g.getBoundingClientRect()); });   // the figures themselves
  // covered area of a spot (m: pill frames reach past their text); a free spot, else the least covered one
  const m = 16, cover = ([x, y]) => boxes.reduce((s, r) => s + Math.max(0, Math.min(x + size[0], r[2] + m) - Math.max(x, r[0] - m)) * Math.max(0, Math.min(y + size[1], r[3] + m) - Math.max(y, r[1] - m)), 0);
  if (L.spot && !cover(L.spot)) return L.spot;
  const free = spots.find(s => !cover(s));
  return (L.spot = free || spots.reduce((a, s) => cover(s) < cover(a) ? s : a));
}
// Key modes on a figure without a place: the joint that moved most in the last second; while still, the one farthest from standing.
// The choice changes at most once a second; a jump of the clock starts the history again.
function bioAutoJoint(L, t) {
  const f = L.f, h = L.hist;
  if (h.length && (t < h[h.length - 1].t || t - h[h.length - 1].t > .3)) { h.length = 0; L.key = null; L.keyT = -1; }
  if (!h.length || t - h[h.length - 1].t >= .05) h.push({ t, p: BIO_KEYS.map(k => f.pose[k] ?? 0) });
  while (h.length > 2 && t - h[1].t >= 1) h.shift();
  // only joints whose moving segment is drawn (lessons hide a limb they draw themselves, e.g. the forearm-lever of lesson 38)
  const seen = BIO_KEYS.map(k => { const e = f.parts[{ a: 'ua', e: 'fa', h: 'th', k: 'sh', f: 'ft' }[k[0]] + k.slice(1)]; return !e || +(e.e.getAttribute('opacity') ?? 1) > .2; });
  const now = BIO_KEYS.map(k => f.pose[k] ?? 0), old = h[0].p;
  let best = -1, bv = BIO3.still;
  now.forEach((v, i) => { const d = Math.abs(v - old[i]); if (seen[i] && d > bv) { bv = d; best = i; } });
  if (best < 0) { bv = -1; now.forEach((v, i) => { const d = Math.abs(v - (STAND[BIO_KEYS[i]] ?? 0)); if (seen[i] && d > bv) { bv = d; best = i; } }); }
  if (best < 0) return (L.key = null);
  const k = BIO_KEYS[best];   // free to change while the history is too short to show motion
  if (k !== L.key && (L.key == null || t - L.keyT >= BIO3.hold || t - h[0].t < .3)) { L.key = k; L.keyT = t; }
  return L.key;
}
// Repaint one layer at lesson time t: the place and the level (from the mode), then goniometer, forces, lever arms, bars.
function bioDraw(L, t) {
  const mode = bioMode(), pi = L.beat != null ? bioPlace(L, t) : -1, q = pi >= 0 ? bioPlaces()[pi] : null;
  const level = mode === 'off' ? null : mode === 'lesson' ? (q ? q.level || 'full' : null) : !q && (L.custom || L.helper) ? null : mode;
  const hide = () => { if (L.g) L.g.setAttribute('display', 'none'); };
  const vis = L.vis();
  if (!level || vis <= .2) return hide();
  const key = L.custom ? null : q ? q.joint : bioAutoJoint(L, t);
  if (!L.custom && !BIO3.J[key && key[0]]) return hide();
  const G0 = L.custom ? bioGeoCustom(L) : bioGeoFig(L.f, key);
  if (!L.g) L.g = mk('g', { class: 'bio' }, L.parent());
  else if (L.g.parentNode !== L.parent() || L.g.nextSibling) L.parent().appendChild(L.g);
  L.g.replaceChildren(); L.g.setAttribute('display', 'inline'); L.g.setAttribute('opacity', clamp(vis, 0, 1).toFixed(2));
  const sc = anatScale(L.g), down = bioDown(L.g), local = P => bioLocal(L.g, P);
  bioGon(mk('g', { 'data-b': 'gon' }, L.g), G0, sc, !!q && q.gon === 'compact');
  if (level === 'angle') return;
  const gF = mk('g', { 'data-b': 'forces' }, L.g), F = bioForces(G0, q, down, local), mus = L.custom ? null : bioMuscle(L.f, key, q);
  const prim = F.load || F.seg, big = Math.max(...[F.seg, F.load].filter(Boolean).map(x => Math.hypot(x.F[0], x.F[1]))) || 1;
  const len = x => BIO3.arrow / sc * Math.hypot(x.F[0], x.F[1]) / big, colOf = x => x.kind === 'res' ? BIO3.col.res : BIO3.col.grav;
  bioArrow(gF, 'seg', F.seg.P, bioUnit(F.seg.F), len(F.seg), BIO3.col.grav, 4 / sc, F.load ? BIO3.segOp : 1);
  if (F.load) bioArrow(gF, 'load', F.load.P, bioUnit(F.load.F), len(F.load), colOf(F.load), 7 / sc);
  bioLever(gF, G0.C, prim.P, prim.F, colOf(prim), sc, pi >= 0 && pi === bioLabelPlace());
  if (mus) {
    const v = bioUnit([mus.O[0] - mus.I[0], mus.O[1] - mus.I[1]]);
    bioArrow(gF, 'mus', mus.I, v, len(prim) * .9, mus.col, 6 / sc);
    bioLever(gF, G0.C, mus.I, v, mus.col, sc, false);
  }
  if (level !== 'full' || (q && q.bars === 'none')) return;
  const M = bioM(G0.C, G0.k, [F.seg, F.load].filter(Boolean)), cv = bioCurve(G0, q, down, local), curve = !!(q && q.curve);
  if (L.spotKey !== pi + '|' + mode) { L.spotKey = pi + '|' + mode; L.spot = null; }
  const rows = !L.custom && !(q && q.muscle === null) ? 2 : 1, size = bioBarsSize(rows, curve), gB = mk('g', { 'data-b': 'bars', transform: bioStageTf(L.g) }, L.g);
  bioBars(gB, bioPos(L, q, size, t), M, cv, colOf(prim), rows, mus, curve, G0.th);
}
// One step of every live layer (after each evaluation of the main timeline). Nothing to do without places and visible layers.
function bioTick(t) {
  BIO_T = t;
  const mode = bioMode(), shown = [...BIO_REG].some(L => L.g && L.g.getAttribute('display') !== 'none');
  if ((mode === 'off' || (mode === 'lesson' && !bioPlaces().length)) && !shown) return;
  BIO_REG.forEach(L => { if (!L.alive()) BIO_REG.delete(L); else bioDraw(L, t); });
}
// The engine's beat runner names the beat (places are per beat; figures are numbered in it); the timeline drives the layer.
const bioBoot0 = boot;
boot = function () { bioInit(); return bioBoot0(); };
const bioRunBeat0 = runBeat;
runBeat = function (i) { BIO_BEAT = BEATS[i] ? BEATS[i].id : null; BIO_FIGN = 0; return bioRunBeat0(i); };
const bioEvalTo0 = evalTo;
evalTo = function (t, list = TW) { bioEvalTo0(t, list); if (list === TW) bioTick(t); };
/* ---------- bio end ---------- */
/* ---------- cam begin: free zoom of the picture and the lessons' magnifiers (lupa) ---------- */
// Spec: docs/superpowers/specs/2026-10-30-camera-lupa-design.md. The scene is wrapped in #cam and only #cam's transform changes,
// so the anatomy legend, toasts, magnifiers (all outside #cam), captions and the player keep their size. A question keeps the full frame.
const CAM3 = { max: 4, step: 1.25, wheel: .0015, ease: 300, drag: 4 };
const CAM = { z: 1, x: 0, y: 0, el: null, anim: 0, down: null, moved: false };
// #cam around #scene, made once (the engine's `scene` keeps pointing at the same element).
function camEl() {
  if (CAM.el && CAM.el.isConnected) return CAM.el;
  const sc = document.getElementById('scene');
  if (!sc) return null;
  if (sc.parentNode.id !== 'cam') { const g = mk('g', { id: 'cam' }); sc.parentNode.insertBefore(g, sc); g.appendChild(sc); }
  return (CAM.el = sc.parentNode);
}
const camIdle = () => CAM.z === 1 && !CAM.x && !CAM.y;
function camApply() {
  const g = camEl(), stage = document.getElementById('stage');
  if (!g) return;
  if (camIdle()) g.removeAttribute('transform');
  else g.setAttribute('transform', `translate(${CAM.x.toFixed(2)} ${CAM.y.toFixed(2)}) scale(${CAM.z.toFixed(4)})`);
  if (stage) stage.style.cursor = CAM.z > 1 ? (CAM.down && CAM.moved ? 'grabbing' : 'grab') : '';
  if (LUPA_G) LUPA_G.setAttribute('display', CAM.z === 1 ? 'inline' : 'none');
}
const camClamp = () => { CAM.x = clamp(CAM.x, 1600 * (1 - CAM.z), 0); CAM.y = clamp(CAM.y, 900 * (1 - CAM.z), 0); };
// Zoom to z with the stage point (px, py) staying where it is.
function camZoomAt(z, px, py) {
  cancelAnimationFrame(CAM.anim);
  const qx = (px - CAM.x) / CAM.z, qy = (py - CAM.y) / CAM.z;
  CAM.z = clamp(z, 1, CAM3.max); CAM.x = px - CAM.z * qx; CAM.y = py - CAM.z * qy;
  camClamp(); camApply();
}
// Back to the full frame: smoothly (0.3 s of real time, not lesson time) or at once.
function camReset(animate = true) {
  cancelAnimationFrame(CAM.anim);
  if (camIdle()) return;
  if (!animate) { CAM.z = 1; CAM.x = CAM.y = 0; camApply(); return; }
  const a = { z: CAM.z, x: CAM.x, y: CAM.y }, t0 = performance.now();
  const step = now => {
    const q = io(clamp((now - t0) / CAM3.ease, 0, 1));
    CAM.z = lerp(a.z, 1, q); CAM.x = lerp(a.x, 0, q); CAM.y = lerp(a.y, 0, q);
    if (q >= 1) { CAM.z = 1; CAM.x = CAM.y = 0; }
    camApply();
    if (q < 1) CAM.anim = requestAnimationFrame(step);
  };
  CAM.anim = requestAnimationFrame(step);
}
// No zoom in a question: questions map the mouse to the stage themselves.
const camAllowed = () => { const b = typeof BEATS !== 'undefined' && BEATS[P.i]; return !(b && b.ask); };
function camPt(e) {
  const s = document.getElementById('stage'), m = s && s.getScreenCTM();
  return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : { x: 800, y: 450 };
}
function camWheel(e) {
  if (!camAllowed() || e.ctrlKey) return;
  e.preventDefault();
  const p = camPt(e);
  camZoomAt(CAM.z * Math.exp(-e.deltaY * CAM3.wheel), p.x, p.y);
}
function camDown(e) {
  if (e.button !== 0 || CAM.z === 1 || !camAllowed()) return;
  CAM.down = { x: e.clientX, y: e.clientY, cx: CAM.x, cy: CAM.y }; CAM.moved = false;
}
function camMove(e) {
  const d = CAM.down;
  if (!d) return;
  const m = document.getElementById('stage').getScreenCTM(), k = m ? m.a : 1, dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!CAM.moved && Math.hypot(dx, dy) < CAM3.drag) return;
  CAM.moved = true; CAM.x = d.cx + dx / k; CAM.y = d.cy + dy / k; camClamp(); camApply();
}
function camUp() { if (CAM.down) { CAM.down = null; camApply(); } }
// A drag is not a click: the click that ends it does not reach the pause handler.
function camClick(e) { if (CAM.moved) { e.stopPropagation(); CAM.moved = false; } }
function camKey(e) {
  if (e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  const help = document.getElementById('help');
  if (help && !help.hidden) return;
  if (e.code === 'KeyL' && !e.shiftKey) { e.preventDefault(); lupaSet(!lupaOn(), true); return; }
  if (!camAllowed()) return;
  if (e.key === '0' || e.code === 'Numpad0') { e.preventDefault(); camReset(); }
  else if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') { e.preventDefault(); camZoomAt(CAM.z * CAM3.step, 800, 450); }
  else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); camZoomAt(CAM.z / CAM3.step, 800, 450); }
}
function camInit() {
  if (camInit.done) return;
  const stage = document.getElementById('stage');
  if (!stage || !camEl()) return;
  camInit.done = true;
  stage.addEventListener('wheel', camWheel, { passive: false });
  stage.addEventListener('pointerdown', camDown);
  addEventListener('pointermove', camMove); addEventListener('pointerup', camUp);
  stage.addEventListener('click', camClick, true);
  stage.addEventListener('dblclick', () => { if (camAllowed()) camReset(); });
  document.addEventListener('keydown', camKey);
  const help = document.getElementById('helpCam');
  if (help) help.hidden = false;
}
/* lupa: a magnifier callout on a small figure of the lesson (places in `const LUPA = [...]`, written by tools/therapeutic-exercise/lupa.py) */
const LUPA3 = { R: 170, zoom: 3, col: '#ffe082', store: 'animebook:lupa', gap: 24, recheck: .5, far: 2.8, slide: .4 };
let LUPA_ON = null, LUPA_G = null;
const LUPA_SPOT = {};
const lupaPlaces = () => typeof LUPA !== 'undefined' ? LUPA : [];
function lupaOn() {
  if (LUPA_ON !== null) return LUPA_ON;
  const q = new URLSearchParams(location.search).get('lupa');
  let v = q === '0' ? false : q === '1' ? true : null;
  if (v === null) { v = true; try { v = localStorage.getItem(LUPA3.store) !== '0'; } catch {} }
  return (LUPA_ON = v);
}
function lupaSet(v, toast = false) {
  LUPA_ON = v;
  try { localStorage.setItem(LUPA3.store, v ? '1' : '0'); } catch {}
  if (toast) bioToast(v ? 'лупа: вкл.' : 'лупа: выкл.');
  if (BIO_T != null) lupaTick(BIO_T);
}
// The target in scene coordinates: a pose point (KN, Sh…), the middle of a shared muscle (quads) or of the figure's own muscle mN.
function lupaTarget(f, tg) {
  let P0 = f.pts[tg];
  if (!P0) {
    const m = /^m(\d+)$/.exec(tg), list = f.muscles || [], x = m ? list[+m[1]] : list.find(o => o.preset === tg);
    const spec = x ? [x.a, x.b] : MUSCLE[tg];
    if (spec) { const A = anatAttPt(f, spec[0]), B = anatAttPt(f, spec[1]); P0 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; }
  }
  const sc = document.getElementById('scene'), a = f.g.getCTM && f.g.getCTM(), b = sc && sc.getCTM && sc.getCTM();
  if (!P0 || !a || !b) return null;
  const q = new DOMPoint(P0[0], P0[1]).matrixTransform(b.inverse().multiply(a));
  return [q.x, q.y];
}
// The magnifier layer: in the stage right after #cam (above the scene, below the anatomy legend and the toasts).
function lupaLayer() {
  if (LUPA_G && LUPA_G.isConnected) return LUPA_G;
  const cam = camEl();
  if (!cam) return null;
  LUPA_G = mk('g', { id: 'lupas' }); cam.parentNode.insertBefore(LUPA_G, cam.nextSibling);
  LUPA_G.setAttribute('display', CAM.z === 1 ? 'inline' : 'none');
  return LUPA_G;
}
// The two outer tangents from the marker ring (P0, r) to the lens (C, R): [[from, to], [from, to]].
function lupaTangents(P0, C, r) {
  const R = LUPA3.R, d = Math.hypot(C[0] - P0[0], C[1] - P0[1]) || 1, ang = Math.atan2(C[1] - P0[1], C[0] - P0[0]), b = Math.asin(clamp((R - r) / d, -1, 1));
  return [1, -1].map(s => { const th = ang + s * (Math.PI / 2 + b), cs = Math.cos(th), sn = Math.sin(th); return [[P0[0] + r * cs, P0[1] + r * sn], [C[0] + R * cs, C[1] + R * sn]]; });
}
// Does the segment p–q cross the box [x0, y0, x1, y1] (Liang–Barsky)?
function lupaSegHit(p, q, b) {
  const dx = q[0] - p[0], dy = q[1] - p[1], P = [-dx, dx, -dy, dy], Q = [p[0] - b[0], b[2] - p[0], p[1] - b[1], b[3] - p[1]];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 4; k++) {
    if (P[k] === 0) { if (Q[k] < 0) return false; continue; }
    const v = Q[k] / P[k];
    if (P[k] < 0) { if (v > t1) return false; t0 = Math.max(t0, v); } else { if (v < t0) return false; t1 = Math.min(t1, v); }
  }
  return true;
}
// Where the lens goes: a named corner, stage coordinates, or the free spot nearest the target. Taken for the lens: texts, cards and
// other framed boxes (not the full-frame ones), bars, the legend, figures, other lenses; it never covers its own target. A spot whose
// two lines cross only its own figure wins over a nearer one with lines over a label or another figure. Kept while free; checked
// every half second of lesson time.
function lupaPos(q, i, P0, r, t, own) {
  const R = LUPA3.R, m = LUPA3.gap, named = { top_right: [1600 - R - m, R + 90], bottom_right: [1600 - R - m, 900 - R - m], top_left: [R + m, R + 90], bottom_left: [R + m, 900 - R - m] };
  if (Array.isArray(q.pos)) return q.pos;
  if (q.pos && named[q.pos]) return named[q.pos];
  const c = LUPA_SPOT[i];
  if (c && t >= c.t && t - c.t < LUPA3.recheck) return c.C;
  const stage = document.getElementById('stage'), S = stage && stage.getScreenCTM();
  if (!S) return named.top_right;
  const inv = S.inverse(), boxes = [], lineBoxes = [], figs = [...BIO_REG].filter(o => !o.custom && o.alive() && o.vis() > .2);
  const box = rc => { if (!rc.width || !rc.height) return null; const a = new DOMPoint(rc.left, rc.top).matrixTransform(inv), b = new DOMPoint(rc.right, rc.bottom).matrixTransform(inv); return [a.x, a.y, b.x, b.y]; };
  const add = (rc, line = true) => { const b = box(rc); if (!b) return; boxes.push(b); if (line) lineBoxes.push(b); };
  document.querySelectorAll('#scene text, #scene rect, #anatLegend rect').forEach(e => {
    if (e.closest('#anatLegend')) return add(e.getBoundingClientRect());
    if (e.tagName === 'rect' && (figs.some(o => o.f.g.contains(e)) || anatVis(e) <= .2)) return;
    if (e.tagName === 'text' && anatVis(e) <= .2) return;
    const b = box(e.getBoundingClientRect());
    if (b && (e.tagName === 'text' || e.getAttribute('rx') === '22' || (b[2] - b[0] < 1400 && b[3] - b[1] < 800))) { boxes.push(b); lineBoxes.push(b); }
  });
  figs.forEach(o => add(o.f.g.getBoundingClientRect(), o.f !== own));
  document.querySelectorAll('#lupas .lupa-disc').forEach(e => add(e.getBoundingClientRect()));
  const cover = ([x, y]) => boxes.reduce((s, b) => s + Math.max(0, Math.min(x + R, b[2] + m) - Math.max(x - R, b[0] - m)) * Math.max(0, Math.min(y + R, b[3] + m) - Math.max(y - R, b[1] - m)), 0);
  const onTarget = ([x, y]) => Math.hypot(x - P0[0], y - P0[1]) < R + r + m;
  const crosses = C => lupaTangents(P0, C, r).some(([a, b]) => lineBoxes.some(x => lupaSegHit(a, b, [x[0] - 4, x[1] - 4, x[2] + 4, x[3] + 4])));
  const free = C => !onTarget(C) && !cover(C);
  if (c && c.C && free(c.C)) { c.t = t; return c.C; }
  // only free spots near the target: a lens across the picture, its lines over other figures, reads worse than none (then it hides)
  let best = null, bd = Infinity, alt = null, ad = Infinity;
  for (let y = R + 80; y <= 900 - R - 16; y += 40) for (let x = R + 16; x <= 1600 - R - 16; x += 40) {
    const dd = Math.hypot(x - P0[0], y - P0[1]);
    if (dd > LUPA3.far * R || (dd >= bd && dd >= ad) || !free([x, y])) continue;
    if (dd < bd && !crosses([x, y])) { bd = dd; best = [x, y]; } else if (dd < ad) { ad = dd; alt = [x, y]; }
  }
  best = best || alt;
  const moved = c && c.C && best && (c.C[0] !== best[0] || c.C[1] !== best[1]);
  LUPA_SPOT[i] = { C: best, t, from: moved ? c.D || c.C : null, tc: t };
  return best;
}
// One lens: the board-coloured disc, the live copy of the scene (clipped), the two outer tangents, the marker ring, the rim, «×3».
function lupaDraw(g, i, P0, C, z, op) {
  const R = LUPA3.R, r = R / z, col = LUPA3.col, a = mk('g', { class: 'lupa', opacity: op.toFixed(2) }, g), id = 'lupaClip' + i;
  mk('circle', { cx: bf(C[0]), cy: bf(C[1]), r: R }, mk('clipPath', { id }, a));
  mk('circle', { class: 'lupa-disc', cx: bf(C[0]), cy: bf(C[1]), r: R, fill: COL.board }, a);
  mk('use', { href: '#scene', transform: `translate(${bf(C[0])} ${bf(C[1])}) scale(${z}) translate(${bf(-P0[0])} ${bf(-P0[1])})` }, mk('g', { 'clip-path': `url(#${id})` }, a));
  lupaTangents(P0, C, r).forEach(([p, q]) => bioLine(a, p, q, col, 2, { op: .8 }));
  mk('circle', { class: 'lupa-mark', cx: bf(P0[0]), cy: bf(P0[1]), r: bf(r), fill: 'none', stroke: col, 'stroke-width': 2 }, a);
  mk('circle', { cx: bf(C[0]), cy: bf(C[1]), r: R, fill: 'none', stroke: col, 'stroke-width': 4 }, a);
  const lab = '×' + String(z).replace('.', ','), w = uiW(lab, 22) + 26;
  mk('rect', { x: bf(C[0] - w / 2), y: bf(C[1] + R - 17), width: bf(w), height: 34, rx: 17, fill: COL.board, stroke: col, 'stroke-width': 2 }, a);
  T(a, lab, { x: C[0], y: C[1] + R + 8, size: 22, fill: col, weight: 600, anchor: 'middle' });
}
// One step: every active place of the lesson draws its lens (none while the reader zooms, nothing at all without places).
function lupaTick(t) {
  const Q = lupaPlaces();
  if (!Q.length) return;
  const g = lupaLayer();
  if (!g) return;
  g.replaceChildren();
  if (!lupaOn() || CAM.z !== 1) return;
  Q.forEach((q, i) => {
    if (q.enabled === false || t < bioWhen(q.beat, q.from, 0) || t > bioWhen(q.beat, q.to, Infinity)) return;
    const fi = q.fig === undefined ? 0 : q.fig, L = [...BIO_REG].find(o => !o.custom && o.beat === q.beat && o.n === fi && o.alive());
    const vis = L ? L.vis() : 0, P0 = L && vis > .2 && lupaTarget(L.f, q.target);
    if (!P0) return;
    const z = q.zoom || LUPA3.zoom, C = lupaPos(q, i, P0, LUPA3.R / z, t, L.f), s = LUPA_SPOT[i];
    if (!C) return;
    // a moved lens slides to its new spot
    const k = s && s.from && t >= s.tc ? io(clamp((t - s.tc) / LUPA3.slide, 0, 1)) : 1, D = k < 1 ? [lerp(s.from[0], C[0], k), lerp(s.from[1], C[1], k)] : C;
    if (s) s.D = D;
    lupaDraw(g, i, P0, D, z, clamp(vis, 0, 1));
  });
}
// The player's boot wires the zoom; a new beat returns to the full frame; the timeline drives the lenses (after the biomechanics layer).
const camBoot0 = boot;
boot = function () { camInit(); return camBoot0(); };
const camRunBeat0 = runBeat;
runBeat = function (i) { camReset(); for (const k in LUPA_SPOT) delete LUPA_SPOT[k]; return camRunBeat0(i); };
const camEvalTo0 = evalTo;
evalTo = function (t, list = TW) { camEvalTo0(t, list); if (list === TW) lupaTick(t); };
/* ---------- cam end ---------- */
/* ---------- sand begin: entry to the joint sandbox from a lesson ---------- */
// Spec: docs/superpowers/specs/2026-10-31-joint-sandbox-design.md. Joint models and figures register when a lesson draws them;
// while one is seen, the bar shows a button (and П, KeyG) that opens ../sandbox/ on that joint with its angles and body position.
const SAND3 = { every: .25, minVis: .5 };
let SAND_BTN = null, SAND_CUR = null, SAND_T = -1;
const SAND_REG = new Set();
function sandReg(g, kind, read) { if (typeof BEATS !== 'undefined') SAND_REG.add({ g, kind, read }); }
// Body position from stage points: the trunk upright — the thigh level is sitting, else standing; lying — the way the foot
// points (the front of the body) up is supine, down is prone.
function sandPos(H, Sh, K, heel, toe) {
  const tr = [Sh[0] - H[0], Sh[1] - H[1]], th = [K[0] - H[0], K[1] - H[1]];
  if (Math.abs(tr[1]) >= Math.abs(tr[0])) return Math.abs(th[0]) > Math.abs(th[1]) ? 'sit' : 'stand';
  return toe[1] - heel[1] < 0 ? 'supine' : 'prone';
}
const sandRound = q => Object.fromEntries(Object.entries(q).map(([k, v]) => [k, Math.round(v)]));
// Which sandbox joint and motion a side view of the leg opens: the hip in its chapter (lessons 190–200), the ankle in its
// chapter (216–227), else the knee.
const sandLeg = () => { const n = CHAPTER.number; return n >= 190 && n <= 200 ? ['hip', 'flex'] : n >= 216 && n <= 227 ? ['ankle', 'df'] : ['knee', 'flex']; };
const sandLie = (r, th) => Math.abs(r + 90) < 25 ? 'supine' : Math.abs(r - 90) < 25 ? 'prone' : Math.abs(th - 90) < 25 ? 'sit' : 'stand';
const sandRot = g => ((st(g).r || 0) % 360 + 540) % 360 - 180;
// Readers: the sandbox joint, motion, body position and angles of what the lesson shows.
const sandModel = (j, kind) => () => {
  const th = j.q.th || 0, pos = sandLie(sandRot(j.g), th), [jt, m] = kind === 'kneeSag' ? ['knee', 'flex'] : sandLeg();
  return { j: jt, m, pos, q: sandRound({ th, kn: j.q.kn || 0, an: j.q.an || 0 }) };
};
const sandFront = j => () => ({ j: 'hip', m: 'abd', pos: Math.abs(Math.abs(sandRot(j.g)) - 90) < 25 ? 'side' : 'stand', q: sandRound({ ab: j.rel.R || 0 }) });
const sandAnkle = j => () => ({ j: 'ankle', m: 'df', pos: sandLie(sandRot(j.g), 0) === 'stand' ? 'sit' : sandLie(sandRot(j.g), 0), q: sandRound({ an: j.q.df || 0, kn: j.q.knee || 0 }) });
const sandRear = j => () => ({ j: 'ankle', m: 'inv', pos: 'sit', q: sandRound({ inv: j.q.inv || 0 }) });
// The arm chapters: 17 the shoulder (156–171), 18 the elbow (172–178), 19 the wrist and hand (179–189).
const sandArm = () => { const n = CHAPTER.number; return n >= 156 && n <= 171 ? 'shoulder' : n >= 172 && n <= 178 ? 'elbow' : n >= 179 && n <= 189 ? 'wrist' : null; };
const sandFig = f => () => {
  const P = n => onStage(f, n), pos = sandPos(P('H'), P('Sh'), P('KN'), P('heelN'), P('toeN')), arm = sandArm();
  if (arm) return { j: arm, m: 'flex', pos, q: sandRound(arm === 'wrist' ? {} : { fl: f.pose.aN || 0, el: f.pose.eN || 0 }) };
  const [jt, m] = sandLeg();
  return { j: jt, m, pos, q: sandRound({ th: f.pose.hN || 0, kn: f.pose.kN || 0, an: f.pose.fN || 0 }) };
};
// Arm models: the joint and motion they show, their angles in the sandbox's terms.
const sandSide = a => () => {
  const jt = sandArm() || 'elbow', q = a.q;
  return jt === 'wrist' ? { j: jt, m: 'flex', pos: q.pro >= .5 ? 'palmDown' : 'palmUp', q: sandRound({ wr: q.wr || 0, fg: (q.fg || 0) * 90 }) }
    : { j: jt, m: 'flex', pos: 'stand', q: sandRound({ fl: 90 - (q.sh ?? 90), el: q.el || 0 }) };
};
const SAND_ARM = {
  scapBack: b => () => ({ j: 'shoulder', m: 'abd', pos: 'stand', q: sandRound({ el: b.q.arm || 0 }) }),
  ghJoint: j => () => ({ j: 'shoulder', m: 'abd', pos: 'stand', q: sandRound({ el: j.q.elev || 0 }) }),
  topRot: r => () => ({ j: 'shoulder', m: 'rot', pos: 'stand', q: sandRound({ rot: r.rot || 0 }) }),
  ghAxial: j => () => ({ j: 'shoulder', m: 'rot', pos: 'stand', q: sandRound({ rot: j.q.rot || 0 }) }),
  armSide: sandSide,
  elbowSag: j => () => ({ j: 'elbow', m: 'flex', pos: 'stand', q: sandRound({ el: j.q.flex || 0 }) }),
  foreEnd: e => () => ({ j: 'elbow', m: 'rot', pos: 'stand', q: sandRound({ rot: e.q.rot || 0 }) }),
  elbowAnt: j => () => ({ j: 'elbow', m: 'rot', pos: 'stand', q: sandRound({ rot: 90 - 180 * (j.q.pro || 0) }) }),
  handSag: h => () => ({ j: 'wrist', m: 'flex', pos: h.flip ? 'palmUp' : 'palmDown', q: sandRound({ wr: h.q.wr || 0, fg: h.q.mp || 0 }) }),
  handFront: h => () => ({ j: 'wrist', m: 'dev', pos: 'palmDown', q: sandRound({ dev: h.q.dev || 0 }) }),
};
{ const k0 = kneeSag; kneeSag = function (...a) { const j = k0(...a); sandReg(j.g, 'kneeSag', sandModel(j, 'kneeSag')); return j; }; }
{ const h0 = hipSag; hipSag = function (...a) { const j = h0(...a); sandReg(j.g, 'hipSag', sandModel(j, 'hipSag')); return j; }; }
{ const h0 = hipFront; hipFront = function (...a) { const j = h0(...a); sandReg(j.g, 'hipFront', sandFront(j)); return j; }; }
{ const a0 = ankleSag; ankleSag = function (...a) { const j = a0(...a); sandReg(j.g, 'ankleSag', sandAnkle(j)); return j; }; }
{ const a0 = ankleRear; ankleRear = function (...a) { const j = a0(...a); sandReg(j.g, 'ankleRear', sandRear(j)); return j; }; }
{ const W = { scapBack, ghJoint, topRot, ghAxial, armSide, elbowSag, foreEnd, elbowAnt, handSag, handFront };   // the arm models
  scapBack = function (...a) { const j = W.scapBack(...a); sandReg(j.g, 'scapBack', SAND_ARM.scapBack(j)); return j; };
  ghJoint = function (...a) { const j = W.ghJoint(...a); sandReg(j.g, 'ghJoint', SAND_ARM.ghJoint(j)); return j; };
  topRot = function (...a) { const j = W.topRot(...a); sandReg(j.g, 'topRot', SAND_ARM.topRot(j)); return j; };
  ghAxial = function (...a) { const j = W.ghAxial(...a); sandReg(j.g, 'ghAxial', SAND_ARM.ghAxial(j)); return j; };
  armSide = function (...a) { const j = W.armSide(...a); sandReg(j.g, 'armSide', SAND_ARM.armSide(j)); return j; };
  elbowSag = function (...a) { const j = W.elbowSag(...a); sandReg(j.g, 'elbowSag', SAND_ARM.elbowSag(j)); return j; };
  foreEnd = function (...a) { const j = W.foreEnd(...a); sandReg(j.g, 'foreEnd', SAND_ARM.foreEnd(j)); return j; };
  elbowAnt = function (...a) { const j = W.elbowAnt(...a); sandReg(j.g, 'elbowAnt', SAND_ARM.elbowAnt(j)); return j; };
  handSag = function (...a) { const j = W.handSag(...a); sandReg(j.g0 || j.g, 'handSag', SAND_ARM.handSag(j)); return j; };
  handFront = function (...a) { const j = W.handFront(...a); sandReg(j.g0 || j.g, 'handFront', SAND_ARM.handFront(j)); return j; }; }
{ const f0 = fig; fig = function (...a) { const f = f0(...a); sandReg(f.g, 'fig', sandFig(f)); return f; }; }
// The biggest registered drawing seen now (checked every SAND3.every seconds of the lesson clock and after a seek back).
function sandTick(t) {
  if (!SAND_BTN || (t >= SAND_T && t - SAND_T < SAND3.every)) return;
  SAND_T = t; SAND_CUR = null;
  let best = 0;
  SAND_REG.forEach(e => {
    if (!e.g.isConnected) { SAND_REG.delete(e); return; }
    if (anatVis(e.g) < SAND3.minVis) return;
    const b = e.g.getBoundingClientRect(), a = b.width * b.height;
    if (a > best) { best = a; SAND_CUR = e; }
  });
  // the button keeps its place in the bar (it only fades), so the step strip never shifts under the pointer
  SAND_BTN.style.visibility = SAND_CUR ? '' : 'hidden'; SAND_BTN.disabled = !SAND_CUR;
}
function sandOpen() {
  if (!SAND_CUR) return;
  const r = SAND_CUR.read(), q = Object.entries(r.q).map(([k, v]) => k + ':' + v).join(',');
  setPlaying(false);
  location.href = `../sandbox/?j=${r.j}&m=${r.m}&pos=${r.pos}&q=${q}&from=${CHAPTER.number}&beat=${P.i}&t=${P.t.toFixed(2)}`;
}
function sandKey(e) {
  if (e.code !== 'KeyG' || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || !SAND_CUR) return;
  if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
  const help = document.getElementById('help');
  if (help && !help.hidden) return;
  e.preventDefault();
  sandOpen();
}
function sandInit() {
  const bar = document.getElementById('bar'), help = document.getElementById('bHelp');
  if (!bar || !help || SAND_BTN) return;
  SAND_BTN = Object.assign(document.createElement('button'), { className: 'icon', id: 'bSand', disabled: true, title: 'Песочница сустава (П)' });
  SAND_BTN.setAttribute('aria-label', 'Песочница сустава (П)');
  SAND_BTN.innerHTML = '<svg viewBox="0 0 18 18"><path d="M5 1.5h2.6v6.2L6.3 9.4H5zM10.4 16.5H7.8l1.6-5.6 1.4-.8 2.5 4.6z"/><circle cx="7.6" cy="9.8" r="2.4"/></svg>';
  SAND_BTN.style.visibility = 'hidden';
  SAND_BTN.onclick = sandOpen;
  bar.insertBefore(SAND_BTN, help);
  document.addEventListener('keydown', sandKey);
  sandTick(P.t);   // the first frame was evaluated before the button existed
}
const sandEvalTo0 = evalTo;
evalTo = function (t, list = TW) { sandEvalTo0(t, list); if (list === TW) sandTick(t); };
const sandBoot0 = boot;
boot = function () { const r = sandBoot0(); sandInit(); return r; };
/* ---------- sand end ---------- */
