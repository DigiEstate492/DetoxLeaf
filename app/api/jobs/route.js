import {timingSafeEqual} from "node:crypto";
import {check,json,serviceDatabase} from "../../../lib/commerce/server";
import {emailConfig,sendEmail} from "../../../lib/resend-email.mjs";
import {orderEmail,deliveryEmail} from "../../../lib/email-templates.mjs";
export const runtime="nodejs";
export async function GET(request){const secret=process.env.CRON_SECRET||"";const sent=request.headers.get("authorization")||"";const expected="Bearer "+secret;if(secret.length<32||sent.length!==expected.length||!timingSafeEqual(Buffer.from(sent),Buffer.from(expected)))return json({error:"Unauthorized."},401);
 try{const db=serviceDatabase();const expired=check(await db.rpc("dl_expire_reservations"));if(!emailConfig().configured)return json({expired,email:"not_configured"});const jobs=check(await db.rpc("dl_claim_emails"));let accepted=0;
 for(const job of jobs){try{
 const order=check(await db.from("orders").select("*").eq("id",job.order_id).single());
 const to=order.mode==="test"?process.env.RESEND_TEST_TO:order.email;
 if(!to||!["order_confirmed","packed","out_for_delivery","delivered"].includes(job.template)){check(await db.from("notification_jobs").update({status:"cancelled",last_error:"No recipient configured for this mode, or no email required for this event."}).eq("id",job.id));continue;}
 const content=job.template==="order_confirmed"?orderEmail(order,emailConfig().siteUrl):deliveryEmail({...order,status:job.template},emailConfig().siteUrl);
 if(order.mode==="test"){content.subject="[TEST] "+content.subject;content.text="TEST ORDER — no live charge or fulfilment.\n\n"+content.text;content.html="<p>TEST ORDER — no live charge or fulfilment.</p>"+content.html;}
 const result=await sendEmail({to,...content,idempotencyKey:job.idempotency_key});const ok=result.status==="accepted";check(await db.from("notification_jobs").update({status:ok?"sent":"failed",provider_id:result.id||null,last_error:ok?null:"Provider could not accept email",sent_at:ok?new Date().toISOString():null,scheduled_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString()}).eq("id",job.id));if(ok)accepted++;
 }catch{await db.from("notification_jobs").update({status:"failed",last_error:"Delivery processing failed",scheduled_at:new Date(Date.now()+300000).toISOString()}).eq("id",job.id);}}
 return json({expired,claimed:jobs.length,accepted});
 }catch{return json({error:"Job processing unavailable. Check server database configuration and migration."},503);}}
export const POST=GET;
