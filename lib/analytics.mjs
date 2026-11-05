// Browser data layer for Google Tag Manager. Event names follow GA4's recommended snake_case events
// so GA4, Google Ads and Meta tags can share one set of triggers. See docs/analytics-events.md.
export const CURRENCY='INR';
const BRAND='Detoxleaf';
// Never sent: personal details that GTM tags could forward to ad platforms.
const BLOCKED_KEYS=new Set(['email','phone','mobile','name','full_name','customer_name','display_name','address','shipping_address','message','body','password','otp','pin','pincode','coupon_code']);
const KEEP_AS_IS=new Set(['transaction_id','item_id','form_id']);
const EMAIL=/[^\s@]+@[^\s@]+\.[^\s@]+/g,LONG_NUMBER=/\+?\d[\d\s-]{8,}\d/g;
const scrub=value=>typeof value==='string'?value.replace(EMAIL,'[redacted]').replace(LONG_NUMBER,'[redacted]').slice(0,150):value;
export function clean(params={}){const out={};for(const [key,value] of Object.entries(params)){if(value===undefined||value===null||value===''||BLOCKED_KEYS.has(key))continue;if(Array.isArray(value))out[key]=value.map(v=>v&&typeof v==='object'?clean(v):scrub(v));else if(value&&typeof value==='object')out[key]=clean(value);else out[key]=KEEP_AS_IS.has(key)?value:scrub(value);}return out;}
const PAGE_NAMES={'/':'Home Page','/fresh-wheatgrass':'Product Page','/subscriptions':'Delivery Plans Page','/cart':'Cart','/checkout':'Checkout','/order-confirmation':'Order Confirmation','/contact':'Contact Page','/bulk-orders':'Bulk Orders Page','/recipes':'Recipes Page','/our-farm':'Our Farm Page','/about':'About Page','/faq':'FAQ Page','/blog':'Blog','/search':'Search Page','/track-order':'Track Order Page','/login':'Login Page','/signup':'Signup Page','/forgot-password':'Forgot Password Page','/reset-password':'Reset Password Page','/delivery-areas':'Delivery Areas Page','/wishlist':'Wishlist'};
export function pageName(path){if(Object.hasOwn(PAGE_NAMES,path))return PAGE_NAMES[path];if(path.startsWith('/account'))return 'Account';if(path.startsWith('/blog/'))return 'Blog Post';if(path.startsWith('/recipes/'))return 'Recipe Page';if(path.startsWith('/delivery/'))return 'Delivery City Page';return path.replace(/^\/|\/$/g,'').split(/[/-]/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')||'Home Page';}
// Query strings are left out: they can hold order references and sign-in redirects.
function context(){const {origin,pathname}=window.location;return {page_path:pathname,page_location:origin+pathname,page_title:document.title,page_type:pageName(pathname)};}
const tracked=()=>typeof window!=='undefined'&&!window.location.pathname.startsWith('/admin');
const layer=()=>(window.dataLayer=window.dataLayer||[]);
export function track(event,params={}){if(!tracked())return;layer().push({event,...context(),...clean(params)});}
export function trackEcommerce(event,ecommerce,params={}){if(!tracked())return;const data=layer();data.push({ecommerce:null});data.push({event,...context(),...clean(params),ecommerce:clean({currency:CURRENCY,...ecommerce})});}
const money=paise=>Math.round(Number(paise)||0)/100;
export function catalogItem(catalog,{variantId,planId,quantity=1}={}){const variant=catalog?.variants?.find(v=>v.id===variantId);if(!variant)return null;const plan=planId?catalog.plans?.find(p=>p.id===planId):null;const product=catalog.products?.find(p=>p.id===variant.product_id);
 return {item_id:plan?plan.code:variant.sku,item_name:plan?plan.name:product?.name||'Wheatgrass Trays',item_brand:BRAND,item_category:plan?'Delivery Plans':'Wheatgrass Trays',item_variant:variant.name,price:money(plan?plan.price_paise:variant.price_paise),quantity};}
export const itemsValue=items=>Math.round(items.reduce((n,i)=>n+i.price*i.quantity,0)*100)/100;
export function trackItems(event,items,params={},extra={}){const list=items.filter(Boolean);if(!list.length)return;trackEcommerce(event,{value:itemsValue(list),items:list,...extra},params);}
export function orderItems(items=[]){return items.map(i=>({item_id:i.sku,item_name:i.product_name,item_brand:BRAND,item_category:i.subscription?'Delivery Plans':'Wheatgrass Trays',price:money(i.unit_price_paise),quantity:i.quantity}));}
// Purchase fires once per order on this device, and only once the order is confirmed or paid.
export function trackPurchase(order,items){if(!tracked()||!order?.id||['pending','cancelled'].includes(order.status))return false;const key='dl_purchase_'+order.id;try{if(localStorage.getItem(key))return false;localStorage.setItem(key,'1');}catch{}
 trackEcommerce('purchase',{transaction_id:order.order_number,value:money(order.total_paise),tax:money(order.tax_paise),shipping:money(order.shipping_paise),discount:money(order.discount_paise),items:orderItems(items)},{order_mode:order.mode,payment_type:order.payment_method,delivery_plan:Boolean(order.subscription_plan_id)});return true;}
export function formMeta(form){const data=form?.dataset||{};return {form_name:data.formName||form?.getAttribute?.('aria-label')||'Form',form_id:form?.id||data.formId,form_location:pageName(window.location.pathname),lead_type:data.leadType};}
export function trackForm(stage,form,params={}){track('form_'+stage,{...formMeta(form),...params});}
export function trackLead(form,params={}){track('generate_lead',{...formMeta(form),currency:CURRENCY,value:0,...params});}
// Sign-in and sign-up finish on the server with a redirect, so the result is confirmed on the next page.
const AUTH_KEY='dl_auth_pending',AUTH_PAGES=['/login','/signup','/admin-login','/admin-signup'];
export function markAuthPending(mode){try{sessionStorage.setItem(AUTH_KEY,JSON.stringify({mode,at:Date.now()}));}catch{}}
export function clearAuthPending(){try{sessionStorage.removeItem(AUTH_KEY);}catch{}}
export function resolveAuthPending(path){let pending;try{pending=JSON.parse(sessionStorage.getItem(AUTH_KEY)||'null');}catch{}if(!pending||AUTH_PAGES.includes(path))return null;clearAuthPending();if(Date.now()-pending.at>120000)return null;const event=pending.mode==='signup'?'sign_up':'login';track(event,{method:'email'});return event;}
