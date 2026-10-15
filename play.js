// Ledger Lane "Year One" demo: run a business, journalize, close, prepare statements.
(function PLAYUI(){
const P=window.LedgerPlay,$=s=>document.querySelector(s),app=document.getElementById('app'),money=P.money,KEY='ledger-lane-play-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let U={view:'pick',modal:null};let lastCash=null;
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({bizId:U.g.biz.id,custom:U.g.biz.custom||null,log:U.log,seenYE:U.seenYE,name:U.g.biz.name,rec:U.g.rec}));}catch(e){}};
const clearSave=()=>{try{localStorage.removeItem(KEY);}catch(e){}};
const bizFor=(id,custom)=>id==='custom'?P.customBusiness(custom.name,P.parseNotes(custom.lines.join('\n'))):P.BUSINESSES.find(b=>b.id===id);
function start(biz,log,seenYE){U={view:'game',g:null,log:[],seenYE:!!seenYE,phase:'story',pending:[],tries:0,msg:null,fresh:null,placed:{},sel:null,sortTries:0,sortWrong:[],computeTries:0,computeMsg:null,modal:null,inputs:{}};
 if(log&&log.length){U.g=P.replay(biz,log);U.log=log.slice(0,U.g.decisions.length);}else U.g=P.newGame(biz);
 lastCash=null;next();window.scrollTo({top:0});}
function next(){U.pending=[];U.tries=0;U.msg=null;U.fresh=null;const g=U.g,ev=P.advance(g);
 if(!ev)U.phase='stmt-intro';else if(g.biz.events[g.i].yearEnd&&!U.seenYE){U.seenYE=true;U.phase='yearend';}else U.phase='story';
 save();render();focusCard();}
function pick(k){const c=P.choose(U.g,k);if(!c)return;U.k=k;if(!c.entry){U.log.push({k,tries:0});U.phase='note';save();}else U.phase='record';render();focusCard();}
function place(acct,side){if(U.phase!=='record')return;U.pending=U.pending.filter(p=>p.side!==side);U.pending.push({acct,side});U.msg=null;render();}
function check(){const d=U.pending.find(p=>p.side==='dr'),c=U.pending.find(p=>p.side==='cr'),r=P.checkEntry(U.g,d&&d.acct,c&&c.acct);
 if(r.ok){P.post(U.g,U.tries);U.log.push({k:U.k,tries:U.tries});U.pending=[];U.fresh=U.g.choice.entry;U.phase='done';save();render();focusCard();}
 else{if(r.kind==='bad')U.tries++;U.msg=r;render();}}
function showMe(){const e=U.g.choice.entry;U.tries=Math.max(U.tries,1);U.pending=[{acct:e[0],side:'dr'},{acct:e[1],side:'cr'}];U.msg={kind:'info',text:'Here it is: debit <b>'+esc(P.nameOf(U.g.biz,e[0]))+'</b>, credit <b>'+esc(P.nameOf(U.g.biz,e[1]))+'</b>. Press <b>Check it</b> to record it.'};render();}
const focusCard=()=>{const c=$('#card');if(c&&innerWidth<900)c.scrollIntoView({block:'start',behavior:'smooth'});};
const eq=g=>{const s=P.statements(g),E=P.bal(g,'capital')-P.bal(g,'draws')+s.netIncome;return {A:s.totalAssets,L:s.totalLiab,E};};
const COLS=[['Assets',['asset','contra']],['Liabilities',['liability']],["Owner's equity & revenue",['equity','draw','revenue']],['Expenses',['expense']]];
function header(){const g=U.g,inGame=U.view==='game';let cur=0;if(inGame){if(['stmt-intro','sort','compute','report'].includes(U.phase))cur=13;else if(g.ev&&g.biz.events[g.i].yearEnd)cur=12;else if(g.ev)cur=P.monthOf(g.biz.events[g.i].when);}
 const labels=P.MONTHS.concat(['Close','Statements']);
 return `<header class="top"><a class="brand" href="index.html"><span class="logo">LL</span><span>Ledger Lane</span></a>${inGame?`<span class="biz-pill">${g.biz.emoji} ${esc(g.biz.name)}</span>`:''}<nav class="top-actions">${inGame?'<button class="ghost" id="to-pick">Switch business</button>':''}<button class="ghost" id="open-instructor">For instructors</button></nav></header>
 ${inGame?`<ol class="year" aria-label="Year progress">${labels.map((m,i)=>`<li class="${i<cur?'past':i===cur?'now':''} ${i>11?'wide':''}"><span>${m}</span></li>`).join('')}</ol>`:''}`;}
function stats(){const g=U.g,cash=P.bal(g,'cash'),q=eq(g),ok=Math.round(q.A)===Math.round(q.L+q.E),dir=lastCash===null||cash===lastCash?'':cash>lastCash?'up':'down';lastCash=cash;
 const pct=Math.max(4,Math.min(100,cash/600));
 return `<section class="stats"><div class="stat cash ${dir}"><small>Cash in the bank</small><b>${money(cash)}</b><i style="width:${pct}%"></i></div>
 <div class="stat eqn ${ok?'ok':'off'}"><small>Accounting equation ${ok?'✓ balanced':'⚠'}</small><div><span>Assets <b>${money(q.A)}</b></span><em>=</em><span>Liabilities <b>${money(q.L)}</b></span><em>+</em><span>Equity <b>${money(q.E)}</b></span></div></div>
 <div class="stat score"><small>First-try entries</small><b>⭐ ${g.first}<span>/${g.rec}</span></b></div></section>`;}
function tAccount(id){const g=U.g,l=g.led[id],amt=g.choice&&g.choice.entry?g.choice.entry[2]:0,rec=U.phase==='record';
 const side=s=>{const arr=l[s],more=arr.length>3?`<span class="more">+${arr.length-3} more</span>`:'';const pend=U.pending.filter(p=>p.acct===id&&p.side===s).map(()=>`<button class="chip pending" data-unplace="${s}">${money(amt)}</button>`).join('');
  const fr=U.fresh&&U.fresh[s==='dr'?0:1]===id;
  return `<div class="zone ${s} ${fr?'fresh':''} ${rec?'live':''}" data-zone="${id}:${s}" ${rec?`role="button" tabindex="0" aria-label="${s==='dr'?'Debit':'Credit'} ${esc(P.nameOf(g.biz,id))}"`:''}><small>${s==='dr'?'Debit':'Credit'}</small>${more}${arr.slice(-3).map((a,i,x)=>`<span class="chip ${fr&&i===x.length-1?'new':''}">${money(a)}</span>`).join('')}${pend}</div>`;};
 return `<article class="t ${P.typeOf(id)}"><header><span>${P.iconOf(id)} ${esc(P.nameOf(g.biz,id))}</span><b>${money(P.bal(g,id))}</b></header><div class="t-body">${side('dr')}${side('cr')}</div></article>`;}
function board(){const g=U.g;return `<section class="board ${U.phase==='record'?'recording':''}" aria-label="T accounts">${COLS.map(([t,types])=>`<div class="col"><h3>${t}</h3>${g.biz.accounts.filter(id=>types.includes(P.typeOf(id))).map(tAccount).join('')}</div>`).join('')}</section>`;}
function card(){const g=U.g,ev=g.ev,c=g.choice;
 if(U.phase==='yearend')return `<div class="card big" id="card"><div class="when">December 31</div><div class="burst">🎆</div><h2>Time to close the books</h2><p>The year is over, but your books aren't quite right yet. Some things happened slowly: supplies got used, equipment wore down, and your team earned wages you haven't paid.</p><p><b>Adjusting entries</b> fix that so this year's statements tell the truth.</p><button class="go" id="begin-close">Start closing the books →</button></div>`;
 if(U.phase==='stmt-intro'){const s=P.statements(g);return `<div class="card big" id="card"><div class="when">Year one is in the books</div><div class="burst">🏁</div><h2>You recorded ${g.rec} entries!</h2><p>Your ledger is complete and balanced. Now do what real accountants do at year-end: <b>prepare the financial statements</b> yourself.</p><ul class="mini"><li>📄 Income statement</li><li>📄 Statement of owner's equity</li><li>📄 Balance sheet</li></ul><button class="go" id="start-statements">Prepare my statements →</button><small class="muted">${s.ids.length} accounts to sort</small></div>`;}
 const head=`<div class="when">${esc(g.biz.events[g.i].when)}${g.biz.events[g.i].yearEnd?' · Adjusting entry':''}</div><div class="who"><span class="av">${ev.av}</span><span>${esc(ev.who)}</span></div><h2>${esc(ev.title)}</h2><p class="story">${esc(ev.story)}</p>`;
 if(U.phase==='story')return `<div class="card" id="card">${head}<div class="choices">${ev.choices.map((ch,k)=>{const dis=P.isDisabled(g,ch);return `<button class="choice" data-choice="${k}" ${dis?'disabled':''}><b>${esc(ch.label)}</b>${dis?'<span class="lock">🔒 Not enough cash</span>':ch.sub?`<span>${esc(ch.sub)}</span>`:''}</button>`;}).join('')}</div></div>`;
 if(U.phase==='note')return `<div class="card" id="card">${head}<div class="picked">You chose: <b>${esc(c.label)}</b></div><div class="fb info">💡 ${esc(c.note)}</div><button class="go" id="next">Next day →</button></div>`;
 if(U.phase==='record'){const d=U.pending.find(p=>p.side==='dr'),cr=U.pending.find(p=>p.side==='cr');return `<div class="card" id="card">${head}<div class="picked">You chose: <b>${esc(c.label)}</b></div><div class="task"><b>Record it.</b> Drop the amount on one <span class="dr-t">Debit</span> side and one <span class="cr-t">Credit</span> side on the T accounts.</div><div class="amount" draggable="true" data-drag="amt">${money(c.entry[2])}</div><div class="slots"><span class="${d?'set':''}">Debit: <b>${d?esc(P.nameOf(g.biz,d.acct)):'tap a Debit side'}</b></span><span class="${cr?'set':''}">Credit: <b>${cr?esc(P.nameOf(g.biz,cr.acct)):'tap a Credit side'}</b></span></div>${U.msg?`<div class="fb ${U.msg.kind}">${U.msg.text}</div>`:''}<div class="row"><button class="go" id="check" ${d&&cr?'':'disabled'}>Check it</button>${U.tries>=2?'<button class="ghost" id="show-me">Show me</button>':''}</div></div>`;}
 if(U.phase==='done')return `<div class="card" id="card">${head}<div class="fb good">${U.tries?'✅ Got it.':'🌟 First try!'} <b>Debit ${esc(P.nameOf(g.biz,c.entry[0]))}, credit ${esc(P.nameOf(g.biz,c.entry[1]))}: ${money(c.entry[2])}</b><br>${esc(c.why)}</div><button class="go" id="next">${g.biz.events[g.i].yearEnd?'Next adjustment →':'Next day →'}</button></div>`;
 return '';}
const sec=id=>P.SECTIONS.find(s=>s[0]===id);
function item(id,where){const g=U.g,s=P.statements(g),amt=P.typeOf(id)==='contra'?P.bal(g,id):P.bal(g,id);return `<button class="item ${U.sel===id?'sel':''} ${U.sortWrong.includes(id)?'wrong':''}" data-item="${id}" draggable="true">${P.iconOf(id)} ${esc(P.nameOf(g.biz,id))} <b>${money(amt)}</b></button>`;}
function sortView(){const g=U.g,items=P.sortItems(g),tray=items.filter(id=>!U.placed[id]),inSec=s=>items.filter(id=>U.placed[id]===s).map(item).join('');
 const zone=s=>`<div class="drop" data-section="${s}" role="button" tabindex="0"><h4>${sec(s)[2]}</h4>${inSec(s)||'<span class="hint">Drop accounts here</span>'}</div>`;
 const hints=U.sortWrong.map(id=>`<li><b>${esc(P.nameOf(g.biz,id))}:</b> ${P.SECTION_HINT[P.sectionOf(id)]}</li>`).join('');
 return `<section class="stmts"><div class="stmt-head"><span class="step">Step 1 of 2</span><h2>Where does each account go?</h2><p>Tap an account, then tap the statement section it belongs in. You can also drag it.</p></div>
 <div class="tray" data-section="tray">${tray.map(item).join('')||'<span class="hint">All sorted! Press Check.</span>'}</div>
 ${U.sortWrong.length?`<div class="fb bad">${U.sortWrong.length} account${U.sortWrong.length>1?'s are':' is'} in the wrong place:<ul>${hints}</ul></div>`:''}
 <div class="papers"><article class="paper"><h3>Income statement</h3><small>For the year ended December 31</small>${zone('is-rev')}${zone('is-exp')}</article>
 <article class="paper"><h3>Statement of owner's equity</h3><small>For the year ended December 31</small>${zone('oe-cap')}<div class="drop fixed"><h4>Net income</h4><span class="hint">Comes from the income statement</span></div>${zone('oe-draw')}</article>
 <article class="paper"><h3>Balance sheet</h3><small>December 31</small>${zone('bs-assets')}${zone('bs-liab')}<div class="drop fixed"><h4>Owner's equity</h4><span class="hint">Ending capital comes from the statement of owner's equity</span></div></article></div>
 <div class="row center"><button class="go" id="check-sort" ${tray.length?'disabled':''}>Check my statements</button></div></section>`;}
const line=(name,amt,cls='')=>`<div class="ln ${cls}"><span>${name}</span><b>${amt}</b></div>`;
const inp=(k)=>`<input inputmode="decimal" class="${U.computeWrong&&U.computeWrong.includes(k)?'wrong':''}" id="in-${k}" value="${esc(U.inputs[k]||'')}" placeholder="$ ?" aria-label="${k}">`;
function papers(final){const g=U.g,s=P.statements(g),m=money;
 const NI=final?m(s.netIncome):inp('ni'),CAP=final?m(s.endCapital):inp('cap'),TA=final?m(s.totalAssets):inp('ta');
 const is=`<article class="paper"><h3>${esc(g.biz.name)}<br>Income statement</h3><small>For the year ended December 31</small><h4>Revenues</h4>${s.rev.map(r=>line(esc(r.name),m(r.amount))).join('')}${line('Total revenues',m(s.totalRev),'tot')}<h4>Expenses</h4>${s.exp.map(r=>line(esc(r.name),m(r.amount))).join('')}${line('Total expenses',m(s.totalExp),'tot')}${line('Net income',NI,'grand')}</article>`;
 const oe=`<article class="paper"><h3>${esc(g.biz.name)}<br>Statement of owner's equity</h3><small>For the year ended December 31</small>${line("Owner's capital, January 1",m(0))}${line('Add: owner investments',m(s.investments))}${line('Add: net income',final?m(s.netIncome):'from income statement')}${line('Less: withdrawals',s.draws?'('+m(s.draws)+')':m(0))}${line("Owner's capital, December 31",CAP,'grand')}</article>`;
 const bs=`<article class="paper"><h3>${esc(g.biz.name)}<br>Balance sheet</h3><small>December 31</small><h4>Assets</h4>${s.assets.map(r=>line(esc(r.name),r.amount<0?'('+m(-r.amount)+')':m(r.amount))).join('')}${line('Total assets',TA,'grand')}<h4>Liabilities</h4>${s.liabilities.map(r=>line(esc(r.name),m(r.amount))).join('')||line('None',m(0))}${line('Total liabilities',m(s.totalLiab),'tot')}<h4>Owner's equity</h4>${line("Owner's capital",final?m(s.endCapital):'from owner\'s equity')}${line("Total liabilities & owner's equity",final?m(s.totalLE):'?','grand')}</article>`;
 return `<div class="papers final">${is}${oe}${bs}</div>`;}
function computeView(){return `<section class="stmts"><div class="stmt-head"><span class="step">Step 2 of 2</span><h2>Finish the math</h2><p>Every account is in the right place. Now fill in the three missing totals.</p></div>${papers(false)}${U.computeMsg?`<div class="fb bad">${U.computeMsg}</div>`:''}<div class="row center"><button class="go" id="check-compute">Check my totals</button>${U.computeTries>=2?'<button class="ghost" id="fill-totals">Show me</button>':''}</div></section>`;}
function stars(){const g=U.g,pct=g.rec?g.first/g.rec:1;let n=pct>=.85?3:pct>=.6?2:1;if(U.sortTries>1||U.computeTries>1)n=Math.max(1,n-1);return n;}
function reportView(){const g=U.g,s=P.statements(g),n=stars();return `<section class="report"><div class="hero-end"><div class="stars">${[1,2,3].map(i=>`<span class="${i<=n?'on':''}">★</span>`).join('')}</div><h1>${esc(g.biz.name)} ${s.netIncome>=0?'made '+money(s.netIncome):'lost '+money(-s.netIncome)} in year one!</h1><p>${g.first} of ${g.rec} entries right on the first try · statements ${U.sortTries+U.computeTries<=2?'nailed':'finished'} · balance sheet ✓ balanced</p>
 <div class="kpis"><div><small>Net income</small><b>${money(s.netIncome)}</b></div><div><small>Cash at year-end</small><b>${money(P.bal(g,'cash'))}</b></div><div><small>Total assets</small><b>${money(s.totalAssets)}</b></div><div><small>Owner's capital</small><b>${money(s.endCapital)}</b></div></div></div>
 ${papers(true)}
 <article class="paper decisions"><h3>Your year in decisions</h3><ol>${g.decisions.filter(d=>!/^Record /.test(d.label)).map(d=>`<li><span>${esc(d.when)}</span><b>${esc(d.title)}:</b> ${esc(d.label)}</li>`).join('')}</ol><p class="muted">Different choices lead to a different year. Play again and try to beat your profit.</p></article>
 <div class="row center"><button class="go" id="play-again">Play another business →</button><button class="ghost" id="replay-same">Replay ${esc(g.biz.name)}</button><button class="ghost" id="open-instructor">Make one from my notes</button></div></section>`;}
function pickView(){const saved=load();return `<section class="pick"><div class="hero"><span class="eyebrow">NO LOGIN · ABOUT 15 MINUTES</span><h1>Run a real business<br><span>for a whole year.</span></h1><p>Make the calls an owner makes, record every journal entry, close the books on December 31, and prepare your own financial statements.</p></div>
 ${saved&&saved.log&&saved.log.length?`<div class="resume"><span>⏯️ You were running <b>${esc(saved.name||'a business')}</b> (${saved.rec||0} entries in).</span><button class="go" id="resume">Continue</button><button class="ghost" id="discard">Start over</button></div>`:''}
 <div class="bizzes">${P.BUSINESSES.map(b=>`<button class="biz" data-biz="${b.id}" style="--c:${b.color}"><span class="em">${b.emoji}</span><small>${esc(b.type)}</small><b>${esc(b.name)}</b><span>${esc(b.tagline)}</span><i>Play year one →</i></button>`).join('')}</div>
 <div class="how"><div><b>1 · Decide</b><span>One event at a time. Every choice has consequences.</span></div><div><b>2 · Record</b><span>Drop amounts onto live T accounts and watch the books move.</span></div><div><b>3 · Close</b><span>Make the year-end adjusting entries.</span></div><div><b>4 · Report</b><span>Build the income statement, owner's equity and balance sheet.</span></div></div>
 <div class="teach"><div><span class="eyebrow">FOR INSTRUCTORS</span><h2>Paste your course notes. Play them right away.</h2><p>Ledger Lane turns each transaction in your notes into a day in the business, with an answer key and a year-end statements challenge.</p></div><button class="go light" id="open-instructor">Turn notes into a game →</button></div></section>`;}
function modal(){const m=U.modal;if(!m)return '';const parsed=m.parsed;
 return `<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="Instructor"><button class="x" id="close-modal" aria-label="Close">✕</button><span class="eyebrow">INSTRUCTOR DEMO</span><h2>Your notes → a playable year</h2>
 ${!parsed?`<label>Business name<input id="biz-name" value="${esc(m.name)}"></label><label>Course notes, one transaction per line<textarea id="notes" rows="10">${esc(m.notes)}</textarea></label><div class="row"><button class="go" id="gen">Build the game →</button><button class="ghost" id="sample">Use sample notes</button></div><small class="muted">In the signed-in classroom, AI reads full lecture notes. This demo reads one transaction per line.</small>`
 :`<p>${parsed.filter(p=>p.ok).length} of ${parsed.length} lines became playable days. Here's the answer key your students will be graded against:</p><ol class="key">${parsed.map(p=>`<li class="${p.ok?'ok':'no'}"><span>${esc(p.line)}</span>${p.ok?`<b>Dr ${esc(P.nameOf({},p.dr))} · Cr ${esc(P.nameOf({},p.cr))} · ${money(p.amt)}</b>`:`<em>${esc(p.why)}</em>`}</li>`).join('')}</ol><div class="row"><button class="go" id="play" ${parsed.filter(p=>p.ok).length>=3?'':'disabled'}>Play it as a student →</button><button class="ghost" id="edit">Edit notes</button></div>`}</div></div>`;}
function render(){let body;if(U.view==='pick')body=pickView();else if(U.phase==='sort')body=sortView();else if(U.phase==='compute')body=computeView();else if(U.phase==='report')body=reportView();else body=`${stats()}<div class="play">${card()}${board()}</div>`;
 app.innerHTML=header()+`<main class="${U.view}">${body}</main>`+modal();if(U.modal){const f=$('#notes')||$('#play');f&&f.focus();}}
function openModal(){U.modal={name:'Maple Street Bikes',notes:P.SAMPLE_NOTES,parsed:null};render();}
function checkSort(){const r=P.checkSort(U.g,U.placed);U.sortTries++;U.sortWrong=r.wrong;U.sel=null;if(!r.wrong.length&&!r.missing.length){U.phase='compute';U.inputs={};}render();window.scrollTo({top:0,behavior:'smooth'});}
function readInputs(){['ni','cap','ta'].forEach(k=>{const el=$('#in-'+k);if(el)U.inputs[k]=el.value;});}
function checkCompute(){readInputs();const s=P.statements(U.g),num=v=>{const t=String(v||'').replace(/[$,\s]/g,'').replace(/^\((.*)\)$/,'-$1');return t===''?NaN:Math.round(parseFloat(t));};
 const want={ni:s.netIncome,cap:s.endCapital,ta:s.totalAssets},tips={ni:'<b>Net income</b> = total revenues − total expenses.',cap:"<b>Ending owner's capital</b> = $0 starting capital + investments + net income − withdrawals.",ta:'<b>Total assets</b> = add up the assets, then subtract accumulated depreciation.'};
 U.computeWrong=Object.keys(want).filter(k=>num(U.inputs[k])!==Math.round(want[k]));U.computeTries++;
 if(!U.computeWrong.length){U.phase='report';clearSave();render();window.scrollTo({top:0,behavior:'smooth'});return;}
 U.computeMsg='Not quite. '+U.computeWrong.map(k=>tips[k]).join(' ');render();}
app.addEventListener('click',e=>{const t=e.target.closest('button,[data-zone],[data-section],[data-item]');if(!t||t.disabled)return;const id=t.id,d=t.dataset;
 if(d.biz){clearSave();return start(bizFor(d.biz));}
 if(d.choice!==undefined)return pick(+d.choice);
 if(d.unplace){e.stopPropagation();U.pending=U.pending.filter(p=>p.side!==d.unplace);return render();}
 if(d.zone){const [a,s]=d.zone.split(':');return place(a,s);}
 if(d.item){e.stopPropagation();const host=t.closest('[data-section]');if(U.sel&&U.sel!==d.item&&host&&host.dataset.section!=='tray'){U.placed[U.sel]=host.dataset.section;U.sortWrong=U.sortWrong.filter(x=>x!==U.sel);U.sel=null;return render();}U.sel=U.sel===d.item?null:d.item;return render();}
 if(d.section){if(!U.sel)return;if(d.section==='tray')delete U.placed[U.sel];else U.placed[U.sel]=d.section;U.sortWrong=U.sortWrong.filter(x=>x!==U.sel);U.sel=null;return render();}
 const A={next,check,'show-me':showMe,'begin-close':()=>{U.phase='story';render();focusCard();},'start-statements':()=>{U.phase='sort';render();window.scrollTo({top:0});},'check-sort':checkSort,'check-compute':checkCompute,
  'fill-totals':()=>{const s=P.statements(U.g);U.inputs={ni:String(s.netIncome),cap:String(s.endCapital),ta:String(s.totalAssets)};U.computeMsg=null;U.computeWrong=[];render();},
  'to-pick':()=>{U={view:'pick',modal:null};render();},'play-again':()=>{U={view:'pick',modal:null};render();window.scrollTo({top:0});},'replay-same':()=>start(U.g.biz.id==='custom'?U.g.biz:bizFor(U.g.biz.id)),
  'open-instructor':openModal,'close-modal':()=>{U.modal=null;render();},resume:()=>{const s=load();const b=s&&bizFor(s.bizId,s.custom);if(b)start(b,s.log,s.seenYE);},discard:()=>{clearSave();render();},
  sample:()=>{U.modal.notes=P.SAMPLE_NOTES;render();},gen:()=>{U.modal.name=$('#biz-name').value.trim()||'My class business';U.modal.notes=$('#notes').value;U.modal.parsed=P.parseNotes(U.modal.notes);render();},edit:()=>{U.modal.parsed=null;render();},
  play:()=>{const m=U.modal;clearSave();start(P.customBusiness(m.name,m.parsed));}};
 if(A[id]){if(U.phase==='compute')readInputs();A[id]();}});
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-zone],[data-section]')){e.preventDefault();e.target.click();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&U.modal){U.modal=null;render();}});
app.addEventListener('input',e=>{if(e.target.id&&e.target.id.startsWith('in-'))U.inputs[e.target.id.slice(3)]=e.target.value;});
app.addEventListener('dragstart',e=>{const t=e.target.closest('[draggable]');if(!t)return;e.dataTransfer.setData('text/plain',t.dataset.item||'amt');if(t.dataset.item)U.sel=t.dataset.item;});
app.addEventListener('dragover',e=>{if(e.target.closest('[data-zone],[data-section]'))e.preventDefault();});
app.addEventListener('drop',e=>{const z=e.target.closest('[data-zone],[data-section]');if(!z)return;e.preventDefault();if(z.dataset.zone){const [a,s]=z.dataset.zone.split(':');place(a,s);}else if(U.sel){z.click();}});
app.addEventListener('click',e=>{if(e.target.id==='scrim'){U.modal=null;render();}});
window.__play=()=>({view:U.view,phase:U.phase,i:U.g?U.g.i:null,entry:U.g&&U.g.choice?U.g.choice.entry:null,rec:U.g?U.g.rec:0,biz:U.g?U.g.biz.id:null,modal:!!U.modal});
window.__playGame=()=>U.g;
render();if(location.hash==='#instructor')openModal();
})();
