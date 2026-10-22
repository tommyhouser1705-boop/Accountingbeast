const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Lessons = require('./lesson-engine');

function ui() {
  const context = vm.createContext({
    Lessons,
    safe: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    role: 'home', cloudAccount: null, window: {},
    data: {profile: {name: 'Test Coffee', type: 'Coffee shop'}, assignments: [], runs: {}},
    businessText: (s) => s, month: () => 'September 2026',
    shop: () => '<div class="class-shop">Your business</div>',
    entryAssessment: (r, e) => r.entries[e.id]?.assessment,
  });
  for (const file of ['product-ui.js', 'workspace.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  context.eval = (s) => vm.runInContext(s, context);
  return context;
}

test('public home page explains the product and shows real screenshots', () => {
  const c = ui(), html = c.publicWelcome();
  for (const id of ['student', 'professor', 'instructor-demo', 'explore-studio']) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  for (const file of ['decision.jpg', 'journal-feedback.jpg', 'ledger.jpg', 'create-business.jpg', 'gradebook.jpg']) {
    assert.ok(html.includes('assets/screens/' + file), file);
    assert.ok(fs.existsSync('screens/' + file), file + ' exists');
  }
  assert.match(html, /Free sample/);
  assert.equal((html.match(/<img [^>]*alt="[^"]+"/g) || []).length, (html.match(/<img /g) || []).length);
  for (const b of Object.values(c.eval('previewBusinesses'))) assert.ok(Lessons.businesses[b.type], 'Each preview enters a supported business type');
});

test('home page buttons route to the sample lesson, sign-in and library', () => {
  const c = ui(), nodes = Object.fromEntries(['instructor-demo', 'explore-studio'].map((id) => ['#' + id, {}]));
  let clicked = [];
  nodes['#student'] = {click: () => clicked.push('student')};
  nodes['#professor'] = {click: () => clicked.push('professor')};
  const sample = {}, signin = {};
  c.Q = (id) => nodes[id];
  c.document = {querySelectorAll: (sel) => (sel === '[data-sample]' ? [sample] : [signin])};
  c.wireWelcome();
  sample.onclick(); signin.onclick();
  assert.deepEqual(clicked, ['student', 'professor']);
  c.location = {href: ''};
  nodes['#explore-studio'].onclick();
  assert.equal(c.location.href, 'lessons.html#library');
  c.cloudAccount = {role: 'professor'};
  c.wireWelcome();
  assert.equal(nodes['#instructor-demo'].hidden, true);
  assert.equal(nodes['#explore-studio'].hidden, true);
});

test('dashboard renders real progress, excludes deleted and unpublished assignments, and escapes names', () => {
  const c = ui();
  const a = {...Lessons.generateAssignment('Prepaid rent and supplies', {id:'visible', title:'A <new> chapter'}), published:true};
  c.data.profile.name = '<img src=x onerror=alert(1)>';
  c.data.assignments = [a, {...a,id:'hidden',published:false}, {...a,id:'deleted',deleted:true}];
  let html = c.studentDashboard();
  assert.match(html, /data-open="visible"/);
  assert.doesNotMatch(html, /data-open="hidden"|data-open="deleted"|<img src=x/);
  assert.match(html, /A &lt;new&gt; chapter/);
  assert.match(html, /Start assignment/);
  c.data.runs.visible = {scenario:{events:[{id:'a'},{id:'b'},{id:'c',autoPosted:true}]}, entries:{a:{assessment:{correct:true}},b:{assessment:{correct:false}}}};
  html = c.studentDashboard();
  assert.match(html, /Continue assignment/);
  assert.match(html, /1 of 2 entries done/);
  assert.match(html, /width:50%/);
  c.data.runs.visible.completed = true;
  html = c.studentDashboard();
  assert.match(html, /Review assignment/);
  assert.match(html, /width:100%/);
});

test('empty classroom gives an actionable empty state', () => {
  const c = ui(), html = c.studentDashboard();
  assert.match(html, /No published assignments yet/);
  assert.match(html, /Import an assignment/);
  assert.doesNotMatch(html, /data-open=/);
});

test('record checklist distinguishes untouched, incorrect, corrected and auto-posted entries', () => {
  const c = ui(), e = {id:'record'}, r = {scenario:{events:[e,{id:'auto',autoPosted:true}]},entries:{}};
  assert.equal(c.workspaceStatus(r,e).key, 'todo');
  r.entries.record = {assessment:{correct:false}};
  assert.equal(c.workspaceStatus(r,e).key, 'retry');
  r.entries.record.assessment.correct = true;
  assert.equal(c.workspaceStatus(r,e).key, 'done');
  assert.equal(c.workspaceProgress(r).done, 1);
  assert.equal(c.workspaceProgress(r).total, 1);
  assert.equal(c.workspaceStatus(r,{autoPosted:true}).key, 'auto');
});

test('demo role controls never appear for a signed-in account', () => {
  const c = ui();
  c.role = 'student';
  assert.match(c.appHeader(), /data-demo-role="professor"/);
  assert.match(c.appHeader(), /id="reset-demo"/);
  c.cloudAccount = {role:'student'};
  assert.doesNotMatch(c.appHeader(), /data-demo-role|id="reset-demo"/);
});

test('reset requires confirmation before removing local work or reloading', () => {
  const c = ui(), button = {}, removed = [];
  let reloads = 0;
  c.Q = () => button;
  c.document = {querySelectorAll: () => []};
  c.localStorage = {removeItem: (key) => removed.push(key)};
  c.location = {reload: () => reloads++};
  c.confirm = () => false;
  c.wireAppHeader();
  button.onclick();
  assert.equal(removed.length, 0);
  assert.equal(reloads, 0);
  c.confirm = () => true;
  button.onclick();
  assert.deepEqual(removed, ['ledger-lane-classroom-v1']);
  assert.equal(reloads, 1);
});
