// Signed-in instructor and student app: sidebar navigation, one task per page.
let dashPage = '';

function dashNav(items) {
  return `<nav class="app-nav">${items.map(([k, t, href]) => href ? `<a href="${href}">${t}</a>` : `<button data-dash="${k}" class="${dashPage === k ? 'on' : ''}">${t}</button>`).join('')}</nav>`;
}

function appFrame(side, main) {
  const msg = cloudMessage ? `<div class="app-msg" role="status">${safe(cloudMessage)}</div>` : '';
  return `<div class="app"><aside class="app-side"><a class="app-logo" href="index.html">Ledger Lane</a>${side}<div class="app-who">${safe(cloudAccount.email)}<button id="cloud-logout" class="app-link">Sign out</button></div></aside><main class="app-main">${msg}${main}</main></div>`;
}

function pageHead(title, sub, action = '') {
  return `<div class="app-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${action}</div>`;
}

function avg(list) { return list.length ? Math.round(list.reduce((t, x) => t + x.score, 0) / list.length) + '%' : '—'; }

function professorHome() {
  const cls = cloudClasses.find((c) => c.id === cloudClass), book = cloudBook[cloudClass], students = book?.students || [];
  const lessons = book?.lessons || cloudLessons.filter((l) => l.class_id === cloudClass);
  const owner = cloudAccount.role === 'owner';
  if (!dashPage || !['gradebook', 'students', 'classes', 'access'].includes(dashPage)) dashPage = cloudClasses.length ? 'gradebook' : 'classes';
  const side = `${cloudClasses.length ? `<label class="app-class">Class<select id="cloud-class">${classOptions()}</select></label>` : ''}${dashNav([['gradebook', 'Gradebook'], ['lessons', 'Lessons', 'lessons.html#library'], ['students', 'Students'], ['classes', 'Classes'], ...(owner ? [['access', 'Instructor access']] : [])])}<a class="app-try" href="lessons.html">Try a lesson as a student</a>`;
  const steps = [[cloudClasses.length > 0, 'Create a class', 'classes'], [students.length > 0, 'Add your students', 'students'], [lessons.length > 0, 'Assign a lesson from the library', 'lessons']];
  const setup = steps.every((s) => s[0]) ? '' : `<div class="app-setup"><b>Get your class ready</b><ol>${steps.map(([done, t, k]) => `<li class="${done ? 'done' : ''}">${done ? t : k === 'lessons' ? `<a href="lessons.html#library">${t}</a>` : `<button class="app-link" data-dash="${k}">${t}</button>`}</li>`).join('')}</ol></div>`;
  let main = '';
  if (dashPage === 'gradebook') {
    const body = !cloudClass ? '<p class="app-empty">Create a class to see its gradebook.</p>' : !book ? '<p class="app-empty">Loading the gradebook…</p>' : book.error ? `<p class="app-empty">${safe(book.error)}</p>` : !lessons.length ? '<p class="app-empty">No lessons assigned yet. Assign one from the lesson library and scores will appear here.</p>' : !students.length ? '<p class="app-empty">No students yet. Add them on the Students page.</p>'
      : `<div class="app-scroll"><table class="app-table"><thead><tr><th>Student</th>${lessons.map((l) => `<th class="num">${safe(l.title)}<small>${dueText(l.dueDate)}</small></th>`).join('')}<th class="num">Average</th></tr></thead><tbody>${students.map((s) => { const sc = lessons.map((l) => (s.lessonScores || []).find((x) => x.assignment_id === l.id)); return `<tr><td><strong>${safe(s.email)}</strong><small>${s.business ? safe(s.business.name) : 'Not signed in yet'}</small></td>${sc.map((x) => `<td class="num">${x ? scoreBadge(x) : '—'}</td>`).join('')}<td class="num"><strong>${avg(sc.filter(Boolean))}</strong></td></tr>`; }).join('')}</tbody></table></div><p class="app-note">Scores are first-attempt accuracy on graded tasks. Later attempts don’t change them.</p>`;
    main = pageHead('Gradebook', cls ? safe(cls.name) : '', '<a class="app-btn" href="lessons.html#library">Assign a lesson</a>') + setup + body;
  } else if (dashPage === 'students') {
    main = pageHead('Students', cls ? safe(cls.name) : 'Create a class first.') + `<form id="invite-student" class="app-inline"><input name="email" type="email" required maxlength="254" placeholder="student@school.edu" aria-label="Student email" ${!cloudClass ? 'disabled' : ''}><button class="app-btn" data-cloud-submit ${!cloudClass ? 'disabled' : ''}>Add student</button></form><p class="app-note">Adding an email doesn’t send a message. Share the site link; students create an account with that email and join automatically.</p>`
      + (students.length ? `<div class="app-scroll"><table class="app-table"><thead><tr><th>Email</th><th>Business</th><th class="num">Average</th><th></th></tr></thead><tbody>${students.map((s) => `<tr><td>${safe(s.email)}</td><td>${s.business ? safe(s.business.name) : '<span class="app-mut">Not signed in yet</span>'}</td><td class="num">${avg(s.lessonScores || [])}</td><td class="num"><button class="app-link" data-remove="${safe(s.email)}">Remove</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="app-empty">${cloudClass && !book ? 'Loading…' : 'No students in this class yet.'}</p>`);
  } else if (dashPage === 'classes') {
    main = pageHead('Classes', 'Each class has its own roster, assignments and gradebook.') + `<form id="create-class" class="app-inline"><input name="name" required maxlength="120" placeholder="e.g. ACCT 203 · Section 01" aria-label="New class name"><button class="app-btn" data-cloud-submit>Create class</button></form>`
      + (cloudClasses.length ? `<table class="app-table"><thead><tr><th>Class</th><th class="num">Lessons assigned</th><th></th></tr></thead><tbody>${cloudClasses.map((c) => `<tr><td><strong>${safe(c.name)}</strong></td><td class="num">${cloudLessons.filter((l) => l.class_id === c.id).length}</td><td class="num"><button class="app-link" data-open-class="${safe(c.id)}">Open gradebook</button></td></tr>`).join('')}</tbody></table>` : '<p class="app-empty">You don’t have a class yet. Create one to get started.</p>');
  } else {
    main = pageHead('Instructor access', 'Approve an email so that person can create an account.') + `<form id="grant-access" class="app-inline"><input name="email" type="email" required maxlength="254" placeholder="professor@school.edu" aria-label="Email"><select name="role" aria-label="Role"><option value="professor">Professor</option><option value="student">Student</option></select><button class="app-btn" data-cloud-submit>Approve</button></form><button id="view-access" class="app-link">View approved accounts</button>`;
  }
  return appFrame(side, main);
}

function studentHome() {
  if (!['assignments', 'grades'].includes(dashPage)) dashPage = 'assignments';
  const side = dashNav([['assignments', 'Assignments'], ['grades', 'Grades'], ['business', 'My business', 'lessons.html']]);
  const score = (l) => cloudLessonScores.find((x) => x.assignment_id === l.id);
  const sorted = [...cloudLessons].sort((a, b) => String(a.dueDate || '9').localeCompare(String(b.dueDate || '9')));
  let main;
  if (dashPage === 'assignments') {
    const next = sorted.find((l) => !score(l));
    const start = (l) => `lessons.html#lesson=${encodeURIComponent(l.lessonId)}`;
    main = pageHead('Assignments', cloudClasses.map((c) => safe(c.name)).join(', '))
      + (!cloudClasses.length ? '<p class="app-empty">You aren’t in a class yet. Ask your professor to add your email.</p>'
        : !sorted.length ? '<p class="app-empty">Your professor hasn’t assigned a lesson yet. You can start your business from My business in the meantime.</p>'
        : `${next ? `<div class="app-next"><div><small>Next up · ${dueText(next.dueDate)}</small><b>${safe(next.title)}</b></div><a class="app-btn" href="${start(next)}">Start</a></div>` : '<div class="app-next"><div><b>You’re all caught up.</b></div></div>'}<table class="app-table"><thead><tr><th>Lesson</th><th>Due</th><th class="num">Status</th></tr></thead><tbody>${sorted.map((l) => { const s = score(l); return `<tr><td><strong>${safe(l.title)}</strong></td><td>${dueText(l.dueDate).replace('Due ', '')}</td><td class="num">${s ? scoreBadge(s) : `<a class="app-link" href="${start(l)}">Start</a>`}</td></tr>`; }).join('')}</tbody></table>`);
  } else {
    const done = sorted.filter(score);
    main = pageHead('Grades', 'First-attempt scores. Your professor sees the same numbers.') + (done.length ? `<table class="app-table"><thead><tr><th>Lesson</th><th class="num">Score</th></tr></thead><tbody>${done.map((l) => `<tr><td>${safe(l.title)}</td><td class="num">${scoreBadge(score(l))}</td></tr>`).join('')}<tr class="app-total"><td>Average</td><td class="num">${avg(done.map(score))}</td></tr></tbody></table>` : '<p class="app-empty">No graded lessons yet. Scores appear here when you finish an assigned lesson.</p>');
  }
  return appFrame(side, main);
}

function renderDashboard() {
  const student = cloudAccount.role === 'student';
  document.body.dataset.screen = 'app';
  Q('#classroom').innerHTML = student ? studentHome() : professorHome();
  const on = (sel, ev, fn) => { const el = Q(sel); if (el) el[ev] = fn; };
  document.querySelectorAll('[data-dash]').forEach((b) => (b.onclick = () => { dashPage = b.dataset.dash; cloudMessage = ''; render(); }));
  on('#cloud-logout', 'onclick', () => cloudTask(async () => { try { await cloud.logout(); } finally { location.reload(); } }));
  if (student) return;
  loadBook();
  on('#cloud-class', 'onchange', (e) => { cloudClass = e.target.value; cloudMessage = ''; render(); });
  document.querySelectorAll('[data-open-class]').forEach((b) => (b.onclick = () => { cloudClass = b.dataset.openClass; dashPage = 'gradebook'; render(); }));
  on('#create-class', 'onsubmit', (e) => { e.preventDefault(); const name = new FormData(e.target).get('name'); cloudTask(async () => { const c = await cloud.call('create-class', {name}); await loadCloud(); cloudClass = c.id; dashPage = 'students'; cloudMessage = 'Class created. Next, add your students.'; render(); }); });
  on('#invite-student', 'onsubmit', (e) => { e.preventDefault(); const email = new FormData(e.target).get('email'); cloudTask(async () => { await cloud.call('invite', {classId: cloudClass, email}); delete cloudBook[cloudClass]; cloudMessage = 'Student added. Share the site link and ask them to create an account with that email.'; render(); }); });
  document.querySelectorAll('[data-remove]').forEach((el) => (el.onclick = () => { if (!confirm('Remove ' + el.dataset.remove + ' from this class?')) return; cloudTask(async () => { await cloud.call('remove-student', {classId: cloudClass, email: el.dataset.remove}); delete cloudBook[cloudClass]; render(); }); }));
  on('#grant-access', 'onsubmit', (e) => { e.preventDefault(); const p = Object.fromEntries(new FormData(e.target)); cloudTask(async () => { await cloud.call('authorize', {...p, active: true}); cloudMessage = 'Account approved. Share the site link; they can create an account with this email.'; render(); }); });
  on('#view-access', 'onclick', () => cloudTask(accessList));
}
