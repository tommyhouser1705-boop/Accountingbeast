(function (root) {
  const S = root.SIM;
  S.replay = function (run) {
    const c = run?.config;
    if (!c || !['bike', 'fitness', 'landscape', 'photo'].includes(c.type) || !Number.isInteger(c.seed) || c.seed < 1 || c.seed > 1e9 || !Array.isArray(run.events) || run.events.length > 3000) throw Error('Invalid office record.');
    if (typeof c.name !== 'string' || c.name.length > 40 || typeof c.founder !== 'string' || c.founder.length > 40 || /[<>]/.test(c.name+c.founder) || !S.CITIES[c.city]) throw Error('Invalid business details.');
    const st = S.newGame(c);
    for (const e of run.events) {
      let ok = false;
      if (e.kind === 'handle' && e.action && !e.action.reveal && !st.ended) {
        const it = S.inbox(st).find(x => x.id === e.id && !st.done[x.id]);
        if (!it) throw Error('This document is not available.');
        const result = S.handle(st, e.id, e.action);
        // Incorrect attempts are part of the record and must be replayed too.
        ok = result.ok || st.tries[e.id] > 0;
      } else if (e.kind === 'advance' && !st.ended) ok = S.advance(st).ok;
      else if (e.kind === 'complete' && !st.ended) ok = S.complete(st);
      else if (e.kind === 'next') ok = S.nextMonth(st);
      if (!ok) throw Error('Invalid office progression.');
    }
    return st;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
