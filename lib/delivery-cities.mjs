export const citySlug=value=>String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function loadDeliveryCities(db){const {data,error}=await db.from('service_areas').select('pincode,city,delivery_charge_paise,lead_days').eq('active',true).order('city').limit(1000);if(error)return [];const cities=new Map();for(const area of data||[]){const slug=citySlug(area.city);if(!slug)continue;if(!cities.has(slug))cities.set(slug,{slug,name:area.city,areas:[]});cities.get(slug).areas.push(area);}return [...cities.values()];}

