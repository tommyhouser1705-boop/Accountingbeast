const test = require('node:test');
const assert = require('node:assert');
require('./lessons-engine.js');
require('./sim-docs.js');
const S = require('./sim-engine.js');
require('./sim-month1.js');

const paths = [
  {invest: 20000, site: 'prime', loan: 0, equip: 'used', price: 'low', mkt: 'none', corp: 'yes', div: 500},
  {invest: 40000, site: 'side', loan: 25000, equip: 'new', price: 'high', mkt: 'social', corp: 'no', div: 0},
  {invest: 30000, site: 'prime', loan: 15000, equip: 'new', price: 'std', mkt: 'flyers', corp: 'yes', div: 1500},
];
const answer = (w) => w.map(([a, s, x]) => ({a, d: s === 'dr' ? String(x) : '', c: s === 'cr' ? String(x) : ''}));

function play(type, path, seed = 11) {
  const st = S.newGame({type, name: '', founder: 'Alex Rivera', city: 'denver', seed});
  for (let guard = 0; guard < 60; guard++) {
    for (const it of S.open(st)) {
      const docs = [].concat(S.V(it.doc, st));
      for (const d of docs) {
        const html = SIMDOCS.render(d);
        assert.ok(html.length > 100, it.id + ' renders');
        assert.doesNotMatch(html, /undefined|NaN|\[object/, it.id + ' has no broken values');
      }
      let r;
      if (it.kind === 'decision') { const ch = {}; S.V(it.q, st).forEach((q) => (ch[q.id] = path[q.id])); r = S.handle(st, it.id, {choice: ch}); }
      else { const w = S.want(st, it); r = w ? S.handle(st, it.id, {rows: answer(w)}) : S.handle(st, it.id, {noEntry: true}); }
      assert.ok(r.ok, it.id + ': ' + r.text);
    }
    if (S.advance(st).monthEnd) break;
  }
  return st;
}

test('month 1 plays to the end for every business and decision path, and the books balance', () => {
  for (const type of ['bike', 'fitness', 'landscape', 'photo']) for (const p of paths) {
    const st = play(type, p);
    const tb = S.trialBalance(st), dr = tb.reduce((t, r) => t + r[2], 0), cr = tb.reduce((t, r) => t + r[3], 0);
    assert.strictEqual(Math.round(dr * 100), Math.round(cr * 100));
    const s = S.summary(st);
    assert.ok(s.graded >= 12 && s.score === 100, type + ' graded ' + s.graded);
    assert.ok(s.cash > 0);
  }
});

test('decisions change the numbers the student records', () => {
  const a = play('bike', paths[0]), b = play('bike', paths[1]);
  assert.notStrictEqual(S.summary(a).revenue, S.summary(b).revenue);
  assert.ok(a.book.some((j) => j.id === 'm1-repair') && !b.book.some((j) => j.id === 'm1-repair'));
  assert.ok(b.book.some((j) => j.id === 'm1-note') && !a.book.some((j) => j.id === 'm1-note'));
});

test('no-entry documents reject a journal entry, and real transactions reject "no entry"', () => {
  const st = S.newGame({type: 'photo', founder: 'Sam Lee', seed: 3});
  S.handle(st, 'm1-invest', {choice: {invest: 30000}});
  const r = S.handle(st, 'm1-stock', {noEntry: true});
  assert.ok(!r.ok);
  const wrong = S.handle(st, 'm1-stock', {rows: [{a: 'cash', d: '30000'}, {a: 'rev', c: '30000'}]});
  assert.ok(!wrong.ok && /Service Revenue/.test(wrong.text));
  assert.ok(S.handle(st, 'm1-stock', {rows: answer(S.want(st, S.current(st).items.find((i) => i.id === 'm1-stock')))}).ok);
  assert.strictEqual(S.summary(st).first, 0);
  assert.ok(!S.advance(st).ok === false);
});

test('the student cannot skip ahead while paperwork is waiting', () => {
  const st = S.newGame({type: 'bike', founder: 'A B', seed: 5});
  assert.strictEqual(S.advance(st).ok, false);
  assert.strictEqual(S.handle(st, 'm1-site', {choice: {site: 'side'}}).ok, false);
});
