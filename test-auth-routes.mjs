import assert from 'node:assert/strict';
const base=process.env.TEST_SITE_URL||'http://localhost:3000';
for(const path of ['/login','/signup','/admin-login','/admin-signup','/forgot-password']){
 const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,200,path);console.log('PASS public',path);
}
for(const path of ['/account','/account/orders','/account/addresses','/admin','/admin/products','/admin/team','/reset-password']){
 const response=await fetch(base+path,{redirect:'manual'});assert.ok([303,307].includes(response.status),path+' must redirect');assert.ok(new URL(response.headers.get('location'),base).pathname==='/login');console.log('PASS protected',path);
}
for(const path of ['/auth/callback?code=invalid-code&next=https://evil.example','/auth/confirm?token_hash=invalid&type=signup&next=//evil.example']){
 const response=await fetch(base+path,{redirect:'manual'});assert.ok([303,307].includes(response.status));const target=new URL(response.headers.get('location'),base);assert.equal(target.origin,new URL(base).origin);assert.equal(target.pathname,'/login');console.log('PASS rejected callback');
}
