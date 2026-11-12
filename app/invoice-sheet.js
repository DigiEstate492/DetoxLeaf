import {amountDue,amountInWords,invoiceTitle,rupees,stateFromPin,taxLines} from "../lib/invoice.mjs";
const date=value=>value?new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}):'';

export default function InvoiceSheet({seller,order,items=[],invoice,payment}){
  const title=invoiceTitle(seller,order),taxes=taxLines(seller,order);
  const address=order.shipping_address||{},buyerState=stateFromPin(order.pincode),due=amountDue(order);
  const paymentLine=order.payment_method==='cod'?(order.payment_status==='cod'?(order.status==='cancelled'?'Cash on delivery · not collected':'Cash on delivery · to be paid at delivery'):'Cash on delivery · paid'):'Paid online';
  return <article className="invoice-sheet" aria-label={title+' '+invoice.invoice_number}>
    {order.mode==='test'&&<p className="invoice-test">TEST ORDER · not a valid invoice · no real payment was taken</p>}
    {order.status==='cancelled'&&<p className="invoice-cancelled">CANCELLED · this order was cancelled and nothing is payable</p>}
    <header className="invoice-head">
      <div className="invoice-brand"><img src="/brand/detoxleaf-logo-clear.png" alt="" width="52" height="52"/><div><strong>{seller.name}</strong>{seller.address&&<span>{seller.address}</span>}{seller.state&&<span>State: {seller.state}</span>}{seller.gstin&&<span>GSTIN: {seller.gstin}</span>}<span>{[seller.phone,seller.email].filter(Boolean).join(' · ')}</span></div></div>
      <div className="invoice-meta"><h1>{title}</h1><dl><div><dt>Invoice no.</dt><dd>{invoice.invoice_number}</dd></div><div><dt>Invoice date</dt><dd>{date(invoice.issued_at)}</dd></div><div><dt>Order</dt><dd>{order.order_number}</dd></div><div><dt>Order date</dt><dd>{date(order.created_at)}</dd></div></dl></div>
    </header>
    <section className="invoice-parties">
      <div><h2>Billed and delivered to</h2><p><strong>{order.customer_name}</strong></p><p>{[address.address,address.city].filter(Boolean).join(', ')}{order.pincode?' – '+order.pincode:''}</p><p>{[order.phone,order.email].filter(Boolean).join(' · ')}</p>{buyerState&&<p>Place of supply: {buyerState}</p>}</div>
      <div><h2>Delivery</h2><p>{date(order.delivery_date)}</p><p>{order.delivery_slot}</p></div>
    </section>
    <div className="invoice-table-wrap"><table className="invoice-table">
      <thead><tr><th>#</th><th>Item</th>{seller.hsn&&<th>HSN</th>}<th className="num">Qty</th><th className="num">Rate</th><th className="num">GST</th><th className="num">Amount</th></tr></thead>
      <tbody>{items.map((item,i)=>{const trays=item.quantity*item.trays_per_unit;return <tr key={i}><td>{i+1}</td><td>{item.product_name}<small>{trays} tray{trays===1?'':'s'}{item.sku?' · '+item.sku:''}</small></td>{seller.hsn&&<td>{seller.hsn}</td>}<td className="num">{item.quantity}</td><td className="num">{item.unit_price_paise===0?'Free':rupees(item.unit_price_paise)}</td><td className="num">{Number(item.gst_percent||0)}%</td><td className="num">{rupees(item.unit_price_paise*item.quantity)}</td></tr>;})}</tbody>
    </table></div>
    <section className="invoice-bottom">
      <div className="invoice-words"><h2>Amount in words</h2><p>{amountInWords(order.total_paise)}</p><h2>Payment</h2><p>{paymentLine}{payment?.provider_payment_id?' · '+payment.provider_payment_id:''}</p>{['partially_refunded','refunded'].includes(order.payment_status)&&<p className="invoice-refund">{order.payment_status==='refunded'?'This order was refunded in full.':'Part of this order was refunded.'}</p>}</div>
      <dl className="invoice-totals">
        <div><dt>Subtotal</dt><dd>{rupees(order.subtotal_paise)}</dd></div>
        {order.discount_paise>0&&<div><dt>Discount</dt><dd>− {rupees(order.discount_paise)}</dd></div>}
        <div><dt>Delivery</dt><dd>{order.shipping_paise?rupees(order.shipping_paise):'Free'}</dd></div>
        {taxes.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{rupees(value)}</dd></div>)}
        <div className="invoice-total"><dt>{due?'Amount due on delivery':order.status==='cancelled'&&order.payment_status==='cod'?'Total (cancelled)':'Total paid'}</dt><dd>{rupees(order.total_paise)}</dd></div>
      </dl>
    </section>
    <footer className="invoice-foot"><p>Thank you for choosing Detoxleaf. Fresh living wheatgrass, grown with care.</p><p>This is a computer-generated {title.toLowerCase()} and does not need a signature.</p></footer>
  </article>;
}
