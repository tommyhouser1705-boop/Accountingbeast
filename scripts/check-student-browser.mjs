import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {changeRun,studentRun,studentDefinition,businessResult} from '../supabase/functions/classroom/service.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js'),root=fileURLToPath(new URL('../',import.meta.url));
// Exercise the real student UI and server state transitions with an isolated test
// account. No production accounts, grades or professor notes are written.
export async function checkStudentBrowser(assignment,label='assignment'){
 const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://test').pathname,local=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!local.startsWith(root)){res.writeHead(403);res.end();return;}const data=await fs.readFile(local);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(local)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({...(process.env.LEDGER_CHROMIUM_PATH?{executablePath:process.env.LEDGER_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
  await fs.mkdir(path.join(root,'student-test-results'),{recursive:true});
  for(const type of ['Coffee shop','Cleaning service']){
   const business={name:type==='Coffee shop'?'Tommy’s Coffee Shop':'Bright Cleaning Service',type,color:'sage',style:'Classic awning',district:'Main street',specialty:L.businesses[type].products[0]};let state=null,revision=0,checkedMistake=false;const errors=[],layouts=new Set();
   const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
   await p.exposeBinding('testSubmission',async(_,action,payload)=>{if(action==='start'){state={assignment,business,choice:payload.choice,scenario:L.expected(assignment,payload.choice,business),stage:0,decidedStages:[0],decidedMonths:[0],entries:{},first:{},advanced:false,completed:false};L.syncBusinessEntries(state);}else state=changeRun(L,state,action,payload);return {state:studentRun(L,state),revision:++revision};});
   await p.goto('http://127.0.0.1:'+server.address().port);
   await p.evaluate(({a,b})=>{cloudAccount={id:'isolated-browser-student',email:'student@example.test',role:'student'};cloudScreen='';cloud.call=(action,payload)=>window.testSubmission(action,payload);cloudRevision={};data={profile:b,assignments:[a],runs:{}};active=a.id;role='student';page='assignments';render();},{a:studentDefinition(assignment),b:business});
   // First-use guidance must actually appear and teach the mechanics.
   await p.locator('#practice-next').click();await p.locator('#practice-entry [name=date]').fill('2026-09-02');await p.locator('[name=debitAccount]').selectOption('Supplies');await p.locator('[name=creditAccount]').selectOption('Cash');await p.locator('#practice-entry [name=debit]').fill('90');await p.locator('#practice-entry [name=credit]').fill('90');await p.locator('#practice-entry button').click();assert.match(await p.locator('#practice-feedback').innerText(),/100/);await p.locator('#practice-entry [name=debit]').fill('100');await p.locator('#practice-entry [name=credit]').fill('100');await p.locator('#practice-entry button').click();await p.locator('#practice-understood').click();await p.locator('#finish-practice').click();
   for(let i=0;i<4;i++){const bounds=await p.locator('#lesson-dialog').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=1001,'Tour must fit in the viewport');await p.locator('#tour-next').click();}
   const initial=await p.locator('.owner-decisions').innerText();assert.ok(initial.includes(business.name));if(type==='Coffee shop')assert.ok(!/cleaning company|Cleaning solution/.test(initial));
   await p.screenshot({path:path.join(root,`student-test-results/${label}-${type==='Coffee shop'?'coffee':'cleaning'}-start.png`),fullPage:true});
   await p.locator('#business-choice button[data-cloud-submit]').click();await p.waitForFunction(()=>!!data.runs[active]);
   const fillEntry=async(event,wrong=false)=>{await p.locator('#entry-date').fill(event.date);while(await p.locator('#journal-form tbody tr').count()<event.lines.length)await p.locator('#add-line').click();for(let i=0;i<event.lines.length;i++){const row=event.lines[i];await p.locator(`[data-line="${i}"][data-field=account]`).selectOption(row.account);await p.locator(`[data-line="${i}"][data-field=debit]`).fill(row.debit?String(row.debit+(wrong?1:0)):'');await p.locator(`[data-line="${i}"][data-field=credit]`).fill(row.credit?String(row.credit+(wrong?1:0)):'');}await p.locator('#journal-form button').first().click();await p.waitForFunction(()=>!cloudBusy);};
   for(let step=0;step<20&&!state.completed;step++){
    if(L.pendingDecision(state)!==null){for(const input of await p.locator('#monthly-choice input[type=date]').all())await input.fill(await input.getAttribute('min'));await p.locator('#monthly-choice button[data-cloud-submit]').click();await p.waitForFunction(()=>!cloudBusy);continue;}
    for(const event of L.availableEvents(state).filter(e=>!e.autoPosted&&!state.entries[e.id])){
     await p.locator(`[data-record="${event.id}"]`).first().click();const evidence=await p.locator('.guided-evidence').innerText();assert.ok(evidence.includes(business.name),'Every document identifies this student’s business');if(type==='Coffee shop')assert.ok(!/cleaning company|Cleaning solution/.test(evidence));layouts.add(event.document.layout);
     if(!event.lines.length){await p.locator('#entry-date').fill(event.date);await p.locator('#no-entry').click();await p.waitForFunction(()=>!cloudBusy);}else{if(!checkedMistake&&event.lines.length===2){await fillEntry(event,true);assert.match(await p.locator('#entry-feedback').innerText(),/needs another look|Recalculate/i);checkedMistake=true;}await fillEntry(event);}
     assert.match(await p.locator('#entry-feedback').innerText(),/Correct entry/);assert.ok(L.assess(state.entries[event.id].rows,state.entries[event.id].date,event).correct);
    }
    if(state.advanced){await p.locator('#view-taccounts').click();assert.ok((await p.locator('.trial-balance').innerText()).includes('Debits and credits match'));assert.equal(await p.locator('.trial-balance input').count(),0);await p.locator('#close-ledger').click();await p.screenshot({path:path.join(root,`student-test-results/${label}-${type==='Coffee shop'?'coffee':'cleaning'}-finish.png`),fullPage:true});await p.locator('#finish-assignment').click();await p.waitForFunction(()=>!cloudBusy);}else{assert.ok(await p.locator('#advance-episode').isVisible(),'The next step must be visible');await p.locator('#advance-episode').click();await p.waitForFunction(()=>!cloudBusy);}
   }
   assert.equal(state.completed,true);assert.equal(L.grade(state).journal,100);assert.ok(checkedMistake);assert.ok(layouts.size>=2,'Documents must use distinct evidence layouts');assert.ok(businessResult(L,state).revenue>0);assert.deepEqual(errors,[]);await p.close();
   console.log(`Student browser passed (${label}, ${type}): first-use practice, tour, business choices, documents, incorrect-answer feedback, corrections, months, T accounts, trial balance and completion.`);
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
