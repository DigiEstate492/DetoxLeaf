import Link from "next/link";
import StatusPage from "../../status-page";
export default function NotFound(){
  return <StatusPage code="404" eyebrow=" · RECIPE NOT FOUND" title="That recipe" accent="isn't on the menu." mood="lost"
    message="It may have moved. Browse the full recipe collection for fresh ways to enjoy your wheatgrass."
    actions={<><Link className="button green" href="/recipes">See all recipes ↗</Link><Link className="button outline" href="/fresh-wheatgrass">Shop fresh trays</Link></>}
    links={[["The journal","/blog","Stories from the farm"],["How to prepare","/blog/how-to-prepare-wheatgrass-juice-at-home","Juicing at home"],["FAQs","/faq","Quick answers"]]}/>;
}
