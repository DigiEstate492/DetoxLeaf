"use client";
import {useActionState} from "react";
import {sendAdminTestEmail} from "./actions";
export default function TestForm({configured,email}){const [result,action,pending]=useActionState(sendAdminTestEmail,{});return <form action={action} className="screen-form"><p>A branded test email will be sent only to your verified admin address: <strong>{email}</strong>.</p>{result.error&&<p className="auth-error" role="alert">{result.error}</p>}{result.success&&<p className="auth-notice" role="status">{result.success}</p>}<button className="button green" disabled={!configured||pending}>{pending?"Sending…":"Send me a test email ↗"}</button></form>;}
