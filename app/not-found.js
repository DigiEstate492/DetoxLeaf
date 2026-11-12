import Link from "next/link";
import StatusPage,{helpfulLinks} from "./status-page";
export const metadata={title:"Page not found | Detoxleaf",robots:{index:false,follow:true}};
export default function NotFound(){
  return <StatusPage code="404" eyebrow=" · PAGE NOT FOUND" title="This page has" accent="gone to seed." mood="lost"
    message="The link may be old, or the address may have a small typo. Your greens are still fresh — let's get you back on track."
    actions={<><Link className="button green" href="/">Back to home ↗</Link><Link className="button outline" href="/fresh-wheatgrass">Shop fresh trays</Link></>}
    links={helpfulLinks}/>;
}
