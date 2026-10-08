import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import './lesson-engine.js';
import { handleAction } from './service.mjs';
const url=Deno.env.get('SUPABASE_URL')!, secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const origin=Deno.env.get('APP_ORIGIN');
function headers(request:Request){return {'Access-Control-Allow-Origin':request.headers.get('origin')===origin?origin!:'null','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};}
const check=(result:any)=>{if(result.error)throw result.error;return result.data;};
const store={
 async one(table:string,filter:object){return check(await db.from(table).select('*').match(filter).maybeSingle());},
 async list(table:string,filter:object){return check(await db.from(table).select('*').match(filter).limit(1000));},
 async insert(table:string,row:object){return check(await db.from(table).insert(row).select().single());},
 async upsert(table:string,row:object){return check(await db.from(table).upsert(row).select().single());},
 async update(table:string,filter:object,row:object){return check(await db.from(table).update(row).match(filter));},
 async remove(table:string,filter:object){return check(await db.from(table).delete().match(filter));},
 async commit(student:string,assignment:string,revision:number,state:object,action:string,submitted:object){return check(await db.rpc('demo_commit_run',{p_student:student,p_assignment:assignment,p_revision:revision,p_state:state,p_action:action,p_submitted:submitted}));}
};
Deno.serve(async request=>{
 const h=headers(request);
 if(!origin||request.headers.get('origin')!==origin)return new Response(JSON.stringify({error:'Site origin is not configured or allowed.'}),{status:403,headers:h});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
 if(request.method!=='POST')return new Response(JSON.stringify({error:'POST required.'}),{status:405,headers:h});
 try{
  const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return new Response(JSON.stringify({error:'Sign in to continue.'}),{status:401,headers:h});
  const {data,error}=await db.auth.getUser(token);if(error||!data.user)return new Response(JSON.stringify({error:'Session expired. Sign in again.'}),{status:401,headers:h});
  const raw=await request.text();if(raw.length>150000)return new Response(JSON.stringify({error:'Request is too large.'}),{status:413,headers:h});
  const body=JSON.parse(raw);const result=await handleAction(store,(globalThis as any).Lessons,data.user,body.action,body.payload||{});
  return new Response(JSON.stringify(result),{status:200,headers:h});
 }catch(e){const err=e as any;const conflict=String(err.message).includes('CONFLICT:');const status=err.status||(conflict?409:500);if(status===500)console.error('classroom error',err.code||'internal');return new Response(JSON.stringify({error:status===500?'The server could not save this request. Retry or contact the demo owner.':err.message}),{status,headers:h});}
});
