import CustomerShell from "../customer-shell";import PlansList from "../plans-list";
export const metadata={title:"Delivery Plans | Detoxleaf",description:"Wheatgrass tray plans: 12 trays for ₹5,000, 24 for ₹7,200, or 36 for ₹8,500. Three trays per week."};
export default function Page(){return <CustomerShell title="Freshness," accent="on repeat." description="Fresh wheatgrass tray packages. Three trays a week, with a plan to match your everyday ritual."><PlansList/></CustomerShell>;}
