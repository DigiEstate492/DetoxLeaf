// Server-side module. Never import into a Client Component; credentials stay in server env.
import {paymentTestEmail} from "./email-templates.mjs";
const mailbox=value=>typeof value==="string"&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)&&!/[\r\n]/.test(value);
export function emailConfig(env=process.env){
 const missing=[];
 if(!env.RESEND_API_KEY?.trim())missing.push("RESEND_API_KEY");
 if(!mailbox(env.RESEND_FROM_EMAIL))missing.push("RESEND_FROM_EMAIL");
 if(env.RESEND_REPLY_TO&&!mailbox(env.RESEND_REPLY_TO))missing.push("RESEND_REPLY_TO");
 let siteUrl;try{const url=new URL(env.EMAIL_SITE_URL);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw new Error();siteUrl=url.origin;}catch{missing.push("EMAIL_SITE_URL");}
 return {configured:missing.length===0,missing,siteUrl};
}
export async function sendEmail({to,subject,html,text,idempotencyKey},{env=process.env,fetcher=fetch}={}){
 const configuration=emailConfig(env);
 if(!configuration.configured)return {status:"not_configured"};
 if(!mailbox(to)||typeof subject!=="string"||!subject||subject.length>300||/[\r\n]/.test(subject)||!html||!text||typeof idempotencyKey!=="string"||!/^[a-zA-Z0-9/_:.=-]{1,256}$/.test(idempotencyKey))throw new Error("Invalid transactional email.");
 try{
  const response=await fetcher("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY.trim()}`,"Content-Type":"application/json","Idempotency-Key":idempotencyKey},body:JSON.stringify({from:`Detoxleaf <${env.RESEND_FROM_EMAIL}>`,to:[to],subject,html,text,...(env.RESEND_REPLY_TO?{reply_to:env.RESEND_REPLY_TO}:{})}),cache:"no-store",signal:AbortSignal.timeout(10000)});
  const result=await response.json();
  if(!response.ok||typeof result.id!=="string")return {status:"failed",retryable:response.status===429||response.status>=500};
  return {status:"accepted",id:result.id};
 }catch{return {status:"failed",retryable:true};}
}
export async function sendVerifiedTestReceipt(verified,options={}){
 const env=options.env||process.env;
 if(!verified?.verified||verified.mode!=="test")throw new Error("Verified test payment required.");
 // Only the operator-configured inbox receives gateway tests; never an arbitrary checkout address.
 if(!env.RESEND_TEST_TO)return {status:"disabled"};
 const config=emailConfig(env);if(!config.configured)return {status:"not_configured"};
 if(!mailbox(env.RESEND_TEST_TO))return {status:"failed",retryable:false};
 return sendEmail({to:env.RESEND_TEST_TO,...paymentTestEmail(verified,config.siteUrl),idempotencyKey:`test-receipt-v1/${verified.paymentId}`},options);
}
