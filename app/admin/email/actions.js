"use server";
import {requireStaff} from "../../../lib/supabase/auth";
import {emailConfig,sendEmail} from "../../../lib/resend-email.mjs";
import {testEmail} from "../../../lib/email-templates.mjs";
export async function sendAdminTestEmail(){
 const {user,staff}=await requireStaff();
 if(!["owner","admin"].includes(staff.role))return {error:"Only an owner or admin can test email delivery."};
 if(!user.email_confirmed_at||!user.email)return {error:"Confirm your account email first."};
 const config=emailConfig();if(!config.configured)return {error:"Add the missing email environment variables and restart the server first."};
 // A submitted form cannot choose a recipient. Repeated clicks reuse the minute's provider key.
 const result=await sendEmail({to:user.email,...testEmail(config.siteUrl),idempotencyKey:`admin-email-test/${user.id}/${Math.floor(Date.now()/60000)}`});
 return result.status==="accepted"?{success:"Resend accepted your test email. Check your inbox and spam folder; acceptance does not guarantee delivery."}:{error:"Resend could not accept the email. Check the key, verified sending domain and provider dashboard."};
}
