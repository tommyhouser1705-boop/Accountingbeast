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
  const c=view();assert.match(c.show('overview'),/Plan the course/);
  c.cloudCases=[{id:'case-a',class_id:'class-a',title:'A case'},{id:'case-b',class_id:'class-b',title:'B case'}];
  const plan=c.show('plan');for(const p of global.SIM.catalog)assert.ok(plan.includes(safe(p.title)));
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
