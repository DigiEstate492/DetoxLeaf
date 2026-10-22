import Link from "next/link";
export const supportPages=[["Contact","/contact"],["Track Order","/track-order"],["Shipping Policy","/shipping-policy"],["Refund Policy","/refund-policy"],["Privacy Policy","/privacy-policy"],["Terms & Conditions","/terms-and-conditions"]];
export default function SupportLinks({current}){return <nav className="support-links" aria-label="Support pages">{supportPages.map(([label,href])=><Link key={href} href={href} aria-current={href===current?"page":undefined}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>;}
