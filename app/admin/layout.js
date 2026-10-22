import {requireStaff} from "../../lib/supabase/auth";
import {signOut} from "../auth/actions";
export default async function AdminLayout({children}){const {user,staff}=await requireStaff();return <><div className="auth-session-bar"><span>{user.email} · <strong>{staff.role}</strong></span><form action={signOut}><button>Sign out ↗</button></form></div>{children}</>;}
