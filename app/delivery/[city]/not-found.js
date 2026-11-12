import Link from "next/link";
import StatusPage from "../../status-page";
export default function NotFound(){
  return <StatusPage code="404" eyebrow=" · DELIVERY AREA" title="We don't deliver" accent="here just yet." mood="seed"
    message="This city isn't on our delivery routes right now. Check the areas we cover, or ask us — new routes are added as demand grows."
    actions={<><Link className="button green" href="/delivery-areas">See delivery areas ↗</Link><Link className="button outline" href="/contact">Ask about your area</Link></>}
    links={[["Check your PIN","/fresh-wheatgrass","On the product page"],["Bulk orders","/bulk-orders","Offices and groups"],["Delivery plans","/subscriptions","Weekly packages"]]}/>;
}
