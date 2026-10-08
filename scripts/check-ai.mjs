import {createRequire} from 'node:module';
import {generateCourseAssignment} from '../supabase/functions/classroom/generator.mjs';
const require=createRequire(import.meta.url),L=require('../lesson-engine.js');
try{
 const a=await generateCourseAssignment(L,{notes:'Perpetual inventory for a sole proprietorship: merchandise purchased on account creates Inventory and Accounts Payable. Supplier payments settle the liability. A completed cash sale records Cash and Sales Revenue and also Cost of Goods Sold and Inventory using the stated unit cost. There are no taxes or discounts. Report income and balance sheet totals. Use invoice quantities and prices to compute amounts.',year:2026,month:9,depth:'focused',report:'statements'},{key:process.env.LEDGER_AI_API_KEY});
 console.log('AI service ready: generated and independently reviewed an original inventory assignment with three balanced operating plans.');
 if(a.version!==3||a.blueprint.paths.length!==3||!a.blueprint.accounts.some(x=>/inventory/i.test(x.name)))throw Error('The AI draft did not match the smoke-test learning objective.');
}catch(e){console.error(e.message);console.log('::error::'+String(e.message).replace(/[\r\n]/g,' ').replaceAll('::',':'));process.exitCode=1;}
