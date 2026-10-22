import CustomerShell from "../customer-shell";import PlansList from "../plans-list";
export const metadata={title:"Delivery Plans | Detoxleaf",description:"Choose a delivery rhythm for your fresh greens."};
export default function Page(){return <CustomerShell title="Freshness," accent="on repeat." description="Choose a rhythm that works for your everyday ritual."><PlansList/></CustomerShell>;}
