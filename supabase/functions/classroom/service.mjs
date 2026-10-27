// Shared server logic. No role, score, expected answer, or first attempt is
// accepted from the browser. Store operations run with server credentials.
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fail=(message,status=400)=>{throw new AppError(message,status);};
const email=x=>{const s=String(x||'').trim().toLowerCase();if(s.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail('Enter a valid email address.');return s;};
const uuid=x=>{if(typeof x!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x))fail('Invalid record ID.');return x;};
export function changeRun(L,old,action,p){
 const r=structuredClone(L.withBusinessActivity(old));L.syncBusinessEntries(r);const s=L.expandAccountChoices(r.scenario);
 if(action==='decide'){const m=L.pendingDecision(r);if(m===null)fail('There is no new monthly decision to make.');const controls=L.decisionControls(r),ids=controls.map(c=>c.id);if(!p.choice||Object.keys(p.choice).length!==ids.length||Object.keys(p.choice).some(id=>!ids.includes(id)))fail('Change only the current month’s business choices.');const choice={...r.choice,...p.choice};if(!L.decisions.validChoice(r.assignment,choice,r.business))fail('Check your quantities and amounts.');const next=L.expected(r.assignment,choice,r.business);for(const oldEvent of s.events.filter(e=>e.stage<m)){const nextEvent=next.events.find(e=>e.id===oldEvent.id);if(JSON.stringify(oldEvent)!==JSON.stringify(nextEvent))fail('This choice would change earlier records. Ask your professor to review the draft.');}r.choice=choice;r.scenario=next;r.decidedStages=[...(r.decidedStages||(r.decidedMonths||[0]).map(m=>m*2)),m];r.decidedMonths=[...new Set([...(r.decidedMonths||[0]),Math.floor(m/2)])];}
 else if(action==='advance'){if(L.pendingMonth(r)!==null)fail('Make this month’s business decision before continuing.');if(r.assignment.version>=2){r.stage=Math.min(L.finalStage(r.assignment),(r.stage||0)+1);r.advanced=r.stage===L.finalStage(r.assignment);}else r.advanced=true;}
 else if(action==='challenge'){if(typeof p.join!=='boolean')fail('Choose whether to join.');r.challenge=p.join;}
 else if(action==='entry'){
  const e=s.events.find(e=>e.id===p.record);if(e?.autoPosted)fail('This business activity is already recorded. Work on the lesson records instead.');if(!e||!L.availableEvents(r).some(x=>x.id===e.id))fail('This document is not available yet.');
  if(!Array.isArray(p.rows)||p.rows.some(x=>!x||typeof x!=='object'))fail('Journal lines are required.');const error=r.assignment.version===3&&p.rows.length===0?null:L.validateRows(p.rows,s.accountList||L.accounts);if(error)fail(error);
  if(typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||Number.isNaN(Date.parse(p.date)))fail('Enter a valid journal-entry date.');
  const rows=p.rows.map(x=>({account:x.account,debit:Number(x.debit||0),credit:Number(x.credit||0)}));
  r.first[p.record]??=L.assess(rows,p.date,e);r.entries[p.record]={date:p.date,rows};r.completed=false;
 }
 else if(action==='complete'){if(r.assignment.version!==3)fail('This assignment uses a different finish step.');if(!r.advanced)fail('Continue until all records are available.');if(!L.journalEvents(s).every(e=>r.entries[e.id]&&L.assess(r.entries[e.id].rows,r.entries[e.id].date,e).correct))fail('Check the records marked Needs another look before finishing.');r.completed=true;}
 else if(action==='prediction'){
  if(!r.advanced)fail('Continue the episode first.');if(r.prediction!==undefined)fail('Your prediction was already submitted.');
  if(!Number.isInteger(p.answer)||p.answer<0||p.answer>=s.prediction.options.length)fail('Select a prediction.');
  r.prediction=r.predictionFirst=p.answer;
 }
 else if(action==='effects'){
  if(!r.advanced||r.prediction===undefined||!s.events.every(e=>r.entries[e.id]&&L.assess(r.entries[e.id].rows,r.entries[e.id].date,e).correct))fail('Correct the entries and complete the prediction first.');
  const v={};for(const e of s.effects){if(typeof p.values?.[e.key]!=='number'||!Number.isFinite(p.values[e.key])||Math.abs(p.values[e.key])>1e9)fail('Enter every financial effect.');v[e.key]=p.values[e.key];}
  r.effectsFirst??=v;r.effectsLatest=v;r.effectDraft=v;r.completed=s.effects.every(e=>Math.abs(v[e.key]-e.value)<.005);
 } else fail('Unsupported submission.');
 L.syncBusinessEntries(r);r.serverGrade=L.grade(r);return r;
}
export function businessResult(L,state){state=L.withBusinessActivity(state);const scenario=L.expandAccountChoices(structuredClone(state.scenario)),events=L.availableEvents({...state,scenario}),entries=Object.fromEntries(events.map(e=>[e.id,{rows:e.lines||[{account:e.debit,debit:e.amount,credit:0},{account:e.credit,debit:0,credit:e.amount}]}])),balances=L.balances(scenario,entries),definitions=scenario.accountDefinitions||[];return {owedSuppliers:Math.round(-(balances['Accounts Payable']||0)*100)/100,revenue:Math.round(-definitions.filter(a=>a.type==='revenue').reduce((n,a)=>n+(balances[a.name]||0),0)*100)/100,cash:Math.round((balances.Cash||0)*100)/100,profit:Math.round(-definitions.filter(a=>['revenue','expense'].includes(a.type)).reduce((n,a)=>n+(balances[a.name]||0),0)*100)/100};}
// Add a real follow-up date choice to existing supplier-payment drafts too.
// Started runs keep their original definition and answers.
export function prepareGuidedAssignment(original){const a=structuredClone(original);if(!a?.interactive)return a;for(const payment of a.interactive.events){if(!payment.lines.some(l=>l.account==='Accounts Payable'&&l.side==='debit')||!payment.lines.some(l=>l.account==='Cash'&&l.side==='credit'))continue;if(payment.dateControl&&payment.dateControl!=='none')continue;const purchase=a.interactive.events.find(e=>e.date<=payment.date&&e.lines.some(l=>l.account==='Accounts Payable'&&l.side==='credit'));if(!purchase||a.interactive.controls.length>=6)continue;const offset=Number(payment.date.slice(5,7))-a.month,last=new Date(Date.UTC(a.year,a.month+offset,0)).getUTCDate(),min=payment.date.slice(0,7)===purchase.date.slice(0,7)?Number(purchase.date.slice(8))+1:1;if(min>last)continue;const id=Array.from({length:6},(_,i)=>'decision'+(i+1)).find(id=>!a.interactive.controls.some(c=>c.id===id)),stage=(a.periodMonths||1)>1?offset*2+1:1;a.interactive.controls.push({id,monthOffset:offset,decisionStage:stage,kind:'date',category:'none',label:'When will you pay this supplier?',purpose:'Check the invoice terms, then choose a payment date. The payment confirmation will use this date.',min,max:last,step:1,defaultValue:Math.max(min,Number(payment.date.slice(8)))});payment.dateControl=id;payment.stage=Math.max(payment.stage,stage);payment.document.layout='payment';payment.document.fields=payment.document.fields.filter(f=>!/payment date|transfer date/i.test(f.label));payment.document.fields.push({label:'Payment date',value:'{{date:'+id+'}}'});}return a;}
export function studentDefinition(a,upgrade=true){if(upgrade)a=prepareGuidedAssignment(a);if(a.version!==3)return a;const v=structuredClone(a);v.publicDefinition=true;delete v.revisionChat;if(v.interactive)delete v.interactive.events;delete v.conceptCheck.correct;delete v.conceptCheck.feedback;for(const p of v.blueprint.paths)for(const e of p.events)delete e.lines;return v;}
export function studentRun(L,state){if(state.assignment.version!==3)return state;state=L.withBusinessActivity(state);const s=structuredClone(state);L.expandAccountChoices(s.scenario);L.syncBusinessEntries(s);s.publicRun=true;s.businessResult=businessResult(L,state);s.serverGrade=L.grade(state);s.assessments=Object.fromEntries(s.scenario.events.map(e=>[e.id,s.entries[e.id]?L.assess(s.entries[e.id].rows,s.entries[e.id].date,e):null]));s.assignment=studentDefinition(state.assignment,false);if(state.prediction===undefined){delete s.scenario.prediction.correct;delete s.scenario.prediction.feedback;}for(const e of s.scenario.events){delete e.lines;delete e.amount;}for(const e of s.scenario.effects)delete e.value;return s;}
const isLib=a=>a?.definition?.kind==='library';
const isCase=a=>a?.definition?.kind==='supplement';
const caseMeta=a=>({id:a.id,class_id:a.class_id,title:a.definition.title,dueDate:a.definition.dueDate,deleted:!!a.definition.deleted});
const caseScore=r=>({assignment_id:r.assignment_id,completed:!!r.state.completed,score:r.state.score,first:r.state.first,graded:r.state.graded,revision:r.revision});
function officeBusiness(profile){
 const config=profile?.office?.run?.config;
 return config?{...profile.business,name:config.name,type:globalThis.LL.PROFILES[config.type]?.type||config.type,founder:config.founder,city:config.city}:profile?.business||null;
}
function officeProgress(profile){
 if(!profile?.office?.run)return null;
 try{const state=globalThis.SIM.replay(profile.office.run),period=globalThis.SIM.catalog[state.m];return {lessonId:period.id,period:period.title,day:state.day,first:state.first,graded:state.graded,completed:state.ended,updatedAt:profile.office.savedAt||null};}
 catch{return {unavailable:true,updatedAt:profile.office.savedAt||null};}
}
export async function handleAction(store,L,user,action,p={}){
 if(!user?.id||!user.email)fail('Sign in to continue.',401);
 const address=email(user.email),grant=await store.one('demo_access',{email:address});
 if(!grant?.active)fail('This email has not been approved for the demo. Ask your professor or the demo owner for access.',403);
 let profile=await store.one('demo_profiles',{id:user.id});
 if(!profile){profile={id:user.id,email:address,business:null};await store.insert('demo_profiles',profile);}
 else if(profile.email!==address){await store.update('demo_profiles',{id:user.id},{email:address});profile.email=address;}
 const teacher=['owner','professor'].includes(grant.role);
 const requireTeacher=()=>{if(!teacher)fail('Professor access is required.',403);};
 const classAccess=async id=>{const c=await store.one('demo_classes',{id:uuid(id)});if(!c)fail('Class not found.',404);if(grant.role!=='owner'&&c.professor_id!==user.id)fail('This class belongs to another professor.',403);return c;};
 const studentClasses=async()=>{const inv=await store.list('demo_invitations',{email:address});return (await Promise.all(inv.map(i=>store.one('demo_classes',{id:i.class_id})))).filter(Boolean);};
 const studentAssignment=async id=>{if(grant.role!=='student')fail('Student access is required.',403);const a=await store.one('demo_assignments',{id:uuid(id)});if(!a||a.definition.deleted||!await store.one('demo_invitations',{class_id:a.class_id,email:address}))fail('This assignment is not in your class.',403);return a;};
 if(action==='case-publish'){
  requireTeacher();const c=await classAccess(p.classId);
  if(p.reviewed?.documents!==true||p.reviewed?.accounting!==true)fail('Review the source documents and accounting key before assigning.');
  const title=String(p.title||'').trim(),dueDate=p.dueDate||null;
  if(!title||title.length>120||dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate+'T00:00:00Z'))||new Date(dueDate+'T00:00:00Z').toISOString().slice(0,10)!==dueDate))fail('Enter a title and a valid due date.');
  if(JSON.stringify(p.assignment||{}).length>100000)fail('This draft is too large.');
  try{globalThis.SIMCases.validate(p.assignment);}catch(e){fail(e.message);}
  const existing=(await store.list('demo_assignments',{class_id:c.id})).find(a=>isCase(a)&&a.definition.assignment.id===p.assignment.id);
  if(existing)return existing;
  const id=crypto.randomUUID(),assignment=structuredClone(p.assignment);delete assignment.simulation;
  return await store.insert('demo_assignments',{id,class_id:c.id,definition:{kind:'supplement',title,dueDate,assignment,published:true}});
 }
 if(action==='case-work'){
  requireTeacher();const a=await store.one('demo_assignments',{id:uuid(p.assignmentId)});if(!isCase(a))fail('Choose a supplemental case.');await classAccess(a.class_id);
  const address=email(p.email);if(!await store.one('demo_invitations',{class_id:a.class_id,email:address}))fail('This student is not in the class.',403);
  const sp=await store.one('demo_profiles',{email:address}),r=sp&&await store.one('demo_runs',{student_id:sp.id,assignment_id:a.id});
  return r?{state:globalThis.SIMCases.publicState(globalThis.SIMCases.replay(a.definition.assignment,r.state.run)),attempts:await store.list('demo_attempts',{student_id:sp.id,assignment_id:a.id})}:{state:null,attempts:[]};
 }
 if(action==='case-load'||action==='case-act'){
  const a=await studentAssignment(p.assignmentId);if(!isCase(a))fail('Choose a supplemental simulation case.');
  const C=globalThis.SIMCases,S=globalThis.SIM,saved=await store.one('demo_runs',{student_id:user.id,assignment_id:a.id});
  const run=saved?.state.run||{config:profile.office?.run?.config,events:[]};
  if(!run.config)fail('Create your company in My business before opening a supplemental case.',409);
  let st;try{st=C.replay(a.definition.assignment,run);st.casePeriod.title=a.definition.title;}catch(e){fail(e.message);}
  if(action==='case-load')return {state:C.publicState(st),revision:saved?.revision||0};
  if(!Number.isInteger(p.revision)||p.revision!==(saved?.revision||0))fail('Work changed in another tab. Reload this case before submitting.',409);
  if(JSON.stringify(p.event||{}).length>12000)fail('This entry is too large.');
  if(p.event?.kind==='handle'&&p.event.action?.reveal){return {state:C.publicState(st),revision:p.revision,result:S.handle(st,p.event.id,{reveal:true})};}
  let result;try{result=C.apply(st,p.event);}catch(e){fail(e.message);}
  run.events.push(p.event);const summary=S.summary(st),state={kind:'supplement',run,completed:!!st.ended,first:summary.first,graded:summary.graded,score:summary.score};
  const committed=await store.commit(user.id,a.id,p.revision,state,'case-act',{event:p.event});
  return {state:C.publicState(st),revision:committed.revision,result};
 }
 if(action==='office-load'||action==='office-save'){
  if(grant.role!=='student')fail('Student access is required.',403);
  if(action==='office-load')return profile.office||{revision:0,run:null};
  if(!Number.isInteger(p.revision)||p.revision<0||JSON.stringify(p.run||{}).length>160000)fail('Invalid office save.');
  const previous=profile.office;
  if(previous&&JSON.stringify(previous.run.config)!==JSON.stringify(p.run?.config))fail('Your business identity is fixed once it is saved.');
  if(previous){const events=p.run?.events;if(!Array.isArray(events)||events.length<previous.run.events.length||JSON.stringify(events.slice(0,previous.run.events.length))!==JSON.stringify(previous.run.events))fail('Earlier office work cannot be changed.');}
  let st;try{st=globalThis.SIM.replay(p.run);}catch(error){fail(error.message);}
  const assigned=(await Promise.all((await studentClasses()).map(c=>store.list('demo_assignments',{class_id:c.id})))).flat().filter(a=>isLib(a)&&!a.definition.deleted);
  const last=Math.max(0,...assigned.map(a=>globalThis.SIM.findLesson(a.definition.lessonId)?.index||0));
  if(st.m>last)fail('This period has not been assigned by your instructor.',403);
  const saved=await store.saveOffice(user.id,p.revision,p.run);
  const targets=assigned;
  for(const a of targets){const result=st.results?.[a.definition.lessonId==='ch1'?'ch2':a.definition.lessonId];if(!result?.graded)continue;
   const old=await store.one('demo_runs',{student_id:user.id,assignment_id:a.id});if(old?.state?.completed)continue;
   await store.upsert('demo_runs',{student_id:user.id,assignment_id:a.id,state:{kind:'library',lessonId:a.definition.lessonId,completed:true,...result,stars:result.score>=90?3:result.score>=70?2:1,completedAt:new Date().toISOString()},revision:1,updated_at:new Date().toISOString()});
  }
  return {revision:saved.revision,savedAt:saved.savedAt};
 }
 if(action==='bootstrap'){
  const classes=teacher?await store.list('demo_classes',grant.role==='owner'?{}:{professor_id:user.id}):await studentClasses();
  const everything=(await Promise.all(classes.map(c=>store.list('demo_assignments',{class_id:c.id})))).flat(),lessonAssignments=everything.filter(a=>isLib(a)&&!a.definition.deleted),allAssignments=everything.filter(a=>!isLib(a)&&!isCase(a)),assignments=teacher?allAssignments:allAssignments.filter(a=>!a.definition.deleted);
  const runs=grant.role==='student'?(await store.list('demo_runs',{student_id:user.id})).filter(r=>assignments.some(a=>a.id===r.assignment_id)).map(r=>({...r,state:{...r.state,serverGrade:L.grade(r.state)}})):[];
  const cases=everything.filter(a=>isCase(a)&&(teacher||!a.definition.deleted));
  return {cases:cases.map(a=>({...caseMeta(a),...(teacher?{assignment:a.definition.assignment}:{})})),caseScores:grant.role==='student'?(await store.list('demo_runs',{student_id:user.id})).filter(r=>cases.some(a=>a.id===r.assignment_id)).map(caseScore):[],lessons:lessonAssignments.map(a=>({...a.definition,id:a.id,class_id:a.class_id})),lessonScores:grant.role==='student'?(await store.list('demo_runs',{student_id:user.id})).filter(r=>lessonAssignments.some(a=>a.id===r.assignment_id)).map(r=>({...r.state,assignment_id:r.assignment_id})):[],user:{id:user.id,email:address,role:grant.role},business:profile.business,classes,assignments:grant.role==='student'?assignments.map(a=>({...a,definition:studentDefinition(L.enableSimulation(a.definition))})):assignments.map(a=>({...a,definition:L.enableSimulation(prepareGuidedAssignment(a.definition))})),runs:runs.map(r=>({...r,state:studentRun(L,r.state)}))};
 }
 if(action==='access-list'){if(grant.role!=='owner')fail('Owner access required.',403);return await store.list('demo_access',{});}
 if(action==='authorize'){
  if(grant.role!=='owner')fail('Owner access required.',403);const target=email(p.email);
  if(target===address)fail('You cannot change your own owner access.');if(!['professor','student'].includes(p.role)||typeof p.active!=='boolean')fail('Choose a valid role and access setting.');
  const existing=await store.one('demo_access',{email:target});if(existing?.role==='owner')fail('Owner access is managed in the database.');
  if(existing&&existing.role!==p.role)fail('Existing account roles cannot be changed in this demo. Create a separate account for testing a different role.');
  await store.upsert('demo_access',{email:target,role:p.role,active:p.active});return {ok:true};
 }
 if(action==='create-class'){requireTeacher();const name=String(p.name||'').trim();if(!name||name.length>120)fail('Enter a class name up to 120 characters.');return await store.insert('demo_classes',{id:crypto.randomUUID(),professor_id:user.id,name});}
 if(action==='invite'){
  requireTeacher();const c=await classAccess(p.classId),target=email(p.email),existing=await store.one('demo_access',{email:target});
  if(existing&&existing.role!=='student')fail('That email belongs to a professor or owner. Use a student email.');
  if(existing&&!existing.active)fail('This student was disabled by the owner. Ask the owner to restore access.');
  if(!existing)await store.insert('demo_access',{email:target,role:'student',active:true});
  await store.upsert('demo_invitations',{class_id:c.id,email:target});return {ok:true};
 }
 if(action==='remove-student'){requireTeacher();await classAccess(p.classId);await store.remove('demo_invitations',{class_id:p.classId,email:email(p.email)});return {ok:true};}
 if(action==='generate'){requireTeacher();if(p.phase&&!['draft','review','revise'].includes(p.phase))fail('Choose a valid generation step.');if(p.phase==='review'&&(!p.draft||typeof p.draft!=='object'||JSON.stringify(p.draft).length>100000))fail('The saved draft is missing or too large.');if(p.phase==='revise'){if(typeof p.request!=='string'||!p.request.trim()||p.request.length>2000||!p.currentDraft||JSON.stringify(p.currentDraft).length>100000||!L.checkAssignment(p.currentDraft)||!p.currentDraft.teachingTopics?.length||!p.currentDraft.interactive)fail('Open a generated draft and describe the changes you want.');if(p.currentDraft.published){const a=await store.one('demo_assignments',{id:uuid(p.currentDraft.id)});if(!a)fail('Assignment not found.',404);await classAccess(a.class_id);}}const notes=p.notes;if(typeof notes!=='string'||notes.trim().length<40||notes.length>30000)fail('Upload or paste 40–30,000 characters of course notes.');if(!store.generate)fail('Assignment generation is not connected yet. The demo owner needs to configure the AI service.',503);return await store.generate({...p,notes,actor:user.id});}
 if(['delete-assignment','restore-assignment'].includes(action)){
  requireTeacher();const a=await store.one('demo_assignments',{id:uuid(p.assignmentId)});if(!a)fail('Assignment not found.',404);await classAccess(a.class_id);
  const definition={...a.definition,deleted:action==='delete-assignment',deletedAt:action==='delete-assignment'?new Date().toISOString():null};
  await store.update('demo_assignments',{id:a.id},{definition});return {ok:true};
 }
 if(action==='publish'){
  requireTeacher();const c=await classAccess(p.classId);p={...p,assignment:prepareGuidedAssignment(p.assignment)};if(!L.checkAssignment(p.assignment))fail('Invalid assignment settings.');
  const id=crypto.randomUUID(),definition={...p.assignment,id,published:true,origin:c.name};return await store.insert('demo_assignments',{id,class_id:c.id,definition});
 }
 if(action==='lesson-assign'){
  requireTeacher();const c=await classAccess(p.classId),lessonId=String(p.lessonId||'');if(!/^[A-Za-z0-9_-]{1,40}$/.test(lessonId))fail('Choose a lesson.');
  const title=String(p.title||'').trim().slice(0,160)||lessonId,dueDate=/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate||'')?p.dueDate:null;
  const existing=(await store.list('demo_assignments',{class_id:c.id})).find(a=>isLib(a)&&a.definition.lessonId===lessonId&&!a.definition.deleted);
  if(existing){const definition={...existing.definition,title,dueDate};await store.update('demo_assignments',{id:existing.id},{definition});return {...existing,definition};}
  const id=crypto.randomUUID();return await store.insert('demo_assignments',{id,class_id:c.id,definition:{kind:'library',id,lessonId,title,dueDate,published:true}});
 }
 if(action==='lesson-score'){
  if(grant.role!=='student')fail('Only students submit lesson scores.',403);
  fail('Complete this period in your office. Accounting scores are calculated from the saved work, not sent by the browser.',409);
 }
 if(action==='business'){
  if(grant.role!=='student')fail('Only students have a business profile.',403);const v=p.business;
  let business;try{business=L.normalizeBusiness(v);}catch(error){fail(error.message);}
  const runs=await store.list('demo_runs',{student_id:user.id});if(runs.length&&profile.business?.type!==v.type)fail('Business type cannot change after starting assignments.');
  await store.update('demo_profiles',{id:user.id},{business});return {business};
 }
 if(action==='gradebook'){
  requireTeacher();await classAccess(p.classId);const invitations=await store.list('demo_invitations',{class_id:p.classId}),everything=await store.list('demo_assignments',{class_id:p.classId}),assignments=everything.filter(a=>!isLib(a)&&!isCase(a)),lessons=everything.filter(a=>isLib(a)&&!a.definition.deleted),cases=everything.filter(a=>isCase(a)&&!a.definition.deleted);
  const [profiles,runs]=await Promise.all([store.listIn('demo_profiles','email',invitations.map(i=>i.email)),store.listIn('demo_runs','assignment_id',everything.map(a=>a.id))]);
  const byEmail=new Map(profiles.map(s=>[s.email,s])),byStudent=new Map();for(const run of runs){if(!byStudent.has(run.student_id))byStudent.set(run.student_id,[]);byStudent.get(run.student_id).push(run);}
  const students=invitations.map(i=>{const s=byEmail.get(i.email),work=byStudent.get(s?.id)||[];return {email:i.email,accountCreated:!!s,business:officeBusiness(s),office:officeProgress(s),runs:work.filter(r=>assignments.some(a=>a.id===r.assignment_id)).map(r=>({...r,state:{...r.state,serverGrade:L.grade(r.state)}})),lessonScores:work.filter(r=>lessons.some(a=>a.id===r.assignment_id)).map(r=>({...r.state,assignment_id:r.assignment_id})),caseScores:work.filter(r=>cases.some(a=>a.id===r.assignment_id)).map(caseScore)};});
  return {assignments,lessons:lessons.map(a=>({...a.definition,id:a.id})),cases:cases.map(caseMeta),students};
 }
 if(action==='attempts'){
  requireTeacher();const a=await store.one('demo_assignments',{id:uuid(p.assignmentId)});if(!a)fail('Assignment not found.',404);await classAccess(a.class_id);
  return await store.list('demo_attempts',{student_id:uuid(p.studentId),assignment_id:a.id});
 }
 if(action==='leaderboard'){const a=await studentAssignment(p.assignmentId),rows=await store.list('demo_runs',{assignment_id:a.id});return rows.filter(x=>x.state.challenge&&x.state.completed).map(x=>({business:x.state.business.name,...businessResult(L,x.state),mine:x.student_id===user.id})).sort((a,b)=>b.profit-a.profit||b.cash-a.cash).slice(0,30);}
 if(['start','challenge','advance','entry','prediction','effects','complete','decide'].includes(action)){
  const a=await studentAssignment(p.assignmentId),saved=await store.one('demo_runs',{student_id:user.id,assignment_id:a.id});
  if(!Number.isInteger(p.revision)||p.revision!==(saved?.revision||0))fail('Work changed in another tab. Refresh your classroom before submitting.',409);
  let state;
  if(action==='start'){
   a.definition=L.enableSimulation(prepareGuidedAssignment(a.definition));
   if(saved)fail('This assignment has already started.',409);if(!profile.business)fail('Create your business first.');
   const choices=p.choice||{}, index=x=>Number.isInteger(x)&&x>=0&&x<=2;
   const valid=a.definition.interactive?L.decisions.validChoice(a.definition,choices,profile.business):a.definition.version===3?index(choices.plan):a.definition.version===2?L.validEpisodeChoice(a.definition,choices):a.definition.topic==='prepaid'?index(choices.location)&&[1,3,6].includes(choices.months):a.definition.topic==='receivables'?index(choices.order)&&index(choices.collection):a.definition.topic==='equipment'?index(choices.level)&&index(choices.life):index(choices.investment)&&index(choices.ad);
   if(!valid)fail('Choose valid business options.');
   let scenario;try{scenario=L.expected(a.definition,choices,profile.business);}catch{fail('Choose valid business options.');}
   state={assignment:a.definition,business:profile.business,choice:p.choice,scenario,decidedMonths:[0],entries:{},first:{},advanced:false,completed:false};L.syncBusinessEntries(state);state.serverGrade=L.grade(state);
  }else{if(!saved)fail('Start the assignment first.');state=changeRun(L,saved.state,action,p);}
  const committed=await store.commit(user.id,a.id,p.revision,state,action,p);return {...committed,state:studentRun(L,committed.state)};
 }
 fail('Unknown classroom action.',404);
}
