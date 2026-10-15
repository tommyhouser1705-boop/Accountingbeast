const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('./play-engine.js');
function clone(g){return {...g,led:JSON.parse(JSON.stringify(g.led)),flags:{...g.flags},status:g.status.slice(),decisions:g.decisions.slice()};}
function explore(biz,onEnd){let paths=0;const walk=g=>{const ev=P.advance(g);if(!ev){paths++;onEnd(g);return;}ev.choices.forEach((c,k)=>{if(P.isDisabled(g,c))return;const h=clone(g);h.ev=ev;const picked=P.choose(h,k);assert.ok(picked);if(picked.entry){const r=P.checkEntry(h,picked.entry[0],picked.entry[1]);assert.equal(r.ok,true);P.post(h,0);assert.ok(P.bal(h,'cash')>=0,biz.id+' cash went negative at '+biz.events[h.i].when);}walk(h);});assert.ok(ev.choices.some(c=>!P.isDisabled(g,c)),biz.id+' has no playable choice at '+biz.events[g.i].when);};walk(P.newGame(biz));return paths;}
for(const biz of P.BUSINESSES){
 test(biz.name+': every decision path balances and produces consistent statements',()=>{let min=99,max=0,yearEnd=0;const paths=explore(biz,g=>{const tb=P.trialBalance(g);assert.equal(Math.round(tb.debits),Math.round(tb.credits));const s=P.statements(g);assert.equal(Math.round(s.totalAssets),Math.round(s.totalLE));assert.equal(s.netIncome,s.totalRev-s.totalExp);min=Math.min(min,g.rec);max=Math.max(max,g.rec);const placed={};P.sortItems(g).forEach(id=>placed[id]=P.sectionOf(id));assert.deepEqual(P.checkSort(g,placed),{missing:[],wrong:[]});yearEnd=Math.max(yearEnd,g.biz.events.filter((e,i)=>e.yearEnd&&g.status[i]==='done').length);});
  assert.ok(paths>50,'expected many distinct playthroughs');assert.ok(min>=10&&max<=24,'entries per year '+min+'-'+max);assert.ok(yearEnd>=4,'year-end adjustments');});
 test(biz.name+': every account used in the story appears on the board',()=>{explore(biz,g=>{for(const id in g.led)assert.ok(biz.accounts.includes(id));});});
}
test('feedback distinguishes swapped sides, one wrong side, and both wrong',()=>{const g=P.newGame(P.BUSINESSES[0]);P.advance(g);P.choose(g,0);
 assert.match(P.checkEntry(g,'capital','cash').text,/wrong sides/);
 assert.match(P.checkEntry(g,'supplies','capital').text,/Credit side is right/);
 assert.match(P.checkEntry(g,'cash','sales').text,/Debit side is right/);
 assert.match(P.checkEntry(g,'supplies','ap').text,/Both sides/);
 assert.equal(P.checkEntry(g,'cash',null).kind,'warn');
 assert.equal(P.checkEntry(g,'cash','capital').ok,true);});
test('choices that need more cash than the business has are locked',()=>{const g=P.newGame(P.BUSINESSES[0]);P.advance(g);P.choose(g,1);P.post(g,0);P.advance(g);P.choose(g,1);P.advance(g);P.choose(g,0);P.post(g,0);const ev=P.advance(g);assert.equal(ev.title,'Signing the lease');assert.equal(P.isDisabled(g,ev.choices[0]),true);assert.equal(P.choose(g,0),null);});
test('statement sorting reports wrong and missing accounts',()=>{const g=P.replay(P.BUSINESSES[0],[{k:0,tries:0},{k:0,tries:0},{k:0,tries:0}]);const placed={cash:'bs-liab',equip:'bs-assets'};const r=P.checkSort(g,placed);assert.deepEqual(r.wrong,['cash']);assert.ok(r.missing.includes('capital')&&r.missing.includes('note'));});
test('replay restores progress and first-try score',()=>{const g=P.replay(P.BUSINESSES[1],[{k:0,tries:0},{k:1,tries:2},{k:0,tries:0}]);assert.equal(g.rec,3);assert.equal(g.first,2);assert.equal(P.bal(g,'note'),14000);assert.equal(g.flags.dep,3800);});
test('sample course notes become a playable year with an answer key',()=>{const lines=P.parseNotes(P.SAMPLE_NOTES);assert.equal(lines.length,10);assert.ok(lines.every(l=>l.ok),JSON.stringify(lines.filter(l=>!l.ok)));
 assert.deepEqual(lines.map(l=>l.dr+'/'+l.cr),['cash/capital','cash/note','equip/ap','prepaid/cash','cash/sales','cash/unearned','ap/cash','wages/cash','draws/cash','depexp/accdep']);
 const biz=P.customBusiness('Maple Street Bikes',lines);const g=P.newGame(biz);while(P.advance(g)){P.choose(g,0);P.post(g,0);}const s=P.statements(g);assert.equal(s.netIncome,22000-9000-1200);assert.equal(Math.round(s.totalAssets),Math.round(s.totalLE));
 assert.equal(P.parseLine('Hosted a meeting').ok,false);assert.equal(P.parseLine('Bought something nice for $30').ok,false);});
