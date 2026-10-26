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
  for (const file of ['office-reply.jpg', 'office-books.jpg', 'office-setup.jpg', 'instructor-gradebook.jpg']) {
    assert.ok(html.includes('assets/screens/' + file), file);
    assert.ok(fs.existsSync('screens/' + file), file + ' exists');
  }
  assert.match(html, /Free sample/);
  assert.equal((html.match(/<img [^>]*alt="[^"]+"/g) || []).length, (html.match(/<img /g) || []).length);
  for (const b of Object.values(c.eval('previewBusinesses'))) assert.ok(Lessons.businesses[b.type], 'Each preview enters a supported business type');
});

test('public course contents match the active simulation, not the retired quiz library', () => {
  const c = ui();
  for (const file of ['lessons-engine.js','sim-docs.js','sim-engine.js','sim-month1.js','sim-course.js']) vm.runInContext(fs.readFileSync(file,'utf8'), c);
  const contents = c.eval('courseContents');
  assert.equal(contents.length, c.SIM.catalog.length);
  assert.deepEqual(Array.from(contents, x => x[1]), Array.from(c.SIM.catalog, x => x.title));
  const html = c.publicWelcome();
  assert.match(html, /14 simulation periods/);
  assert.match(html, /Business decisions aren’t graded/);
  assert.doesNotMatch(html, /15 prebuilt|11.*chapter lessons|export.*CSV|T accounts and the accounting equation/);
});

function demoView(reduced = false) {
  const c = ui(), nodes = new Map(), timers = new Map(), listeners = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'', hidden:false, disabled:false, isConnected:true, attrs:{}, setAttribute(k,v){this.attrs[k]=v;}});
    return nodes.get(id);
  };
  const steps = [0,1,2,3].map(i => node('step'+i));
  node('#hp-office-demo').querySelectorAll = () => steps;
  c.Q = node; c.window.matchMedia = () => ({matches:reduced});
  c.document = {hidden:false, addEventListener(k,fn){listeners.set(k,fn);}, removeEventListener(k){listeners.delete(k);}};
  let id = 0;
  c.setTimeout = fn => {timers.set(++id,fn); return id;};
  c.clearTimeout = id => timers.delete(id);
  c.wireOfficeDemo();
  return {c,node,steps,timers,listeners,tick(){const [id,fn] = timers.entries().next().value;timers.delete(id);fn();}};
}

test('office demo steps use actual screenshots, stop at boundaries and never touch student storage', () => {
  const v = demoView();
  assert.equal(v.timers.size,0,'no autoplay on page load');
  for (let i = 0; i < 4; i++) {
    v.steps[i].onclick();
    assert.equal(v.steps[i].attrs['aria-current'],'step');
    assert.ok(fs.existsSync(v.node('#hp-demo-image').src.replace('assets/screens/','screens/')));
    assert.match(v.node('#hp-demo-count').textContent,new RegExp(`Step ${i+1} of 4`));
    assert.ok(v.node('#hp-demo-image').alt.length > 20);
  }
  assert.equal(v.node('#hp-demo-next').disabled,true);
  v.node('#hp-demo-back').onclick();
  assert.match(v.node('#hp-demo-description').textContent,/Close up for the day/);
  v.steps[0].onclick(); assert.equal(v.node('#hp-demo-back').disabled,true);
  const source = fs.readFileSync('product-ui.js','utf8').split('const officeDemoSteps')[1];
  assert.doesNotMatch(source,/localStorage|sessionStorage|cloud\.call|SIM\.handle/);
});

test('optional demo playback pauses on manual navigation, hidden pages, removal, end and rewiring', () => {
  const v = demoView(), play = v.node('#hp-demo-play');
  play.onclick(); assert.equal(play.attrs['aria-pressed'],'true'); assert.equal(v.timers.size,1);
  v.tick(); assert.match(v.node('#hp-demo-count').textContent,/Step 2/);
  v.steps[2].onclick(); assert.equal(v.timers.size,0); assert.equal(play.attrs['aria-pressed'],'false');
  play.onclick(); v.tick(); assert.equal(v.timers.size,0,'stops at final step');
  play.onclick(); assert.match(v.node('#hp-demo-count').textContent,/Step 1/);
  v.c.document.hidden = true; v.listeners.get('visibilitychange')(); assert.equal(v.timers.size,0);
  v.c.document.hidden = false; play.onclick(); v.node('#hp-office-demo').isConnected = false; v.tick(); assert.equal(v.timers.size,0);
  v.node('#hp-office-demo').isConnected = true; play.onclick(); v.c.wireOfficeDemo(); assert.equal(v.timers.size,0);
  assert.equal(v.listeners.size,0);
});

test('reduced motion keeps manual demo steps available without playback', () => {
  const v = demoView(true);
  assert.equal(v.node('#hp-demo-play').hidden,true);
  assert.equal(v.node('#hp-demo-motion').hidden,false);
  v.node('#hp-demo-play').onclick(); assert.equal(v.timers.size,0);
  v.steps[1].onclick(); assert.match(v.node('#hp-demo-image').alt,/11,800/);
});

test('signed-in homepage guidance is role-specific and does not add instructor access for students', () => {
  const c = ui(); c.location = {hash:''};
  vm.runInContext(fs.readFileSync('dashboard.js','utf8'), c);
  for (const student of [true,false]) {
    const html = c.officeHomeGuide(student);
    assert.match(html,/office-books\.jpg/);
    assert.match(html,/example business/);
    assert.match(html,student ? /Close up for the day/ : /Assign simulation periods/);
    assert.equal(html.includes('lessons.html#library'),!student);
    assert.doesNotMatch(html,/<details[^>]*\bopen/,'guidance stays compact');
  }
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
