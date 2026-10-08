import {readFileSync} from 'node:fs';
export function ownerSeed(value){
 const address=String(value||'').trim().toLowerCase();
 if(address.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Enter your owner email in the Run workflow form.');
 return "insert into public.demo_access(email,role,active) values ('"+address.replaceAll("'","''")+"','owner',true) on conflict(email) do update set role='owner',active=true;";
}
export const requiredTables=['demo_access','demo_profiles','demo_classes','demo_invitations','demo_assignments','demo_runs','demo_attempts'];
export function safeErrorDetail(body,token,owner){
 let value;
 try{const parsed=JSON.parse(body);value=typeof parsed==='string'?parsed:parsed.message||parsed.error?.message||parsed.error||parsed.msg;}catch{value=body;}
 if(typeof value!=='string')return 'No detailed error was returned.';
 for(const secret of [token,owner,owner?.toLowerCase()].filter(Boolean))value=value.replaceAll(secret,'[redacted]');
 return value.replace(/Bearer\s+\S+/gi,'Bearer [redacted]')
  .replace(/\b(?:sbp_|sb_secret_)[A-Za-z0-9_-]+\b/g,'[redacted]')
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[redacted]')
  .replace(/[\x00-\x1f\x7f]/g,' ').replace(/::/g,':').slice(0,700);
}
export function setupQuery(tables,seed,migration){
 const existing=requiredTables.filter(t=>tables.includes(t));
 if(existing.length&&existing.length!==requiredTables.length)throw Error('Only part of the classroom database exists. Setup stopped to preserve existing work; ask for help repairing the partial setup.');
 return 'begin;\n'+(existing.length?'':migration)+'\n'+seed+'\ncommit;';
}
export async function setup({token,project,owner,fetcher=fetch}){
 if(!token)throw Error('SUPABASE_ACCESS_TOKEN is missing from GitHub repository secrets.');
 if(!/^[a-z]{20}$/.test(project||''))throw Error('Invalid Supabase project reference.');
 const seed=ownerSeed(owner),endpoint='https://api.supabase.com/v1/projects/'+project+'/database/query';
 const query=async(sql,stage)=>{
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(60000)});
  if(!response.ok){const detail=safeErrorDetail(await response.text(),token,owner);const hint=[401,403].includes(response.status)?'Check token permissions and project access.':'The database request was rejected; see the Supabase message below.';throw Error(`${stage}: HTTP ${response.status}. ${hint} Supabase: ${detail}`);}
  return await response.json();
 };
 console.log('Checking existing classroom tables.');
 const tables=await query("select tablename from pg_tables where schemaname='public' and tablename like 'demo_%'",'Inspect existing database');
 if(!Array.isArray(tables))throw Error('Unexpected database response. Setup stopped.');
 const migration=readFileSync(new URL('../supabase/migrations/202610080001_classroom.sql',import.meta.url),'utf8');
 const sql=setupQuery(tables.map(t=>t.tablename),seed,migration);
 console.log('Preparing classroom schema and owner approval.');
 await query(sql,'Install database and approve owner');
 // Verify the atomic-save RPC required by grading, including existing databases.
 const check=await query("select to_regprocedure('public.demo_commit_run(uuid,uuid,integer,jsonb,text,jsonb)') is not null as ready",'Verify atomic-save function');
 if(check?.[0]?.ready!==true)throw Error('The atomic-save function is missing. Ask for help repairing the database before deploying.');
 console.log('Classroom database is ready; designated owner email is approved.');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{await setup({token:process.env.SUPABASE_ACCESS_TOKEN,project:process.env.SUPABASE_PROJECT_REF,owner:process.env.OWNER_EMAIL});}catch(e){console.error(e.message);process.exitCode=1;}
}
