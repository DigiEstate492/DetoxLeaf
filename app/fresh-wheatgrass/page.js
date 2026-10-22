import Link from "next/link";
import CustomerShell from "../customer-shell";
import CommercePreview from "../commerce-preview";
export const metadata={title:"Small tray | Detoxleaf",description:"Fresh wheatgrass for your everyday ritual."};
export default function Page(){return <CustomerShell title="Small tray." accent="Big goodness." description="Fresh wheatgrass for your everyday ritual."><CommercePreview/><div className="info-grid"><article><h3>Living greens</h3><p>Fresh trays to prepare at home, rather than bottled juice.</p></article><article><h3>Your way to enjoy</h3><p>Explore preparation ideas in our Recipes section.</p><Link href="/recipes">Explore recipes ↗</Link></article><article><h3>A little clarity</h3><p>Find answers about ordering, care guidance and delivery.</p><Link href="/faq">Read the FAQs ↗</Link></article></div></CustomerShell>;}
