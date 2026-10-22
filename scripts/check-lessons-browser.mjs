// Plays every lesson in lessons.html in Chromium using the built-in answer key:
// business setup, decisions, one wrong journal entry per lesson, then correct answers.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=new URL('../'+(process.argv[2]||'lessons.html'),import.meta.url).href;
const shots=process.env.SHOTS||'';const only=process.env.ONLY?process.env.ONLY.split(','):null;
const browser=await chromium.launch();const errors=[];
const clickData=(page,attr,val,attr2,val2)=>page.evaluate(([a,v,a2,v2])=>{const b=[...document.querySelectorAll('button')].find(x=>x.dataset[a]===String(v)&&(!a2||x.dataset[a2]===String(v2)));if(!b)throw new Error('no button '+a+'='+v+' '+(a2||'')+'='+(v2||''));b.click();},[attr,val,attr2,val2]);
async function fill(page,rows){let have=await page.locator('.je-r').count();while(have<rows.length){await page.click('#add-line');have++;}
 for(let i=0;i<have;i++){const r=rows[i]||{a:'',d:'',c:''};await page.selectOption('#a-'+i,r.a);await page.fill('#d-'+i,r.d);await page.fill('#c-'+i,r.c);}}
async function play(page,id,tag){await clickData(page,'start',id);let wrong=false,n=0;
 for(;n<200;n++){const s=await page.evaluate(()=>window.__ll.state());if(s.done)break;const k=s.step.k,ans=await page.evaluate(()=>window.__ll.answer());
  if(k==='info'){await page.click('#next');continue;}
  if(k==='decide'){for(const [q,v] of ans)await page.evaluate(([q,v])=>{const b=[...document.querySelectorAll('button')].find(x=>x.dataset.q===q&&x.dataset.v===String(v));if(b)b.click();},[q,v]);if(shots&&tag)await page.screenshot({path:`${shots}${tag}-${id}-decide.png`,fullPage:true});await page.click('#decide');continue;}
  if(k==='je'){const right=ans.map(([a,s,x])=>({a,d:s==='dr'?String(x):'',c:s==='cr'?String(x):''}));
   if(!wrong){wrong=true;await fill(page,right.map(r=>({a:r.a,d:r.c,c:r.d})));await page.click('#post');assert.match(await page.textContent('.fb.bad'),/wrong side/);if(shots&&tag)await page.screenshot({path:`${shots}${tag}-${id}-wrong.png`,fullPage:true});}
   await fill(page,right);await page.click('#post');}
  if(k==='num'){for(const [f,v] of ans)await page.fill('#n-'+f,String(v));if(shots&&tag&&n%5===0)await page.screenshot({path:`${shots}${tag}-${id}-num${n}.png`,fullPage:true});await page.click('#check-num');}
  if(k==='sort'){for(const [i,b] of ans)await clickData(page,'place',i,'b',b);if(shots&&tag&&n<6)await page.screenshot({path:`${shots}${tag}-${id}-sort.png`,fullPage:true});await page.click('#check-sort');}
  if(k==='mc'){await clickData(page,'pick',ans);await page.click('#check-mc');}
  const after=await page.evaluate(()=>window.__ll.state());assert.equal(after.posted,true,`${id} step ${s.i} (${k}) not accepted: `+await page.evaluate(()=>document.querySelector('.fb')?.textContent));
  await page.click('#next');}
 assert.ok(n<200);if(shots&&tag)await page.screenshot({path:`${shots}${tag}-${id}-done.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' overflow');
 await page.click('[data-view="home"]');}
async function run(viewport,tag,type){const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.evaluate(()=>window.__ll.reset());await page.evaluate(()=>window.__ll.unlock());if(shots&&tag)await page.screenshot({path:`${shots}${tag}-setup.png`,fullPage:true});
 await clickData(page,'type',type);await page.fill('#bname','Northside '+type);await page.click('#save-biz');
 const ids=(await page.evaluate(()=>LL.lessons.map(l=>l.id))).filter(id=>!only||only.includes(id));for(const id of ids)await play(page,id,tag);
 if(shots&&tag){await page.screenshot({path:`${shots}${tag}-dashboard.png`,fullPage:true});await page.click('[data-view="lib"]');await page.screenshot({path:`${shots}${tag}-library.png`,fullPage:true});}
 console.log(tag||type,'played',ids.length,'lessons:',ids.join(','));await page.close();}
await run({width:1360,height:900},'desk','photo');
await run({width:390,height:844},'mob','landscape');
await browser.close();console.log('errors',JSON.stringify(errors));assert.deepEqual(errors,[]);
