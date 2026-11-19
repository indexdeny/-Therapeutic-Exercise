// The joint sandbox page: the reader turns the bones of one joint and sees, in two views (the limb and the joint close up),
// which muscles stretch or shorten, which ligaments tighten, what stops the motion and, in the active mode, which muscles
// work against gravity. Spec: docs/superpowers/specs/2026-10-31-joint-sandbox-design.md; data: const SAND (sandbox.py).
'use strict';
const SB3 = {
  store: 'animebook:sand', done: 'animebook:sand-done', hold: 1, show: .8, spring: .15, big: 5, hit: 44, low: .1, still: .15,
  strMin: .3 * ANAT3.strFull, taut: .6, move: '#ffe082', grav: '#8fd6b0',
  pos: { stand: 'стоя', sit: 'сидя', supine: 'лёжа на спине', prone: 'лёжа на животе', side: 'лёжа на боку', up: 'рука вверх', palmDown: 'ладонью вниз', palmUp: 'ладонью вверх' },
  feel: { soft: 'мягкое: ткани сошлись', firm: 'плотное: связка, капсула или мышца', hard: 'твёрдое: кость в кость' },
  mode: { con: 'преодолевающе', ecc: 'уступающе', iso: 'удерживает' },
  joints: [['shoulder', 'плечо'], ['elbow', 'локоть'], ['wrist', 'запястье'], ['hip', 'тазобедренный'], ['knee', 'колено'], ['ankle', 'голеностоп']],
};
const SB = { joint: null, motion: null, pos: null, mode: 'passive', q: {}, sel: null, stop: null, task: null, from: null, V: {}, t0: performance.now(), hi: null };
const sbM = () => SAND[SB.joint].motions.find(m => m.id === SB.motion);
const sbP = () => sbM().positions[SB.pos];
const sbS = id => SAND[SB.joint].structures[id];
const sbIds = () => sbM().ids || Object.keys(SAND[SB.joint].structures);   // the structures this motion shows
const sbDof = k => sbM().dof.find(d => d.key === k);
const sbHandleAt = (d, view) => typeof d.handle === 'object' ? d.handle[view] : d.handle;   // share of the segment, per view
const sbLerp = (A, B, q) => [lerp(A[0], B[0], q), lerp(A[1], B[1], q)];
ANAT3.name.focus = 'не работает';   // the legend: here no muscle belongs to a lesson
ANAT3.rate = .006;   // a slow drag still counts as motion: two-joint muscles change length slowly when one joint moves

/* ---------- views: how the sandbox builds, poses and reads each model (stage points; the models sit right under #scene) ---------- */
const SB_VIEW = {
  hipSag: {
    build: (p, [x, y, s], o) => hipSag(p, x, y, s, null, { muscles: o.muscles, ligs: true, caps: true, farLeg: false }),
    set: (j, q) => j.set({ th: q.th ?? 0, kn: q.kn ?? 0, an: q.an ?? 0 }),
    seg: { th: j => [j.at('H'), j.at('K')], kn: j => [j.at('K'), j.at('ankle')], an: j => [j.at('ankle'), j.at('ball')] },
    prox: { th: j => j.at('crest'), kn: j => j.at('H'), an: j => j.at('K') },
    mass: {
      th: j => [[sbLerp(j.at('H'), j.at('K'), .433), .1], [sbLerp(j.at('K'), j.at('ankle'), .433), .0465], [sbLerp(j.at('heel'), j.at('toe'), .5), .0145]],
      kn: j => [[sbLerp(j.at('K'), j.at('ankle'), .433), .0465], [sbLerp(j.at('heel'), j.at('toe'), .5), .0145]],
      an: j => [[sbLerp(j.at('heel'), j.at('toe'), .5), .0145]],
    },
    distal: { th: ['K', 'ankle', 'heel', 'toe'], kn: ['ankle', 'heel', 'toe'], an: ['heel', 'toe'] },
    el: (j, k) => k.startsWith('C.') ? j.C[k.slice(2)] : j.M[k] || j.L[k],
    pt: (j, n) => j.at(n),
  },
  kneeSag: {
    // The model's posterior capsule wraps the back of the condyle and grows long again in deep flexion; here it runs from the
    // femur straight to the tibia, so it is taut in extension and slack in flexion (only on this page: lessons keep the model).
    build: (p, [x, y, s], o) => {
      const j = kneeSag(p, x, y, s, null, { muscles: o.muscles, ligs: true, caps: true }), c = j.C.post;
      j.capP = () => [j.fm([-.55, -1.55]), j.fm([-1.25, -.6]), j.tb([-1.05, 1.55])];
      c.rest = polyLen(j.capP()) * 1.03;
      return j;
    },
    set: (j, q) => { j.set({ th: q.th ?? 0, kn: q.kn ?? 0 }); const P = j.capP(); j.C.post.set(P, polyLen(P), [0, 0]); },
    seg: { kn: j => [j.at('K'), j.stage(j.tb([0, 4.6]))] },
    prox: { kn: j => j.stage(j.fm([0, -4.6])) },
    mass: {}, distal: {},
    el: (j, k) => k.startsWith('C.') ? j.C[k.slice(2)] : j.M[k] || j.L[k],
    pt: (j, n) => j.at(n),
  },
  // The pelvis and both legs from the front; the right leg (the patient's, on the screen left) moves: ab — abduction from the
  // vertical (+ away from the midline). A point name may carry a side: 'K@L' is the left knee.
  hipFront: {
    build: (p, [x, y, s], o) => hipFront(p, x, y, s, null, { muscles: o.muscles, ligs: true, caps: false, tibia: !o.clip, spine: !o.clip }),
    set: (j, q) => j.set({ abdR: q.ab ?? 0 }),
    seg: { ab: j => [j.at('H', 'R'), j.at('K', 'R')] },
    prox: { ab: j => { const H = j.at('H', 'R'), a = j.at('sym'), b = j.at('sacrum'); return [H[0] + (b[0] - a[0]) * 4, H[1] + (b[1] - a[1]) * 4]; } },
    mass: { ab: j => [[sbLerp(j.at('H', 'R'), j.at('K', 'R'), .433), .1], [sbLerp(j.at('K', 'R'), j.at('ankle', 'R'), .433), .0465], [j.at('ankle', 'R'), .0145]] },
    distal: { ab: ['K', 'ankle'] },
    el: (j, k) => k.startsWith('C.') ? j.C.R[k.slice(2)] : j.M.R[k] || j.L.R[k],
    pt: (j, n) => { const [a, sd] = n.split('@'); return j.at(a, sd || 'R'); },
  },
  // The ankle and foot from the lateral side (toes forward): an — dorsiflexion (+) / plantarflexion (−); the shank leans as in the
  // limb view (th − kn) and the knee angle slackens the gastrocnemius. Its bands (tBand) carry a tension, not a length.
  ankleSag: {
    build: (p, [x, y, s], o) => ankleSag(p, x, y, s, null, { view: 'lat', muscles: o.muscles, ligs: true, caps: true }),
    set: (j, q) => j.set({ df: q.an ?? 0, knee: q.kn ?? 0, lean: (q.th ?? 0) - (q.kn ?? 0) }),
    seg: { an: j => [j.at('ankle'), j.at('ball')] },
    prox: { an: j => j.at('shin') },
    mass: {}, distal: {},
    el: (j, k) => k.startsWith('C.') ? j.C[k.slice(2)] : j.M[k] || j.L[k],
    pt: (j, n) => j.at(n),
  },
  // The ankle from behind: inv — inversion (+) / eversion (−) of the calcaneus under the talus.
  ankleRear: {
    build: (p, [x, y, s], o) => ankleRear(p, x, y, s, null, { muscles: o.muscles, ligs: true, fade: 5 }),
    set: (j, q) => j.set({ inv: q.inv ?? 0 }),
    seg: { inv: j => [j.at('sub'), j.at('heel')] },
    prox: { inv: j => j.stage(j.S([0, -4])) },
    mass: {}, distal: {},
    el: (j, k) => j.M[k] || j.L[k],
    pt: (j, n) => j.at(n),
  },
  // The back of the upper trunk with the right scapula and arm: el — elevation of the arm in the frontal plane; the scapula
  // follows by the scapulohumeral rhythm. Its muscles are sheets (strain, no live-anatomy colours).
  scapBack: {
    build: (p, [x, y, s]) => scapBack(p, x, y, s, null, { rhythm: true, mus: true }),
    set: (j, q) => j.set({ arm: q.el ?? 0 }),
    seg: { el: j => [j.at('HH'), j.at('E')] },
    prox: { el: j => { const H = j.at('HH'); return [H[0], H[1] - 100]; } },
    mass: { el: j => [[sbLerp(j.at('HH'), j.at('E'), .436), .028], [sbLerp(j.at('E'), j.at('W'), .43), .022]] },
    distal: { el: ['E', 'W'] },
    el: (j, k) => j.mus[k],
    pt: (j, n) => j.at(n),
  },
  // The right shoulder in a frontal section: el — elevation with the rhythm (scap null); the cuff, deltoid and biceps are
  // bands, the superior and inferior capsule capEl; j.comp — how much the cuff and bursa are squeezed under the acromion.
  ghJoint: {
    build: (p, [x, y, s]) => ghJoint(p, x, y, s, null, { delt: true, bic: true, rhythm: true }),
    set: (j, q) => j.set({ elev: Math.min(q.el ?? 0, 175), scap: null }),   // the superior capsule's path flips past ≈ 177°
    seg: { el: j => [j.at('H'), j.at(j.hum([0, 4 * j.R]))] },
    prox: { el: j => { const H = j.at('H'); return [H[0], H[1] - 100]; } },
    mass: {}, distal: {},
    el: (j, k) => ({ capS: j.capS, capI: j.capI, ssp: j.sspM, delt: j.delt, bic: j.bic })[k],
    pt: (j, n) => j.at(n),
    notes: j => {   // the share of the scapula in the elevation (the model's rhythm) and a squeezed space under the acromion
      // the asked elevation (the drawing stops at 175°)
      const el = SB.q.el ?? j.q.elev, sc = rhythmUp(el), out = el > 5 ? [{ ru: `плечевой сустав ${Math.round(el - sc)}°, лопатка ${Math.round(sc)}°`, col: SB3.move }] : [];
      if (j.comp > .25) out.push({ ru: 'под акромионом тесно: сухожилие надостной и сумка сдавлены', col: COL.bad });
      return out;
    },
  },
  // A person seen from above, the right elbow bent 90° at the side: rot — external (+) / internal (−) rotation (the belly
  // stops it at −62).
  topRot: {
    build: (p, [x, y, s]) => topRot(p, x, y, s, null),
    set: (j, q) => j.set(q.rot ?? 0),
    seg: { rot: j => [j.at('E'), j.at('W')] },
    prox: { rot: j => { const E = j.at('E'); return [E[0], E[1] + 100]; } },
    mass: {}, distal: {},
    el: () => null,
    pt: (j, n) => j.at(n),
  },
  // The right shoulder in a horizontal section (anterior up): rot as above; capA / capP — anterior and posterior capsule,
  // sub — subscapularis, isp — infraspinatus with teres minor (bands).
  ghAxial: {
    build: (p, [x, y, s]) => ghAxial(p, x, y, s, null, { fore: true }),
    // past ≈ 73° of external rotation the model's posterior capsule wraps the other way round the head and reads taut; here
    // it keeps its 70° path (slack)
    set: (j, q) => { j.set({ rot: q.rot ?? 0 }); if ((q.rot ?? 0) > 70) { const cp = wrapPts(polar([0, 0], j.R + 8, 110), j.H, j.R + 3, 74 + 70, -1); j.capP.set(cp.pts, cp.L, j.H); } },
    seg: { rot: j => [j.at('H'), j.at('fore')] },
    prox: { rot: j => { const H = j.at('H'); return [H[0], H[1] + 100]; } },
    mass: {}, distal: {},
    el: (j, k) => ({ capA: j.capA, capP: j.capP, sub: j.sub, isp: j.isp })[k],
    pt: (j, n) => j.at(n),
  },
  // The right arm from the side (anterior to the right): fl — shoulder flexion (sh = 90 − fl), el — elbow flexion. The biceps
  // and the long head of the triceps cross the shoulder and the elbow; wrist and finger muscles cross the elbow and the wrist.
  armSide: {
    build: (p, [x, y, s], o) => armSide(p, x, y, s, null, { muscles: o.muscles }),
    // The two-joint muscles' lengths by moment arms (share of length per radian; the drawn triceps can wrap round the front
    // of a deeply bent elbow and shorten): the long head of the triceps lengthens with shoulder and elbow flexion, the biceps
    // shortens with both. Wrist and finger muscles keep the model's lengths.
    set: (j, q) => {
      j.set({ sh: 90 - (q.fl ?? 0), el: q.el ?? 0, wr: q.wr ?? 0, fg: clamp((q.fg ?? 18) / 90, 0, 1), pro: q.pro ?? 1 });   // fg: finger flexion in degrees
      const fl = rad(q.fl ?? 0), el = rad(q.el ?? 0), M = j.M;
      if (M.tri) M.tri.set(M.tri.last[0], M.tri.rest * (1 + .07 * fl + .07 * el));
      if (M.bic) M.bic.set(M.bic.last[0], M.bic.rest * (1 - .06 * fl - .12 * el));
    },
    seg: { fl: j => [j.at('S'), j.at('E')], el: j => [j.at('E'), j.at('W')], wr: j => [j.at('W'), j.at('F')] },
    prox: { fl: j => j.at([0, -100]), el: j => j.at('S'), wr: j => j.at('E') },
    mass: {
      fl: j => [[sbLerp(j.at('S'), j.at('E'), .436), .028], [sbLerp(j.at('E'), j.at('W'), .43), .016], [j.at('grip'), .006]],
      el: j => [[sbLerp(j.at('E'), j.at('W'), .43), .016], [j.at('grip'), .006]],
      wr: j => [[j.at('grip'), .006]],
    },
    distal: { fl: ['E', 'W'], el: ['W'], wr: ['F'] },
    el: (j, k) => j.M[k],
    pt: (j, n) => j.at(n),
  },
  // The right elbow from the lateral side (anterior to the right, the humerus from above): el — flexion. Muscles and ligaments
  // are properties of the model (j.bic, j.lcl …), the capsule j.capA / j.capP.
  elbowSag: {
    build: (p, [x, y, s], o) => elbowSag(p, x, y, s, null, { view: 'lat', muscles: true, ligs: true, skin: true }),
    set: (j, q) => j.set({ flex: q.el ?? 0 }),
    seg: { el: j => [j.at('C'), j.at('W')] },
    prox: { el: j => j.at('shaft') },
    mass: {}, distal: {},
    el: (j, k) => j[k] && j[k].set ? j[k] : null,
    pt: (j, n) => j.at(n),
  },
  // The right forearm end-on (the elbow bent 90° at the side): rot — supination (+, palm up at 90) / pronation (−).
  foreEnd: {
    build: (p, [x, y, s]) => foreEnd(p, x, y, s, null),
    set: (j, q) => j.set({ rot: q.rot ?? 0 }),
    seg: { rot: j => [j.at('C'), j.at('thumb')] },
    prox: { rot: j => { const C = j.at('C'); return [C[0], C[1] + 100]; } },
    mass: {}, distal: {},
    el: () => null,
    pt: (j, n) => j.at(n),
  },
  // The right elbow and forearm from the front: pro 0 (supinated) … 1 (pronated) from rot (+90 … −90).
  elbowAnt: {
    build: (p, [x, y, s]) => elbowAnt(p, x, y, s, null, { muscles: true, ligs: true }),
    set: (j, q) => j.set({ pro: clamp((90 - (q.rot ?? 0)) / 180, 0, 1) }),
    seg: {}, prox: {}, mass: {}, distal: {},
    el: (j, k) => j[k] && j[k].set ? j[k] : null,
    pt: (j, n) => j.at(n),
  },
  // The right wrist and hand from the radial side (forearm to the left, the back of the hand up; flip: palm up): wr — wrist
  // flexion (+, toward the palm); fg — finger flexion at each joint. Forearm muscles of the long finger tendons and the
  // wrist (wmus) are bellyEl; the volar plates and the collateral ligament of the MP joint ligBand.
  handSag: {
    build: (p, [x, y, s], o) => handSag(p, x, y, s, null, { wmus: true, flip: !!o.flip }),
    set: (j, q) => { const f = q.fg ?? 15; j.set({ wr: q.wr ?? 0, mp: f, pip: f, dip: f * .6 }); },
    seg: { wr: j => [j.at('C0'), j.at('MP')], fg: j => [j.at('MP'), j.at('tip')] },
    prox: { wr: j => j.at('radius'), fg: j => j.at('C0') },
    mass: {}, distal: {},
    el: (j, k) => j[k] && j[k].set ? j[k] : null,
    pt: (j, n) => j.at(n),
  },
  // The right wrist and hand from the back (fingers up): dev — radial (−) / ulnar (+) deviation.
  handFront: {
    build: (p, [x, y, s]) => handFront(p, x, y, s, null, { view: 'back' }),
    set: (j, q) => j.set({ dev: q.dev ?? 0 }),
    seg: { dev: j => [j.at('W'), j.at('MP3')] },
    prox: { dev: j => j.at([0, 100]) },
    mass: {}, distal: {},
    el: () => null,
    pt: (j, n) => j.at(n),
  },
};
// Stretch of a structure past its rest: from the limb view when it shows it (two-joint lengths), else from the close-up.
function sbStrain(id) {
  const s = sbS(id), v = s.limb ? SB.V.limb : SB.V.close, key = s.limb || s.close;
  if (!key || !v) return 0;
  const e = SB_VIEW[v.model].el(v.j, key);
  if (!e) return 0;
  if (e.strain != null) return e.strain;                               // muscle (bellyEl)
  if (e.last && e.K != null) return e.last[1] / (e.rest * e.K) - 1;     // capsule (capEl)
  if (e.torn != null) return e.k;                                       // a band with a given tension (tBand): −1 … 1
  return e.L != null && e.rest ? e.L / e.rest - 1 : 0;                 // ligament (ligBand)
}
// Pose both views (no stops); the close-up's shared muscles take the limb view's relative length.
function sbSet(q) {
  SB.q = { ...SB.q, ...q };
  for (const k of ['limb', 'close']) { const v = SB.V[k]; if (v) SB_VIEW[v.model].set(v.j, SB.q); }
  const L = SB.V.limb, C = SB.V.close;
  if (L && C) for (const id of sbIds()) {
    const s = sbS(id); if (s.kind !== 'muscle' || !s.limb || !s.close) continue;
    const a = SB_VIEW[L.model].el(L.j, s.limb), b = SB_VIEW[C.model].el(C.j, s.close);
    if (a && b && b.last && b.rest) b.set(b.last[0], b.rest * (1 + a.strain));
  }
  return SB.q;
}
// Build the scene for a joint, motion, body position and pose (moved there through the stops).
function sbOpen(joint, motion, pos, q = null, mode = SB.mode) {
  Object.assign(SB, { joint, motion, pos, mode, stop: null, q: {}, turn: {}, sense: {}, sig: null, hi: null, spring: null, mv: {}, vq: null });
  const M = sbM(), P = M.positions[pos];
  scene.replaceChildren(); TW = [];
  const back = G(scene), views = G(scene), over = G(scene);
  SB.layer = { back, views, over }; SB.ov = G(over); SB.hg = G(over);
  SB.V = {};
  for (const k of ['limb', 'close']) {
    if (!M[k]) continue;
    const g = G(views), j = SB_VIEW[M[k].model].build(g, P[k], { ...M[k], ...(P[k + 'Opt'] || {}) });   // a position may tune its view (a hand palm up)
    put(j.g, { o: 1, r: P.r || 0 });
    SB.V[k] = { model: M[k].model, j, g };
    if (M[k].clip) {   // a whole-limb model shown close up: a disc round the joint, fading out
      const [C] = SB_VIEW[M[k].model].seg[M.main](j), [r0, r1] = M[k].clip;
      g.setAttribute('mask', kRadMask(mk('defs', {}, g), C[0], C[1], r0, r1));
    }
  }
  sbSet({ ...P.q0 });
  SB.sel = M.main;
  sbSupport();
  // to the asked pose through the stops; a few passes, as a support may let one joint move only after another (lying: the
  // thigh lifts before the knee bends)
  if (q) for (let pass = 0; pass < 3; pass++) for (const d of M.dof) if (q[d.key] != null) sbMove(d.key, clamp(q[d.key], sbRange(d)[0], sbRange(d)[1]));
  SB.stop = null;
  if (SB.mode === 'passive') sbActivate([]);
  const title = document.getElementById('sbTitle') || Object.assign(document.createElement('h1'), { id: 'sbTitle' });
  if (!title.isConnected) document.getElementById('ui').append(title);
  title.textContent = 'Песочница: ' + SAND[joint].title;
  sbSave();
}
// Last joint, motion, position and mode (this browser only).
function sbSave() { try { localStorage.setItem(SB3.store, JSON.stringify({ j: SB.joint, m: SB.motion, pos: SB.pos, mode: SB.mode })); } catch {} }
function sbRestore() { try { return JSON.parse(localStorage.getItem(SB3.store) || '{}') || {}; } catch { return {}; } }

/* ---------- stops and supports ---------- */
// Table or seat: the line the 'above' points keep to is where the lowest of them is in the starting pose (+1 px); it is drawn
// pad × the limb's scale lower, under the surface of the limb (the points are joint centres). Prone, the feet hang off the end.
function sbSupport() {
  const P = sbP(), back = SB.layer.back, v = SB.V.limb;
  back.replaceChildren(); SB.support = null;
  if (P.bed) mk('rect', { x: P.bed[0], y: P.bed[1], width: P.bed[2], height: P.bed[3], rx: 26, fill: '#3d4a52', 'fill-opacity': .45, stroke: COL.dim, 'stroke-width': 2 }, back);   // a couch seen from above
  if (!v || !P.above.length) return;
  const pt = n => SB_VIEW[v.model].pt(v.j, n), y = Math.max(...P.above.map(n => pt(n)[1])) + 1, yd = y + (P.pad || 0) * P.limb[2];
  SB.support = { y, pts: P.above };
  const slab = (xa, xb) => mk('rect', { x: bf(xa), y: bf(yd), width: bf(xb - xa), height: 20, rx: 8, fill: '#3d4a52', stroke: COL.dim, 'stroke-width': 2 }, back);
  const legs = (...xs) => path(back, xs.map(x => `M${bf(x)} ${bf(yd + 20)}V${bf(yd + 170)}`).join(''), { stroke: COL.dim, 'stroke-width': 6 });
  if (P.tableX) { slab(...P.tableX); legs(P.tableX[0] + 50, P.tableX[1] - 50); return; }   // not a leg: the couch's ends come from the data
  const H = pt('H'), A = pt('ankle');
  if (P.table) {
    // feetOff: the foot hangs off the end of the couch (ankle exercises), so the table stops at the ankle
    const [xa, xb] = A[0] > H[0] ? [H[0] - 300, P.feetOff ? A[0] - 20 : Math.max(A[0], pt('heel')[0]) + 50] : [A[0] - 24, H[0] + 360];
    slab(xa, xb); legs(xa + 50, xb - 50);
  }
  if (P.seat) {
    const K = pt('K');
    slab(H[0] - 100, K[0] - 30); legs(H[0] - 80, K[0] - 60);
    path(back, `M${bf(H[0] - 92)} ${bf(yd)}V${bf(yd - 210)}`, { stroke: COL.dim, 'stroke-width': 6 });
  }
}
// Put the pose and test it: the first stop it breaks, or null.
function sbTry(q) {
  sbSet(q);
  for (const s of sbM().stops) {
    if (s.dof) { const v = SB.q[s.dof]; if ((s.max != null && v > s.max + 1e-6) || (s.min != null && v < s.min - 1e-6)) return { ids: s.ids, feel: s.feel, note: s.note }; continue; }
    if (sbStrain(s.id) > s.max) return { ids: [s.id], feel: s.feel, note: s.note };
  }
  const S = SB.support, v = SB.V.limb;
  if (S && S.pts.some(n => SB_VIEW[v.model].pt(v.j, n)[1] > S.y + .5)) return { ids: [], feel: null, support: true };
  return null;
}
// Move toward target in 1° steps; at the first broken stop, halve back to the last good value (0.05° apart).
function sbMove(dof, target) {
  const from = SB.q[dof], dir = Math.sign(target - from), q = { ...SB.q };
  let ok = from, hit = null;
  for (let v = from; dir && (target - v) * dir > 1e-9;) {
    const nv = dir > 0 ? Math.min(target, v + 1) : Math.max(target, v - 1);
    q[dof] = nv;
    const s = sbTry(q);
    if (s) {
      hit = s; let a = ok, b = nv;
      while (Math.abs(b - a) > .05) { const m = (a + b) / 2; q[dof] = m; if (sbTry(q)) b = m; else a = m; }
      break;
    }
    ok = v = nv;
  }
  q[dof] = ok; sbSet(q);
  SB.stop = hit ? { ...hit, dof, dir } : SB.stop && SB.stop.dof !== dof ? SB.stop : null;
  return hit;
}
// A reference pose of the file: open it, move to `to`, report where and by what it stopped.
function sbRef(r) {
  sbOpen(SB.joint, SB.motion, r.pos, r.q, 'passive');
  const s = sbMove(r.dof, r.to);
  return { angle: SB.q[r.dof], by: s ? (s.support ? ['support'] : s.ids) : [] };
}
// Move a parameter toward a value through the stops; a new stop springs its handle.
// The range of a parameter in the current position (a position may narrow it: side-lying, the top leg rests on the other one).
const sbRange = d => (sbP().range && sbP().range[d.key]) || d.range;
function sbGo(dof, target) {
  const d = sbDof(dof), rg = sbRange(d); target = clamp(target, rg[0], rg[1]);
  const was = SB.stop && SB.stop.dof === dof && SB.stop.dir === Math.sign(target - SB.q[dof]);
  const s = sbMove(dof, target);
  if (s && !was) SB.spring = { dof, at: performance.now() };
  return s;
}

/* ---------- handles, dragging, keys ---------- */
// Screen turn of the segment of `dof` per +1° of it (sign only), measured once per scene with a probe pose.
function sbTurn(view, dof) {
  const key = view + dof; if (SB.turn[key]) return SB.turn[key];
  const v = SB.V[view], A = SB_VIEW[v.model], q0 = SB.q[dof] ?? 0, ang = () => { const [C, E] = A.seg[dof](v.j); return Math.atan2(E[1] - C[1], E[0] - C[0]); };
  const a0 = ang(); A.set(v.j, { ...SB.q, [dof]: q0 + 1 }); let d = ang() - a0; A.set(v.j, SB.q);
  d = (d + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  return (SB.turn[key] = d >= 0 ? 1 : -1);
}
// Handles: a ring with a double arrow across the segment, part way along it; the selected one is brighter.
function sbHandles() {
  const g = SB.hg, old = new Map([...g.children].map(h => [h.dataset.view + h.dataset.dof, h]));
  for (const view of ['limb', 'close']) {
    const v = SB.V[view]; if (!v) continue;
    for (const d of sbM().dof) {
      const sg = SB_VIEW[v.model].seg[d.key]; if (!sg || sbHandleAt(d, view) == null) continue;   // no handle for this view
      const [C, E] = sg(v.j), P = sbLerp(C, E, sbHandleAt(d, view)), u = bioUnit([E[0] - C[0], E[1] - C[1]]), n = [-u[1], u[0]];
      let h = old.get(view + d.key);
      if (!h) {
        h = mk('g', { class: 'sb-h', tabindex: 0, 'data-view': view, 'data-dof': d.key, role: 'slider', 'aria-label': d.act }, g);
        mk('circle', { r: 24, fill: COL.board, stroke: SB3.move }, h);
        path(h, '', { stroke: SB3.move, 'stroke-width': 3, 'stroke-linecap': 'round' });
        h.addEventListener('focus', () => { SB.sel = d.key; });
      }
      old.delete(view + d.key);
      const a = [n[0] * 14, n[1] * 14], tip = (Q, s) => { const b = [Q[0] - s * n[0] * 7, Q[1] - s * n[1] * 7];
        return `M${bf(b[0] - u[0] * 6)} ${bf(b[1] - u[1] * 6)}L${bf(Q[0])} ${bf(Q[1])}L${bf(b[0] + u[0] * 6)} ${bf(b[1] + u[1] * 6)}`; };
      h.lastChild.setAttribute('d', `M${bf(a[0])} ${bf(a[1])}L${bf(-a[0])} ${bf(-a[1])}` + tip(a, 1) + tip([-a[0], -a[1]], -1));
      const on = SB.sel === d.key, sp = SB.spring && SB.spring.dof === d.key ? clamp((performance.now() - SB.spring.at) / 1000 / SB3.spring, 0, 1) : 1;
      h.setAttribute('transform', `translate(${bf(P[0])} ${bf(P[1])}) scale(${(1 + .25 * Math.sin(Math.PI * sp)).toFixed(3)})`);
      h.firstChild.setAttribute('stroke-width', on ? 4.5 : 2.5); h.firstChild.setAttribute('fill-opacity', on ? .75 : .45);
      h.setAttribute('aria-valuenow', Math.round(SB.q[d.key]));
    }
  }
  old.forEach(h => h.remove());
}
// What a pointer at stage (x, y) grabs: a handle within its ring, else the nearest segment within SB3.hit.
function sbPick(x, y) {
  let best = null;
  for (const view of ['limb', 'close']) {
    const v = SB.V[view]; if (!v) continue;
    for (const d of sbM().dof) {
      const sg = SB_VIEW[v.model].seg[d.key]; if (!sg || sbHandleAt(d, view) == null) continue;
      const [C, E] = sg(v.j), P = sbLerp(C, E, sbHandleAt(d, view)), dh = Math.hypot(x - P[0], y - P[1]);
      const ex = E[0] - C[0], ey = E[1] - C[1], q = clamp(((x - C[0]) * ex + (y - C[1]) * ey) / (ex * ex + ey * ey), .15, 1);
      const ds = Math.hypot(x - C[0] - ex * q, y - C[1] - ey * q), score = dh <= 28 ? dh - 100 : ds;
      if (score < SB3.hit && (!best || score < best.score)) best = { dof: d.key, view, score };
    }
  }
  return best;
}
// Dragging: the bone follows the pointer's angle around the joint, counted from where the drag began (so it waits at a stop).
function sbPointer() {
  const svg = document.getElementById('stage');
  const at = e => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
  const axis = dr => SB_VIEW[SB.V[dr.view].model].seg[dr.dof](SB.V[dr.view].j)[0];
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const [x, y] = at(e), pk = sbPick(x, y);
    SB.down = { x, y, moved: false };
    if (!pk) return;
    SB.sel = pk.dof;
    const C = axis(pk), a = Math.atan2(y - C[1], x - C[0]);
    drag = { ...pk, acc: 0, prev: a, v0: SB.q[pk.dof], k: sbTurn(pk.view, pk.dof) };
    svg.setPointerCapture(e.pointerId);
    svg.style.cursor = 'grabbing';
  }, true);
  svg.addEventListener('pointermove', e => {
    const [x, y] = at(e);
    if (SB.down && Math.hypot(x - SB.down.x, y - SB.down.y) > 4) SB.down.moved = true;
    if (!drag) { svg.style.cursor = sbPick(x, y) ? 'grab' : ''; return; }
    const C = axis(drag), a = Math.atan2(y - C[1], x - C[0]);
    let d = a - drag.prev; d = (d + 3 * Math.PI) % (2 * Math.PI) - Math.PI; drag.prev = a; drag.acc += d;
    sbGo(drag.dof, drag.v0 + drag.k * drag.acc * 180 / Math.PI);
  }, true);
  const end = () => { if (SB.down && !SB.down.moved) sbClick(SB.down.x, SB.down.y); drag = null; SB.down = null; svg.style.cursor = ''; };
  svg.addEventListener('pointerup', end, true); svg.addEventListener('pointercancel', end, true);
  svg.addEventListener('click', e => e.stopPropagation(), true);
  svg.addEventListener('dblclick', e => e.stopPropagation(), true);
  svg.addEventListener('wheel', e => e.stopPropagation(), true);
}
// Keys, in the capture phase: the lesson player and the lesson layers on this page never see them.
function sbKey(e) {
  if (e.altKey || e.metaKey || e.ctrlKey) return;
  e.stopImmediatePropagation();
  if (e.target.matches && e.target.matches('input, textarea, select')) return;
  const k = e.key, own = () => e.preventDefault();
  if (k === 'ArrowLeft' || k === 'ArrowRight') { own(); sbGo(SB.sel, SB.q[SB.sel] + (k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? SB3.big : 1)); return; }
  if (k === '0') { own(); sbOpen(SB.joint, SB.motion, SB.pos, null, SB.mode); return; }
  if (k === '?') { own(); sbHelp(); return; }
  if (k === 'Escape') { own(); sbCloseAll(); return; }
  if ((k === ' ' || k === 'Enter') && !(e.target.closest && e.target.closest('button, a'))) own();
}

/* ---------- what the panel shows ---------- */
const sbName = id => sbS(id).ru;
function sbState() {
  const st = { q: { ...SB.q }, stop: SB.stop, str: [], short: [], taut: [], slack: [], work: [], load: null };
  for (const id of sbIds()) {
    const s = sbS(id), v = s.limb ? SB.V.limb : SB.V.close, key = s.limb || s.close, e = key && v && SB_VIEW[v.model].el(v.j, key);
    if (!e) continue;
    const holds = SB.stop && SB.stop.ids && SB.stop.ids.includes(id);   // the muscle that holds the stop is stretched, however little the model lengthens it
    if (s.kind === 'muscle') { const x = sbStrain(id); if (x > SB3.strMin || holds) st.str.push(id); else if (x < -SB3.strMin) st.short.push(id); }
    else ((e.tension ?? e.k) >= SB3.taut ? st.taut : st.slack).push(id);
  }
  if (SB.mode === 'active') {   // a working muscle is listed once, as working
    Object.assign(st, sbWork());
    const on = new Set(st.work.flatMap(w => w.ids));
    st.str = st.str.filter(id => !on.has(id)); st.short = st.short.filter(id => !on.has(id));
  }
  return st;
}
const sbList = ids => ids.map(id => `<span class="s${id === SB.hi ? ' hi' : ''}" data-id="${id}">${sbName(id)}</span>`).join(', ');
const sbSect = (h, rows) => rows ? `<h3>${h}</h3><ul>${rows}</ul>` : '';   // a section only when it has rows
const sbRow = (dot, label, ids, cls = '') => ids.length ? `<li class="${cls}"><i style="background:${dot}"></i><span>${label}${sbList(ids)}</span></li>` : '';
function sbPanel() {
  const st = sbState(), M = sbM(), main = sbDof(M.main), sel = sbDof(SB.sel) || main;
  const sig = JSON.stringify([st.str, st.short, st.taut, st.work, st.stop, Math.round(SB.q[main.key]), SB.sel, SB.mode, SB.pos, st.load && [Math.round(st.load.frac * 20), st.load.low, st.load.sup], !!SB.task]);
  if (sig === SB.sig) return;
  SB.sig = sig;
  let el = document.getElementById('sbPanel');
  if (!el) { el = Object.assign(document.createElement('div'), { id: 'sbPanel' }); document.getElementById('ui').append(el); }
  const C = ANAT3.col;
  const work = st.work.map(w => `<li><i style="background:${C[w.mode]}"></i><span>работает: ${sbList(w.ids)} — ${SB3.mode[w.mode]}</span></li>`).join('');
  const lows = SB.mode === 'active' ? M.dof.map(d => { const l = st.loads && st.loads[d.key]; return l && l.low ? `<li><i style="background:${COL.faint}"></i><span>${d.ru}: ${l.plane ? 'движение в горизонтальной плоскости, сила тяжести не мешает' : l.sup ? 'лежит на опоре' : 'почти без нагрузки'}</span></li>` : ''; }).join('') : '';
  const stop = !st.stop ? '' : st.stop.support ? `<p class="stop">упор: ${SB.pos === 'sit' ? 'сиденье' : 'стол'}</p>`
    : `<p class="stop">упор: ${sbList(st.stop.ids)}${st.stop.feel ? ' — ' + SB3.feel[st.stop.feel] : ''}</p>`;
  const bar = SB.mode === 'active' && st.load && !st.load.plane ? `<h3>момент силы тяжести: ${sel.ru}</h3><div class="bar"><i style="width:${(st.load.frac * 100).toFixed(0)}%"></i></div>` : '';
  const facts = SB.task ? '' : (SAND[SB.joint].facts || []).filter(f => (!f.motion || f.motion === SB.motion) && (!f.mode || f.mode === SB.mode) && (!f.pos || f.pos === SB.pos)).map(f => `<p class="fact">${f.ru} <small>(с. ${f.page})</small></p>`).join('');
  const note = main.normNote || (st.stop && st.stop.note) ? '<p class="note"><span>пояснение: не из книги</span> норма и упоры</p>' : '';
  const others = M.dof.filter(d => d.key !== M.main).map(d => `${d.ru} ${Math.round(SB.q[d.key])}°`).join(', ');
  el.innerHTML = `<h2><span>${main.act}</span><b>${Math.round(SB.q[main.key])}°</b></h2>` +
    `<div class="norm">${[`норма ${main.norm[0]}–${main.norm[1]}°`, others, SB3.pos[SB.pos], SB.mode === 'active' ? 'активно' : 'пассивно'].filter(Boolean).join(' · ')}</div>` +
    sbSect('мышцы', work + lows + sbRow(C.str, 'растягиваются: ', st.str) + sbRow(C.rest, 'укорочены, провисают: ', st.short)) +
    sbSect('связки и капсула', sbRow(ANAT.taut, 'натянуты: ', st.taut) + sbRow('#bdb59a', 'провисают: ', st.slack, 'wave slack') + sbNotes()) +
    stop + bar + facts + note;
  el.querySelectorAll('.s').forEach(s => { s.addEventListener('pointerenter', () => sbHi(s.dataset.id)); s.addEventListener('pointerleave', () => sbHi(null)); });
  if (SB.hi) sbHi(SB.hi);
}
// A model point (its own coordinates) on the stage, for models with and without their own mapping.
function sbToStage(j, P) {
  if (j.stage) return j.stage(P);
  if (j.at) return j.at(P);
  const S = st(j.g), v = rotPt(P[0] * S.s, P[1] * S.s, S.r || 0);
  return [S.x + v[0], S.y + v[1]];
}
// Whether a structure is drawn in the current views.
const sbHas = id => { const s = sbS(id); return [[SB.V.limb, s.limb], [SB.V.close, s.close]].some(([v, k]) => v && k && SB_VIEW[v.model].el(v.j, k)); };
// Lines a model adds about itself (the shoulder: the space under the acromion), shown under the ligaments.
const sbNotes = () => ['limb', 'close'].map(k => { const v = SB.V[k], A = v && SB_VIEW[v.model]; return A && A.notes ? A.notes(v.j) : []; }).flat()
  .map(n => `<li><i style="background:${n.col}"></i><span>${n.ru}</span></li>`).join('');
// The drawn element of a structure: a muscle's group, a ligament's or capsule's path (el() or, for a tension band, el itself).
const sbNode = e => e && (e.g || (typeof e.el === 'function' ? e.el() : e.el)) || null;
// Light one structure on both views and its name in the panel, with the English term after it in brackets.
function sbHi(id) {
  document.querySelectorAll('.sb-lit').forEach(e => { e.classList.remove('sb-lit'); e.style.filter = ''; });
  document.querySelectorAll('#sbPanel .en').forEach(e => e.remove());
  document.querySelectorAll('#sbPanel .s.hi').forEach(e => e.classList.remove('hi'));
  SB.hi = id;
  if (!id) return;
  const s = sbS(id);
  for (const [v, key] of [[SB.V.limb, s.limb], [SB.V.close, s.close]]) {
    const e = v && key && SB_VIEW[v.model].el(v.j, key), node = sbNode(e);
    if (node) { node.classList.add('sb-lit'); node.style.filter = 'drop-shadow(0 0 5px #ffffff) drop-shadow(0 0 9px #ffe082)'; }
  }
  const row = document.querySelector(`#sbPanel .s[data-id="${id}"]`);
  if (row) { row.classList.add('hi'); row.insertAdjacentHTML('beforeend', `<span class="en"> (${s.en})</span>`); }
}
// A click (no drag) on the drawing lights the nearest structure within 26 px and its row; elsewhere — nothing lit.
function sbClick(x, y) {
  let best = null;
  for (const id of sbIds()) {
    const s = sbS(id);
    for (const [v, key] of [[SB.V.limb, s.limb], [SB.V.close, s.close]]) {
      const e = v && key && SB_VIEW[v.model].el(v.j, key); if (!e) continue;
      const pts = e.pts && e.pts.length ? e.pts : e.mid ? [e.mid] : [];
      for (const P0 of pts) { const P = sbToStage(v.j, P0), d = Math.hypot(P[0] - x, P[1] - y); if (d < 26 && (!best || d < best.d)) best = { id, d }; }
    }
  }
  sbHi(best ? best.id : null);
}
// The goniometer on the main joint (close-up), the norm band and the book's marks around it, the other joints' pills.
function sbOverlay(t) {
  const g = SB.ov; g.replaceChildren();
  const M = sbM(), main = sbDof(M.main), view = SB.V.close && SB_VIEW[SB.V.close.model].seg[M.main] ? 'close' : 'limb', v = SB.V[view], A = SB_VIEW[v.model];
  const [C, E] = A.seg[main.key](v.j), Pp = A.prox[main.key](v.j), k = sbTurn(view, main.key);
  const u = bioUnit([E[0] - C[0], E[1] - C[1]]), prox = bioUnit([Pp[0] - C[0], Pp[1] - C[1]]);
  const G0 = { C, u, prox, zero: [-prox[0], -prox[1]], th: SB.q[main.key], k, len: 130, range: [Math.max(main.range[0], -30), main.range[1]] };
  bioGon(g, G0, 1, true);   // compact: a dial would cover the ligaments inside the joint
  const R = clamp(G0.len * .9, BIO3.gonMin, BIO3.gonR) + 18, az = bioAng(G0.zero), at = (a, r) => { const q = rad(az + k * a); return [C[0] + r * Math.cos(q), C[1] + r * Math.sin(q)]; };
  let d = ''; for (let i = 0; i <= 40; i++) { const P = at(lerp(main.norm[0], main.norm[1], i / 40), R); d += `${i ? 'L' : 'M'}${bf(P[0])} ${bf(P[1])}`; }
  path(g, d, { stroke: COL.chalk, 'stroke-width': 10, 'stroke-opacity': .16, 'stroke-linecap': 'round' });
  for (const m of M.marks.filter(m => m.dof === main.key)) {
    const P = at(m.at, R - 6), Q = at(m.at, R + 10), L = at(m.at, R + 30);
    path(g, `M${bf(P[0])} ${bf(P[1])}L${bf(Q[0])} ${bf(Q[1])}`, { stroke: COL.good, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
    T(g, m.short, { x: L[0], y: L[1] + 6, size: 17, fill: COL.good, weight: 600, anchor: L[0] < C[0] - 5 ? 'end' : L[0] > C[0] + 5 ? 'start' : 'middle' });
  }
  if (SB.V.limb) for (const dd of M.dof) {
    if (dd.key === M.main) continue;   // the main joint has the goniometer
    if (!SB_VIEW[SB.V.limb.model].seg[dd.key]) continue;   // a joint the limb view does not draw (the fingers on the arm)
    const [Cj, Ej] = SB_VIEW[SB.V.limb.model].seg[dd.key](SB.V.limb.j), u2 = bioUnit([Ej[0] - Cj[0], Ej[1] - Cj[1]]);
    const pl = pill(g, `${dd.ru} ${Math.round(SB.q[dd.key])}°`, Cj[0] - u2[1] * 70 * (sbTurn('limb', dd.key)), Cj[1] + u2[0] * 70 * (sbTurn('limb', dd.key)), null, { col: SB3.move, size: 19 });
    put(pl, { o: 1 });
  }
  if (SB.mode === 'active') sbGravity(g);
  sbPulse(t);
  sbPanel();
}
// On a stop the structures that hold it pulse on both views (period 0.6 s): muscles blue, ligaments and capsule yellow.
function sbPulse(t) {
  document.querySelectorAll('.sb-stop').forEach(e => { e.classList.remove('sb-stop'); if (!e.classList.contains('sb-lit')) e.style.filter = ''; });
  const s = SB.stop; if (!s || !s.ids) return;
  const k = .5 + .5 * Math.sin(t * 2 * Math.PI / .6);
  for (const id of s.ids) {
    const st = sbS(id), col = st.kind === 'muscle' ? ANAT3.col.str : ANAT.taut;
    for (const [v, key] of [[SB.V.limb, st.limb], [SB.V.close, st.close]]) {
      const e = v && key && SB_VIEW[v.model].el(v.j, key), node = sbNode(e);
      if (node && !node.classList.contains('sb-lit')) { node.classList.add('sb-stop'); node.style.filter = `drop-shadow(0 0 ${(3 + 9 * k).toFixed(1)}px ${col})`; }
    }
  }
}

/* ---------- the active mode: gravity picks the working group ---------- */
// Gravity (down on the screen: the views turn with the body) on the part beyond the joint of `dof`, in the limb view.
// turn: +1 when it pushes the parameter up; frac: share of the largest moment; low: below SB3.low, or the part lies on its support.
function sbLoad(dof) {
  const v = SB.V.limb, A = v && SB_VIEW[v.model];
  if (sbP().gravity === false && (!A || !A.mass[dof])) return { dof, tau: 0, frac: 0, turn: 0, low: true, sup: false, plane: true };   // one view, no gravity
  if (!A || !A.mass[dof]) return null;
  const [C] = A.seg[dof](v.j), ms = A.mass[dof](v.j);
  const tau = ms.reduce((s, [P, m]) => s + (P[0] - C[0]) * m, 0), max = ms.reduce((s, [P, m]) => s + Math.hypot(P[0] - C[0], P[1] - C[1]) * m, 0) || 1;
  const S = SB.support, P = sbP(), rest = P.rest && P.rest[dof] != null && Math.abs(SB.q[dof] - P.rest[dof]) < 1;
  const sup = rest || (!!S && (A.distal[dof] || []).some(n => S.pts.includes(n) && A.pt(v.j, n)[1] > S.y - 3)), plane = P.gravity === false;
  const turn = Math.sign(tau) * sbTurn('limb', dof);
  // gravity pressing the joint into the end of its range (a straight elbow, the bone stop): the stop holds it, not the muscles
  const end = sbM().stops.some(st0 => st0.dof === dof && ((st0.min != null && turn < 0 && SB.q[dof] <= st0.min + .5) || (st0.max != null && turn > 0 && SB.q[dof] >= st0.max - .5)));
  const frac = sup || plane || end ? 0 : Math.abs(tau) / max;
  return { dof, tau, frac, turn, low: sup || plane || end || frac < SB3.low, sup: sup || end, plane };
}
// Contraction of a working group from its own length change (the live anatomy's rule), kept per group between calls.
// The last motion of a parameter if it was less than SB3.still seconds ago: { t, dir }, else null.
const sbMoved = (k, t) => { const m = (SB.mv || {})[k]; return m && t - m.t < SB3.still ? m : null; };
// The contraction of a working group from the motion of its joint: moving its way — shortening (con), the other way —
// lengthening (ecc), still for SB3.still seconds — holding (iso). (A two-joint muscle also changes length when the other
// joint moves; its colour follows its own length, the panel line follows the joint.)
function sbSense(group, ids, t) {
  const g = sbM().groups.find(x => x.id === group), m = sbMoved(g.dof, t);
  return m ? (m.dir === g.dir ? 'con' : 'ecc') : 'iso';
}
function sbWork() {
  const t = (performance.now() - SB.t0) / 1000, M = sbM(), work = [], loads = {};
  for (const d of M.dof) {
    const ld = sbLoad(d.key); loads[d.key] = ld;
    if (ld && ld.plane) {   // no gravity in this plane: the group that moves the part works, only while it moves
      const m = sbMoved(d.key, t), gr = m && M.groups.find(g => g.dof === d.key && g.dir === m.dir);
      M.groups.filter(g => g.dof === d.key && g !== gr).forEach(g => { delete SB.sense[g.id]; });
      if (gr) work.push({ group: gr.id, ids: gr.ids, mode: sbSense(gr.id, gr.ids, t) });
      continue;
    }
    if (!ld || ld.low) { M.groups.filter(g => g.dof === d.key).forEach(g => { delete SB.sense[g.id]; }); continue; }
    const gr = M.groups.find(g => g.dof === d.key && g.dir === -ld.turn);   // the group that holds the part against gravity
    M.groups.filter(g => g.dof === d.key && g !== gr).forEach(g => { delete SB.sense[g.id]; });
    if (gr) work.push({ group: gr.id, ids: gr.ids, mode: sbSense(gr.id, gr.ids, t) });
  }
  return { work, loads, load: loads[SB.sel] || loads[M.main] || null };
}
// Levels: the working groups' muscles at 1, the rest at 0 (the live anatomy colours them by mode, or by stretch).
function sbActivate(work) {
  const on = new Set(work.flatMap(w => w.ids));
  for (const id of sbIds()) {
    const s = sbS(id); if (s.kind !== 'muscle') continue;
    for (const [v, key] of [[SB.V.limb, s.limb], [SB.V.close, s.close]]) {
      const e = v && key && SB_VIEW[v.model].el(v.j, key), lv = on.has(id) ? 1 : 0;
      if (e && e.level !== lv) e.act(lv);
    }
  }
}
// The weight of the part beyond the selected joint: one arrow from its centre of mass, its length by its share of body mass.
function sbGravity(g) {
  const v = SB.V.limb, A = v && SB_VIEW[v.model], d = SB.sel; if (!A || !A.mass[d] || sbP().gravity === false) return;   // horizontal plane: no arrow
  const ms = A.mass[d](v.j), m = ms.reduce((s, [, w]) => s + w, 0), P = ms.reduce((s, [Q, w]) => [s[0] + Q[0] * w / m, s[1] + Q[1] * w / m], [0, 0]);
  bioArrow(g, 'grav', P, [0, 1], 60 + 500 * m, SB3.grav, 5, .85);
}
function sbSetMode(mode) { SB.mode = mode; SB.sense = {}; if (mode === 'passive') sbActivate([]); SB.sig = null; sbSave(); sbBar(); }

/* ---------- the bar, the tasks, the help ---------- */
function sbBar() {
  const bar = document.getElementById('bar');
  let box = bar.querySelector('.sb'); if (!box) { box = Object.assign(document.createElement('div'), { className: 'sb' }); bar.append(box); }
  const M = sbM(), chip = (attrs, label, on = false, dis = false) => `<button class="chip" ${attrs} aria-pressed="${on}"${dis ? ' disabled title="скоро"' : ''}>${label}</button>`;
  const back = SB.from ? `<a id="sbBack" href="../ch${String(SB.from.n).padStart(3, '0')}/?beat=${SB.from.beat}&t=${SB.from.t}">← к уроку ${SB.from.n}</a><span class="sb-sep"></span>`
    : '<a id="sbBack" href="../#contents">← к оглавлению</a><span class="sb-sep"></span>';
  box.innerHTML = back +
    `<select class="chip" id="sbJoint" aria-label="Сустав">${SB3.joints.map(([k, ru]) => `<option value="${k}"${k === SB.joint ? ' selected' : ''}${SAND[k] ? '' : ' disabled'}>${ru}${SAND[k] ? '' : ' (скоро)'}</option>`).join('')}</select>` + '<span class="sb-sep"></span>' +
    (SAND[SB.joint].motions.length > 1 ? SAND[SB.joint].motions.map(m => chip(`data-m="${m.id}" title="${m.title}"`, m.chip || m.title, m.id === SB.motion)).join('') + '<span class="sb-sep"></span>' : '') +
    Object.keys(M.positions).map(p => chip(`data-pos="${p}"`, SB3.pos[p], p === SB.pos)).join('') + '<span class="sb-sep"></span>' +
    chip('data-mode', SB.mode === 'active' ? 'активно' : 'пассивно', SB.mode === 'active') + chip('data-tasks', 'задания') + chip('data-help', '?');
  box.querySelector('#sbJoint').onchange = e => { const j = e.target.value, m = SAND[j].motions[0]; sbCloseAll(); sbOpen(j, m.id, Object.keys(m.positions)[0]); sbBar(); };
  box.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { const m = SAND[SB.joint].motions.find(x => x.id === b.dataset.m); sbOpen(SB.joint, m.id, Object.keys(m.positions)[0]); sbBar(); }; });
  box.querySelectorAll('[data-pos]').forEach(b => { b.onclick = () => { sbOpen(SB.joint, SB.motion, b.dataset.pos, null); sbBar(); }; });
  box.querySelector('[data-mode]').onclick = () => sbSetMode(SB.mode === 'active' ? 'passive' : 'active');
  box.querySelector('[data-tasks]').onclick = () => sbTaskList();
  box.querySelector('[data-help]').onclick = () => sbHelp();
}
function sbDone() { try { return JSON.parse(localStorage.getItem(SB3.done) || '[]'); } catch { return []; } }
function sbMarkDone(id) { const d = new Set(sbDone()); d.add(SB.joint + ':' + id); try { localStorage.setItem(SB3.done, JSON.stringify([...d])); } catch {} }
const sbIsDone = id => sbDone().includes(SB.joint + ':' + id);
// A task's condition: every field it has holds now.
function sbTaskOk(w, st) {
  if (w.motion && w.motion !== SB.motion) return false;
  if (w.pos && w.pos !== SB.pos) return false;
  if (w.mode && w.mode !== SB.mode) return false;
  for (const k in w.q || {}) { const [a, b] = w.q[k]; if (!(st.q[k] >= a && st.q[k] <= b)) return false; }
  if (w.stop && !(st.stop && st.stop.ids && st.stop.ids.includes(w.stop))) return false;
  if (w.str && !w.str.every(id => st.str.includes(id))) return false;
  if (w.taut && !w.taut.every(id => st.taut.includes(id))) return false;
  for (const g in w.work || {}) if (!st.work.some(x => x.group === g && x.mode === w.work[g])) return false;
  return true;
}
function sbTaskList() {
  sbCloseAll();
  const L = Object.assign(document.createElement('div'), { id: 'sbList' });
  L.innerHTML = `<h3>задания: ${SAND[SB.joint].title}</h3>` + SAND[SB.joint].tasks.map(t => `<button data-id="${t.id}" class="${sbIsDone(t.id) ? 'done' : ''}">${t.text}</button>`).join('');
  document.getElementById('ui').append(L);
  L.querySelectorAll('button').forEach(b => { b.onclick = () => { L.remove(); sbTaskOpen(b.dataset.id); }; });
  const first = L.querySelector('button'); if (first) first.focus();
}
function sbTaskOpen(id) {
  const t = SAND[SB.joint].tasks.find(x => x.id === id); SB.task = { t, held: 0, ok: false };
  const el = Object.assign(document.createElement('div'), { id: 'sbTask' });
  el.innerHTML = `<div>${t.text}</div><div class="fb"></div><div class="acts"><button class="btn quiet" data-hint>подсказка</button><button class="btn quiet" data-show>показать</button><button class="btn quiet" data-close>закрыть</button></div>`;
  document.getElementById('ui').append(el);
  sbPlace();
  el.querySelector('[data-hint]').onclick = () => { el.querySelector('.fb').textContent = t.hint; sbPlace(); };
  el.querySelector('[data-show]').onclick = () => sbShow(t);
  el.querySelector('[data-close]').onclick = () => sbCloseAll();
}
// The panel goes under the task card.
function sbPlace() { const el = document.getElementById('sbTask'), p = document.getElementById('sbPanel'); if (p) p.style.top = el ? (96 + el.offsetHeight + 12) + 'px' : ''; }
// Held for SB3.hold seconds: right, the explanation with its page, a tick in the list.
function sbTaskTick(dt) {
  const k = SB.task; if (!k || k.ok) return;
  k.held = sbTaskOk(k.t.when, sbState()) ? k.held + dt : 0;
  if (k.held < (k.t.hold ?? SB3.hold)) return;   // a contraction is held while moving: such tasks ask less
  k.ok = true; sbMarkDone(k.t.id);
  const el = document.getElementById('sbTask'); el.classList.add('ok');
  el.querySelector('.fb').textContent = `Верно. ${k.t.why} (с. ${k.t.page})`;
  sbPlace();
}
// Show the answer: the position and mode, then each leg of the pose eased over SB3.show seconds (the last over show.dur: a task
// about a contraction needs a slow motion), through the stops.
function sbShow(t) {
  const s = t.show, mode = s.mode || 'passive', motion = s.motion || SB.motion;
  if (motion !== SB.motion || s.pos !== SB.pos || mode !== SB.mode) { SB.mode = mode; sbOpen(SB.joint, motion, s.pos, null); sbBar(); }
  const legs = (s.path || []).concat([s.q]);
  let i = 0;
  const leg = () => {
    if (i >= legs.length) return;
    const from = { ...SB.q }, to = legs[i++], t0 = performance.now();
    const step = () => {
      const k = io(clamp((performance.now() - t0) / 1000 / (i === legs.length ? s.dur || SB3.show : SB3.show), 0, 1));
      for (const d in to) sbGo(d, lerp(from[d], to[d], k));
      if (k < 1) requestAnimationFrame(step); else leg();
    };
    step();
  };
  leg();
}
// The same answer at once (sandbox.py check): no easing, the same stops.
function sbShowNow(t) {
  const s = t.show; sbOpen(SB.joint, s.motion || SB.motion, s.pos, null, s.mode || 'passive');
  for (const q of (s.path || []).concat([s.q])) for (const d in q) sbMove(d, q[d]);
}
function sbCloseAll() { ['sbList', 'sbTask', 'sbHelp'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); }); SB.task = null; sbPlace(); }
function sbHelp() {
  sbCloseAll();
  const h = Object.assign(document.createElement('div'), { id: 'sbHelp' });
  h.innerHTML = '<h2 style="margin-top:0">Как пользоваться песочницей</h2><dl>' +
    '<dt>мышью</dt><dd>тянуть кольцо или саму кость; щелчок по мышце или связке — найти её в списке</dd>' +
    '<dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>выбранный сустав на 1°, с <kbd>Shift</kbd> — на 5°</dd>' +
    '<dt><kbd>Tab</kbd></dt><dd>следующая ручка, потом кнопки внизу</dd><dt><kbd>0</kbd></dt><dd>исходная поза</dd>' +
    '<dt>список</dt><dd>навести на название — подсветить на рисунке и показать английский термин</dd>' +
    '<dt><kbd>Esc</kbd></dt><dd>закрыть</dd></dl>';
  document.getElementById('ui').append(h);
}

/* ---------- the frame loop and the start ---------- */
function sbFrame() {
  const now = performance.now(), t = (now - SB.t0) / 1000, dt = SB.last ? (now - SB.last) / 1000 : 0;
  SB.last = now;
  // when and which way each parameter last moved (the active mode reads the contraction from it)
  SB.mv = SB.mv || {};
  for (const k in SB.q) { const d = SB.q[k] - ((SB.vq || {})[k] ?? SB.q[k]); if (Math.abs(d) > 1e-6) SB.mv[k] = { t, dir: Math.sign(d) }; }
  SB.vq = { ...SB.q };
  if (SB.mode === 'active') sbActivate(sbWork().work);
  anatTick(t);
  sbHandles();
  sbOverlay(t);
  sbTaskTick(dt);
  requestAnimationFrame(sbFrame);
}
// Start: the address, then the stored choice, then the knee.
function sbStart() {
  const qs = new URLSearchParams(location.search), st = sbRestore();
  const joint = SAND[qs.get('j')] ? qs.get('j') : SAND[st.j] ? st.j : 'knee';
  const ms = SAND[joint].motions, motion = ms.find(m => m.id === qs.get('m')) ? qs.get('m') : ms.find(m => m.id === st.m) ? st.m : ms[0].id;
  const P = ms.find(m => m.id === motion).positions, pos = P[qs.get('pos')] ? qs.get('pos') : P[st.pos] ? st.pos : Object.keys(P)[0];
  const mode = (qs.get('mode') || st.mode) === 'active' ? 'active' : 'passive', q = {};
  (qs.get('q') || '').split(',').forEach(kv => { const [k, v] = kv.split(':'); if (k && v !== undefined && isFinite(+v)) q[k] = +v; });
  if (qs.get('from')) SB.from = { n: +qs.get('from'), beat: +qs.get('beat') || 0, t: +qs.get('t') || 0 };
  sbOpen(joint, motion, pos, Object.keys(q).length ? q : null, mode);
  sbBar();
  sbPointer();
  addEventListener('keydown', sbKey, true);
  requestAnimationFrame(sbFrame);
  window.SB_READY = true;
}
sbStart();
