const test = require('node:test');
const assert = require('node:assert/strict');
require('./lessons-engine');
require('./sim-docs');
require('./sim-engine');
require('./sim-month1');
require('./sim-course');
const S = global.SIM;
const rows = lines => lines.map(([a, side, x]) => ({a, d: side === 'dr' ? String(x) : '', c: side === 'cr' ? String(x) : ''}));
function playPeriod(st, last = false) {
  for (let count = 0; count < 200; count++) {
    const todo = S.open(st);
    if (!todo.length) {
      if (S.advance(st).monthEnd) { assert.ok(S.complete(st)); return; }
      continue;
    }
    for (const it of todo) {
      const docs = [].concat(S.V(it.doc, st));
      for (const d of docs) assert.doesNotMatch(SIMDOCS.render(d), /undefined|NaN|\[object/, it.id);
      const expected = S.want(st, it);
      if (expected) expected.forEach(([a, side, x]) => { assert.ok(LL.ACC[a], a); assert.ok(Number.isFinite(x) && x > 0, it.id + ' invalid amount ' + x); });
      const before = JSON.stringify(expected), beforeDoc = JSON.stringify(docs);
      const action = it.kind === 'decision' ? {choice: Object.fromEntries(S.V(it.q, st).map(q => [q.id, q.opts[last ? q.opts.length - 1 : 0].v]))}
        : it.kind === 'work' ? {values: Object.fromEntries(S.V(it.fields, st).map(f => [f.id, String(f.value)]))}
        : expected ? {rows: rows(expected)} : {noEntry: true};
      const r = S.handle(st, it.id, action);
      assert.ok(r.ok, it.id + ': ' + r.text);
      if (it.kind !== 'decision') {
        const saved = S.inbox(st).find(x => x.id === it.id);
        assert.equal(JSON.stringify(S.want(st, saved)), before, it.id + ' changes after posting');
        assert.equal(JSON.stringify([].concat(S.V(saved.doc, st))), beforeDoc, it.id + ' document changes after posting');
      }
      assert.ok(Math.abs(S.trialBalance(st).reduce((t, r) => t + r[2] - r[3], 0)) < 0.02, it.id + ' unbalanced');
      const f = S.statements(st);
      assert.ok(Math.abs(f.assets - f.liabilities - f.equity) < 0.03, it.id + ' financial statements do not balance');
    }
  }
  assert.fail('Period did not finish: ' + S.current(st).lessonId);
}

test('every simulation and review plays with balanced, stable paperwork across business types and decisions', () => {
  for (const type of Object.keys(LL.PROFILES)) for (const last of [false, true]) {
    const st = S.newGame({type, founder: 'Alex Rivera', name: 'Test Co', seed: 13});
    do {
      playPeriod(st, last);
      assert.equal(st.results[S.current(st).lessonId].score, 100);
      assert.ok(st.results[S.current(st).lessonId].graded >= 9, S.current(st).lessonId + ' too short');
    } while (S.nextMonth(st));
    assert.equal(Object.keys(st.results).length, 14);
    assert.equal(st.m, S.months.length - 1);
    for (const a of Object.keys(st.led).filter(a => ['R', 'XR', 'E'].includes(LL.ACC[a][1]) || a === 'div')) assert.ok(Math.abs(S.bal(st, a)) < 0.005, 'year-end did not close ' + a);
  }
});

test('month transition preserves books, dates and first-attempt accuracy', () => {
  const st = S.newGame({type: 'bike', seed: 11});
  assert.equal(S.nextMonth(st), false);
  assert.equal(S.handle(st, 'm1-invest', {choice: {invest: 999999}}).ok, false);
  playPeriod(st);
  const firstBook = JSON.stringify(st.book), ledger = JSON.stringify(st.led), first = st.first;
  assert.ok(S.nextMonth(st));
  assert.equal(JSON.stringify(st.book), firstBook);
  assert.equal(JSON.stringify(st.led), ledger);
  assert.equal(st.book[0].date, '09/01/2026');
  assert.equal(st.first, first);
  assert.deepEqual(st.mark, {first: st.first, graded: st.graded});
});
