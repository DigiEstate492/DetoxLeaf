"use client";
import {useEffect} from 'react';import {usePathname} from 'next/navigation';
import {resolveAuthPending,track,trackForm} from '../lib/analytics.mjs';
let lastPath=null;
const text=el=>(el.dataset.ctaName||el.getAttribute('aria-label')||el.querySelector('h2,h3,strong')?.textContent||el.textContent||'').replace(/[↗→↓]/g,'').replace(/\s+/g,' ').trim().slice(0,80);
const where=el=>el.closest('header')?'header':el.closest('footer')?'footer':el.closest('.mobile-buy-bar')?'mobile_buy_bar':el.closest('.whatsapp-contact')?'floating_button':el.closest('.hero,.screen-intro')?'hero':'content';
function onClick(event){const el=event.target.closest?.('a,button');if(!el||el.closest('[data-analytics-ignore]'))return;const href=el.getAttribute('href')||'',params={link_text:text(el),click_location:where(el)};
 if(href.startsWith('tel:'))return track('phone_click',{...params,contact_method:'phone'});
 if(href.startsWith('mailto:'))return track('email_click',{...params,contact_method:'email'});
 if(/api\.whatsapp\.com|wa\.me|whatsapp\.com/.test(href))return track('whatsapp_click',{...params,contact_method:'whatsapp'});
 // Submit buttons are covered by form_submit.
 if(el.tagName==='BUTTON'&&el.form&&el.type!=='button')return;
 let url;try{url=href?new URL(href,window.location.href):null;}catch{}
 const outbound=url&&url.origin!==window.location.origin;
 if(outbound)return track('outbound_click',{...params,link_domain:url.hostname});
 const linkUrl=url?url.pathname+url.hash:undefined;
 if(el.tagName==='A'&&el.closest('nav,footer'))return track('navigation_click',{...params,link_url:linkUrl});
 if(el.matches('.button,[data-cta-name]')||params.click_location==='hero')track('cta_click',{...params,link_url:linkUrl});}
const started=new WeakSet();
function onFocus(event){const field=event.target;const form=field.form;if(!form||field.type==='hidden'||started.has(form))return;started.add(form);trackForm('start',form);}
function onSubmit(event){if(event.target.tagName==='FORM')trackForm('submit',event.target);}
const invalidAt=new WeakMap();
// Browser validation stops the submit, so the first invalid field is reported as a form error.
function onInvalid(event){const form=event.target.form;if(!form)return;const now=Date.now();if(now-(invalidAt.get(form)||0)<1000)return;invalidAt.set(form,now);trackForm('error',form,{error_type:'validation',error_field:event.target.name||event.target.labels?.[0]?.textContent.replace(/\s+/g,' ').trim().slice(0,40)||event.target.type});}
export default function AnalyticsTracker(){const path=usePathname();
 useEffect(()=>{if(!path||path===lastPath)return;lastPath=path;track('page_view',{page_referrer:document.referrer?new URL(document.referrer).origin:undefined});resolveAuthPending(path);},[path]);
 useEffect(()=>{document.addEventListener('click',onClick,true);document.addEventListener('focusin',onFocus,true);document.addEventListener('submit',onSubmit,true);document.addEventListener('invalid',onInvalid,true);return()=>{document.removeEventListener('click',onClick,true);document.removeEventListener('focusin',onFocus,true);document.removeEventListener('submit',onSubmit,true);document.removeEventListener('invalid',onInvalid,true);};},[]);
 return null;}
