import Link from "next/link";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";

// Shared layout for 404, error and "not available" pages: a small sprout illustration, a clear message,
// next steps and a few helpful links. Works in both server and client components.

export function Sprout({mood="lost"}){
  // lost: upright sprout looking around · wilted: drooping leaves · seed: a seed waiting in the soil
  return <svg className={"status-art status-art-"+mood} viewBox="0 0 200 170" aria-hidden="true">
    <ellipse className="status-art-glow" cx="100" cy="92" rx="78" ry="70"/>
    <path className="status-art-soil" d="M38 138c18-12 106-12 124 0 4 3 2 8-3 9-40 7-78 7-118 0-5-1-7-6-3-9z"/>
    {mood==="seed"?<>
      <ellipse className="status-art-seed" cx="100" cy="133" rx="10" ry="6"/>
      <path className="status-art-stem status-art-sway" d="M100 129c0-6 1-11 4-15"/>
      <path className="status-art-leaf status-art-sway" d="M104 114c6-6 14-6 18-2-5 5-12 6-18 2z"/>
    </>:<g className={mood==="wilted"?"status-art-droop":"status-art-sway"}>
      <path className="status-art-stem" d={mood==="wilted"?"M100 136c0-22 2-40 12-52 6-7 14-9 20-6":"M100 136c0-26-1-48 0-70"}/>
      {mood==="wilted"?<>
        <path className="status-art-leaf" d="M112 84c-14-2-26 6-30 18 14 2 26-4 30-18z"/>
        <path className="status-art-leaf" d="M132 78c4 12 0 26-10 32-4-12 0-24 10-32z"/>
      </>:<>
        <path className="status-art-leaf" d="M100 92C86 92 72 84 66 70c16-3 30 5 34 22z"/>
        <path className="status-art-leaf" d="M100 80c14 0 28-8 34-22-16-3-30 5-34 22z"/>
        <path className="status-art-leaf" d="M100 66c-8-10-8-24 0-34 8 10 8 24 0 34z"/>
      </>}
    </g>}
  </svg>;
}

export default function StatusPage({code,eyebrow,title,accent,message,mood="lost",actions,links=[],note,shell=true}){
  const content=<main className="status-page">
    <section className="status-hero section-wrap">
      <div className="status-copy">
        <p className="eyebrow">{code?<b className="status-code">{code}</b>:null}{eyebrow}</p>
        <h1>{title}{accent&&<><br/><span className="gradient-text">{accent}</span></>}</h1>
        <p className="status-message">{message}</p>
        {actions&&<div className="action-row status-actions">{actions}</div>}
        {note&&<p className="status-note">{note}</p>}
      </div>
      <Sprout mood={mood}/>
    </section>
    {links.length>0&&<nav className="status-links section-wrap" aria-label="Helpful pages">
      <p className="eyebrow">YOU MIGHT BE LOOKING FOR</p>
      <ul>{links.map(([label,href,detail])=><li key={href}><Link href={href}><strong>{label}</strong>{detail&&<span>{detail}</span>}<em aria-hidden="true">→</em></Link></li>)}</ul>
    </nav>}
  </main>;
  if(!shell)return content;
  return <><div className="announcement">FARM FRESH WHEATGRASS · DELIVERED TO YOUR DOOR</div><SiteHeader/>{content}<SiteFooter/></>;
}

export const helpfulLinks=[
  ["Fresh wheatgrass trays","/fresh-wheatgrass","Order a tray for your doorstep"],
  ["Delivery plans","/subscriptions","Weekly and multi-week packages"],
  ["Delivery areas","/delivery-areas","Check if we reach your PIN"],
  ["Recipes","/recipes","Ideas for your daily greens"],
  ["The journal","/blog","Stories from the farm"],
  ["Help & contact","/contact","Talk to our team"],
];
