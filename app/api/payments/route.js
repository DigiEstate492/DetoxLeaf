import {body,check,failure,identity,json,serviceDatabase} from "../../../lib/commerce/server";
import {gatewayConfig,gateway,capturedPayment,signatureMatches} from "../../../lib/commerce/payments.mjs";
export const runtime="nodejs";
export async function POST(request){try{const input=await body(request);const {db,user}=await identity();const order=check(await db.from("orders").select("*").eq("id",input.order_id).eq("customer_id",user.id).single());const config=gatewayConfig();if(order.mode!==config.mode||order.payment_method!=="razorpay")return json({error:"Payment configuration changed. Contact support."},400);const service=serviceDatabase();
 if(input.action==="start"){
 if(order.status!=="pending"||order.payment_status!=="pending"||new Date(order.reservation_expires_at).getTime()<=Date.now())return json({error:"This payment reservation is no longer active. Check your orders."},409);
 let providerId=order.gateway_order_id;
 if(!providerId){const created=await gateway("orders",{method:"POST",data:{amount:order.total_paise,currency:"INR",receipt:order.order_number,notes:{detoxleaf_order:order.id}}},config);if(!/^order_[A-Za-z0-9]+$/.test(created.id||"")||created.amount!==order.total_paise||created.currency!=="INR")throw new Error("Provider order mismatch");const bound=check(await service.from("orders").update({gateway_order_id:created.id}).eq("id",order.id).is("gateway_order_id",null).select("gateway_order_id").maybeSingle());providerId=bound?.gateway_order_id||check(await service.from("orders").select("gateway_order_id").eq("id",order.id).single()).gateway_order_id;}
 return json({key:config.key,order_id:providerId,amount:order.total_paise,currency:"INR",mode:config.mode,email:order.email});
 }
 if(input.action==="verify"){
 if(input.razorpay_order_id!==order.gateway_order_id||!signatureMatches(order.gateway_order_id+"|"+input.razorpay_payment_id,input.razorpay_signature,config.secret))return json({error:"Payment verification failed."},400);
 const payment=await capturedPayment(order,input.razorpay_payment_id,config);check(await service.rpc("dl_capture_payment",{oid:order.id,provider_order:order.gateway_order_id,provider_payment:payment.id,amount:payment.amount,currency_n:payment.currency,mode_n:config.mode}));return json({verified:true,order_id:order.id});
 }
 return json({error:"Unknown payment action."},400);
 }catch(error){return failure(error);}}
