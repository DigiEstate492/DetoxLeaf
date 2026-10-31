import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
import {activityColumns,buildAdminActivity,istDate,loadAdminActivity} from './lib/admin-activity.mjs';
const now=new Date('2026-11-10T06:30:00Z');assert.equal(istDate(now),'2026-11-10');assert.equal(istDate(new Date('2026-11-10T19:00:00Z')),'2026-11-11');
const batch=(code,expires_on,extra={})=>({id:code,code,expires_on,harvest_date:'2026-11-01',trays:10,reserved:0,delivered:0,wasted:0,status:'ready',...extra});
const order=(id,delivery_date,extra={})=>({id,order_number:'DL-'+id,customer_name:'Buyer '+id,phone:'9876543210',pincode:'110017',delivery_date,delivery_slot:'4:00–7:00 PM',status:'confirmed',payment_status:'cod',total_paise:54000,mode:'test',created_at:'2026-11-09T06:00:00Z',...extra});
const report=buildAdminActivity({
 batches:[batch('OLD','2026-11-09'),batch('EMPTY','2026-11-09',{delivered:10}),batch('SOON','2026-11-12'),batch('WEEK','2026-11-16'),batch('LATER','2026-12-30',{trays:100}),batch('GROW','2026-11-11',{status:'growing'})],
 lastCalendar:[{delivery_date:'2026-11-13',closed:false}],
 openOrders:[order('A','2026-11-08'),order('B','2026-11-10'),order('C','2026-11-11')],
 reviewOrders:[order('D','2026-11-01',{status:'delivered'}),order('E','2026-11-01',{status:'cancelled',payment_status:'paid'})],
 recentOrders:[order('B','2026-11-10'),order('OLD1','2026-11-10',{created_at:'2026-10-01T00:00:00Z'})],
 dueSubscriptions:[{id:'S',customer_id:'U',plan_id:'P',next_delivery_date:'2026-11-12',status:'active',created_at:'2026-11-09T07:00:00Z'}],recentSubscriptions:[{id:'S',customer_id:'U',plan_id:'P',created_at:'2026-11-09T07:00:00Z'}],plans:[{id:'P',name:'1 month plan'}],customers:[{id:'U',full_name:'<b>Asha</b>',created_at:'2026-11-08T00:00:00Z'},{id:'V',full_name:'Older',created_at:'2026-01-01T00:00:00Z'}],
 tickets:[{id:'T',subject:'Late tray',status:'open',created_at:'2026-11-09T08:00:00Z'}],reviews:[{id:'R',display_name:'Asha',rating:5,status:'pending',created_at:'2026-11-09T09:00:00Z'}],waitlist:[{id:'W',pincode:'400001',created_at:'2026-11-09T10:00:00Z'}],
 coupons:[{id:'K',code:'GREEN',expires_at:'2026-11-12T00:00:00Z',active:true}],
 jobs:[{id:'1',status:'pending',created_at:'2026-11-10T01:00:00Z'},{id:'2',status:'pending',created_at:'2026-11-10T06:20:00Z'},{id:'3',status:'failed',created_at:'2026-11-09T00:00:00Z'},{id:'4',status:'cancelled',created_at:'2026-11-09T00:00:00Z'}],
 audit:[{id:'X',actor_id:'U',action:'order_transition',entity_type:'orders',entity_id:'B',detail:{to:'out_for_delivery'},created_at:'2026-11-10T02:00:00Z'},{id:'Y',actor_id:null,action:'late_payment_refund_required',entity_type:'orders',entity_id:'E',detail:{},created_at:'2026-11-10T01:00:00Z'}]
},now);
const titles=report.alerts.map(a=>a.title),has=t=>assert.ok(titles.some(x=>x.includes(t)),'Missing alert '+t),level=t=>report.alerts.find(a=>a.title.includes(t)).level;
assert.equal(level('Batch OLD'),'danger');assert.equal(level('Batch SOON'),'warning');assert.equal(level('Batch WEEK'),'info');assert.ok(!titles.some(t=>t.includes('EMPTY')||t.includes('GROW')||t.includes('LATER')));
has('Delivery dates run out in 3 days');has('1 order past the delivery date');has('1 cancelled order with payment');has('1 delivered order with cash not recorded');has('1 support request waiting');has('1 review to moderate');has('Coupon GREEN');has('1 message not sent');has('1 message failed');has('1 message cancelled');
assert.deepEqual([...new Set(report.alerts.map(a=>a.level))],['danger','warning','info']);
assert.deepEqual(report.deliveries.today.map(s=>s.id),['B']);assert.deepEqual(report.deliveries.tomorrow.map(s=>s.id),['C']);assert.deepEqual(report.deliveries.overdue.map(s=>s.id),['A']);assert.equal(report.deliveries.planDue[0].title,'<b>Asha</b> · 1 month plan');assert.ok(report.deliveries.today[0].detail.includes('(test)'));
assert.ok(report.additions.length>0&&!report.additions.some(a=>a.id==='oOLD1'||a.id==='cV'));assert.equal(report.additions[0].kind,'Waitlist');
assert.equal(report.actions[0].title,'DL-B moved to out for delivery');assert.equal(report.actions[0].actor,'<b>Asha</b>');assert.equal(report.actions[1].title,'Refund review needed for DL-E');assert.equal(report.actions[1].actor,'System');
const out=t=>buildAdminActivity(t,now).alerts.map(a=>a.title);
assert.ok(out({batches:[],lastCalendar:[]}).includes('Out of stock'));assert.ok(out({batches:[],lastCalendar:[]}).includes('No delivery dates open'));assert.ok(out({batches:[batch('L','2026-12-30',{trays:5})]}).includes('Low stock'));assert.deepEqual(out({}),[]);
// Hidden checks raise no alert, so a role without access is not told the store is out of stock.
assert.ok(!out({batches:undefined}).includes('Out of stock'));
// Role gating and error tolerance, without a real database.
const requested=[];const fake=(failing=[])=>({from:table=>{requested.push(table);const q={select:()=>q,eq:()=>q,neq:()=>q,in:()=>q,lte:()=>q,gte:()=>q,or:()=>q,not:()=>q,order:()=>q,limit:()=>q,then:r=>r(failing.includes(table)?{data:null,error:{message:'denied'}}:{data:[],error:null})};return q;}});
const tablesFor=async role=>{requested.length=0;await loadAdminActivity(fake(),role,now);return new Set(requested);};
const viewer=await tablesFor('viewer');assert.equal(viewer.size,0);
const ops=await tablesFor('operations');assert.ok(ops.has('farm_batches')&&ops.has('orders')&&!ops.has('audit_log')&&!ops.has('profiles')&&!ops.has('support_tickets'));
const care=await tablesFor('support');assert.ok(care.has('support_tickets')&&care.has('profiles')&&!care.has('orders')&&!care.has('farm_batches')&&!care.has('audit_log'));
const owner=await tablesFor('owner');assert.ok(owner.has('audit_log')&&owner.has('notification_jobs')&&owner.has('coupons'));
const partial=await loadAdminActivity(fake(['audit_log','farm_batches']),'owner',now);assert.equal(partial.unavailable,2);assert.ok(!partial.alerts.some(a=>a.title==='Out of stock'));assert.ok(partial.alerts.some(a=>a.title==='No delivery dates open'));
// Every selected column exists, and each role can read what it is given under the real row security.
const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`);
for(const f of ['202610160001_initial_commerce.sql','202610210001_live_commerce.sql','202610230001_tray_offers.sql','202610230002_action_emails.sql','202610310001_booking_alerts.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
const ids={owner:'00000000-0000-0000-0000-000000000001',operations:'00000000-0000-0000-0000-000000000002',support:'00000000-0000-0000-0000-000000000003'};
for(const [role,id] of Object.entries(ids))await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${id}','${role}@example.invalid',now());INSERT INTO public.staff_members(user_id,role) VALUES('${id}','${role}');`);
const access={owner:Object.keys(activityColumns),operations:['farm_batches','delivery_calendar','orders'],support:['profiles','support_tickets','reviews']};
for(const [role,tables] of Object.entries(access)){await db.exec(`RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='${ids[role]}';`);for(const table of tables){try{await db.query(`select ${activityColumns[table]} from public.${table} limit 1`);}catch(error){assert.fail(role+' cannot read '+table+': '+error.message);}}}
await db.exec('RESET ROLE');await db.close();
console.log('PASS: expiry, stock, calendar, order, support, coupon and message alerts; delivery lists; 7 day additions; readable actions; role gating; columns readable under real row security. No remote records used.');
