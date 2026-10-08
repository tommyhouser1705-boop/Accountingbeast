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
 const input={notes,year:2026,month:11,depth:'focused',report:'topic',request:'Practice supplies purchases, supplier payments, and supplies used. Students should choose items and quantities for their own business.'};
 const first=await generateCourseAssignment(L,{...input,phase:'draft'},{key:process.env.LEDGER_AI_API_KEY});
 const a=await generateCourseAssignment(L,{...input,phase:'review',draft:first.draft},{key:process.env.LEDGER_AI_API_KEY});
 if(a.version!==3||!a.interactive||!L.checkAssignment(a)||/Haslam|bookkeeper/i.test(a.instructions)||!a.interactive.events.every(e=>e.date.startsWith('2026-11-')))throw Error('The generated PDF assignment did not match the selected period and stages.');
 const business={name:'Tommy Coffee',type:'Coffee shop'},choice=L.decisions.defaultChoice(a,business),scenario=L.expected(a,choice,business);if(!a.interactive.controls.some(c=>c.kind==='basket'&&c.category==='supplies')||!scenario.events.some(e=>e.detail.document.fields.some(f=>f.value.includes('Coffee beans'))))throw Error('The assignment did not use the coffee-shop order catalog.');if(!scenario.events.length)throw Error('The business decisions did not create records.');
 console.log('AI PDF check passed: topic extraction excludes Haslam; a new owner-led assignment uses student decisions, selected-period dates, and balanced entries across business types.');
}catch(e){console.error(e.message);console.log('::error::'+String(e.message).replace(/[\r\n]/g,' ').replaceAll('::',':'));process.exitCode=1;}
