import {adminResources} from "../../../lib/admin-resources.mjs";
import {loadAdminActivity} from "../../../lib/admin-activity.mjs";
import {body,check,failure,json,staff} from "../../../lib/commerce/server";
const entities={products:"products",variants:"product_variants",images:"product_images",plans:"subscription_plans",inventory:"farm_batches",batches:"farm_batches",orders:"orders",deliveries:"orders",customers:"profiles",subscriptions:"subscriptions",settings:"service_areas",slots:"delivery_slots",calendar:"delivery_calendar",coupons:"coupons",support:"support_tickets",reviews:"reviews",notifications:"notification_jobs",team:"staff_members",content:"content_pages",configuration:"store_settings","stock-health":"farm_batches",waitlist:"waitlist",audit:"audit_log"};
function roles(section){if(section==="overview"||section==="activity")return ["owner","admin","operations","support","viewer"];if(["orders","deliveries","inventory","batches","stock-health"].includes(section))return ["owner","admin","operations"];if(["support","reviews","customers"].includes(section))return ["owner","admin","support"];if(["analytics","reports","overview"].includes(section))return ["owner","admin","viewer"];return ["owner","admin"];}
export async function GET(request){try{const url=new URL(request.url),section=url.searchParams.get("section")||"overview";const {db,role}=await staff(roles(section));
 if(section==="activity")return json({...await loadAdminActivity(db,role),role});
 if(["overview","analytics","reports"].includes(section))return json({report:check(await db.rpc("dl_report")),role});
 if(section==="backups"){await staff(["owner"]);const tables=["products","product_variants","orders","order_items","farm_batches","batch_allocations","service_areas","subscriptions","coupons","content_pages"];const snapshot={exported_at:new Date().toISOString()};for(const table of tables)snapshot[table]=check(await db.from(table).select("*").limit(10000));return json({snapshot,notice:"Up to 10,000 rows per table; use Supabase backups for full recovery."});}
 if(section==='lookups'){const sources={product_id:['products','id,name'],variant_id:['product_variants','id,name,sku'],customer_id:['profiles','id,full_name'],user_id:['profiles','id,full_name'],order_id:['orders','id,order_number'],slot_id:['delivery_slots','id,label,pincode']};const lookups={};for(const [field,[table,columns]] of Object.entries(sources)){const result=await db.from(table).select(columns).limit(1000);lookups[field]=check(result).map(row=>({id:row.id,label:[row.name||row.full_name||row.order_number||row.label||row.id,row.sku||row.pincode].filter(Boolean).join(' · ')}));}return json({lookups,role});}
 const table=entities[section]||adminResources.find(r=>r[2]===section)?.[0];if(!table)return json({error:"Unknown admin section."},404);
 const page=Math.max(0,Math.min(10000,parseInt(url.searchParams.get("page")||"0",10)||0));const columns=table==="deliveries"?"id,order_id,status,dispatched_at,delivered_at,created_at":"*";let query=db.from(table).select(columns,{count:"exact"}).range(page*50,page*50+49);if(url.searchParams.get("before"))query=query.lt("created_at",url.searchParams.get("before"));
 const result=await query;const rows=check(result);return json({rows,table,role,limit:50,page,total:result.count});
 }catch(error){return failure(error,{admin:true});}}
export async function POST(request){try{const input=await body(request);let session;
 if(input.action==="collect_cod"){session=await staff(["owner","admin","operations"]);check(await session.db.rpc("dl_collect_cod",{oid:input.id}));}
 else if(input.action==="transition"){session=await staff(["owner","admin","operations"]);check(await session.db.rpc("dl_transition",{oid:input.id,target:input.target}));}
 else if(input.action==="moderate"){session=await staff(["owner","admin","support"]);check(await session.db.rpc("dl_staff_action",{action:input.kind,input:input.input}));}
 else if(input.action==="save"){session=await staff(input.entity==="staff_members"?["owner"]:["owner","admin"]);const result=check(await session.db.rpc("dl_admin_write",{entity:input.entity,record_id:input.id||null,fields:input.fields}));return json({record:result});}
 else return json({error:"Unsupported action."},400);
 return json({saved:true});
 }catch(error){return failure(error,{admin:true});}}
