import {createRequire} from 'node:module';
import {generateCourseAssignment} from '../supabase/functions/classroom/generator.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js');
try{
 const {notesPdf}=require('../test-fixtures/notes-pdf.cjs');
 const canvas=require('@napi-rs/canvas');globalThis.DOMMatrix=canvas.DOMMatrix;globalThis.Path2D=canvas.Path2D;globalThis.ImageData=canvas.ImageData;
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=pdfjs.getDocument({data:new Uint8Array(notesPdf()),isEvalSupported:false});
 const pdf=await task.promise;let notes='';try{for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),text=await page.getTextContent();notes+=text.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n';}}finally{await task.destroy();}
 if(!notes.includes('January 1, 2022')||!notes.includes('Insurance'))throw Error('PDF note extraction failed.');
 const input={notes,year:2026,month:11,depth:'focused',report:'topic',request:'Create a lesson about prepaid rent and insurance for the selected November 2026 period. The old dates in the PDF are textbook examples, not the simulation dates.'};
 const first=await generateCourseAssignment(L,{...input,phase:'draft'},{key:process.env.LEDGER_AI_API_KEY});
 const a=await generateCourseAssignment(L,{...input,phase:'review',draft:first.draft},{key:process.env.LEDGER_AI_API_KEY});
 if(a.version!==3||a.blueprint.paths.length!==3||!L.checkAssignment(a)||!a.blueprint.paths.every(p=>p.events.every(e=>e.date.startsWith('2026-11-'))&&p.events.some(e=>e.stage===0)&&p.events.some(e=>e.stage===2)))throw Error('The generated PDF assignment did not match the selected period and stages.');
 console.log('AI PDF check passed: extracted a real two-page PDF with old textbook dates, created and independently checked three balanced plans using only November 2026 record dates, with opening and period-end records.');
}catch(e){console.error(e.message);console.log('::error::'+String(e.message).replace(/[\r\n]/g,' ').replaceAll('::',':'));process.exitCode=1;}
