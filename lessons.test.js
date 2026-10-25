const test=require('node:test');
const assert=require('node:assert/strict');
const LL=require('./lessons-engine.js');
// Archived lesson content remains tested; active assignments use the simulation.
for(const f of ['lessons-unit1','lessons-build1','lessons-unit2','lessons-unit2b','lessons-build2','lessons-unit3','lessons-unit3b','lessons-build3','lessons-capstone'])require('./'+f);
const {V,linesOf,checkJE,post,bal,ACC,newLesson}=LL;
const rowsFor=ls=>ls.map(([a,s,x])=>({a,d:s==='dr'?String(x):'',c:s==='cr'?String(x):''}));
function combos(lesson){let out=[{}];const st0=newLesson(lesson,null);lesson.steps.filter(s=>s.k==='decide').forEach(s=>V(s.q,st0).forEach(q=>{out=out.flatMap(c=>q.opts.map(o=>({...c,[q.id]:o.v})));}));return out.slice(0,64);}
const tbBalanced=st=>{let D=0,C=0;for(const a in st.led){st.led[a].dr.forEach(e=>D+=e.x);st.led[a].cr.forEach(e=>C+=e.x);}return Math.round(D*100)===Math.round(C*100);};
function playLesson(lesson,choice,type){
 const st=newLesson(lesson,{type,name:'Test Co'});assert.ok(tbBalanced(st),lesson.id+' opening balances do not balance');
 lesson.steps.forEach((s,i)=>{if(s.skip&&s.skip(st))return;const where=`${lesson.id} step ${i} (${s.k}) ${JSON.stringify(choice)}`;
  for(const f of ['when','title','story','task','why','html','after','hint'])if(s[f]!=null){const t=V(s[f],st);assert.equal(typeof t,'string',where+' '+f);assert.doesNotMatch(t,/undefined|NaN|\[object/,where+' '+f);}
  if(s.k==='decide')V(s.q,st).forEach(q=>q.opts.forEach(o=>assert.doesNotMatch(o.t+' '+(o.d||''),/undefined|NaN/,where)));
  if(s.k==='decide'){V(s.q,st).forEach(q=>{st.ch[q.id]=choice[q.id];assert.ok(q.opts.some(o=>o.v===choice[q.id]),where);});if(s.forecast)V(s.forecast,st);if(s.onDone)s.onDone(st);}
  if(s.k==='je'){const ls=linesOf(s,st);assert.ok(ls.length>=2,where+' needs two lines');const known=new Set([...(lesson.accounts||[]),...Object.keys(st.led)]);ls.forEach(([a])=>{assert.ok(ACC[a],where+' '+a);assert.ok(known.has(a),where+' account not selectable: '+a);});
   assert.equal(checkJE(st,rowsFor(ls),ls).ok,true,where+' '+checkJE(st,rowsFor(ls),ls).text);post(st,ls,i);assert.ok(tbBalanced(st),where+' unbalanced');}
  if(s.k==='num')V(s.fields,st).forEach(f=>assert.ok(Number.isFinite(f.ans),where+' '+f.id));
  if(s.k==='sort'){const b=V(s.buckets,st);const items=V(s.items,st);assert.ok(items.length>=3,where);items.forEach(([id,label,a])=>{assert.ok(b.includes(a),where+' '+id);assert.equal(typeof label,'string');});assert.equal(new Set(items.map(x=>x[0])).size,items.length,where+' duplicate ids');}
  if(s.k==='mc'){const o=V(s.o,st);assert.ok(s.a>=0&&s.a<o.length,where);}
  if(s.onDone&&s.k!=='decide')s.onDone(st);
 });
 if(lesson.steps.some(s=>/^Close /.test(V(s.title,st)||''))){for(const a in st.led)if(['R','E','XR'].includes(ACC[a][1])||a==='div')assert.equal(bal(st,a),0,lesson.id+' did not close '+a);}
 if(lesson.report)assert.equal(typeof V(lesson.report,st),'string');if(lesson.recap)V(lesson.recap,st).forEach(r=>assert.equal(typeof r,'string'));
 assert.ok(bal(st,'cash')>=0,lesson.id+' cash negative');
 const graded=lesson.steps.filter(s=>!(s.skip&&s.skip(st))&&['je','num','mc','sort'].includes(s.k)).length;assert.ok(graded>=(lesson.cum?24:12),`${lesson.id} ${JSON.stringify(choice)} has only ${graded} graded tasks`);return st;}
test('library has lessons with required metadata',()=>{assert.ok(LL.lessons.length>=3);const ids=new Set();for(const l of LL.lessons){assert.ok(!ids.has(l.id));ids.add(l.id);for(const k of ['unit','n','t','mins','topics','blurb','summary','steps'])assert.ok(l[k],l.id+' '+k);}});
for(const lesson of LL.lessons)test(`${lesson.n} ${lesson.t}: every decision path and business type plays to a balanced finish`,()=>{
 combos(lesson).forEach(c=>Object.keys(LL.PROFILES).forEach(t=>playLesson(lesson,c,t)));});
test('journal feedback is specific',()=>{const st=newLesson({open:{}},null);const want=[['cash','dr',500],['rev','cr',500]];
 assert.match(checkJE(st,rowsFor([['rev','dr',500],['cash','cr',500]]),want).text,/wrong side/);
 assert.match(checkJE(st,rowsFor([['cash','dr',500],['ar','cr',500]]),want).text,/does not belong/);
 assert.match(checkJE(st,[{a:'cash',d:'500'},{a:'rev',c:'400'}],want).text,/must equal/);
 assert.match(checkJE(st,[{a:'cash',d:'400'},{a:'rev',c:'400'}],want).text,/amount is off/);
 assert.equal(checkJE(st,[{a:'cash',d:'$500.00'},{a:'rev',c:'500'},{a:'',d:'',c:''}],want).ok,true);});
