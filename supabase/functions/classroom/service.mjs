// Shared server logic. No role, score, expected answer, or first attempt is
// accepted from the browser. Store operations run with server credentials.
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fail=(message,status=400)=>{throw new AppError(message,status);};
const email=x=>{const s=String(x||'').trim().toLowerCase();if(s.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail('Enter a valid email address.');return s;};
const uuid=x=>{if(typeof x!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x))fail('Invalid record ID.');return x;};
export function changeRun(L,old,action,p){
 const r=structuredClone(old),s=r.scenario;
 if(action==='advance'){if(r.assignment.version>=2){r.stage=Math.min(2,(r.stage||0)+1);r.advanced=r.stage===2;}else r.advanced=true;}
 else if(action==='entry'){
  const e=s.events.find(e=>e.id===p.record);if(!e||!L.availableEvents(r).some(x=>x.id===e.id))fail('This document is not available yet.');
  if(!Array.isArray(p.rows)||p.rows.some(x=>!x||typeof x!=='object'))fail('Journal lines are required.');const error=r.assignment.version===3&&p.rows.length===0?null:L.validateRows(p.rows,s.accountList||L.accounts);if(error)fail(error);
  if(typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||Number.isNaN(Date.parse(p.date)))fail('Enter a valid journal-entry date.');
  const rows=p.rows.map(x=>({account:x.account,debit:Number(x.debit||0),credit:Number(x.credit||0)}));
  r.first[p.record]??=L.assess(rows,p.date,e);r.entries[p.record]={date:p.date,rows};r.completed=false;
 }
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
 r.serverGrade=L.grade(r);return r;
}
export function studentDefinition(a){if(a.version!==3)return a;const v=structuredClone(a);v.publicDefinition=true;for(const p of v.blueprint.paths)for(const e of p.events)delete e.lines;return v;}
export function studentRun(L,state){if(state.assignment.version!==3)return state;const s=structuredClone(state);s.publicRun=true;s.assessments=Object.fromEntries(state.scenario.events.map(e=>[e.id,state.entries[e.id]?L.assess(state.entries[e.id].rows,state.entries[e.id].date,e):null]));s.assignment=studentDefinition(state.assignment);for(const e of s.scenario.events){delete e.lines;delete e.amount;}for(const e of s.scenario.effects)delete e.value;return s;}
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
 const studentAssignment=async id=>{if(grant.role!=='student')fail('Student access is required.',403);const a=await store.one('demo_assignments',{id:uuid(id)});if(!a||!await store.one('demo_invitations',{class_id:a.class_id,email:address}))fail('This assignment is not in your class.',403);return a;};
 if(action==='bootstrap'){
  const classes=teacher?await store.list('demo_classes',grant.role==='owner'?{}:{professor_id:user.id}):await studentClasses();
  const assignments=(await Promise.all(classes.map(c=>store.list('demo_assignments',{class_id:c.id})))).flat();
  const runs=grant.role==='student'?await store.list('demo_runs',{student_id:user.id}):[];
  return {user:{id:user.id,email:address,role:grant.role},business:profile.business,classes,assignments:grant.role==='student'?assignments.map(a=>({...a,definition:studentDefinition(a.definition)})):assignments,runs:runs.map(r=>({...r,state:studentRun(L,r.state)}))};
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
 if(action==='generate'){requireTeacher();const notes=p.notes;if(typeof notes!=='string'||notes.trim().length<40||notes.length>30000)fail('Upload or paste 40–30,000 characters of course notes.');if(!store.generate)fail('Assignment generation is not connected yet. The demo owner needs to configure the AI service.',503);return await store.generate({...p,notes,actor:user.id});}
 if(action==='publish'){
  requireTeacher();const c=await classAccess(p.classId);if(!L.checkAssignment(p.assignment))fail('Invalid assignment settings.');
  const id=crypto.randomUUID(),definition={...p.assignment,id,published:true,origin:c.name};return await store.insert('demo_assignments',{id,class_id:c.id,definition});
 }
 if(action==='business'){
  if(grant.role!=='student')fail('Only students have a business profile.',403);const v=p.business;
  let business;try{business=L.normalizeBusiness(v);}catch(error){fail(error.message);}
  const runs=await store.list('demo_runs',{student_id:user.id});if(runs.length&&profile.business?.type!==v.type)fail('Business type cannot change after starting assignments.');
  await store.update('demo_profiles',{id:user.id},{business});return {business};
 }
 if(action==='gradebook'){
  requireTeacher();await classAccess(p.classId);const invitations=await store.list('demo_invitations',{class_id:p.classId}),assignments=await store.list('demo_assignments',{class_id:p.classId});
  const students=await Promise.all(invitations.map(async i=>{const s=await store.one('demo_profiles',{email:i.email});return {email:i.email,business:s?.business||null,runs:s?(await store.list('demo_runs',{student_id:s.id})).filter(r=>assignments.some(a=>a.id===r.assignment_id)):[]};}));return {assignments,students};
 }
 if(action==='attempts'){
  requireTeacher();const a=await store.one('demo_assignments',{id:uuid(p.assignmentId)});if(!a)fail('Assignment not found.',404);await classAccess(a.class_id);
  return await store.list('demo_attempts',{student_id:uuid(p.studentId),assignment_id:a.id});
 }
 if(['start','advance','entry','prediction','effects'].includes(action)){
  const a=await studentAssignment(p.assignmentId),saved=await store.one('demo_runs',{student_id:user.id,assignment_id:a.id});
  if(!Number.isInteger(p.revision)||p.revision!==(saved?.revision||0))fail('Work changed in another tab. Refresh your classroom before submitting.',409);
  let state;
  if(action==='start'){
   if(saved)fail('This assignment has already started.',409);if(!profile.business)fail('Create your business first.');
   const choices=p.choice||{}, index=x=>Number.isInteger(x)&&x>=0&&x<=2;
   const valid=a.definition.version===3?index(choices.plan):a.definition.version===2?L.validEpisodeChoice(a.definition,choices):a.definition.topic==='prepaid'?index(choices.location)&&[1,3,6].includes(choices.months):a.definition.topic==='receivables'?index(choices.order)&&index(choices.collection):a.definition.topic==='equipment'?index(choices.level)&&index(choices.life):index(choices.investment)&&index(choices.ad);
   if(!valid)fail('Choose valid business options.');
   let scenario;try{scenario=L.expected(a.definition,choices,profile.business);}catch{fail('Choose valid business options.');}
   state={assignment:a.definition,business:profile.business,choice:p.choice,scenario,entries:{},first:{},advanced:false,completed:false};state.serverGrade=L.grade(state);
  }else{if(!saved)fail('Start the assignment first.');state=changeRun(L,saved.state,action,p);}
  const committed=await store.commit(user.id,a.id,p.revision,state,action,p);return {...committed,state:studentRun(L,committed.state)};
 }
 fail('Unknown classroom action.',404);
}
