"use client";
import {pushToast} from "../../lib/toast-store.mjs";
import {mutationFeedback} from "../../lib/toast-feedback.mjs";
import {useEffect,useState,useSyncExternalStore} from "react";
export async function api(url,options={}){const mutation=options.method&&options.method!=='GET';try{const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...options.headers},cache:"no-store"});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||"Request failed."),{status:response.status});if(mutation){let input={};try{input=JSON.parse(options.body||'{}')}catch{}const feedback=mutationFeedback(url,input,data);if(feedback)pushToast(feedback);}return data;}catch(error){if(mutation)pushToast(error.message||'Please check your connection and try again.',{type:'error'});throw error;}}

export const storeAction=(action,data={})=>api("/api/store",{method:"POST",body:JSON.stringify({action,...data})});
let snapshot={loading:true,products:[],variants:[],plans:[],images:[],stock:[],reviews:[],availabilityReady:false,reviewsReady:false};let requested=false;const listeners=new Set();const empty=snapshot;
function emit(){listeners.forEach(fn=>fn());}
export function refreshCatalog(){requested=true;return api('/api/store').then(data=>{snapshot={...data,loading:false};emit();return snapshot;}).catch(error=>{snapshot={...empty,loading:false,error:error.message};emit();return snapshot;});}
export function useCatalog(){useEffect(()=>{if(!requested)refreshCatalog();},[]);return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>snapshot,()=>empty);}
export function useRequest(url){const [state,setState]=useState({loading:!!url});useEffect(()=>{if(!url)return;let active=true;function load(){api(url).then(data=>{if(active)setState({...data,loading:false})}).catch(error=>{if(active)setState({loading:false,error:error.message,status:error.status})});}load();const interval=setInterval(()=>{if(!document.hidden)load()},30000);return()=>{active=false;clearInterval(interval)}},[url]);return state;}
export function notify(message,options){return pushToast(message,options);}
export {publicProduct} from "../../lib/commerce/catalog-shape.mjs";
