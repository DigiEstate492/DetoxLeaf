import {normalizeToast} from './toast-feedback.mjs';
const empty=[];let items=empty;let counter=0;const listeners=new Set();
export const subscribeToasts=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const getToasts=()=>items;
export const getServerToasts=()=>empty;
const emit=()=>listeners.forEach(fn=>fn());
export function dismissToast(id){items=items.filter(t=>t.id!==id);emit();}
export function pushToast(message,options){if(typeof window==='undefined')return;const toast=normalizeToast(message,options);if(!toast.message)return;const duplicate=items.find(t=>t.message===toast.message&&t.type===toast.type);if(duplicate)return duplicate.id;const id=String(++counter);items=[...items.slice(-2),{...toast,id}];emit();return id;}
