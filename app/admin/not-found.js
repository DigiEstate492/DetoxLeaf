import Link from "next/link";
import StatusPage from "../status-page";
export default function NotFound(){
  return <StatusPage shell={false} code="404" eyebrow=" · ADMIN" title="This admin screen" accent="doesn't exist." mood="lost"
    message="The link may be out of date. Use the menu or search on the admin home to find the screen you need."
    actions={<><Link className="button green" href="/admin">Admin home ↗</Link><Link className="button outline" href="/">Visit storefront</Link></>}/>;
}
