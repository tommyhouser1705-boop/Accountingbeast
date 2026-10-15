// Ledger Lane "Year One" demo engine: scenarios, double-entry ledger, statements.
(function ENGINE(root){
const money=n=>(n<0?'-':'')+'$'+Math.abs(Math.round(n)).toLocaleString('en-US');
const ACCOUNTS={
 cash:['Cash','asset','💵'],supplies:['Supplies','asset','📦'],prepaid:['Prepaid Rent','asset','🗓️'],equip:['Equipment','asset','🛠️'],accdep:['Accumulated Depreciation','contra','📉'],
 ap:['Accounts Payable','liability','🧾'],wagespay:['Wages Payable','liability','⏰'],intpay:['Interest Payable','liability','🏦'],unearned:['Unearned Revenue','liability','⏳'],note:['Notes Payable','liability','📝'],
 capital:["Owner's Capital",'equity','👤'],draws:["Owner's Withdrawals",'draw','👛'],
 sales:['Sales Revenue','revenue','📈'],
 rentexp:['Rent Expense','expense','🏠'],wages:['Wages Expense','expense','🧑‍🍳'],suppexp:['Supplies Expense','expense','🥤'],depexp:['Depreciation Expense','expense','⚙️'],intexp:['Interest Expense','expense','💸'],utilexp:['Utilities Expense','expense','💡'],adexp:['Advertising Expense','expense','📣'],permits:['Permits & Insurance Expense','expense','🛡️'],repairs:['Repairs Expense','expense','🔧']};
const typeOf=id=>ACCOUNTS[id][1];
const debitNormal=id=>['asset','expense','draw'].includes(typeOf(id));
const nameOf=(biz,id)=>(biz.labels&&biz.labels[id])||ACCOUNTS[id][0];
const iconOf=id=>ACCOUNTS[id][2];
const SECTION={asset:'bs-assets',contra:'bs-assets',liability:'bs-liab',equity:'oe-cap',draw:'oe-draw',revenue:'is-rev',expense:'is-exp'};
const sectionOf=id=>SECTION[typeOf(id)];
const SECTIONS=[['is-rev','Income statement','Revenues'],['is-exp','Income statement','Expenses'],['oe-cap',"Statement of owner's equity",'Owner investments'],['oe-draw',"Statement of owner's equity",'Withdrawals'],['bs-assets','Balance sheet','Assets'],['bs-liab','Balance sheet','Liabilities']];
const SECTION_HINT={'is-rev':'This was earned from customers. Revenue belongs on the income statement.','is-exp':'This cost was used up to run the business. Expenses belong on the income statement.','oe-cap':"This is what the owner put in. It starts the statement of owner's equity.",'oe-draw':"The owner took this out for personal use. It's not an expense: it reduces owner's equity.",'bs-assets':'The business owns this (or it reduces an asset, like accumulated depreciation). It goes in balance sheet assets.','bs-liab':'The business owes this to someone. It goes in balance sheet liabilities.'};
const HINT_DR={cash:'Money came INTO the bank account.',supplies:"You got supplies you'll use up soon.",prepaid:"You paid now for something you'll use later. That's a future benefit you own.",equip:"Something you'll use for years arrived.",accdep:'Accumulated depreciation is almost never debited here.',ap:'You paid down a bill you owed, so that debt shrinks.',wagespay:'You paid wages you already owed.',intpay:'You paid interest you already owed.',unearned:'You finally did the work customers paid for in advance, so you owe them less.',note:'You paid back part of a loan.',capital:'The owner took capital back out.',draws:"The owner took money out for personal use. That's a withdrawal, not a business expense.",sales:'Revenue is almost never debited.',depexp:'Equipment wore out a little this year. That used-up cost is an expense.',intexp:'Borrowing cost you something this year. That cost is an expense.'};
const HINT_CR={cash:'Money LEFT the bank account.',supplies:'Supplies got used up, so what is on the shelves went down.',prepaid:'Part of what you prepaid got used up.',equip:'You gave up equipment.',accdep:'Record the wear on equipment without erasing its original cost. Use the contra-asset.',ap:'You promised to pay a supplier later. You now owe them.',wagespay:"Your team earned wages you haven't paid yet. You owe them.",intpay:"Interest built up that you haven't paid yet.",unearned:"Customers paid before you did the work. Until you do it, you owe them.",note:'You signed a loan. You owe the bank.',capital:'The money came from the owner.',draws:'Withdrawals are almost never credited.',sales:'You earned it by serving customers.'};
const hintDr=id=>HINT_DR[id]||'A cost got used up running the business. That is an expense.';
const hintCr=id=>HINT_CR[id]||'Expenses are almost never credited.';
const E=(when,make,yearEnd)=>({when,make,yearEnd:!!yearEnd});
const ch=(label,entry,why,extra)=>Object.assign({label,entry,why},extra||{});
const skip=(label,note,extra)=>Object.assign({label,entry:null,note},extra||{});
const adjSupplies=left=>E('Dec 31',h=>{const had=h.bal('supplies'),lf=typeof left==='function'?left(h):left,used=had-lf;if(used<=0)return null;return {who:'Year-end count',av:'📋',title:'Count what is left',story:`Your books show ${money(had)} of supplies, but when you count the shelves only ${money(lf)} is left. The rest was used up during the year.`,choices:[ch(`Record ${money(used)} of supplies used`,['suppexp','supplies',used],"Supplies you used are now an expense, and the Supplies asset shrinks to what's really on the shelves. This is an adjusting entry.")]};},true);
const adjPrepaid=(months,story)=>E('Dec 31',h=>{if(!h.f.prepaid)return null;const used=Math.round(h.f.prepaid*months/12);return {who:'Year-end adjustment',av:'🗓️',title:'Rent you have used up',story:`You prepaid ${money(h.f.prepaid)} of rent. ${story}`,choices:[ch(`Record ${money(used)} of rent used`,['rentexp','prepaid',used],"The months you've used move from the Prepaid Rent asset to Rent Expense."+(months<12?' The month you have left stays an asset.':''))]};},true);
const adjDep=()=>E('Dec 31',h=>{const d=h.f.dep||0;if(!d)return null;return {who:'Year-end adjustment',av:'⚙️',title:'Equipment wears out',story:`Your equipment won't last forever. Spread its cost over its useful life: ${money(d)} of depreciation this year.`,choices:[ch(`Record ${money(d)} of depreciation`,['depexp','accdep',d],'Depreciation spreads the cost of equipment over the years you use it. The credit goes to Accumulated Depreciation, a contra-asset, so the original cost stays visible.')]};},true);
const adjWages=(fn,story)=>E('Dec 31',h=>{const w=fn(h);if(!w)return null;return {who:'Year-end adjustment',av:'⏰',title:"Wages you haven't paid yet",story:story+` They earned ${money(w)}.`,choices:[ch(`Record ${money(w)} of unpaid wages`,['wages','wagespay',w],"Your team earned it this year, so it's this year's expense, even though you'll pay it in January. Wages Payable is what you owe.")]};},true);
const adjInterest=()=>E('Dec 31',h=>{if(!h.f.loan)return null;const amt=Math.round(h.f.loan*h.f.rate);return {who:'Year-end adjustment',av:'🏦',title:'Interest builds up',story:`You've had the ${money(h.f.loan)} bank loan all year at ${Math.round(h.f.rate*100)}%. ${money(amt)} of interest has built up, and it's not due until later.`,choices:[ch(`Record ${money(amt)} of interest`,['intexp','intpay',amt],"Borrowing cost you money this year, so it's an expense now. Interest Payable is the amount you owe the bank.")]};},true);
const payBills=when=>E(when,h=>{const owe=h.bal('ap');if(owe<=0)return null;return {who:'Your suppliers',av:'🧾',title:'Bills are due',story:`You owe ${money(owe)} on account. Pay it now?`,choices:[ch(`Pay ${money(owe)} now`,['ap','cash',owe],"Paying a bill is NOT an expense: you recorded what you bought when you bought it. You're just shrinking a liability with cash."),skip('Ask for more time','No money moved, so there is nothing to record. The liability stays on your books.',{sub:'Keep the cash'})]};});
const invest=(when,story,a,b)=>E(when,()=>({who:'You · Owner',av:'🧑‍💼',title:'Day one',story,choices:[ch(`Invest ${money(a)}`,['cash','capital',a],"Cash went up, and so did Owner's Capital. The owner funded the business.",{sub:'Bigger cushion, more options'}),ch(`Invest ${money(b)}`,['cash','capital',b],"Cash went up, and so did Owner's Capital. With a smaller cushion, some choices may be out of reach.",{sub:'Keep more savings for yourself'})]}));
const draw=(when,a,b)=>E(when,()=>({who:'You · Owner',av:'🎁',title:'Paying yourself',story:'The year has gone well and the holidays are coming. Take some cash out for yourself?',choices:[ch(`Take ${money(a)}`,['draws','cash',a],"Money the owner takes out is a withdrawal, NOT an expense. It lowers equity directly and never touches net income."),ch(`Take ${money(b)}`,['draws','cash',b],'Withdrawals lower equity directly. They never appear on the income statement.'),skip('Leave it in the business','No money moved, so there is nothing to record.')]}));
const single=(when,who,av,title,story,entry,why,cond)=>E(when,h=>{if(cond&&!cond(h))return null;const en=typeof entry==='function'?entry(h):entry;const st=typeof story==='function'?story(h):story;return {who,av,title,story:st,choices:[ch(`Record ${money(en[2])}`,en,why)]};});
const price$=p=>'$'+p.toFixed(2);
const fmtN=n=>Number(n).toLocaleString('en-US');
const shortBiz=c=>{const loan=c.loan,dep=c.equip.dep,unitCost=c.batch.cost/c.batch.size,sold=h=>Math.min(h.f.units||0,h.f.demand||0);
 const accounts=['cash','supplies','prepaid','equip','accdep','ap'].concat(loan?['intpay','note']:[],['capital','draws','sales','rentexp','wages','suppexp','utilexp','depexp'],loan?['intexp']:[]);
 const events=[invest('Jan 2',c.investStory,c.invest[0],c.invest[1])];
 if(loan)events.push(E('Jan 3',()=>({who:loan.who,av:'🏦',title:'A loan offer',story:loan.story,choices:[ch('Borrow '+money(loan.amt),['cash','note',loan.amt],'You got cash, but you also owe the bank. Notes Payable is a liability. Borrowing is never revenue.',{sub:'More cash, '+Math.round(loan.rate*100)+'% interest',set:{loan:loan.amt,rate:loan.rate}}),skip('No thanks',"No money moved, so there's nothing to record.",{sub:'Stay debt-free'})]})));
 events.push(
  E('Jan 5',()=>({who:c.equip.who,av:c.equip.av,title:c.equip.title,story:c.equip.story,choices:[
   ch('Pay '+money(c.equip.cost)+' cash',['equip','cash',c.equip.cost],"One asset (Cash) turned into another (Equipment). Total assets didn't change.",{sub:'No debt',add:{dep}}),
   ch('Pay half now, owe '+money(c.equip.cost/2),[['equip','dr',c.equip.cost],['cash','cr',c.equip.cost/2],['ap','cr',c.equip.cost/2]],'A compound entry: one debit, two credits. Equipment comes in at its full cost. You paid half in cash and owe the rest on account.',{sub:'Keep more cash',add:{dep}})]})),
  E('Jan 8',()=>{const pre=Math.round(c.rent.month*12*0.9);return {who:c.rent.who,av:'🏠',title:c.rent.title,story:c.rent.story+' Rent is '+money(c.rent.month)+' a month starting February 1. Prepay 12 months today and get 10% off: '+money(pre)+'.',choices:[
   ch('Prepay 12 months: '+money(pre),['prepaid','cash',pre],"You haven't used the space yet, so it's an asset: Prepaid Rent. At year-end you'll move the months you used into Rent Expense.",{sub:'Save '+money(c.rent.month*12-pre),set:{prepaid:pre}}),
   skip('Pay month by month',"Signing a lease isn't a transaction. No money moved, so there's nothing to record yet.",{sub:'Keep your cash flexible',set:{monthly:true}})]};}),
  E('Jan 9',()=>({who:'You · Owner',av:'🏷️',title:'Set your price',story:c.priceStory,choices:c.prices.map(([p,d,sub])=>skip(price$(p)+' per '+c.unit1,'Setting a price is a business decision, not a transaction. No money moved, so there is nothing to record. It will drive your sales.',{sub:sub+': about '+fmtN(d)+' '+c.units+' this year',set:{price:p,demand:d}}))})),
  E('Jan 10',h=>({who:c.supplier,av:'📦',title:'Stock up for the year',story:c.supplyStory+' Each batch covers '+fmtN(c.batch.size)+' '+c.units+' and costs '+money(c.batch.cost)+'. '+c.supplierWho+' will bill you on account. At '+price$(h.f.price)+', expect about '+fmtN(h.f.demand)+' customers this year.',choices:[{qty:{min:c.batch.min,max:c.batch.max,step:1,def:c.batch.def,unit:'batches',
   build:n=>{const cost=n*c.batch.cost;return {label:'Order '+n+' batches: '+money(cost)+' on account',entry:['supplies','ap',cost],why:'You got supplies (an asset) and promised to pay later (Accounts Payable). Supplies become an expense only as you use them.',set:{units:n*c.batch.size}};},
   preview:n=>{const units=n*c.batch.size,s=Math.min(units,h.f.demand),left=units-s;return [['Cost (on account)',money(n*c.batch.cost)],[c.units.charAt(0).toUpperCase()+c.units.slice(1)+' you can serve',fmtN(units)],['Expected sales',money(s*h.f.price),'good'],left>0?['Leftover at year-end',money(left*unitCost)]:h.f.demand>units?['Customers turned away',fmtN(h.f.demand-units),'bad']:['Leftover at year-end','$0']];}}}]})),
  E('Dec 15',h=>{const s=sold(h),rev=Math.round(s*h.f.price),out=h.f.units<h.f.demand;return {who:'Your customers',av:c.custAv,title:'A year of sales',story:c.salesStory+' Customers bought '+fmtN(s)+' '+c.units+' at '+price$(h.f.price)+(out?'. You sold out in November, and '+fmtN(h.f.demand-h.f.units)+' more customers wanted one!':'.')+" To keep it quick, the whole year's cash sales go in one entry.",choices:[ch('Record '+money(rev)+' of sales',['cash','sales',rev],"You earned it by serving customers, so it's revenue, and the cash came in.")]};}),
  E('Dec 20',h=>{const rent=h.f.monthly?c.rent.month*11:0,lines=[['wages','dr',c.wages],['utilexp','dr',c.util]].concat(rent?[['rentexp','dr',rent]]:[]),tot=c.wages+c.util+rent;lines.push(['cash','cr',tot]);return {who:'Your bank statement',av:'🧾',title:'Paying the bills',story:'This year you paid '+money(c.wages)+' in wages and '+money(c.util)+' for '+c.utilName+(rent?', plus '+money(rent)+' of rent (February to December)':'')+'. Record it all as one entry.',choices:[ch('Record '+money(tot)+' paid',lines,'A compound entry: several debits, one credit. Each cost was used up this year, so each is an expense, and Cash went down by the total.')]};}),
  draw('Dec 22',c.draw[0],c.draw[1]),
  adjSupplies(h=>Math.max(0,(h.f.units||0)-sold(h))*unitCost),
  adjPrepaid(11,'The lease started February 1, so by December 31 you have used 11 of the 12 months.'),
  adjDep());
 if(loan)events.push(adjInterest());
 return {id:c.id,name:c.name,type:c.type,emoji:c.emoji,color:c.color,tagline:c.tagline,labels:c.labels||{},accounts,events};};
const coffee=shortBiz({id:'coffee',name:"Tommy's Coffee",type:'Coffee shop',emoji:'☕',color:'#6c5ce7',tagline:'Price your lattes, stock up, and close your first year.',invest:[20000,15000],investStory:"You just got the keys to an empty corner shop on Harbor Street. How much of your savings will you put into Tommy's Coffee?",
 loan:{amt:10000,rate:.06,who:'Maya · Harbor Bank',story:'"We can lend you $10,000 at 6% a year, due in three years."'},equip:{cost:12000,dep:2400,who:'Rosa · Espresso Supply Co.',av:'👩‍🔧',title:'The espresso machine',story:'A two-group espresso machine and grinder for $12,000. It should last five years.'},
 rent:{month:1000,who:'Mr. Patel · Landlord',title:'Signing the lease',story:'The corner shop is yours.'},prices:[[4,14000,'Busy and friendly'],[5.5,10000,'Premium craft coffee']],unit1:'latte',units:'drinks',priceStory:"What will a latte cost at Tommy's? Cheaper brings more customers. Pricier earns more per cup.",
 supplier:'Harbor Bean Roasters',supplierWho:'Harbor Bean',supplyStory:'Beans, milk, cups and lids.',batch:{size:1000,cost:900,min:10,max:18,def:13},custAv:'☕',salesStory:'Word got around Harbor Street.',wages:12000,util:2400,utilName:'electricity and water',draw:[6000,2000]});
const bike=shortBiz({id:'bike',name:'Spoke & Sprocket',type:'Bike repair shop',emoji:'🚲',color:'#00b894',tagline:'Set your repair rate, stock parts, and close your first year.',invest:[18000,12000],investStory:'A tiny garage on Mill Street with room for two repair stands. How much will you put into Spoke & Sprocket?',
 equip:{cost:9000,dep:1800,who:'Gearhead Tool Supply',av:'🛠️',title:'Tools and repair stands',story:'Two pro repair stands, a truing stand and a full tool wall for $9,000. They should last five years.'},
 rent:{month:900,who:'Ms. Okafor · Landlord',title:'Signing the lease',story:'The Mill Street garage is yours.'},prices:[[60,1300,'Neighborhood favorite'],[85,1000,'Pro-level service']],unit1:'tune-up',units:'tune-ups',priceStory:'What will a standard tune-up cost? Cheaper brings more riders. Pricier earns more per bike.',
 supplier:'Velo Parts Wholesale',supplierWho:'Velo Parts',supplyStory:'Chains, cables, brake pads and tubes.',batch:{size:100,cost:1500,min:8,max:16,def:11},custAv:'🚲',salesStory:'Riders all over town found your shop.',wages:18000,util:1800,utilName:'utilities',draw:[8000,3000]});
const truck=shortBiz({id:'truck',name:'Rolling Taco Co.',type:'Food truck',emoji:'🌮',color:'#e17055',tagline:'A truck loan, taco pricing and festival crowds.',invest:[20000,15000],investStory:'You found a commissary kitchen with a spot for a food truck. How much will you put into Rolling Taco Co.?',
 loan:{amt:15000,rate:.07,who:'Lee · Valley Credit Union',story:'"We can lend you $15,000 at 7% a year for your truck."'},equip:{cost:18000,dep:3600,who:'Sal · Street Eats Motors',av:'🚚',title:'The truck',story:'A used, fully fitted taco truck for $18,000. It should last five years.'},
 rent:{month:600,who:'Commissary Kitchen',title:'A place to park',story:'The commissary will give you parking and prep space.'},prices:[[3,20000,'Street-corner cheap'],[4.5,14000,'Gourmet tacos']],unit1:'taco',units:'tacos',priceStory:'What will a taco cost? Cheaper brings bigger crowds. Pricier earns more per taco.',
 supplier:'Valley Produce & Meats',supplierWho:'Valley Produce',supplyStory:'Tortillas, meat, produce and foil wraps.',batch:{size:1000,cost:900,min:12,max:22,def:16},custAv:'🌮',salesStory:'Festival season was huge.',wages:10000,util:3600,utilName:'fuel and propane',labels:{utilexp:'Fuel & Propane Expense',rentexp:'Parking Rent Expense',prepaid:'Prepaid Parking Rent'},draw:[6000,2000]});
const BUSINESSES=[coffee,bike,truck];
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthOf=when=>Math.max(0,MONTHS.indexOf(String(when).slice(0,3)));
function newGame(biz){const g={biz,i:-1,ev:null,led:{},flags:{},status:[],first:0,rec:0,decisions:[],done:false,choice:null};biz.accounts.forEach(id=>g.led[id]={dr:[],cr:[]});return g;}
const sum=a=>a.reduce((s,x)=>s+x,0);
function bal(g,id){const l=g.led[id];if(!l)return 0;const d=sum(l.dr),c=sum(l.cr);return debitNormal(id)?d-c:c-d;}
const helper=g=>({bal:id=>bal(g,id),f:g.flags});
function advance(g){g.i++;g.choice=null;while(g.i<g.biz.events.length){const ev=g.biz.events[g.i].make(helper(g));if(ev){g.ev=ev;g.status[g.i]='cur';return ev;}g.status[g.i]='skip';g.i++;}g.ev=null;g.done=true;return null;}
const linesOf=e=>Array.isArray(e[0])?e:[[e[0],'dr',e[2]],[e[1],'cr',e[2]]];
const cashOut=e=>e?linesOf(e).filter(l=>l[0]==='cash'&&l[1]==='cr').reduce((s,l)=>s+l[2],0):0;
const clampN=(q,n)=>Math.max(q.min,Math.min(q.max,Math.round(n==null||isNaN(n)?q.def:+n)));
const built=(c,n)=>c.qty?Object.assign({},c.qty.build(clampN(c.qty,n)),{n:clampN(c.qty,n)}):c;
const isDisabled=(g,c,n)=>{const b=built(c,c.qty&&n==null?c.qty.min:n);return g.ev.choices.length>1&&!!b.entry&&cashOut(b.entry)>bal(g,'cash');};
function choose(g,k,n){const raw=g.ev&&g.ev.choices[k];if(!raw||isDisabled(g,raw,n))return null;const c=built(raw,n);Object.assign(g.flags,c.set||{});for(const key in c.add||{})g.flags[key]=(g.flags[key]||0)+c.add[key];g.choice=c;g.decisions.push({when:g.biz.events[g.i].when,title:g.ev.title,label:c.label});if(!c.entry)g.status[g.i]='done';return c;}
const num=v=>{const x=parseFloat(String(v==null?'':v).replace(/[$,\s]/g,''));return isFinite(x)?Math.round(x*100)/100:0;};
const cents=x=>Math.round((x||0)*100);
const warn=text=>({ok:false,kind:'warn',text}),bad=text=>({ok:false,kind:'bad',text});
function checkJE(g,rows){const exp=linesOf(g.choice.entry),n=id=>nameOf(g.biz,id);
 const used=(rows||[]).map(r=>({a:r.a||'',d:num(r.d),c:num(r.c)})).filter(r=>r.a||r.d||r.c);
 if(used.some(r=>!r.a))return warn('Pick an account for every line that has an amount.');
 if(used.some(r=>!r.d&&!r.c))return warn('Every line needs an amount in the <b>Debit</b> or the <b>Credit</b> column.');
 if(used.some(r=>r.d&&r.c))return warn('Each line goes in one column only: <b>Debit</b> or <b>Credit</b>.');
 if(!used.some(r=>r.d)||!used.some(r=>r.c))return warn('Every journal entry needs at least one <b>debit</b> and one <b>credit</b>.');
 const D=sum(used.map(r=>r.d)),C=sum(used.map(r=>r.c));
 if(cents(D)!==cents(C))return warn('Debits ('+money(D)+') must equal credits ('+money(C)+').');
 const net={},want={};used.forEach(r=>net[r.a]=(net[r.a]||0)+r.d-r.c);exp.forEach(([a,s,x])=>want[a]=(want[a]||0)+(s==='dr'?x:-x));
 const keys=[...new Set(Object.keys(want).concat(Object.keys(net)))];
 if(keys.every(k=>cents(net[k])===cents(want[k])))return {ok:true};
 const has=o=>k=>cents(o[k])!==0,W=has(want),N=has(net),swapped=keys.filter(k=>W(k)&&N(k)&&Math.sign(want[k])!==Math.sign(net[k]));
 if(swapped.length&&swapped.length===keys.filter(W).length&&swapped.length===keys.filter(N).length)return bad('So close! Right accounts, wrong sides. <b>Debit</b> = what the business got or used up. <b>Credit</b> = where it came from.');
 const tips=[];
 swapped.forEach(k=>tips.push('<b>'+n(k)+'</b> is on the wrong side. '+(want[k]>0?hintDr(k):hintCr(k))));
 keys.filter(k=>!W(k)&&N(k)).forEach(k=>tips.push('<b>'+n(k)+"</b> doesn't belong in this entry."));
 keys.filter(k=>W(k)&&!N(k)).forEach(k=>tips.push('Missing a '+(want[k]>0?'debit: '+hintDr(k):'credit: '+hintCr(k))));
 keys.filter(k=>W(k)&&N(k)&&Math.sign(want[k])===Math.sign(net[k])&&cents(want[k])!==cents(net[k])).forEach(k=>tips.push('<b>'+n(k)+'</b> is right, but check the amount.'));
 return bad(tips.slice(0,3).join('<br>'));}
function checkEntry(g,dr,cr){const amt=linesOf(g.choice.entry).filter(l=>l[1]==='dr').reduce((s,l)=>s+l[2],0);return checkJE(g,[{a:dr||'',d:dr?amt:''},{a:cr||'',c:cr?amt:''}]);}
function post(g,tries){linesOf(g.choice.entry).forEach(([a,s,x])=>g.led[a][s].push(x));g.rec++;if(!tries)g.first++;g.status[g.i]='done';}
function trialBalance(g){let d=0,c=0;for(const id in g.led){const b=bal(g,id);if(debitNormal(id)===(b>=0))d+=Math.abs(b);else c+=Math.abs(b);}return {debits:d,credits:c};}
function statements(g){const biz=g.biz,ids=biz.accounts.filter(id=>Math.round(bal(g,id))!==0),row=id=>({id,name:nameOf(biz,id),amount:bal(g,id)}),of=(...t)=>ids.filter(id=>t.includes(typeOf(id)));
 const rev=of('revenue').map(row),exp=of('expense').map(row),totalRev=sum(rev.map(r=>r.amount)),totalExp=sum(exp.map(r=>r.amount)),netIncome=totalRev-totalExp;
 const investments=bal(g,'capital'),draws=bal(g,'draws'),endCapital=investments+netIncome-draws;
 const assets=of('asset','contra').map(id=>({...row(id),amount:typeOf(id)==='contra'?-bal(g,id):bal(g,id)})),totalAssets=sum(assets.map(r=>r.amount));
 const liabilities=of('liability').map(row),totalLiab=sum(liabilities.map(r=>r.amount));
 return {ids,rev,exp,totalRev,totalExp,netIncome,investments,draws,endCapital,assets,totalAssets,liabilities,totalLiab,totalLE:totalLiab+endCapital};}
function sortItems(g){const h=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))%9973,7);return statements(g).ids.slice().sort((a,b)=>h(a)-h(b));}
function checkSort(g,placed){const items=sortItems(g);return {missing:items.filter(id=>!placed[id]),wrong:items.filter(id=>placed[id]&&placed[id]!==sectionOf(id))};}
function parseLine(line){const l=line.toLowerCase(),m=line.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/),amt=m?Math.round(parseFloat(m[1].replace(/,/g,''))):0;
 if(!amt)return {line,ok:false,why:'No dollar amount found. Include one, like $500.'};
 const later=/on account|on credit|pay later|in 30 days|invoice/.test(l);let e=null;
 if(/invest|contribut/.test(l))e=['cash','capital'];
 else if(/withdr|personal use|\bdraws?\b/.test(l))e=['draws','cash'];
 else if(/borrow|loan|note payable/.test(l)&&!/repa|pays? (back|off)/.test(l))e=['cash','note'];
 else if(/depreciat/.test(l))e=['depexp','accdep'];
 else if(/(wage|salar).*(owed|unpaid|accru|not (yet )?paid)|(owed|unpaid|accru).*(wage|salar)/.test(l))e=['wages','wagespay'];
 else if(/\bowed\b|payable|pays? off|settles?|pays? (the )?(supplier|vendor)/.test(l))e=['ap','cash'];
 else if(/in advance|advance|deposit|upfront|up front/.test(l))e=['cash','unearned'];
 else if(/(used|count|on hand)/.test(l)&&/suppl/.test(l))e=['suppexp','supplies'];
 else if(/prepa/.test(l))e=['prepaid','cash'];
 else if(/\brent\b/.test(l))e=['rentexp','cash'];
 else if(/wage|salar|payroll/.test(l))e=['wages','cash'];
 else if(/utilit|electric|water bill/.test(l))e=['utilexp','cash'];
 else if(/advertis|marketing|\bads?\b/.test(l))e=['adexp','cash'];
 else if(/interest/.test(l))e=['intexp','cash'];
 else if(/suppl|ingredient|inventory|beans|cups|parts/.test(l))e=['supplies',later?'ap':'cash'];
 else if(/equip|machine|bike|oven|computer|truck|van|furniture|tool|register/.test(l))e=['equip',later?'ap':'cash'];
 else if(/earn|sold|sale|customer|revenue|service|fee/.test(l))e=['cash','sales'];
 return e?{line,ok:true,dr:e[0],cr:e[1],amt}:{line,ok:false,why:"Couldn't tell what kind of transaction this is. Try words like rent, wages, invests, buys or sold."};}
const parseNotes=text=>String(text).split('\n').map(s=>s.trim()).filter(Boolean).map(parseLine);
const CUSTOM_ACCOUNTS=['cash','supplies','prepaid','equip','accdep','ap','wagespay','unearned','note','capital','draws','sales','rentexp','wages','suppexp','utilexp','adexp','depexp','intexp'];
function customBusiness(name,lines){const ok=lines.filter(p=>p.ok),n=ok.length;return {id:'custom',name:name||'My class business',type:'Your course notes',emoji:'📝',labels:{},custom:{name,lines:lines.map(p=>p.line)},accounts:CUSTOM_ACCOUNTS,
 events:ok.map((p,k)=>E(MONTHS[Math.min(11,Math.floor(k*12/Math.max(1,n)))]+' '+(k%2?15:1),()=>({who:'From your course notes',av:'📝',title:'Transaction '+(k+1)+' of '+n,story:p.line,choices:[ch('Record '+money(p.amt),[p.dr,p.cr,p.amt],nameOf({},p.dr)+(debitNormal(p.dr)?' goes up':' goes down')+' and '+nameOf({},p.cr)+(debitNormal(p.cr)?' goes down':' goes up')+'. Debits equal credits, so the books still balance.')]})))};}
function replay(biz,log){const g=newGame(biz);for(const step of log){if(!advance(g))break;const c=choose(g,step.k,step.n);if(!c)break;if(c.entry)post(g,step.tries);}return g;}
const SAMPLE_NOTES=['The owner invests $15,000 cash to start the shop.','Borrows $5,000 from the bank on a note payable.','Buys repair tools and work stands (equipment) for $6,000 on account.','Prepays $4,800 of rent for the year.','Customers pay $22,000 cash for repairs during the year.','A bike club pays $1,500 in advance for clinics next year.','Pays $3,000 owed to the tool supplier.','Pays the mechanic $9,000 in wages.','The owner withdraws $4,000 for personal use.','Records $1,200 of depreciation on the equipment.'].join('\n');
const api={money,ACCOUNTS,typeOf,debitNormal,nameOf,iconOf,sectionOf,SECTIONS,SECTION_HINT,BUSINESSES,MONTHS,monthOf,newGame,bal,advance,isDisabled,choose,checkEntry,checkJE,linesOf,post,trialBalance,statements,sortItems,checkSort,parseLine,parseNotes,customBusiness,replay,SAMPLE_NOTES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.LedgerPlay=api;
})(typeof globalThis!=='undefined'?globalThis:this);
