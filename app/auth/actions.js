"use server";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {supabaseServer} from "../../lib/supabase/server";
import {safeNext} from "../../lib/auth-policy.mjs";
async function origin(){const h=await headers();const value=h.get("origin");if(!value)throw new Error("Open this form in your browser and try again.");const u=new URL(value);if(!["http:","https:"].includes(u.protocol))throw new Error("Invalid site URL.");return u.origin;}
function fields(form){return {email:String(form.get("email")||"").trim().toLowerCase(),password:String(form.get("password")||"")};}
function passwordError(value){return value.length<10?"Use at least 10 characters for your password.":value.length>128?"Use no more than 128 characters.":null;}
export async function authenticate(previous,form){
 const mode=String(form.get("mode"));const admin=form.get("audience")==="admin";
 const next=safeNext(String(form.get("next")||""),admin?"/admin":"/account");
 const {email,password}=fields(form);let destination;
 try{
  const supabase=await supabaseServer();
  if(mode==="reset"){
   const {data:{user}}=await supabase.auth.getUser();if(!user)return {error:"Your reset link expired. Request a new one."};
   const invalid=passwordError(password);if(invalid)return {error:invalid};
   const {error}=await supabase.auth.updateUser({password});if(error)return {error:error.message};
   await supabase.auth.signOut();destination="/login?message=password-updated";
  }else if(mode==="forgot"){
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:"Enter a valid email address."};
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${await origin()}/auth/callback?next=/reset-password`});
   if(error)return {error:error.status===429?"Too many requests. Please wait before trying again.":"We couldn't send a reset email. Please try again shortly."};
   return {success:"If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder."};
  }else if(mode==="signup"){
   const name=String(form.get("name")||"").trim();if(name.length<2||name.length>100)return {error:"Enter your name (2–100 characters)."};
   const invalid=passwordError(password);if(invalid)return {error:invalid};
   if(password!==form.get("confirmPassword"))return {error:"Your passwords don't match."};
   if(form.get("terms")!=="on")return {error:"Please accept the terms and privacy policy."};
   const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,requested_admin:admin},emailRedirectTo:`${await origin()}/auth/callback?next=${encodeURIComponent(admin?"/access-pending":next)}`}});
   if(error)return {error:error.status===429?"Too many signup requests. Please try again later.":error.message};
   if(data.session)destination=admin?"/access-pending":next;
   else return {success:"Check your email to confirm your account. If you're already registered, log in or reset your password.",email};
  }else{
   const {error}=await supabase.auth.signInWithPassword({email,password});
   if(error)return {error:error.code==="email_not_confirmed"?"Confirm your email first, then log in.":"We couldn't log you in. Check your email and password, or reset your password."};
   destination=next;
  }
 }catch{return {error:"Authentication is temporarily unavailable. Please try again shortly."};}
 revalidatePath("/","layout");redirect(destination);
}
export async function signOut(){const supabase=await supabaseServer();const {error}=await supabase.auth.signOut();if(error)redirect("/account?error=signout");revalidatePath("/","layout");redirect("/login?message=signed-out");}
