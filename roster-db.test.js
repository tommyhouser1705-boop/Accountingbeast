const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Postgres roster migration reads Auth, isolates classes and atomically revision-guards summaries',async()=>{
 const {PGlite}=await import('@electric-sql/pglite'),db=new PGlite();
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 try{
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),email_confirmed_at timestamptz,last_sign_in_at timestamptz);');
  for(const name of ['202610080001_classroom.sql','202610260001_office.sql','202610290001_roster.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202610290001_roster.sql','utf8'));
  for(const [n,email] of [[1,'prof@example.edu'],[2,'Active@Example.EDU'],[3,'pending@example.edu'],[4,'outside@example.edu']]){
   await db.query('insert into auth.users(id,email,email_confirmed_at,last_sign_in_at) values($1,$2,$3,$3)',[id(n),email,n===3?null:'2026-10-29T12:00:00Z']);
  }
  await db.query('insert into public.demo_profiles(id,email) values($1,$2),($3,$4)',[id(1),'prof@example.edu',id(2),'previous@example.edu']);
  await db.query('insert into public.demo_classes(id,professor_id,name) values($1,$2,$3),($4,$2,$5)',[id(10),id(1),'My class',id(11),'Other class']);
  for(const address of ['active@example.edu','pending@example.edu','invited@example.edu','outside@example.edu'])await db.query("insert into public.demo_access(email,role) values($1,'student')",[address]);
  for(const address of ['active@example.edu','pending@example.edu','invited@example.edu'])await db.query('insert into public.demo_invitations(class_id,email) values($1,$2)',[id(10),address]);
  await db.query('insert into public.demo_invitations(class_id,email) values($1,$2)',[id(11),'outside@example.edu']);
  const accounts=await db.query('select * from public.demo_class_accounts($1) order by email',[id(10)]);
  assert.equal(accounts.rows.length,3);assert.equal(accounts.rows[0].account_id,id(2));assert.equal(accounts.rows[0].profile_id,id(2));assert.equal(accounts.rows[1].account_id,null);assert.equal(accounts.rows[2].account_id,id(3));assert.equal(accounts.rows[2].profile_id,null);assert.equal(accounts.rows[2].confirmed_at,null);
  assert.equal(accounts.rows.some(r=>r.email==='outside@example.edu'),false);
  const run={config:{name:'River Cycle'},events:[]},summary={business:{name:'River Cycle'},progress:{day:1,graded:0,first:0}};
  const saved=(await db.query('select public.demo_save_office_summary($1,0,$2,$3) as value',[id(2),run,summary])).rows[0].value;assert.equal(saved.revision,1);assert.ok(saved.savedAt);
  const read=async()=> (await db.query('select office,office_summary from public.demo_profiles where id=$1',[id(2)])).rows[0];
  const before=await read();assert.equal(before.office_summary.revision,1);assert.equal(before.office_summary.savedAt,before.office.savedAt);assert.deepEqual(before.office.run,run);
  await assert.rejects(()=>db.query('select public.demo_save_office_summary($1,0,$2,$3)',[id(2),run,{progress:{day:99}}]),/CONFLICT/);assert.deepEqual(await read(),before);
  await db.query('select public.demo_save_office_summary($1,1,$2,$3)',[id(2),run,{progress:{day:2}}]);
  await db.query('select public.demo_cache_office_summaries($1)',[JSON.stringify([{studentId:id(2),revision:1,summary:{revision:1,progress:{day:99}}}])]);assert.equal((await read()).office_summary.revision,2);
  await db.query('select public.demo_cache_office_summaries($1)',[JSON.stringify([{studentId:id(2),revision:2,summary:{revision:2,progress:{day:2}}}])]);assert.equal((await read()).office_summary.progress.day,2);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   try{for(const query of ['select public.demo_class_accounts($1)','select public.demo_cache_office_summaries(\'[]\')','select public.demo_save_office_summary($1,2,\'{}\',\'{}\')'])await assert.rejects(()=>db.query(query,query.includes('$1')?[id(10)]:[]),/permission denied/);}
   finally{await db.exec('reset role');}
  }
  await db.exec('set role service_role');assert.equal((await db.query('select * from public.demo_class_accounts($1)',[id(10)])).rows.length,3);await db.exec('reset role');
 }finally{await db.close();}
});
