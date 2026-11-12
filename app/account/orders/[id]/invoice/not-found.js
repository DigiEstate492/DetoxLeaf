import Link from "next/link";
import StatusPage from "../../../../status-page";
export default function NotFound(){
  return <StatusPage code="404" eyebrow=" · ORDER NOT FOUND" title="We couldn't find" accent="that order." mood="lost"
    message="It may belong to a different account, or the link may be incomplete. Your orders are listed in your account."
    actions={<><Link className="button green" href="/account/orders">My orders ↗</Link><Link className="button outline" href="/track-order">Track an order</Link></>}
    note={<>Ordered with a different email? Sign out and sign in with that account, or <Link className="text-link" href="/contact">contact us</Link>.</>}/>;
}
