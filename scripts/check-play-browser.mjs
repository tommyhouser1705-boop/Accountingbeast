// Plays every Year One demo end to end in Chromium: decisions, a wrong then right
// journal entry, year-end adjustments, statement sorting, totals, report, resume.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=new URL('../'+(process.argv[2]||'play.html'),import.meta.url).href;
const shots=process.env.SHOTS||'';
const browser=await chromium.launch();
const errors=[];
async function open(viewport,hash=''){const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(url+hash);await page.evaluate(()=>localStorage.clear());await page.reload();return page;}
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
async function play(page,{name,last=false,reloadAt=0}){let wrong=false,sortWrong=false,reloaded=false,computeWrong=false;
 for(let n=0;n<400;n++){const st=await page.evaluate(()=>window.__play());
  if(st.phase==='yearend'){if(shots)await page.screenshot({path:shots+name+'-yearend.png'});await page.click('#begin-close');continue;}
  if(st.phase==='story'){const k=await page.evaluate(last=>{const q=document.querySelector('input[type=range]');if(q&&last){q.value=q.max;q.dispatchEvent(new Event('input',{bubbles:true}));}const b=[...document.querySelectorAll('[data-choice]:not([disabled])')];return b[last?b.length-1:0].dataset.choice;},last);await page.click('[data-choice="'+k+'"]');continue;}
  if(st.phase==='note'||st.phase==='done'){if(reloadAt&&!reloaded&&st.rec>=reloadAt){reloaded=true;await page.reload();await page.click('#resume');const after=await page.evaluate(()=>window.__play());assert.equal(after.rec,st.rec,'resume keeps progress');assert.equal(after.phase,'story');continue;}await page.click('#next');continue;}
  if(st.phase==='record'){const right=st.lines.map(([a,s,x])=>({a,d:s==='dr'?String(x):'',c:s==='cr'?String(x):''}));
   const fill=async rows=>{let have=await page.locator('[data-row]').count();while(have<rows.length){await page.click('#add-line');have++;}for(let i=0;i<rows.length;i++){await page.selectOption('#a-'+i,rows[i].a);await page.fill('#d-'+i,rows[i].d);await page.fill('#c-'+i,rows[i].c);}};
   if(!wrong){wrong=true;await fill(right.map(r=>({a:r.a,d:r.c,c:r.d})));await page.click('#check');assert.match(await page.textContent('.fb.bad'),/wrong sides/);if(shots)await page.screenshot({path:shots+name+'-wrong.png'});}
   await fill(right);if(shots&&right.length>2)await page.screenshot({path:shots+name+'-compound.png'});await page.click('#check');assert.equal((await page.evaluate(()=>window.__play())).phase,'done');if(shots&&st.rec===2)await page.screenshot({path:shots+name+'-done.png'});continue;}
  if(st.phase==='stmt-intro'){await page.click('#start-statements');continue;}
  if(st.phase==='sort'){const items=await page.evaluate(()=>LedgerPlay.sortItems(window.__playGame()).map(id=>[id,LedgerPlay.sectionOf(id)]));
   if(!sortWrong){sortWrong=true;const [id,s]=items[0];const bad=s==='bs-liab'?'bs-assets':'bs-liab';await page.click('.tray [data-item="'+id+'"]');await page.click('[data-section="'+bad+'"]');}
   for(const [id,s] of items){const placed=await page.$('[data-section="'+s+'"] [data-item="'+id+'"]');if(placed)continue;if(await page.$('.tray [data-item="'+id+'"]'))await page.click('.tray [data-item="'+id+'"]');else await page.click('[data-item="'+id+'"]');await page.click('[data-section="'+s+'"]');if(!sortWrong)break;}
   if(n<300&&await page.$('.drop [data-item].wrong')===null&&!(await page.evaluate(()=>window.__sortChecked))){}
   const ok=await page.evaluate(()=>LedgerPlay.checkSort(window.__playGame(),{}).missing.length);
   if(shots)await page.screenshot({path:shots+name+'-sort.png',fullPage:true});assert.equal(await overflow(page),false,name+' sort overflow');await page.click('#check-sort');continue;}
  if(st.phase==='compute'){const s=await page.evaluate(()=>LedgerPlay.statements(window.__playGame()));if(!computeWrong){computeWrong=true;await page.fill('#in-ni','1');await page.click('#check-compute');assert.match(await page.textContent('.fb.bad'),/Net income/);}
   await page.fill('#in-ni','$'+s.netIncome.toLocaleString('en-US'));await page.fill('#in-cap',String(s.endCapital));await page.fill('#in-ta',String(s.totalAssets));await page.click('#check-compute');continue;}
  if(st.phase==='report'){if(shots)await page.screenshot({path:shots+name+'-report.png',fullPage:true});assert.equal(await overflow(page),false,name+' report overflow');return {name,rec:st.rec,h:(await page.textContent('.hero-end h1')).trim()};}
  throw new Error('Unexpected phase '+JSON.stringify(st));}
 throw new Error(name+' did not finish');}
const results=[];
let page=await open({width:1440,height:900});if(shots)await page.screenshot({path:shots+'pick.png'});
for(const id of ['coffee','bike','truck']){await page.click('#play-again').catch(()=>{});await page.click('[data-biz="'+id+'"]');if(shots&&id==='coffee')await page.screenshot({path:shots+'coffee-story.png'});results.push(await play(page,{name:id,reloadAt:id==='coffee'?4:0}));}
await page.close();
page=await open({width:390,height:844});for(const id of ['truck','coffee']){await page.click('#play-again').catch(()=>{});await page.click('[data-biz="'+id+'"]');assert.equal(await overflow(page),false,'mobile story overflow');results.push(await play(page,{name:'mobile-'+id,last:true}));}
await page.close();
page=await open({width:1280,height:860},'#instructor');assert.equal((await page.evaluate(()=>window.__play())).modal,true);await page.click('#gen');assert.equal(await page.locator('.key li.ok').count(),10);if(shots)await page.screenshot({path:shots+'instructor.png'});await page.click('#play');results.push(await play(page,{name:'instructor'}));
await browser.close();
console.log(results.map(r=>r.name+': '+r.rec+' entries · '+r.h).join('\n'));
assert.deepEqual(errors,[]);console.log('no page or console errors');
