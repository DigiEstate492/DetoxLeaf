import {body,check,failure,json,staff} from "../../../lib/commerce/server";
const entities={products:"products",variants:"product_variants",images:"product_images",plans:"subscription_plans",inventory:"farm_batches",batches:"farm_batches",orders:"orders",deliveries:"orders",customers:"profiles",subscriptions:"subscriptions",settings:"service_areas",slots:"delivery_slots",calendar:"delivery_calendar",coupons:"coupons",support:"support_tickets",reviews:"reviews",notifications:"notification_jobs",team:"staff_members",content:"content_pages",configuration:"store_settings","stock-health":"farm_batches",waitlist:"waitlist",audit:"audit_log"};
function roles(section){if(section==="overview")return ["owner","admin","operations","support","viewer"];if(["orders","deliveries","inventory","batches","stock-health"].includes(section))return ["owner","admin","operations"];if(["support","reviews","customers"].includes(section))return ["owner","admin","support"];if(["analytics","reports","overview"].includes(section))return ["owner","admin","viewer"];return ["owner","admin"];}
export async function GET(request){try{const url=new URL(request.url),section=url.searchParams.get("section")||"overview";const {db,role}=await staff(roles(section));
 if(["overview","analytics","reports"].includes(section))return json({report:check(await db.rpc("dl_report")),role});
 if(section==="backups"){await staff(["owner"]);const tables=["products","product_variants","orders","order_items","farm_batches","batch_allocations","service_areas","subscriptions","coupons","content_pages"];const snapshot={exported_at:new Date().toISOString()};for(const table of tables)snapshot[table]=check(await db.from(table).select("*").limit(10000));return json({snapshot,notice:"Up to 10,000 rows per table; use Supabase backups for full recovery."});}
 const table=entities[section];if(!table)return json({error:"Unknown admin section."},404);
 let query=db.from(table).select("*").limit(500);if(url.searchParams.get("before"))query=query.lt("created_at",url.searchParams.get("before"));
 const rows=check(await query);return json({rows,table,role,limit:500});
 }catch(error){return failure(error);}}
export async function POST(request){try{const input=await body(request);let session;
 if(input.action==="collect_cod"){session=await staff(["owner","admin","operations"]);check(await session.db.rpc("dl_collect_cod",{oid:input.id}));}
 else if(input.action==="transition"){session=await staff(["owner","admin","operations"]);check(await session.db.rpc("dl_transition",{oid:input.id,target:input.target}));}
 else if(input.action==="moderate"){session=await staff(["owner","admin","support"]);check(await session.db.rpc("dl_staff_action",{action:input.kind,input:input.input}));}
 else if(input.action==="save"){session=await staff(input.entity==="staff_members"?["owner"]:["owner","admin"]);const result=check(await session.db.rpc("dl_admin_write",{entity:input.entity,record_id:input.id||null,fields:input.fields}));return json({record:result});}
 else return json({error:"Unsupported action."},400);
 return json({saved:true});
 }catch(error){return failure(error);}}
