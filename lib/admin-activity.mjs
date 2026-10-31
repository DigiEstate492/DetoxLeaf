// Server-side data for the admin Overview alerts and activity panel.
export const LOW_STOCK_TRAYS=20;
const OPS=['owner','admin','operations'],CARE=['owner','admin','support'],OWNERS=['owner','admin'];
const OPEN_ORDERS=['confirmed','growing','packed','out_for_delivery'];
export const activityColumns={
 farm_batches:'id,code,expires_on,harvest_date,trays,reserved,delivered,wasted,status',
 delivery_calendar:'delivery_date,closed',
 orders:'id,order_number,customer_name,phone,pincode,delivery_date,delivery_slot,status,payment_status,total_paise,mode,created_at',
 subscriptions:'id,customer_id,plan_id,next_delivery_date,status,created_at',
 subscription_plans:'id,name',
 profiles:'id,full_name,created_at',
 support_tickets:'id,subject,status,created_at',
 reviews:'id,display_name,rating,status,created_at',
 waitlist:'id,pincode,created_at',
 coupons:'id,code,expires_at,active',
 notification_jobs:'id,channel,status,created_at',
 audit_log:'id,actor_id,action,entity_type,entity_id,detail,created_at'
};
export const istDate=(now=new Date())=>new Date(now.getTime()+19800000).toISOString().slice(0,10);
const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const daysUntil=(date,today)=>Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
const plural=(n,word)=>n+' '+word+(n===1?'':'s');
const inDays=n=>n===0?'today':n===1?'tomorrow':'in '+n+' days';
const words=value=>String(value||'').replaceAll('_',' ');
export function buildAdminActivity(data,now=new Date()){
 const today=istDate(now),tomorrow=shift(today,1),weekAgo=now.getTime()-7*86400000,alerts=[];
 const add=(level,title,detail,href)=>alerts.push({level,title,detail,href});
 const left=b=>b.trays-b.reserved-b.delivered-b.wasted;
 if(data.batches){
  const ready=data.batches.filter(b=>b.status==='ready');
  for(const b of ready){if(left(b)<=0)continue;const days=daysUntil(b.expires_on,today);
   if(days<0)add('danger','Batch '+b.code+' has expired','Expired on '+b.expires_on+' with '+plural(left(b),'tray')+' left. It no longer counts as stock.','/admin/batches');
   else if(days<=3)add('warning','Batch '+b.code+' expires '+inDays(days),plural(left(b),'tray')+' left. Expiry date '+b.expires_on+'.','/admin/batches');
   else if(days<=7)add('info','Batch '+b.code+' expires '+inDays(days),plural(left(b),'tray')+' left. Expiry date '+b.expires_on+'.','/admin/batches');}
  const stock=ready.filter(b=>b.expires_on>=today&&b.harvest_date<=today).reduce((n,b)=>n+Math.max(0,left(b)),0);
  if(stock===0)add('danger','Out of stock','No ready batch has trays available, so customers cannot order.','/admin/batches');
  else if(stock<LOW_STOCK_TRAYS)add('warning','Low stock','Only '+plural(stock,'tray')+' available to sell.','/admin/batches');
 }
 if(data.lastCalendar){const last=data.lastCalendar[0]?.delivery_date;const days=last?daysUntil(last,today):-1;
  if(days<1)add('danger','No delivery dates open','Customers cannot check out until new dates are added.','/admin/calendar');
  else if(days<=5)add('warning','Delivery dates run out '+inDays(days),'The last open date is '+last+'. Add more dates to keep orders coming.','/admin/calendar');}
 const open=data.openOrders||[];
 const overdue=open.filter(o=>o.delivery_date<today);
 if(overdue.length)add('danger',plural(overdue.length,'order')+' past the delivery date','Update or deliver these orders. The oldest was due '+overdue.map(o=>o.delivery_date).sort()[0]+'.','/admin/orders');
 if(data.reviewOrders){
  const cash=data.reviewOrders.filter(o=>o.status==='delivered'&&o.payment_status==='cod');
  const refund=data.reviewOrders.filter(o=>o.status==='cancelled'&&o.payment_status==='paid');
  if(refund.length)add('danger',plural(refund.length,'cancelled order')+' with payment','Review these and refund the customer if needed.','/admin/orders');
  if(cash.length)add('warning',plural(cash.length,'delivered order')+' with cash not recorded','Record the cash once it has been collected.','/admin/orders');
 }
 const tickets=data.tickets||[];const waiting=tickets.filter(t=>t.status==='open');
 if(waiting.length)add('warning',plural(waiting.length,'support request')+' waiting','Open requests have not been picked up yet.','/admin/support');
 const pendingReviews=(data.reviews||[]).filter(r=>r.status==='pending');
 if(pendingReviews.length)add('info',plural(pendingReviews.length,'review')+' to moderate','These stay hidden until you approve them.','/admin/reviews');
 for(const c of data.coupons||[]){if(!c.expires_at)continue;const days=daysUntil(istDate(new Date(c.expires_at)),today);if(days>=0&&days<=7)add('info','Coupon '+c.code+' expires '+inDays(days),'Extend it if the offer should keep running.','/admin/coupons');}
 if(data.jobs){
  const stuck=data.jobs.filter(j=>j.status==='pending'&&Date.parse(j.created_at)<now.getTime()-1800000);
  const failed=data.jobs.filter(j=>j.status==='failed');
  const dropped=data.jobs.filter(j=>j.status==='cancelled');
  if(stuck.length)add('warning',plural(stuck.length,'message')+' not sent','Waiting over 30 minutes. Check that the scheduler and email keys are set up.','/admin/notifications');
  if(failed.length)add('warning',plural(failed.length,'message')+' failed','Open the email outbox to see why.','/admin/notifications');
  if(dropped.length)add('info',plural(dropped.length,'message')+' cancelled this week','Often a missing setting. Open the email outbox to see the reason.','/admin/notifications');
 }
 const rank={danger:0,warning:1,info:2};alerts.sort((a,b)=>rank[a.level]-rank[b.level]);
 const names=new Map((data.customers||[]).map(p=>[p.id,p.full_name]));
 const planNames=new Map((data.plans||[]).map(p=>[p.id,p.name]));
 const orderLabel=o=>o.order_number+(o.mode==='test'?' (test)':'');
 const stop=o=>({id:o.id,title:o.customer_name+' · '+o.delivery_slot,detail:orderLabel(o)+' · PIN '+o.pincode+' · '+o.phone+' · '+words(o.status),date:o.delivery_date});
 const deliveries={today:open.filter(o=>o.delivery_date===today).map(stop),tomorrow:open.filter(o=>o.delivery_date===tomorrow).map(stop),overdue:overdue.map(stop),planDue:(data.dueSubscriptions||[]).map(s=>({id:s.id,title:(names.get(s.customer_id)||'Customer')+' · '+(planNames.get(s.plan_id)||'Delivery plan'),detail:'Next planned date '+s.next_delivery_date,date:s.next_delivery_date}))};
 const additions=[
  ...(data.recentOrders||[]).map(o=>({id:'o'+o.id,kind:'Order',title:o.customer_name,detail:orderLabel(o)+' · ₹'+o.total_paise/100,at:o.created_at,href:'/admin/orders'})),
  ...(data.recentSubscriptions||[]).map(s=>({id:'s'+s.id,kind:'Plan',title:names.get(s.customer_id)||'Customer',detail:planNames.get(s.plan_id)||'Delivery plan',at:s.created_at,href:'/admin/subscriptions'})),
  ...(data.customers||[]).map(p=>({id:'c'+p.id,kind:'Customer',title:p.full_name||'New customer',detail:'Created an account',at:p.created_at,href:'/admin/customers'})),
  ...tickets.map(t=>({id:'t'+t.id,kind:'Support',title:t.subject,detail:words(t.status),at:t.created_at,href:'/admin/support'})),
  ...(data.reviews||[]).map(r=>({id:'r'+r.id,kind:'Review',title:r.display_name,detail:r.rating+' stars · '+r.status,at:r.created_at,href:'/admin/reviews'})),
  ...(data.waitlist||[]).map(w=>({id:'w'+w.id,kind:'Waitlist',title:'PIN '+w.pincode,detail:'Asked for delivery here',at:w.created_at,href:'/admin/waitlist'}))
 ].filter(item=>Date.parse(item.at)>=weekAgo).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,12);
 const orderNumbers=new Map([...open,...(data.recentOrders||[]),...(data.reviewOrders||[])].map(o=>[o.id,o.order_number]));
 const describe=a=>{const ref=a.entity_type==='orders'?orderNumbers.get(a.entity_id)||'an order':words(a.entity_type);
  if(a.action==='order_transition')return ref+' moved to '+words(a.detail?.to||'the next stage');
  if(a.action==='cash_collected')return 'Cash recorded for '+ref;
  if(a.action==='late_payment_refund_required')return 'Refund review needed for '+ref;
  if(a.action==='save')return 'Saved a record in '+ref;
  if(a.action==='moderate')return 'Moderated '+ref;
  return words(a.action)+' · '+ref;};
 const actions=(data.audit||[]).map(a=>({id:a.id,title:describe(a),actor:a.actor_id?names.get(a.actor_id)||'Staff member':'System',at:a.created_at}));
 return {today,alerts,deliveries,additions,actions};
}
export async function loadAdminActivity(db,role,now=new Date()){
 const today=istDate(now),weekAgo=new Date(now.getTime()-7*86400000).toISOString();let unavailable=0;
 const read=async(roles,build)=>{if(!roles.includes(role))return undefined;const result=await build();if(result.error){unavailable++;return undefined;}return result.data||[];};
 const c=activityColumns;
 const [batches,lastCalendar,openOrders,reviewOrders,recentOrders,dueSubscriptions,recentSubscriptions,plans,customers,tickets,reviews,waitlist,coupons,jobs,audit]=await Promise.all([
  read(OPS,()=>db.from('farm_batches').select(c.farm_batches).neq('status','closed').limit(500)),
  read(OPS,()=>db.from('delivery_calendar').select(c.delivery_calendar).eq('closed',false).order('delivery_date',{ascending:false}).limit(1)),
  read(OPS,()=>db.from('orders').select(c.orders).in('status',OPEN_ORDERS).lte('delivery_date',shift(today,1)).order('delivery_date').limit(200)),
  read(OPS,()=>db.from('orders').select(c.orders).or('and(status.eq.delivered,payment_status.eq.cod),and(status.eq.cancelled,payment_status.eq.paid)').limit(200)),
  read(OPS,()=>db.from('orders').select(c.orders).gte('created_at',weekAgo).order('created_at',{ascending:false}).limit(12)),
  read(OWNERS,()=>db.from('subscriptions').select(c.subscriptions).eq('status','active').lte('next_delivery_date',shift(today,3)).order('next_delivery_date').limit(50)),
  read(OWNERS,()=>db.from('subscriptions').select(c.subscriptions).gte('created_at',weekAgo).order('created_at',{ascending:false}).limit(12)),
  read(OWNERS,()=>db.from('subscription_plans').select(c.subscription_plans).limit(100)),
  read(CARE,()=>db.from('profiles').select(c.profiles).order('created_at',{ascending:false}).limit(1000)),
  read(CARE,()=>db.from('support_tickets').select(c.support_tickets).or('status.eq.open,created_at.gte.'+weekAgo).order('created_at',{ascending:false}).limit(100)),
  read(CARE,()=>db.from('reviews').select(c.reviews).or('status.eq.pending,created_at.gte.'+weekAgo).order('created_at',{ascending:false}).limit(100)),
  read(OWNERS,()=>db.from('waitlist').select(c.waitlist).gte('created_at',weekAgo).order('created_at',{ascending:false}).limit(12)),
  read(OWNERS,()=>db.from('coupons').select(c.coupons).eq('active',true).not('expires_at','is',null).limit(100)),
  read(OWNERS,()=>db.from('notification_jobs').select(c.notification_jobs).in('status',['pending','failed','cancelled']).gte('created_at',weekAgo).limit(1000)),
  read(OWNERS,()=>db.from('audit_log').select(c.audit_log).order('created_at',{ascending:false}).limit(15))
 ]);
 return {...buildAdminActivity({batches,lastCalendar,openOrders,reviewOrders,recentOrders,dueSubscriptions,recentSubscriptions,plans,customers:customers,tickets,reviews,waitlist,coupons,jobs,audit},now),unavailable};
}
