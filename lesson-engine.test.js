const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('./lesson-engine');
function a(topic){return {version:1,id:'test-'+topic,title:'Test lesson',topic,instructions:'Practice the topic',course:'Intro',year:2026,month:9,support:'guided',notes:''};}
function journal(s){return Object.fromEntries(s.events.map(e=>[e.id,{date:e.date,rows:[{account:e.debit,debit:e.amount,credit:0},{account:e.credit,debit:0,credit:e.amount}]}]));}
test('rent choices change future benefits without changing the lesson objective',()=>{const one=L.expected(a('prepaid'),{location:1,months:1}),six=L.expected(a('prepaid'),{location:1,months:6});assert.equal(one.events[0].amount,250);assert.equal(six.events[0].amount,1500);assert.equal(one.events[1].amount,six.events[1].amount);assert.equal(L.balances(six,journal(six))['Prepaid Rent'],1250);});
test('receivable collection does not earn revenue twice',()=>{const s=L.expected(a('receivables'),{order:2,collection:1}),b=L.balances(s,journal(s));assert.equal(b['Sales Revenue'],-1000);assert.equal(b['Accounts Receivable'],500);assert.equal(b.Cash,8500);});
test('depreciation is noncash and uses selected useful life',()=>{const s=L.expected(a('equipment'),{level:2,life:1}),b=L.balances(s,journal(s));assert.equal(s.events[1].amount,30);assert.equal(b.Cash,6200);assert.equal(b['Accumulated Depreciation'],-30);});
test('episodes reset their balances instead of carrying earlier work',()=>{const x=L.expected(a('capital'),{investment:0,ad:2}),y=L.expected(a('prepaid'),{location:0,months:3});assert.equal(L.balances(x,journal(x)).Cash,2800);assert.equal(y.opening,8000);assert.equal(L.balances(y,{}).Cash,8000);});
test('assessment separates date, account choice, amounts and corrections',()=>{const s=L.expected(a('prepaid'),{location:0,months:3}),e=s.events[0],rows=journal(s)[e.id].rows;assert.equal(L.assess(rows,'2026-09-02',e).date,false);assert.equal(L.assess(rows,e.date,e).correct,true);const wrong=[{account:'Rent Expense',debit:450,credit:0},{account:'Cash',debit:0,credit:450}];assert.equal(L.validateRows(wrong),null);assert.equal(L.assess(wrong,e.date,e).account,false);const run={scenario:s,first:{payment:L.assess(wrong,e.date,e),adjustment:L.assess(journal(s).adjustment.rows,s.events[1].date,s.events[1])},predictionFirst:0,effectsFirst:{expense:150,remaining:300,cash:7550}};assert.equal(L.grade(run).journal,53);assert.equal(L.grade(run).effects,15);});
test('imports reject unsupported topics, dates and oversized material',()=>{assert.equal(L.checkAssignment(a('prepaid')),true);assert.equal(L.checkAssignment({...a('prepaid'),month:13}),false);assert.equal(L.checkAssignment({...a('prepaid'),topic:'made-up'}),false);assert.equal(L.checkAssignment({...a('prepaid'),topic:'constructor'}),false);assert.equal(L.checkAssignment({...a('prepaid'),id:''}),false);assert.equal(L.checkAssignment({...a('prepaid'),notes:'x'.repeat(30001)}),false);});

test('the reported supplies count grades the supported entry even when an old AI key names the wrong accounts',()=>{
 const e={id:'evt2',date:'2026-01-31',document:{layout:'count',fields:[{label:'Supplies on hand at month-end (cost)',value:'$269.60'},{label:'Supplies used during month (cost)',value:'$404.40'},{label:'Original supplies purchased (cost)',value:'$674.00'}]},lines:[{account:'Supplies',debit:404.4,credit:0},{account:'Cash',debit:0,credit:404.4}]};
 const rows=[{account:'Supplies Expense',debit:404.4,credit:0},{account:'Supplies',debit:0,credit:404.4}];
 assert.equal(L.assess(rows,e.date,e).correct,true);
 assert.equal(L.assess(e.lines,e.date,e).correct,false);
 assert.equal(L.assess(rows,'2026-01-30',e).correct,false);
 assert.equal(L.assess(rows.map(r=>({...r,debit:r.debit?269.6:0,credit:r.credit?269.6:0})),e.date,e).correct,false);
 const s={accountList:['Cash','Supplies'],accountDefinitions:[{name:'Cash',type:'asset'},{name:'Supplies',type:'asset'}],openingBalances:[{account:'Supplies',debit:674,credit:0},{account:'Owner Capital',debit:0,credit:674}],events:[e]};
 L.expandAccountChoices(s);assert.deepEqual(e.lines,rows);
 const t=L.trialBalance(s,{evt2:{rows,date:e.date}});assert.equal(t.balanced,true);assert.equal(t.assets,269.6);assert.equal(t.equity,269.6);
});
test('count grading never treats physical units, a purchase or unrelated expense as supplies used',()=>{
 const e={date:'2026-01-31',document:{layout:'count',fields:[{label:'Supplies used during month (quantity)',value:'404'}]},lines:[]};
 assert.equal(L.decisions.suppliesCountLines(e),null);
 e.document.fields=[{label:'Supplies used during month (cost)',value:'$0.00'}];assert.deepEqual(L.decisions.suppliesCountLines(e),[]);assert.equal(L.assess([],e.date,e).correct,true);
 e.document.layout='invoice';assert.equal(L.decisions.suppliesCountLines(e),null);
});

test('reports are book-review tools, not transactions, points, or required journal submissions',()=>{
 for(const title of ['Trial Balance Prepared','Prepare financial statements','Posting to T accounts','Review general ledger','January balance sheet','Income statement prepared'])assert.equal(L.isReportEvent({title}),true,title);
 for(const title of ['Supplies count','Month-end rent adjustment','Correcting entry after trial balance error','Closing entries for income statement accounts','Customer sales report','Supplier quotation'])assert.equal(L.isReportEvent({title}),false,title);
 const report={id:'evt5',title:'Trial Balance Prepared',date:'2026-01-31',stage:2,lines:[{account:'Cash',debit:5,credit:0},{account:'Common Stock',debit:0,credit:5}]},transaction={id:'purchase',title:'Supplies delivered',date:'2026-01-02',stage:0,lines:[{account:'Supplies',debit:100,credit:0},{account:'Cash',debit:0,credit:100}]};
 const scenario={accountList:['Cash','Common Stock','Supplies'],accountDefinitions:[{name:'Cash',type:'asset'},{name:'Common Stock',type:'equity'},{name:'Supplies',type:'asset'}],openingBalances:[{account:'Cash',debit:1000,credit:0},{account:'Common Stock',debit:0,credit:1000}],events:[transaction,report]},run={assignment:{version:3},scenario,stage:2,entries:{purchase:{date:transaction.date,rows:transaction.lines}},first:{}};
 assert.equal(L.grade(run).journal,100);assert.deepEqual(L.availableEvents(run).map(e=>e.id),['purchase']);
 L.expandAccountChoices(scenario);assert.deepEqual(scenario.events.map(e=>e.id),['purchase']);assert.deepEqual(scenario.reviewRecordIds,['evt5']);run.entries.evt5={date:report.date,rows:report.lines};assert.equal(L.balances(scenario,run.entries).Cash,900);
});
