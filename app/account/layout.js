import {requireUser} from "../../lib/supabase/auth";
import {signOut} from "../auth/actions";
export default async function AccountLayout({children}){const {user}=await requireUser();return <><div className="auth-session-bar"><span>Signed in as <strong>{user.email}</strong></span><form action={signOut}><button>Sign out ↗</button></form></div>{children}</>;}
