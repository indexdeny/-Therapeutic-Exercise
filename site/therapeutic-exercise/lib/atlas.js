'use strict';
// The exercise atlas: search and five filters over the book's exercises, cards, and a preview in which the lesson itself
// plays the exercise's moment (lib/moment.js). Data: window.ATLAS from atlas/data.js, made by tools/therapeutic-exercise/atlas.py build.
const AT3 = {
  fields: [['joint', 'Сустав', 'любой'], ['goal', 'Цель', 'любая'], ['phase', 'Фаза', 'любая'], ['pos', 'Положение', 'любое'], ['gear', 'Снаряд', 'любой']],
  noPhase: 'фаза не указана',
  note: 'пояснение: не из книги',
};
// q: search text; f: field -> Set of keys; ex, k: the open exercise and its moment number; pl: the preview's moment player.
const AT = { q: '', f: {}, ex: null, k: 0, pl: null };
// The player's fields read through AT as well, as before the player moved to lib/moment.js.
for (const k of ['mo', 'n', 'w', 'P', 'stop', 'ended']) Object.defineProperty(AT, k, { get: () => AT.pl[k], set: v => { AT.pl[k] = v; } });
const $a = id => document.getElementById(id);
const atVoc = (f, key) => ATLAS.vocab[f].find(v => v[0] === key) || [key, key];
const atFull = (f, key) => atVoc(f, key)[1];
const atShort = (f, key) => { const v = atVoc(f, key); return v[2] || v[1]; };
const atNorm = s => s.toLowerCase().replace(/ё/g, 'е');
const atEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const atPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };

// ---- filters and cards
function atMatch(e) {
  const q = atNorm(AT.q.trim());
  if (q && !atNorm(e.ru).includes(q) && !atNorm(e.en).includes(q)) return false;
  return AT3.fields.every(([f]) => { const s = AT.f[f]; return !s.size || (f === 'phase' && !e.phase.length) || e[f].some(k => s.has(k)); });
}
// Only the keys some exercise has; each with its number of exercises.
function atFilters() {
  const used = f => ATLAS.vocab[f].filter(([k]) => ATLAS.ex.some(e => e[f].includes(k)));
  $a('filters').innerHTML = '<input id="atQ" class="search" type="search" placeholder="Поиск: по-русски или по-английски" aria-label="Поиск по названию">'
    + AT3.fields.map(([f]) => `<details class="f" id="f-${f}"><summary></summary><div class="menu">${used(f).map(([k, ru]) =>
      `<label><input type="checkbox" value="${k}"${AT.f[f].has(k) ? ' checked' : ''}> ${atEsc(ru)} <small>${ATLAS.ex.filter(e => e[f].includes(k)).length}</small></label>`).join('')}</div></details>`).join('')
    + '<button class="reset" id="atReset" type="button">сбросить</button><span class="count" id="atCount" aria-live="polite"></span>';
  $a('atQ').value = AT.q;
  $a('atQ').addEventListener('input', () => { AT.q = $a('atQ').value; atApply(); });
  for (const [f] of AT3.fields) {
    const d = $a('f-' + f);
    d.addEventListener('change', ev => { ev.target.checked ? AT.f[f].add(ev.target.value) : AT.f[f].delete(ev.target.value); atApply(); });
    d.addEventListener('toggle', () => { if (d.open) document.querySelectorAll('details.f[open]').forEach(o => { if (o !== d) o.open = false; }); });
  }
  $a('atReset').addEventListener('click', () => {
    AT.q = ''; $a('atQ').value = '';
    for (const [f] of AT3.fields) AT.f[f].clear();
    document.querySelectorAll('details.f input').forEach(i => { i.checked = false; });
    atApply();
  });
  document.addEventListener('click', ev => { if (!ev.target.closest('details.f')) document.querySelectorAll('details.f[open]').forEach(o => { o.open = false; }); });
}
// With joints chosen, exercises whose main joint is one of them come first; otherwise the atlas order stays.
function atApply() {
  const main = AT.f.joint, list = ATLAS.ex.filter(atMatch).sort((a, b) => main.has(b.joint[0]) - main.has(a.joint[0]));
  for (const [f, name, any] of AT3.fields) {
    const s = AT.f[f], d = $a('f-' + f);
    d.querySelector('summary').innerHTML = `${name}: <b>${s.size === 0 ? any : s.size === 1 ? atEsc(atFull(f, [...s][0])) : s.size + ' выбрано'}</b>`;
    d.classList.toggle('on', s.size > 0);
  }
  $a('atReset').hidden = !AT.q && AT3.fields.every(([f]) => !AT.f[f].size);
  $a('atCount').textContent = `${list.length} ${atPlural(list.length, 'упражнение', 'упражнения', 'упражнений')}`;
  $a('grid').innerHTML = list.length ? list.map(atCard).join('') : '<p class="empty">Нет упражнений — ослабьте фильтры.</p>';
  atWrite();
}
function atCard(e) {
  const n = e.moments.length;
  const chips = e.goal.map(k => `<span class="chip g">${atEsc(atShort('goal', k))}</span>`)
    .concat(e.phase.length ? e.phase.map(k => `<span class="chip p">${atEsc(atShort('phase', k))}</span>`) : [`<span class="chip p none">${AT3.noPhase}</span>`]);
  return `<button class="card${AT.ex === e ? ' sel' : ''}" type="button" data-id="${e.id}"><img src="${e.img}" alt="" loading="lazy" width="480" height="480">`
    + `<span class="b"><span class="nm">${atEsc(e.ru)}</span><span class="en">[${atEsc(e.en)}]</span><span class="chips">${chips.join('')}</span>`
    + `<span class="key">${e.key.map(atEsc).join(' · ')}</span>`
    + `<span class="foot"><span>стр. ${e.page}</span><span>${n} ${atPlural(n, 'момент', 'момента', 'моментов')}</span></span></span></button>`;
}

// ---- the address keeps the search, the filters and the open exercise
function atWrite() {
  const p = new URLSearchParams();
  if (AT.q) p.set('q', AT.q);
  for (const [f] of AT3.fields) if (AT.f[f].size) p.set(f, [...AT.f[f]].join(','));
  if (AT.ex) p.set('ex', AT.ex.id);
  if (AT.ex && AT.k) p.set('mo', AT.k);
  const s = p.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
}
function atRead() {
  const p = new URLSearchParams(location.search);
  AT.q = p.get('q') || '';
  for (const [f] of AT3.fields) AT.f[f] = new Set((p.get(f) || '').split(',').filter(k => ATLAS.vocab[f].some(v => v[0] === k)));
  const ex = ATLAS.ex.find(e => e.id === p.get('ex'));
  return ex ? { ex, k: Math.min(Math.max(0, +p.get('mo') || 0), ex.moments.length - 1) } : null;
}

// ---- the preview
function atOpen(id, k, play = true) {
  const e = AT.ex = ATLAS.ex.find(x => x.id === id), mo = e.moments[k];
  AT.k = k;
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  document.body.classList.add('pv-open');
  $a('pvEmpty').hidden = true;
  $a('pvBody').hidden = false;
  $a('pvInfo').innerHTML = atInfo(e, k);
  AT.pl.load(mo, play);
  atWrite();
}
function atInfo(e, k) {
  const mo = e.moments[k];
  const chips = AT3.fields.flatMap(([f]) => e[f].map(key => `<span class="chip${f === 'goal' ? ' g' : f === 'phase' ? ' p' : ''}">${atEsc(atFull(f, key))}</span>`));
  if (!e.phase.length) chips.push(`<span class="chip p none">${AT3.noPhase}</span>`);
  return `<h2>${atEsc(e.ru)}</h2><div class="en">[${atEsc(e.en)}]</div><div class="chips">${chips.join('')}</div>`
    + `<p class="key">${e.key.map(atEsc).join(' · ')}</p>`
    + (e.warn ? `<p class="warn">осторожно: ${atEsc(e.warn)}</p>` : '')
    + (e.note ? `<p class="note">${atEsc(e.note)} <span class="pill">${AT3.note}</span></p>` : '')
    + `<ol class="mom">${e.moments.map((m, j) => `<li><button type="button" data-k="${j}"${j === k ? ' aria-current="true"' : ''}><b>Урок ${m.n}</b><span>${atEsc(m.lesson)} · ${atEsc(m.step)}</span></button></li>`).join('')}</ol>`
    + `<div class="btns"><a class="btn go" id="pvLesson" href="${moLesson(mo.n)}?beat=${mo.i}&t=${mo.t0}">Открыть урок ${mo.n}</a>`
    + (e.sand ? `<a class="btn" id="pvSand" href="../sandbox/?${atEsc(e.sand)}">В песочнице</a>` : '')
    + '<button class="btn" id="pvMore" type="button">Дальше по уроку ▸</button></div>'
    + `<p class="page">Книга: стр. ${e.page}</p>`;
}
function atClose() {
  AT.pl.pause();
  AT.ex = AT.pl.mo = null;
  AT.k = 0;
  document.body.classList.remove('pv-open');
  document.querySelectorAll('.card.sel').forEach(c => c.classList.remove('sel'));
  $a('pvEmpty').hidden = false;
  $a('pvBody').hidden = true;
  atWrite();
}

function atStart() {
  AT.pl = momentPlayer({ frame: $a('pvFrame'), sound: $a('pvSound'), play: $a('pvPlay'), now: $a('pvNow'), bar: $a('pvBar'), dur: $a('pvDur') });
  const st = atRead();
  atFilters();
  atApply();
  $a('grid').addEventListener('click', ev => { const c = ev.target.closest('.card'); if (c) atOpen(c.dataset.id, 0); });
  $a('pvInfo').addEventListener('click', ev => {
    const m = ev.target.closest('.mom button');
    if (m) return atOpen(AT.ex.id, +m.dataset.k);
    if (ev.target.closest('#pvMore')) AT.pl.more();
  });
  $a('pvClose').addEventListener('click', atClose);
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    const o = document.querySelector('details.f[open]');
    if (o) { o.open = false; o.querySelector('summary').focus(); } else if (AT.ex) atClose();
  });
  if (st) atOpen(st.ex.id, st.k, false);
  window.AT_READY = true;
}
atStart();
