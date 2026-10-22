// Ledger Lane office: the student's business, day by day. Paperwork arrives in
// the inbox, the owner makes decisions and records what happened.
(function () {
  const {ACC, money} = LL, S = SIM, D = SIMDOCS;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const KEY = 'll-office-v1', root = $('#office');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  let scrollTop = false, st = load(), sel = null, tab = 'office', rows = [], fresh = new Set(), shown = {cash: 0, rev: 0, ni: 0};
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const V = (x) => S.V(x, st);
  const TYPES = [['bike', 'Bike repair shop', 'Tune-ups and repairs for commuters and weekend riders.'], ['fitness', 'Fitness studio', 'Group classes and personal training.'], ['landscape', 'Landscaping company', 'Lawn care and yard projects for homeowners.'], ['photo', 'Photography studio', 'Portraits, headshots and event shoots.']];

  function setup() {
    document.body.dataset.v = 'setup';
    root.innerHTML = `<div class="setup"><div class="setup-card"><a class="brand" href="index.html">Ledger Lane</a><h1>Start your business</h1><p class="lead">You will run this company all semester. Every decision you make shows up in the paperwork, and you keep the books.</p>
<form id="setup"><fieldset><legend>What kind of business?</legend><div class="types">${TYPES.map(([v, t, d], i) => `<label class="type"><input type="radio" name="type" value="${v}" ${i ? '' : 'checked'}><b>${t}</b><span>${d}</span></label>`).join('')}</div></fieldset>
<div class="two"><label>Business name<input name="name" maxlength="40" placeholder="Spoke &amp; Sprocket" required></label><label>Your name<input name="founder" maxlength="40" placeholder="Alex Rivera" required></label></div>
<label>City<select name="city">${Object.entries(S.CITIES).map(([k, c]) => `<option value="${k}">${c.city}, ${c.state}</option>`).join('')}</select></label>
<button class="btn primary big">Incorporate and open the office</button></form></div></div>`;
    const f = $('#setup');
    f.type.forEach((r) => (r.onchange = () => (f.name.placeholder = LL.PROFILES[r.value].name)));
    f.onsubmit = (e) => { e.preventDefault(); st = S.newGame({type: f.type.value, name: f.name.value, founder: f.founder.value, city: f.city.value}); save(); fresh = new Set(S.open(st).map((x) => x.id)); sel = null; render(); };
  }

  const initials = (n) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const sum = () => S.summary(st);

  function top() {
    const m = S.current(st), dt = new Date(Date.UTC(m.start[0], m.start[1] - 1, st.day));
    const mon = dt.toLocaleDateString('en-US', {timeZone: 'UTC', month: 'short'}), wd = dt.toLocaleDateString('en-US', {timeZone: 'UTC', weekday: 'short'});
    return `<header class="bar"><div class="co"><i>${esc(initials(st.biz.name))}</i><div><b>${esc(st.biz.name)}, Inc.</b><small>${esc(S.prof(st).type)} · ${esc(S.place(st).city)}, ${esc(S.place(st).state)}</small></div></div>
<div class="cal" title="Today"><span class="cal-m">${mon}</span><span class="cal-d" id="cal-d">${st.day}</span><span class="cal-w">${wd}</span></div>
<div class="kpis"><div><small>Cash</small><b id="k-cash">${money(shown.cash, 1)}</b><em id="k-delta"></em></div><div><small>Revenue</small><b id="k-rev">${money(shown.rev, 1)}</b></div><div><small>Net income</small><b id="k-ni">${money(shown.ni, 1)}</b></div></div>
<nav class="tabs">${[['office', 'Office'], ['journal', 'Journal'], ['ledger', 'Ledger'], ['tb', 'Trial balance']].map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</nav></header>`;
  }

  function inbox() {
    const all = S.inbox(st), open = all.filter((x) => !st.done[x.id]);
    const next = S.nextDay(st);
    return `<aside class="inbox"><div class="ib-head"><b>Inbox</b><span>${open.length ? open.length + ' to handle' : 'All caught up'}</span></div><ul>${all.slice().reverse().map((it) => `<li class="${st.done[it.id] ? 'done' : 'new'} ${sel === it.id ? 'sel' : ''} ${fresh.has(it.id) ? 'arrive' : ''}" data-open="${it.id}"><span class="ib-kind k-${it.kind}">${it.kind === 'decision' ? 'Decision' : 'Paperwork'}</span><b>${esc(V(it.from))}</b><span class="ib-sub">${esc(V(it.subject))}</span><small>${esc(S.fmtDate(st, it.day, 'short').slice(0, 5))}</small></li>`).join('')}</ul>
<div class="ib-foot">${open.length ? `<p>Handle everything in your inbox to move to the next business day.</p>` : next != null ? `<button class="btn primary" id="next">Go to ${esc(S.fmtDate(st, next, 'day'))}</button>` : `<button class="btn primary" id="close">Close the month</button>`}</div></aside>`;
  }

  function docView(it) {
    if (!it) return `<section class="desk empty"><div><h2>${S.open(st).length ? 'Open an item in your inbox' : 'Nothing waiting on you'}</h2><p>${S.open(st).length ? 'Start with the oldest one. Decisions come first; the paperwork follows from what you decide.' : 'Your books are up to date for today.'}</p></div></section>`;
    const spec = V(it.doc), specs = Array.isArray(spec) ? spec : [spec];
    return `<section class="desk"><div class="papers">${specs.map((s) => D.render(s)).join('')}${st.done[it.id] && it.kind === 'doc' ? `<div class="stamp-big ${S.want(st, it) ? '' : 'none'}">${S.want(st, it) ? 'POSTED' : 'NO ENTRY'}</div>` : ''}</div></section>`;
  }

  function acctOpts(it, v) {
    const list = V(it.accts) || Object.keys(ACC);
    return `<option value="">Choose account…</option>${list.map((a) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(ACC[a][0])}</option>`).join('')}`;
  }

  function panel(it) {
    if (!it) return `<aside class="panel"><h3>${esc(S.current(st).n)}: ${esc(S.current(st).title)}</h3><p class="muted">${S.current(st).topics.join(' · ')}</p>${log()}</aside>`;
    if (it.kind === 'decision') {
      if (st.done[it.id]) return `<aside class="panel"><span class="tag decision">Decision made</span><h3>${esc(V(it.subject))}</h3><p class="outcome">${esc(V(it.outcome))}</p>${log()}</aside>`;
      return `<aside class="panel"><span class="tag decision">Your decision</span><h3>${esc(V(it.subject))}</h3><form id="decide">${V(it.q).map((q) => `<fieldset><legend>${esc(q.label)}</legend>${q.opts.map((o) => `<label class="opt"><input type="radio" name="${q.id}" value="${o.v}"><b>${esc(S.V(o.t, st))}</b><span>${esc(o.d)}</span></label>`).join('')}</fieldset>`).join('')}<button class="btn primary">Decide</button><p class="fb" id="fb"></p></form></aside>`;
    }
    if (st.done[it.id]) {
      const j = st.book.find((b) => b.id === it.id);
      return `<aside class="panel"><span class="tag ok">${j ? 'Posted' : 'No entry needed'}</span><h3>${esc(V(it.subject))}</h3>${j ? entryTable(j) : ''}<p class="why">${esc(V(it.why))}</p></aside>`;
    }
    if (!rows.length) rows = [{a: '', d: '', c: ''}, {a: '', d: '', c: ''}];
    const miss = st.misses[it.id] || 0;
    return `<aside class="panel"><span class="tag rec">Record this</span><h3>${esc(V(it.subject))}</h3><p class="muted">Journalize what happened. If nothing changed hands, there is nothing to record.</p>
<div class="je" id="je"><div class="je-h"><span>Account</span><span>Debit</span><span>Credit</span></div>${rows.map((r, i) => `<div class="je-r ${r.c && !r.d ? 'cr' : ''}"><select data-i="${i}" data-k="a">${acctOpts(it, r.a)}</select><input data-i="${i}" data-k="d" inputmode="decimal" value="${esc(r.d)}" aria-label="Debit"><input data-i="${i}" data-k="c" inputmode="decimal" value="${esc(r.c)}" aria-label="Credit"></div>`).join('')}
<div class="je-t"><button class="link" id="addrow">+ Add line</button><span id="je-tot"></span></div></div>
<div class="acts"><button class="btn primary" id="post">Post entry</button><button class="btn" id="noentry">No entry needed</button></div><p class="fb" id="fb"></p>${miss >= 2 ? '<button class="link" id="reveal">Show me the entry</button>' : ''}</aside>`;
  }

  const entryTable = (j) => `<table class="jt">${j.lines.map(([a, s, x]) => `<tr class="${s}"><td>${esc(ACC[a][0])}</td><td>${s === 'dr' ? money(x, 1) : ''}</td><td>${s === 'cr' ? money(x, 1) : ''}</td></tr>`).join('')}</table>`;
  const log = () => (st.log.length ? `<div class="tl"><h4>What you’ve decided</h4><ol>${st.log.map((l) => `<li><small>${esc(S.fmtDate(st, l.day, 'short').slice(0, 5))}</small>${esc(l.text)}</li>`).join('')}</ol></div>` : '');

  function books() {
    if (tab === 'journal') return `<section class="bookview"><h2>General journal</h2>${st.book.length ? `<table class="gj"><thead><tr><th>Date</th><th>Account and explanation</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead>${st.book.map((j) => `<tbody>${j.lines.map(([a, s, x], i) => `<tr><td>${i ? '' : esc(S.fmtDate(st, j.day, 'short').slice(0, 5))}</td><td class="${s}">${esc(ACC[a][0])}</td><td class="r">${s === 'dr' ? money(x, 1) : ''}</td><td class="r">${s === 'cr' ? money(x, 1) : ''}</td></tr>`).join('')}<tr class="memo"><td></td><td colspan="3">${esc(j.memo)}</td></tr></tbody>`).join('')}</table>` : '<p class="muted">No entries yet.</p>'}</section>`;
    if (tab === 'ledger') return `<section class="bookview"><h2>Ledger</h2><div class="tgrid">${Object.keys(ACC).filter((a) => st.led[a]).map((a) => { const l = st.led[a], b = S.bal(st, a); return `<div class="t"><h4>${esc(ACC[a][0])}</h4><div class="tb"><div>${l.dr.map((x) => `<span>${money(x.x, 1)}</span>`).join('')}</div><div>${l.cr.map((x) => `<span>${money(x.x, 1)}</span>`).join('')}</div></div><div class="tbal ${LL.dn(a) ? '' : 'crb'}">${money(b, 1)}</div></div>`; }).join('') || '<p class="muted">No postings yet.</p>'}</div></section>`;
    const tb = S.trialBalance(st), Dt = tb.reduce((t, r) => t + r[2], 0), Ct = tb.reduce((t, r) => t + r[3], 0);
    return `<section class="bookview"><h2>Trial balance</h2><p class="muted">${esc(st.biz.name)}, Inc. · ${esc(S.fmtDate(st, st.day))}</p><table class="gj tbt"><thead><tr><th>Account</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead><tbody>${tb.map(([, n, d, c]) => `<tr><td>${esc(n)}</td><td class="r">${d ? money(d, 1) : ''}</td><td class="r">${c ? money(c, 1) : ''}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="r">${money(Dt, 1)}</td><td class="r">${money(Ct, 1)}</td></tr></tbody></table></section>`;
  }

  function monthEnd() {
    const s = sum(), mo = S.current(st);
    const custs = st.book.filter((j) => /sales, week/.test(j.memo)).length;
    return `<section class="report"><div class="rp-card"><small>${esc(mo.n)} report</small><h1>${esc(st.biz.name)} made it through ${esc(mo.title.toLowerCase())}</h1>
<div class="rp-k"><div><small>Revenue</small><b>${money(s.revenue, 1)}</b></div><div><small>Expenses</small><b>${money(s.expenses, 1)}</b></div><div><small>Net income</small><b class="${s.netIncome < 0 ? 'neg' : ''}">${money(s.netIncome, 1)}</b></div><div><small>Cash in the bank</small><b>${money(s.cash, 1)}</b></div></div>
<div class="rp-two"><div><h3>Your decisions</h3><ol class="rp-log">${st.log.map((l) => `<li>${esc(l.text)}</li>`).join('')}</ol></div><div><h3>Your bookkeeping</h3><p class="rp-score"><b>${s.first}</b> of ${s.graded} recorded correctly on the first try (${s.score}%).</p><p class="muted">${custs} weeks of register sales recorded. Your trial balance ${Math.abs(S.trialBalance(st).reduce((t, r) => t + r[2] - r[3], 0)) < 0.005 ? 'is in balance' : 'is out of balance'}.</p><button class="btn" data-tab="journal">Review your journal</button></div></div>
<p class="muted rp-note">Next month: your first payroll, rent comes due from the prepaid balance, and the loan’s first payment.</p></div></section>`;
  }

  function render() {
    if (!st) return setup();
    document.body.dataset.v = 'office';
    const it = sel && S.inbox(st).find((x) => x.id === sel);
    const ended = st.ended;
    root.innerHTML = top() + (tab !== 'office' ? `<main class="main one">${books()}</main>` : ended ? `<main class="main one">${monthEnd()}</main>` : `<main class="main">${inbox()}${docView(it)}${panel(it)}</main>`) + `<footer class="foot"><a href="index.html">Ledger Lane</a><button class="link" id="reset">Start over</button></footer>`;
    wire(it);
    if (scrollTop) { window.scrollTo(0, 0); scrollTop = false; }
    animateKpis();
    fresh.clear();
  }

  function animateKpis() {
    const s = sum(), to = {cash: s.cash, rev: s.revenue, ni: s.netIncome}, from = {...shown};
    const delta = to.cash - from.cash;
    if (Math.abs(delta) > 0.004 && $('#k-delta')) { const e = $('#k-delta'); e.textContent = (delta > 0 ? '+' : '−') + money(Math.abs(delta), 1); e.className = 'show ' + (delta > 0 ? 'up' : 'down'); }
    const t0 = performance.now(), dur = 700;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); for (const x of ['cash', 'rev', 'ni']) { const el = $('#k-' + x); if (el) el.textContent = money(from[x] + (to[x] - from[x]) * e, 1); } if (k < 1) requestAnimationFrame(step); };
    shown = to;
    if (Object.keys(to).some((x) => from[x] !== to[x])) requestAnimationFrame(step);
  }

  function readRows() { $$('#je [data-i]').forEach((el) => (rows[+el.dataset.i][el.dataset.k] = el.value)); }
  function totals() {
    readRows();
    const n = (v) => +String(v).replace(/[$,\s]/g, '') || 0, dsum = rows.reduce((t, r) => t + n(r.d), 0), csum = rows.reduce((t, r) => t + n(r.c), 0);
    const el = $('#je-tot'); if (el) { el.textContent = `Debits ${money(dsum, 1)} · Credits ${money(csum, 1)}`; el.className = dsum && Math.abs(dsum - csum) < 0.005 ? 'bal' : ''; }
  }
  function feedback(r) { const fb = $('#fb'); if (!fb) return; fb.innerHTML = r.text; fb.className = 'fb ' + (r.ok ? 'ok' : 'bad'); if (!r.ok) { const p = $('.panel'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); } }

  function wire(it) {
    $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; scrollTop = true; render(); }));
    $$('[data-open]').forEach((li) => (li.onclick = () => { if (sel !== li.dataset.open) rows = []; sel = li.dataset.open; render(); }));
    if ($('#reset')) $('#reset').onclick = () => { if (confirm('Start over with a new business? Your current books will be erased.')) { localStorage.removeItem(KEY); st = null; sel = null; shown = {cash: 0, rev: 0, ni: 0}; render(); } };
    if ($('#next')) $('#next').onclick = () => {
      const r = S.advance(st); save(); (r.arrived || []).forEach((id) => fresh.add(id)); sel = (r.arrived || [])[0] || null; rows = [];
      scrollTop = true; root.classList.add('turning'); setTimeout(() => root.classList.remove('turning'), 650); render();
    };
    if ($('#close')) $('#close').onclick = () => { S.advance(st); st.ended = true; save(); scrollTop = true; render(); };
    if ($('#decide')) $('#decide').onsubmit = (e) => {
      e.preventDefault(); const f = e.target, ch = {};
      V(it.q).forEach((q) => { const v = f.querySelector(`input[name="${q.id}"]:checked`); if (v) { const o = q.opts.find((o) => String(o.v) === v.value); ch[q.id] = o.v; } });
      const r = S.handle(st, it.id, {choice: ch}); if (!r.ok) return feedback(r);
      save(); fresh = new Set(S.open(st).map((x) => x.id).filter((id) => id !== it.id)); render();
    };
    if ($('#je')) {
      $('#je').oninput = totals; totals();
      $('#addrow').onclick = () => { readRows(); rows.push({a: '', d: '', c: ''}); render(); };
      $('#post').onclick = () => { readRows(); const r = S.handle(st, it.id, {rows}); finish(r); };
      $('#noentry').onclick = () => { readRows(); finish(S.handle(st, it.id, {noEntry: true})); };
      if ($('#reveal')) $('#reveal').onclick = () => { const r = S.handle(st, it.id, {reveal: true}); if (r.reveal) { rows = r.reveal.map(([a, s, x]) => ({a, d: s === 'dr' ? String(x) : '', c: s === 'cr' ? String(x) : ''})); render(); feedback({ok: true, text: 'Here is the entry. Post it to continue. This item no longer counts as correct on the first try.'}); } };
    }
    function finish(r) {
      if (!r.ok) { save(); if ((st.misses[it.id] || 0) === 2) { render(); } return feedback(r); }
      save(); rows = []; render();
      const stamp = $('.stamp-big'); if (stamp) stamp.classList.add('hit');
    }
  }

  render();
})();
