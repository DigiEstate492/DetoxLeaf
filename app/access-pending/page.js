import Link from "next/link";
import AuthShell from "../auth-shell";
import {requireUser} from "../../lib/supabase/auth";
import {signOut} from "../auth/actions";
export const metadata={title:"Team access | Detoxleaf",robots:{index:false,follow:false}};
export default async function Page({searchParams}){const {user}=await requireUser();const query=await searchParams;return <AuthShell title="You’re part of" accent="a greener future." description="Team access is reviewed to keep customer and farm information safe." admin><h2>{query.reason==="permission"?"This page needs a different role.":"Team access needs approval."}</h2><p>Signed in as <strong>{user.email}</strong>.</p><p>An owner must assign an active staff role to this account in Supabase before you can enter the admin workspace.</p><div className="auth-links"><Link className="button green" href="/admin" prefetch={false}>Check my access ↗</Link><Link href="/account">Continue to my customer account ↗</Link><form action={signOut}><button className="button outline">Sign out</button></form></div></AuthShell>;}
