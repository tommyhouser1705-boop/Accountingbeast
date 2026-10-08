// Supabase Auth REST + the protected classroom Edge Function. No secret keys.
(function(root){
class CloudClient {
 constructor(config,storage=root.sessionStorage,fetcher=root.fetch.bind(root)){
  this.config=config;this.storage=storage;this.fetcher=fetcher;this.session=null;
  this.redirectUrl=config.redirectUrl||(root.location?new URL('.',root.location.href).href:'');
  try{this.session=JSON.parse(storage.getItem('ledger-cloud-session'));}catch{}
 }
 get configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.config.url)&&!!this.config.publishableKey;}
 setSession(session){this.session=session;session?this.storage.setItem('ledger-cloud-session',JSON.stringify(session)):this.storage.removeItem('ledger-cloud-session');}
 async auth(path,body){const res=await this.fetcher(this.config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await res.json();if(!res.ok)throw Error(value.msg||value.error_description||value.message||'Sign-in failed.');return value;}
 async login(email,password){const s=await this.auth('token?grant_type=password',{email,password});this.setSession({...s,expires_at:Date.now()+s.expires_in*1000});return s;}
 redirectPath(path){return this.redirectUrl?path+'?redirect_to='+encodeURIComponent(this.redirectUrl):path;}
 async signup(email,password){return await this.auth(this.redirectPath('signup'),{email,password});}
 async resend(email){return await this.auth(this.redirectPath('resend'),{type:'signup',email});}
 async recover(email){return await this.auth(this.redirectPath('recover'),{email});}
 async refresh(){if(!this.session)throw Error('Sign in first.');if(this.session.expires_at>Date.now()+60000)return;const s=await this.auth('token?grant_type=refresh_token',{refresh_token:this.session.refresh_token});this.setSession({...s,expires_at:Date.now()+s.expires_in*1000});}
 async call(action,payload={}){await this.refresh();const res=await this.fetcher(this.config.url+'/functions/v1/classroom',{method:'POST',headers:{apikey:this.config.publishableKey,Authorization:'Bearer '+this.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,payload})});const value=await res.json();if(!res.ok){const e=Error(value.error||'Request failed.');e.status=res.status;throw e;}return value;}
 async logout(){try{if(this.session)await this.fetcher(this.config.url+'/auth/v1/logout',{method:'POST',headers:{apikey:this.config.publishableKey,Authorization:'Bearer '+this.session.access_token}});}finally{this.setSession(null);}}
}
if(typeof module!=='undefined')module.exports=CloudClient;else root.CloudClient=CloudClient;
})(globalThis);
