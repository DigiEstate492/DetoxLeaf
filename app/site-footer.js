import Link from "next/link";
import BrandLogo from "./brand-logo";
const groups = [
  ["Shop", [["Fresh Wheatgrass", "/fresh-wheatgrass"], ["Delivery plans", "/subscriptions"], ["Bulk orders", "/bulk-orders"], ["Delivery areas", "/delivery-areas"]]],
  ["Learn", [["Our Farm", "/our-farm"], ["How It Works", "/how-it-works"], ["Recipes", "/recipes"], ["Blog", "/blog"], ["FAQs", "/faq"]]],
  ["Support", [["Contact", "/contact"], ["Track Order", "/track-order"], ["Shipping Policy", "/shipping-policy"], ["Refund Policy", "/refund-policy"], ["Privacy Policy", "/privacy-policy"], ["Terms & Conditions", "/terms-and-conditions"]]],
];
export default function SiteFooter() {
  const socials=[["Instagram",process.env.NEXT_PUBLIC_INSTAGRAM_URL],["Facebook",process.env.NEXT_PUBLIC_FACEBOOK_URL],["YouTube",process.env.NEXT_PUBLIC_YOUTUBE_URL]].filter(([,url])=>{try{return new URL(url).protocol==="https:"}catch{return false}});
  return <footer className="commerce-footer"><div className="footer-grid"><div className="footer-brand"><BrandLogo/><p>Pure Wellness From Nature.<br/>Farm fresh, delivered to your home.</p><Link href="/about" className="footer-story">Get to know Detoxleaf ↗</Link></div>{groups.map(([heading,items])=><div className="footer-group" key={heading}><h2>{heading}</h2><ul>{items.map(([label,href])=><li key={label}>{href ? <Link href={href}>{label}</Link> : <span className="footer-pending">{label}<small>Coming soon</small></span>}</li>)}</ul></div>)}</div><div className="footer-base"><span>© {new Date().getFullYear()} Detoxleaf</span><span>Rooted in nature. Grown with care.</span><div className="footer-socials" aria-label="Social channels">{socials.map(([name,url])=><a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>)}</div></div></footer>;
}




