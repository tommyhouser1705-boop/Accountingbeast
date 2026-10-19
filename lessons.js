// Ledger Lane lessons UI: student semester dashboard, instructor library and lesson player.
(function(){
const {ACC,GROUPS,PROFILES,money,num,V,bal,total,netIncome,linesOf,checkJE,post,checkNum,checkSort,stars,newLesson,profile,dn}=LL;
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem('ll-'+k));return v??d;}catch{return d;}},set(k,v){try{localStorage.setItem('ll-'+k,JSON.stringify(v));}catch{}},del(k){try{localStorage.removeItem('ll-'+k);}catch{}}};
let biz=store.get('biz',null),progress=store.get('progress',{}),assigned=new Set(store.get('assigned',[]));
let view='home',filt='all',L=null,S=null,ui={};
const LC=typeof CloudClient!=='undefined'?new CloudClient(window.LEDGER_CLOUD||{}):null;let acct=null,acctClasses=[],acctLessons=[];
const isAssigned=id=>acct?acctLessons.some(a=>a.lessonId===id):assigned.has(id);
async function cloudBoot(){if(!LC||!LC.configured||!LC.session)return;try{const r=await LC.call('bootstrap');acct=r.user;acctClasses=r.classes||[];acctLessons=r.lessons||[];if(view!=='play')render();}catch{}}
const lessonById=id=>LL.lessons.find(l=>l.id===id);
const isGraded=s=>['je','num','mc','sort'].includes(s.k);
const steps=()=>L.steps;
const stepNow=()=>steps()[S.i];

/* ---------- shell ---------- */
function top(){
 const tab=(v,t)=>`<button data-view="${v}" class="${view===v||(v==='home'&&view==='play')?'on':''}">${t}</button>`;
 return `<header class="top"><a class="logo" href="index.html"><i>LL</i>Ledger Lane</a><nav class="tabs">${tab('home','My business')}${tab('lib','Instructor library')}</nav>${acct?`<a class="btn alt homelink" href="index.html">${acct.role==='student'?'My classroom':'Instructor home'}</a>`:''}${biz?`<div class="bizchip"><span style="background:${profile(biz).icon}"></span>${esc(profile(biz).name)}</div>`:''}</header>`;
}
function render(){
 if(view==='lib')app.innerHTML=top()+library();
 else if(view==='play')return play();
 else app.innerHTML=top()+(biz?dashboard():setup());
}
function go(v){view=v;render();scrollTo(0,0);}

/* ---------- business setup ---------- */
function setup(edit){
 const d=ui.draft||(ui.draft={type:biz?.type||'bike',name:biz?.name||'',founder:biz?.founder||''});
 return `<main class="wrap narrow"><section class="hero solo"><div><div class="kick">START OF SEMESTER</div><h1>Create the business you will run all semester.</h1><p>Every lesson in this course happens inside your business. You make the operating decisions, then record and report them. Your business grows as the course goes on: you'll add a product line, buy equipment, hire staff, borrow, and raise capital from investors.</p></div></section>
 <div class="card setup"><div class="qlabel">1 · WHAT KIND OF BUSINESS?</div><div class="choices four">${Object.entries(PROFILES).map(([k,p])=>`<button class="ch ${d.type===k?'on':''}" data-type="${k}"><span class="dot" style="background:${p.icon}"></span><b>${p.type}</b><span>Earn revenue from ${p.jobs}. Later, sell ${p.product}.</span></button>`).join('')}</div>
 <div class="qlabel">2 · NAME YOUR BUSINESS</div><div class="fields"><label>Business name<input id="bname" maxlength="40" placeholder="${esc(PROFILES[d.type].name)}" value="${esc(d.name)}"></label><label>Your first name (optional)<input id="fname" maxlength="30" value="${esc(d.founder)}"></label></div>
 <p class="note">Your business is set up as a corporation. You and a few early investors own its common stock, which is the model used throughout this course.</p>
 <div class="row"><button class="btn big" id="save-biz">${edit?'Save changes':'Open my business'}</button>${edit?'<button class="btn big alt" id="cancel-biz">Cancel</button>':''}</div></div></main>`;
}

/* ---------- student dashboard ---------- */
function units(){const out=[];LL.lessons.forEach(l=>{let u=out.find(x=>x.name===l.unit);if(!u)out.push(u={name:l.unit,ls:[]});u.ls.push(l);});return out;}
function statusOf(l){const p=progress[l.id],cur=store.get('cur-'+l.id,null);if(p&&p.done)return {k:'done',t:'Complete',p};if(cur)return {k:'go',t:`In progress · ${Math.round(100*cur.i/l.steps.length)}%`,pct:cur.i/l.steps.length};return {k:'new',t:'Not started'};}
function dashboard(){
 const p=profile(biz),done=LL.lessons.filter(l=>progress[l.id]?.done).length,next=LL.lessons.find(l=>!progress[l.id]?.done);
 const starsTotal=LL.lessons.reduce((t,l)=>t+(progress[l.id]?.stars||0),0);
 let h=`<main class="wrap"><section class="hero biz"><div class="bizmark" style="background:${p.icon}">${esc(p.name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div><div><div class="kick">${esc(p.type.toUpperCase())} · FOUNDED BY ${esc(p.founder==='you'?'YOU':p.founder.toUpperCase())}</div><h1>${esc(p.name)}</h1><p>${next?`Up next: <b>${esc(next.n)} · ${esc(next.t)}</b>. ${esc(V(next.blurb,{p}))}`:'You have completed every lesson this semester.'}</p><div class="row">${next?`<button class="btn big" data-start="${next.id}">${statusOf(next).k==='go'?'Continue':'Start'} ${esc(next.n)}</button>`:''}<button class="link" id="edit-biz">Edit business</button></div></div>
 <div class="stats"><div class="stat"><b>${done}/${LL.lessons.length}</b><small>lessons complete</small></div><div class="stat"><b>${starsTotal}</b><small>stars earned</small></div></div></section>`;
 units().forEach(u=>{h+=`<div class="unit">${esc(u.name)}</div><div class="grid">`;u.ls.forEach(l=>{const s=statusOf(l);
  h+=`<article class="lc ${l.cum?'cum':''} ${l.final?'final':''} st-${s.k}"><div class="band"></div><div class="num">${esc(l.n)}${l.cum?' · CUMULATIVE':''}</div><h3>${esc(l.t)}</h3><p class="what">${esc(V(l.blurb,{p}))}</p><div class="chips">${l.topics.map(c=>`<span>${esc(c)}</span>`).join('')}</div>
  <div class="prog"><div style="width:${s.k==='done'?100:Math.round((s.pct||0)*100)}%"></div></div><div class="meta"><span>${esc(l.mins)} min</span><span class="${s.k}">${s.k==='done'?'★'.repeat(s.p.stars)+'☆'.repeat(3-s.p.stars)+' Complete':esc(s.t)}</span></div>
  <div class="acts"><button class="btn ${s.k==='done'?'alt':''}" data-start="${l.id}">${s.k==='done'?'Replay':s.k==='go'?'Continue':'Start'}</button></div></article>`;});h+='</div>';});
 return h+'</main>';
}

/* ---------- instructor library ---------- */
function library(){
 const show=l=>filt==='all'||(filt==='ch'&&!l.cum)||(filt==='cum'&&l.cum);
 const chs=LL.lessons.filter(l=>!l.cum).length,cums=LL.lessons.filter(l=>l.cum).length;
 let h=`<main class="wrap"><section class="hero"><div><div class="kick">PREBUILT COURSE · FINANCIAL ACCOUNTING</div><h1>A semester of lessons where each student <span>runs a business</span>.</h1><p>Students create their own business in Chapter 1 and run it through the entire course. In every lesson they make operating decisions, then journalize, adjust and report the results. Answer keys, targeted feedback and grading are built in.</p></div>
 <div class="stats"><div class="stat"><b>${chs}</b><small>chapter lessons</small></div><div class="stat"><b>${cums}</b><small>cumulative reviews</small></div><div class="stat"><b>20–30</b><small>minutes per lesson</small></div></div></section>
 <div class="filters">${[['all','All lessons'],['ch','Chapter lessons'],['cum','Cumulative reviews']].map(([k,t])=>`<button data-f="${k}" class="${filt===k?'on':''}">${t}</button>`).join('')}</div>`;
 units().forEach(u=>{const ls=u.ls.filter(show);if(!ls.length)return;h+=`<div class="unit">${esc(u.name)}</div><div class="grid">`;
  ls.forEach(l=>{const tasks=l.steps.filter(isGraded).length,jes=l.steps.filter(s=>s.k==='je').length;
   h+=`<article class="lc ${l.cum?'cum':''} ${l.final?'final':''} ${assigned.has(l.id)?'assigned':''}"><div class="band"></div><div class="num">${esc(l.n)}${l.cum?' · CUMULATIVE':''}</div><h3>${esc(l.t)}</h3><p class="what">${esc(l.summary)}</p><div class="chips">${l.topics.map(c=>`<span>${esc(c)}</span>`).join('')}</div>
   <div class="meta"><span>${esc(l.mins)} min</span><span>${tasks} graded tasks</span>${jes?`<span>${jes} journal entries</span>`:''}</div>
   <div class="acts"><button class="btn alt" data-preview="${l.id}">Preview</button><button class="btn" data-assign="${l.id}">${isAssigned(l.id)?'Assigned ✓':'Assign'}</button></div></article>`;});h+='</div>';});
 return h+'</main>';
}
function assignModal(id){const l=lessonById(id),m=document.createElement('div'),live=!!acct&&acct.role!=='student';m.className='modal';
 const classes=live?acctClasses:[{id:'demo1',name:'ACCT 203 · Section 01'},{id:'demo2',name:'ACCT 203 · Section 02'}];
 m.innerHTML=`<div class="sheet" role="dialog" aria-label="Assign lesson"><h3>Assign ${esc(l.n)}: ${esc(l.t)}</h3><p class="note">Students complete it inside their own business. Grading uses first-attempt accuracy.${live?'':' This is a preview. Sign in as an instructor to assign lessons to a real class.'}</p>${classes.length?`<label>Class<select id="as-class">${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Due date<input id="as-due" type="date" value="${new Date(Date.now()+7*864e5).toISOString().slice(0,10)}"></label>`:'<p class="note">Create a class on your instructor home first.</p>'}<p class="note" id="as-msg" role="status"></p><div class="row">${classes.length?'<button class="btn" id="ok">Assign</button>':'<a class="btn" href="index.html">Instructor home</a>'}<button class="btn alt" id="no">Cancel</button></div></div>`;
 document.body.append(m);m.querySelector('#no').onclick=()=>m.remove();const ok=m.querySelector('#ok');if(!ok)return;
 ok.onclick=async()=>{const cls=classes.find(c=>c.id===m.querySelector('#as-class').value),due=m.querySelector('#as-due').value;
  if(!live){assigned.add(id);store.set('assigned',[...assigned]);m.remove();render();toast(`${l.n} assigned to ${cls.name}`);return;}
  ok.disabled=true;try{const a=await LC.call('lesson-assign',{classId:cls.id,lessonId:id,title:`${l.n}: ${l.t}`,dueDate:due});acctLessons=acctLessons.filter(x=>x.id!==a.id).concat([{...a.definition,id:a.id,class_id:cls.id}]);m.remove();render();toast(`${l.n} assigned to ${cls.name}`);}catch(e){ok.disabled=false;m.querySelector('#as-msg').textContent=e.message||'The lesson could not be assigned. Please try again.';}};}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2400);}

/* ---------- lesson player ---------- */
function start(id,preview){L=lessonById(id);const saved=!preview&&store.get('cur-'+id,null);
 S=newLesson(L,preview&&!biz?null:biz);if(saved){Object.assign(S,saved,{p:S.p});}S.preview=!!preview;resetStep();view='play';play();scrollTo(0,0);}
function save(){if(!S.preview){const {p,...rest}=S;store.set('cur-'+L.id,rest);}}
function resetStep(){ui.rows=null;ui.msg=null;ui.vals={};ui.bad=[];ui.pick=null;ui.placed={};}
function hud(){
 const p=S.p,ni=netIncome(S),assets=total(S,['A'])-total(S,['XA']),liab=total(S,['L'])-total(S,['XL']);
 const m=(l,v)=>`<div class="meter"><small>${l}</small><b>${v}</b></div>`;
 return `<div class="hud"><button class="back" data-view="${S.preview?'lib':'home'}" aria-label="Back">←</button><div class="shop"><div class="bizmark sm" style="background:${p.icon}">${esc(p.name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div><div><b>${esc(p.name)}</b><small>${esc(L.n)} · ${esc(L.t)}${S.preview?' · Instructor preview':''}</small></div></div>${m('CASH',money(bal(S,'cash')))}${m('TOTAL ASSETS',money(assets))}${m('LIABILITIES',money(liab))}${m('NET INCOME',money(ni))}</div>`;
}
function rail(){const n=steps().length,cur=S.done?n:S.i;
 const secs=[];steps().forEach((s,j)=>{const sec=s.sec||'';let x=secs[secs.length-1];if(!x||x.name!==sec)secs.push(x={name:sec,from:j,to:j});x.to=j;});
 return `<aside class="path"><h4>LESSON PROGRESS</h4><div class="pbar"><div style="width:${Math.round(100*cur/n)}%"></div></div><small class="pct">${cur} of ${n} steps</small>${secs.map(x=>`<div class="node ${cur>x.to?'done':cur>=x.from?'now':''}"><i>${cur>x.to?'✓':''}</i><span>${esc(x.name)}</span></div>`).join('')}</aside>`;}
function tacct(a){const l=S.led[a],n=Math.max(l.dr.length,l.cr.length,1);let r='';for(let j=0;j<n;j++)r+=`<div class="lr"><span class="${l.dr[j]?.open?'ob':''}">${l.dr[j]?money(l.dr[j].x):''}</span><span class="${l.cr[j]?.open?'ob':''}">${l.cr[j]?money(l.cr[j].x):''}</span></div>`;
 return `<div class="t ${ui.flash?.includes(a)?'hit':''}"><b>${ACC[a][0]}</b>${r}<div class="bal">${money(bal(S,a))}</div></div>`;}
function side(){const st=stepNow(),used=Object.keys(ACC).filter(a=>S.led[a]&&(S.led[a].dr.length||S.led[a].cr.length)&&ACC[a][1]!=='T');
 const A=total(S,['A'])-total(S,['XA']),Li=total(S,['L'])-total(S,['XL']),E=total(S,['SE'])-total(S,['XSE'])+netIncome(S);
 return `<aside class="side"><div class="panel"><h4>ACCOUNTING EQUATION</h4><div class="eq"><div><small>ASSETS</small><b>${money(A)}</b></div><i>=</i><div><small>LIABILITIES</small><b>${money(Li)}</b></div><i>+</i><div><small>EQUITY</small><b>${money(E)}</b></div></div></div>
 ${!S.done&&st&&st.why&&S.posted?`<div class="panel why"><h4>WHY IT WORKS</h4><div class="tip">${V(st.why,S)}</div></div>`:''}
 <div class="panel"><h4>GENERAL LEDGER · T ACCOUNTS</h4>${used.length?`<div class="ts">${used.map(tacct).join('')}</div><div class="tip small">Gray amounts are opening balances.</div>`:'<div class="tip">Your entries post here after you record them.</div>'}</div></aside>`;}
function acctOptions(sel){const list=[...new Set([...(L.accounts||[]),...Object.keys(S.led)])].filter(a=>ACC[a]);
 return '<option value="">Choose account…</option>'+GROUPS.map(([g,t])=>{const o=list.filter(a=>t.includes(ACC[a][1]));return o.length?`<optgroup label="${g}">${o.sort((a,b)=>ACC[a][0].localeCompare(ACC[b][0])).map(a=>`<option value="${a}" ${a===sel?'selected':''}>${ACC[a][0]}</option>`).join('')}</optgroup>`:'';}).join('');}
function totalsHTML(){const D=ui.rows.reduce((t,r)=>t+(num(r.d)||0),0),C=ui.rows.reduce((t,r)=>t+(num(r.c)||0),0),ok=D&&Math.round(D*100)===Math.round(C*100);
 return `<span>Debits ${money(D)}</span><span>Credits ${money(C)}</span><span class="${ok?'ok':'no'}">${ok?'Balanced':'Not balanced'}</span>`;}
function jeBox(st){if(!ui.rows)ui.rows=[{a:'',d:'',c:''},{a:'',d:'',c:''}];const date=V(st.date||st.when,S);
 return `<div class="je" role="group" aria-label="General journal"><div class="je-h"><span>DATE</span><span>ACCOUNT</span><span>DEBIT</span><span>CREDIT</span><span></span></div>
 ${ui.rows.map((r,j)=>`<div class="je-r ${num(r.c)&&!num(r.d)?'cr':''}" data-j="${j}"><span class="d">${j?'':esc(date)}</span><select id="a-${j}" data-f="a" aria-label="Account, line ${j+1}">${acctOptions(r.a)}</select><input id="d-${j}" data-f="d" inputmode="decimal" placeholder="Debit" aria-label="Debit, line ${j+1}" value="${esc(r.d)}"><input id="c-${j}" data-f="c" inputmode="decimal" placeholder="Credit" aria-label="Credit, line ${j+1}" value="${esc(r.c)}"><button class="x" data-del="${j}" aria-label="Remove line ${j+1}">×</button></div>`).join('')}
 <div class="expl">${esc(V(st.memo||st.task,S))}</div><div class="je-f"><button class="add" id="add-line">+ Add line</button><div class="tot">${totalsHTML()}</div></div></div>`;}
function fb(){return ui.msg?`<div class="fb ${ui.msg.ok?'ok':'bad'}">${ui.msg.text}</div>`:'';}
function showAnswer(){return S.tries>=2&&!S.posted?'<button class="link" id="reveal">Show me the answer</button>':'';}
function cont(label){return `<div class="row"><button class="btn big go" id="next">${label||(S.i===steps().length-1?'Finish lesson':'Continue')} →</button></div>`;}
function body(st){
 const after=S.posted?`<div class="fb ok">${st.k==='je'?'Posted to the ledger.':'Correct.'} ${S.tries?'':'First try.'} ${st.after?V(st.after,S):''}</div>${cont()}`:'';
 if(st.k==='info')return `${st.html?V(st.html,S):''}${cont(st.cta)}`;
 if(st.k==='decide'){const fc=st.forecast?V(st.forecast,S):null;
  return `${(V(st.q,S)).map((q,qi)=>`<div class="qlabel">${qi+1} · ${esc(q.label)}</div><div class="choices ${q.opts.length===4?'four':''}">${q.opts.map(o=>{const off=o.locked&&o.locked(S);return `<button class="ch ${S.ch[q.id]===o.v?'on':''}" data-q="${q.id}" data-v="${esc(o.v)}" ${off?'disabled':''}><b>${esc(V(o.t,S))}</b><span>${V(o.d,S)}</span>${off?`<em>${esc(off)}</em>`:''}</button>`;}).join('')}</div>`).join('')}
  ${fc?`<div class="forecast">${fc.map(([l,v,c])=>`<div><small>${esc(l)}</small><b class="${c||''}">${v}</b></div>`).join('')}</div>`:''}<div class="row"><button class="btn big" id="decide">Confirm decision</button></div>`;}
 if(st.k==='je')return `<div class="task"><b>Your task:</b> ${V(st.task,S)}</div>${st.html?V(st.html,S):''}${S.posted?after:`${jeBox(st)}${fb()}<div class="row"><button class="btn big" id="post">Post entry</button>${showAnswer()}</div>`}`;
 if(st.k==='num'){const fs=V(st.fields,S);
  return `${st.task?`<div class="task"><b>Your task:</b> ${V(st.task,S)}</div>`:''}${st.html?V(st.html,S):''}<div class="nums">${fs.map(f=>`<label class="${ui.bad.includes(f.id)?'bad':''} ${S.posted?'okf':''}"><span>${f.label}</span><div class="inp">${f.pct?'':'<i>$</i>'}<input id="n-${f.id}" data-n="${f.id}" inputmode="decimal" value="${esc(S.posted?fmtAns(f):ui.vals[f.id]??'')}" ${S.posted?'disabled':''}>${f.pct?'<i>'+f.pct+'</i>':''}</div></label>`).join('')}</div>${S.posted?after:`${fb()}<div class="row"><button class="btn big" id="check-num">Check</button>${showAnswer()}</div>`}`;}
 if(st.k==='mc'){const o=V(st.o,S);return `<div class="task"><b>${V(st.q,S)}</b></div><div class="mc">${o.map((t,j)=>`<button class="ch ${ui.pick===j?'on':''} ${S.posted&&j===st.a?'right':''}" data-pick="${j}" ${S.posted?'disabled':''}><b>${t}</b></button>`).join('')}</div>${S.posted?after:`${fb()}<div class="row"><button class="btn big" id="check-mc">Check answer</button></div>`}`;}
 if(st.k==='sort'){const items=V(st.items,S),b=V(st.buckets,S);
  return `<div class="task"><b>Your task:</b> ${V(st.task,S)}</div><div class="sort">${items.map(([id,label,ans])=>{const p=S.posted?ans:ui.placed[id];return `<div class="srow ${ui.bad.includes(id)?'bad':''}"><span>${label}</span><div class="seg">${b.map(x=>`<button data-place="${id}" data-b="${esc(x)}" class="${p===x?'on':''}" ${S.posted?'disabled':''}>${esc(x)}</button>`).join('')}</div></div>`;}).join('')}</div>${S.posted?after:`${fb()}<div class="row"><button class="btn big" id="check-sort">Check</button>${showAnswer()}</div>`}`;}
 return '';
}
const fmtAns=f=>f.pct?String(f.ans):money(f.ans).replace('$','');
function play(){if(S.done)return results();const st=stepNow();
 app.innerHTML=top()+hud()+`<div class="stage">${rail()}<div class="main"><section class="ev ${ui.shown!==S.i?'pop':''}"><div class="ev-top"><small>${esc(V(st.when,S)||'')}</small><h2>${esc(V(st.title,S))}</h2>${st.story?`<p>${V(st.story,S)}</p>`:''}</div><div class="ev-body">${body(st)}</div></section></div>${side()}</div>`;
 ui.flash=[];ui.shown=S.i;}
function grade(ok,msg){const st=stepNow();if(ok){if(!S.tries)S.first++;S.graded++;S.posted=true;ui.msg=null;if(st.k==='je'){const ls=linesOf(st,S);post(S,ls,S.i);ui.flash=ls.map(l=>l[0]);}if(st.onDone)st.onDone(S);save();}else{S.tries++;ui.msg={ok:false,text:msg};}play();}
function next(){S.i++;while(S.i<steps().length&&steps()[S.i].skip&&steps()[S.i].skip(S))S.i++;S.tries=0;S.posted=false;resetStep();if(S.i>=steps().length)finish();save();play();scrollTo(0,0);}
function finish(){S.done=true;if(!S.preview){const prev=progress[L.id]||{};const s=stars(S);progress[L.id]={done:true,stars:Math.max(prev.stars||0,s),first:S.first,graded:S.graded};store.set('progress',progress);store.del('cur-'+L.id);if(acct&&acct.role==='student')LC.call('lesson-score',{lessonId:L.id,first:S.first,graded:S.graded,stars:s}).then(r=>{if(r&&r.saved)toast('Score sent to your class gradebook');}).catch(()=>{});}}
function results(){const s=stars(S),recap=L.recap?V(L.recap,S):[];const nextL=LL.lessons[LL.lessons.indexOf(L)+1];
 app.innerHTML=top()+hud()+`<div class="stage">${rail()}<div class="main"><section class="ev"><div class="win"><div class="stars" aria-label="${s} of 3 stars">${[1,2,3].map(n=>`<span class="${n<=s?'s':''}">★</span>`).join('')}</div><h2>${esc(L.n)} complete</h2><p class="score">${S.first} of ${S.graded} tasks correct on the first attempt (${Math.round(100*S.first/Math.max(1,S.graded))}%)</p>
 ${L.report?`<div class="res">${V(L.report,S)}</div>`:''}${recap.length?`<div class="recap"><b>How your decisions played out</b><ul>${recap.map(r=>`<li>${r}</li>`).join('')}</ul></div>`:''}
 <div class="row center">${!S.preview&&nextL?`<button class="btn big" data-start="${nextL.id}">Next: ${esc(nextL.n)}</button>`:''}<button class="btn big alt" data-view="${S.preview?'lib':'home'}">${S.preview?'Back to library':'Back to my business'}</button><button class="link" id="replay">Replay this lesson</button></div></div></section></div>${side()}</div>`;}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
 if(d.view){ui.draft=null;return go(d.view);}
 if(d.f){filt=d.f;return render();}
 if(d.assign)return assignModal(d.assign);
 if(d.preview)return start(d.preview,true);
 if(d.start){if(!biz){view='home';return render();}return start(d.start,false);}
 if(d.type){ui.draft.type=d.type;ui.draft.name=$('#bname').value;ui.draft.founder=$('#fname').value;return render();}
 if(b.id==='save-biz'){biz={type:ui.draft.type,name:$('#bname').value.trim(),founder:$('#fname').value.trim()};store.set('biz',biz);ui.draft=null;ui.editing=false;return render();}
 if(b.id==='edit-biz'){ui.draft=null;app.innerHTML=top()+setup(true);return;}
 if(b.id==='cancel-biz'){ui.draft=null;return render();}
 if(view!=='play')return;
 const st=stepNow();
 if(d.q){S.ch[d.q]=isNaN(+d.v)||d.v===''?d.v:+d.v;return play();}
 if(b.id==='decide'){const qs=V(st.q,S);if(qs.some(q=>S.ch[q.id]==null||q.opts.find(o=>o.v===S.ch[q.id])?.locked?.(S))){ui.msg={text:'Make a choice for each question.'};return play();}S.decisions=S.decisions||[];if(st.onDone)st.onDone(S);return next();}
 if(d.del!=null){ui.rows.splice(+d.del,1);while(ui.rows.length<2)ui.rows.push({a:'',d:'',c:''});return play();}
 if(b.id==='add-line'){ui.rows.push({a:'',d:'',c:''});return play();}
 if(b.id==='post'){const r=checkJE(S,ui.rows,linesOf(st,S));return grade(r.ok,r.text);}
 if(d.pick!=null){ui.pick=+d.pick;return play();}
 if(b.id==='check-mc'){if(ui.pick==null)return;return grade(ui.pick===st.a,V(st.hint,S)?`Not quite. ${V(st.hint,S)}`:'Not quite. Reread the situation and try again.');}
 if(b.id==='check-num'){document.querySelectorAll('[data-n]').forEach(i=>ui.vals[i.dataset.n]=i.value);const fs=V(st.fields,S);ui.bad=fs.filter(f=>!checkNum(f.ans,ui.vals[f.id],f.tol)).map(f=>f.id);
  return grade(!ui.bad.length,fs.filter(f=>ui.bad.includes(f.id)).map(f=>f.hint?`<b>${f.label}:</b> ${V(f.hint,S)}`:`Check <b>${f.label}</b>.`).slice(0,3).join('<br>'));}
 if(d.place){ui.placed[d.place]=d.b;ui.bad=ui.bad.filter(x=>x!==d.place);return play();}
 if(b.id==='check-sort'){const r=checkSort(V(st.items,S),ui.placed);if(r.missing.length){ui.msg={text:'Place every item before you check.'};return play();}ui.bad=r.wrong;return grade(!r.wrong.length,`${r.wrong.length} of ${V(st.items,S).length} are in the wrong place. They are highlighted.${st.hint?' '+V(st.hint,S):''}`);}
 if(b.id==='reveal'){if(st.k==='je')ui.rows=linesOf(st,S).map(([a,s,x])=>({a,d:s==='dr'?String(x):'',c:s==='cr'?String(x):''}));if(st.k==='num')V(st.fields,S).forEach(f=>ui.vals[f.id]=String(f.ans));if(st.k==='sort')V(st.items,S).forEach(([id,,a])=>ui.placed[id]=a);ui.bad=[];ui.msg={ok:true,text:'Here is the answer. Review it, then submit to continue.'};return play();}
 if(b.id==='next')return next();
 if(b.id==='replay'){store.del('cur-'+L.id);return start(L.id,S.preview);}
});
document.addEventListener('input',e=>{if(view!=='play'||!ui.rows)return;const r=e.target.closest('.je-r');if(!r)return;const row=ui.rows[+r.dataset.j];row[e.target.dataset.f]=e.target.value;
 if(e.target.tagName==='INPUT'){const t=$('.tot');if(t)t.innerHTML=totalsHTML();r.classList.toggle('cr',!!(num(row.c)&&!num(row.d)));}});
document.addEventListener('change',e=>{const r=e.target.closest('.je-r');if(r&&e.target.tagName==='SELECT'&&ui.rows)ui.rows[+r.dataset.j].a=e.target.value;});
window.__ll={state:()=>({view,lesson:L&&L.id,i:S&&S.i,done:S&&S.done,posted:S&&S.posted,step:S&&!S.done?(({k,q})=>({k}))(stepNow()):null}),
 answer(){const st=stepNow();if(st.k==='je')return linesOf(st,S);if(st.k==='num')return V(st.fields,S).map(f=>[f.id,f.ans]);if(st.k==='sort')return V(st.items,S).map(([id,,a])=>[id,a]);if(st.k==='mc')return st.a;if(st.k==='decide')return V(st.q,S).map(q=>[q.id,(q.opts.find(o=>!(o.locked&&o.locked(S)))||q.opts[0]).v]);return null;},
 reset(){localStorage.clear();biz=null;progress={};assigned=new Set();view='home';render();}};
const h=location.hash.slice(1);if(h==='library')view='lib';render();cloudBoot();if(h.startsWith('lesson=')&&lessonById(h.slice(7)))start(h.slice(7),!biz);
})();
