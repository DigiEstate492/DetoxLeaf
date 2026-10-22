import CustomerShell from "../customer-shell";
import CommercePreview from "../commerce-preview";
export const metadata={title:"Your basket | Detoxleaf",description:"Review your picks before secure checkout."};
export default function Page(){return <CustomerShell title="Your basket." accent="A little goodness." description="Review your picks before secure checkout."><CommercePreview mode="cart"/></CustomerShell>;}
