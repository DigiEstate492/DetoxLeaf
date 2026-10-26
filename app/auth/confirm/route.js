import {NextResponse} from "next/server";
import {supabaseServer} from "../../../lib/supabase/server";
import {safeNext} from "../../../lib/auth-policy.mjs";
export async function GET(request){const url=new URL(request.url);const token_hash=url.searchParams.get("token_hash"),type=url.searchParams.get("type");const next=safeNext(url.searchParams.get("next"),type==="recovery"?"/reset-password":"/account");if(token_hash&&["signup","recovery","email","invite","email_change"].includes(type)){try{const supabase=await supabaseServer();const {error}=await supabase.auth.verifyOtp({token_hash,type});if(!error)return NextResponse.redirect(new URL(next,url.origin));}catch{}}return NextResponse.redirect(new URL("/login?message=confirmation-failed",url.origin));}
