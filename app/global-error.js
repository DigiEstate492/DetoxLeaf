"use client";
import "./globals.css";
import {useEffect} from "react";
import StatusPage from "./status-page";
// Last-resort page when the whole site layout fails. It has to bring its own <html> and <body>.
// Plain <a> links are deliberate: a full page load is the most reliable way to recover from a crashed layout.
/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalError({error,retry,reset}){
  const again=retry||reset;
  useEffect(()=>{console.error(error);},[error]);
  return <html lang="en"><body>
    <div className="status-brand"><a href="/"><img src="/brand/detoxleaf-logo-clear.png" alt="" width="40" height="40"/><strong>Detoxleaf</strong></a></div>
    <StatusPage shell={false} code="Error" eyebrow=" · SITE TEMPORARILY UNAVAILABLE" title="We're replanting" accent="this page." mood="seed"
      message="The site hit an unexpected problem. Please try again in a moment. Orders already placed are safe."
      actions={<><button type="button" className="button green" onClick={()=>again?.()}>Try again ↻</button><a className="button outline" href="/">Reload home</a></>}
      note={<>Need help now? Call or WhatsApp <a className="text-link" href="tel:+918796159077">+91 87961 59077</a>{error?.digest?<> · reference <code>{error.digest}</code></>:null}</>}/>
  </body></html>;
}
