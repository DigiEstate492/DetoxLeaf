import Link from "next/link";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";
import Reveal from "./reveal";
export default function CustomerShell({title,accent,eyebrow="PURE WELLNESS FROM NATURE",description,children}) {return <><div className="announcement">FARM FRESH WHEATGRASS · DELIVERED TO YOUR DOOR</div><SiteHeader/><main><Reveal immediate as="section" className="screen-intro"><div className="section-wrap"><p className="eyebrow">{eyebrow}</p><h1>{title}<br/><span className="gradient-text">{accent}</span></h1><p>{description}</p></div></Reveal><div className="screen-content section-wrap">{children}</div></main><SiteFooter/></>;}
