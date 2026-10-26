// Ledger Lane office: the student's business, day by day. Paperwork arrives in
// the inbox, the owner makes decisions and records what happened.
(function () {
  const {ACC, money} = LL, S = SIM, D = SIMDOCS;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const BASE = 'll-office-v2', root = $('#office');
  const cloud = new CloudClient(window.LEDGER_CLOUD || {}), params = new URLSearchParams(location.search);
  let KEY = BASE, account = null, assignments = [], run = null, revision = 0, syncText = 'Saved in this browser', syncBusy = false, syncAgain = false, cloudBlocked = false;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  let scrollTop = false, st = null, sel = null, tab = 'office', rows = [], fresh = new Set(), shown = {cash: 0, rev: 0, ni: 0};
  function save() {
    localStorage.setItem(KEY, JSON.stringify({run, revision}));
    if (account?.role === 'student' && !params.has('preview')) sync();
  }
  function act(kind, payload = {}) {
    let result;
    if (kind === 'handle') result = S.handle(st, payload.id, payload.action);
    else if (kind === 'advance') result = S.advance(st);
    else if (kind === 'complete') result = {ok: S.complete(st)};
    else result = {ok: S.nextMonth(st)};
    if (kind === 'handle' ? (result.ok || st.tries[payload.id]) : result.ok) run.events.push({kind, ...payload});
    return result;
  }
  async function sync() {
    if (cloudBlocked) return;
    if (syncBusy) { syncAgain = true; return; }
    syncBusy = true; syncText = 'Saving to account…';
    const sent = JSON.parse(JSON.stringify(run));
    try {
      const r = await cloud.call('office-save', {revision, run: sent}); revision = r.revision; syncText = 'Saved to account · scores synced';
      localStorage.setItem(KEY, JSON.stringify({run, revision}));
    } catch(e) { syncText = 'Saved on this device · ' + e.message; if (/another tab|changed|Earlier office/.test(e.message)) cloudBlocked = true; }
    syncBusy = false;
    const el = $('#sync-status'); if (el) el.textContent = syncText;
    if (syncAgain) { syncAgain = false; sync(); }
  }
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
    f.onsubmit = (e) => { e.preventDefault(); const config = {type: f.type.value, name: f.name.value, founder: f.founder.value, city: f.city.value, seed: 1 + Math.floor(Math.random() * 999999999)}; run = {config, events: []}; st = S.newGame(config); save(); fresh = new Set(S.open(st).map((x) => x.id)); sel = null; const f0 = S.open(st)[0]; if (f0) select(f0.id); render(); };
  }

  const initials = (n) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const sum = () => S.summary(st);
  const APPS = {mail: ['Mail', 'M'], books: ['Books', 'B'], bank: ['Bank', '$'], msgs: ['Messages', '…']};
  let wins = JSON.parse(localStorage.getItem(KEY + '-wins') || 'null') || ['mail', 'books'], btab = 'record', rec = null, msel = null, toasts = [];
  const saveWins = () => localStorage.setItem(KEY + '-wins', JSON.stringify(wins));
  const specsOf = (it) => { const x = V(it.doc); return Array.isArray(x) ? x : [x]; };
  const chan = (it) => (specsOf(it)[0].type === 'text' ? 'msgs' : 'mail');
  const visible = () => S.inbox(st);
  const pending = (c) => visible().filter((it) => !st.done[it.id] && (!c || chan(it) === c));
  const short = (day) => S.fmtDate(st, day, 'short').slice(0, 5);
  const canNext = () => st.m + 1 < S.months.length && (account && (account.role !== 'student' || params.has('preview')) || assignments.some(a => S.findLesson(a.lessonId)?.index >= st.m + 1));

  let guideStep = null, guideDismissed = false;
  const guideSteps = [
    {title: 'Welcome to your office', text: 'You own this business. Read what comes in, make the business decisions, and record what happened. This guide is a demonstration only: it won’t change your business or your grade.', visual: '<div class="guide-apps"><span>Mail</span><span>Books</span><span>Bank</span><span>Messages</span></div>', tip: 'Your company and its books carry forward from one period to the next.'},
    {title: 'Read the mail. Make the call.', text: 'Open the messages waiting in Mail or Messages. When someone needs a decision, choose your reply and click Send reply. Your choice can produce an invoice, receipt or other paperwork to record.', visual: '<div class="guide-mail"><small>Jordan Pike · Operations</small><b>We’re running low on supplies</b><p>Can you approve the next delivery?</p><span class="guide-reply">Reply: Approve delivery</span></div>', tip: 'Business decisions aren’t graded. Your accounting is.'},
    {title: 'Keep the books beside the paperwork', text: 'Mail and Books open side by side on a larger screen. Record the transaction in Books and click Post entry. If a document isn’t a transaction, use No entry needed. On a phone, use the app buttons at the bottom to switch.', visual: '<div class="guide-split"><div><b>Mail</b><span>Invoice · supplies delivered</span><strong>$240.00</strong></div><div><b>Books</b><span>Supplies · debit $240</span><span>Accounts payable · credit $240</span><strong>Post entry</strong></div></div>', tip: 'The layout buttons at the bottom show one, two or three apps. Bank shows the cash activity you’ve recorded.'},
    {title: 'Done today? Close up for the day.', text: 'Finish every item waiting on you. Then click Close up for the day to move to the next business date and receive new messages and documents. The simulation waits for you; it doesn’t advance by itself.', visual: '<ol class="guide-cycle"><li>Handle today’s items</li><li><strong>Close up for the day</strong></li><li>New mail arrives</li></ol>', tip: 'A banner appears when today’s work is finished. At the end of a period, Finish this period opens your report.'},
  ];
  function openGuide() {
    guideStep = 0;
    drawGuide();
    $('#office-tour').showModal();
    $('#guide-title').focus();
  }
  function dismissGuide() {
    guideStep = null; guideDismissed = true;
    try { localStorage.setItem(KEY + '-guide-v1', 'seen'); } catch {}
    $('#office-tour').close();
    $('#office-guide').focus();
  }
  function drawGuide() {
    const step = guideSteps[guideStep], dialog = $('#office-tour');
    dialog.innerHTML = `<div class="guide-content"><div class="guide-heading"><span>Office guide · ${guideStep + 1} of ${guideSteps.length}</span><button class="link" id="guide-skip">Skip guide</button></div><h2 id="guide-title" tabindex="-1">${step.title}</h2><p id="guide-description">${step.text}</p><div class="guide-demo"><small>Example only · not your business records</small>${step.visual}</div><p class="guide-tip">${step.tip}</p><div class="guide-actions">${guideStep ? '<button class="btn" id="guide-back">Back</button>' : ''}<button class="btn primary" id="guide-next">${guideStep === guideSteps.length - 1 ? 'Start working' : 'Next'}</button></div><p class="guide-reopen">You can reopen this anytime using Office guide in the bottom bar.</p></div>`;
    $('#guide-skip').onclick = dismissGuide;
    $('#guide-next').onclick = () => { if (guideStep === guideSteps.length - 1) dismissGuide(); else { guideStep++; drawGuide(); } };
    if ($('#guide-back')) $('#guide-back').onclick = () => { guideStep--; drawGuide(); };
    dialog.oncancel = e => { e.preventDefault(); dismissGuide(); };
    $('#guide-title').focus();
  }
  function maybeShowGuide() {
    if (guideDismissed || st.ended || params.has('preview') || account && account.role !== 'student') return;
    let seen = false;
    try { seen = localStorage.getItem(KEY + '-guide-v1') === 'seen'; } catch {}
    if (!seen) openGuide();
  }

  function nextDayPrompt() {
    if (st.ended || S.open(st).length) return '';
    const next = S.nextDay(st);
    return `<section class="day-ready" aria-labelledby="day-ready-title"><div role="status"><h2 id="day-ready-title">Today’s work is finished.</h2><p>${next != null ? `Close up for the day to continue to ${esc(S.fmtDate(st, next, 'day'))} and receive new mail and paperwork.` : 'You’ve reached the end of this period. Finish it to see your business results and bookkeeping report.'}</p></div><button class="btn primary" ${next != null ? 'data-next-day' : 'data-finish-period'}>${next != null ? 'Close up for the day' : 'Finish this period'}</button></section>`;
  }

  function taskbar() {
    const m = S.current(st), dt = new Date(Date.UTC(m.start[0], m.start[1] - 1, st.day));
    const wd = dt.toLocaleDateString('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'});
    const open = S.open(st).length, next = S.nextDay(st);
    const badge = (a) => { const n = a === 'books' ? visible().filter((it) => it.kind === 'doc' && !st.done[it.id]).length : a === 'bank' ? 0 : pending(a).length; return n ? `<i class="badge">${n}</i>` : ''; };
    return `<footer class="task"><div class="t-co"><i>${esc(initials(st.biz.name))}</i><span><b>${esc(st.biz.name)}, Inc.</b><small>${esc(S.prof(st).type)} · ${esc(S.place(st).city)}, ${esc(S.place(st).state)}</small></span></div>
<nav class="dock">${Object.entries(APPS).map(([k, [t, g]]) => `<button data-app="${k}" class="${wins.includes(k) ? 'on' : ''}" title="${t}"><span class="ico ico-${k}">${g}</span><em>${t}</em>${badge(k)}</button>`).join('')}</nav>
<div class="snap" title="Screen layout">${[1, 2, 3].map((n) => `<button data-snap="${n}" class="${wins.length === n ? 'on' : ''}" aria-label="${n} app${n > 1 ? 's' : ''} side by side">${'<span></span>'.repeat(n)}</button>`).join('')}</div>
<div class="t-cash"><small>Cash</small><b id="k-cash">${money(shown.cash, 1)}</b><em id="k-delta"></em></div>
<button class="office-help" id="office-guide" aria-haspopup="dialog">Office guide</button><div class="t-day">${st.ended ? '' : open ? `<div class="day-waiting"><button class="btn" disabled aria-describedby="waiting-help">${open} waiting</button><small id="waiting-help">Handle these items to end today.</small></div>` : next != null ? `<button class="btn primary" id="next" data-next-day>Close up for the day</button>` : `<button class="btn primary" id="close" data-finish-period>Finish this period</button>`}<span class="clock"><b id="cal-d">${esc(wd)}</b><small>${open ? '9:00 AM' : '5:30 PM'}</small></span></div></footer>`;
  }

  const win = (k, body, extra = '') => `<section class="win w-${k}" data-win="${k}"><header class="win-h"><span class="ico ico-${k}">${APPS[k][1]}</span><b>${APPS[k][0]}</b>${extra}<span class="win-c">${wins.length > 1 ? `<button data-max="${k}" title="Full screen">▢</button><button data-min="${k}" title="Close">×</button>` : ''}</span></header><div class="win-b">${body}</div></section>`;

  function listItem(it, cur) {
    return `<li class="${st.done[it.id] ? 'done' : 'new'} ${cur === it.id ? 'sel' : ''} ${fresh.has(it.id) ? 'arrive' : ''}" data-mail="${it.id}"><b>${esc(V(it.from))}</b><small>${short(it.day)}</small><span>${esc(V(it.subject))}</span>${it.kind === 'decision' && !st.done[it.id] ? '<em>Reply needed</em>' : ''}</li>`;
  }

  function reader(it) {
    if (!it) return `<div class="empty"><p>${pending().length ? 'Select a message to read it.' : 'You’re caught up for today.'}</p></div>`;
    const specs = specsOf(it), head = specs[0].type === 'email' || specs[0].type === 'text';
    const atts = head ? specs.slice(1) : specs;
    let act = '';
    if (it.kind === 'decision') {
      act = st.done[it.id] ? `<div class="sent"><b>You replied</b><p>${esc(V(it.outcome))}</p></div>`
        : `<form class="reply" id="decide"><h4>Reply</h4>${V(it.q).map((q) => `<fieldset><legend>${esc(q.label)}</legend><div class="chips">${q.opts.map((o) => `<label class="chip"><input type="radio" name="${q.id}" value="${o.v}"><b>${esc(S.V(o.t, st))}</b><span>${esc(o.d)}</span></label>`).join('')}</div></fieldset>`).join('')}<button class="btn primary">Send reply</button><p class="fb" id="fb"></p></form>`;
    } else if (!st.done[it.id]) act = `<div class="torec"><span>Record this in Books${wins.includes('books') ? ', it’s open beside you' : ''}.</span>${wins.includes('books') ? '' : '<button class="btn primary" data-rec="' + it.id + '">Open in Books</button>'}</div>`;
    return `<div class="read">${head ? '' : `<div class="mhead"><b>${esc(V(it.from))}</b><span>${esc(V(it.subject))}</span><small>${esc(S.fmtDate(st, it.day, 'day'))}</small></div>`}<div class="papers">${head ? D.render(specs[0]) : ''}${atts.length ? `<div class="atts">${head ? `<small class="att-l">${atts.length} attachment${atts.length > 1 ? 's' : ''}</small>` : ''}${atts.map((x) => D.render(x)).join('')}</div>` : ''}${st.done[it.id] && it.kind === 'doc' ? `<div class="stamp-big ${S.want(st, it) ? '' : 'none'}">${S.want(st, it) ? 'POSTED' : 'NO ENTRY'}</div>` : ''}</div>${act}</div>`;
  }

  function mailApp(c) {
    const list = visible().filter((it) => chan(it) === c).reverse(), cur = c === 'mail' ? sel : msel;
    const it = cur && list.find((x) => x.id === cur);
    const n = list.filter((x) => !st.done[x.id]).length;
    return win(c, `<div class="mail ${it ? 'has' : ''}"><ul class="mlist">${list.map((x) => listItem(x, cur)).join('') || '<li class="none">No messages yet.</li>'}</ul><div class="mread">${it ? `<button class="back" data-back="${c}">‹ ${APPS[c][0]}</button>` : ''}${reader(it)}</div></div>`, `<small class="win-s">${n ? n + ' unread' : 'All read'}</small>`);
  }

  function acctOpts(it, v) {
    const list = V(it.accts) || Object.keys(ACC);
    return `<option value="">Choose account…</option>${list.map((a) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(ACC[a][0])}</option>`).join('')}`;
  }
  const entryTable = (j) => `<table class="jt">${j.lines.map(([a, s, x]) => `<tr class="${s}"><td>${esc(ACC[a][0])}</td><td>${s === 'dr' ? money(x, 1) : ''}</td><td>${s === 'cr' ? money(x, 1) : ''}</td></tr>`).join('')}</table>`;

  function recordView() {
    const todo = visible().filter((it) => it.kind !== 'decision');
    const it = rec && todo.find((x) => x.id === rec);
    const queue = `<div class="queue">${todo.filter((x) => !st.done[x.id]).map((x) => `<button data-rec="${x.id}" class="${rec === x.id ? 'on' : ''}">${esc(V(x.subject))}</button>`).join('')}</div>`;
    if (!it) return queue + `<div class="empty"><p>${todo.some((x) => !st.done[x.id]) ? 'Pick a document to record.' : 'Your books are up to date.'}</p></div>`;
    const pin = wins.includes(chan(it)) && (chan(it) === 'mail' ? sel : msel) === it.id ? '' : `<details class="pin"><summary>View the document</summary><div class="papers">${specsOf(it).map((x) => D.render(x)).join('')}</div></details>`;
    if (st.done[it.id]) { const j = st.book.find((b) => b.id === it.id); return queue + `<div class="rec"><span class="tag ok">${it.kind === 'work' ? 'Filed' : j ? 'Posted' : 'No entry needed'}</span><h3>${esc(V(it.subject))}</h3>${j ? entryTable(j) : ''}<p class="why">${esc(V(it.why))}</p></div>`; }
    if (it.kind === 'work') return queue + `<form class="rec" id="worksheet"><h3>${esc(V(it.subject))}</h3>${pin}<p>Complete the business worksheet from your records. Use Statements and Trial balance in Books as needed.</p>${V(it.fields).map(f => `<label>${esc(f.label)}<input name="${esc(f.id)}" inputmode="decimal" required></label>`).join('')}<button class="btn primary">File worksheet</button><p class="fb" id="fb"></p></form>`;
    if (!rows.length) rows = [{a: '', d: '', c: ''}, {a: '', d: '', c: ''}];
    const miss = st.misses[it.id] || 0;
    return queue + `<div class="rec" id="recp"><div class="rec-h"><small>New journal entry · ${esc(short(it.day))}</small><h3>${esc(V(it.subject))}</h3><small class="muted">From ${esc(V(it.from))}</small></div>${pin}
<div class="je" id="je"><div class="je-h"><span>Account</span><span>Debit</span><span>Credit</span></div>${rows.map((r, i) => `<div class="je-r ${r.c && !r.d ? 'cr' : ''}"><select data-i="${i}" data-k="a">${acctOpts(it, r.a)}</select><input data-i="${i}" data-k="d" inputmode="decimal" value="${esc(r.d)}" aria-label="Debit"><input data-i="${i}" data-k="c" inputmode="decimal" value="${esc(r.c)}" aria-label="Credit"></div>`).join('')}
<div class="je-t"><button class="link" id="addrow">+ Add line</button><span id="je-tot"></span></div></div>
<div class="acts"><button class="btn primary" id="post">Post entry</button><button class="btn" id="noentry">No entry needed</button></div><p class="fb" id="fb"></p>${miss >= 2 ? '<button class="link" id="reveal">Show me the entry</button>' : ''}</div>`;
  }

  function booksApp() {
    const s = sum();
    let body;
    if (btab === 'record') body = recordView();
    else if (btab === 'journal') body = st.book.length ? `<table class="gj"><thead><tr><th>Date</th><th>Account and explanation</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead>${st.book.map((j) => `<tbody>${j.lines.map(([a, sd, x], i) => `<tr><td>${i ? '' : esc(j.date || short(j.day))}</td><td class="${sd}">${esc(ACC[a][0])}</td><td class="r">${sd === 'dr' ? money(x, 1) : ''}</td><td class="r">${sd === 'cr' ? money(x, 1) : ''}</td></tr>`).join('')}<tr class="memo"><td></td><td colspan="3">${esc(j.memo)}</td></tr></tbody>`).join('')}</table>` : '<p class="muted pad">No entries yet.</p>';
    else if (btab === 'ledger') body = `<div class="tgrid">${Object.keys(ACC).filter((a) => st.led[a]).map((a) => { const l = st.led[a]; return `<div class="t"><h4>${esc(ACC[a][0])}</h4><div class="tb"><div>${l.dr.map((x) => `<span>${money(x.x, 1)}</span>`).join('')}</div><div>${l.cr.map((x) => `<span>${money(x.x, 1)}</span>`).join('')}</div></div><div class="tbal ${LL.dn(a) ? '' : 'crb'}">${money(S.bal(st, a), 1)}</div></div>`; }).join('') || '<p class="muted">No postings yet.</p>'}</div>`;
    else if (btab === 'statements') body = statementView();
    else { const tb = S.trialBalance(st), Dt = tb.reduce((t, r) => t + r[2], 0), Ct = tb.reduce((t, r) => t + r[3], 0); body = `<p class="muted pad">${esc(st.biz.name)}, Inc. · ${esc(S.fmtDate(st, st.day))}</p><table class="gj tbt"><thead><tr><th>Account</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead><tbody>${tb.map(([, n, d, c]) => `<tr><td>${esc(n)}</td><td class="r">${d ? money(d, 1) : ''}</td><td class="r">${c ? money(c, 1) : ''}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="r">${money(Dt, 1)}</td><td class="r">${money(Ct, 1)}</td></tr></tbody></table>`; }
    return win('books', `<nav class="btabs">${[['record', 'Record'], ['journal', 'Journal'], ['ledger', 'Ledger'], ['tb', 'Trial balance'], ['statements', 'Statements']].map(([k, t]) => `<button data-btab="${k}" class="${btab === k ? 'on' : ''}">${t}</button>`).join('')}<span class="bk"><small>Revenue</small><b id="k-rev">${money(shown.rev, 1)}</b><small>Net income</small><b id="k-ni">${money(shown.ni, 1)}</b></span></nav><div class="bbody">${body}</div>`, `<small class="win-s">${esc(st.biz.name)}, Inc.</small>`);
  }

  function statementView() {
    const f = S.statements(st), signed = (a) => S.r2((st.led[a]?.dr || []).reduce((n,x)=>n+x.x,0) - (st.led[a]?.cr || []).reduce((n,x)=>n+x.x,0));
    const rows = types => Object.entries(ACC).filter(([a,v]) => types.includes(v[1]) && signed(a)).map(([a,v]) => [v[0], ['L','SE','R'].includes(v[1]) ? -signed(a) : signed(a)]);
    const table = (title, rows) => `<h3>${title}</h3><table class="gj"><tbody>${rows.map(([label,x])=>`<tr><td>${esc(label)}</td><td class="r">${money(x,1)}</td></tr>`).join('')}</tbody></table>`;
    return `<div class="statements"><p>${esc(st.biz.name)}, Inc. · ${esc(S.fmtDate(st,st.day))}</p>${table('Income statement · since the last close',[...rows(['R','XR','E']),['Net income',f.netIncome]])}${table('Balance sheet',[...rows(['A','XA']),['Total assets',f.assets],...rows(['L']),['Total liabilities',f.liabilities],...rows(['SE','XSE']),['Unclosed net income',f.netIncome],['Total equity',f.equity]])}${table('Cash flows · current period',[['Operating activities',f.operating],['Investing activities',f.investing],['Financing activities',f.financing],['Net cash change',f.change],['Ending cash',f.cash]])}</div>`;
  }

  function bankApp() {
    let run = 0;
    const tx = st.book.filter((j) => j.lines.some((l) => l[0] === 'cash')).map((j) => { const x = j.lines.filter((l) => l[0] === 'cash').reduce((t, [, sd, v]) => t + (sd === 'dr' ? v : -v), 0); run += x; return {j, x, run}; }).reverse();
    return win('bank', `<div class="bank"><div class="bk-h"><small>Heartland Community Bank · Business Checking ••••8837</small><span>Available balance</span><b>${money(S.bal(st, 'cash'), 1)}</b></div><table class="gj bk-t"><thead><tr><th>Date</th><th>Description</th><th class="r">Amount</th><th class="r">Balance</th></tr></thead><tbody>${tx.map(({j, x, run}) => `<tr><td>${esc(j.date || short(j.day))}</td><td>${esc(j.memo)}</td><td class="r ${x < 0 ? 'neg' : 'pos'}">${x < 0 ? '−' : '+'}${money(Math.abs(x), 1)}</td><td class="r">${money(run, 1)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No activity yet.</td></tr>'}</tbody></table><p class="muted pad">Shows deposits and payments you have recorded in Books.</p></div>`);
  }

  function monthEnd() {
    const s = st.periodReports?.[st.m] || S.statements(st), mo = S.current(st), result = st.results?.[mo.lessonId] || s;
    const custs = st.book.filter((j) => /sales, week/.test(j.memo)).length;
    return `<section class="report"><div class="rp-card"><small>${esc(mo.n)} report</small><h1>${esc(st.biz.name)} made it through ${esc(mo.title.toLowerCase())}</h1>
<div class="rp-k"><div><small>Revenue</small><b>${money(s.revenue, 1)}</b></div><div><small>Expenses</small><b>${money(s.expenses, 1)}</b></div><div><small>Net income</small><b class="${s.netIncome < 0 ? 'neg' : ''}">${money(s.netIncome, 1)}</b></div><div><small>Cash in the bank</small><b>${money(s.cash, 1)}</b></div></div>
<div class="rp-two"><div><h3>Your decisions</h3><ol class="rp-log">${st.log.map((l) => `<li>${esc(l.text)}</li>`).join('')}</ol></div><div><h3>Your bookkeeping</h3><p class="rp-score"><b>${result.first}</b> of ${result.graded} recorded correctly on the first try (${result.score}%).</p><p class="muted">${custs} weeks of register sales recorded. Your trial balance ${Math.abs(S.trialBalance(st).reduce((t, r) => t + r[2] - r[3], 0)) < 0.005 ? 'is in balance' : 'is out of balance'}.</p><button class="btn" id="rp-books">Review your books</button></div></div>
<p class="muted rp-note">${S.months[st.m + 1] ? esc(S.months[st.m + 1].title) + (canNext() ? ' is ready. Your books and decisions carry forward.' : ' opens when assigned by your instructor.') : 'Year-end complete. Your business records remain available.'}</p>${canNext() ? '<button class="btn primary" id="continue">Continue to the next period</button>' : '<a class="btn" href="index.html">Return home</a>'}</div></section>`;
  }

  function render() {
    if (!st) return setup();
    document.body.dataset.v = 'office';
    const it = sel && S.inbox(st).find((x) => x.id === sel);
    const ws = st.ended && !st.review ? `<div class="wins n1">${monthEnd()}</div>` : `<div class="wins n${wins.length}">${wins.map((k) => (k === 'books' ? booksApp() : k === 'bank' ? bankApp() : mailApp(k))).join('')}</div>`;
    const nextPrompt = nextDayPrompt();
    root.innerHTML = `<div class="os ${nextPrompt ? 'day-finished' : ''}"><div class="desk-bg"><span>${esc(st.biz.name)}</span></div>${nextPrompt}${ws}<div class="toasts">${toasts.map((t, i) => `<div class="toast" style="animation-delay:${i * 0.25}s,${3 + i * 0.25}s"><span class="ico ico-${t.c}">${APPS[t.c][1]}</span><div><b>${esc(t.from)}</b><span>${esc(t.sub)}</span></div></div>`).join('')}</div>${taskbar()}</div><div class="office-save"><a href="index.html">Home</a><span id="sync-status" role="status">${esc(syncText)}</span>${st.ended ? '<button class="link" id="report">Period report</button>' : ''}${!account || account.role !== 'student' || params.has('preview') ? '<button class="link" id="reset">Restart practice company</button>' : ''}</div><dialog class="office-tour" id="office-tour" aria-labelledby="guide-title" aria-describedby="guide-description"></dialog>`;
    toasts = [];
    wire(it);
    animateKpis();
    fresh.clear();
    maybeShowGuide();
  }

  function select(id) {
    const it = S.inbox(st).find((x) => x.id === id); if (!it) return;
    if (chan(it) === 'mail') sel = id; else msel = id;
    if (it.kind !== 'decision' && !st.done[id] && rec !== id) { rec = id; rows = []; btab = 'record'; }
  }
  function show(k, front) {
    if (wins.includes(k)) return;
    if (innerWidth < 820 || front) wins = [k, ...wins.filter((w) => w !== k)].slice(0, Math.max(1, wins.length));
    else wins[wins.length - 1] = k;
    saveWins();
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

  function readRows() { $$('#je [data-i]').forEach((el) => { if (rows[+el.dataset.i]) rows[+el.dataset.i][el.dataset.k] = el.value; }); }
  function totals() {
    readRows();
    const n = (v) => +String(v).replace(/[$,\s]/g, '') || 0, dsum = rows.reduce((t, r) => t + n(r.d), 0), csum = rows.reduce((t, r) => t + n(r.c), 0);
    const el = $('#je-tot'); if (el) { el.textContent = `Debits ${money(dsum, 1)} · Credits ${money(csum, 1)}`; el.className = dsum && Math.abs(dsum - csum) < 0.005 ? 'bal' : ''; }
  }
  function feedback(r) { const fb = $('#fb'); if (!fb) return; fb.innerHTML = r.text; fb.className = 'fb ' + (r.ok ? 'ok' : 'bad'); if (!r.ok) { const p = $('#recp') || $('#decide') || $('#worksheet'); if (p) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); } } }

  function wire(it) {
    $('#office-guide').onclick = openGuide;
    $$('[data-app]').forEach((b) => (b.onclick = () => { const k = b.dataset.app; if (wins.includes(k)) { if (innerWidth < 820) { wins = [k, ...wins.filter((w) => w !== k)]; saveWins(); } } else show(k, true); st.review = st.ended ? true : st.review; render(); }));
    $$('[data-snap]').forEach((b) => (b.onclick = () => { const n = +b.dataset.snap, pool = [...wins, ...['mail', 'books', 'bank', 'msgs'].filter((k) => !wins.includes(k))]; wins = pool.slice(0, n); saveWins(); render(); }));
    $$('[data-min]').forEach((b) => (b.onclick = () => { wins = wins.filter((k) => k !== b.dataset.min); saveWins(); render(); }));
    $$('[data-max]').forEach((b) => (b.onclick = () => { wins = [b.dataset.max]; saveWins(); render(); }));
    $$('[data-mail]').forEach((li) => (li.onclick = () => { select(li.dataset.mail); render(); }));
    $$('[data-back]').forEach((b) => (b.onclick = () => { if (b.dataset.back === 'mail') sel = null; else msel = null; render(); }));
    $$('[data-rec]').forEach((b) => (b.onclick = () => { if (rec !== b.dataset.rec) rows = []; rec = b.dataset.rec; btab = 'record'; show('books'); render(); }));
    $$('[data-btab]').forEach((b) => (b.onclick = () => { btab = b.dataset.btab; render(); }));
    if ($('#rp-books')) $('#rp-books').onclick = () => { st.review = true; btab = 'journal'; if (!wins.includes('books')) wins = ['books']; render(); };
    if ($('#reset')) $('#reset').onclick = () => { if (confirm('Start over with a new business? Your current books will be erased.')) { localStorage.removeItem(KEY); st = null; sel = msel = rec = null; shown = {cash: 0, rev: 0, ni: 0}; render(); } };
    $$('[data-next-day]').forEach(b => b.onclick = () => {
      const r = act('advance'); save(); const arr = r.arrived || [];
      arr.forEach((id) => fresh.add(id)); sel = msel = rec = null; rows = [];
      const items = arr.map((id) => S.inbox(st).find((x) => x.id === id));
      toasts = items.slice(0, 3).map((x) => ({c: chan(x), from: V(x.from), sub: V(x.subject)}));
      if (items[0]) select(items[0].id);
      root.classList.add('turning'); setTimeout(() => root.classList.remove('turning'), 650); render();
    });
    $$('[data-finish-period]').forEach(b => b.onclick = () => { act('complete'); save(); render(); });
    if ($('#continue')) $('#continue').onclick = () => { if (!canNext()) return; act('next'); sel = msel = rec = null; rows = []; btab = 'record'; const first = S.open(st)[0]; if(first) select(first.id); save(); render(); };
    if ($('#report')) $('#report').onclick = () => { st.review = false; render(); };
    if ($('#decide')) $('#decide').onsubmit = (e) => {
      e.preventDefault(); const f = e.target, ch = {};
      V(it.q).forEach((q) => { const v = f.querySelector(`input[name="${q.id}"]:checked`); if (v) ch[q.id] = q.opts.find((o) => String(o.v) === v.value).v; });
      const r = act('handle', {id: it.id, action: {choice: ch}}); if (!r.ok) return feedback(r);
      save(); const nu = S.open(st).filter((x) => x.id !== it.id);
      nu.forEach((x) => fresh.add(x.id)); toasts = nu.slice(0, 2).map((x) => ({c: chan(x), from: V(x.from), sub: V(x.subject)}));
      render();
    };
    if ($('#je')) {
      $('#je').oninput = totals; totals();
      $('#addrow').onclick = () => { readRows(); rows.push({a: '', d: '', c: ''}); render(); };
      const cur = S.inbox(st).find((x) => x.id === rec);
      $('#post').onclick = () => { readRows(); finish(act('handle', {id: rec, action: {rows: JSON.parse(JSON.stringify(rows))}})); };
      $('#noentry').onclick = () => { readRows(); finish(act('handle', {id: rec, action: {noEntry: true}})); };
      if ($('#reveal')) $('#reveal').onclick = () => { const r = S.handle(st, rec, {reveal: true}); if (r.reveal) { rows = r.reveal.map(([a, sd, x]) => ({a, d: sd === 'dr' ? String(x) : '', c: sd === 'cr' ? String(x) : ''})); render(); feedback({ok: true, text: 'Here is the entry. Post it to continue. This item no longer counts as correct on the first try.'}); } };
      void cur;
    }
    if ($('#worksheet')) $('#worksheet').onsubmit = e => { e.preventDefault(); finish(act('handle', {id: rec, action: {values: Object.fromEntries(new FormData(e.target))}})); };
    function finish(r) {
      if (!r.ok) { save(); if ((st.misses[rec] || 0) === 2) render(); return feedback(r); }
      save(); rows = []; const done = rec;
      const nxt = S.open(st).find((x) => x.kind !== 'decision');
      if (nxt && (sel === done || msel === done)) { /* keep the posted document visible with its stamp */ }
      render();
      const stamp = $('.stamp-big'); if (stamp) stamp.classList.add('hit');
      const p = $('.w-books .rec'); if (p) p.classList.add('ok-pulse');
    }
  }

  async function init() {
    root.innerHTML = '<p class="pad">Opening your office…</p>';
    if (cloud.configured && cloud.session) {
      try {
        const b = await cloud.call('bootstrap'); account = b.user; assignments = b.lessons || [];
        KEY += '-' + account.id + (params.has('preview') || account.role !== 'student' ? '-preview' : '');
        if (account.role === 'student' && !params.has('preview')) {
          const remote = await cloud.call('office-load'), local = load(); revision = remote.revision;
          run = remote.run;
          if (local?.run && local.revision === revision && (!run || JSON.stringify(local.run.events.slice(0,run.events.length)) === JSON.stringify(run.events))) run = local.run;
          syncText = 'Saved to account';
        } else run = load()?.run;
      } catch(e) { root.innerHTML = `<p class="pad" role="alert">${esc(e.message)} <a href="index.html#signin">Return to sign in</a></p>`; return; }
    } else run = load()?.run;
    try { st = run ? S.replay(run) : null; } catch(e) { root.innerHTML = `<p class="pad" role="alert">Your saved office could not be restored. Your record is still saved; please contact your instructor. ${esc(e.message)}</p>`; return; }
    const target = S.findLesson(params.get('lesson'));
    if (target && target.index > (st?.m || 0)) syncText += ` · ${target.title} follows earlier periods. Continue your business below.`;
    const first = st && S.open(st)[0]; if (first) select(first.id);
    render();
    if (st && account?.role === 'student' && !params.has('preview')) sync();
  }
  init();
})();
