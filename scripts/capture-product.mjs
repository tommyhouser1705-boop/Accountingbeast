// Capture the real UI with a disposable example business and class. No live account.
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const ctx = vm.createContext({console});
for (const file of ['lessons-engine.js', 'sim-docs.js', 'sim-engine.js', 'sim-month1.js', 'sim-course.js', 'sim-replay.js']) vm.runInContext(readFileSync(resolve(root, file), 'utf8'), ctx);
const S = ctx.SIM;
const run = {config: {type: 'bike', name: 'Spoke & Sprocket', founder: 'Alex Rivera', city: 'columbus', seed: 37}, events: []};
const state = S.newGame(run.config);
const choices = {invest: 40000, site: 'side', loan: 15000, equip: 'new', price: 'std', mkt: 'flyers', corp: 'yes', div: 0};
function handle(it) {
  const want = S.want(state, it);
  const action = it.kind === 'decision' ? {choice: Object.fromEntries(S.V(it.q, state).map(q => [q.id, choices[q.id]]))} : want ? {rows: want.map(([a, side, value]) => ({a, d: side === 'dr' ? String(value) : '', c: side === 'cr' ? String(value) : ''}))} : {noEntry: true};
  if (!S.handle(state, it.id, action).ok) throw Error('Unable to prepare example: ' + it.id);
  run.events.push({kind: 'handle', id: it.id, action});
}
function advance() {
  if (!S.advance(state).ok) throw Error('Unable to advance example');
  run.events.push({kind: 'advance'});
}
function until(id) {
  for (let guard = 0; guard < 100; guard++) {
    const item = S.open(state)[0];
    if (item?.id === id) return item;
    if (item) handle(item); else advance();
  }
  throw Error('Example not reached: ' + id);
}
const browser = await chromium.launch({headless: true});
try {
  async function office(file, saved = null, fill = null, compose = '') {
    const page = await browser.newPage({viewport: {width: 1600, height: 1040}, deviceScaleFactor: 1});
    // Block all remote traffic. These are local example records, not cloud saves.
    await page.route(/^https?:/, route => route.abort());
    await page.addInitScript(saved => {
      localStorage.clear(); sessionStorage.clear();
      if (saved) localStorage.setItem('ll-office-v2', JSON.stringify({run: saved, revision: 0}));
      localStorage.setItem('ll-office-v2-guide-v1', 'seen');
    }, saved);
    await page.goto(pathToFileURL(resolve(root, 'docs/office.html')).href);
    await page.locator(saved ? '.os' : '.setup').waitFor();
    if (saved) await page.waitForFunction(saved => document.querySelector('#k-cash').textContent === LL.money(SIM.summary(SIM.replay(saved)).cash, 1), saved);
    if (fill) {
      for (let i = 0; i < fill.length; i++) {
        const [account, side, value] = fill[i];
        await page.locator(`select[data-i="${i}"]`).selectOption(account);
        await page.locator(`input[data-i="${i}"][data-k="${side === 'dr' ? 'd' : 'c'}"]`).fill(String(value));
      }
    }
    if (compose === 'reply') {
      await page.locator('#decide input[value="new"]').evaluate(el => { el.checked = true; });
      await page.locator('#decide').evaluate(el => {
        for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollHeight > p.clientHeight && getComputedStyle(p).overflowY === 'auto') p.scrollTop = p.scrollHeight;
      });
    }
    if (compose === 'close') {
      await page.locator('[data-mail="m1-equip"]').click();
      await page.locator('[data-btab="journal"]').click();
    }
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({path: resolve(root, 'screens', file), type: 'jpeg', quality: 88, animations: 'disabled'});
    await page.close();
  }
  await office('office-setup.jpg');
  const decision = until('m1-equipq');
  await office('office-reply.jpg', JSON.parse(JSON.stringify(run)), null, 'reply');
  handle(decision);
  const bill = until('m1-equip');
  await office('office-books.jpg', JSON.parse(JSON.stringify(run)), S.want(state, bill));
  handle(bill);
  await office('office-day-end.jpg', JSON.parse(JSON.stringify(run)), null, 'close');
  advance();
  await office('office-next-day.jpg', JSON.parse(JSON.stringify(run)));

  const page = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
  const lessons = S.catalog.slice(0, 3).map((m, i) => ({id: 'example-' + i, class_id: 'example-class', lessonId: m.id, title: m.title, dueDate: ['2026-09-30', '2026-10-31', '2026-11-30'][i]}));
  const students = [
    ['alex@example.edu', 'Spoke & Sprocket', [92, 88]],
    ['jordan@example.edu', 'Northside Studio', [86, 93]],
    ['morgan@example.edu', 'Greenway Grounds', [100, 95, 91]],
    ['sam@example.edu', 'Frame & Field', [89]],
  ].map(([email, name, scores]) => ({email, business: {name}, lessonScores: scores.map((score, i) => ({assignment_id: lessons[i].id, score}))}));
  await page.addInitScript(() => sessionStorage.setItem('ledger-cloud-session', JSON.stringify({access_token: 'local-example', refresh_token: 'local-example', expires_at: Date.now() + 3600000})));
  await page.route(/^https?:/, async route => {
    if (!route.request().url().endsWith('/functions/v1/classroom')) return route.abort();
    const action = route.request().postDataJSON().action;
    const value = action === 'bootstrap' ? {user: {id: 'example-instructor', email: 'instructor@example.edu', role: 'professor'}, classes: [{id: 'example-class', name: 'Introductory Accounting · Example class'}], business: null, assignments: [], runs: [], lessons, lessonScores: []} : {students, lessons};
    await route.fulfill({json: value});
  });
  await page.goto(pathToFileURL(resolve(root, 'docs/index.html')).href);
  await page.locator('.app-table tbody tr').first().waitFor();
  await page.screenshot({path: resolve(root, 'screens/instructor-gradebook.jpg'), type: 'jpeg', quality: 88, animations: 'disabled'});
  await page.close();
  console.log('Captured office workflow and instructor gradebook with example data.');
} finally { await browser.close(); }
