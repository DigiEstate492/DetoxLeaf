import Link from "next/link";
import StatusPage from "../../status-page";
export default function NotFound(){
  return <StatusPage code="404" eyebrow=" · STORY NOT FOUND" title="This story isn't" accent="in the journal." mood="lost"
    message="It may have been renamed or taken down. There are plenty more notes from the farm to read."
    actions={<><Link className="button green" href="/blog">Browse the journal ↗</Link><Link className="button outline" href="/recipes">Try a recipe</Link></>}
    links={[["Recipes","/recipes","Ideas for your daily greens"],["Our farm","/our-farm","How your trays are grown"],["FAQs","/faq","Quick answers"]]}/>;
}
