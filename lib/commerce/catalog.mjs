// Catalogue browsing must not depend on optional inventory or review services.
export async function loadPublicCatalog(db){
 const [products,variants,plans,images,stock,reviews]=await Promise.all([
 db.from('products').select('id,slug,name,description,sku,status,price_paise,gst_percent').in('status',['active','coming_soon']).order('created_at'),
 db.from('product_variants').select('*').eq('active',true),
 db.from('subscription_plans').select('*').eq('active',true),
 db.from('product_images').select('*'),
 db.rpc('dl_availability'),
 db.from('published_reviews').select('*').order('created_at',{ascending:false}).limit(100)
 ]);
 if(products.error)throw products.error;
 const rows=result=>result.error?[]:result.data||[];
 return {products:rows(products),variants:rows(variants),plans:rows(plans),images:rows(images),stock:rows(stock),reviews:rows(reviews),availabilityReady:!stock.error&&!variants.error,reviewsReady:!reviews.error,plansReady:!plans.error};
}
