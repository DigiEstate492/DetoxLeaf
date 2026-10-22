import CustomerShell from "../customer-shell";import Commerce from "../commerce-preview";
export const metadata={title:"Checkout | Detoxleaf",description:"Secure account checkout for your fresh greens.",robots:{index:false,follow:false}};
export default async function Page({searchParams}){const query=await searchParams;return <CustomerShell title="Your fresh start," accent="one step closer." description="Choose your delivery and confirm your order securely."><Commerce mode="checkout" resumeId={query.order}/></CustomerShell>;}
