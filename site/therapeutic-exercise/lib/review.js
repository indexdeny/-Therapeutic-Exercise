'use strict';
// Review: the lessons' own questions and the glossary's terms as cards that come back after 1, 3, 7, 14, 30 and 60 days.
// New cards come from passed lessons (the lessons' progress plus the chapters marked here), at most 20 a day; a chapter can
// also be run whole without touching the schedule. Data: window.REVIEW from review/data.js (tools/therapeutic-exercise/review.py).
const RV3 = {
  days: [1, 3, 7, 14, 30, 60],   // the interval of steps 1–6
  learned: 3,                    // from this step (7 days) a card counts as learned
  perDay: 20,                    // new cards a day
  store: 'animebook:review:' + new URL('../', location.href).pathname,
  progress: 'animebook:progress:' + new URL('../', location.href).pathname,   // engine.js: { last, done: [lessons] }
  note: 'пояснение: не из книги',
};
// st: the saved state { v: 1, cards: { id: { s, due, seen } }, marked: [chapters], newDay: { date, n } }; saved: storage works;
// cards, byId: all cards in book order; queue, k: the session's cards and the current one; mode: 'today' or 'unit' (a chapter
// run of chapter `unit`); right: first-try right answers; done: the current card is answered; lastIn: days until it comes back;
// ctl: the current question's controls; pl: the term card's moment player.
const RV = { st: null, saved: true, cards: [], byId: {}, queue: [], k: 0, mode: 'today', unit: 0, right: 0, done: false, lastIn: 1, ctl: null, pl: null };
const $r = id => document.getElementById(id);
const rvEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rvText = parts => [].concat(parts ?? []).filter(p => typeof p === 'string').map(rvEsc).join('');
const rvPlural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
const rvCount = (n, one, few, many) => `${n} ${rvPlural(n, one, few, many)}`;

// ---- days: local dates as YYYY-MM-DD
const rvDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rvToday = () => rvDay(new Date());
const rvAdd = (day, k) => { const [y, m, d] = day.split('-').map(Number); return rvDay(new Date(y, m - 1, d + k)); };
const rvIn = k => k === 1 ? 'завтра' : `через ${rvCount(k, 'день', 'дня', 'дней')}`;
const rvDate = day => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); };

// ---- the saved state
const rvBlank = () => ({ v: 1, cards: {}, marked: [], newDay: { date: '', n: 0 } });
// A state from storage or a file if it has the right shape, else null.
function rvValid(s) {
  const day = v => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
  const ok = !!s && s.v === 1 && !!s.cards && typeof s.cards === 'object' && !Array.isArray(s.cards)
    && Object.values(s.cards).every(c => c && Number.isInteger(c.s) && c.s >= 1 && c.s <= 6 && day(c.due) && Number.isInteger(c.seen) && c.seen >= 1)
    && Array.isArray(s.marked) && s.marked.every(Number.isInteger)
    && !!s.newDay && (s.newDay.date === '' || day(s.newDay.date)) && Number.isInteger(s.newDay.n);
  return ok ? s : null;
}
function rvRead() {
  let raw = null;
  try { raw = localStorage.getItem(RV3.store); } catch { RV.saved = false; }
  try { return rvValid(JSON.parse(raw)) || rvBlank(); } catch { return rvBlank(); }
}
function rvSave() {
  try { localStorage.setItem(RV3.store, JSON.stringify(RV.st)); RV.saved = true; } catch { RV.saved = false; }
  $r('rvNoStore').hidden = RV.saved;
}
// Lessons passed in the lessons themselves (engine.js records a lesson at its final card).
function rvDone() {
  try {
    const p = JSON.parse(localStorage.getItem(RV3.progress) || '{}');
    return new Set(Array.isArray(p.done) ? p.done.filter(Number.isInteger) : []);
  } catch { return new Set(); }
}
// ... plus the lessons of the chapters marked passed here.
function rvPassed() {
  const s = rvDone();
  for (const u of REVIEW.units) if (RV.st.marked.includes(u.n)) u.lessons.forEach(n => s.add(n));
  return s;
}

// ---- cards and the day's queue
function rvCards() {
  const by = {};
  for (const q of REVIEW.questions) (by[q.n] ||= []).push({ id: 'q:' + q.id, type: 'q', n: q.n, q });
  for (const t of REVIEW.terms) (by[t.n] ||= []).push({ id: 't:' + t.id, type: 't', n: t.n, t });
  RV.cards = Object.keys(by).map(Number).sort((a, b) => a - b).flatMap(n => by[n]);   // a lesson's questions, then its terms
  for (const c of RV.cards) { c.unit = REVIEW.lessons[c.n].unit; RV.byId[c.id] = c; }
}
const rvState = c => RV.st.cards[c.id];
function rvDue(day = rvToday()) {
  return RV.cards.filter(c => rvState(c) && rvState(c).due <= day).sort((a, b) => rvState(a).due.localeCompare(rvState(b).due));
}
const rvNewLeft = () => Math.max(0, RV3.perDay - (RV.st.newDay.date === rvToday() ? RV.st.newDay.n : 0));
function rvNew() {
  const passed = rvPassed();
  return RV.cards.filter(c => !rvState(c) && passed.has(c.n)).slice(0, rvNewLeft());
}
const rvTodayCards = () => [...rvDue(), ...rvNew()];
function rvForecast() {
  const today = rvToday();
  return [1, 2, 3, 4, 5, 6, 7].map(k => { const d = rvAdd(today, k); return RV.cards.filter(c => rvState(c)?.due === d).length; });
}
// The step a right answer moves a card to.
const rvUp = c => Math.min(6, (rvState(c)?.s || 0) + 1);
// The first answer: in the day's review it moves the card along the steps (wrong: back to step 1, tomorrow); a chapter run
// only counts it.
function rvGrade(ok) {
  if (RV.done) return;
  RV.done = true;
  if (ok) RV.right++;
  if (RV.mode !== 'today') return;
  const c = RV.queue[RV.k], today = rvToday(), was = rvState(c), s = ok ? rvUp(c) : 1;
  if (!was) RV.st.newDay = { date: today, n: (RV.st.newDay.date === today ? RV.st.newDay.n : 0) + 1 };
  RV.lastIn = ok ? RV3.days[s - 1] : 1;
  RV.st.cards[c.id] = { s, due: rvAdd(today, RV.lastIn), seen: (was ? was.seen : 0) + 1 };
  rvSave();
  rvSide();
}
const rvAfter = () => RV.mode === 'today' ? 'вернётся ' + rvIn(RV.lastIn) : 'повтор главы: расписание не меняется';

// ---- the left column: today, the next week, the chapters
function rvSide() {
  const due = rvDue().length, fresh = rvNew().length, n = due + fresh, today = rvToday();
  const run = RV.mode === 'today' && RV.k < RV.queue.length;
  const later = Object.values(RV.st.cards).map(c => c.due).filter(d => d > today).sort()[0];
  $r('rvToday').innerHTML = `<div class="n">${n}</div><p>на сегодня: ${due} повторить, ${rvCount(fresh, 'новая', 'новые', 'новых')}`
    + `<br>следующие 7 дней: ${rvForecast().join(' · ')}</p>`
    + (run ? `<p class="now">идёт повторение: карточка ${RV.k + 1} из ${RV.queue.length}</p>`
      : n ? '<button class="btn go" id="rvStart" type="button">Начать</button>'
      : `<p class="now">На сегодня всё.${later ? ` Следующие карточки — ${rvDate(later)}.` : ''}</p>`);
  const done = rvDone();
  $r('rvUnits').innerHTML = REVIEW.units.map(u => {
    const cs = RV.cards.filter(c => c.unit === u.n), learned = cs.filter(c => (rvState(c)?.s || 0) >= RV3.learned).length;
    const k = u.lessons.filter(x => done.has(x)).length;
    const st = k === u.lessons.length ? 'all' : RV.st.marked.includes(u.n) ? 'mark' : k ? 'part' : 'none';
    const label = st === 'all' ? 'пройдена в уроках' : st === 'mark' ? 'отмечена пройденной — снять отметку' : 'отметить главу пройденной';
    return `<li class="u${RV.mode === 'unit' && RV.unit === u.n && RV.k < RV.queue.length ? ' cur' : ''}">`
      + `<button class="box ${st}" type="button" data-u="${u.n}" title="${label}" aria-label="Глава ${u.n}: ${label}"${st === 'all' ? ' disabled' : ''}>${st === 'all' || st === 'mark' ? '✓' : ''}</button>`
      + `<button class="nm" type="button" data-run="${u.n}" title="Повторить главу целиком">${u.n}. ${rvEsc(u.title)}</button>`
      + `<small>${learned}/${cs.length}</small><span class="mini"><i style="width:${cs.length ? 100 * learned / cs.length : 0}%"></i></span></li>`;
  }).join('');
}
function rvMark(u) {
  const m = RV.st.marked, i = m.indexOf(u);
  if (i < 0) m.push(u); else m.splice(i, 1);
  m.sort((a, b) => a - b);
  rvSave();
  if (RV.k < RV.queue.length) rvSide(); else rvIdle();
}

// ---- the right side: a word on what to do, a card, the end of a session
function rvDrop() { RV.pl?.close(); RV.pl = null; RV.ctl = null; }
function rvIdle() {
  rvDrop();
  Object.assign(RV, { queue: [], k: 0, mode: 'today', unit: 0 });
  const n = rvTodayCards().length, any = rvPassed().size > 0;
  $r('rvMain').innerHTML = '<div class="sum">'
    + (n ? `<h2>На сегодня ${rvCount(n, 'карточка', 'карточки', 'карточек')}</h2>` : '<h2>На сегодня всё</h2>')
    + (any ? '<p>Карточки — вопросы пройденных уроков и термины глоссария. Знакомая карточка возвращается через 1, 3, 7, 14, 30 и 60 дней, ошибка — назавтра.</p>'
      : '<p>Пока нет пройденных уроков: досмотрите урок до конца или отметьте пройденные главы слева.</p>')
    + (n ? '<button class="btn go big" id="rvGo" type="button">Начать</button>' : '')
    + '<p class="hint">Щелчок по названию главы — повтор всей главы вперемешку; расписание при этом не меняется.</p></div>';
  rvSide();
}
const rvShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rvStart(mode, unit = 0) {
  Object.assign(RV, { mode, unit, k: 0, right: 0 });
  RV.queue = mode === 'today' ? rvTodayCards() : rvShuffle(RV.cards.filter(c => c.unit === unit));
  document.body.classList.remove('side-open');
  rvShow();
}
function rvShow() {
  rvDrop();
  RV.done = false;
  rvSide();
  if (RV.k >= RV.queue.length) return rvEnd();
  const c = RV.queue[RV.k], N = RV.queue.length;
  $r('rvMain').innerHTML = '<div class="stat">'
    + (RV.mode === 'unit' ? `<span class="chip run">повтор главы ${RV.unit} — расписание не меняется</span>` : '')
    + `<span>Карточка <b>${RV.k + 1}</b> из ${N}</span><span class="bar"><i style="width:${100 * RV.k / N}%"></i></span></div>`
    + '<article class="qc" id="rvCard"></article>';
  (c.type === 'q' ? rvQuestion : rvTerm)(c, $r('rvCard'));
}
function rvNext() { if (RV.done) { RV.k++; rvShow(); } }
function rvEnd() {
  const unit = RV.mode === 'unit';
  $r('rvMain').innerHTML = `<div class="sum"><h2>${unit ? `Повтор главы ${RV.unit} закончен` : 'Готово'}</h2>`
    + `<p>Верно с первой попытки: ${RV.right} из ${RV.queue.length}.</p>`
    + `<button class="btn go" id="rvHome" type="button">${unit ? 'К повторению на сегодня' : 'Хорошо'}</button></div>`;
  $r('rvHome').focus({ preventScroll: true });
}

// ---- a lesson question, answered as in the lesson
function rvQuestion(c, el) {
  const q = c.q;
  el.className = 'qc';
  el.innerHTML = `<div class="src"><span class="k">Урок ${q.n}</span><span>${rvEsc(REVIEW.lessons[q.n].title)}</span><span class="chip">${rvEsc(q.label.toLowerCase())}</span></div>`
    + `<h2 class="prompt">${rvText(q.prompt)}</h2><div class="body"></div><div class="fb" id="rvFb" role="status"></div>`
    + '<div class="acts"><button class="btn go" id="rvCheck" type="button" hidden>Проверить <kbd>Enter</kbd></button>'
    + '<button class="btn go" id="rvNext" type="button" hidden>Дальше <kbd>Enter</kbd></button>'
    + `<a class="btn" id="rvOpen" href="${moLesson(q.n)}?beat=${q.i}" target="_blank" rel="noopener" hidden>Открыть урок ${q.n}</a>`
    + '<span class="next" id="rvAfter"></span></div>';
  RV.ctl = RV_KIND[q.kind](q, el.querySelector('.body'));
  $r('rvCheck').hidden = !RV.ctl.check;
}
// The first answer to a question: its explanation, then «Дальше» and the lesson.
function rvAnswer(ok, msg) {
  rvGrade(ok);
  const fb = $r('rvFb');
  fb.className = 'fb ' + (ok ? 'ok' : 'no');
  fb.innerHTML = (ok ? 'Верно. ' : 'Не совсем. ') + msg;
  $r('rvCheck').hidden = true;
  $r('rvNext').hidden = $r('rvOpen').hidden = false;
  $r('rvAfter').textContent = rvAfter();
  $r('rvNext').focus({ preventScroll: true });
}
// The exact value of a typed number, as in the lessons (engine.js rat), and a comma works as the decimal point too:
// integer, decimal, a/b or "w a/b" -> [num, den], or null.
function rvRat(str) {
  const t = String(str).trim().replace(/^[−–]/, '-').replace(/\s+/g, ' ').replace(',', '.');
  let m = t.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (m) { const d = 10 ** (m[3] || '').length, n = (m[1] ? -1 : 1) * (Number(m[2]) * d + Number(m[3] || 0)); return Number.isSafeInteger(n) && Number.isSafeInteger(d) ? [n, d] : null; }
  m = t.match(/^(-?)(?:(\d+) )?(\d+) ?\/ ?(\d+)$/);
  if (m && Number(m[4]) > 0) { const d = Number(m[4]), n = (m[1] ? -1 : 1) * (Number(m[2] || 0) * d + Number(m[3])); return Number.isSafeInteger(n) && Number.isSafeInteger(d) ? [n, d] : null; }
  return null;
}
const rvGcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
// The kinds of lesson questions (engine.js choice, grid, blanks); each draws itself into `body` and returns its controls:
// check() for a «Проверить» button, key(e) -> true when it used the key.
const RV_KIND = {
  choice(q, body) {
    body.innerHTML = '<div class="opts">' + q.opts.map((o, i) => `<button class="opt" type="button"><kbd>${i + 1}</kbd><span>${rvText(o)}</span></button>`).join('') + '</div>';
    const bs = [...body.querySelectorAll('.opt')];
    const pick = i => {
      if (RV.done) return;
      bs.forEach(b => { b.disabled = true; });
      bs[q.right].classList.add('good');
      if (i === q.right) return rvAnswer(true, rvText(q.yes));
      bs[i].classList.add('bad');
      rvAnswer(false, `${rvText(q.no[i])} Верный ответ — «${rvText(q.opts[q.right])}». ${rvText(q.yes)}`.trim());
    };
    bs.forEach((b, i) => b.addEventListener('click', () => pick(i)));
    return { key: e => { const i = Number(e.key) - 1; if (!(i >= 0 && i < bs.length)) return false; pick(i); return true; } };
  },
  grid(q, body) {
    const hot = q.cols.map((c, j) => c[3] || String(j + 1)), one = q.items.length === 1;
    body.innerHTML = `<div class="grid${q.text ? ' text' : ''}">` + q.items.map((it, r) => `<div class="row" data-r="${r}"><div class="num">${rvText(it.parts)}</div><div class="opts">`
      + q.cols.map(([, lab, col], j) => `<button class="opt" type="button" data-j="${j}" aria-pressed="false"${col ? ` style="--c:${rvEsc(col)}"` : ''}><kbd>${rvEsc(hot[j])}</kbd>${rvEsc(lab)}</button>`).join('')
      + '</div><div class="mark"></div><div class="why"></div></div>').join('') + '</div>';
    const rows = [...body.querySelectorAll('.row')], bsOf = r => [...rows[r].querySelectorAll('.opt')];
    let cur = 0;
    const showCur = () => rows.forEach((row, i) => row.classList.toggle('cur', !one && !RV.done && i === cur));
    const press = (r, j) => {
      if (RV.done) return;
      const bs = bsOf(r), on = bs[j].getAttribute('aria-pressed') !== 'true';
      if (!q.multi) bs.forEach(b => b.setAttribute('aria-pressed', 'false'));
      bs[j].setAttribute('aria-pressed', String(on));
    };
    body.addEventListener('click', ev => {
      const row = ev.target.closest('.row'), b = ev.target.closest('.opt');
      if (!row) return;
      cur = +row.dataset.r;
      if (b) press(cur, +b.dataset.j);
      showCur();
    });
    showCur();
    return {
      check() {
        if (RV.done) return;
        let right = 0;
        q.items.forEach((it, r) => {
          const bs = bsOf(r), got = q.cols.filter((c, j) => bs[j].getAttribute('aria-pressed') === 'true').map(c => c[0]);
          const ok = got.length === it.ans.length && it.ans.every(k => got.includes(k)), m = rows[r].querySelector('.mark');
          right += ok;
          m.className = 'mark ' + (ok ? 'good' : 'bad');
          m.textContent = ok ? '✓' : '✗';
          bs.forEach((b, j) => { b.disabled = true; b.classList.toggle('good', it.ans.includes(q.cols[j][0])); });
          rows[r].querySelector('.why').innerHTML = ok || one ? '' : rvText(it.why);
        });
        const all = right === q.items.length;
        rvAnswer(all, one ? rvText(q.items[0].why) : all ? '' : `Верно ${right} из ${q.items.length}; верные ответы обведены.`);
        showCur();
      },
      key(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (one) return false;
          cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
          showCur();
          return true;
        }
        const j = hot.findIndex(x => x.toLowerCase() === e.key.toLowerCase());
        if (j < 0) return false;
        press(cur, j);
        if (!q.multi && cur < rows.length - 1) cur++;
        showCur();
        return true;
      },
    };
  },
  blanks(q, body) {
    body.classList.add('blanks');
    body.innerHTML = q.rows.map(w => '<div class="brow"><div class="bline">' + w.parts.map(p => p && p.box !== undefined
      ? `<input class="box" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="Ответ" data-ans="${rvEsc(p.box)}"${p.lowest ? ' data-lowest="1"' : ''} style="width:${Math.max(2, String(p.box).length) + 3}ch">`
      : rvEsc(p)).join('') + '<span class="mark"></span></div><div class="why"></div></div>').join('');
    const rows = [...body.querySelectorAll('.brow')], one = rows.length === 1;
    requestAnimationFrame(() => body.querySelector('.box')?.focus({ preventScroll: true }));
    return {
      check() {
        if (RV.done) return;
        let right = 0;
        q.rows.forEach((w, r) => {
          let ok = true;
          for (const b of rows[r].querySelectorAll('.box')) {
            const want = rvRat(b.dataset.ans), got = rvRat(b.value);
            const good = !!got && !!want && BigInt(got[0]) * BigInt(want[1]) === BigInt(want[0]) * BigInt(got[1]) && (!b.dataset.lowest || rvGcd(got[0], got[1]) === 1);
            b.classList.add(good ? 'good' : 'bad');
            b.disabled = true;
            if (!good) b.insertAdjacentHTML('afterend', `<span class="ans">${rvEsc(b.dataset.ans)}</span>`);
            ok = ok && good;
          }
          right += ok;
          const m = rows[r].querySelector('.mark');
          m.className = 'mark ' + (ok ? 'good' : 'bad');
          m.textContent = ok ? '✓' : '✗';
          rows[r].querySelector('.why').innerHTML = ok || one ? '' : rvText(w.hint ?? w.why);
        });
        const all = right === q.rows.length;
        rvAnswer(all, one ? rvText(all ? q.rows[0].why : q.rows[0].hint ?? q.rows[0].why) : all ? '' : `Верно ${right} из ${q.rows.length}; верные числа показаны зелёным.`);
      },
      key: () => false,
    };
  },
};

// ---- a term: the front, «Показать ответ» turns it (the definition and the lesson moment), then «Помню» / «Не помню»
function rvTerm(c, el) {
  const t = c.t;
  el.className = 'qc tc';
  el.innerHTML = `<div class="f"><div class="src"><span class="k">Термин</span><span>глава ${t.unit} · урок ${t.n}</span></div>`
    + `<div class="t">${rvEsc(t.ru)}</div><div class="e">${rvEsc(t.en)}</div><div class="turn" id="rvBack" hidden></div></div>`
    + '<div class="self"><button class="btn go" id="rvFlip" type="button">Показать ответ <kbd>пробел</kbd></button>'
    + '<button class="btn no" id="rvNo" type="button" hidden>Не помню <kbd>1</kbd></button><button class="btn yes" id="rvYes" type="button" hidden>Помню <kbd>2</kbd></button>'
    + '<button class="btn go" id="rvNext" type="button" hidden>Дальше <kbd>Enter</kbd></button><span class="next" id="rvAfter"></span></div>';
  $r('rvFlip').focus({ preventScroll: true });
}
function rvFlip() {
  const c = RV.queue[RV.k], back = $r('rvBack');
  if (!c || c.type !== 't' || !back || !back.hidden) return;
  const t = c.t;
  back.hidden = false;
  back.innerHTML = `<p class="def">${rvEsc(t.def)}</p>` + (t.note ? `<p class="note">${rvEsc(t.note)} <span class="pill">${RV3.note}</span></p>` : '')
    + `<button class="btn" id="rvShow" type="button">▶ Показать в уроке ${t.moments[0].n}</button>`;
  $r('rvFlip').hidden = true;
  $r('rvNo').hidden = $r('rvYes').hidden = false;
  $r('rvAfter').textContent = RV.mode === 'today' ? `«Помню» — ${rvIn(RV3.days[rvUp(c) - 1])}, «Не помню» — завтра` : rvAfter();
  $r('rvYes').focus({ preventScroll: true });
}
// The term's first moment, played by the lesson itself inside the card.
function rvMoment() {
  const t = RV.queue[RV.k].t, { root, ui } = momentEl();
  $r('rvShow').replaceWith(root);
  RV.pl = momentPlayer(ui);
  RV.pl.load(t.moments[0], true);
}
function rvSelf(ok) {
  if (RV.done || $r('rvBack').hidden) return;
  rvGrade(ok);
  $r('rvNo').hidden = $r('rvYes').hidden = true;
  $r('rvNext').hidden = false;
  $r('rvAfter').textContent = rvAfter();
  $r('rvNext').focus({ preventScroll: true });
}

// ---- the progress in a file: a guard against cleared site data
function rvExport() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(RV.st, null, 1)], { type: 'application/json' }));
  a.download = `povtorenie-${rvToday()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function rvImport(file) {
  const r = new FileReader();
  r.onload = () => {
    let s = null;
    try { s = rvValid(JSON.parse(r.result)); } catch {}
    if (!s) return rvMsg('Этот файл не похож на сохранённый прогресс повторения — ничего не изменилось.', true);
    if (!confirm('Заменить текущий прогресс повторения прогрессом из файла?')) return;
    RV.st = s;
    rvSave();
    rvIdle();
    rvMsg('Прогресс загружен из файла.');
  };
  r.readAsText(file);
}
function rvMsg(text, bad = false) { const m = $r('rvMsg'); m.textContent = text; m.classList.toggle('bad', bad); }

// ---- keys: 1–9 and letters answer, Enter checks and goes on, the space turns a term, 1 / 2 grade it
function rvKey(ev) {
  if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.key === 'Escape' && document.body.classList.contains('side-open')) return document.body.classList.remove('side-open');
  const c = RV.queue[RV.k];
  if (!c) return;
  if (ev.key === 'Enter') {
    if (RV.done) { ev.preventDefault(); return rvNext(); }
    if (RV.ctl?.check) { ev.preventDefault(); return RV.ctl.check(); }
    return;
  }
  if (ev.target.matches('input')) return;
  if (c.type === 't') {
    const back = $r('rvBack');
    if (ev.key === ' ' && back.hidden) { ev.preventDefault(); return rvFlip(); }
    if ((ev.key === '1' || ev.key === '2') && !RV.done && !back.hidden) { ev.preventDefault(); return rvSelf(ev.key === '2'); }
    return;
  }
  if (!RV.done && RV.ctl?.key(ev)) ev.preventDefault();
}

function rvStartPage() {
  RV.st = rvRead();
  rvCards();
  $r('rvNoStore').hidden = RV.saved;
  rvIdle();
  document.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'rvStart' || b.id === 'rvGo') return rvStart('today');
    if (b.id === 'rvNext') return rvNext();
    if (b.id === 'rvHome') return rvIdle();
    if (b.id === 'rvCheck') return RV.ctl?.check?.();
    if (b.id === 'rvFlip') return rvFlip();
    if (b.id === 'rvShow') return rvMoment();
    if (b.id === 'rvNo' || b.id === 'rvYes') return rvSelf(b.id === 'rvYes');
    if (b.dataset.u) return rvMark(+b.dataset.u);
    if (b.dataset.run) return rvStart('unit', +b.dataset.run);
    if (b.id === 'rvSave') return rvExport();
    if (b.id === 'rvLoad') return $r('rvFile').click();
    if (b.id === 'rvSideBtn') return document.body.classList.add('side-open');
    if (b.id === 'rvSideX') return document.body.classList.remove('side-open');
  });
  $r('rvFile').addEventListener('change', ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) rvImport(f); });
  document.addEventListener('keydown', rvKey);
  window.RV_READY = true;
}
rvStartPage();
