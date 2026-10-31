import {timingSafeEqual} from "node:crypto";
import {check,json,serviceDatabase} from "../../../lib/commerce/server";
import {emailConfig,sendEmail} from "../../../lib/resend-email.mjs";
import {prepareJobEmail} from "../../../lib/email-jobs.mjs";
import {prepareWhatsappJob,sendWhatsapp,whatsappConfig} from "../../../lib/whatsapp.mjs";
export const runtime="nodejs";
async function runEmails(db){const jobs=check(await db.rpc("dl_claim_emails"));let accepted=0;
 for(const job of jobs){try{
 const prepared=await prepareJobEmail(db,job,emailConfig().siteUrl);
 if(prepared.skip){check(await db.from('notification_jobs').update({status:'cancelled',last_error:prepared.skip}).eq('id',job.id));continue;}
 const {to,content}=prepared;
 const result=await sendEmail({to,...content,idempotencyKey:job.idempotency_key});const ok=result.status==="accepted";check(await db.from("notification_jobs").update({status:ok?"sent":"failed",provider_id:result.id||null,last_error:ok?null:"Provider could not accept email",sent_at:ok?new Date().toISOString():null,scheduled_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString()}).eq("id",job.id));if(ok)accepted++;
 }catch{await db.from("notification_jobs").update({status:"failed",last_error:"Delivery processing failed",scheduled_at:new Date(Date.now()+300000).toISOString()}).eq("id",job.id);}}
 return {claimed:jobs.length,accepted};}
async function runWhatsapp(db){const jobs=check(await db.rpc("dl_claim_whatsapp"));let accepted=0;
 for(const job of jobs){try{
 const prepared=await prepareWhatsappJob(db,job);
 if(prepared.skip){check(await db.from('notification_jobs').update({status:'cancelled',last_error:prepared.skip}).eq('id',job.id));continue;}
 const result=await sendWhatsapp(prepared);const ok=result.status==="accepted";
 // A rejected template or number will not succeed on retry.
 check(await db.from("notification_jobs").update({status:ok?"sent":result.retryable?"failed":"cancelled",provider_id:result.id||null,last_error:ok?null:"Provider could not accept WhatsApp message",sent_at:ok?new Date().toISOString():null,scheduled_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString()}).eq("id",job.id));if(ok)accepted++;
 }catch{await db.from("notification_jobs").update({status:"failed",last_error:"Delivery processing failed",scheduled_at:new Date(Date.now()+300000).toISOString()}).eq("id",job.id);}}
 return {claimed:jobs.length,accepted};}
export async function GET(request){const secret=process.env.CRON_SECRET||"";const sent=request.headers.get("authorization")||"";const expected="Bearer "+secret;if(secret.length<32||sent.length!==expected.length||!timingSafeEqual(Buffer.from(sent),Buffer.from(expected)))return json({error:"Unauthorized."},401);
 try{const db=serviceDatabase();const expired=check(await db.rpc("dl_expire_reservations"));
 const email=emailConfig().configured?await runEmails(db):"not_configured";
 const whatsapp=whatsappConfig().configured?await runWhatsapp(db):"not_configured";
 return json({expired,email,whatsapp});
 }catch{return json({error:"Job processing unavailable. Check server database configuration and migration."},503);}}
export const POST=GET;
