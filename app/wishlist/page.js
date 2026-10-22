import CustomerShell from "../customer-shell";
import Wishlist from "../wishlist-control";
export const metadata={title:"Wishlist | Detoxleaf",description:"Your favourite Detoxleaf products, saved in this browser."};
export default function Page(){return <CustomerShell title="Your favourites." accent="Naturally good." description="A little green goodness, saved for later in this browser."><Wishlist page/></CustomerShell>;}
