// Invoice helpers. Totals always come from the saved order, never recalculated here.

// Seller details come from environment variables so they can be filled in without a code change.
export function sellerDetails(env=process.env){
  return {
    name:(env.INVOICE_LEGAL_NAME||'Detoxleaf').trim(),
    address:(env.INVOICE_ADDRESS||'').trim(),
    state:(env.INVOICE_STATE||'').trim(),
    gstin:(env.INVOICE_GSTIN||'').trim().toUpperCase(),
    hsn:(env.INVOICE_HSN||'').trim(),
    phone:(env.INVOICE_PHONE||'+91 87961 59077').trim(),
    email:(env.INVOICE_EMAIL||env.RESEND_REPLY_TO||'').trim(),
  };
}

// First two or three PIN digits identify the state. Covers Delhi NCR and the rest of India broadly.
const pinStates=[['11','Delhi'],['12','Haryana'],['13','Haryana'],['14','Punjab'],['15','Punjab'],['16','Chandigarh'],['17','Himachal Pradesh'],['18','Jammu and Kashmir'],['19','Jammu and Kashmir'],['20','Uttar Pradesh'],['21','Uttar Pradesh'],['22','Uttar Pradesh'],['23','Uttar Pradesh'],['24','Uttarakhand'],['25','Uttar Pradesh'],['26','Uttarakhand'],['27','Uttar Pradesh'],['28','Uttar Pradesh'],['30','Rajasthan'],['31','Rajasthan'],['32','Rajasthan'],['33','Rajasthan'],['34','Rajasthan'],['36','Gujarat'],['37','Gujarat'],['38','Gujarat'],['39','Gujarat'],['40','Maharashtra'],['41','Maharashtra'],['42','Maharashtra'],['43','Maharashtra'],['44','Maharashtra'],['45','Madhya Pradesh'],['46','Madhya Pradesh'],['47','Madhya Pradesh'],['48','Madhya Pradesh'],['49','Chhattisgarh'],['50','Telangana'],['51','Andhra Pradesh'],['52','Andhra Pradesh'],['53','Andhra Pradesh'],['56','Karnataka'],['57','Karnataka'],['58','Karnataka'],['59','Karnataka'],['60','Tamil Nadu'],['61','Tamil Nadu'],['62','Tamil Nadu'],['63','Tamil Nadu'],['64','Tamil Nadu'],['67','Kerala'],['68','Kerala'],['69','Kerala'],['70','West Bengal'],['71','West Bengal'],['72','West Bengal'],['73','West Bengal'],['74','West Bengal'],['75','Odisha'],['76','Odisha'],['77','Odisha'],['78','Assam'],['80','Bihar'],['81','Bihar'],['82','Jharkhand'],['83','Jharkhand'],['84','Bihar'],['85','Bihar']];
const overrides=[['122','Haryana'],['121','Haryana'],['201','Uttar Pradesh'],['403','Goa'],['500','Telangana'],['744','Andaman and Nicobar Islands'],['791','Arunachal Pradesh'],['793','Meghalaya'],['795','Manipur'],['796','Mizoram'],['797','Nagaland'],['799','Tripura'],['737','Sikkim'],['605','Puducherry'],['682','Kerala']];
export function stateFromPin(pin){
  const value=String(pin||'');if(!/^[1-9][0-9]{5}$/.test(value))return '';
  return overrides.find(([p])=>value.startsWith(p))?.[1]||pinStates.find(([p])=>value.startsWith(p))?.[1]||'';
}

// Registered sellers charging GST issue a "Tax Invoice"; registered sellers of exempt goods
// (such as fresh produce at 0%) issue a "Bill of Supply". Unregistered sellers issue a plain invoice.
export function invoiceTitle(seller,order){
  if(!seller.gstin)return 'Invoice';
  return order.tax_paise>0?'Tax Invoice':'Bill of Supply';
}

// Same state: CGST + SGST halves. Different state: IGST. Unknown: a single GST line.
export function taxLines(seller,order){
  const tax=order.tax_paise||0;if(tax<=0)return [];
  const buyer=stateFromPin(order.pincode);
  if(!seller.state||!buyer)return [['GST',tax]];
  if(seller.state.toLowerCase()===buyer.toLowerCase()){const half=Math.floor(tax/2);return [['CGST',half],['SGST',tax-half]];}
  return [['IGST',tax]];
}

const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function belowHundred(n){return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');}
function belowThousand(n){const h=Math.floor(n/100),r=n%100;return [h?ones[h]+' Hundred':'',r?belowHundred(r):''].filter(Boolean).join(' ');}
// Indian numbering: crore, lakh, thousand.
function wholeWords(n){
  if(n===0)return 'Zero';
  const parts=[];const crore=Math.floor(n/10000000);n%=10000000;const lakh=Math.floor(n/100000);n%=100000;const thousand=Math.floor(n/1000);n%=1000;
  if(crore)parts.push(wholeWords(crore)+' Crore');if(lakh)parts.push(belowHundred(lakh)+' Lakh');if(thousand)parts.push(belowHundred(thousand)+' Thousand');if(n)parts.push(belowThousand(n));
  return parts.join(' ');
}
export function amountInWords(paise){
  if(!Number.isSafeInteger(paise)||paise<0)return '';
  const whole=Math.floor(paise/100),rest=paise%100;
  return 'Rupees '+wholeWords(whole)+(rest?' and '+belowHundred(rest)+' Paise':'')+' Only';
}

export const rupees=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format((paise||0)/100);

// Online orders are invoiced once paid; cash-on-delivery orders as soon as they are placed.
// Refunded and cancelled orders keep their invoice so the numbering has no gaps.
export const invoiceStatuses=['paid','partially_refunded','refunded','cod'];
export const invoiceReady=order=>invoiceStatuses.includes(order?.payment_status);
export const amountDue=order=>order?.payment_status==='cod'&&order?.status!=='cancelled';
export const invoicePath=orderId=>'/account/orders/'+encodeURIComponent(orderId)+'/invoice';
