import "server-only";
import {redirect} from "next/navigation";
import {supabaseServer} from "./server";
import {allowedStaff} from "../auth-policy.mjs";
export async function requireUser(){
 const supabase=await supabaseServer();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 return {supabase,user};
}
export async function requireStaff(){
 const {supabase,user}=await requireUser();
 const {data:staff,error}=await supabase.from("staff_members").select("role,active").eq("user_id",user.id).maybeSingle();
 if(error||!allowedStaff(staff))redirect("/access-pending");
 return {supabase,user,staff};
}
