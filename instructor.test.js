const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Lessons=require('./lesson-engine');
require('./lessons-engine');require('./sim-docs');require('./sim-engine');require('./sim-month1');require('./sim-course');require('./sim-replay');
const SIMCases=require('./sim-cases');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(storage=new Map()) {
  let buttons=[];
  const c=vm.createContext({Lessons,SIMCases,SIM:global.SIM,LL:global.LL,SIMDOCS:global.SIMDOCS,crypto,structuredClone,console,Date,Map,FormData,safe,cash:n=>'$'+Number(n).toFixed(2),
    cloudAccount:{id:'teacher-1',email:'prof@example.edu',role:'professor'},cloudClass:'class-a',cloudClasses:[{id:'class-a',name:'Section A'},{id:'class-b',name:'Section B'}],cloudLessons:[],cloudLessonScores:[],cloudCases:[],cloudCaseScores:[],cloudBook:{},cloudMessage:'',location:{hash:''},data:{profile:null},dueText:d=>d?'Due '+safe(d):'No due date',scoreBadge:s=>'<b>'+s.score+'%</b>',
    Q:()=>null,document:{querySelectorAll:s=>s==='[data-studio]'?buttons:[]},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},classOptions:()=>'',loadBook:()=>{},confirm:()=>true,
    loadCloud:async()=>{},cloud:{call:async()=>{}},render:()=>{c.html=c.cloudAccount.role==='student'?c.studentHome():c.professorHome();}});
  vm.runInContext(fs.readFileSync('dashboard.js','utf8'),c);vm.runInContext(fs.readFileSync('instructor.js','utf8'),c);
  c.show=page=>{vm.runInContext(`dashPage=${JSON.stringify(page)}`,c);c.render();return c.html;};
  c.click=async action=>{buttons=[{dataset:{studio:action}}];c.wireInstructor();await buttons[0].onclick();};
  return c;
}
let assignment;
async function generated() {
  if(assignment)return structuredClone(assignment);
  const {generateCourseAssignment}=await import('./supabase/functions/classroom/generator.mjs'),{topicDraft,scenarioDraft}=require('./test-fixtures/interactive-assignment.cjs');let n=0;
  assignment=await generateCourseAssignment(Lessons,{notes:'Supplies bought on account, supplier payments and month-end supplies counts.',year:2026,month:9,depth:'focused'},{key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++n===1?topicDraft():scenarioDraft())}}]})})});return structuredClone(assignment);
}
test('one instructor workspace shows all standard periods, class-scoped cases and escaped private notes',()=>{
  const c=view();assert.match(c.show('overview'),/Class activity/);
  c.cloudCases=[{id:'case-a',class_id:'class-a',title:'A case'},{id:'case-b',class_id:'class-b',title:'B case'}];
  vm.runInContext("assignmentTab='course'",c);const plan=c.show('plan');for(const p of global.SIM.catalog)assert.ok(plan.includes(safe(p.title)));
  assert.match(plan,/A case/);assert.doesNotMatch(plan,/B case|undefined/);
  assert.equal((plan.match(/data-period=/g)||[]).length,14);
  const d=c.notesWorkspace();d.notes='<img src=x onerror=alert(1)>';c.saveNotesDraft();
  assert.match(c.show('builder'),/&lt;img/);assert.doesNotMatch(c.html,/<img src=x/);
  c.cloudClass='class-b';assert.equal(c.notesWorkspace().notes,'');
  c.cloudClass='class-a';assert.equal(c.notesWorkspace().notes,d.notes);
});
test('notes to scope to reviewed case requires explicit publish approval and preserves the standard course',async()=>{
  const a=await generated(),c=view(),calls=[];c.show('builder');const d=c.notesWorkspace();d.notes=a.notes;
  c.cloud.call=async(action,p)=>{calls.push({action,p});if(action==='generate')return p.phase==='draft'?{draft:{topics:a.teachingTopics,sourceParagraphs:[0]}}:a;return {id:'new-case'};};
  await c.click('topics');assert.ok(d.topics);assert.equal(d.selected.length,1);assert.match(c.html,/Journal-entry practice supported/);
  await c.click('generate');assert.ok(d.assignment);assert.match(c.html,/Accounting key/);assert.doesNotMatch(c.html,/undefined/);
  assert.equal(calls.some(x=>x.action==='case-publish'),false);
  await c.click('publish');assert.equal(calls.some(x=>x.action==='case-publish'),false);assert.match(c.html,/Confirm both document and accounting reviews/);
  d.reviewed={documents:true,accounting:true};d.title='My additional case';await c.click('publish');
  const published=calls.find(x=>x.action==='case-publish');assert.equal(published.p.classId,'class-a');assert.equal(published.p.title,d.title);
  assert.equal(calls.some(x=>x.action==='lesson-assign'),false);assert.equal(c.notesWorkspace().notes,'');assert.match(c.html,/Standard course/);
});
test('failed generation keeps notes and private draft; reload resumes only the same account and class',async()=>{
  const storage=new Map(),c=view(storage);c.show('builder');const d=c.notesWorkspace();d.notes='Supplies are an asset until consumed. Payables are settled with cash.';c.saveNotesDraft();
  c.cloud.call=async()=>{throw Error('Generation is not connected.');};await c.click('topics');assert.match(c.html,/Generation is not connected/);assert.equal(d.notes.includes('Supplies'),true);
  const refreshed=view(storage);assert.equal(refreshed.notesWorkspace().notes,d.notes);refreshed.cloudClass='class-b';assert.equal(refreshed.notesWorkspace().notes,'');
  refreshed.cloudClass='class-a';refreshed.cloudAccount={id:'other-professor',role:'professor',email:'other@example.edu'};assert.equal(refreshed.notesWorkspace().notes,'');
});
test('student cases expose no builder controls and completed and in-progress scores are kept separate',()=>{
  const c=view();c.cloudAccount={id:'student',email:'student@example.edu',role:'student'};
  c.cloudCases=[{id:'a',title:'Extra practice',dueDate:'2026-11-20'},{id:'b',title:'Finished practice'}];c.cloudCaseScores=[{assignment_id:'a',completed:false,score:40},{assignment_id:'b',completed:true,score:85}];
  assert.match(c.show('assignments'),/office.html\?case=a/);assert.match(c.html,/Continue/);assert.doesNotMatch(c.html,/Create from notes|data-studio/);
  const grades=c.show('grades');assert.match(grades,/85%/);assert.doesNotMatch(grades,/40%/);
});
test('gradebook only averages finished cases and shows accounting attempt review, never business scores',()=>{
  const c=view();c.cloudBook['class-a']={lessons:[],cases:[{id:'a',title:'Practice'}],students:[{email:'student@example.edu',caseScores:[{assignment_id:'a',completed:false,score:40}]}]};
  assert.match(c.show('gradebook'),/In progress/);assert.match(c.html,/View attempts/);assert.doesNotMatch(c.html,/40%/);
  c.cloudBook['class-a'].students[0].caseScores[0].completed=true;assert.match(c.show('gradebook'),/40%/);
});
test('roster shows office progress and distinguishes invited accounts from an unstarted office',()=>{
 const c=view();c.cloudBook['class-a']={students:[{email:'alex@example.edu',business:{name:'River Cycle'},accountCreated:true,office:{period:'First month',day:7,updatedAt:'2026-10-27T15:00:00Z'}},{email:'new@example.edu',accountCreated:true},{email:'invited@example.edu',accountCreated:false}]};
 const html=c.show('students');assert.match(html,/River Cycle/);assert.match(html,/First month · Day 7/);assert.match(html,/datetime="2026-10-27T15:00:00Z"/);assert.match(html,/Office not started/);assert.match(html,/Invited · not registered/);assert.match(html,/Account registered/);
});
test('registration confirmation is separate from whether the office has been started',()=>{
 const c=view(),s={email:'new@example.edu',accountCreated:true,registration:{createdAt:'2026-10-29',confirmedAt:null}};
 assert.match(c.workStatus(s),/Email not confirmed/);assert.match(c.rosterProgress(s),/Confirm email to sign in/);
 s.registration.confirmedAt='2026-10-29';assert.match(c.workStatus(s),/Account registered/);assert.match(c.rosterProgress(s),/Office not started/);
});
test('class activity sorts saved businesses, separates missed first attempts from account setup and escapes identities',()=>{
 const c=view();c.cloudBook['class-a']={students:[{email:'new@example.edu',accountCreated:false},{email:'saved@example.edu',business:{name:'<img src=x>',founder:'A & B'},accountCreated:true,office:{period:'Opening month',day:4,graded:3,first:2,updatedAt:'2026-11-01T12:00:00Z'}}]};
 const html=c.show('overview');assert.ok(html.indexOf('data-review-student="saved@')<html.indexOf('data-review-student="new@'));
 assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img src=x>/);assert.match(html,/At least one missed first attempt/);assert.match(html,/data-new-assignment/);
 assert.equal(c.studentNeedsReview(c.cloudBook['class-a'].students[0]),true);
});
test('student review ignores superseded requests and class or account changes',async()=>{
 const c=view(),pending=[];c.show('overview');c.cloud.call=()=>new Promise(resolve=>pending.push(resolve));
 const first=c.loadStudentWork('a@example.edu'),second=c.loadStudentWork('b@example.edu');
 pending[1]({submissions:[{id:'new'}]});await second;pending[0]({submissions:[{id:'stale'}]});await first;
 assert.equal(vm.runInContext('studentWork.submissions[0].id',c),'new');
 const third=c.loadStudentWork('b@example.edu');c.cloudClass='class-b';pending[2]({submissions:[{id:'other-class'}]});await third;
 assert.equal(c.reviewSelection(),'');assert.equal(vm.runInContext('studentWork.submissions',c),undefined);
 c.cloudClass='class-a';const fourth=c.loadStudentWork('b@example.edu');c.cloudAccount={id:'other-account',role:'professor'};pending[3]({submissions:[{id:'other-account'}]});await fourth;
 assert.equal(c.reviewSelection(),'');assert.equal(vm.runInContext('studentWork.submissions',c),undefined);
});
test('student review failures remain retryable and do not replace the roster',async()=>{
 const c=view();c.cloudBook['class-a']={students:[{email:'a@example.edu',accountCreated:true,business:{name:'River Cycle'}}]};
 c.cloud.call=async()=>{throw Error('Connection unavailable');};await c.loadStudentWork('a@example.edu');
 assert.match(c.show('students'),/Connection unavailable/);assert.match(c.html,/Retry course review/);assert.match(c.html,/River Cycle/);
 c.cloud.call=async()=>({submissions:[]});await c.loadStudentWork('a@example.edu');assert.match(c.show('students'),/No saved submissions yet/);
});
test('a delayed student review does not interrupt assignment editing after navigating away',async()=>{
 const c=view();c.show('overview');let finish,renders=0;c.cloud.call=()=>new Promise(resolve=>finish=resolve);c.render=()=>renders++;
 const pending=c.loadStudentWork('a@example.edu');assert.equal(renders,1);vm.runInContext("dashPage='builder'",c);finish({submissions:[]});await pending;assert.equal(renders,1);
});
test('builder separates review from assignment and going back preserves the draft without another generation call',async()=>{
 const c=view(),a=await generated();c.show('builder');const d=c.notesWorkspace();d.assignment=a;d.notes=a.notes;d.topics={topics:a.teachingTopics};d.selected=[0];d.reviewed={documents:false,accounting:false};
 assert.match(c.show('builder'),/Continue to assignment/);assert.doesNotMatch(c.html,/id="case-title"/);
 await c.click('assignment-details');assert.match(c.html,/id="case-title"/);assert.match(c.html,/data-studio="publish" disabled/);
 await c.click('scope');assert.equal(d.assignment,a);await c.click('review');assert.match(c.html,/Accounting key/);
 await c.click('notes');assert.equal(d.assignment,a);assert.match(c.html,/Return to existing draft/);
 d.sourceChanged=true;await c.click('publish');assert.match(c.html,/Source notes changed/);assert.equal(d.assignment,a);
});
test('assigned work and supplemental cases stay distinct and student review cannot cross account boundaries',async()=>{
 const c=view();c.cloudLessons=[{id:'l-a',lessonId:'ch2',title:'Opening month',class_id:'class-a'}];c.cloudCases=[{id:'c-a',class_id:'class-a',title:'Extra supplies',dueDate:'2026-11-12'}];
 c.cloudBook['class-a']={students:[{email:'a@example.edu',accountCreated:true,lessonScores:[{assignment_id:'l-a',completed:true,score:90}],caseScores:[{assignment_id:'c-a',completed:false,score:40}]}]};
 let html=c.show('plan');assert.match(html,/Standard period/);assert.match(html,/Supplemental case/);assert.match(html,/1 of 1 completed/);assert.match(html,/0 of 1 completed/);
 c.cloud.call=async()=>({submissions:[{subject:'Private review',kind:'entry',period:'Opening',rows:[],values:{},graded:true,correct:false}]});await c.loadStudentWork('a@example.edu');assert.match(c.show('gradebook'),/Private review/);
 c.cloudAccount={id:'another-teacher',role:'professor'};assert.doesNotMatch(c.show('gradebook'),/Private review/);
});
