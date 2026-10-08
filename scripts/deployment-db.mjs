// Use Supabase's documented temporary CLI deployment credentials. The API
// authorizes database:write before issuing them; no database password is needed.
export async function openDeploymentDatabase({token,project,fetcher=fetch,Client,sanitize=()=> 'Details withheld'}){
 const base='https://api.supabase.com/v1/projects/'+project;
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const roleResponse=await fetcher(base+'/cli/login-role',{method:'POST',headers,body:JSON.stringify({read_only:false}),signal:AbortSignal.timeout(30000)});
 if(!roleResponse.ok)throw Error('Supabase refused temporary deployment credentials (HTTP '+roleResponse.status+'). '+sanitize(await roleResponse.text())+' This endpoint requires Database Write permission.');
 const credentials=await roleResponse.json();
 if(typeof credentials.role!=='string'||! /^[A-Za-z0-9_]+$/.test(credentials.role)||typeof credentials.password!=='string'||!credentials.password)throw Error('Supabase returned incomplete temporary deployment credentials.');
 const poolResponse=await fetcher(base+'/config/database/pooler',{headers,signal:AbortSignal.timeout(30000)});
 if(!poolResponse.ok)throw Error('Could not load the deployment database connection (HTTP '+poolResponse.status+').');
 const configs=await poolResponse.json();
 if(!Array.isArray(configs))throw Error('Supabase returned an unexpected database connection configuration.');
 const primary=configs.filter(c=>c.database_type==='PRIMARY');
 const pool=primary.find(c=>c.pool_mode==='session')||primary[0];
 if(!pool||typeof pool.db_host!=='string'||! /^[a-z0-9.-]+\.pooler\.supabase\.(com|green)$/.test(pool.db_host)||!Number.isInteger(pool.db_port))throw Error('A supported primary pooler connection is not available.');
 Client||=(await import('pg')).default.Client;
 const client=new Client({host:pool.db_host,port:pool.db_port,database:pool.db_name||'postgres',user:credentials.role+'.'+project,password:credentials.password,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:20000,query_timeout:60000});
 try{await client.connect();}catch{await client.end().catch(()=>{});throw Error('Could not establish a verified TLS connection to the Supabase deployment database.');}
 return {
  async query(sql){
   // The newly issued write credential is authorized to assume postgres.
   // SET LOCAL stays within each transaction, including transaction poolers.
   const transaction=/^begin read write;/i.test(sql)?sql.replace('set transaction read write;','set transaction read write;\nset local role postgres;'):'begin read write;\nset local role postgres;\n'+sql+';\ncommit;';
   try{const results=await client.query(transaction);const list=Array.isArray(results)?results:[results];return [...list].reverse().find(r=>r.fields?.length)?.rows||[];}
   catch(e){await client.query('rollback').catch(()=>{});throw Error('Deployment database rejected the request: '+sanitize(JSON.stringify({message:String(e.message).replaceAll(credentials.password,'[redacted]')})));}
  },
  async close(){await client.end();}
 };
}
