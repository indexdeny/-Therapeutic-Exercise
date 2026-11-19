'use strict';
// The glossary: the book's terms with a short definition in our own words, found by Russian, English or a synonym, and a
// panel in which the lesson itself plays the moment where the term is explained (lib/moment.js).
// Data: window.GLOSSARY from glossary/data.js, made by tools/therapeutic-exercise/review.py build.
const GL3 = {
  abc: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ',
  note: 'пояснение: не из книги',
  progress: 'animebook:progress:' + new URL('../', location.href).pathname,   // engine.js: { last, done: [lessons] }
  review: 'animebook:review:' + new URL('../', location.href).pathname,       // review.js: { marked: [chapters], … }
};
// q: search text; ch: the chosen chapters; done: passed terms only; t, k: the open term and its moment number;
// pl: the panel's moment player; terms: all terms in alphabetical order.
const GL = { q: '', ch: new Set(), done: false, t: null, k: 0, pl: null, terms: [] };
const $g = id => document.getElementById(id);
const glNorm = s => s.toLowerCase().replace(/ё/g, 'е');
const glEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const glPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
const glLetter = t => glNorm(t.ru).charAt(0).toUpperCase();
// Lessons passed in the lessons, plus the lessons of the chapters marked passed on the review page.
function glPassed() {
  const s = new Set();
  try { (JSON.parse(localStorage.getItem(GL3.progress) || '{}').done || []).forEach(n => s.add(n)); } catch {}
  try {
    const marked = JSON.parse(localStorage.getItem(GL3.review) || '{}').marked || [];
    for (const u of GLOSSARY.units) if (marked.includes(u.n)) u.lessons.forEach(n => s.add(n));
  } catch {}
  return s;
}

// ---- filters and the list
function glMatch(t, passed) {
  const q = glNorm(GL.q.trim());
  if (q && ![t.ru, t.en, ...(t.alt || [])].some(s => glNorm(s).includes(q))) return false;
  return (!GL.ch.size || GL.ch.has(t.unit)) && (!GL.done || passed.has(t.n));
}
function glFilters() {
  const us = GLOSSARY.units.filter(u => GL.terms.some(t => t.unit === u.n));
  $g('filters').innerHTML = '<input id="glQ" class="search" type="search" placeholder="Найти: по-русски или по-английски" aria-label="Поиск термина">'
    + '<details class="f" id="f-ch"><summary></summary><div class="menu">' + us.map(u => `<label><input type="checkbox" value="${u.n}"${GL.ch.has(u.n) ? ' checked' : ''}> `
      + `${u.n}. ${glEsc(u.title)} <small>${GL.terms.filter(t => t.unit === u.n).length}</small></label>`).join('') + '</div></details>'
    + '<button class="tog" id="glDone" type="button" aria-pressed="false">Только пройденные</button>'
    + '<button class="reset" id="glReset" type="button">сбросить</button><span class="count" id="glCount" aria-live="polite"></span>';
  const d = $g('f-ch');
  $g('glQ').value = GL.q;
  $g('glQ').addEventListener('input', () => { GL.q = $g('glQ').value; glApply(); });
  d.addEventListener('change', ev => { const n = +ev.target.value; if (ev.target.checked) GL.ch.add(n); else GL.ch.delete(n); glApply(); });
  $g('glDone').addEventListener('click', () => { GL.done = !GL.done; glApply(); });
  $g('glReset').addEventListener('click', () => {
    GL.q = ''; $g('glQ').value = ''; GL.ch.clear(); GL.done = false;
    d.querySelectorAll('input').forEach(i => { i.checked = false; });
    glApply();
  });
  document.addEventListener('click', ev => { if (!ev.target.closest('details.f')) d.open = false; });
}
function glApply() {
  const passed = glPassed(), list = GL.terms.filter(t => glMatch(t, passed)), d = $g('f-ch');
  d.querySelector('summary').innerHTML = `Глава: <b>${GL.ch.size === 0 ? 'все' : GL.ch.size === 1 ? [...GL.ch][0] : GL.ch.size + ' выбрано'}</b>`;
  d.classList.toggle('on', GL.ch.size > 0);
  $g('glDone').setAttribute('aria-pressed', String(GL.done));
  $g('glReset').hidden = !GL.q && !GL.ch.size && !GL.done;
  $g('glCount').textContent = `${list.length} ${glPlural(list.length, 'термин', 'термина', 'терминов')}`;
  const letters = new Set(list.map(glLetter));
  $g('glAbc').innerHTML = [...GL3.abc].map(L => `<button type="button" data-l="${L}"${letters.has(L) ? '' : ' disabled'}>${L}</button>`).join('');
  let last = '';
  $g('glList').innerHTML = list.length ? list.map(t => {
    const L = glLetter(t), head = L !== last ? `<h3 class="L" id="L-${L}">${L}</h3>` : '';
    last = L;
    return head + `<button class="row${GL.t === t ? ' sel' : ''}" type="button" data-id="${t.id}"><span class="t">${glEsc(t.ru)}<small>${glEsc(t.en)}</small></span>`
      + `<span class="d">${glEsc(t.def)}</span><span class="n">урок ${t.n}</span></button>`;
  }).join('') : '<p class="empty">Нет терминов — ослабьте фильтры.</p>';
  glWrite();
}

// ---- the address keeps the search, the filters and the open term
function glWrite() {
  const p = new URLSearchParams();
  if (GL.q) p.set('q', GL.q);
  if (GL.ch.size) p.set('ch', [...GL.ch].sort((a, b) => a - b).join(','));
  if (GL.done) p.set('done', '1');
  if (GL.t) p.set('t', GL.t.id);
  if (GL.t && GL.k) p.set('mo', GL.k);
  const s = p.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
}
function glRead() {
  const p = new URLSearchParams(location.search);
  GL.q = p.get('q') || '';
  GL.ch = new Set((p.get('ch') || '').split(',').map(Number).filter(n => GLOSSARY.units.some(u => u.n === n)));
  GL.done = p.get('done') === '1';
  const t = GL.terms.find(x => x.id === p.get('t'));
  return t ? { t, k: Math.min(Math.max(0, +p.get('mo') || 0), t.moments.length - 1) } : null;
}

// ---- the panel
function glOpen(id, k = 0, play = true) {
  const t = GL.t = GL.terms.find(x => x.id === id), mo = t.moments[k];
  GL.k = k;
  document.querySelectorAll('#glList .row').forEach(r => r.classList.toggle('sel', r.dataset.id === id));
  document.body.classList.add('pv-open');
  $g('pvEmpty').hidden = true;
  $g('pvBody').hidden = false;
  $g('pvInfo').innerHTML = glInfo(t, k);
  GL.pl.load(mo, play);
  glWrite();
}
function glInfo(t, k) {
  const mo = t.moments[k], name = id => (GL.terms.find(x => x.id === id) || { ru: id }).ru;
  return `<h2>${glEsc(t.ru)}</h2><div class="en">${glEsc(t.en)}</div><p class="def">${glEsc(t.def)}</p>`
    + (t.note ? `<p class="note">${glEsc(t.note)} <span class="pill">${GL3.note}</span></p>` : '')
    + `<ol class="mom">${t.moments.map((m, j) => `<li><button type="button" data-k="${j}"${j === k ? ' aria-current="true"' : ''}><b>Урок ${m.n}</b><span>${glEsc(m.lesson)} · ${glEsc(m.step)}</span></button></li>`).join('')}</ol>`
    + (t.see && t.see.length ? `<p class="see">См. также: ${t.see.map(id => `<button type="button" data-see="${id}">${glEsc(name(id))}</button>`).join(', ')}</p>` : '')
    + `<div class="btns"><a class="btn go" id="pvLesson" href="${moLesson(mo.n)}?beat=${mo.i}&t=${mo.t0}">Открыть урок ${mo.n}</a>`
    + '<button class="btn" id="pvMore" type="button">Дальше по уроку ▸</button></div>'
    + `<p class="page">Книга: стр. ${t.page}</p>`;
}
function glClose() {
  GL.pl.pause();
  GL.t = GL.pl.mo = null;
  GL.k = 0;
  document.body.classList.remove('pv-open');
  document.querySelectorAll('#glList .row.sel').forEach(r => r.classList.remove('sel'));
  $g('pvEmpty').hidden = false;
  $g('pvBody').hidden = true;
  glWrite();
}

function glStart() {
  GL.terms = GLOSSARY.terms.slice().sort((a, b) => glNorm(a.ru).localeCompare(glNorm(b.ru), 'ru'));
  GL.pl = momentPlayer({ frame: $g('pvFrame'), sound: $g('pvSound'), play: $g('pvPlay'), now: $g('pvNow'), bar: $g('pvBar'), dur: $g('pvDur') });
  const st = glRead();
  glFilters();
  glApply();
  $g('glList').addEventListener('click', ev => { const r = ev.target.closest('.row'); if (r) glOpen(r.dataset.id); });
  $g('glAbc').addEventListener('click', ev => { const b = ev.target.closest('button[data-l]'); if (b) $g('L-' + b.dataset.l)?.scrollIntoView({ block: 'start' }); });
  $g('pvInfo').addEventListener('click', ev => {
    const m = ev.target.closest('.mom button'), s = ev.target.closest('[data-see]');
    if (m) return glOpen(GL.t.id, +m.dataset.k);
    if (s) return glOpen(s.dataset.see);
    if (ev.target.closest('#pvMore')) GL.pl.more();
  });
  $g('pvClose').addEventListener('click', glClose);
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    const o = document.querySelector('details.f[open]');
    if (o) { o.open = false; o.querySelector('summary').focus(); } else if (GL.t) glClose();
  });
  if (st) glOpen(st.t.id, st.k, false);
  window.GL_READY = true;
}
glStart();
