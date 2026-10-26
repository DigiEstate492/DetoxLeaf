"use client";
import {useActionState,useState,useEffect} from "react";
import {notify} from "./commerce/client";
import Link from "next/link";
import {authenticate} from "./auth/actions";
export default function AuthForm({mode="login",audience="customer",next="/account",message=""}){
 const [state,action,pending]=useActionState(authenticate,{});const [show,setShow]=useState(false);
 useEffect(()=>{if(state.error)notify(state.error,{type:"error"});else if(state.success)notify(state.success,{title:"Check your inbox",type:"info"});},[state]);
 const signup=mode==="signup",forgot=mode==="forgot",reset=mode==="reset",admin=audience==="admin";
 return <form action={action} className="screen-form auth-form"><input type="hidden" name="mode" value={mode}/><input type="hidden" name="audience" value={audience}/><input type="hidden" name="next" value={next}/>
 {message&&<p className="auth-notice" role="status">{message}</p>}
 {state.error&&<p className="auth-error" role="alert">{state.error}</p>}{state.success&&<div className="auth-notice" role="status"><strong>Check your inbox.</strong><p>{state.success}</p><Link href={admin?"/admin-login":"/login"}>Back to login ↗</Link></div>}
 {!state.success&&<>{signup&&<label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name"/></label>}
 {!reset&&<label>Email address<input type="email" name="email" required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label>}
 {!forgot&&<><label>{reset?"New password":"Password"}<div className="auth-password"><input type={show?"text":"password"} name="password" required minLength={signup||reset?10:1} maxLength={128} autoComplete={signup||reset?"new-password":"current-password"}/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)}>{show?"Hide":"Show"}</button></div></label>{(signup||reset)&&<p className="auth-hint">At least 10 characters. A long, unique passphrase works well.</p>}</>}
 {signup&&<><label>Confirm password<input type="password" name="confirmPassword" required minLength={10} maxLength={128} autoComplete="new-password"/></label><label className="auth-terms"><input type="checkbox" name="terms" required/><span>I agree to the <Link href="/terms-and-conditions">Terms</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.</span></label>{admin&&<p className="auth-hint">Creating an account requests team access. An owner must approve your role before you can open the admin workspace.</p>}</>}
 <button className="button green auth-submit" disabled={pending}>{pending?"Please wait…":signup?(admin?"Request admin access ↗":"Create your account ↗"):forgot?"Send reset link ↗":reset?"Update password ↗":"Log in ↗"}</button></>}
 <div className="auth-links">{mode==="login"&&<><Link href={admin?"/admin-signup":"/signup"}>{admin?"Request team access":"Create an account"} ↗</Link><Link href="/forgot-password">Forgot password?</Link></>}{signup&&<Link href={admin?"/admin-login":"/login"}>Already have an account? Log in ↗</Link>}{(forgot||reset)&&<Link href="/login">Back to login ↗</Link>}</div>
 </form>;
}
