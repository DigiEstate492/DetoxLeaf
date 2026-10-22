"use client";
let pendingOrder=null;
export function tapFeedback(success=false){if(typeof window==="undefined"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;try{navigator.vibrate?.(success?[12,45,18]:8);}catch{/* Vibration is optional and may be blocked by the browser. */}}
export function queueOrderCelebration(orderId){if(!orderId)return;pendingOrder=orderId;try{sessionStorage.setItem("detoxleaf-celebration",orderId);}catch{}tapFeedback(true);window.dispatchEvent(new CustomEvent("detoxleaf-celebrate",{detail:{phase:"pop"}}));}
export function consumeOrderCelebration(orderId){let saved=pendingOrder;try{saved=sessionStorage.getItem("detoxleaf-celebration")||saved;}catch{}if(saved!==orderId)return false;pendingOrder=null;try{sessionStorage.removeItem("detoxleaf-celebration");}catch{}return true;}
