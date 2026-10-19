// Final project: run the business for a full year, then adjust, report, close and analyze.
(function(){
const {money:m,bal,netIncome,total,H,r2}=LL;
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],FULL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SEASON=[.8,.8,1,1,1.1,1.2,1.2,1.1,1,1,1.3,1.5],COST=300;
const price=st=>st.ch.price==='premium'?560:500,base=st=>st.ch.price==='premium'?24:30;
const exp=st=>st.ch.expand==='big',hire=st=>st.ch.staff==='hire',promo=st=>st.ch.promo==='big',prepay=st=>st.ch.rent==='prepay';
function units(st,i){let u=Math.round(base(st)*SEASON[i]);if(i>=4&&exp(st))u+=4;if(i>=6&&hire(st))u+=3;if(i>=10&&promo(st))u=Math.round(u*1.3);return u;}
const S=(st,i)=>units(st,i)*price(st),C=(st,i)=>units(st,i)*COST;
const collect=(st,i)=>i===0?6000:S(st,i-1)-(i===5?300:0)-(i===7?250:0),apPay=(st,i)=>i===0?5000:C(st,i-1),wage=(st,i)=>i>=6&&hire(st)?5500:4000;
const newEq=st=>exp(st)?24000:6000,depNew=st=>exp(st)?2000:800,suppUsed=2200;
const je=(sec,when,title,story,task,lines,extra={})=>Object.assign({sec,k:'je',when,title,story,task,lines},extra);
const SPECIAL=[
 je('','JAN 2','Prepay the year\u2019s rent','You pay $12,000 for twelve months of rent, January through December.','Record the rent prepayment.',[['prepaidrent','dr',12000],['cash','cr',12000]],{skip:st=>!prepay(st)}),
 je('','FEB 1','Insurance','You buy a 12-month insurance policy for $2,400 cash, covering February through next January.','Record the policy.',[['prepaidins','dr',2400],['cash','cr',2400]]),
 je('','MAR 12','Supplies','You buy $1,200 of supplies for cash.','Record the purchase.',[['supplies','dr',1200],['cash','cr',1200]]),
 je('','APR 1','Expand your capacity',st=>exp(st)?'You buy $24,000 of equipment, paying $4,000 cash and signing a 6% note for $20,000. Interest is due when the note matures.':'You buy a $6,000 equipment upgrade for cash.','Record the equipment purchase.',st=>exp(st)?[['equip','dr',24000],['cash','cr',4000],['np','cr',20000]]:[['equip','dr',6000],['cash','cr',6000]]),
 je('','MAY 20','A dissatisfied customer',st=>`A ${st.p.client} received a scratched ${st.p.productOne}. You give a $300 allowance off their bill.`,'Record the sales allowance.',[['returns','dr',300],['ar','cr',300]]),
 je('','JUN 30','Mid-year dividend','The board declares and pays a $3,000 cash dividend.','Record the dividend.',[['div','dr',3000],['cash','cr',3000]]),
 je('','JUL 15','A bad account','A customer who owed $250 cannot be found. You write off the account.','Record the write-off.',[['allow','dr',250],['ar','cr',250]]),
 je('','AUG 8','Repairs','You pay $600 for routine equipment maintenance.','Record the repair.',[['repairs','dr',600],['cash','cr',600]]),
 je('','SEP 10','More supplies','You buy $900 of supplies for cash.','Record the purchase.',[['supplies','dr',900],['cash','cr',900]]),
 je('','OCT 1','Holiday marketing',st=>promo(st)?'You launch a $3,000 holiday campaign.':'You run a basic $800 holiday ad.','Record the advertising.',st=>[['adv','dr',promo(st)?3000:800],['cash','cr',promo(st)?3000:800]]),
 je('','NOV 15','Gift cards','You sell $3,000 of gift cards for cash, redeemable for services.','Record the gift card sales.',[['cash','dr',3000],['unearned','cr',3000]]),
 je('','DEC 20','Year-end dividend','The board declares a $4,000 dividend, payable January 15.','Record the declaration.',[['div','dr',4000],['divpay','cr',4000]])
];
const DECIDE={0:{title:'Set up your year',story:st=>`It is January 1. ${st.p.name} sells ${st.p.product} that cost you $300 each, alongside its ${st.p.jobs}. Set your price and decide how to handle rent.`,
  q:st=>[{id:'price',label:'PRICE',opts:[{v:'standard',t:`$500 per ${st.p.productOne}`,d:'About 30 units in a typical month.'},{v:'premium',t:`$560 per ${st.p.productOne}`,d:'About 24 units in a typical month.'}]},{id:'rent',label:'RENT',opts:[{v:'prepay',t:'Prepay $12,000 for the year',d:'Saves $1,200 compared with paying monthly.'},{v:'monthly',t:'Pay $1,100 a month',d:'Keeps more cash available early in the year.'}]}]},
 3:{title:'Second quarter: expand?',story:'Demand is growing. More equipment would let you sell about 4 more units a month.',q:[{id:'expand',label:'EQUIPMENT',opts:[{v:'big',t:'Expand: $24,000 of equipment',d:'$4,000 down, $20,000 on a 6% note. About 4 more units a month.'},{v:'small',t:'Upgrade: $6,000 for cash',d:'No new debt, no added capacity.'}]}]},
 6:{title:'Third quarter: hire?',story:'Your team is stretched thin during the summer peak.',q:[{id:'staff',label:'STAFFING',opts:[{v:'hire',t:'Hire another employee',d:'Monthly wages rise from $4,000 to $5,500. About 3 more units a month.'},{v:'keep',t:'Keep the current team',d:'Wages stay at $4,000 a month.'}]}]},
 9:{title:'Fourth quarter: holiday push',story:'November and December are your biggest months.',q:[{id:'promo',label:'MARKETING',opts:[{v:'big',t:'Run a $3,000 campaign',d:'About 30% more units in November and December.'},{v:'basic',t:'Basic $800 ad',d:'Normal holiday demand.'}]}]}};
const steps=[{sec:'Q1',k:'info',when:'FINAL PROJECT',title:'Run your business for a full year',story:st=>`This project brings the whole course together. You will run ${st.p.name} from January through December, recording four or five transactions each month. Then you will adjust the accounts, prepare all four financial statements, close the books and analyze your year. Your progress saves automatically.`,cta:'Start January'}];
MON.forEach((mo,i)=>{const sec='Q'+(Math.floor(i/3)+1);
 if(DECIDE[i])steps.push(Object.assign({sec,k:'decide',when:FULL[i].toUpperCase()+' 1'},DECIDE[i]));
 steps.push(
  je(sec,mo+' 1–31',`${FULL[i]} sales`,st=>`You sell ${units(st,i)} ${st.p.product} at ${m(price(st))} each, all on account. Each unit cost $300.`,'Record the sales and cost of goods sold in one compound entry.',st=>[['ar','dr',S(st,i)],['cogs','dr',C(st,i)],['sales','cr',S(st,i)],['inv','cr',C(st,i)]],i===0?{why:'Under a perpetual system, every sale also moves the cost of the goods out of inventory.'}:{}),
  je(sec,mo+' 25','Restock',st=>`You reorder the ${units(st,i)} units you sold, on account.`,st=>`Record the ${m(C(st,i))} purchase.`,st=>[['inv','dr',C(st,i)],['ap','cr',C(st,i)]]),
  je(sec,mo+' 1–31','Customer payments',st=>i===0?'Customers pay the $6,000 they owed on January 1.':`Customers pay what they owed from ${FULL[i-1]}${i===5?', less the May allowance':''}${i===7?', except the account you wrote off':''}.`,st=>`Record ${m(collect(st,i))} of collections.`,st=>[['cash','dr',collect(st,i)],['ar','cr',collect(st,i)]]),
  je(sec,mo+' 30','Pay the month\u2019s bills',st=>`You pay ${i===0?'the $5,000 owed to suppliers at January 1':`last month\u2019s ${m(apPay(st,i))} supplier invoice`}, wages of ${m(wage(st,i))}, utilities of $400${prepay(st)?'':' and rent of $1,100'}.`,'Record all of the payments in one compound entry.',st=>[['ap','dr',apPay(st,i)],['wages','dr',wage(st,i)],['util','dr',400],...(prepay(st)?[]:[['rent','dr',1100]]),['cash','cr',r2(apPay(st,i)+wage(st,i)+400+(prepay(st)?0:1100))]]),
  Object.assign({},SPECIAL[i],{sec}));
 if(i===5)steps.push({sec,k:'num',when:'JUN 30',title:'Mid-year check-in',story:'Your banker asks for a quick update.',fields:st=>[{id:'c',label:'Cash balance',ans:bal(st,'cash')},{id:'ni',label:'Net income so far',ans:netIncome(st)}]});
});
const intAcc=st=>exp(st)?900:0,arEnd=st=>bal(st,'ar'),req=st=>r2(S(st,11)*.03);
steps.push(
 {sec:'Year-end',k:'num',when:'DEC 31',title:'Year-end calculations',story:st=>`A count shows $700 of supplies on hand. Your original $40,000 of equipment is depreciated over 10 years. The ${m(newEq(st))} added April 1 is depreciated over ${exp(st)?8:5} years. Neither has a residual value.`,
  fields:st=>[{id:'s',label:'Supplies used',ans:suppUsed},{id:'i',label:'Insurance used (Feb\u2013Dec)',ans:2200},{id:'d',label:'Total depreciation',ans:4000+depNew(st),hint:'$4,000 on the original equipment plus 9 months on the new equipment.'}]},
 je('Year-end','DEC 31','Supplies used','Record supplies used.','Record $2,200 of supplies expense.',[['suppliesexp','dr',2200],['supplies','cr',2200]]),
 je('Year-end','DEC 31','Insurance used','Record insurance expense.','Record $2,200 of insurance expense.',[['insexp','dr',2200],['prepaidins','cr',2200]]),
 je('Year-end','DEC 31','Rent used','The prepaid year is fully used.','Record $12,000 of rent expense.',[['rent','dr',12000],['prepaidrent','cr',12000]],{skip:st=>!prepay(st)}),
 je('Year-end','DEC 31','Depreciation','Record the year\u2019s depreciation.',st=>`Record ${m(4000+depNew(st))} of depreciation.`,st=>[['depexp','dr',4000+depNew(st)],['adep','cr',4000+depNew(st)]]),
 je('Year-end','DEC 31','Interest owed','Interest on the $20,000, 6% note has built up since April 1.','Accrue nine months of interest.',[['intexp','dr',900],['intpay','cr',900]],{skip:st=>!exp(st)}),
 je('Year-end','DEC 31','Gift cards redeemed','Customers redeemed $1,800 of gift cards for services in December.','Record the revenue earned.',[['unearned','dr',1800],['rev','cr',1800]]),
 je('Year-end','DEC 31','Unpaid wages',st=>`Your team earned ${m(wage(st,11)/4)} in the last week of December, payable in January.`,'Accrue the wages.',st=>[['wages','dr',wage(st,11)/4],['wagespay','cr',wage(st,11)/4]]),
 {sec:'Year-end',k:'num',when:'DEC 31',title:'Bad debts',story:'You estimate 3% of ending receivables will not be collected.',fields:st=>[{id:'r',label:'Required allowance',ans:req(st)},{id:'a',label:'Adjustment needed',ans:r2(req(st)-bal(st,'allow'))}]},
 je('Year-end','DEC 31','Record bad debts','Bring the allowance to its required balance.',st=>`Record ${m(req(st)-bal(st,'allow'))} of bad debt expense.`,st=>[['bde','dr',r2(req(st)-bal(st,'allow'))],['allow','cr',r2(req(st)-bal(st,'allow'))]]),
 {sec:'Statements',k:'num',title:'Adjusted trial balance',story:'Prepare the adjusted trial balance.',html:st=>H.tb(st,'Adjusted trial balance, December 31',{hide:true}),fields:st=>[{id:'t',label:'Total debits (and credits)',ans:H.tbTotals(st)}]},
 {sec:'Statements',k:'num',title:'Income statement',story:'Prepare the income statement for the year.',fields:st=>{const ns=r2(bal(st,'sales')-bal(st,'returns'));return [{id:'ns',label:'Net sales',ans:ns},{id:'gm',label:'Gross margin',ans:r2(ns-bal(st,'cogs'))},{id:'ni',label:'Net income',ans:netIncome(st)}];}},
 {sec:'Statements',k:'num',title:'Statement of retained earnings',story:'Beginning retained earnings were $30,500.',fields:st=>[{id:'re',label:'Ending retained earnings',ans:r2(30500+netIncome(st)-bal(st,'div'))}]},
 {sec:'Statements',k:'num',title:'Balance sheet',story:'Prepare the December 31 balance sheet.',fields:st=>[{id:'ca',label:'Total current assets',ans:r2(bal(st,'cash')+bal(st,'ar')-bal(st,'allow')+bal(st,'inv')+bal(st,'supplies')+bal(st,'prepaidins')+bal(st,'prepaidrent'))},{id:'a',label:'Total assets',ans:r2(total(st,['A'])-total(st,['XA']))},{id:'l',label:'Total liabilities',ans:total(st,['L'])},{id:'se',label:'Total stockholders\u2019 equity',ans:r2(40000+30500+netIncome(st)-bal(st,'div'))}]},
 {sec:'Statements',k:'num',title:'Statement of cash flows',story:'Cash was $25,000 on January 1. Use your Cash T account and the year\u2019s transactions.',fields:st=>{const inv=-(exp(st)?4000:6000),fin=-3000,chg=r2(bal(st,'cash')-25000);return [{id:'i',label:'Net cash from investing activities',ans:inv},{id:'f',label:'Net cash from financing activities',ans:fin,hint:'Only the June dividend was paid in cash. The note was a noncash financing of equipment.'},{id:'o',label:'Net cash from operating activities',ans:r2(chg-inv-fin),hint:'Net change in cash minus investing and financing.'}];}},
 {sec:'Statements',k:'num',title:'Analyze your year',story:'All liabilities are current except the note payable. Round ratios to two decimals and percentages to one decimal.',fields:st=>{const ca=bal(st,'cash')+bal(st,'ar')-bal(st,'allow')+bal(st,'inv')+bal(st,'supplies')+bal(st,'prepaidins')+bal(st,'prepaidrent'),cl=total(st,['L'])-bal(st,'np'),ns=bal(st,'sales')-bal(st,'returns');
   return [{id:'cr',label:'Current ratio',pct:': 1',tol:.011,ans:r2(ca/cl)},{id:'gm',label:'Gross margin percentage',pct:'%',tol:.051,ans:Math.round((ns-bal(st,'cogs'))/ns*1000)/10}];}},
 {sec:'Close',k:'je',when:'DEC 31',title:'Close revenues',story:'Begin closing the books.',task:'Close all revenue accounts to Retained Earnings.',lines:st=>H.closing(st).rev},
 {sec:'Close',k:'je',when:'DEC 31',title:'Close expenses',story:'Close every expense and contra-revenue account.',task:'Close all expenses to Retained Earnings.',lines:st=>H.closing(st).exp},
 {sec:'Close',k:'je',when:'DEC 31',title:'Close dividends',story:'Close Dividends.',task:'Close Dividends to Retained Earnings.',lines:st=>H.closing(st).div},
 {sec:'Close',k:'num',title:'Post-closing trial balance',story:'Only permanent accounts remain.',fields:st=>[{id:'re',label:'Retained Earnings',ans:bal(st,'re')},{id:'t',label:'Total debits',ans:H.tbTotals(st)}]},
 {sec:'Analyze',k:'mc',title:'Your biggest lever',story:'Look back at your four decisions.',q:'Which statement best describes how operating decisions reached your financial statements?',o:['Every decision changed specific journal entries, which flowed into the ledger and the statements','Only the year-end adjustments affected the statements','Decisions affect cash but never net income'],a:0,hint:'Trace a decision through your entries.',why:'Accounting records the results of business decisions. That is why managers need to understand it.'}
);
const cap={id:'capstone',unit:'FINAL PROJECT',cum:true,final:true,n:'FINAL',t:'Your First Full Year',mins:'120–150',topics:['Full accounting cycle','12 months of transactions','Four statements and analysis'],
 blurb:'Run your business from January to December, then adjust, prepare all four statements, close the books and analyze the year.',
 summary:'The cumulative final project. Students make four quarterly business decisions and record four to five transactions every month (about 60 entries), then complete year-end adjustments, the adjusted trial balance, income statement, statement of retained earnings, balance sheet, statement of cash flows, closing entries, post-closing trial balance and ratio analysis.',
 accounts:['cash','ar','allow','inv','supplies','prepaidrent','prepaidins','equip','adep','ap','wagespay','intpay','unearned','divpay','np','cs','apic','re','div','sales','rev','returns','cogs','wages','util','rent','adv','repairs','suppliesexp','insexp','depexp','intexp','bde'],
 defaults:{price:'standard',rent:'prepay',expand:'big',staff:'hire',promo:'big'},
 open:{cash:25000,ar:6000,allow:300,inv:12000,supplies:800,equip:40000,adep:8000,ap:5000,cs:30000,apic:10000,re:30500},
 steps,
 report:st=>H.table(st.p.name,'Year in review',[['Net sales',r2(bal(st,'sales')-bal(st,'returns'))],['Cost of goods sold',-bal(st,'cogs'),'in'],['Gross margin',r2(bal(st,'sales')-bal(st,'returns')-bal(st,'cogs')),'tt'],['Ending cash',bal(st,'cash')],['Ending retained earnings',bal(st,'re'),'tt']]),
 recap:st=>[`Pricing at ${m(price(st))} sold ${MON.reduce((t,_,i)=>t+units(st,i),0)} units during the year.`,prepay(st)?'Prepaying rent saved $1,200.':'Paying rent monthly cost $1,200 more but kept cash flexible.',exp(st)?'The expansion added capacity, financed partly with a $20,000 note.':'The small upgrade avoided debt.',hire(st)?'Hiring added summer and holiday capacity.':'Keeping the team small held wages down.',`You closed the year with ${m(bal(st,'re'))} of retained earnings.`]
};
LL.lessons.push(cap);
})();
