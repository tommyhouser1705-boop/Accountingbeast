const {scenarioDraft,topicDraft}=require('./interactive-assignment.cjs');
function multimonthDraft(){const a=scenarioDraft();a.events.find(e=>e.id==='supplier-payment').date='2026-10-05';const last=structuredClone(a.events.find(e=>e.id==='supplies-count'));last.id='october-count';last.date='2026-10-31';last.document.fields[0].value=last.date;last.document.fields[1].value='{{money:decision1*0.2}}';last.lines[0].formula='decision1*0.2';last.lines[1].formula='decision1*0.2';a.events.push(last);return a;}
function multimonthTopics(){return {...topicDraft(),timeline:{startMonth:9,months:2,reason:'Two months show supplies used and the later supplier payment.'}};}
module.exports={multimonthDraft,multimonthTopics};
