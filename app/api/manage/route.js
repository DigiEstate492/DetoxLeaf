import {adminResources} from "../../../lib/admin-resources.mjs";
import {loadAdminActivity} from "../../../lib/admin-activity.mjs";
import {body,check,failure,json,staff} from "../../../lib/commerce/server";
import {blogRoles,validateBlogPost} from "../../../lib/blog-editor.mjs";
const blogColumns="id,slug,title,seo_title,seo_description,body,cover_image,author_name,status,published_at,updated_at,created_at";
const entities={products:"products",variants:"product_variants",images:"product_images",plans:"subscription_plans",inventory:"farm_batches",batches:"farm_batches",orders:"orders",deliveries:"orders",customers:"profiles",subscriptions:"subscriptions",settings:"service_areas",slots:"delivery_slots",calendar:"delivery_calendar",coupons:"coupons",support:"support_tickets",reviews:"reviews",notifications:"notification_jobs",team:"staff_members",content:"content_pages",configuration:"store_settings","stock-health":"farm_batches",waitlist:"waitlist",audit:"audit_log"};
function roles(section){if(section==="blog")return blogRoles;if(section==="overview"||section==="activity")return ["owner","admin","operations","support","viewer"];if(["orders","deliveries","inventory","batches","stock-health"].includes(section))return ["owner","admin","operations"];if(["support","reviews","customers"].includes(section))return ["owner","admin","support"];if(["analytics","reports","overview"].includes(section))return ["owner","admin","viewer"];return ["owner","admin"];}
export async function GET(request){try{const url=new URL(request.url),section=url.searchParams.get("section")||"overview";const {db,role}=await staff(roles(section));
 if(section==="activity")return json({...await loadAdminActivity(db,role),role});
 if(section==="blog")return json({rows:check(await db.from("content_pages").select(blogColumns).eq("kind","blog").order("updated_at",{ascending:false}).limit(500)),table:"content_pages",role});
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
 else if(input.action==="blog_save"||input.action==="blog_delete"){session=await staff(blogRoles);const id=typeof input.id==="string"&&/^[0-9a-f-]{36}$/i.test(input.id)?input.id:null;
  if(input.action==="blog_delete"){if(!id)return json({error:"Choose a post to delete."},400);check(await session.db.from("content_pages").delete().eq("id",id).eq("kind","blog"));return json({deleted:true});}
  const {post,error}=validateBlogPost(input.post);if(error)return json({error},400);
  const result=id?await session.db.from("content_pages").update(post).eq("id",id).eq("kind","blog").select(blogColumns).maybeSingle():await session.db.from("content_pages").insert(post).select(blogColumns).single();
  if(result.error?.code==="23505")return json({error:"Another page already uses this web address. Change the web address and save again."},409);
  if(result.error?.code==="42501")return json({error:"You do not have permission to change this post."},403);
  if(["42703","PGRST204"].includes(result.error?.code))return json({error:"Apply supabase/migrations/202611100002_blog_managers.sql in the Supabase SQL Editor first."},503);
  const record=check(result);if(!record)return json({error:"This post no longer exists."},404);return json({record});}
 else if(input.action==="save"){session=await staff(input.entity==="staff_members"?["owner"]:["owner","admin"]);const result=check(await session.db.rpc("dl_admin_write",{entity:input.entity,record_id:input.id||null,fields:input.fields}));return json({record:result});}
 else return json({error:"Unsupported action."},400);
 return json({saved:true});
 }catch(error){return failure(error,{admin:true});}}
