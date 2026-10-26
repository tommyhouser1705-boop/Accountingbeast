const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
async function view(run, file = 'office.js', account = null, options = {}) {
  const nodes = new Map(), root = {innerHTML: '', classList: {add(){},remove(){}}};
  const node = key => {if(!nodes.has(key)){
    const n={dataset:{},classList:{add(){},remove(){}},textContent:'',innerHTML:'',focus(){document.activeElement=this;},showModal(){this.open=true;},close(){this.open=false;}};
    if(key==='#setup')Object.assign(n,{type:Object.assign([],{value:'bike'}),name:{value:'Lane Cycle'},founder:{value:'Jamie'},city:{value:'columbus'}});
    nodes.set(key,n);
  }return nodes.get(key);};
  const document = {body:{dataset:{}},querySelector(s){if(s==='#office'||s==='#app')return root;if(s.startsWith('#')&&[root,...nodes.values()].some(n=>n.innerHTML.includes(`id="${s.slice(1)}"`)))return node(s);return null;},querySelectorAll(s){
    const key = /^\[data-([a-z-]+)\]$/.exec(s)?.[1];if(!key)return [];
    return [...root.innerHTML.matchAll(new RegExp(`data-${key}(?:="([^"]+)")?(?=[\\s>])`,'g'))].map((m,i)=>{const n=node(key+':'+(m[1]||i));n.dataset[key]=m[1];return n;});
  }};
  root.querySelectorAll=s=>document.querySelectorAll(s);
  const storage=options.storage||new Map();
  const key='ll-office-v2'+(account?'-'+account.id+(options.search?.includes('preview')||account.role!=='student'?'-preview':''):'');
  if(!storage.has(key))storage.set(key,JSON.stringify({run,revision:0}));
  const ctx=vm.createContext({document,window:{LEDGER_CLOUD:{}},localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},CloudClient:class{constructor(){this.configured=!!account;this.session=account;}async call(action){return action==='office-load'?{revision:0,run}:action==='office-save'?{revision:1}:{user:account,classes:[],lessons:[]};}},URLSearchParams,location:{search:options.search||'',hash:'',replace(){}},innerWidth:options.width||1440,performance:{now:()=>0},requestAnimationFrame(){},setTimeout,console});
  for(const f of ['lessons-engine.js','sim-docs.js','sim-engine.js','sim-month1.js','sim-course.js','sim-replay.js',file])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx,{filename:f});
  await new Promise(resolve=>setImmediate(resolve));
  return {root,nodes,ctx,storage};
}
test('office renders real worksheet controls and finite statements across the entire course without a browser',async()=>{
  const config={type:'bike',name:'River Cycle',founder:'Alex Rivera',city:'columbus',seed:37};
  const init=await view({config,events:[]}),S=init.ctx.SIM,st=S.newGame(config),run={config,events:[]};let worksheets=0;
  for(let n=0;n<1000;n++){
    const it=S.open(st)[0];
    if(!it){if(S.advance(st).monthEnd){S.complete(st);run.events.push({kind:'complete'});if(!S.nextMonth(st))break;run.events.push({kind:'next'});}else run.events.push({kind:'advance'});continue;}
    if(it.kind==='work'){
      const v=await view(run);assert.match(v.root.innerHTML,/id="worksheet"/);assert.doesNotMatch(v.root.innerHTML,/undefined|NaN|\[object/);
      v.nodes.get('btab:statements').onclick();assert.match(v.root.innerHTML,/Income statement/);assert.doesNotMatch(v.root.innerHTML,/undefined|NaN|\[object/);worksheets++;
    }
    const want=S.want(st,it),action=it.kind==='decision'?{choice:Object.fromEntries(S.V(it.q,st).map(q=>[q.id,q.opts[0].v]))}:it.kind==='work'?{values:Object.fromEntries(S.V(it.fields,st).map(f=>[f.id,String(f.value)]))}:want?{rows:want.map(([a,side,x])=>({a,d:side==='dr'?String(x):'',c:side==='cr'?String(x):''}))}:{noEntry:true};
    assert.ok(S.handle(st,it.id,action).ok);run.events.push({kind:'handle',id:it.id,action});
  }
  assert.equal(worksheets,10);
});
test('library uses office links and only instructors receive assignment controls',async()=>{
  for(const role of [null,'student','professor']){
    const v=await view(null,'lessons.js',role?{id:'test',email:'test@example.edu',role}:null);
    assert.match(v.root.innerHTML,/office\.html\?lesson=ch2/);assert.doesNotMatch(v.root.innerHTML,/undefined|NaN/);
    assert.equal(v.root.innerHTML.includes('data-assign='),role==='professor');
  }
});

const newRun = () => ({config:{type:'bike',name:'Lane Cycle',founder:'Jamie',city:'columbus',seed:771},events:[]});
function finishOpenItems(S,st,run) {
  for(let n=0;S.open(st).length;n++) {
    assert.ok(n<100,'waiting items did not resolve');
    const it=S.open(st)[0],want=S.want(st,it);
    const action=it.kind==='decision'?{choice:Object.fromEntries(S.V(it.q,st).map(q=>[q.id,q.opts[0].v]))}:it.kind==='work'?{values:Object.fromEntries(S.V(it.fields,st).map(f=>[f.id,String(f.value)]))}:want?{rows:want.map(([a,side,x])=>({a,d:side==='dr'?String(x):'',c:side==='cr'?String(x):''}))}:{noEntry:true};
    assert.ok(S.handle(st,it.id,action).ok,it.id);
    run.events.push({kind:'handle',id:it.id,action});
  }
}

test('new students see the guide immediately after creating their business, not during setup',async()=>{
  const v=await view(null);
  assert.match(v.root.innerHTML,/Start your business/);
  assert.equal(v.nodes.has('#office-tour'),false);
  v.nodes.get('#setup').onsubmit({preventDefault(){}});
  assert.equal(v.nodes.get('#office-tour').open,true);
  assert.match(v.nodes.get('#office-tour').innerHTML,/Welcome to your office/);
  const saved=JSON.parse(v.storage.get('ll-office-v2')).run;
  assert.equal(saved.config.name,'Lane Cycle');
  assert.deepEqual(saved.events,[]);
});

test('first office visit teaches the complete loop without changing work; completion persists and help reopens',async()=>{
  const run=newRun(),v=await view(run),tour=v.nodes.get('#office-tour');
  const before=v.storage.get('ll-office-v2');
  assert.equal(tour.open,true);
  assert.match(tour.innerHTML,/Welcome to your office/);
  assert.equal(v.ctx.document.activeElement,v.nodes.get('#guide-title'));
  assert.match(v.root.innerHTML,/aria-labelledby="guide-title" aria-describedby="guide-description"/);
  assert.match(v.root.innerHTML,/Handle these items to end today/);
  assert.doesNotMatch(v.root.innerHTML,/id="day-ready-title"|data-next-day/);
  v.nodes.get('#guide-next').onclick();assert.match(tour.innerHTML,/Send reply/);
  v.nodes.get('#guide-next').onclick();assert.match(tour.innerHTML,/No entry needed/);
  v.nodes.get('#guide-next').onclick();assert.match(tour.innerHTML,/Close up for the day/);
  assert.match(tour.innerHTML,/doesn’t advance by itself/);
  v.nodes.get('#guide-back').onclick();assert.match(tour.innerHTML,/Post entry/);
  v.nodes.get('#guide-next').onclick();v.nodes.get('#guide-next').onclick();
  assert.equal(tour.open,false);
  assert.equal(v.storage.get('ll-office-v2-guide-v1'),'seen');
  assert.equal(v.storage.get('ll-office-v2'),before,'guide must not save business events or grades');
  assert.equal(v.ctx.document.activeElement,v.nodes.get('#office-guide'));
  const returning=await view(run,'office.js',null,{storage:v.storage});
  assert.notEqual(returning.nodes.get('#office-tour')?.open,true);
  returning.nodes.get('#office-guide').onclick();
  assert.equal(returning.nodes.get('#office-tour').open,true);
  assert.match(returning.nodes.get('#office-tour').innerHTML,/1 of 4/);
});

test('skipping or Escape dismisses the guide per account; previews only open it on request',async()=>{
  const run=newRun(),storage=new Map(),student={id:'student-one',role:'student'};
  const first=await view(run,'office.js',student,{storage});
  first.nodes.get('#guide-skip').onclick();
  assert.equal(storage.get('ll-office-v2-student-one-guide-v1'),'seen');
  const returning=await view(run,'office.js',student,{storage});
  assert.notEqual(returning.nodes.get('#office-tour')?.open,true);
  const second=await view(run,'office.js',{id:'student-two',role:'student'},{storage});
  let prevented=false;
  second.nodes.get('#office-tour').oncancel({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(second.nodes.get('#office-tour').open,false);
  assert.equal(storage.get('ll-office-v2-student-two-guide-v1'),'seen');
  const preview=await view(run,'office.js',{id:'prof',role:'professor'},{search:'?preview=1'});
  assert.notEqual(preview.nodes.get('#office-tour')?.open,true);
  preview.nodes.get('#office-guide').onclick();assert.equal(preview.nodes.get('#office-tour').open,true);
});

test('finishing the first day reveals a persistent next step; either close-day button advances exactly once',async()=>{
  const run=newRun(),base=await view(run),S=base.ctx.SIM,st=S.newGame(run.config);
  finishOpenItems(S,st,run);
  assert.equal(st.day,1);
  const next=S.nextDay(st),first=st.first,graded=st.graded;
  assert.notEqual(next,null);
  for(const button of [0,1]) {
    const v=await view(run,'office.js',null,{storage:new Map([['ll-office-v2-guide-v1','seen']])});
    assert.match(v.root.innerHTML,/class="os day-finished"/);
    assert.match(v.root.innerHTML,/Today’s work is finished/);
    assert.match(v.root.innerHTML,/receive new mail and paperwork/);
    assert.ok(v.root.innerHTML.includes('continue to '+S.fmtDate(st,next,'day')));
    assert.equal((v.root.innerHTML.match(/data-next-day/g)||[]).length,2);
    v.nodes.get('next-day:'+button).onclick();
    const saved=JSON.parse(v.storage.get('ll-office-v2')).run,after=v.ctx.SIM.replay(saved);
    assert.equal(saved.events.filter(e=>e.kind==='advance').length,1);
    assert.equal(after.day,next);
    assert.equal(after.first,first);assert.equal(after.graded,graded);
    assert.ok(v.ctx.SIM.open(after).length>0);
    assert.doesNotMatch(v.root.innerHTML,/id="day-ready-title"|data-next-day/);
    assert.match(v.root.innerHTML,/Handle these items to end today/);
  }
});

test('period end offers the report instead of a nonexistent next day, including the phone app layout',async()=>{
  const run=newRun(),base=await view(run),S=base.ctx.SIM,st=S.newGame(run.config);
  for(let n=0;n<40;n++) {
    finishOpenItems(S,st,run);
    if(S.nextDay(st)==null)break;
    assert.ok(S.advance(st).ok);run.events.push({kind:'advance'});
  }
  assert.equal(S.nextDay(st),null);
  const v=await view(run,'office.js',null,{width:390,storage:new Map([['ll-office-v2-guide-v1','seen']])});
  v.nodes.get('app:books').onclick();
  assert.match(v.root.innerHTML,/wins n2"><section class="win w-books"/);
  assert.match(v.root.innerHTML,/Finish this period/);
  assert.doesNotMatch(v.root.innerHTML,/data-next-day/);
  assert.equal((v.root.innerHTML.match(/data-finish-period/g)||[]).length,2);
  v.nodes.get('finish-period:0').onclick();
  assert.match(v.root.innerHTML,/Your bookkeeping/);
  assert.doesNotMatch(v.root.innerHTML,/id="day-ready-title"|data-finish-period/);
  const saved=JSON.parse(v.storage.get('ll-office-v2')).run;
  assert.equal(saved.events.at(-1).kind,'complete');
  assert.equal(v.ctx.SIM.replay(saved).ended,true);
});
