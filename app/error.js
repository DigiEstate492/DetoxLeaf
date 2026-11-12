"use client";
import Link from "next/link";
import {useEffect} from "react";
import StatusPage,{helpfulLinks} from "./status-page";
import {track} from "../lib/analytics.mjs";
// Shown when a page fails to load. The rest of the site keeps working, and "Try again" reloads just this page.
export default function ErrorPage({error,retry,reset}){
  const again=retry||reset;
  useEffect(()=>{console.error(error);try{track("exception",{description:String(error?.digest||error?.message||"error").slice(0,100),fatal:false});}catch{}},[error]);
  return <StatusPage code="Error" eyebrow=" · SOMETHING WENT WRONG" title="This page wilted" accent="for a moment." mood="wilted"
    message="Something went wrong on our side while loading this page. Nothing you did caused it, and any order already placed is safe."
    actions={<><button type="button" className="button green" onClick={()=>again?.()}>Try again ↻</button><Link className="button outline" href="/">Back to home</Link></>}
    note={<>Still not working? <Link className="text-link" href="/contact">Contact our team ↗</Link>{error?.digest?<> and mention reference <code>{error.digest}</code>.</>:null}</>}
    links={helpfulLinks.slice(0,3)}/>;
}
