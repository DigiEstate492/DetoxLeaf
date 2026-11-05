"use client";
import {useEffect,useRef,useState} from 'react';
// Cloudflare Turnstile. Supabase Auth checks the token when captcha protection is on in its dashboard.
export const captchaSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||'';
let loading;
function load(){if(window.turnstile)return Promise.resolve(window.turnstile);if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=()=>resolve(window.turnstile);script.onerror=()=>{loading=null;script.remove();reject(new Error('Turnstile could not load'));};document.head.appendChild(script);});return loading;}
export default function Turnstile({siteKey=captchaSiteKey,action,onToken,controlRef}){const box=useRef(null),widget=useRef(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{if(!siteKey)return;let active=true;load().then(turnstile=>{if(!active||!box.current)return;widget.current=turnstile.render(box.current,{sitekey:siteKey,action,theme:'light',callback:token=>{setFailed(false);onToken(token);},'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setFailed(true);}});}).catch(()=>{if(active)setFailed(true);});
  if(controlRef)controlRef.current={reset:()=>{onToken('');if(widget.current!==null&&window.turnstile)window.turnstile.reset(widget.current);}};
  return()=>{active=false;if(widget.current!==null&&window.turnstile)window.turnstile.remove(widget.current);widget.current=null;};},[siteKey,action,onToken,controlRef]);
 if(!siteKey)return null;
 return <div className="auth-captcha"><div ref={box}/>{failed&&<p className="auth-hint" role="alert">The security check couldn’t load. Refresh the page, or turn off an ad blocker for this site.</p>}</div>;}
