const {test} = require('node:test'), assert = require('node:assert/strict');
const L = require('./lesson-engine');
require('./lessons-engine'); require('./sim-engine'); require('./sim-month1'); require('./sim-course'); require('./sim-replay');
const C = require('./sim-cases'), S = global.SIM;
const config = {type:'bike',name:'River Cycle',founder:'Alex',city:'columbus',seed:23};
let draft;
async function definition() {
  if (draft) return structuredClone(draft);
  const {generateCourseAssignment} = await import('./supabase/functions/classroom/generator.mjs');
  const {topicDraft,scenarioDraft} = require('./test-fixtures/interactive-assignment.cjs');
  let n=0;
  draft = await generateCourseAssignment(L,{notes:'Supplies bought on account, supplier payments and month-end supplies counts.',year:2026,month:9,depth:'focused'}, {key:'test',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++n===1?topicDraft():scenarioDraft())}}]})})});
  return structuredClone(draft);
}
test('supplemental replies, dates and papers work for all four business identities without touching the course',async()=>{
  const a=await definition(); assert.equal(C.validate(a),true);
  const catalog=JSON.stringify(S.catalog), course=S.newGame(config), original=JSON.stringify(course);
  for(const type of ['bike','fitness','landscape','photo']) for(const pick of [0,1,2]) {
    const run={config:{...config,type},events:[]},st=C.start(a,run.config);
    assert.equal(st.biz.name,config.name); let n=0;
    while(!st.ended&&n++<100) {
      const it=S.open(st)[0]; let e;
      if(!it)e={kind:S.nextDay(st)==null?'complete':'advance'};
      else if(it.kind==='decision')e={kind:'handle',id:it.id,action:{choice:Object.fromEntries(S.V(it.q,st).map(q=>[q.id,q.opts[Math.min(pick,q.opts.length-1)].v]))}};
      else {const w=S.want(st,it);e={kind:'handle',id:it.id,action:w?{rows:w.map(([a,s,v])=>({a,d:s==='dr'?v:0,c:s==='cr'?v:0}))}:{noEntry:true}};}
      assert.equal(C.apply(st,e).ok,true); run.events.push(e);
    }
    assert.equal(st.ended,true); assert.equal(S.summary(st).score,100);
    assert.equal(S.summary(C.replay(a,run)).score,100);
    const tb=S.trialBalance(st); assert.ok(Math.abs(tb.reduce((v,r)=>v+r[2]-r[3],0))<.01);
    assert.equal(S.nextMonth(st),false);
    const publicSt=C.publicState(st);assert.equal(publicSt.caseChoices,undefined);assert.equal(publicSt.paper,undefined);
    assert.ok(publicSt.casePeriod.items.every(x=>!x.lines));
  }
  assert.equal(JSON.stringify(S.catalog),catalog);assert.equal(JSON.stringify(course),original);
});
test('unsupported accounting keys and incomplete cases cannot be published or skipped',async()=>{
  const a=await definition(),bad=structuredClone(a);bad.blueprint.accounts[0].name='Made up asset';
  assert.throws(()=>C.validate(bad));
  const st=C.start(a,config);assert.throws(()=>C.apply(st,{kind:'complete'}));
  assert.throws(()=>C.apply(st,{kind:'next'}));
  assert.throws(()=>C.apply(st,{kind:'handle',id:'supplies-invoice',action:{noEntry:true}}));
  assert.throws(()=>C.replay(a,{config:{...config,name:'<script>'},events:[]}));
});
module.exports={definition};
