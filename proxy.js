import {createServerClient} from "@supabase/ssr";
import {NextResponse} from "next/server";
import {allowedStaff,staffCanOpen} from "./lib/auth-policy.mjs";
export async function proxy(request){
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const path=request.nextUrl.pathname;
 const protectedRoute=path==="/account"||path.startsWith("/account/")||path==="/admin"||path.startsWith("/admin/")||path==="/reset-password";
 function go(destination){const result=NextResponse.redirect(new URL(destination,request.url));response.cookies.getAll().forEach(cookie=>result.cookies.set(cookie));result.headers.set("Cache-Control","private, no-store");return result;}
 if(!url||!key){if(protectedRoute)return go("/login?error=configuration");return response;}
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,{...options,httpOnly:true,sameSite:"lax"}));}}});
 // Auth server verification on each protected request also detects revoked sessions.
 const {data:{user},error}=await supabase.auth.getUser();
 if(protectedRoute&&(!user||error))return go(`/login?next=${encodeURIComponent(path+request.nextUrl.search)}${path.startsWith("/admin")?"&audience=admin":""}`);
 if(user&&(path==="/admin"||path.startsWith("/admin/"))){
  const {data:staff,error:roleError}=await supabase.from("staff_members").select("role,active").eq("user_id",user.id).maybeSingle();
  if(roleError||!allowedStaff(staff))return go("/access-pending");
  if(!staffCanOpen(staff.role,path))return go("/access-pending?reason=permission");
 }
 response.headers.set("Cache-Control","private, no-store");return response;
}
export const config={matcher:["/account/:path*","/admin/:path*","/login","/signup","/admin-login","/admin-signup","/forgot-password","/reset-password","/access-pending","/auth/:path*"]};
