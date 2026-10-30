// Local contract fixtures only. No production credentials, AI calls or student writes.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateCourseAssignment} from '../supabase/functions/classroom/generator.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js');
const {topicDraft,scenarioDraft}=require('../test-fixtures/interactive-assignment.cjs');
let n=0;
const notes='Supplies bought on account, supplier payments and month-end supplies counts.';
const assignment=await generateCourseAssignment(L,{notes,year:2026,month:9,depth:'focused'},{key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++n===1?topicDraft():scenarioDraft())}}]})})});
const base=process.env.LEDGER_TEST_URL||'http://localhost:3000/docs/index.html';
const shots=process.env.LEDGER_SCREENSHOTS;
const user={id:'teacher-fixture',email:'professor@example.edu',role:'professor'};
const classes=[{id:'class-a',name:'Financial Accounting · Section 01'},{id:'class-b',name:'Financial Accounting · Section 02'}];
const lessons=[{id:'lesson-a',class_id:'class-a',lessonId:'ch2',title:'Ch 2 · Opening month',dueDate:'2026-11-15'}];
const sampleStudents=[
 {email:'alex@example.edu',business:{name:'Spoke & Sprocket',founder:'Alex Rivera'},accountCreated:true,registration:{confirmedAt:'2026-10-01'},office:{period:'Opening month',day:7,first:8,graded:10,updatedAt:'2026-10-30T15:20:00Z'},lessonScores:[{assignment_id:'lesson-a',score:80,completed:true}],caseScores:[]},
 {email:'maya@example.edu',business:{name:'Maya Photo',founder:'Maya Chen'},accountCreated:true,registration:{confirmedAt:'2026-10-01'},office:{period:'Opening month',day:4,first:5,graded:5,updatedAt:'2026-10-30T14:00:00Z'},lessonScores:[],caseScores:[]},
 {email:'registered@example.edu',accountCreated:true,registration:{confirmedAt:'2026-10-01'},lessonScores:[],caseScores:[]},
 {email:'unconfirmed@example.edu',accountCreated:true,registration:{confirmedAt:null},lessonScores:[],caseScores:[]},
 {email:'invited@example.edu',accountCreated:false,lessonScores:[],caseScores:[]}
];
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],calls=[];
  page.setDefaultTimeout(8000);
  let cases=[],students=structuredClone(sampleStudents),failGeneration=false,failRefresh=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.text().startsWith('Overflow'))console.log(m.text());});
  await page.addInitScript(()=>sessionStorage.setItem('ledger-cloud-session',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Date.now()+3600000})));
  await page.route('**/auth/v1/**',r=>r.fulfill({json:{}}));
  await page.route('**/functions/v1/classroom',async r=>{
   const {action,payload:p={}}=r.request().postDataJSON();calls.push({action,p});
   if(action==='generate'&&failGeneration)return r.fulfill({status:503,json:{error:'Generation is temporarily unavailable. Try again.'}});
   if(action==='gradebook'&&failRefresh)return r.fulfill({status:503,json:{error:'Refresh temporarily unavailable.'}});
   let result={};
   if(action==='bootstrap')result={user,classes,business:null,assignments:[],runs:[],lessons,cases};
   if(action==='gradebook')result={students:p.classId==='class-a'?students:[],lessons,cases,assignments:[]};
   if(action==='office-work')result={submissions:[{lessonId:'ch2',sequence:1,subject:'Equipment invoice',period:'Opening month',day:4,graded:true,correct:true,firstAttempt:true,feedback:'Correct accounting.',rows:[{a:'equipment',d:7000,c:0},{a:'cash',d:0,c:7000}]}]};
   if(action==='generate')result=p.phase==='draft'?{draft:{topics:assignment.teachingTopics}}:assignment;
   if(action==='case-publish'){cases=[{id:'new-case',class_id:p.classId,title:p.title,dueDate:p.dueDate,assignment:p.assignment}];result={id:'new-case'};}
   if(action==='invite')students.push({email:p.email,accountCreated:false,lessonScores:[],caseScores:[]});
   return r.fulfill({json:result});
  });
  await page.goto(base+'#dash=overview');
  await page.locator('.faculty-roster').waitFor().catch(async e=>{console.error({errors,calls,body:await page.locator('body').innerText()});throw e;});
  assert.equal(await page.locator('.faculty-roster tbody tr').count(),5);
  for(const status of ['Account registered','Email not confirmed','Not registered'])assert.ok(await page.locator('.faculty-roster').getByText(status,{exact:true}).count());
  if(shots)await page.screenshot({path:shots+'/faculty-roster-'+width+'.png',fullPage:true});
  await page.locator('[data-review-student="alex@example.edu"]').first().click();
  await page.locator('summary').filter({hasText:'Equipment invoice'}).waitFor();
  await page.locator('[data-close-review]').click();
  await page.locator('#roster-filter').fill('maya');
  assert.equal(await page.locator('[data-roster-student]:visible').count(),1);
  await page.locator('#roster-filter').fill('');
  failRefresh=true;await page.locator('#refresh-class').click();
  await page.getByText('Couldn’t refresh. Showing the last successful update.',{exact:true}).waitFor();
  assert.equal(await page.locator('.faculty-roster tbody tr').count(),5);failRefresh=false;
  await page.locator('[data-dash="students"]').click();await page.locator('#invite-student input').fill('new.student@example.edu');
  await page.locator('#invite-student button').click();await page.locator('.faculty-roster').getByText('new.student@example.edu',{exact:true}).first().waitFor();
  await page.locator('[data-dash="plan"]').click();
  await page.locator('[data-new-assignment]').click();await page.locator('[data-studio="choose-notes"]').click();
  await page.locator('#notes-file').setInputFiles({name:'course-notes.txt',mimeType:'text/plain',buffer:Buffer.from(notes)});
  await page.waitForFunction(text=>document.querySelector('#case-notes')?.value===text,notes);
  if(shots)await page.screenshot({path:shots+'/faculty-editor-'+width+'.png',fullPage:true});
  await page.locator('[data-studio="generate-notes"]').click();await page.getByRole('heading',{name:'Assignment overview',exact:true}).waitFor();
  assert.ok(calls.some(c=>c.action==='generate'&&c.p.phase==='draft'));assert.ok(calls.some(c=>c.action==='generate'&&c.p.phase==='review'));
  assert.equal(await page.locator('[data-studio="publish"]').isDisabled(),true);
  await page.locator('.faculty-review-options summary').click();
  const before=await page.locator('.faculty-entry-map').innerText();
  await page.locator('[data-studio="low"]').click();await page.locator('.faculty-entry-map').waitFor();
  assert.notEqual(await page.locator('.faculty-entry-map').innerText(),before);
  assert.ok((await page.locator('.faculty-entry-map').innerText()).includes('No entry'));
  await page.locator('[data-studio="high"]').click();
  await page.locator('[data-preview-tab="student"]').click();await page.locator('.faculty-office').waitFor();
  assert.equal(await page.locator('.faculty-entry-map').count(),0);
  assert.notEqual(await page.locator('.faculty-mail-content fieldset').getAttribute('disabled'),null);
  assert.equal(await page.locator('.faculty-mail-content fieldset button').first().isDisabled(),true);
  const records=page.locator('[data-preview-item]');assert.ok(await records.count()>3);
  await page.locator('[data-preview-item="supplies-invoice"]').click();
  assert.equal(await page.getByRole('button',{name:'Post entry · unavailable in preview'}).isDisabled(),true);
  if(shots){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:shots+'/faculty-student-preview-'+width+'.png',fullPage:width<700});}
  await page.locator('[data-preview-tab="overview"]').click();
  await page.locator('[data-review-paths] summary').click();
  if(shots){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:shots+'/faculty-overview-'+width+'.png',fullPage:width<700});}
  await page.locator('#review-documents').check();await page.locator('#review-accounting').check();
  assert.equal(await page.locator('[data-studio="publish"]').isEnabled(),true);
  await page.locator('#case-notes').fill(notes+' Include supplier payments.');
  assert.equal(await page.locator('[data-studio="publish"]').isDisabled(),true);
  assert.equal(await page.locator('#review-documents').isChecked(),false);
  failGeneration=true;await page.locator('[data-studio="generate-notes"]').click();
  await page.locator('#instructor-status').getByText(/temporarily unavailable/).waitFor();
  assert.equal(await page.locator('.faculty-entry-map').count(),1);failGeneration=false;
  await page.locator('[data-studio="generate-notes"]').click();await page.locator('#instructor-status').getByText(/overview ready/).waitFor();
  await page.locator('#review-documents').check();await page.locator('#review-accounting').check();
  await page.locator('#case-title').fill('Supplier records practice');await page.locator('#case-due').fill('2026-11-20');
  await page.locator('[data-studio="publish"]').click();await page.getByRole('heading',{name:'Assignments',exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.action==='case-publish').length,1);assert.equal(calls.filter(c=>c.action==='case-act'||c.action==='office-save').length,0);
  await page.locator('#cloud-class').selectOption('class-b');await page.locator('#class-sync-status').getByText(/Updated/).waitFor();
  await page.locator('[data-new-assignment]').click();await page.locator('[data-studio="choose-notes"]').click();
  assert.equal(await page.locator('#case-notes').inputValue(),'');
  assert.ok(await page.evaluate(()=>{if(document.documentElement.scrollWidth>innerWidth+1){console.log('Overflow '+JSON.stringify([...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width])));return false;}return true;}),'No page overflow at '+width);
  assert.deepEqual(errors,[]);await page.close();
  const login=await browser.newPage({viewport:{width,height:1000}}),authCalls=[];
  await login.route('**/auth/v1/**',r=>{authCalls.push(r.request().url());return r.fulfill({json:{}});});
  await login.goto(base+'#signin');await login.locator('#cloud-auth').waitFor();
  await login.locator('#cloud-email').fill('student@example.edu');await login.locator('#cloud-password').fill('example-password');
  await login.locator('#show-password').click();assert.equal(await login.locator('#cloud-password').getAttribute('type'),'text');
  await login.locator('#cloud-signup').click();assert.equal(await login.locator('#cloud-email').inputValue(),'student@example.edu');
  await login.locator('#cloud-password').fill('example-password');await login.locator('#confirm-password').fill('different-password');
  await login.locator('.account-submit').click();await login.getByText(/passwords don’t match/).waitFor();assert.equal(authCalls.length,0);
  if(shots)await login.screenshot({path:shots+'/faculty-login-'+width+'.png',fullPage:true});
  assert.ok(await login.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await login.close();
  console.log(width+': roster, submissions, refresh failure, invitation, notes upload, generation, choices, read-only preview, review gates, retry, publication, class isolation and login passed.');
 }
}finally{await browser.close();}
