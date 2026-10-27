// Supplemental practice books. The standard business replay is never changed.
(function (root) {
  const S = root.SIM, L = root.Lessons || (typeof require !== 'undefined' ? require('./lesson-engine.js') : null), LL = root.LL;
  const clone = x => JSON.parse(JSON.stringify(x));
  LL.ACC.casecapital = ['Owner Capital', 'SE'];
  LL.ACC.casedrawings = ['Owner Drawings', 'XSE'];
  const aliases = {'owner withdrawals': 'casedrawings'};
  const account = name => Object.keys(LL.ACC).find(k => LL.ACC[k][0].toLowerCase() === name.toLowerCase()) || aliases[name.toLowerCase()];
  const lines = rows => rows.filter(r => r.debit || r.credit).map(r => {
    const a = account(r.account);
    if (!a) throw Error('The office does not support the account “' + r.account + '”. Revise the draft before assigning.');
    return [a, r.debit ? 'dr' : 'cr', LL.r2(r.debit || r.credit)];
  });
  const business = config => ({name: config.name, type: config.type === 'bike' ? 'Bike repair' : config.type === 'landscape' ? 'Landscaping company' : LL.PROFILES[config.type].type});
  const personal = (x, b) => L.personalize(x, b);
  function options(c, a, b) {
    const n = v => Math.max(c.min, Math.min(c.max, c.min + Math.round((v - c.min) / c.step) * c.step));
    const defaults = L.decisions.defaultChoice(a, b)[c.id];
    const values = c.kind === 'basket' ? [0.5, 1, 1.5].map(scale => Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, n(v * scale)]))) : [c.min, c.defaultValue, c.max];
    const unique = [...new Map(values.map(v => [JSON.stringify(v), v])).values()];
    return unique.map((value, i) => {
      const desc = c.kind === 'basket' ? L.decisions.catalog(c, b).filter(x => value[x.id]).map(x => value[x.id] + ' × ' + x.name).join(', ') || 'Do not order' : c.kind === 'money' ? LL.money(value, 1) : c.kind === 'date' ? 'Schedule for ' + L.decisions.dateValue(a, c, value) : String(value) + (/%|percent/i.test(c.label) ? '%' : '');
      return {v: i, label: 'Reply: ' + desc, desc: personal(c.purpose, b), value};
    });
  }
  function validate(a) {
    if (!L.checkAssignment(a) || !a.interactive) throw Error('Create a checked, interactive draft before assigning it.');
    a.blueprint.accounts.forEach(x => { if (!account(x.name)) lines([{account: x.name, debit: 1}]); });
    for (const type of Object.keys(LL.PROFILES)) {
      const b = business({type, name: 'Review business'}), defaults = L.decisions.defaultChoice(a, b);
      const choices = [defaults];
      for (const c of a.interactive.controls) for (const opt of options(c, a, b)) choices.push({...defaults, [c.id]: opt.value});
      for (const choice of choices) {
        if (!L.decisions.validChoice(a, choice, b)) throw Error('A reply option is outside the draft’s allowed quantities. Revise this draft.');
        const issues = L.decisions.economicIssues(a, choice, b);
        if (issues.length) throw Error('Review the accounting history: ' + issues.join('; '));
      }
    }
    return true;
  }
  function start(a, config) {
    const st = S.newGame(config), b = business(config), controls = a.interactive.controls;
    const origin = Date.UTC(a.year, a.month - 1, 1), day = date => Math.round((Date.parse(date + 'T00:00:00Z') - origin) / 86400000) + 1;
    const stage = c => L.decisions.controlStage(a, c), defaults = L.decisions.defaultChoice(a, b);
    st.caseChoices = clone(defaults);
    const scenario = () => L.expected(a, st.caseChoices, b);
    const initial = scenario();
    const events = initial.events.filter(e => !e.autoPosted && !L.decisions.isReportEvent(e));
    const find = id => scenario().events.find(e => e.id === id);
    const eventDay = e => day(e.date);
    const ready = e => controls.filter(c => stage(c) <= e.stage).every(c => st.done['reply-' + c.id]);
    const items = controls.map(c => {
      const relevant = events.filter(e => e.stage >= stage(c));
      const date = c.kind === 'date' ? L.decisions.dateValue(a, c, c.min) : relevant[0]?.date;
      const opts = options(c, a, b);
      return {id: 'reply-' + c.id, day: Math.max(1, Math.min(...relevant.map(eventDay), date ? day(date) : 1) - 1), kind: 'decision', from: 'Jordan Pike · Operations', subject: personal(c.label, b),
        when: () => controls.filter(x => stage(x) < stage(c)).every(x => st.done['reply-' + x.id]),
        doc: () => ({type: 'email', fromName: 'Jordan Pike', from: 'operations@business.example', to: b.name, subject: personal(c.label, b), date: S.fmtDate(st, st.day), body: '<p>' + escape(personal(c.purpose, b)) + '</p><p>Send your instructions using a reply below. We’ll keep the paperwork with the books.</p>', sig: 'Jordan Pike · Operations'}),
        q: [{id: c.id, label: personal(c.label, b), opts: opts.map(({v, label, desc}) => ({v, t: label, d: desc}))}],
        apply: (_, ch) => { st.caseChoices[c.id] = clone(opts[ch[c.id]].value); }, outcome: 'Instructions sent. The related paperwork will arrive in your inbox.'};
    });
    for (const e of events) items.push({id: e.id, kind: 'doc', get day() { return eventDay(find(e.id)); }, when: () => ready(e), from: () => L.personalizeDocument(find(e.id).detail.document, b).issuer,
      subject: personal(e.title, b), doc: () => {
        const now = find(e.id), d = L.personalizeDocument(now.detail.document, b);
        return {type: 'record', title: personal(e.title, b), no: e.id.toUpperCase(), date: now.date, ...d};
      }, lines: () => { const now = find(e.id), rows = L.decisions.suppliesCountLines(now) || now.lines; return rows.length ? lines(rows) : null; }});
    st.casePeriod = {title: a.title, instructions: personal(a.instructions,b), n: 'Supplemental case', label: 'Supplemental case', lessonId: 'supplement', start: [a.year, a.month], days: Math.round((Date.UTC(a.year, a.month - 1 + (a.periodMonths || 1), 1) - origin) / 86400000), items};
    const opening = lines(initial.openingBalances || a.blueprint.opening);
    if (opening.length) { LL.post(st, opening, 'case-opening'); st.book.push({id:'case-opening',opening:true,day:1,date:S.fmtDate(st,1),memo:'Opening balances · separate practice books',lines:opening}); }
    st.opening = clone(st.led);
    return st;
  }
  function escape(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function apply(st, e) {
    if (!e || st.ended) throw Error('This case is finished.');
    let result;
    if (e.kind === 'handle' && e.action && !e.action.reveal) result = S.handle(st, e.id, e.action);
    else if (e.kind === 'advance') result = S.advance(st);
    else if (e.kind === 'complete') result = {ok: S.complete(st)};
    else throw Error('Invalid case action.');
    if (!result.ok && !(e.kind === 'handle' && st.tries[e.id])) throw Error(result.text || 'Finish the available work first.');
    return result;
  }
  function replay(a, run) {
    // The standard replay validates business identity without running its events.
    S.replay({config: run.config, events: []});
    if (!Array.isArray(run.events) || run.events.length > 1000) throw Error('Invalid case record.');
    const st = start(a, run.config);
    for (const e of run.events) apply(st, e);
    return st;
  }
  function publicState(st) {
    const visible = new Set(S.inbox(st).map(x => x.id)), out = {};
    for (const [k, v] of Object.entries(st)) if (!['casePeriod', 'caseChoices', 'paper'].includes(k)) out[k] = clone(v);
    out.casePeriod = {...st.casePeriod, items: st.casePeriod.items.filter(it => !it.when || it.when(st)).map(it => {
      if (!visible.has(it.id)) return {id: it.id, kind: it.kind, day: it.day};
      const row = {id: it.id, kind: it.kind, day: it.day};
      for (const key of ['subject', 'from', 'doc', 'q', 'outcome']) if (it[key] != null) row[key] = clone(S.V(it[key], st));
      return row;
    })};
    return out;
  }
  root.SIMCases = {start, validate, replay, apply, publicState, business};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SIMCases;
})(typeof globalThis !== 'undefined' ? globalThis : this);
