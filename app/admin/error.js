"use client";
import Link from "next/link";
import {useEffect} from "react";
import StatusPage from "../status-page";
export default function AdminError({error,retry,reset}){
  const again=retry||reset;
  useEffect(()=>{console.error(error);},[error]);
  return <StatusPage shell={false} code="Error" eyebrow=" · ADMIN" title="This screen" accent="didn't load." mood="wilted"
    message="Something failed while loading this admin screen. Your data is unchanged. Try again, or go back to the admin home."
    actions={<><button type="button" className="button green" onClick={()=>again?.()}>Try again ↻</button><Link className="button outline" href="/admin">Admin home</Link></>}
    note={error?.digest?<>Reference for support: <code>{error.digest}</code></>:null}/>;
}
