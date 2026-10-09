import {createRequire} from 'node:module';
import {generateCourseAssignment} from '../supabase/functions/classroom/generator.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js');
try{
 const {notesPdf,suppliesPages}=require('../test-fixtures/notes-pdf.cjs');
 const canvas=require('@napi-rs/canvas');globalThis.DOMMatrix=canvas.DOMMatrix;globalThis.Path2D=canvas.Path2D;globalThis.ImageData=canvas.ImageData;
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=pdfjs.getDocument({data:new Uint8Array(notesPdf(suppliesPages)),isEvalSupported:false});
 const pdf=await task.promise;let notes='';try{for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),text=await page.getTextContent();notes+=text.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n';}}finally{await task.destroy();}
 if(!notes.includes('January 1, 2022')||!notes.includes('Supplies Used'))throw Error('PDF note extraction failed.');
 notes+='\nYou are the bookkeeper for Haslam Company. This is a textbook example, not the student business.\n';
 const input={notes,year:2026,month:11,depth:'focused',timelineMode:'auto',report:'topic',request:'Practice supplies purchases, supplier payments, and supplies used. Students should choose items and quantities for their own business. Use two months to compare the monthly supplies counts and a later supplier payment.'};
 const first=await generateCourseAssignment(L,{...input,phase:'draft'},{key:process.env.LEDGER_AI_API_KEY});
 const a=await generateCourseAssignment(L,{...input,phase:'review',draft:first.draft},{key:process.env.LEDGER_AI_API_KEY});
 if(a.version!==3||!a.interactive||!L.checkAssignment(a)||/Haslam|bookkeeper/i.test(a.instructions)||!(a.periodMonths>=2&&a.periodMonths<=4)||!a.interactive.events.every(e=>e.date>=L.day(a,1)&&e.date<=L.finalDate(a)))throw Error('The generated PDF assignment did not match the selected period and stages.');
 const business={name:'Tommy Coffee',type:'Coffee shop'},choice=L.decisions.defaultChoice(a,business),scenario=L.expected(a,choice,business);if(!a.interactive.controls.some(c=>c.kind==='basket'&&c.category==='supplies')||!scenario.events.some(e=>e.detail.document.fields.some(f=>f.value.includes('Coffee beans'))))throw Error('The assignment did not use the coffee-shop order catalog: '+JSON.stringify(a.interactive.controls.map(c=>({kind:c.kind,category:c.category}))));if(Array.from({length:a.periodMonths},(_,i)=>i).some(m=>!a.interactive.controls.some(c=>c.monthOffset===m)))throw Error('A month has no student business decision.');if(!scenario.events.length)throw Error('The business decisions did not create records.');
 const revised=await generateCourseAssignment(L,{...input,phase:'revise',currentDraft:a,request:'Keep the topics and months. Make the instructions simpler and guide students through ordering supplies, recording the invoice, choosing a payment date after seeing the invoice, and recording the payment.'},{key:process.env.LEDGER_AI_API_KEY});
 if(revised.published||!L.checkAssignment(revised)||!revised.interactive.controls.some(c=>c.kind==='date'&&(c.decisionStage||0)>0)||new Set(revised.topicCoverage.map(c=>c.topicIndex)).size<Math.ceil(revised.teachingTopics.length*.75))throw Error('The professor revision did not produce a checked, guided draft with sufficient topic coverage.');
 console.log('AI professor revision passed: unpublished draft, follow-up payment date and at least 75% topic coverage.');
 console.log('AI PDF check passed: topic extraction excludes Haslam; a new owner-led assignment uses student decisions, an automatic multi-month timeline, dated records, and balanced entries across business types.');
}catch(e){console.error(e.message);console.log('::error::'+String(e.message).replace(/[\r\n]/g,' ').replaceAll('::',':'));process.exitCode=1;}
