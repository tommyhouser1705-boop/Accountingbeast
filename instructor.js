// Class-scoped instructor drafts stay private until the explicit publish step.
const instructorDrafts = new Map();
let instructorBusy = false, instructorStatus = '';
let studentWork = null, gradeFilter = '';
let rosterFilter = '', rosterScope = 'all', selectedStudent = null, workRequest = 0, assignmentTab = 'assigned';
const instructorReviewViews = new Map();
function captureInstructorView() {
  const panel=Q('[data-review-key]');if(!panel)return;
  instructorReviewViews.set(panel.dataset.reviewKey,{scroll:panel.scrollTop,expanded:[...panel.querySelectorAll('[data-work-detail][open]')].map(d=>d.dataset.workDetail)});
}
function restoreInstructorView() {
  const panel=Q('[data-review-key]'),saved=panel&&instructorReviewViews.get(panel.dataset.reviewKey);if(!saved)return;
  panel.querySelectorAll('[data-work-detail]').forEach(d=>d.open=saved.expanded.includes(d.dataset.workDetail));panel.scrollTop=saved.scroll;
}
function newAssignmentButton() {
  return `<button class="app-btn" data-new-assignment ${!cloudClass?'disabled':''}>+ New assignment</button>`;
}
function assignmentDialog() {
  return `<dialog id="new-assignment" class="teach-dialog" aria-labelledby="assignment-heading"><form method="dialog"><button class="teach-dialog-close app-btn alt" aria-label="Close assignment dialog">Close</button></form><small class="teach-eyebrow">Add to this class</small><h2 id="assignment-heading">New assignment</h2><p>Choose work from the course or create an additional case.</p><button class="teach-option" data-studio="choose-course"><strong>Standard course period</strong><span>Assign one of the 14 periods. Students continue their business and books.</span><b aria-hidden="true">→</b></button><button class="teach-option" data-studio="choose-notes"><strong>Supplemental case from notes</strong><span>Upload or paste your notes. Review the documents and accounting before assigning separate practice.</span><b aria-hidden="true">→</b></button></dialog>`;
}
function classStudents(book) { return book?.students || []; }
function studentNeedsReview(s) { return !s.accountCreated || !s.office || s.office.unavailable || s.office.graded > s.office.first; }
function reviewSelection() { return selectedStudent?.key === cloudAccount.id + ':' + cloudClass ? selectedStudent.email : ''; }
function studentIdentity(s) {
  return `<span class="teach-avatar" aria-hidden="true">${safe((s.business?.founder || s.email).slice(0,1).toUpperCase())}</span><span><strong>${safe(s.business?.founder || s.email)}</strong><small>${safe(s.business?.name || (s.accountCreated?'Company not created yet':'Invitation added'))}</small></span>`;
}
function workStatus(s) {
  return `<span class="teach-pill ${s.office?.completed?'complete':s.office&&!s.office.unavailable?'working':'pending'}">${s.office?.unavailable?'Check saved work':s.office?.completed?'Period completed':s.office?'Working':s.accountCreated?'Not started':'Invited'}</span>`;
}
function activityRows(book) {
  return [...classStudents(book)].sort((a,b)=>String(b.office?.updatedAt||'').localeCompare(String(a.office?.updatedAt||''))).map(s=>`<button class="teach-activity" data-review-student="${safe(s.email)}" data-roster-student="${safe(s.email+' '+(s.business?.name||'')+' '+(s.business?.founder||''))}" data-needs-review="${studentNeedsReview(s)}" ${reviewSelection()===s.email?'aria-current="true"':''}><span class="teach-person">${studentIdentity(s)}</span><span class="teach-activity-work">${workStatus(s)}<span>${rosterProgress(s)}</span><small>Saved ${rosterSaved(s)}</small></span><span class="teach-row-arrow" aria-hidden="true">→</span></button>`).join('');
}
function rosterTools() {
  return `<div class="teach-list-tools"><label class="teach-search"><span class="sr-only">Find a student</span><input id="roster-filter" type="search" value="${safe(rosterFilter)}" placeholder="Find a student or business"></label><div class="teach-segments" aria-label="Student filter"><button data-roster-scope="all" aria-pressed="${rosterScope==='all'}">All students</button><button data-roster-scope="review" aria-pressed="${rosterScope==='review'}">To review</button></div></div>`;
}
function classEmpty(cls,book) {
  return !cls?'<div class="teach-empty-state"><h2>Create your first class</h2><p>Add students, assign the opening month and follow their work here.</p><button class="app-btn" data-dash="classes">Create a class</button></div>':!book?'<p class="teach-empty" role="status">Loading class data…</p>':book.error?`<p class="teach-empty" role="alert">${safe(book.error)} Use Refresh class to try again.</p>`:!classStudents(book).length?'<div class="teach-empty-state"><h2>No students yet</h2><p>Add students by email. They join this class when they create their account.</p><button class="app-btn" data-dash="students">Add students</button></div>':'';
}
function classActivity(cls,book) {
  const students=classStudents(book),working=students.filter(s=>s.office&&!s.office.unavailable),assigned=cloudLessons.filter(l=>l.class_id===cloudClass),cases=courseCases().filter(c=>!c.deleted);
  const newest=[...assigned].sort((a,b)=>(SIM.findLesson(b.lessonId)?.index||0)-(SIM.findLesson(a.lessonId)?.index||0))[0];
  const completed=newest?students.filter(s=>s.lessonScores?.some(x=>x.assignment_id===newest.id&&x.completed!==false)).length:0;
  return pageHead('Class activity',safe(cls?.name||'Your classes'),newAssignmentButton())
    + `<div class="teach-metrics"><div><small>Students</small><strong>${students.length}</strong><span>${students.filter(s=>!s.accountCreated).length} awaiting an account</span></div><div><small>Office started</small><strong>${working.length}<em> / ${students.length}</em></strong><span>Saved student businesses</span></div><div><small>Accounting to review</small><strong>${students.filter(s=>s.office?.graded>s.office?.first).length}</strong><span>At least one missed first attempt</span></div><div><small>Assigned work</small><strong>${assigned.length+cases.length}</strong><span>${assigned.length} standard · ${cases.length} supplemental</span></div></div>`
    + `<section class="teach-current-strip"><div><small>Latest course period</small><h2>${safe(newest?.title||'No period assigned')}</h2><p>${newest?`${completed} of ${students.length} completed · ${dueText(newest.dueDate)}`:'Start with the opening month. The same company continues through the course.'}</p></div><button class="app-btn alt" data-dash="plan">View assignments</button></section>`
    + `<div class="teach-review-layout"><section class="teach-panel teach-activity-panel"><div class="teach-section-head"><div><h2>Student activity</h2><p>Latest saved work first. Select a student to review beside this list.</p></div></div>${rosterTools()}${classEmpty(cls,book)||`<div class="teach-activity-list">${activityRows(book)}</div><p id="roster-no-results" class="teach-empty" hidden>No matching students.</p>`}</section>${studentReviewPanel(book)}</div>`;
}
function studentsWorkspace(cls,book) {
  const students=classStudents(book);
  return pageHead('Students',safe(cls?.name||'Create a class first.'))
    + `<section class="teach-panel teach-invite"><div><h2>Add a student</h2><p>No invitation email is sent. Share the site link and ask them to sign up with this address.</p></div><form id="invite-student" class="app-inline"><input name="email" type="email" required maxlength="254" placeholder="student@school.edu" aria-label="Student email" ${!cls?'disabled':''}><button class="app-btn" data-cloud-submit ${!cls?'disabled':''}>Add student</button></form></section>`
    + `<div class="teach-review-layout"><section class="teach-panel teach-activity-panel"><div class="teach-section-head"><h2>Class roster <small>${students.length}</small></h2></div>${rosterTools()}${!cls||!book||book.error?classEmpty(cls,book):!students.length?'<p class="teach-empty">No students in this class yet. Add an email above.</p>':`<div class="teach-activity-list">${activityRows(book)}</div><p id="roster-no-results" class="teach-empty" hidden>No matching students.</p>`}</section>${studentReviewPanel(book)}</div>`;
}
function studentReviewPanel(book) {
  const email=reviewSelection(),s=classStudents(book).find(s=>s.email===email),work=studentWork?.classId===cloudClass&&studentWork?.accountId===cloudAccount.id&&studentWork.email===email?studentWork:null;
  if(!s)return '<aside class="teach-review-panel teach-panel"><div class="teach-review-placeholder"><span aria-hidden="true">≡</span><h2>Review student work here</h2><p>Select a student to see their company, course progress and saved accounting submissions without leaving this page.</p></div></aside>';
  return `<aside class="teach-review-panel teach-panel" data-review-key="${safe(cloudAccount.id+':'+cloudClass+':'+email+':'+(work?.assignmentId||'office'))}" aria-label="Student work review"><header class="teach-section-head"><small class="teach-eyebrow">Student work</small><button class="app-link" data-close-review aria-label="Close student review">Close</button></header><div class="teach-review-person teach-person">${studentIdentity(s)}</div><p class="teach-muted">${safe(s.email)}</p>${workStatus(s)}<div class="teach-student-summary"><div><small>Current work</small><strong>${rosterProgress(s)}</strong></div><div><small>Last saved</small><strong>${rosterSaved(s)}</strong></div><div><small>Completed accounting average</small><strong>${avg([...(s.lessonScores||[]),...(s.caseScores||[])].filter(x=>x.completed!==false))}</strong></div></div><div class="teach-review-tabs"><button class="${work?.type!=='case'?'on':''}" data-review-student="${safe(email)}">Course submissions</button>${(s.caseScores||[]).map(c=>`<button class="${work?.assignmentId===c.assignment_id?'on':''}" data-case-work="${safe(c.assignment_id)}" data-student="${safe(email)}">${safe((book.cases||courseCases()).find(a=>a.id===c.assignment_id)?.title||'Supplemental case')}</button>`).join('')}</div>${work?.type==='office'&&!work.loading&&!work.error&&work.office?.updatedAt!==s.office?.updatedAt?'<p class="teach-update-notice">Newer student work is saved. Select Course submissions to reload.</p>':''}${work?.loading?'<p class="teach-empty" role="status">Loading saved submissions…</p>':work?.error?`<p class="teach-empty" role="alert">${safe(work.error)}</p><button class="app-btn alt" data-review-student="${safe(email)}">Retry course review</button>`:work?.type==='case'?workReview(work):work?officeWorkReview(work):'<p class="teach-muted">Select Course submissions to load the saved work.</p>'}<details class="teach-student-admin" data-work-detail="membership"><summary>Class membership</summary><button class="app-link" data-remove="${safe(email)}">Remove student from this class</button></details></aside>`;
}
function officeWorkReview(work) {
  const submissions=work.submissions||[];
  return `<div class="teach-submissions"><div class="teach-section-head"><h3>Saved course submissions</h3><button class="app-link" data-review-student="${safe(work.email)}">Reload work</button></div><p class="teach-muted">First accounting attempts determine the grade. Business replies are not graded.</p>${work.truncated?'<p class="teach-muted">Showing the latest 100 submissions.</p>':''}${submissions.length?[...submissions].reverse().map(s=>`<details class="teach-submission" data-work-detail="${safe(s.lessonId+':'+s.sequence)}"><summary><span>${safe(s.subject||s.id)}<small>${safe(s.period)} · Day ${safe(s.day)}</small></span><span class="teach-pill ${!s.graded?'pending':s.correct?'complete':'attention'}">${!s.graded?'Business reply':s.correct?'Correct':'Needs review'}${s.graded&&s.firstAttempt?' · First try':''}</span></summary><p>${safe(s.feedback)}</p>${s.document?`<details data-work-detail="${safe(s.lessonId+':'+s.sequence+':document')}"><summary>Source document</summary><div class="teach-paper">${SIMDOCS.render(s.document)}</div></details>`:''}${s.rows?.length?keyTable(s.rows.map(r=>({account:LL.ACC[r.a]?.[0]||r.a,debit:r.d,credit:r.c}))):s.noEntry?'<p>Student submitted: No entry needed.</p>':Object.keys(s.values||{}).length?`<dl>${Object.entries(s.values).map(([k,v])=>`<dt>${safe(s.fields?.find(f=>f.id===k)?.label||k)}</dt><dd>${safe(v)}</dd>`).join('')}</dl>`:''}</details>`).join(''):'<p class="teach-empty">No saved submissions yet. Work appears after the student saves to their account.</p>'}</div>`;
}
function draftKey() { return 'ledger-notes-workspace-' + cloudAccount.id + '-' + cloudClass; }
function notesWorkspace() {
  const key = draftKey();
  if (!instructorDrafts.has(key)) {
    let saved; try { saved = JSON.parse(sessionStorage.getItem(key)); } catch {}
    instructorDrafts.set(key, saved || {step: 0, notes: '', source: '', request: '', year: new Date().getFullYear(), month: 9, reviewed: {documents: false, accounting: false}});
  }
  return instructorDrafts.get(key);
}
function saveNotesDraft() {
  try { sessionStorage.setItem(draftKey(), JSON.stringify(notesWorkspace())); }
  catch { instructorStatus = 'This tab cannot save the draft. Keep it open until you finish reviewing.'; }
}
function studioButton(text, action, primary = false, extra = '') {
  const reviewed=notesWorkspace().reviewed;
  return `<button type="button" class="app-btn ${primary ? '' : 'alt'}" data-studio="${action}" ${instructorBusy || action==='publish'&&(!reviewed.documents||!reviewed.accounting) ? 'disabled' : ''} ${extra}>${text}</button>`;
}
function courseCases() { return cloudCases.filter(c => c.class_id === cloudClass); }
function topicSupport(t) {
  return (!t.practice || t.practice === 'transactions') && !/consolidat|derivative|foreign currency|hedg(?:e|ing)|pension|lease liability/i.test(t.name + ' ' + t.method);
}
function instructorPage(side, cls, book) {
  const assigned = cloudLessons.filter(l => l.class_id === cloudClass), cases = courseCases();
  let main;
  if (dashPage === 'overview' || dashPage === 'students') {
    main = dashPage === 'overview' ? classActivity(cls,book) : studentsWorkspace(cls,book);
  } else if (dashPage === 'plan') {
    main = pageHead('Assignments', 'Manage course periods and additional cases for this class.', newAssignmentButton())
      + `<div class="teach-page-tabs" aria-label="Assignment views"><button data-assignment-tab="assigned" aria-pressed="${assignmentTab==='assigned'}">Assigned work <span>${assigned.length+cases.filter(c=>!c.deleted).length}</span></button><button data-assignment-tab="course" aria-pressed="${assignmentTab==='course'}">Standard course · 14 periods</button></div>`;
    if(assignmentTab==='assigned')main+=assignedWork(cls,book);
    else main+=
      `<section class="teach-panel"><h2>Standard course · 14 periods</h2><div class="app-scroll"><table class="app-table"><thead><tr><th>Period</th><th>Accounting work</th><th>Assignment</th><th>Actions</th></tr></thead><tbody>${SIM.catalog.map((p, i) => {
        const a = assigned.find(a => a.lessonId === p.id || p.id === 'ch2' && a.lessonId === 'ch1');
        return `<tr><td><small>Period ${i + 1}</small><strong>${safe(p.n)} · ${safe(p.title)}</strong></td><td>${safe(p.topics.join(', '))}</td><td>${a ? dueText(a.dueDate) : 'Not assigned'}</td><td><div class="teach-actions"><a class="app-link" href="office.html?preview=${p.id}" target="_blank" rel="noopener">Preview</a>${studioButton(a ? 'Edit due date' : 'Assign', 'assign-' + p.id, false, !cloudClass ? 'disabled' : '')}</div><form class="teach-assign" data-period="${p.id}" hidden><label>Due date<input name="dueDate" type="date" value="${safe(a?.dueDate || '')}"></label><button class="app-btn" ${!cloudClass ? 'disabled' : ''}>${a ? 'Save date' : 'Assign period'}</button></form></td></tr>`;
      }).join('')}</tbody></table></div></section><section class="teach-panel"><h2>Supplemental cases</h2><p>These never replace a course period or change the student’s continuing books.</p>${cases.length ? `<ul class="teach-list">${cases.map(c => `<li><div><strong>${safe(c.title)}</strong><small>${c.deleted ? 'Hidden · student work retained' : dueText(c.dueDate)}</small></div><div class="teach-actions">${c.assignment ? studioButton('Review copy', 'copy-' + c.id) : ''}${studioButton(c.deleted ? 'Restore' : 'Hide', 'visibility-' + c.id)}</div></li>`).join('')}</ul>` : '<p class="teach-muted">No supplemental cases assigned.</p>'}</section>`;
  } else main = notesBuilder(cls);
  return appFrame(side, `<div class="instructor-workspace">${main}</div>${assignmentDialog()}`);
}
function assignedWork(cls,book) {
  const periods=cloudLessons.filter(l=>l.class_id===cloudClass),cases=courseCases(),students=classStudents(book),draft=notesWorkspace();
  const cards=(items,supplement)=>items.map(a=>{
    const finished=students.filter(s=>(supplement?s.caseScores:s.lessonScores)?.some(x=>x.assignment_id===a.id&&x.completed!==false)).length;
    return `<article class="teach-assignment-card"><div><span class="teach-pill ${supplement?'supplement':'pending'}">${supplement?'Supplemental case':'Standard period'}</span>${a.deleted?'<span class="teach-pill pending">Hidden</span>':''}<h2>${safe(a.title)}</h2><p>${dueText(a.dueDate)} · ${finished} of ${students.length} completed</p><div class="teach-progress" role="progressbar" aria-label="Completed students" aria-valuemin="0" aria-valuemax="${students.length||1}" aria-valuenow="${finished}"><span style="width:${students.length?finished/students.length*100:0}%"></span></div></div><div class="teach-actions">${supplement?`${a.assignment?studioButton('Review a copy','copy-'+a.id):''}${studioButton(a.deleted?'Restore':'Hide','visibility-'+a.id)}`:`<a class="app-link" href="office.html?preview=${safe(a.lessonId)}" target="_blank" rel="noopener">Preview</a><button class="app-link" data-assignment-tab="course">Edit due date</button>`}<button class="app-link" data-dash="gradebook">View grades</button></div></article>`;
  }).join('');
  return `${draft.notes?`<aside class="teach-draft-banner"><div><strong>Private notes draft</strong><small>${draft.assignment?'Ready for your review':draft.topics?'Topics extracted':safe(draft.source||'Notes saved in this tab')}. Not assigned to students.</small></div><button class="app-btn alt" data-dash="builder">Resume draft</button></aside>`:''}${!cls?'<p class="teach-empty">Create a class before assigning work.</p>':!periods.length&&!cases.length?'<section class="teach-empty-state"><h2>Assign the first period</h2><p>The standard course has 14 periods. Notes-based cases are additional and use separate books.</p><button class="app-btn" data-assignment-tab="course">Browse standard course</button><button class="app-btn alt" data-dash="builder">Create from notes</button></section>':`<section class="teach-assignment-group"><h2>Standard course <small>${periods.length} assigned</small></h2>${cards(periods,false)||'<p class="teach-muted">No standard periods assigned.</p>'}</section><section class="teach-assignment-group"><h2>Supplemental cases <small>Separate books and grades</small></h2>${cards(cases,true)||'<p class="teach-muted">No additional cases. Use New assignment to create one from your notes.</p>'}</section>`}`;
}
function notesBuilder(cls) {
  const d = notesWorkspace(), step = d.editStep ?? (d.assignment ? d.publishStep ? 3 : 2 : d.topics ? 1 : 0);
  let body;
  if (step === 0) body = `<div class="teach-columns"><section class="teach-panel"><h2>Source notes</h2><label class="teach-field">Upload PDF, DOCX, TXT or Markdown<input id="notes-file" type="file" accept=".pdf,.docx,.txt,.md"></label><p class="teach-muted">Text is extracted in this browser. Only the text you review below is sent for generation. Max 10 MB; text-based PDFs only.</p><label class="teach-field">Notes<textarea id="case-notes" minlength="40" maxlength="30000" rows="12" placeholder="Paste the accounting notes students have already covered…">${safe(d.notes)}</textarea></label><p class="teach-muted"><span id="notes-count">${d.notes.length}</span> / 30,000 characters${d.source ? ' · ' + safe(d.source) : ''}</p><label class="teach-field">Instructor focus (optional)<textarea id="case-request" maxlength="2000" rows="2">${safe(d.request)}</textarea></label><div class="teach-actions"><label class="teach-field">Practice year<input id="case-year" type="number" min="2020" max="2100" value="${d.year}"></label><label class="teach-field">Starting month<select id="case-month">${Array.from({length:12}, (_,i) => `<option value="${i+1}" ${d.month===i+1?'selected':''}>${new Date(2026,i,1).toLocaleString('en-US',{month:'long'})}</option>`).join('')}</select></label></div>${studioButton('Read topics from notes', 'topics', true)}${d.assignment?studioButton('Return to existing draft','review',false,d.sourceChanged?'disabled':''):''}</section><aside class="teach-panel teach-explainer"><h2>What this creates</h2><p>A supplemental case in the student’s office: business requests, reply-button decisions, source documents and journal entries.</p><p>The continuing 14-period course stays unchanged. Case balances are separate practice books for the same company.</p><p>You’ll review the scope, paperwork and accounting key before assigning it to <strong>${safe(cls?.name || 'a class')}</strong>.</p><small>The draft is saved privately in this browser tab and can be resumed after reloading. Nothing is assigned automatically.</small></aside></div>`;
  else if (step === 1) body = `<section class="teach-panel"><h2>Choose the taught accounting work</h2><p>Only transaction topics can become graded journal work. Other material stays visible as context; this builder does not create quiz questions or grade standalone statement preparation.</p>${d.topics.topics.map((t,i) => `<label class="teach-topic"><input type="checkbox" data-topic="${i}" ${d.selected.includes(i)?'checked':''} ${topicSupport(t)?'':'disabled'}><span><strong>${safe(t.name)}</strong><small>${safe(t.principle)} ${safe(t.method)}</small><em>${topicSupport(t)?'Journal-entry practice supported':'Context only · not separately graded in this builder'}</em></span></label>`).join('')}<details><summary>Review the source text</summary><pre class="teach-source">${safe(d.notes)}</pre></details><div class="teach-actions">${studioButton('Back to notes','notes')}${studioButton(d.assignment?'Regenerate case draft':'Generate case draft','generate',true)}${d.assignment?studioButton('Return to existing draft','review',false,d.sourceChanged?'disabled':''):''}</div></section>`;
  else if(step === 2) body = `<section class="teach-panel"><label class="teach-field">Student instructions<textarea id="case-instructions" maxlength="2000" rows="3">${safe(d.assignment.instructions)}</textarea></label><small class="teach-muted">Edit the wording here, or request changes to the documents and accounting below.</small></section>` + draftReview(d, cls);
  else body = casePublishDetails(d,cls);
  return pageHead('Create from your notes', 'Additional cases only. Your standard course and existing student work are unchanged.')
    + `<ol class="teach-steps" aria-label="Assignment creation steps">${['Source notes','Set the scope','Review the case','Assign'].map((s,i)=>`<li ${step===i?'aria-current="step"':''}>${i+1}. ${s}</li>`).join('')}</ol><div id="instructor-status" class="teach-status" role="status" aria-live="polite">${safe(instructorStatus)}</div>${body}`;
}
function draftReview(d, cls) {
  const b = {name:'Review Cycle',type:d.business || 'Bike repair'}, raw=d.assignment;
  const a = {...raw,instructions:Lessons.personalize(raw.instructions,b),interactive:{...raw.interactive,controls:raw.interactive.controls.map(c=>({...c,label:Lessons.personalize(c.label,b),purpose:Lessons.personalize(c.purpose,b)}))}}, choice = reviewChoice(d, b), scenario = Lessons.expected(a,choice,b);
  return `<section class="teach-panel"><div class="teach-review-heading"><h2>Review the student’s case</h2><a class="app-btn alt" id="preview-case" href="office.html?casePreview=1" target="_blank" rel="noopener">Open office preview</a></div><p>${safe(a.instructions)}</p><p class="teach-muted">Preview uses example company balances, not a real student’s books. Review the opening balances, documents and key below. Business replies are not graded.</p><label class="teach-field">Example business<select id="review-business">${['Bike repair','Fitness studio','Landscaping company','Photography studio'].map(x=>`<option ${b.type===x?'selected':''}>${x}</option>`).join('')}</select></label><div class="teach-actions">${studioButton('Review smaller choices','low')}${studioButton('Review default choices','default')}${studioButton('Review larger choices','high')}</div><details open><summary>Business replies to review</summary>${a.interactive.controls.map(c=>`<label class="teach-field">${safe(c.label)}<select data-review-choice="${c.id}"><option value="low" ${d.paths?.[c.id]==='low'?'selected':''}>Smaller / earliest</option><option value="default" ${!d.paths?.[c.id]||d.paths[c.id]==='default'?'selected':''}>Default</option><option value="high" ${d.paths?.[c.id]==='high'?'selected':''}>Larger / latest</option></select><small>${safe(c.purpose)}</small></label>`).join('')}</details><details><summary>Opening balances (separate practice books)</summary>${keyTable(a.blueprint.opening)}</details><div class="teach-review-list">${scenario.events.filter(e=>!e.autoPosted&&!Lessons.decisions.isReportEvent(e)).map(e=>`<article class="teach-review-event"><div class="teach-paper">${SIMDOCS.render({type:'record',title:e.title,no:e.id.toUpperCase(),date:e.date,...e.document})}</div><section><h3>Accounting key · ${safe(e.date)}</h3>${e.lines.length?keyTable(e.lines):'<p>No entry. This document is not a transaction.</p>'}</section></article>`).join('')}</div><details><summary>Notes and topic coverage</summary><ul>${a.teachingTopics.map((t,i)=>`<li>${safe(t.name)} · ${a.topicCoverage.some(c=>c.topicIndex===i)?'Covered by source records':'Context only'}</li>`).join('')}</ul><pre class="teach-source">${safe(d.notes)}</pre></details></section><section class="teach-panel"><h2>Request a revision</h2><label class="teach-field">Changes to this private draft<textarea id="case-revision" maxlength="2000" rows="3" placeholder="For example, use a 30-day supplier invoice and a later payment confirmation."></textarea></label>${studioButton('Revise draft','revise')}<p class="teach-muted">A revision requires a fresh review. Published copies and student work are never changed.</p></section><div class="teach-builder-footer"><p>Documents and accounting keys are visible to instructors only.</p><div class="teach-actions">${studioButton('Back to scope','scope')}${studioButton('Continue to assignment','assignment-details',true)}</div></div>`;
}
function casePublishDetails(d,cls) {
  const a=d.assignment;
  return `<section class="teach-panel"><h2>Assign to ${safe(cls?.name||'a class')}</h2><label class="teach-field">Title<input id="case-title" maxlength="120" value="${safe(d.title || a.title)}"></label><label class="teach-field">Due date (optional)<input id="case-due" type="date" value="${safe(d.dueDate||'')}"></label><label class="teach-topic"><input id="review-documents" type="checkbox" ${d.reviewed.documents?'checked':''}><span>I reviewed the source documents and business replies.</span></label><label class="teach-topic"><input id="review-accounting" type="checkbox" ${d.reviewed.accounting?'checked':''}><span>I checked the opening balances and accounting key across the relevant reply paths.</span></label><p class="teach-muted">A separate gradebook column is added. No standard period is replaced.</p><div class="teach-actions">${studioButton('Back to case review','review')}${studioButton('Assign supplemental case','publish',true,!cls?'disabled':'')}</div></section>`;
}
function keyTable(rows) {
  return `<div class="app-scroll"><table class="app-table"><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.account)}</td><td class="num">${r.debit?cash(r.debit):'—'}</td><td class="num">${r.credit?cash(r.credit):'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function reviewChoice(d,b) {
  const a=d.assignment, choice=Lessons.decisions.defaultChoice(a,b);
  for(const c of a.interactive.controls){const path=d.paths?.[c.id];if(!path||path==='default')continue;
    const n=v=>Math.max(c.min,Math.min(c.max,c.min+Math.round((v-c.min)/c.step)*c.step));
    choice[c.id]=c.kind==='basket'?Object.fromEntries(Object.entries(choice[c.id]).map(([k,v])=>[k,n(v*(path==='low'?.5:1.5))])):path==='low'?c.min:c.max;
  }return choice;
}
async function studioTask(label, fn) {
  if(instructorBusy)return;instructorBusy=true;instructorStatus=label;render();
  const key=draftKey();
  try{await fn();}catch(e){instructorStatus=e.message;}finally{instructorBusy=false;if(key===draftKey())saveNotesDraft();render();}
}
function revealStudentReview() {
  const panel=Q('[data-review-key]');
  if(panel&&typeof matchMedia==='function'&&matchMedia('(max-width:1050px)').matches){panel.tabIndex=-1;panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'instant'});}
}
async function loadStudentWork(email, assignmentId) {
  const key=cloudAccount.id+':'+cloudClass,classId=cloudClass,accountId=cloudAccount.id,request=++workRequest;
  selectedStudent={key,email};
  studentWork={email,classId,accountId,assignmentId,type:assignmentId?'case':'office',loading:true};
  render();
  revealStudentReview();
  try {
    const result=await cloud.call(assignmentId?'case-work':'office-work',assignmentId?{assignmentId,email}:{classId,email});
    if(request!==workRequest||key!==cloudAccount.id+':'+cloudClass||reviewSelection()!==email)return;
    studentWork={...studentWork,...result,loading:false};
  } catch(e) {
    if(request!==workRequest||key!==cloudAccount.id+':'+cloudClass||reviewSelection()!==email)return;
    studentWork={...studentWork,error:e.message,loading:false};
  }
  if(['overview','students','gradebook'].includes(dashPage)){render();revealStudentReview();}
}
function applyRosterFilter() {
  const term=rosterFilter.toLowerCase();let count=0;
  document.querySelectorAll('[data-roster-student]').forEach(el=>{el.hidden=!el.dataset.rosterStudent.toLowerCase().includes(term)||rosterScope==='review'&&el.dataset.needsReview!=='true';if(!el.hidden)count++;});
  const empty=Q('#roster-no-results');if(empty)empty.hidden=count>0;
}
function wireInstructor() {
  const on=(s,e,fn)=>{const el=Q(s);if(el)el[e]=fn;};
  document.querySelectorAll('[data-new-assignment]').forEach(el=>el.onclick=()=>Q('#new-assignment')?.showModal());
  document.querySelectorAll('[data-assignment-tab]').forEach(el=>el.onclick=()=>{assignmentTab=el.dataset.assignmentTab;render();});
  document.querySelectorAll('[data-review-student]').forEach(el=>el.onclick=()=>loadStudentWork(el.dataset.reviewStudent));
  document.querySelectorAll('[data-close-review]').forEach(el=>el.onclick=()=>{workRequest++;selectedStudent=null;studentWork=null;render();if(typeof matchMedia==='function'&&matchMedia('(max-width:1050px)').matches)Q('.teach-review-layout > .teach-panel')?.scrollIntoView({block:'start',behavior:'instant'});});
  on('#roster-filter','oninput',e=>{rosterFilter=e.target.value;applyRosterFilter();});
  document.querySelectorAll('[data-roster-scope]').forEach(el=>el.onclick=()=>{rosterScope=el.dataset.rosterScope;document.querySelectorAll('[data-roster-scope]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rosterScope===rosterScope));applyRosterFilter();});
  applyRosterFilter();
  if(instructorBusy)document.querySelectorAll('.app-main input,.app-main textarea,.app-main select,.app-main button,.app-side button,.app-side select').forEach(el=>el.disabled=true);
  on('#grade-filter','oninput',e=>{gradeFilter=e.target.value;const term=gradeFilter.toLowerCase();document.querySelectorAll('[data-grade-student]').forEach(row=>row.hidden=!row.dataset.gradeStudent.toLowerCase().includes(term));});
  document.querySelectorAll('[data-case-work]').forEach(el=>el.onclick=()=>loadStudentWork(el.dataset.student,el.dataset.caseWork));
  document.querySelectorAll('[data-studio]').forEach(el=>el.onclick=()=>{
    const action=el.dataset.studio,d=notesWorkspace();instructorStatus='';
    if(['review','assignment-details','publish'].includes(action)&&d.sourceChanged){instructorStatus='Source notes changed. Read the topics and generate a new draft before assigning.';render();return;}
    if(action==='choose-course'||action==='choose-notes'){Q('#new-assignment')?.close();dashPage=action==='choose-course'?'plan':'builder';assignmentTab='course';render();return;}
    if(action.startsWith('assign-')){const form=Q(`[data-period="${action.slice(7)}"]`);form.hidden=!form.hidden;return;}
    if(action.startsWith('visibility-')){const c=courseCases().find(c=>c.id===action.slice(11));if(!c||!confirm(c.deleted?'Restore this case with the saved student work?':'Hide this case? Saved student work will be retained.'))return;return studioTask('Updating assignment…',async()=>{await cloud.call(c.deleted?'restore-assignment':'delete-assignment',{assignmentId:c.id});await loadCloud();instructorStatus='Assignment updated.';});}
    if(action.startsWith('copy-')){const c=courseCases().find(c=>c.id===action.slice(5));d.editStep=null;d.publishStep=false;d.sourceChanged=false;d.assignment=structuredClone(c.assignment);d.assignment.id=crypto.randomUUID();d.notes=c.assignment.notes;d.title=c.title;d.dueDate='';d.year=c.assignment.year;d.month=c.assignment.month;d.topics={topics:c.assignment.teachingTopics,sourceParagraphs:[0]};d.selected=d.topics.topics.map((t,i)=>i).filter(i=>topicSupport(d.topics.topics[i]));d.reviewed={documents:false,accounting:false};dashPage='builder';saveNotesDraft();render();return;}
    if(action==='notes'){d.editStep=0;}
    else if(action==='scope'){d.editStep=1;}
    else if(action==='review'){d.editStep=null;d.publishStep=false;}
    else if(action==='assignment-details'){d.editStep=null;d.publishStep=true;}
    else if(['low','default','high'].includes(action)){d.paths=Object.fromEntries(d.assignment.interactive.controls.map(c=>[c.id,action]));}
    else if(action==='topics')return studioTask('Reading accounting topics. Your notes stay saved while this runs…',async()=>{
      if(d.notes.trim().length<40||d.notes.length>30000)throw Error('Paste or upload 40–30,000 characters of notes.');
      const r=await cloud.call('generate',{notes:d.notes,phase:'draft',year:d.year,month:d.month,timelineMode:'manual',depth:'focused',request:d.request});d.topics=r.draft;d.sourceChanged=false;delete d.assignment;d.editStep=null;d.publishStep=false;d.selected=d.topics.topics.map((t,i)=>i).filter(i=>topicSupport(d.topics.topics[i]));instructorStatus='Review the extracted topics before generating a case.';
    });
    else if(action==='generate'||action==='revise'){
      const revision=Q('#case-revision')?.value.trim();return studioTask(action==='revise'?'Revising and checking the draft…':'Generating source documents and checking the accounting…',async()=>{
        if(!d.selected?.length)throw Error('Select at least one supported transaction topic.');
        if(action==='revise'&&!revision)throw Error('Describe the changes to the draft.');
        const input={notes:d.notes,year:d.year,month:d.month,timelineMode:'manual',depth:'focused',request:d.request,phase:action==='revise'?'revise':'review',...(action==='revise'?{currentDraft:d.assignment,request:revision}:{draft:{...d.topics,topics:d.topics.topics.filter((_,i)=>d.selected.includes(i))}})};
        const a=await cloud.call('generate',input);SIMCases.validate(a);d.assignment=a;d.sourceChanged=false;d.editStep=null;d.publishStep=false;d.title=a.title.slice(0,120);d.paths={};d.reviewed={documents:false,accounting:false};instructorStatus='Draft ready. Nothing has been assigned.';
      });
    }else if(action==='publish')return studioTask('Assigning the reviewed supplemental case…',async()=>{
      if(!cloudClass)throw Error('Create or select a class first.');if(!d.reviewed.documents||!d.reviewed.accounting)throw Error('Confirm both document and accounting reviews before assigning.');
      await cloud.call('case-publish',{classId:cloudClass,title:d.title||d.assignment.title,dueDate:d.dueDate||null,assignment:d.assignment,reviewed:d.reviewed});
      instructorDrafts.delete(draftKey());sessionStorage.removeItem(draftKey());await loadCloud();assignmentTab='assigned';dashPage='plan';instructorStatus='Supplemental case assigned. The standard course is unchanged.';cloudMessage=instructorStatus;
    });
    saveNotesDraft();render();
  });
  document.querySelectorAll('.teach-assign').forEach(f=>f.onsubmit=e=>{e.preventDefault();const p=SIM.catalog.find(p=>p.id===f.dataset.period),dueDate=new FormData(f).get('dueDate');studioTask('Saving the course assignment…',async()=>{await cloud.call('lesson-assign',{classId:cloudClass,lessonId:p.id,title:p.n+' · '+p.title,dueDate});await loadCloud();instructorStatus='Period assigned.';cloudMessage=instructorStatus;});});
  if(dashPage!=='builder')return;
  const d=notesWorkspace();
  for(const [id,key] of [['case-notes','notes'],['case-request','request'],['case-title','title'],['case-due','dueDate'],['case-year','year'],['case-month','month']])on('#'+id,'oninput',e=>{d[key]=['year','month'].includes(key)?Number(e.target.value):e.target.value;if(['notes','request','year','month'].includes(key)&&d.assignment){d.sourceChanged=true;d.reviewed={documents:false,accounting:false};instructorStatus='Source notes changed. Read the topics and generate a new draft before assigning.';if(Q('#instructor-status'))Q('#instructor-status').textContent=instructorStatus;if(Q('[data-studio="review"]'))Q('[data-studio="review"]').disabled=true;}saveNotesDraft();if(key==='notes'&&Q('#notes-count'))Q('#notes-count').textContent=d.notes.length;});
  on('#case-instructions','oninput',e=>{d.assignment.instructions=e.target.value;d.reviewed={documents:false,accounting:false};for(const key of ['documents','accounting'])if(Q('#review-'+key))Q('#review-'+key).checked=false;if(Q('[data-studio="publish"]'))Q('[data-studio="publish"]').disabled=true;saveNotesDraft();});
  on('#notes-file','onchange',e=>{const file=e.target.files[0];if(!file)return;studioTask('Extracting the file text in your browser…',async()=>{const text=await readCourseNotes(file);if(text.length>30000)throw Error('This file contains more than 30,000 characters. Upload a shorter section or paste an excerpt.');d.notes=text;d.source=file.name;if(d.assignment){d.sourceChanged=true;d.reviewed={documents:false,accounting:false};}instructorStatus='Text loaded. Review it before reading topics.';});});
  document.querySelectorAll('[data-topic]').forEach(el=>el.onchange=()=>{d.selected=[...document.querySelectorAll('[data-topic]:checked')].map(x=>Number(x.dataset.topic));saveNotesDraft();});
  for(const key of ['documents','accounting'])on('#review-'+key,'onchange',e=>{d.reviewed[key]=e.target.checked;if(Q('[data-studio="publish"]'))Q('[data-studio="publish"]').disabled=!d.reviewed.documents||!d.reviewed.accounting;saveNotesDraft();});
  on('#review-business','onchange',e=>{d.business=e.target.value;saveNotesDraft();render();});
  document.querySelectorAll('[data-review-choice]').forEach(el=>el.onchange=e=>{d.paths={...d.paths,[el.dataset.reviewChoice]:e.target.value};saveNotesDraft();render();});
  on('#preview-case','onclick',e=>{e.preventDefault();sessionStorage.setItem('ledger-case-preview-'+cloudAccount.id,JSON.stringify({assignment:d.assignment,type:Object.keys(LL.PROFILES).find(k=>LL.PROFILES[k].type===d.business)||'bike'}));location.href='office.html?casePreview=1';});
}
function instructorGradebook(side, cls, book) {
  const periods=book?.lessons||cloudLessons.filter(l=>l.class_id===cloudClass),cases=book?.cases||courseCases().filter(c=>!c.deleted);
  const columns=[...periods,...cases.map(c=>({...c,kind:'supplement'}))],students=book?.students||[];
  let body=!cls?'<p class="teach-empty">Create or select a class first.</p>':!book?'<p class="teach-empty">Loading the gradebook…</p>':book.error?`<p role="alert">${safe(book.error)}</p>`:!columns.length?'<p class="teach-empty">Assign a course period or a supplemental case to begin.</p>':!students.length?'<p class="teach-empty">Add your students on the Students page.</p>':`<label class="teach-field teach-filter">Find a student<input id="grade-filter" type="search" value="${safe(gradeFilter)}" placeholder="Email or business name"></label><div class="app-scroll"><table class="app-table"><thead><tr><th scope="col">Student</th>${columns.map(c=>`<th scope="col" class="num">${safe(c.title)}<small>${c.kind==='supplement'?'Supplemental case · ':''}${dueText(c.dueDate)}</small></th>`).join('')}<th scope="col" class="num">Average</th></tr></thead><tbody>${students.map(s=>{
    const scores=columns.map(c=>(c.kind==='supplement'?s.caseScores:s.lessonScores)?.find(x=>x.assignment_id===c.id));
    return `<tr data-grade-student="${safe(s.email+' '+(s.business?.name||''))}" ${!(s.email+' '+(s.business?.name||'')).toLowerCase().includes(gradeFilter.toLowerCase())?'hidden':''}><th scope="row"><button class="app-link teach-grade-student" data-review-student="${safe(s.email)}">${safe(s.business?.founder||s.email)}</button><small>${safe(s.business?.name||s.email)}</small></th>${columns.map((c,i)=>`<td class="num">${scores[i]?.completed===false?'In progress':scores[i]?scoreBadge(scores[i]):'—'}${c.kind==='supplement'&&scores[i]?`<small><button class="app-link" data-case-work="${c.id}" data-student="${safe(s.email)}">View attempts</button></small>`:''}</td>`).join('')}<td class="num">${avg(scores.filter(x=>x&&x.completed!==false))}</td></tr>`;
  }).join('')}</tbody></table></div><p class="app-note">Only completed work enters the average. Scores use the first accounting attempt; business replies are not graded.</p>`;
  return appFrame(side,`<div class="instructor-workspace">${pageHead('Gradebook',safe(cls?.name||''),newAssignmentButton())}<div class="teach-status" role="status">${safe(instructorStatus)}</div><div class="teach-review-layout teach-grade-layout"><section class="teach-panel teach-grade-panel">${body}</section>${studentReviewPanel(book)}</div></div>${assignmentDialog()}`);
}
function workReview(work) {
  const st=work.state;
  return `<section class="teach-panel"><h2>${safe(work.email)} · Supplemental work</h2>${!st?'<p>This student has not opened the case.</p>':`<p>${st.ended?'Completed':'In progress'} · ${st.first} of ${st.graded} correct on the first try.</p>${work.attempts.filter(a=>a.submitted.event?.kind==='handle').map(a=>{
    const e=a.submitted.event,it=st.casePeriod.items.find(x=>x.id===e.id);
    return `<details data-work-detail="case:${safe(work.assignmentId)}:${a.revision}"><summary>${safe(it?.subject||e.id)} · Submission ${a.revision}</summary>${e.action.rows?keyTable(e.action.rows.map(r=>({account:LL.ACC[r.a]?.[0]||r.a,debit:r.d,credit:r.c}))):`<p>${e.action.noEntry?'No entry needed':e.action.choice?'Business instructions sent (not graded).':'No journal lines.'}</p>`}</details>`;
  }).join('')}`}</section>`;
}
function studentCasesPanel(grades) {
  const cases=cloudCases.filter(c=>!c.deleted),score=c=>cloudCaseScores.find(s=>s.assignment_id===c.id);
  if(!cases.length)return '';
  const rows=grades?cases.filter(c=>score(c)?.completed):cases;
  return `<section class="teach-panel"><h2>Supplemental cases</h2><p class="app-note">Additional practice for your company, with separate books. Your standard course progress is unchanged.</p>${rows.length?`<div class="app-scroll"><table class="app-table"><thead><tr><th>Case</th><th>Due</th><th class="num">${grades?'Score':'Status'}</th></tr></thead><tbody>${rows.sort((a,b)=>String(a.dueDate||'9').localeCompare(String(b.dueDate||'9'))).map(c=>{const s=score(c);return `<tr><td><strong>${safe(c.title)}</strong></td><td>${dueText(c.dueDate).replace('Due ','')}</td><td class="num">${s?.completed?scoreBadge(s):''}${!grades?` <a class="app-link" href="office.html?case=${encodeURIComponent(c.id)}">${s?.completed?'Review':s?'Continue':'Start'}</a>`:''}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="teach-muted">No completed supplemental cases yet.</p>'}</section>`;
}
