"use client";
import {useEffect,useRef,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

// Thin leaf-green bar at the top of the screen while the next page loads.
// It starts when an internal link is clicked and finishes once the URL changes.
function internalTarget(event){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return null;
  const a=event.target.closest?.('a[href]');
  if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download'))return null;
  let url;try{url=new URL(a.getAttribute('href'),window.location.href);}catch{return null;}
  if(url.origin!==window.location.origin)return null;
  if(url.pathname===window.location.pathname&&url.search===window.location.search)return null;
  return url;
}

export default function RouteProgress(){
  const pathname=usePathname(),search=useSearchParams()?.toString();
  const [state,setStateValue]=useState('idle');// idle | loading | done
  const current=useRef('idle'),timers=useRef([]);
  const setState=value=>{current.current=value;setStateValue(value);};
  const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[];};

  useEffect(()=>{
    const start=()=>{clear();setState('loading');timers.current.push(setTimeout(()=>setState('idle'),12000));};
    const onClick=event=>{if(internalTarget(event))start();};
    document.addEventListener('click',onClick,true);
    return()=>{document.removeEventListener('click',onClick,true);clear();};
  },[]);

  useEffect(()=>{
    if(current.current!=='loading')return;
    clear();
    const finish=setTimeout(()=>{setState('done');timers.current.push(setTimeout(()=>setState('idle'),450));},0);
    timers.current.push(finish);
  },[pathname,search]);

  return <div className={'route-progress route-progress-'+state} aria-hidden="true"><span/></div>;
}
