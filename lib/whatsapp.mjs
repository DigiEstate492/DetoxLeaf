// Server-side module. Never import into a Client Component; credentials stay in server env.
const text=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,200)||'-';
export function whatsappConfig(env=process.env){
 const missing=[];
 if(!env.WHATSAPP_ACCESS_TOKEN?.trim())missing.push("WHATSAPP_ACCESS_TOKEN");
 if(!env.WHATSAPP_PHONE_NUMBER_ID?.trim())missing.push("WHATSAPP_PHONE_NUMBER_ID");
 return {configured:missing.length===0,missing};
}
// Cloud API numbers are digits with a country code. Bare Indian numbers get 91.
export function whatsappNumber(value){
 const digits=String(value??'').replace(/\D/g,'').replace(/^0+/,'');
 if(/^[6-9][0-9]{9}$/.test(digits))return '91'+digits;
 return /^91[6-9][0-9]{9}$/.test(digits)?digits:null;
}
export async function sendWhatsapp({to,template,parameters},{env=process.env,fetcher=fetch}={}){
 if(!whatsappConfig(env).configured)return {status:"not_configured"};
 try{
  const response=await fetcher(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION||"v23.0"}/${env.WHATSAPP_PHONE_NUMBER_ID.trim()}/messages`,{method:"POST",headers:{Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN.trim()}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"template",template:{name:template,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||"en"},components:[{type:"body",parameters:parameters.map(value=>({type:"text",text:text(value)}))}]}}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  const result=await response.json();const id=result?.messages?.[0]?.id;
  if(!response.ok||typeof id!=="string")return {status:"failed",retryable:response.status===429||response.status>=500};
  return {status:"accepted",id};
 }catch{return {status:"failed",retryable:true};}
}
export async function prepareWhatsappJob(db,job,env=process.env){
 if(!job.order_id)return {skip:'Notification has no order.'};
 const {data:order,error}=await db.from('orders').select('*').eq('id',job.order_id).eq('customer_id',job.customer_id).single();
 if(error)throw new Error('Order lookup unavailable.');
 const test=order.mode==='test',label=test?'[TEST] ':'',data=job.payload||{};
 if(job.template==='owner_new_booking'){
  const to=whatsappNumber(env.OWNER_ALERT_WHATSAPP);if(!to)return {skip:'Owner WhatsApp number is not configured.'};
  return {to,template:env.WHATSAPP_TEMPLATE_OWNER||'owner_new_booking',parameters:[label+order.customer_name,order.phone,data.plan_name,`${order.delivery_date} ${order.delivery_slot}`,`${order.shipping_address?.address}, ${order.shipping_address?.city} ${order.pincode}`,order.order_number]};
 }
 if(job.template==='subscription_started'){
  // Test mode never messages a checkout number.
  const to=whatsappNumber(test?env.WHATSAPP_TEST_TO:order.phone);if(!to)return {skip:test?'Test WhatsApp number is not configured.':'Order phone is not a valid WhatsApp number.'};
  return {to,template:env.WHATSAPP_TEMPLATE_CUSTOMER||'subscription_started',parameters:[label+order.customer_name,data.plan_name,data.next_delivery_date]};
 }
 return {skip:'Unsupported notification template.'};
}
