import LocalCollection from "../local-collection";
import Image from "next/image";
import CustomerShell from "../customer-shell";
export const metadata={title:"Fresh greens | Detoxleaf",description:"Meet the Detoxleaf collection. Naturally simple, thoughtfully grown."};
export default function Page(){return <CustomerShell title="Fresh greens." accent="A fresh start." description="Meet the Detoxleaf collection. Naturally simple, thoughtfully grown."><div className="collection-grid"><LocalCollection/><article className="collection-card powder-card"><Image src="/brand/wheatgrass-powder-clear.png" alt="Detoxleaf wheatgrass powder packaging" width={500} height={600}/><div><p className="eyebrow">COMING SOON</p><h2>Wheatgrass Powder</h2><p>A new way to make green part of your day. Product details are being finalised.</p></div></article></div></CustomerShell>;}
