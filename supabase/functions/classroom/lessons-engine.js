// Ledger Lane lesson engine: the student's semester business, the chart of
// accounts, journal-entry checking, posting and grading. No DOM access here so
// every lesson can be verified in Node.
(function(root){
const ACC={
 cash:['Cash','A'],pettycash:['Petty Cash','A'],ar:['Accounts Receivable','A'],allow:['Allowance for Doubtful Accounts','XA'],nr:['Notes Receivable','A'],ir:['Interest Receivable','A'],
 supplies:['Supplies','A'],prepaidrent:['Prepaid Rent','A'],prepaidins:['Prepaid Insurance','A'],inv:['Inventory','A'],
 equip:['Equipment','A'],vehicle:['Vehicle','A'],building:['Building','A'],land:['Land','A'],adep:['Accumulated Depreciation','XA'],
 ap:['Accounts Payable','L'],wagespay:['Wages Payable','L'],salpay:['Salaries Payable','L'],intpay:['Interest Payable','L'],unearned:['Unearned Revenue','L'],
 ficapay:['FICA Taxes Payable','L'],fitpay:['Federal Income Tax Withheld','L'],utaxpay:['Unemployment Taxes Payable','L'],salestaxpay:['Sales Tax Payable','L'],
 warrpay:['Warranty Liability','L'],np:['Notes Payable','L'],divpay:['Dividends Payable','L'],taxpay:['Income Taxes Payable','L'],
 bonds:['Bonds Payable','L'],bprem:['Premium on Bonds Payable','L'],bdisc:['Discount on Bonds Payable','XL'],
 cs:['Common Stock','SE'],ps:['Preferred Stock','SE'],apic:['Additional Paid-in Capital, Common','SE'],apicp:['Additional Paid-in Capital, Preferred','SE'],
 re:['Retained Earnings','SE'],div:['Dividends','XSE'],treasury:['Treasury Stock','XSE'],
 rev:['Service Revenue','R'],sales:['Sales Revenue','R'],irev:['Interest Revenue','R'],gain:['Gain on Sale of Assets','R'],
 disc:['Sales Discounts','XR'],returns:['Sales Returns and Allowances','XR'],
 cogs:['Cost of Goods Sold','E'],wages:['Wages Expense','E'],salexp:['Salaries Expense','E'],ptaxexp:['Payroll Tax Expense','E'],rent:['Rent Expense','E'],
 suppliesexp:['Supplies Expense','E'],insexp:['Insurance Expense','E'],util:['Utilities Expense','E'],adv:['Advertising Expense','E'],repairs:['Repairs and Maintenance Expense','E'],
 depexp:['Depreciation Expense','E'],bde:['Bad Debt Expense','E'],intexp:['Interest Expense','E'],warrexp:['Warranty Expense','E'],misc:['Miscellaneous Expense','E'],
 cashos:['Cash Over and Short','E'],bankfee:['Bank Service Charges','E'],taxexp:['Income Tax Expense','E'],loss:['Loss on Sale of Assets','E'],delivexp:['Delivery Expense','E'],
 isum:['Income Summary','T']
};
const DEBIT_NORMAL=['A','E','XSE','XR','XL'];
const GROUPS=[['Assets',['A','XA']],['Liabilities',['L','XL']],['Stockholders\u2019 equity',['SE','XSE']],['Revenues and gains',['R','XR']],['Expenses and losses',['E']],['Closing',['T']]];
const PROFILES={
 bike:{type:'Bike repair shop',name:'Spoke & Sprocket',jobs:'repairs and tune-ups',job:'tune-up',client:'rider',clients:'riders',product:'e-bikes',productOne:'e-bike',vehicle:'service van',gear:'repair stands and tools',corp:'a fleet of local delivery businesses',icon:'#2563eb'},
 fitness:{type:'Fitness studio',name:'Peak Form Studio',jobs:'classes and personal training',job:'training package',client:'member',clients:'members',product:'smart rowing machines',productOne:'rowing machine',vehicle:'mobile training van',gear:'weights and studio equipment',corp:'a downtown law firm',icon:'#0f766e'},
 landscape:{type:'Landscaping company',name:'Greenline Landscaping',jobs:'lawn care and design projects',job:'yard project',client:'homeowner',clients:'homeowners',product:'patio planters',productOne:'planter',vehicle:'crew truck',gear:'mowers and trimmers',corp:'an apartment management company',icon:'#047857'},
 photo:{type:'Photography studio',name:'Golden Hour Studio',jobs:'portrait and event shoots',job:'photo shoot',client:'client',clients:'clients',product:'framed canvas prints',productOne:'canvas print',vehicle:'studio van',gear:'cameras and lighting',corp:'a regional wedding venue',icon:'#7c3aed'}
};
const r2=x=>Math.round(x*100)/100;
const num=v=>{const s=String(v??'').replace(/[$,\s]/g,'');if(s==='')return 0;const neg=/^\(.*\)$/.test(s);const n=+s.replace(/[()]/g,'');return isFinite(n)?(neg?-n:n):NaN;};
const money=(n,c)=>{const v=r2(n),neg=v<0,a=Math.abs(v);const s=c||a%1?a.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):a.toLocaleString('en-US');return (neg?'-':'')+'$'+s;};
const dn=id=>DEBIT_NORMAL.includes(ACC[id][1]);
const V=(x,st)=>typeof x==='function'?x(st,st.p):x;
function profile(saved){const base=PROFILES[saved&&saved.type]||PROFILES.bike;return {...base,key:saved&&PROFILES[saved.type]?saved.type:'bike',name:(saved&&saved.name||'').trim()||base.name,founder:(saved&&saved.founder||'').trim()||'you'};}
function newLesson(lesson,saved){
 const st={id:lesson.id,p:profile(saved),led:{},ch:{},i:0,first:0,graded:0,tries:0,posted:false,done:false,answers:{},journal:[]};
 Object.assign(st.ch,lesson.defaults||{});
 const open=V(lesson.open||{},st);for(const a in open)if(open[a]){ensure(st,a);st.led[a][dn(a)===(open[a]>0)?'dr':'cr'].push({x:Math.abs(open[a]),open:true});}
 return st;
}
function ensure(st,a){if(!ACC[a])throw new Error('Unknown account '+a);if(!st.led[a])st.led[a]={dr:[],cr:[]};}
const sum=l=>l.reduce((t,e)=>t+e.x,0);
function bal(st,a){const l=st.led[a];if(!l)return 0;const d=sum(l.dr),c=sum(l.cr);return r2(dn(a)?d-c:c-d);}
const total=(st,types)=>r2(Object.keys(st.led).filter(a=>types.includes(ACC[a][1])).reduce((t,a)=>t+bal(st,a),0));
const netIncome=st=>r2(total(st,['R'])-total(st,['XR'])-total(st,['E']));
function linesOf(step,st){return V(step.lines,st).filter(l=>Math.round(l[2]*100)!==0).map(([a,s,x])=>[a,s,r2(x)]);}
function checkJE(st,rows,want){
 const w={},net={};want.forEach(([a,s,x])=>w[a]=r2((w[a]||0)+(s==='dr'?x:-x)));
 const u=rows.map(r=>({a:r.a,d:num(r.d),c:num(r.c)})).filter(r=>r.a||r.d||r.c);
 if(u.some(r=>isNaN(r.d)||isNaN(r.c)))return {ok:false,text:'Enter amounts as numbers, for example 1250 or 1,250.00.'};
 if(!u.length)return {ok:false,text:'Enter the entry before you post it.'};
 if(u.some(r=>!r.a))return {ok:false,text:'Choose an account for every line that has an amount.'};
 if(u.some(r=>r.d&&r.c))return {ok:false,text:'Each line takes a debit <b>or</b> a credit, not both.'};
 if(u.some(r=>r.d<0||r.c<0))return {ok:false,text:'Amounts are always positive. The column shows the direction.'};
 if(u.some(r=>!r.d&&!r.c))return {ok:false,text:'One of your lines has an account but no amount.'};
 if(!u.some(r=>r.d)||!u.some(r=>r.c))return {ok:false,text:'Every entry needs at least one debit and one credit.'};
 const D=r2(u.reduce((t,r)=>t+r.d,0)),C=r2(u.reduce((t,r)=>t+r.c,0));
 if(D!==C)return {ok:false,text:`Total debits (${money(D)}) must equal total credits (${money(C)}).`};
 u.forEach(r=>net[r.a]=r2((net[r.a]||0)+r.d-r.c));
 const keys=[...new Set([...Object.keys(w),...Object.keys(net)])].filter(k=>(w[k]||0)||(net[k]||0));
 if(keys.every(k=>(net[k]||0)===(w[k]||0)))return {ok:true};
 const t=[];
 keys.forEach(k=>{const a=w[k]||0,n=net[k]||0,name=ACC[k][0];
  if(!a&&n)t.push(`<b>${name}</b> does not belong in this entry.`);
  else if(a&&!n)t.push(`An account is missing. Look for one more <b>${a>0?'debit':'credit'}</b>.`);
  else if(Math.sign(a)!==Math.sign(n))t.push(`<b>${name}</b> is on the wrong side. It is a ${dn(k)?'debit':'credit'}-balance account; think about whether this transaction increases or decreases it.`);
  else if(a!==n)t.push(`<b>${name}</b> is the right account, but the amount is off.`);});
 return {ok:false,text:[...new Set(t)].slice(0,2).join('<br>')};
}
function post(st,lines,tag){lines.forEach(([a,s,x])=>{ensure(st,a);st.led[a][s].push({x,tag});});st.journal.push({tag,lines});}
function close(st,tag){ // closing entries for the lesson's own ledger
 const L=[];let ni=0;Object.keys(st.led).forEach(a=>{const t=ACC[a][1],b=bal(st,a);if(!b)return;if(t==='R'){L.push([a,'dr',b]);ni+=b;}if(t==='XR'||t==='E'){L.push([a,'cr',b]);ni-=b;}});
 return L;
}
function checkNum(ans,given,tol){const g=num(given);if(String(given??'').trim()===''||isNaN(g))return false;return Math.abs(g-ans)<=(tol??0.5);}
function checkSort(items,placed){const wrong=[],missing=[];items.forEach(([id,,b])=>{if(!placed[id])missing.push(id);else if(placed[id]!==b)wrong.push(id);});return {wrong,missing};}
function stars(st){const pct=st.graded?st.first/st.graded:1;return pct>=.85?3:pct>=.6?2:1;}

const H={
 // Statement-style table: rows are [label, amount, flags] where flags may include 'in' (indent), 'tt' (total), 'q' (show ? instead of amount), 'h' (heading).
 table(title,sub,rows){return `<div class="stmt"><h4>${title}</h4>${sub?`<small>${sub}</small>`:''}<table>${rows.map(([l,v,f=''])=>`<tr class="${f}"><td>${l}</td><td>${f.includes('h')?'':f.includes('q')?'?':v==null?'':(v<0?'('+money(-v)+')':money(v))}</td></tr>`).join('')}</table></div>`;},
 // Trial balance from the lesson ledger; hide lets the student fill in totals.
 tb(st,title,opts={}){const rows=Object.keys(ACC).filter(a=>st.led[a]&&bal(st,a)&&ACC[a][1]!=='T');let D=0,C=0;
  const body=rows.map(a=>{const b=bal(st,a),d=dn(a)===(b>0);d?D+=Math.abs(b):C+=Math.abs(b);return `<tr><td>${ACC[a][0]}</td><td>${d?money(Math.abs(b)):''}</td><td>${d?'':money(Math.abs(b))}</td></tr>`;}).join('');
  return `<div class="stmt tbl"><h4>${st.p.name}</h4><small>${title}</small><table><tr class="hd"><td>Account</td><td>Debit</td><td>Credit</td></tr>${body}<tr class="tt"><td>Totals</td><td>${opts.hide?'?':money(D)}</td><td>${opts.hide?'?':money(C)}</td></tr></table></div>`;},
 tbTotals(st){let D=0;Object.keys(st.led).forEach(a=>{const b=bal(st,a);if(ACC[a][1]!=='T'&&dn(a)===(b>0))D+=Math.abs(b);});return r2(D);},
 je(o){return Object.assign({k:'je'},o);},
 closing(st){const rev=[],exp=[];Object.keys(st.led).forEach(a=>{const t=ACC[a][1],b=bal(st,a);if(!b)return;if(t==='R')rev.push([a,'dr',b]);if(t==='E'||t==='XR')exp.push([a,'cr',b]);});
  const R=r2(rev.reduce((t,l)=>t+l[2],0)),X=r2(exp.reduce((t,l)=>t+l[2],0));return {rev:[...rev,['re','cr',R]],exp:[['re','dr',X],...exp],div:bal(st,'div')?[['re','dr',bal(st,'div')],['div','cr',bal(st,'div')]]:[]};}
};

const api={H,ACC,GROUPS,PROFILES,DEBIT_NORMAL,r2,num,money,dn,V,profile,newLesson,ensure,bal,total,netIncome,linesOf,checkJE,post,close,checkNum,checkSort,stars,lessons:[]};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.LL=api;
})(typeof globalThis!=='undefined'?globalThis:this);
