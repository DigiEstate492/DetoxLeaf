import CustomerShell from "../../customer-shell";
import CustomerAccount from "../../customer-account";
export const metadata={title:"My profile | Detoxleaf",robots:{index:false,follow:false}};
export default async function Page({searchParams}){const feedback=await searchParams;return <CustomerShell title="Your green world." accent="Made personal." description="Your account, orders and everyday rituals."><CustomerAccount feedback={feedback} section="profile"/></CustomerShell>;}