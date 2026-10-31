import {renderEmail,emailEvents} from './email-templates.mjs';
export async function prepareJobEmail(db,job,siteUrl,env=process.env){
 if(!Object.hasOwn(emailEvents,job.template))return {skip:'Unsupported notification template.'};
 if(!job.customer_id)return {skip:'Notification has no customer identity.'};
 // Owner alerts carry the customer's details, so they never go to the customer's address.
 const ownerAlert=job.template==='owner_new_booking';let user;
 if(!ownerAlert){const {data:identity,error}=await db.auth.admin.getUserById(job.customer_id);
 if(error)throw new Error('Customer email lookup unavailable.');
 user=identity?.user;
 if(!user?.email||!user.email_confirmed_at)return {skip:'No confirmed account email is available.'};}
 let data={...job.payload};let order;
 if(job.order_id){const result=await db.from('orders').select('*').eq('id',job.order_id).eq('customer_id',job.customer_id).single();if(result.error)throw new Error('Order lookup unavailable.');order=result.data;if(job.template==='payment_pending'&&(order.status!=='pending'||new Date(order.reservation_expires_at).getTime()<=Date.now()))return {skip:'Payment reminder is no longer relevant.'};data.order=data.order||order;const items=await db.from('order_items').select('product_name,quantity,trays_per_unit,unit_price_paise').eq('order_id',job.order_id);if(items.error)throw new Error('Order items unavailable.');data.items=items.data||[];}
 // Legacy queued order jobs have no payload. Non-order jobs must always state their mode.
 const mode=order?.mode||data.mode;if(!['test','live'].includes(mode))return {skip:'Notification mode is not configured.'};data.mode=mode;
 if(ownerAlert){if(!env.OWNER_ALERT_EMAIL)return {skip:'Owner alert email is not configured.'};return {to:env.OWNER_ALERT_EMAIL,content:renderEmail(job.template,data,siteUrl)};}
 const to=mode==='test'?env.RESEND_TEST_TO:user.email;
 if(!to)return {skip:'Test recipient is not configured.'};
 return {to,content:renderEmail(job.template,data,siteUrl)};
}
