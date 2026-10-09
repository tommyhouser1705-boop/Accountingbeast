import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateCourseAssignment} from '../supabase/functions/classroom/generator.mjs';
import {checkStudentBrowser} from './check-student-browser.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js'),f=require('../test-fixtures/interactive-assignment.cjs');let calls=0;
// A deliberately corrupt private key reproduces the reported false negative.
// Fixtures are fictional; this test needs neither AI credits nor a live account.
const assignment=L.enableSimulation(await generateCourseAssignment(L,{notes:'Supplies bought on credit, supplier payments and supplies used at month-end.',year:2026,month:9,depth:'focused'},{key:'fixture',fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(++calls===1?f.topicDraft():f.scenarioDraft())}}]})})}));
const count=assignment.interactive.events.find(e=>e.id==='supplies-count');
count.document.fields.push({label:'Supplies used during month (cost)',value:'{{money:decision1*.6}}'});
count.lines=[{account:'Supplies',side:'debit',formula:'decision1*.6'},{account:'Cash',side:'credit',formula:'decision1*.6'}];
assignment.interactive.events.push({id:'evt5',title:'Trial Balance Prepared',date:'2026-09-30',stage:2,document:{layout:'schedule',issuer:'{{business}}',status:'CONFIRMED',fields:[{label:'Trial balance includes all account balances after posting',value:''},{label:'All debits and credits should match',value:''},{label:'Check Cash, Supplies and Common Stock totals',value:''}]},lines:[{account:'Cash',side:'debit',formula:'500'},{account:'Sales Revenue',side:'credit',formula:'500'}]});
const business={name:"Tommy's Coffee",type:'Coffee shop'},choice=L.decisions.defaultChoice(assignment,business);choice.decision1={beans:10,cups:8,filters:10};
const corrected=L.expected(assignment,choice,business).events.find(e=>e.id===count.id);
assert.ok(!L.expected(assignment,choice,business).events.some(e=>e.id==='evt5'));
assert.deepEqual(corrected.lines,[{account:'Supplies Expense',debit:404.4,credit:0},{account:'Supplies',debit:0,credit:404.4}]);
await checkStudentBrowser(assignment,'count-key-regression');
