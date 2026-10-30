const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('./lesson-engine');
require('./lessons-engine');require('./sim-docs');require('./sim-engine');require('./sim-month1');require('./sim-course');require('./sim-replay');
const Cases=require('./sim-cases');
async function supplementalDraft(){
 const {generateCourseAssignment}=await import('./supabase/functions/classroom/generator.mjs'),{topicDraft,scenarioDraft}=require('./test-fixtures/interactive-assignment.cjs');let n=0;
 return generateCourseAssignment(L,{notes:'Supplies bought on account, supplier payments and month-end supplies counts.',year:2026,month:9,depth:'focused'},{key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++n===1?topicDraft():scenarioDraft())}}]})})});
}
test('office work review handles all course periods and worksheets, caps history and leaves corrupt saves unchanged',async()=>{
 const {call,c,store}=await fixture(),S=global.SIM;
 const run={config:{type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23},events:[]},st=S.newGame(run.config);
 for(let n=0;n<2000;n++){
  const it=S.open(st)[0];let e;
  if(it){let action;
   if(it.kind==='decision')action={choice:Object.fromEntries(S.V(it.q,st).map(q=>[q.id,q.opts[0].v]))};
   else if(it.kind==='work')action={values:Object.fromEntries(S.V(it.fields,st).map(f=>[f.id,f.value]))};
   else {const w=S.want(st,it);action=w?{rows:w.map(([a,side,v])=>({a,d:side==='dr'?v:0,c:side==='cr'?v:0}))}:{noEntry:true};}
   e={kind:'handle',id:it.id,action};assert.equal(S.handle(st,it.id,action).ok,true);
  }else if(!st.ended){e={kind:S.nextDay(st)==null?'complete':'advance'};if(e.kind==='complete')S.complete(st);else S.advance(st);}
  else if(st.m<S.catalog.length-1){e={kind:'next'};assert.ok(S.nextMonth(st));}else break;
  run.events.push(e);
 }
 assert.equal(st.m,S.catalog.length-1);assert.ok(st.ended);for(const p of S.catalog)await call(prof,'lesson-assign',{classId:c.id,lessonId:p.id,title:p.title});await call(student,'office-save',{revision:0,run});
 const work=await call(prof,'office-work',{classId:c.id,email:student.email});assert.equal(work.submissions.length,100);assert.equal(work.truncated,true);
 const worksheet=work.submissions.find(s=>s.kind==='work');assert.ok(worksheet);assert.ok(worksheet.fields.every(f=>f.label&&!('value' in f)));assert.ok(work.submissions.every(s=>!s.lines));
 const profile=store.tables.demo_profiles.find(p=>p.id===student.id);profile.office.run.events.push({kind:'unknown'});const before=JSON.stringify(profile);
 await assert.rejects(()=>call(prof,'office-work',{classId:c.id,email:student.email}),e=>e.status===409);assert.equal(JSON.stringify(profile),before);
});
test('supplemental cases are authorized, reviewed, independently saved and server graded; standard books stay intact',async()=>{
 const {call,c,store}=await fixture(),a=await supplementalDraft(),S=global.SIM;
 const p={classId:c.id,title:'Extra supplies case',dueDate:'2026-11-12',assignment:a,reviewed:{documents:true,accounting:true}};
 await assert.rejects(()=>call(student,'case-publish',p),e=>e.status===403);
 await assert.rejects(()=>call(other,'case-publish',p),e=>e.status===403);
 await assert.rejects(()=>call(prof,'case-publish',{...p,reviewed:{}}));
 await assert.rejects(()=>call(prof,'case-publish',{...p,dueDate:'2026-99-99'}));
 const published=await call(prof,'case-publish',p),id=published.id;
 assert.equal((await call(prof,'case-publish',p)).id,id,'retrying publication does not create duplicates');
 assert.equal((await call(prof,'case-work',{assignmentId:id,email:student.email})).state,null);
 await assert.rejects(()=>call(student,'case-work',{assignmentId:id,email:student.email}),e=>e.status===403);
 await assert.rejects(()=>call(other,'case-work',{assignmentId:id,email:student.email}),e=>e.status===403);
 await assert.rejects(()=>call(prof,'case-work',{assignmentId:id,email:outsider.email}),e=>e.status===403);
 await assert.rejects(()=>call(outsider,'case-load',{assignmentId:id}),e=>e.status===403);
 await assert.rejects(()=>call(student,'case-load',{assignmentId:id}),/Create your company/);
 const config={type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23};
 await call(student,'office-save',{revision:0,run:{config,events:[]}});
 const standard=JSON.stringify(store.tables.demo_profiles.find(x=>x.id===student.id).office),lib=await call(prof,'lesson-assign',{classId:c.id,lessonId:'ch2',title:'Opening month'});
 let {state,revision}=await call(student,'case-load',{assignmentId:id});
 assert.equal(state.casePeriod.title,p.title);assert.equal(state.caseChoices,undefined);
 assert.ok(state.casePeriod.items.every(x=>!x.lines));
 let n=0,missed=false;
 while(!state.ended&&n++<100){
  const privateSt=Cases.replay(a,store.tables.demo_runs.find(x=>x.assignment_id===id)?.state.run||{config,events:[]}),it=S.open(privateSt)[0];let event;
  if(!it)event={kind:S.nextDay(privateSt)==null?'complete':'advance'};
  else if(it.kind==='decision')event={kind:'handle',id:it.id,action:{choice:Object.fromEntries(S.V(it.q,privateSt).map(q=>[q.id,q.opts[0].v]))}};
  else {const w=S.want(privateSt,it);event={kind:'handle',id:it.id,action:w?{rows:w.map(([a,s,v])=>({a,d:s==='dr'?v:0,c:s==='cr'?v:0}))}:{noEntry:true}};
   if(w&&!missed){event.action.rows=[];missed=true;}}
  const r=await call(student,'case-act',{assignmentId:id,revision,event});state=r.state;revision=r.revision;
 }
 assert.equal(state.ended,true);const boot=await call(student,'bootstrap');
 assert.equal(boot.caseScores[0].completed,true);assert.ok(boot.caseScores[0].score<100);
 assert.equal(boot.cases[0].assignment,undefined);assert.equal(boot.assignments.some(x=>x.id===id),false);
 assert.ok(boot.lessons.some(x=>x.id===lib.id));
 const book=await call(prof,'gradebook',{classId:c.id});assert.equal(book.cases[0].id,id);assert.equal(book.students[0].caseScores[0].score,boot.caseScores[0].score);
 const work=await call(prof,'case-work',{assignmentId:id,email:student.email});assert.equal(work.state.ended,true);assert.ok(work.attempts.length);assert.ok(work.attempts.some(a=>a.submitted.event.action?.rows?.length===0));
 assert.equal(JSON.stringify(store.tables.demo_profiles.find(x=>x.id===student.id).office),standard);
 await assert.rejects(()=>call(student,'case-act',{assignmentId:id,revision:0,event:{kind:'complete'}}),e=>e.status===409);
 await call(prof,'delete-assignment',{assignmentId:id});await assert.rejects(()=>call(student,'case-load',{assignmentId:id}),e=>e.status===403);
 await call(prof,'restore-assignment',{assignmentId:id});assert.equal((await call(student,'case-load',{assignmentId:id})).state.ended,true);
});
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
class Store{
 constructor(){this.tables={demo_access:[{email:'owner@example.edu',role:'owner',active:true},{email:'prof@example.edu',role:'professor',active:true},{email:'other@example.edu',role:'professor',active:true}],demo_profiles:[],demo_classes:[],demo_invitations:[],demo_assignments:[],demo_runs:[],demo_attempts:[]};}
 async list(t,f){return structuredClone(this.tables[t].filter(x=>Object.entries(f).every(([k,v])=>x[k]===v)));}
 async listIn(t,column,values){return structuredClone(this.tables[t].filter(x=>values.includes(x[column])));}
 async one(t,f){return (await this.list(t,f))[0]||null;}
 async insert(t,x){this.tables[t].push(structuredClone(x));return structuredClone(x);}
 async upsert(t,x){const keys=t==='demo_access'?['email']:t==='demo_runs'?['student_id','assignment_id']:['class_id','email'];const old=this.tables[t].find(r=>keys.every(k=>r[k]===x[k]));old?Object.assign(old,structuredClone(x)):this.tables[t].push(structuredClone(x));return x;}
 async update(t,f,x){for(const r of this.tables[t])if(Object.entries(f).every(([k,v])=>r[k]===v))Object.assign(r,structuredClone(x));}
 async remove(t,f){this.tables[t]=this.tables[t].filter(r=>!Object.entries(f).every(([k,v])=>r[k]===v));}
 async classAccounts(classId){return this.tables.demo_invitations.filter(i=>i.class_id===classId).map(i=>{const u=this.authUsers?.find(u=>u.email.trim().toLowerCase()===i.email),p=this.tables.demo_profiles.find(p=>p.id===u?.id);return structuredClone({email:i.email,account_id:u?.id||null,registered_at:u?.created_at||null,confirmed_at:u?.email_confirmed_at||null,last_sign_in_at:u?.last_sign_in_at||null,profile_id:p?.id,business:p?.business,office_revision:p?.office?.revision||0,office_summary:p?.office_summary});});}
 async cacheOfficeSummaries(summaries){for(const {studentId,revision,summary} of summaries){const row=this.tables.demo_profiles.find(p=>p.id===studentId);if(row?.office?.revision===revision)row.office_summary=structuredClone(summary);}}
 async saveOffice(id,revision,run,summary){const row=this.tables.demo_profiles.find(r=>r.id===id);if((row.office?.revision||0)!==revision)throw Error('CONFLICT: Office changed in another tab.');row.office={revision:revision+1,run:structuredClone(run),savedAt:new Date().toISOString()};row.office_summary={...structuredClone(summary),revision:row.office.revision,savedAt:row.office.savedAt};return row.office;}
 async commit(student,assignment,revision,state,action,p){const row=this.tables.demo_runs.find(r=>r.student_id===student&&r.assignment_id===assignment);if((row?.revision||0)!==revision)throw Error('CONFLICT');const v={student_id:student,assignment_id:assignment,revision:revision+1,state:structuredClone(state)};row?Object.assign(row,v):this.tables.demo_runs.push(v);this.tables.demo_attempts.push({student_id:student,assignment_id:assignment,revision:v.revision,action,created_at:new Date().toISOString(),submitted:structuredClone(p)});return {state:structuredClone(state),revision:v.revision};}
}
const owner={id:uid(1),email:'owner@example.edu'},prof={id:uid(2),email:'prof@example.edu'},other={id:uid(3),email:'other@example.edu'},student={id:uid(4),email:'student@example.edu'},outsider={id:uid(5),email:'outsider@example.edu'};
test('office work review is class authorized, server assessed and exposes submissions, not replay records or answer keys',async()=>{
 const {call,c,store}=await fixture(),S=global.SIM,config={type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23};
 assert.equal((await call(prof,'office-work',{classId:c.id,email:student.email})).office,null);
 await assert.rejects(()=>call(student,'office-work',{classId:c.id,email:student.email}),e=>e.status===403);
 await assert.rejects(()=>call(other,'office-work',{classId:c.id,email:student.email}),e=>e.status===403);
 await assert.rejects(()=>call(prof,'office-work',{classId:c.id,email:outsider.email}),e=>e.status===403);
 const state=S.newGame(config),events=[];
 while(events.length<5){const it=S.open(state)[0];if(!it){S.advance(state);events.push({kind:'advance'});continue;}
  const action=it.kind==='decision'?{choice:Object.fromEntries(S.V(it.q,state).map(q=>[q.id,q.opts[0].v]))}:{rows:[]};
  S.handle(state,it.id,action);events.push({kind:'handle',id:it.id,action});
 }
 await call(student,'office-save',{revision:0,run:{config,events}});
 const before=JSON.stringify(store.tables.demo_profiles),review=await call(prof,'office-work',{classId:c.id,email:student.email});
 assert.equal(review.business.name,'River Cycle');assert.ok(review.submissions.some(s=>s.graded&&!s.correct));assert.ok(review.submissions.some(s=>!s.graded));
 assert.equal(review.run,undefined);assert.equal(review.office.run,undefined);assert.equal(review.submissions[0].lines,undefined);
 assert.equal(JSON.stringify(store.tables.demo_profiles),before,'review does not change saved work');
 await call(prof,'remove-student',{classId:c.id,email:student.email});
 await assert.rejects(()=>call(prof,'office-work',{classId:c.id,email:student.email}),e=>e.status===403);
});
async function fixture(topic='prepaid'){
 const {handleAction}=await import('./supabase/functions/classroom/service.mjs'),store=new Store();store.authUsers=[{...student,created_at:'2026-10-01T12:00:00Z',email_confirmed_at:'2026-10-01T12:01:00Z',last_sign_in_at:'2026-10-29T12:00:00Z'}];const call=(u,a,p)=>handleAction(store,L,u,a,p);
 const c=await call(prof,'create-class',{name:'Intro Financial'});await call(prof,'invite',{classId:c.id,email:student.email});
 await call(student,'business',{business:{name:'Tommy’s Coffee',type:'Coffee shop',color:'sage'}});
 const a=await call(prof,'publish',{classId:c.id,assignment:{version:1,id:'draft',title:'Lesson',topic,course:'Intro',instructions:'Practice',year:2026,month:9,support:'guided',notes:''}});
 return {store,call,c,a};
}
test('unapproved accounts and user-supplied role claims cannot get access',async()=>{const {call}=await fixture();await assert.rejects(()=>call({...outsider,user_metadata:{role:'owner'}},'bootstrap'),e=>e.status===403);await assert.rejects(()=>call(student,'authorize',{email:outsider.email,role:'professor',active:true}),e=>e.status===403);});
test('professors cannot inspect or publish in other professors’ classes',async()=>{const {call,c,a}=await fixture();await assert.rejects(()=>call(other,'gradebook',{classId:c.id}),e=>e.status===403);await assert.rejects(()=>call(other,'publish',{classId:c.id,assignment:a.definition}),e=>e.status===403);await assert.rejects(()=>call(other,'attempts',{studentId:student.id,assignmentId:a.id}),e=>e.status===403);});
test('owner approvals and revocations apply on the next request',async()=>{const {call}=await fixture();await call(owner,'authorize',{email:outsider.email,role:'professor',active:true});assert.equal((await call(outsider,'bootstrap')).user.role,'professor');await call(owner,'authorize',{email:outsider.email,role:'professor',active:false});await assert.rejects(()=>call(outsider,'bootstrap'),e=>e.status===403);await assert.rejects(()=>call(owner,'authorize',{email:owner.email,role:'student',active:false}));});
test('class invitations scope student assignments and removing access prevents submissions',async()=>{const {call,c,a}=await fixture();const boot=await call(student,'bootstrap');assert.equal(boot.assignments.length,1);await call(prof,'remove-student',{classId:c.id,email:student.email});assert.equal((await call(student,'bootstrap')).assignments.length,0);await assert.rejects(()=>call(student,'start',{assignmentId:a.id,revision:0,choice:{location:0,months:3}}),e=>e.status===403);});
test('server computes immutable first grades, ignores forged scores, and rejects stale tabs',async()=>{const {call,a,store}=await fixture();const submit=(action,p)=>call(student,action,{assignmentId:a.id,...p});let v=await submit('start',{revision:0,choice:{location:0,months:3},first:{},serverGrade:{journal:80}});assert.equal(v.state.serverGrade.journal,0);const e=v.state.scenario.events[0];const wrong=[{account:'Rent Expense',debit:450},{account:'Cash',credit:450}];v=await submit('entry',{revision:1,record:e.id,date:'2026-09-02',rows:wrong,first:{correct:true}});assert.equal(v.state.first.payment.correct,false);const correct=[{account:e.debit,debit:e.amount},{account:e.credit,credit:e.amount}];await assert.rejects(()=>submit('entry',{revision:1,record:e.id,date:e.date,rows:correct}),e=>e.status===409);v=await submit('entry',{revision:2,record:e.id,date:e.date,rows:correct});assert.equal(v.state.first.payment.correct,false);assert.equal(L.assess(v.state.entries.payment.rows,e.date,e).correct,true);assert.equal(store.tables.demo_attempts.length,3);assert.equal(store.tables.demo_attempts[1].submitted.rows[0].account,'Rent Expense');});
test('completion requires correct entries and preserves original prediction and financial attempts',async()=>{const {call,a}=await fixture('equipment');let rev=0;const submit=async(action,p)=>{const v=await call(student,action,{assignmentId:a.id,revision:rev,...p});rev=v.revision;return v.state;};let r=await submit('start',{choice:{level:2,life:1}});await assert.rejects(()=>submit('effects',{values:{expense:30,remaining:1770,cash:6200}}));r=await submit('advance',{});for(const e of r.scenario.events)r=await submit('entry',{record:e.id,date:e.date,rows:[{account:e.debit,debit:e.amount},{account:e.credit,credit:e.amount}]});r=await submit('prediction',{answer:0});await assert.rejects(()=>submit('prediction',{answer:2}));r=await submit('effects',{values:{expense:0,remaining:1800,cash:6200}});assert.equal(r.completed,false);r=await submit('effects',{values:{expense:30,remaining:1770,cash:6200}});assert.equal(r.completed,true);assert.deepEqual(r.serverGrade,{journal:80,effects:5,prediction:0});});
test('malformed journal rows and invalid business choices cannot be recorded',async()=>{const {call,a}=await fixture();await assert.rejects(()=>call(student,'start',{assignmentId:a.id,revision:0,choice:{location:5,months:0}}));await call(student,'start',{assignmentId:a.id,revision:0,choice:{location:0,months:3}});await assert.rejects(()=>call(student,'entry',{assignmentId:a.id,revision:1,record:'payment',date:'2026-09-01',rows:[{account:'Cash',debit:100},{account:'Rent Expense',credit:90}]}));});
test('professor cannot restore a student disabled by the owner',async()=>{const {call,c}=await fixture();await call(owner,'authorize',{email:student.email,role:'student',active:false});await assert.rejects(()=>call(prof,'invite',{classId:c.id,email:student.email}),/disabled/);});
test('generated cloud episodes preserve design, enforce stages, and grade the complete journal on the server',async()=>{const {call,c}=await fixture();const business={name:'Tommy’s Bakery',type:'Bakery',color:'plum',style:'Garden storefront',district:'Campus village',logo:'◇',specialty:'Custom cakes',tagline:'Baked for you'};assert.equal((await call(student,'business',{business})).business.specialty,'Custom cakes');const definition=L.generateAssignment('Supplies physical counts, accrued wages and customer deposits are unearned revenue.',{id:'generated'}),a=await call(prof,'publish',{classId:c.id,assignment:definition});let revision=0;const submit=async(action,p={})=>{const v=await call(student,action,{assignmentId:a.id,revision,...p});revision=v.revision;return v.state;};let r=await submit('start',{choice:L.defaultEpisodeChoice(definition)});assert.equal(r.business.style,'Garden storefront');const locked=r.scenario.events.find(e=>e.stage===2);await assert.rejects(()=>submit('entry',{record:locked.id,date:locked.date,rows:[{account:locked.debit,debit:locked.amount},{account:locked.credit,credit:locked.amount}]}),/not available/);r=await submit('advance');assert.equal(r.stage,1);assert.equal(r.advanced,false);r=await submit('advance');assert.equal(r.stage,2);assert.equal(r.advanced,true);for(const e of r.scenario.events)r=await submit('entry',{record:e.id,date:e.date,rows:[{account:e.debit,debit:e.amount},{account:e.credit,credit:e.amount}]});r=await submit('prediction',{answer:r.scenario.prediction.correct});r=await submit('effects',{values:Object.fromEntries(r.scenario.effects.map(e=>[e.key,e.value]))});assert.equal(r.completed,true);assert.deepEqual(r.serverGrade,{journal:80,prediction:5,effects:15});await assert.rejects(()=>call(student,'business',{business:{...business,type:'Coffee shop',specialty:'Coffee & pastries'}}),/cannot change/);});
test('original generated assignments are authorized and graded with their own chart of accounts',async()=>{const {call,c,store}=await fixture(),{draft}=require('./test-fixtures/generated-assignment.cjs');store.generate=async input=>{assert.equal(input.actor,prof.id);return draft();};await assert.rejects(()=>call(student,'generate',{notes:draft().notes}),e=>e.status===403);const definition=await call(prof,'generate',{notes:draft().notes});const a=await call(prof,'publish',{classId:c.id,assignment:definition});let revision=0;const submit=async(action,p={})=>{const v=await call(student,action,{assignmentId:a.id,revision,...p});revision=v.revision;return v.state;};let r=await submit('start',{choice:{plan:2}});await submit('advance');r=await submit('advance');for(const e of a.definition.blueprint.paths[2].events)r=await submit('entry',{record:e.id,date:e.date,rows:e.lines});await submit('prediction',{answer:a.definition.conceptCheck.correct});const expected=L.expected(a.definition,{plan:2});r=await submit('effects',{values:Object.fromEntries(expected.effects.map(e=>[e.key,e.value]))});assert.equal(r.completed,true);assert.equal(r.serverGrade.journal,100);assert.ok(r.scenario.events.every(e=>!e.lines));assert.ok(r.scenario.effects.every(e=>!Object.hasOwn(e,'value')));const boot=await call(student,'bootstrap');assert.ok(boot.assignments.find(x=>x.id===a.id).definition.blueprint.paths.every(p=>p.events.every(e=>!e.lines)));});
test('server uses the student business and quantities to build private answers, rejects tampered orders, and grades the resulting entry',async()=>{const {call,c,store}=await fixture(),{topicDraft,scenarioDraft}=require('./test-fixtures/interactive-assignment.cjs'),{generateCourseAssignment}=await import('./supabase/functions/classroom/generator.mjs');let requests=0;const definition=await generateCourseAssignment(L,{notes:'Supplies bought on account, supplier payments, and month-end counts of supplies on hand.',year:2026,month:9,depth:'focused'},{key:'test-only',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++requests===1?topicDraft():scenarioDraft())}}]})})});const a=await call(prof,'publish',{classId:c.id,assignment:definition}),b=(await call(student,'bootstrap')).business,choice=L.decisions.defaultChoice(definition,b);const basket=L.decisions.catalog(definition.interactive.controls[0],b);choice.decision1[basket[0].id]=7;choice.decision2=25;await assert.rejects(()=>call(student,'start',{assignmentId:a.id,revision:0,choice:{...choice,decision1:{...choice.decision1,price:1}}}),/valid business options/);const started=await call(student,'start',{assignmentId:a.id,revision:0,choice}),saved=store.tables.demo_runs.find(x=>x.assignment_id===a.id),e=saved.state.scenario.events[0];assert.equal(started.state.assignment.interactive.events,undefined);assert.ok(started.state.scenario.events.every(x=>!x.lines));assert.equal(e.lines[0].debit,L.decisions.choiceValues(definition,choice,b).decision1);const result=await call(student,'entry',{assignmentId:a.id,revision:1,record:e.id,date:e.date,rows:e.lines});assert.equal(result.state.assessments[e.id].correct,true);});
test('professor deletion hides assignments and stale submissions, preserves work, and restores the same run',async()=>{const {call,a,c,store}=await fixture();await call(student,'start',{assignmentId:a.id,revision:0,choice:{location:0,months:3}});const before=structuredClone(store.tables.demo_runs);for(const user of [student,other])for(const action of ['delete-assignment','restore-assignment'])await assert.rejects(()=>call(user,action,{assignmentId:a.id}),e=>e.status===403);await call(prof,'delete-assignment',{assignmentId:a.id});const hidden=await call(student,'bootstrap');assert.equal(hidden.assignments.some(x=>x.id===a.id),false);assert.equal(hidden.runs.length,0);await assert.rejects(()=>call(student,'advance',{assignmentId:a.id,revision:1}),e=>e.status===403);assert.deepEqual(store.tables.demo_runs,before);assert.equal(store.tables.demo_attempts.length,1);assert.ok((await call(prof,'bootstrap')).assignments.find(x=>x.id===a.id).definition.deleted);await call(prof,'gradebook',{classId:c.id});await call(prof,'restore-assignment',{assignmentId:a.id});const restored=await call(student,'bootstrap');assert.ok(restored.assignments.some(x=>x.id===a.id));assert.equal(restored.runs[0].revision,1);assert.deepEqual(store.tables.demo_runs,before);});
test('monthly business choices unlock later records without changing earlier entries; completion needs journals, not quizzes or balance copying',async()=>{const {call,c,store}=await fixture(),{multimonthDraft,multimonthTopics}=require('./test-fixtures/multimonth-assignment.cjs'),{generateCourseAssignment}=await import('./supabase/functions/classroom/generator.mjs');const made=multimonthDraft();made.controls[0].monthOffset=0;made.controls[1].monthOffset=1;let requests=0;const definition=await generateCourseAssignment(L,{notes:'Supplies purchases and monthly usage with later supplier payments.',year:2026,timelineMode:'auto',depth:'focused'},{key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++requests===1?multimonthTopics():made)}}]})})});const a=await call(prof,'publish',{classId:c.id,assignment:definition});let revision=0;const submit=async(action,p={})=>{const v=await call(student,action,{assignmentId:a.id,revision,...p});revision=v.revision;return v.state;};let r=await submit('start',{choice:L.decisions.defaultChoice(definition,{type:'Coffee shop'})});let saved=()=>store.tables.demo_runs.find(x=>x.assignment_id===a.id).state;const invoice=saved().scenario.events.find(e=>e.id==='supplies-invoice');await submit('entry',{record:invoice.id,date:invoice.date,rows:[{account:'Supplies',debit:1},{account:'Accounts Payable',credit:1}]});const firstScore=r.serverGrade.journal;r=await submit('entry',{record:invoice.id,date:invoice.date,rows:invoice.lines});assert.ok(r.serverGrade.journal>firstScore);assert.equal(saved().first[invoice.id].correct,false);await submit('advance');r=await submit('advance');assert.equal(L.pendingMonth(r),1);await assert.rejects(()=>submit('advance'),/business decision/);await assert.rejects(()=>submit('decide',{choice:{decision1:{beans:1,cups:1,filters:1}}}),/current month/);const previous=structuredClone(saved().entries);r=await submit('decide',{choice:{decision2:25}});assert.deepEqual(saved().entries,previous);assert.equal(saved().scenario.events.find(e=>e.id==='supplier-payment').lines[0].debit,L.decisions.choiceValues(definition,saved().choice,saved().business).decision1*.25);r=await submit('advance');await assert.rejects(()=>submit('complete'),/another look/);assert.equal(L.pendingDecision(r),3);r=await submit('decide',{choice:{decision3:8}});for(const e of saved().scenario.events.filter(e=>!e.autoPosted))r=await submit('entry',{record:e.id,date:e.date,rows:e.lines});r=await submit('complete');assert.equal(r.completed,true);assert.equal(r.prediction,undefined);assert.equal(r.effectsFirst,undefined);assert.deepEqual(r.serverGrade,{journal:100,effects:0,prediction:0});assert.deepEqual(L.grade(r),r.serverGrade);assert.ok(r.scenario.events.every(e=>!e.lines));});
test('optional business board shows only completed participants in the same assignment and never grades or emails',async()=>{const {store,call,a,c}=await fixture();await call(student,'start',{assignmentId:a.id,revision:0,choice:{location:0,months:3}});assert.deepEqual(await call(student,'leaderboard',{assignmentId:a.id}),[]);const state=store.tables.demo_runs[0].state;state.challenge=true;state.completed=true;const rows=await call(student,'leaderboard',{assignmentId:a.id});assert.equal(rows.length,1);assert.equal(rows[0].business,'Tommy’s Coffee');assert.equal(rows[0].mine,true);assert.ok(!JSON.stringify(rows).includes(student.email));assert.equal(rows[0].grade,undefined);assert.equal(rows[0].cash,state.scenario.opening-state.scenario.events[0].amount);store.tables.demo_runs.push({student_id:uid(99),assignment_id:uid(99),state:structuredClone(state)});assert.equal((await call(student,'leaderboard',{assignmentId:a.id})).length,1);state.challenge=false;assert.deepEqual(await call(student,'leaderboard',{assignmentId:a.id}),[]);await call(prof,'remove-student',{classId:c.id,email:student.email});await assert.rejects(()=>call(student,'leaderboard',{assignmentId:a.id}),e=>e.status===403);});
test('draft revision is professor-only and checks published-assignment ownership before calling AI',async()=>{const {store,call,c}=await fixture(),{generateCourseAssignment}=await import('./supabase/functions/classroom/generator.mjs'),{topicDraft,scenarioDraft}=require('./test-fixtures/interactive-assignment.cjs');let n=0;const draft=await generateCourseAssignment(L,{notes:'Supplies purchases on account and supplier payments, plus supplies used.',year:2026,month:9,depth:'focused'},{key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++n===1?topicDraft():scenarioDraft())}}]})})});let invoked=0;store.generate=async input=>{invoked++;assert.equal(input.phase,'revise');assert.equal(input.actor,prof.id);return {...input.currentDraft,published:false,id:'new-draft'};};const p={phase:'revise',notes:draft.notes,currentDraft:draft,request:'Make the payment instructions clearer.'};await assert.rejects(()=>call(student,'generate',p),e=>e.status===403);assert.equal(invoked,0);await assert.rejects(()=>call(prof,'generate',{...p,request:''}));assert.equal(invoked,0);const revised=await call(prof,'generate',p);assert.equal(revised.published,false);assert.equal(invoked,1);const a=await call(prof,'publish',{classId:c.id,assignment:draft});await assert.rejects(()=>call(other,'generate',{...p,currentDraft:a.definition}),e=>e.status===403);assert.equal(invoked,1);await call(prof,'generate',{...p,currentDraft:a.definition});assert.equal(invoked,2);assert.equal(store.tables.demo_assignments.find(x=>x.id===a.id).definition.title,draft.title);});

test('library assignment permissions and historical grades survive the simulation migration',async()=>{const {call,c,store}=await fixture();
 await assert.rejects(()=>call(student,'lesson-assign',{classId:c.id,lessonId:'ch1'}),e=>e.status===403);
 await assert.rejects(()=>call(other,'lesson-assign',{classId:c.id,lessonId:'ch1'}),e=>e.status===403);
 const a=await call(prof,'lesson-assign',{classId:c.id,lessonId:'ch1',title:'Ch 1',dueDate:'2026-11-06'});
 assert.equal((await call(prof,'lesson-assign',{classId:c.id,lessonId:'ch1',title:'Ch 1',dueDate:'2026-11-07'})).id,a.id);
 await assert.rejects(()=>call(student,'lesson-score',{lessonId:'ch2',first:5,graded:10,stars:2}),e=>e.status===409);
 await assert.rejects(()=>call(student,'lesson-score',{lessonId:'ch1',first:11,graded:10,stars:2}));
 await assert.rejects(()=>call(prof,'lesson-score',{lessonId:'ch1',first:1,graded:1,stars:3}),e=>e.status===403);
 // Existing first completions are retained, not rewritten by the new office.
 await store.upsert('demo_runs',{student_id:student.id,assignment_id:a.id,state:{kind:'library',lessonId:'ch1',completed:true,first:8,graded:10,stars:2,score:80}});
 await assert.rejects(()=>call(student,'lesson-score',{lessonId:'ch1',first:10,graded:10,stars:3}),e=>e.status===409);
 const g=await call(prof,'gradebook',{classId:c.id});assert.equal(g.lessons.length,1);assert.equal(g.lessons[0].dueDate,'2026-11-07');assert.equal(g.students[0].lessonScores[0].score,80);
 assert.ok(g.assignments.every(x=>x.definition.kind!=='library'));
 const boot=await call(student,'bootstrap');assert.equal(boot.lessons[0].lessonId,'ch1');assert.equal(boot.lessonScores[0].score,80);assert.ok(boot.assignments.every(x=>x.definition.kind!=='library'));
});

function officeRun() {
 const run={config:{type:'bike',name:'River Cycle',founder:'Alex Rivera',city:'columbus',seed:37},events:[]},S=global.SIM,st=S.newGame(run.config);
 let missed=false;
 for(let n=0;n<200;n++){
  const it=S.open(st)[0];
  if(!it){const r=S.advance(st);if(r.monthEnd){S.complete(st);run.events.push({kind:'complete'});return {run,st};}run.events.push({kind:'advance'});continue;}
  const want=S.want(st,it);
  if(want&&!missed){const action={rows:[{a:'cash',d:'1',c:''}]};S.handle(st,it.id,action);run.events.push({kind:'handle',id:it.id,action});missed=true;}
  const action=it.kind==='decision'?{choice:Object.fromEntries(S.V(it.q,st).map(q=>[q.id,q.opts[0].v]))}:want?{rows:want.map(([a,side,x])=>({a,d:side==='dr'?String(x):'',c:side==='cr'?String(x):''}))}:{noEntry:true};
  assert.ok(S.handle(st,it.id,action).ok);run.events.push({kind:'handle',id:it.id,action});
 }
 throw Error('Office did not finish');
}

test('office restores business and mistakes, computes grades on server, and rejects stale or rewritten work',async()=>{
 const {store,call,c}=await fixture(),S=global.SIM,{run,st}=officeRun();
 const assignment=await call(prof,'lesson-assign',{classId:c.id,lessonId:'ch2',title:'Opening month'});
 await assert.rejects(()=>call(prof,'office-load'),e=>e.status===403);
 assert.deepEqual(await call(student,'office-load'),{revision:0,run:null});
 const r=await call(student,'office-save',{revision:0,run});assert.equal(r.revision,1);
 const restored=S.replay((await call(student,'office-load')).run);
 assert.deepEqual(restored,st);
 const grade=(await call(prof,'gradebook',{classId:c.id})).students[0].lessonScores.find(x=>x.assignment_id===assignment.id);
 assert.equal(grade.score,st.results.ch2.score);assert.ok(grade.score<100);
 await assert.rejects(()=>call(student,'office-save',{revision:0,run}),/CONFLICT/);
 const changed=structuredClone(run);changed.events=changed.events.filter(e=>!e.action?.rows||e.action.rows[0].d!=='1');
 await assert.rejects(()=>call(student,'office-save',{revision:1,run:changed}),/Earlier office/);
 const identity=structuredClone(run);identity.config.name='Different company';
 await assert.rejects(()=>call(student,'office-save',{revision:1,run:identity}),/identity/);
 const future=structuredClone(run);future.events.push({kind:'next'});
 await assert.rejects(()=>call(student,'office-save',{revision:1,run:future}),e=>e.status===403);
 await assert.rejects(()=>call(outsider,'office-load'),e=>e.status===403);
 await call(owner,'authorize',{email:outsider.email,role:'student',active:true});
 const stranger=(await call(outsider,'office-load'));assert.equal(stranger.run,null);
 assert.ok(store.tables.demo_profiles.find(x=>x.id===student.id).office.run.events.length);
});
test('roster uses the saved office company, current progress and last save without returning the replay or accounting key',async()=>{
 const {store,call,c}=await fixture();await call(prof,'invite',{classId:c.id,email:'invited@example.edu'});
 const run={config:{type:'bike',name:'River Cycle',founder:'Alex Rivera',city:'columbus',seed:37},events:[]};
 await call(student,'office-save',{revision:0,run});const profile=store.tables.demo_profiles.find(x=>x.id===student.id);profile.office.savedAt=profile.office_summary.savedAt='2026-10-27T15:00:00Z';
 let roster=(await call(prof,'gradebook',{classId:c.id})).students,s=roster.find(x=>x.email===student.email);
 assert.equal(s.business.name,'River Cycle');assert.equal(s.business.type,'Bike repair shop');assert.equal(s.accountCreated,true);assert.equal(s.office.lessonId,'ch2');assert.equal(s.office.day,1);assert.equal(s.office.updatedAt,profile.office.savedAt);
 assert.deepEqual(Object.keys(s.office).sort(),['completed','day','first','graded','lessonId','period','updatedAt'].sort());assert.equal(s.office.run,undefined);
 assert.equal(roster.find(x=>x.email==='invited@example.edu').accountCreated,false);
 const {run:finished}=officeRun();await call(student,'office-save',{revision:1,run:finished});s=(await call(prof,'gradebook',{classId:c.id})).students.find(x=>x.email===student.email);assert.equal(s.office.completed,true);assert.ok(s.office.graded>0);
});
test('gradebook batches roster reads, excludes other classes and still rejects unauthorized callers',async()=>{
 const {store,call,c}=await fixture();for(let n=10;n<40;n++){await call(prof,'invite',{classId:c.id,email:`student${n}@example.edu`});store.tables.demo_profiles.push({id:uid(n),email:`student${n}@example.edu`,business:null});}
 const otherClass=await call(other,'create-class',{name:'Private class'}),otherLesson=await call(other,'lesson-assign',{classId:otherClass.id,lessonId:'ch2',title:'Private period'});
 store.tables.demo_runs.push({student_id:student.id,assignment_id:otherLesson.id,state:{kind:'library',score:99,completed:true}});
 let reads=0,batches=[];const list=store.list.bind(store),listIn=store.listIn.bind(store);store.list=async(...args)=>{reads++;return list(...args);};store.listIn=async(...args)=>{batches.push(args);return listIn(...args);};
 const result=await call(prof,'gradebook',{classId:c.id});assert.equal(result.students.length,31);assert.ok(reads<10,`Expected bounded reads, saw ${reads}`);assert.equal(batches.length,2);
 assert.ok(!batches.find(b=>b[0]==='demo_runs')[2].includes(otherLesson.id));assert.equal(result.students[0].lessonScores.length,0);
 await assert.rejects(()=>call(other,'gradebook',{classId:c.id}),e=>e.status===403);await assert.rejects(()=>call(student,'gradebook',{classId:c.id}),e=>e.status===403);
});
test('registration comes from Auth even before an app profile exists, with distinct confirmation and sign-in state',async()=>{
 const {store,call,c}=await fixture();
 for(const address of ['registered@example.edu','pending@example.edu','invited@example.edu'])await call(prof,'invite',{classId:c.id,email:address});
 store.authUsers.push({id:uid(41),email:'Registered@Example.EDU',created_at:'2026-10-20T12:00:00Z',email_confirmed_at:'2026-10-20T12:01:00Z',last_sign_in_at:'2026-10-29T13:00:00Z'},{id:uid(42),email:'pending@example.edu',created_at:'2026-10-20T12:00:00Z'});
 const students=(await call(prof,'gradebook',{classId:c.id})).students,registered=students.find(s=>s.email==='registered@example.edu'),pending=students.find(s=>s.email==='pending@example.edu'),invited=students.find(s=>s.email==='invited@example.edu');
 assert.equal(registered.accountCreated,true);assert.equal(registered.registration.lastSignInAt,'2026-10-29T13:00:00Z');assert.equal(registered.office,null);assert.equal(registered.business,null);
 assert.equal(pending.accountCreated,true);assert.equal(pending.registration.confirmedAt,null);assert.equal(invited.accountCreated,false);assert.equal(invited.registration,null);
 assert.equal(store.tables.demo_profiles.some(p=>[uid(41),uid(42)].includes(p.id)),false,'roster must not manufacture app profiles or student work');
});
test('roster and reviews bind to Auth ID rather than a stale profile email',async()=>{
 const {store,call,c}=await fixture(),run={config:{type:'bike',name:'Current Company',founder:'Alex',city:'columbus',seed:23},events:[]};
 await call(student,'office-save',{revision:0,run});store.tables.demo_profiles.find(p=>p.id===student.id).email='old@example.edu';
 const s=(await call(prof,'gradebook',{classId:c.id})).students[0];assert.equal(s.business.name,'Current Company');assert.equal(s.accountCreated,true);
 assert.equal((await call(prof,'office-work',{classId:c.id,email:student.email})).business.name,'Current Company');
 assert.ok(!JSON.stringify(s).includes('old@example.edu'));assert.equal(s.account_id,undefined);
});
test('roster backfills old office summaries once, warm refreshes neither read nor replay history',async()=>{
 const {store,call,c}=await fixture(),run={config:{type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23},events:[]};
 await call(student,'office-save',{revision:0,run});const profile=store.tables.demo_profiles.find(p=>p.id===student.id),before=JSON.stringify(profile.office);delete profile.office_summary;
 const cold=await call(prof,'gradebook',{classId:c.id});assert.equal(JSON.stringify(profile.office),before);assert.equal(profile.office_summary.revision,1);
 const replay=global.SIM.replay,listIn=store.listIn.bind(store);global.SIM.replay=()=>{throw Error('Roster must not replay a current summary');};store.listIn=async(t,c,v)=>{if(t==='demo_profiles')assert.deepEqual(v,[]);return listIn(t,c,v);};
 try{assert.deepEqual(await call(prof,'gradebook',{classId:c.id}),cold);}finally{global.SIM.replay=replay;}
 const summary=structuredClone(profile.office_summary);await assert.rejects(()=>call(student,'office-save',{revision:0,run}),/CONFLICT/);assert.deepEqual(profile.office_summary,summary);
});
test('a late summary backfill cannot overwrite a newer office save',async()=>{
 const {store,call,c}=await fixture(),run={config:{type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23},events:[]};await call(student,'office-save',{revision:0,run});
 const profile=store.tables.demo_profiles.find(p=>p.id===student.id);delete profile.office_summary;const cache=store.cacheOfficeSummaries.bind(store);
 store.cacheOfficeSummaries=async(summaries)=>{await call(student,'office-save',{revision:1,run});await cache(summaries);};
 await call(prof,'gradebook',{classId:c.id});assert.equal(profile.office.revision,2);assert.equal(profile.office_summary.revision,2);
});
