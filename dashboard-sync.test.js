const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(student=false){
 let now=100000,blocked=false;const timers=new Map(),listeners=new Map(),nodes=new Map([['#class-sync-status',{}],['#refresh-class',{}]]),calls=[];
 const c=vm.createContext({Date:class extends Date{static now(){return now;}},Map,Promise,console,
  cloudAccount:{id:'user-a',role:student?'student':'professor'},cloudClass:'a',cloudScreen:'dashboard',cloudBusy:false,instructorBusy:false,dashPage:'overview',cloudBook:{},cloudClasses:[],cloudLessons:[],cloudLessonScores:[],cloudCases:[],cloudCaseScores:[],data:{profile:null,assignments:[],runs:{preserve:true}},teacherDraft:{notes:'Keep these'},
  document:{hidden:false,activeElement:{tagName:'BODY'},querySelector:()=>blocked?{}:null,querySelectorAll:()=>[],addEventListener:(k,v)=>listeners.set(k,v)},window:{addEventListener:(k,v)=>listeners.set(k,v)},
  setTimeout:fn=>{const id=Symbol();timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),Q:s=>nodes.get(s),render:()=>{c.renders++;},accountError:()=>{c.cloudAccount=null;},cloud:{call:async(a,p)=>{calls.push([a,p]);return c.reply(a,p);}}});
 c.renders=0;c.reply=()=>({students:[{email:'alex@example.edu'}],lessons:[]});
 const source=fs.readFileSync('cloud.js','utf8');vm.runInContext(source.slice(source.indexOf('// Refresh only visible'),source.indexOf('function stepItem')),c);
 return {c,calls,timers,listeners,nodes,advance:ms=>now+=ms,block:value=>blocked=value};
}
test('gradebook expires after 15 seconds, coalesces requests and does not redraw unchanged data',async()=>{
 const {c,calls,advance}=fixture();await Promise.all([c.loadBook(),c.loadBook()]);assert.equal(calls.length,1);assert.equal(c.renders,1);
 await c.loadBook();advance(14999);await c.loadBook();assert.equal(calls.length,1);
 advance(1);await c.loadBook();assert.equal(calls.length,2);assert.equal(c.renders,1);
 c.reply=()=>({students:[{email:'alex@example.edu',business:{name:'River Cycle'}}],lessons:[]});await c.loadBook(true);assert.equal(c.cloudBook.a.students[0].business.name,'River Cycle');assert.equal(c.renders,2);
});
test('failed background refresh retains last good data and remains retryable',async()=>{
 const {c,advance}=fixture();await c.loadBook();c.reply=()=>{throw Error('Offline');};advance(15000);await c.loadBook();
 assert.equal(c.cloudBook.a.students.length,1);assert.match(c.dashboardRefreshLabel(),/last successful/);
 c.reply=()=>({students:[],lessons:[]});await c.loadBook(true);assert.equal(c.cloudBook.a.students.length,0);assert.doesNotMatch(c.dashboardRefreshLabel(),/Couldn’t/);
});
test('an initial load error does not become a permanently cached empty class',async()=>{
 const {c,calls,advance}=fixture();c.reply=()=>{throw Error('Offline');};await c.loadBook();assert.match(c.cloudBook.a.error,/Offline/);
 await c.loadBook();assert.equal(calls.length,1);advance(15000);c.reply=()=>({students:[{}],lessons:[]});await c.loadBook();assert.equal(c.cloudBook.a.students.length,1);
});
test('student refresh receives assignments and scores without resetting work or a private draft',async()=>{
 const {c,calls}=fixture(true);c.reply=()=>({classes:[{id:'class'}],lessons:[{id:'new'}],lessonScores:[{score:95}],cases:[{id:'extra'}],caseScores:[],business:{name:'My company'},assignments:[]});
 await c.refreshDashboardData();assert.equal(calls[0][0],'bootstrap');assert.equal(c.cloudLessons[0].id,'new');assert.equal(c.cloudLessonScores[0].score,95);assert.equal(c.data.runs.preserve,true);assert.equal(c.teacherDraft.notes,'Keep these');
});
test('visibility, busy states, note building and active or dirty forms pause background requests',async()=>{
 const {c,calls,block}=fixture();c.document.hidden=true;await c.loadBook(true);c.document.hidden=false;
 c.cloudBusy=true;await c.loadBook(true);c.cloudBusy=false;c.instructorBusy=true;await c.loadBook(true);c.instructorBusy=false;
 c.dashPage='builder';await c.loadBook(true);c.dashPage='students';c.document.activeElement.tagName='INPUT';await c.loadBook(true);c.document.activeElement.tagName='BODY';block(true);await c.loadBook(true);assert.equal(calls.length,0);
 block(false);await c.loadBook(true);assert.equal(calls.length,1);
});
test('a response arriving during typing waits to redraw until the dashboard is idle',async()=>{
 const {c,advance}=fixture();let resolve;c.reply=()=>new Promise(r=>resolve=r);const request=c.loadBook();await Promise.resolve();c.document.activeElement.tagName='TEXTAREA';resolve({students:[],lessons:[]});await request;assert.equal(c.renders,0);
 c.document.activeElement.tagName='BODY';await c.loadBook();assert.equal(c.renders,1);advance(15000);
});
test('class switches cannot paint the wrong roster; superseded sessions cannot populate the cache',async()=>{
 const {c}=fixture();let resolve;c.reply=()=>new Promise(r=>resolve=r);const request=c.loadBook();await Promise.resolve();c.cloudClass='b';resolve({students:[{email:'a'}],lessons:[]});await request;assert.equal(c.cloudBook.a.students[0].email,'a');assert.equal(c.renders,0);
 c.cloudClass='a';const second=c.loadBook(true);await Promise.resolve();c.resetDashboardRefresh();c.cloudAccount={id:'user-b',role:'professor'};resolve({students:[{email:'old response'}]});await second;assert.equal(c.cloudBook.a.students[0].email,'a');
});
test('refresh timers and focus/online listeners install once and stop making requests off-dashboard',async()=>{
 const {c,timers,listeners,calls}=fixture();c.startDashboardRefresh();c.startDashboardRefresh();assert.equal(timers.size,1);assert.equal(listeners.size,4);
 await listeners.get('focus')();assert.equal(calls.length,1);c.document.hidden=true;await listeners.get('visibilitychange')();assert.equal(calls.length,1);
 c.document.hidden=false;await listeners.get('online')();assert.equal(calls.length,2);c.cloudScreen='login';c.startDashboardRefresh();assert.equal(timers.size,0);
});
test('invalidating a class forces a new roster load after an invitation or removal',async()=>{
 const {c,calls}=fixture();await c.loadBook();c.invalidateClassBook('a');await c.loadBook();assert.equal(calls.length,2);
});
test('initial sign-in starts the roster request as soon as its busy action ends, not at the next poll',async()=>{
 const {c,calls}=fixture(),source=fs.readFileSync('cloud.js','utf8');vm.runInContext(source.slice(source.indexOf('async function cloudTask'),source.indexOf('persist=function')),c);
 await c.cloudTask(async()=>{await c.loadBook();assert.equal(calls.length,0);});await c.loadBook();assert.equal(calls.length,1);
});
test('new and removed class assignments are reflected in both the plan and gradebook',async()=>{
 const {c}=fixture();c.cloudLessons=[{id:'old',class_id:'a'},{id:'other',class_id:'b'}];c.reply=()=>({students:[],lessons:[{id:'new'}],cases:[{id:'supplement'}]});await c.loadBook();
 assert.equal(c.cloudLessons.some(x=>x.id==='old'),false);assert.equal(c.cloudLessons.find(x=>x.id==='new').class_id,'a');assert.equal(c.cloudLessons.some(x=>x.id==='other'),true);assert.equal(c.cloudCases[0].id,'supplement');
});
test('clearing an edited form resumes updates rather than leaving the class permanently paused',async()=>{
 const {c,listeners,block}=fixture();c.startDashboardRefresh();const field={tagName:'INPUT',type:'email',value:'alex@example.edu',defaultValue:''},form={elements:[field],toggleAttribute:(name,dirty)=>block(dirty)};
 const input=()=>listeners.get('input')({target:{closest:()=>form}});input();assert.match(c.dashboardRefreshLabel(),/paused while editing/);assert.equal(c.dashboardReady(),false);
 field.value='';input();assert.equal(c.dashboardReady(),true);await c.loadBook();assert.equal(c.cloudBook.a.students.length,1);
});
