import CustomerShell from "../customer-shell";
import SearchContent from "../search-content";
export const metadata={title:"Search | Detoxleaf",description:"Find Detoxleaf products, recipe ideas, farm stories and frequently asked questions."};
export default function Page(){return <CustomerShell title="Find your" accent="little green." description="Search the collection, recipes, stories and answers."><SearchContent/></CustomerShell>;}
