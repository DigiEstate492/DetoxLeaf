function escape(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function frame({heading,body,text,siteUrl}){
 const url=new URL(siteUrl);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw new Error("Invalid email site URL.");
 return {text:`Detoxleaf — Pure Wellness From Nature\n\n${text}\n\n${url.origin}\nFarm fresh wellness. Grown with care.`,html:`<!doctype html><html><body style="margin:0;background:#f9f7ef;font-family:Arial,sans-serif;color:#263238"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:580px;background:#fffdf8;border:1px solid #dce5d0;border-radius:16px;overflow:hidden" cellspacing="0" cellpadding="0"><tr><td style="padding:32px;background:#1b5e20;color:white"><div style="font-size:26px;font-weight:bold">Detoxleaf</div><p style="margin:8px 0 0;font-size:13px;color:#c5e1a5">Pure Wellness From Nature</p></td></tr><tr><td style="padding:32px"><h1 style="font-size:27px;line-height:1.3;margin:0 0 24px">${escape(heading)}</h1>${body}<p style="margin-top:28px"><a href="${escape(url.origin)}" style="display:inline-block;padding:14px 22px;background:#1b5e20;color:white;text-decoration:none;border-radius:6px">Visit Detoxleaf →</a></p></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #e0e7d8;color:#65765c;font-size:12px">Farm fresh wellness. Grown with care.</td></tr></table></td></tr></table></body></html>`};
}
const money=amount=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(amount/100);
export function testEmail(siteUrl){return {subject:"Your Detoxleaf email connection is ready",...frame({heading:"Good things are growing.",body:"<p style=\"line-height:1.8\">Your Resend connection is working. This is a test email from your Detoxleaf admin workspace.</p><p>No order was placed and no payment was taken.</p>",text:"Your Resend connection is working. This is a test email from the Detoxleaf admin workspace. No order was placed and no payment was taken.",siteUrl})};}
export function paymentTestEmail({paymentId,orderId,amount},siteUrl){
 if(!Number.isSafeInteger(amount)||amount<1)throw new Error("Invalid receipt amount.");
 const text=`Razorpay TEST payment verified.\nPayment: ${paymentId}\nGateway order: ${orderId}\nTest amount: ${money(amount)}\nNo real money was charged. This is a gateway test receipt, not a confirmed fulfilment order.`;
 return {subject:"Detoxleaf · Razorpay test payment verified",...frame({heading:"Your test payment is verified.",body:`<p>Razorpay <strong>TEST MODE</strong> · No real money charged.</p><p style="line-height:1.8">Payment: ${escape(paymentId)}<br>Gateway order: ${escape(orderId)}<br>Test amount: <strong>${escape(money(amount))}</strong></p><p>This is a gateway test receipt, not a confirmed fulfilment order.</p>`,text,siteUrl})};
}
export function orderEmail(order,siteUrl){
 if(!order.order_number||!Number.isSafeInteger(order.total_paise)||order.total_paise<0)throw new Error("Invalid persisted order.");
 const text=`Thank you, ${order.customer_name}.\nOrder: ${order.order_number}\nTotal: ${money(order.total_paise)}\nDelivery: ${order.delivery_date} · ${order.delivery_slot}`;
 return {subject:`Detoxleaf · Order ${order.order_number} confirmed`,...frame({heading:"Your green delivery is confirmed.",body:`<p>Thank you, ${escape(order.customer_name)}.</p><p style="line-height:1.8">Order: <strong>${escape(order.order_number)}</strong><br>Total: ${escape(money(order.total_paise))}<br>Delivery: ${escape(order.delivery_date)} · ${escape(order.delivery_slot)}</p>`,text,siteUrl})};
}
export function deliveryEmail(order,siteUrl){
 const status={packed:"Your greens are packed.",out_for_delivery:"Your greens are on their way.",delivered:"Your greens have arrived."}[order.status];
 if(!status||!order.order_number)throw new Error("Unsupported delivery email event.");
 return {subject:`Detoxleaf · ${status}`,...frame({heading:status,body:`<p>Order <strong>${escape(order.order_number)}</strong></p><p>Delivery: ${escape(order.delivery_date)} · ${escape(order.delivery_slot)}</p>`,text:`${status}\nOrder: ${order.order_number}\nDelivery: ${order.delivery_date} · ${order.delivery_slot}`,siteUrl})};
}
