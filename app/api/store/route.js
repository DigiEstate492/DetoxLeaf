import {loadPublicCatalog} from "../../../lib/commerce/catalog.mjs";
import {gatewayConfig} from "../../../lib/commerce/payments.mjs";
import {supabaseServer} from "../../../lib/supabase/server";
import {body,check,failure,identity,json} from "../../../lib/commerce/server";
export const runtime="nodejs";
export async function GET(request){try{const url=new URL(request.url),action=url.searchParams.get("action")||"catalog";const db=await supabaseServer();
 if(action==="catalog"){
 return json(await loadPublicCatalog(db));
 }
 if(action==="delivery"){const pin=url.searchParams.get("pin");if(!/^[0-9]{6}$/.test(pin||""))return json({error:"Enter a six-digit PIN."},400);const area=check(await db.from("service_areas").select("*").eq("pincode",pin).maybeSingle());return json({area,slots:area?check(await db.rpc("dl_slots",{pin})):[]});}
 const {user}=await identity();
 if(action==="offer"){return json(check(await db.rpc("dl_offer_eligibility")));}
 if(action==="tracking"){
 const ref=url.searchParams.get("reference")||"";let query=db.from("orders").select("*").eq("customer_id",user.id);query=/^[0-9a-f-]{36}$/i.test(ref)?query.eq("id",ref):query.eq("order_number",ref.toUpperCase());const order=check(await query.maybeSingle());if(!order)return json({error:"No matching order was found in your account."},404);
 const [items,events]=await Promise.all([db.from("order_items").select("*").eq("order_id",order.id),db.from("order_events").select("*").eq("order_id",order.id).eq("customer_visible",true).order("created_at")]);return json({order,items:check(items),events:check(events)});
 }
 if(action==="wishlist")return json({items:check(await db.from("wishlist").select("product_id").eq("customer_id",user.id))});
 if(action==="account")return json({user:{id:user.id,email:user.email,name:user.user_metadata?.full_name||""}});
 return json({error:"Unknown request."},404);
 }catch(error){return failure(error);}}
export async function POST(request){try{const input=await body(request);const {db,user}=await identity();
 if(input.action==="checkout"){if(input.input?.payment_method==="razorpay"&&!(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))return json({error:"Online payment is awaiting server configuration. Please contact the store."},503);if(input.input?.payment_method==="razorpay")gatewayConfig();return json({order:check(await db.rpc("dl_checkout",{input:input.input}))});}
 if(input.action==="wishlist"){if(input.saved)check(await db.from("wishlist").upsert({customer_id:user.id,product_id:input.product_id}));else check(await db.from("wishlist").delete().eq("customer_id",user.id).eq("product_id",input.product_id));return json({saved:input.saved});}
 if(input.action==="waitlist"){if(input.consent!==true)return json({error:"Please consent to delivery notifications."},400);check(await db.rpc("dl_waitlist",{pin:input.pin}));return json({saved:true});}
 if(input.action==="cancel"){check(await db.rpc("dl_transition",{oid:input.id,target:"cancelled"}));return json({saved:true});}
 if(["support","review","subscription"].includes(input.action)){return json({result:check(await db.rpc("dl_customer_action",{action:input.action,input:input.input}))});}
 return json({error:"Unknown action."},400);
 }catch(error){return failure(error);}}
