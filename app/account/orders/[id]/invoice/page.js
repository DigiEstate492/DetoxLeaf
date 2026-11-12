import Link from "next/link";
import {notFound} from "next/navigation";
import {requireUser} from "../../../../../lib/supabase/auth";
import {invoiceReady,sellerDetails} from "../../../../../lib/invoice.mjs";
import InvoiceSheet from "../../../../invoice-sheet";
import PrintButton from "./print-button";

export const metadata={title:"Invoice | Detoxleaf",robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({params}){
  const {id}=await params;if(!uuid.test(id))notFound();
  // Row-level security limits this to the customer's own orders, or any order for staff.
  const {supabase}=await requireUser();
  const {data:order}=await supabase.from('orders').select('*').eq('id',id).maybeSingle();
  if(!order)notFound();
  const [{data:items},{data:invoice,error:invoiceError},{data:payments}]=await Promise.all([
    supabase.from('order_items').select('product_name,sku,quantity,trays_per_unit,unit_price_paise,gst_percent').eq('order_id',id),
    supabase.from('invoices').select('invoice_number,issued_at').eq('order_id',id).maybeSingle(),
    supabase.from('payments').select('provider_payment_id,status,created_at').eq('order_id',id).in('status',['captured','partially_refunded','refunded']).order('created_at',{ascending:false}).limit(1),
  ]);
  if(invoiceError)console.error('Invoice lookup failed',invoiceError.message);

  if(!invoice||!invoiceReady(order))return <main className="invoice-page"><div className="invoice-waiting surface-panel"><p className="eyebrow">{order.order_number}</p><h1>Your invoice is on its way.</h1><p>{order.status==='cancelled'?'This order was cancelled before payment, so no invoice was issued.':'The invoice is issued as soon as your payment is confirmed. This usually takes a minute.'}</p><Link className="button green" href="/account/orders">Back to your orders ↗</Link></div></main>;

  return <main className="invoice-page">
    <div className="invoice-actions"><Link href="/account/orders">← Your orders</Link><PrintButton/></div>
    <InvoiceSheet seller={sellerDetails()} order={order} items={items||[]} invoice={invoice} payment={payments?.[0]}/>
  </main>;
}
