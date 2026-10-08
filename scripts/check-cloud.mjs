const project=process.env.SUPABASE_PROJECT_REF,origin=process.env.APP_ORIGIN;
if(!/^[a-z]{20}$/.test(project||'')||!origin)throw Error('Deployment settings are missing.');
const response=await fetch(`https://${project}.supabase.co/functions/v1/classroom`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap'}),signal:AbortSignal.timeout(20000)});
const result=await response.json();
if(response.status!==401||result.error!=='Sign in to continue.'||response.headers.get('access-control-allow-origin')!==origin)throw Error('Server readiness check failed. Check Edge Function deployment logs and APP_ORIGIN.');
console.log('Classroom server responds and requires sign-in. Open Ledger Lane and sign in with your existing account.');
