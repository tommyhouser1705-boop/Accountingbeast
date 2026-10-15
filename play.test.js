const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('./play-engine.js');
function clone(g){return {...g,led:JSON.parse(JSON.stringify(g.led)),flags:{...g.flags},status:g.status.slice(),decisions:g.decisions.slice()};}
const rowsFor=e=>P.linesOf(e).map(([a,s,x])=>({a,d:s==='dr'?String(x):'',c:s==='cr'?String(x):''}));
function explore(biz,onEnd){let paths=0;const walk=g=>{const ev=P.advance(g);if(!ev){paths++;onEnd(g);return;}let playable=false;
 ev.choices.forEach((c,k)=>{const ns=c.qty?[...new Set([c.qty.min,c.qty.def,c.qty.max])]:[undefined];ns.forEach(n=>{if(P.isDisabled(g,c,n))return;playable=true;const h=clone(g);h.ev=ev;const picked=P.choose(h,k,n);assert.ok(picked);
  if(picked.entry){assert.equal(P.checkJE(h,rowsFor(picked.entry)).ok,true);P.post(h,0);assert.ok(P.bal(h,'cash')>=0,biz.id+' cash went negative at '+biz.events[h.i].when);}walk(h);});});
 assert.ok(playable,biz.id+' has no playable choice at '+biz.events[g.i].when);};walk(P.newGame(biz));return paths;}
for(const biz of P.BUSINESSES){
 test(biz.name+': every decision path balances, stays short, and turns a profit',()=>{let min=99,max=0,yearEnd=0,minNI=1e9;const paths=explore(biz,g=>{const tb=P.trialBalance(g);assert.equal(Math.round(tb.debits),Math.round(tb.credits));const s=P.statements(g);assert.equal(Math.round(s.totalAssets),Math.round(s.totalLE));assert.equal(s.netIncome,s.totalRev-s.totalExp);min=Math.min(min,g.rec);max=Math.max(max,g.rec);minNI=Math.min(minNI,s.netIncome);
  const placed={};P.sortItems(g).forEach(id=>placed[id]=P.sectionOf(id));assert.deepEqual(P.checkSort(g,placed),{missing:[],wrong:[]});for(const id in g.led)assert.ok(biz.accounts.includes(id));yearEnd=Math.max(yearEnd,g.biz.events.filter((e,i)=>e.yearEnd&&g.status[i]==='done').length);});
  assert.ok(paths>20,'expected many distinct playthroughs');assert.ok(min>=6&&max<=12,'entries per playthrough '+min+'-'+max);assert.ok(yearEnd>=3,'year-end adjustments');assert.ok(minNI>0,'worst path net income '+minNI);});
}
test('journal entry feedback is specific',()=>{const g=P.newGame(P.BUSINESSES[0]);P.advance(g);P.choose(g,0);
 assert.match(P.checkEntry(g,'capital','cash').text,/wrong sides/);
 assert.match(P.checkEntry(g,'supplies','capital').text,/doesn't belong/);
 assert.match(P.checkEntry(g,'cash','sales').text,/Missing a credit/);
 assert.equal(P.checkEntry(g,'cash',null).kind,'warn');
 assert.equal(P.checkEntry(g,'cash','capital').ok,true);
 assert.match(P.checkJE(g,[{a:'cash',d:'20000'},{a:'capital',c:'2000'}]).text,/must equal/);
 assert.match(P.checkJE(g,[{a:'cash',d:'15,000'},{a:'capital',c:'15000'}]).text,/check the amount/);
 assert.match(P.checkJE(g,[{a:'',d:'20000'},{a:'capital',c:'20000'}]).text,/Pick an account/);
 assert.match(P.checkJE(g,[{a:'cash',d:'20000',c:'20000'},{a:'capital',c:'20000'}]).text,/one column/);
 assert.equal(P.checkJE(g,[{a:'cash',d:'$20,000'},{a:'capital',c:'20000.00'},{a:'',d:'',c:''}]).ok,true);});
test('compound entries are checked and posted line by line',()=>{const g=P.replay(P.BUSINESSES[1],[{k:0,tries:0}]);const ev=P.advance(g);assert.equal(ev.title,'Tools and repair stands');const c=P.choose(g,1);assert.equal(P.linesOf(c.entry).length,3);
 const r=P.checkJE(g,[{a:'equip',d:'9000'},{a:'cash',c:'9000'}]);assert.match(r.text,/Missing a credit/);assert.match(r.text,/check the amount/);
 assert.equal(P.checkJE(g,rowsFor(c.entry)).ok,true);P.post(g,0);assert.equal(P.bal(g,'ap'),4500);assert.equal(P.bal(g,'cash'),13500);});
test('choices that need more cash than the business has are locked',()=>{const g=P.replay(P.BUSINESSES[0],[{k:1,tries:0},{k:1,tries:0},{k:0,tries:0}]);const ev=P.advance(g);assert.equal(ev.title,'Signing the lease');assert.equal(P.isDisabled(g,ev.choices[0]),true);assert.equal(P.choose(g,0),null);});
test('quantity decisions preview expected sales and clamp to the allowed range',()=>{const g=P.replay(P.BUSINESSES[0],[{k:0},{k:0},{k:0},{k:0},{k:0}].map(s=>({...s,tries:0})));const ev=P.advance(g);assert.equal(ev.title,'Stock up for the year');const q=ev.choices[0].qty;
 assert.deepEqual(q.preview(13).find(r=>r[0]==='Expected sales').slice(0,2),['Expected sales','$52,000']);assert.equal(q.preview(18).find(r=>r[0]==='Leftover at year-end')[1],'$3,600');
 const c=P.choose(g,0,99);assert.deepEqual(c.entry,['supplies','ap',18*900]);assert.equal(g.flags.units,18000);});
test('statement sorting reports wrong and missing accounts',()=>{const g=P.replay(P.BUSINESSES[0],[{k:0,tries:0},{k:0,tries:0},{k:0,tries:0}]);const r=P.checkSort(g,{cash:'bs-liab',equip:'bs-assets'});assert.deepEqual(r.wrong,['cash']);assert.ok(r.missing.includes('capital')&&r.missing.includes('note'));});
test('replay restores progress, quantities and first-try score',()=>{const g=P.replay(P.BUSINESSES[1],[{k:0,tries:0},{k:1,tries:2},{k:0,tries:0},{k:1,tries:0},{k:0,n:14,tries:0}]);assert.equal(g.rec,4);assert.equal(g.first,3);assert.equal(P.bal(g,'cash'),18000-4500-9720);assert.equal(P.bal(g,'ap'),4500+14*1500);assert.equal(g.flags.dep,1800);assert.equal(g.flags.price,85);});
test('sample course notes become a playable year with an answer key',()=>{const lines=P.parseNotes(P.SAMPLE_NOTES);assert.equal(lines.length,10);assert.ok(lines.every(l=>l.ok),JSON.stringify(lines.filter(l=>!l.ok)));
 assert.deepEqual(lines.map(l=>l.dr+'/'+l.cr),['cash/capital','cash/note','equip/ap','prepaid/cash','cash/sales','cash/unearned','ap/cash','wages/cash','draws/cash','depexp/accdep']);
 const biz=P.customBusiness('Maple Street Bikes',lines);const g=P.newGame(biz);while(P.advance(g)){P.choose(g,0);P.post(g,0);}const s=P.statements(g);assert.equal(s.netIncome,22000-9000-1200);assert.equal(Math.round(s.totalAssets),Math.round(s.totalLE));
 assert.equal(P.parseLine('Hosted a meeting').ok,false);assert.equal(P.parseLine('Bought something nice for $30').ok,false);});
