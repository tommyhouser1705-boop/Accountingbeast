// Ledger Lane office simulation: the student's business as a persistent, seeded
// simulation. Months are lists of dated inbox items (decisions and source
// documents). No DOM access so every month can be played in Node.
(function (root) {
  const LL = root.LL || (typeof require !== 'undefined' ? require('./lessons-engine.js') : null);
  const {ACC, checkJE, post, money, r2} = LL;

  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const CITIES = {
    columbus: {city: 'Columbus', state: 'OH', zip: '43215', street: 'N. High Street', area: '614'},
    denver: {city: 'Denver', state: 'CO', zip: '80205', street: 'Larimer Street', area: '303'},
    raleigh: {city: 'Raleigh', state: 'NC', zip: '27601', street: 'Glenwood Avenue', area: '919'},
    austin: {city: 'Austin', state: 'TX', zip: '78702', street: 'E. Cesar Chavez Street', area: '512'},
  };

  const months = [];

  function newGame(o) {
    const seed = o.seed || Math.floor(Math.random() * 1e9);
    const st = {
      v: 1, seed, biz: {type: o.type || 'bike', name: (o.name || '').replace(/[<>]/g,'').trim().slice(0,40), founder: (o.founder || '').replace(/[<>]/g,'').trim().slice(0,40) || 'Owner', city: CITIES[o.city] ? o.city : 'columbus'},
      m: 0, day: 1, led: {}, journal: [], book: [], done: {}, ch: {}, vars: {}, log: [], first: 0, graded: 0, tries: {}, misses: {},
    };
    st.biz.name = st.biz.name || LL.PROFILES[st.biz.type].name;
    return st;
  }

  const place = (st) => CITIES[st.biz.city];
  const prof = (st) => LL.profile({type: st.biz.type, name: st.biz.name, founder: st.biz.founder});
  const rand = (st, key) => { let h = st.seed; for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return rng(h)(); };
  const current = (st) => st.casePeriod || months[st.m];
  const items = (st) => current(st).items.filter((it) => !it.when || it.when(st)).map((it) => {
    if (it.day > st.day || it.kind === 'decision') return it;
    st.paper ||= {};
    if (!st.paper[it.id]) {
      const data = {};
      for (const key of ['doc', 'lines', 'fields']) if (it[key] != null) data[key] = V(it[key], st);
      st.paper[it.id] = data;
    }
    return {...it, ...st.paper[it.id]};
  });
  const inbox = (st) => items(st).filter((it) => it.day <= st.day).sort((a, b) => a.day - b.day);
  const open = (st) => inbox(st).filter((it) => !st.done[it.id]);
  const V = (x, st) => (typeof x === 'function' ? x(st) : x);
  const want = (st, it) => { const l = V(it.lines, st); return l ? l.filter((x) => r2(x[2]) !== 0).map(([a, s, x]) => [a, s, r2(x)]) : null; };

  function dateOf(st, day) {
    const mo = current(st).start;
    return new Date(Date.UTC(mo[0], mo[1] - 1, day));
  }
  const fmtDate = (st, day, style = 'long') => dateOf(st, day).toLocaleDateString('en-US', {timeZone: 'UTC', ...(style === 'long' ? {month: 'long', day: 'numeric', year: 'numeric'} : style === 'short' ? {month: '2-digit', day: '2-digit', year: 'numeric'} : {weekday: 'long', month: 'long', day: 'numeric'})});

  function record(st, it, lines) {
    if (lines && lines.length) {
      post(st, lines, it.id);
      st.book.push({m: st.m, date: fmtDate(st, it.day, 'short'), day: it.day, id: it.id, memo: V(it.memo, st) || V(it.subject, st), lines});
    }
    st.done[it.id] = true;
    if (it.after) it.after(st);
  }

  function grade(st, it, ok) {
    if (st.tries[it.id] == null) { st.tries[it.id] = 0; st.graded++; if (ok) st.first++; }
    st.tries[it.id]++;
    if (!ok) st.misses[it.id] = (st.misses[it.id] || 0) + 1;
  }

  // action: {choice:{qid:value}} | {rows:[{a,d,c}]} | {noEntry:true} | {reveal:true}
  function handle(st, id, action) {
    const it = items(st).find((x) => x.id === id);
    if (!it || st.done[id] || it.day > st.day) return {ok: false, text: 'This item is not available.'};
    if (it.kind === 'decision') {
      const qs = V(it.q, st), ch = action.choice || {};
      if (qs.some((q) => !q.opts.some((o) => o.v === ch[q.id]))) return {ok: false, text: 'Choose a reply before sending.'};
      qs.forEach((q) => (st.ch[q.id] = ch[q.id]));
      if (it.apply) it.apply(st, ch);
      st.log.push({day: it.day, text: V(it.outcome, st) || ''});
      record(st, it, want(st, it));
      return {ok: true, done: true, text: V(it.outcome, st) || ''};
    }
    if (it.kind === 'work') {
      const fields = V(it.fields, st), values = action.values || {};
      const ok = fields.every((f) => String(values[f.id] ?? '').trim() !== '' && Math.abs(LL.num(values[f.id]) - f.value) < 0.015);
      grade(st, it, ok);
      if (ok) { record(st, it, null); return {ok: true, done: true, text: 'Filed.'}; }
      return {ok: false, text: 'The worksheet does not tie to the supporting records. Review the amounts before filing.'};
    }
    const w = want(st, it);
    if (action.reveal) { if ((st.misses[id] || 0) < 2) return {ok: false, text: 'Try at least twice before you look at the answer.'}; return {ok: true, reveal: w}; }
    if (action.noEntry) {
      const ok = !w;
      grade(st, it, ok);
      if (ok) { record(st, it, null); return {ok: true, done: true, text: V(it.why, st) || 'Correct. Nothing changed in the accounting equation, so there is nothing to record.'}; }
      return {ok: false, text: 'This document does change the business’s accounts. Record it.'};
    }
    if (!w) { grade(st, it, false); return {ok: false, text: V(it.hint, st) || 'Look again: did anything actually change hands? Not every document is a transaction.'}; }
    const r = checkJE(st, action.rows || [], w);
    grade(st, it, r.ok);
    if (r.ok) { record(st, it, w); return {ok: true, done: true, text: V(it.why, st) || 'Posted.'}; }
    return {ok: false, text: r.text + (V(it.hint, st) && st.misses[id] > 1 ? ' ' + V(it.hint, st) : '')};
  }

  const nextDay = (st) => { const d = items(st).filter((it) => it.day > st.day).map((it) => it.day); return d.length ? Math.min(...d) : null; };
  function advance(st) {
    if (open(st).length) return {ok: false, text: 'Finish everything in your inbox before you move on.'};
    const d = nextDay(st);
    if (d == null) { st.day = current(st).days; return {ok: true, monthEnd: true}; }
    st.day = d;
    return {ok: true, day: d, arrived: open(st).map((x) => x.id)};
  }

  const bal = (st, a) => LL.bal(st, a);
  function summary(st) {
    const sum = (t) => Object.keys(st.led).filter((a) => ACC[a][1] === t).reduce((s, a) => s + bal(st, a), 0);
    const rev = sum('R') - sum('XR'), exp = sum('E');
    return {cash: bal(st, 'cash'), revenue: r2(rev), expenses: r2(exp), netIncome: r2(rev - exp), first: st.first, graded: st.graded, score: st.graded ? Math.round((100 * st.first) / st.graded) : 0};
  }
  function trialBalance(st) {
    return Object.keys(ACC).filter((a) => st.led[a] && bal(st, a)).map((a) => { const b = bal(st, a) * (LL.dn(a) ? 1 : -1); return [a, ACC[a][0], Math.max(b, 0), Math.max(-b, 0)]; });
  }

  function complete(st) {
    if (open(st).length || nextDay(st) != null) return false;
    st.results ||= {};
    const base = st.mark || {first: 0, graded: 0};
    const first = st.first - base.first, graded = st.graded - base.graded;
    st.results[current(st).lessonId || 'ch2'] ||= {first, graded, score: graded ? Math.round(100 * first / graded) : 0};
    st.ended = true;
    return true;
  }

  function nextMonth(st) {
    if (st.casePeriod) return false;
    if (!st.ended || !months[st.m + 1]) return false;
    st.m++; st.day = 1; st.ended = false; st.review = false;
    st.mark = {first: st.first, graded: st.graded};
    st.opening = JSON.parse(JSON.stringify(st.led));
    return true;
  }

  root.SIM = {rng, CITIES, months, newGame, current, inbox, open, handle, advance, nextDay, summary, trialBalance, want, V, place, prof, rand, fmtDate, money, r2, bal, complete, nextMonth};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SIM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
