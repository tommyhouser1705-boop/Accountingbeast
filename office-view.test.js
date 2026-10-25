const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
async function view(run, file = 'office.js', account = null) {
  const nodes = new Map(), root = {innerHTML: '', classList: {add(){},remove(){}}};
  const node = key => {if(!nodes.has(key))nodes.set(key,{dataset:{},classList:{add(){},remove(){}},textContent:''});return nodes.get(key);};
  const document = {body:{dataset:{}},querySelector(s){if(s==='#office'||s==='#app')return root;if(s.startsWith('#')&&root.innerHTML.includes(`id="${s.slice(1)}"`))return node(s);return null;},querySelectorAll(s){
    const key = /^\[data-(app|snap|btab|filter|assign|mail|rec)\]$/.exec(s)?.[1];if(!key)return [];
    return [...root.innerHTML.matchAll(new RegExp(`data-${key}="([^"]+)"`,'g'))].map(m=>{const n=node(key+':'+m[1]);n.dataset[key]=m[1];return n;});
  }};
  root.querySelectorAll=s=>document.querySelectorAll(s);
  const ctx=vm.createContext({document,window:{LEDGER_CLOUD:{}},localStorage:{getItem(k){return k==='ll-office-v2'?JSON.stringify({run,revision:0}):null;},setItem(){}},CloudClient:class{constructor(){this.configured=!!account;this.session=account;}async call(){return {user:account,classes:[],lessons:[]};}},URLSearchParams,location:{search:'',hash:'',replace(){}},innerWidth:1440,performance:{now:()=>0},requestAnimationFrame(){},setTimeout,console});
  for(const f of ['lessons-engine.js','sim-docs.js','sim-engine.js','sim-month1.js','sim-course.js','sim-replay.js',file])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx,{filename:f});
  await new Promise(resolve=>setImmediate(resolve));
  return {root,nodes,ctx};
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
