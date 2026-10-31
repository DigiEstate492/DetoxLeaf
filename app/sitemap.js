import {starterRecipes} from '../lib/starter-recipes.mjs';
import {journalPosts} from '../lib/journal-posts.mjs';
import {loadDeliveryCities} from '../lib/delivery-cities.mjs';
import {supabaseServer} from '../lib/supabase/server';
export default async function sitemap(){const base='https://www.detoxleaf.in';let cities=[];try{cities=await loadDeliveryCities(await supabaseServer());}catch{}return [...['','/shop','/fresh-wheatgrass','/subscriptions','/bulk-orders','/our-farm','/about','/how-it-works','/recipes','/blog','/faq','/contact','/delivery-areas','/shipping-policy','/refund-policy','/privacy-policy','/terms-and-conditions'],...starterRecipes.map(r=>'/recipes/'+r.slug),...journalPosts.map(p=>'/blog/'+p.slug),...cities.map(c=>'/delivery/'+c.slug)].map(path=>({url:base+path,changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:.7}));}
