// Guided student workspace, demo helpers and shared shell pieces.
// Loaded before classroom.js; relies on its globals (Q, safe, cash, data, role, record, Lessons...) at call time.

function workspaceStatus(r, e) {
  if (e.autoPosted) return { key: 'auto', label: 'Recorded for you' };
  const x = entryAssessment(r, e);
  if (!x) return { key: 'todo', label: 'To do' };
  return x.correct ? { key: 'done', label: 'Done' } : { key: 'retry', label: 'Try again' };
}

function workspaceProgress(r) {
  const events = (r.scenario?.events || []).filter((e) => !e.autoPosted);
  const done = events.filter((e) => entryAssessment(r, e)?.correct).length;
  return { done, total: events.length, pct: events.length ? Math.round((done / events.length) * 100) : 0 };
}

function cardProgress(r) {
  if (!r || !r.scenario) return '';
  const p = workspaceProgress(r);
  return `<div class="card-progress" aria-label="${p.done} of ${p.total} entries done"><div class="meter"><span style="width:${r.completed ? 100 : p.pct}%"></span></div><small>${r.completed ? 'Complete' : `${p.done} of ${p.total} entries done`}</small></div>`;
}

function workspaceSteps(r) {
  const a = r.assignment, s = r.scenario, stage = r.stage || 0;
  const labels = a.version >= 2 ? [...s.stages, 'Report'] : ['Record the transaction', 'Month-end', 'Report'];
  const reporting = r.advanced && (a.version < 2 || stage >= Lessons.finalStage(a)) && Lessons.availableEvents(r).every((e) => workspaceStatus(r, e).key !== 'todo' && workspaceStatus(r, e).key !== 'retry');
  let current = a.version >= 2 ? stage : r.advanced ? 1 : 0;
  if (reporting) current = labels.length - 1;
  if (r.completed) current = labels.length;
  return `<ol class="ws-steps" aria-label="Assignment steps">${labels.map((x, i) => `<li class="${i < current ? 'done' : i === current ? 'current' : ''}"><span>${i < current ? '✓' : i + 1}</span>${safe(x)}</li>`).join('')}</ol>`;
}

function workspaceNextStep(r) {
  const a = r.assignment, s = r.scenario, stage = r.stage || 0;
  const open = Lessons.availableEvents(r).filter((e) => ['todo', 'retry'].includes(workspaceStatus(r, e).key)).length;
  const remaining = open ? `<p>${open} ${open === 1 ? 'record still needs' : 'records still need'} an entry. You can continue now and come back to ${open === 1 ? 'it' : 'them'} later.</p>` : '<p>Every record so far is done.</p>';
  if (a.version >= 2) {
    if (Lessons.pendingMonth(r) !== null) return '';
    if (stage < Lessons.finalStage(a)) {
      const next = s.stages[stage + 1];
      return `<section class="ws-next"><div><span class="tag">WHAT’S NEXT</span><h3>${safe(next)}</h3>${remaining}</div><button id="advance-episode" data-cloud-submit>Continue to ${safe(next.toLowerCase())} →</button></section>`;
    }
  } else if (!r.advanced) {
    const monthEnd = ['prepaid', 'equipment'].includes(a.topic);
    return `<section class="ws-next"><div><span class="tag">WHAT’S NEXT</span><h3>${monthEnd ? 'Move to month-end' : 'See what happens next'}</h3>${remaining}</div><button id="advance-episode">${monthEnd ? 'Go to month-end' : 'Open the next record'} →</button></section>`;
  }
  if (!r.advanced) return '';
  return open
    ? `<section class="ws-next"><div><span class="tag">WHAT’S NEXT</span><h3>Finish your entries</h3>${remaining}<p>Then answer the report questions below.</p></div></section>`
    : `<section class="ws-next ready"><div><span class="tag">WHAT’S NEXT</span><h3>All entries are done</h3><p>Answer the report questions below to finish the assignment.</p></div><a class="button" href="#ws-report">Go to the report ↓</a></section>`;
}

function workspaceReport(r) {
  const a = r.assignment, s = r.scenario;
  if (!r.advanced) return '';
  const allCorrect = s.events.every((e) => entryAssessment(r, e)?.correct);
  const prediction = s.prediction ? predictionPanel().replace(/3 · A QUICK CONCEPT CHECK/, 'REPORT · QUICK CHECK') : '';
  const effects = r.prediction !== undefined || !s.prediction
    ? `<section class="card reflection"><div class="tag">REPORT · FINANCIAL EFFECT</div><h2>What do your accounts show?</h2><p>${a.version >= 2 ? 'Use your T accounts to fill in these totals.' : safe(Lessons.topic(a).effect) + ' Use your T accounts to fill in these totals.'}</p><form id="effect-form">${s.effects.map((e) => `<label class="statement-line">${e.label}<input name="${e.key}" aria-label="${e.label}" type="number" step=".01" required value="${safe(r.effectDraft?.[e.key] ?? '')}"></label>`).join('')}<button ${!allCorrect ? 'disabled' : ''}>Check my report</button>${!allCorrect ? '<p class="foot">Finish every journal entry correctly first.</p>' : ''}</form><div id="effect-feedback" role="status">${r.completed ? completion(r) : ''}</div></section>`
    : '';
  return `<div id="ws-report" class="ws-report">${prediction}${effects}</div>`;
}

function workspaceJournal(r) {
  const s = r.scenario;
  const rows = Object.entries(r.entries).map(([id, e]) => e.rows.map((x, i) => `<tr><td>${i === 0 ? safe(e.date) : ''}</td><td>${i === 0 ? safe(s.events.find((x) => x.id === id)?.title || '') : ''}</td><td>${safe(x.account)}</td><td>${Number(x.debit) ? cash(Number(x.debit)) : ''}</td><td>${Number(x.credit) ? cash(Number(x.credit)) : ''}</td></tr>`).join('')).join('');
  return `<details class="card ws-journal"><summary>Your journal so far (${Object.keys(r.entries).length} ${Object.keys(r.entries).length === 1 ? 'entry' : 'entries'})</summary><table><thead><tr><th>Date</th><th>Record</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Your journal entries will appear here.</td></tr>'}</tbody></table><p class="foot">Corrections replace entries here. Your first attempts stay in your grading record.</p></details>`;
}

function episodeWorkspace(r) {
  const a = r.assignment, s = r.scenario, v2 = a.version >= 2, stage = r.stage || 0;
  const available = Lessons.availableEvents(r);
  const open = (e) => workspaceStatus(r, e).key !== 'done' && !e.autoPosted;
  let current = available.find((e) => e.id === record);
  if (!current) {
    current = available.filter((e) => !v2 || e.stage === stage).find(open) || available.find(open) || available[available.length - 1];
    record = current ? current.id : null;
  }
  const p = workspaceProgress(r);
  const item = (e) => {
    const st = workspaceStatus(r, e);
    return `<li><button class="ws-record ${st.key}${current && e.id === current.id ? ' active' : ''}" data-record="${safe(e.id)}" ${current && e.id === current.id ? 'aria-current="true"' : ''}><span class="ws-dot" aria-hidden="true">${st.key === 'done' ? '✓' : st.key === 'retry' ? '!' : ''}</span><span><strong>${safe(businessText(e.title, r.business))}</strong><small>${safe(e.date)} · ${st.label}</small></span></button></li>`;
  };
  const groups = v2
    ? [...new Set(available.map((e) => e.stage))].sort((x, y) => x - y).map((g) => `<div class="ws-group"><h4>${safe(s.stages[g])}</h4><ul>${available.filter((e) => e.stage === g).map(item).join('')}</ul></div>`).join('')
    : `<ul>${available.map(item).join('')}</ul>`;
  const idx = current ? available.indexOf(current) : -1;
  const nextOpen = current && workspaceStatus(r, current).key === 'done' ? available.slice(idx + 1).find(open) || available.find(open) : null;
  const task = current
    ? `<section class="ws-task guided-task-heading" aria-label="Current record"><div class="ws-task-head"><div><span class="tag">RECORD ${idx + 1} OF ${available.length}</span><h2>${safe(businessText(current.title, r.business))}</h2><p>${safe(recordPurpose(current))}</p></div><span class="ws-chip ${workspaceStatus(r, current).key}">${workspaceStatus(r, current).label}</span></div><div class="guided-workspace"><section class="guided-evidence">${documentHtml(current, a, r.business)}</section><section class="card bookkeeper"><div class="tag">YOUR JOURNAL ENTRY</div><h3>Which accounts change, and by how much?</h3>${journalForm(current, false)}${nextOpen ? `<button class="ws-next-record" data-record="${safe(nextOpen.id)}">Next record: ${safe(businessText(nextOpen.title, r.business))} →</button>` : ''}</section></div></section>`
    : '<section class="card ws-task"><h2>No new records yet</h2><p>Continue below when you’re ready.</p></section>';
  return `<div class="ws">
<div class="ws-top"><button class="quiet" id="back-assignments">← All assignments</button><div class="ws-tools"><button class="quiet" id="practice-guide">How to record an entry</button><button class="secondary" id="view-taccounts">T accounts</button></div></div>
<header class="ws-head"><div><span class="tag">${safe(Lessons.topic(a).name)} · ${month(a)}</span><h1>${safe(businessText(a.title, r.business))}</h1><details class="assignment-overview"><summary>About this assignment</summary><p>${safe(businessText(a.instructions, r.business))}</p><p><strong>Starting cash:</strong> ${cash(s.opening)}</p></details></div><div class="ws-meter" aria-label="${p.done} of ${p.total} entries done"><strong>${p.done}/${p.total}</strong><small>entries done</small><div class="meter"><span style="width:${r.completed ? 100 : p.pct}%"></span></div></div></header>
${workspaceSteps(r)}
${v2 ? orderConfirmation(r) + monthlyChoiceForm(r) : ''}
<div class="ws-body"><aside class="ws-list card" aria-label="Records"><h3>Records</h3>${groups || '<p>No records yet.</p>'}</aside><div class="ws-main">${task}${workspaceNextStep(r)}</div></div>
${workspaceReport(r)}
${workspaceJournal(r)}
</div>`;
}

function wireWorkspaceRecords() {
  document.querySelectorAll('[data-record]').forEach((b) => (b.onclick = () => {
    record = b.dataset.record;
    const r = run();
    if (r) r.entryDateDraft = '';
    render();
    Q('.guided-task-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

const sampleCourseNotes = `Chapter 3: Adjusting entries
Prepaid expenses are assets when paid in advance. A business that pays six months of rent up front records Prepaid Rent, then recognizes Rent Expense each month as the space is used.
Supplies are recorded as an asset when purchased. At month-end, a physical count shows what remains; the difference is Supplies Expense.
Accounts receivable arise when services are performed on account. Revenue is recognized when earned, not when cash is collected.`;

function isPracticeMode() {
  return !(typeof cloudAccount !== 'undefined' && cloudAccount);
}

function appHeader() {
  const practice = isPracticeMode();
  const feedback = typeof window !== 'undefined' && window.LEDGER_FEEDBACK_URL;
  const inApp = role !== 'home';
  const switcher = practice && inApp
    ? `<div class="mode-switch" role="group" aria-label="Demo view"><button class="${role === 'student' ? 'on' : ''}" data-demo-role="student" aria-pressed="${role === 'student'}">Student</button><button class="${role === 'professor' ? 'on' : ''}" data-demo-role="professor" aria-pressed="${role === 'professor'}">Instructor</button></div>`
    : '';
  return `<header><a href="#" class="brand" id="brand-home"><span class="brand-mark" aria-hidden="true">L<span>∕</span></span>ledger lane</a>${switcher}<div class="header-tools">${feedback ? `<a class="quiet button" id="feedback" href="${safe(feedback)}" target="_blank" rel="noopener">Give feedback</a>` : ''}<button class="quiet" id="help">Help</button>${practice && inApp ? '<button class="quiet" id="reset-demo">Reset demo</button>' : ''}<button class="quiet" id="role-home">${inApp ? 'Exit' : 'Home'}</button></div></header>`;
}

function wireAppHeader() {
  document.querySelectorAll('[data-demo-role]').forEach((b) => (b.onclick = () => {
    role = b.dataset.demoRole;
    if (role === 'student') page = 'assignments';
    active = null;
    record = null;
    notice = '';
    render();
  }));
  if (Q('#reset-demo')) Q('#reset-demo').onclick = () => {
    if (!confirm('Reset the demo? This clears the business, assignments and progress saved in this browser.')) return;
    localStorage.removeItem('ledger-lane-classroom-v1');
    location.reload();
  };
}

function addSampleNotes() {
  const notes = Q('#teacher-notes');
  if (!notes || Q('#use-sample-notes') || !isPracticeMode()) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'use-sample-notes';
  b.className = 'secondary';
  b.textContent = 'Use sample notes';
  b.onclick = () => {
    notes.value = sampleCourseNotes;
    notes.dispatchEvent(new Event('input', { bubbles: true }));
    notes.focus();
  };
  notes.insertAdjacentElement('afterend', b);
}
