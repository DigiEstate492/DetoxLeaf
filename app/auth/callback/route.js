import {NextResponse} from "next/server";
import {supabaseServer} from "../../../lib/supabase/server";
import {safeNext} from "../../../lib/auth-policy.mjs";
export async function GET(request){const url=new URL(request.url);const code=url.searchParams.get("code");const next=safeNext(url.searchParams.get("next"));if(code){try{const supabase=await supabaseServer();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,url.origin));}catch{}}return NextResponse.redirect(new URL("/login?message=confirmation-failed",url.origin));}
