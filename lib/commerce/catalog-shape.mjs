export function publicProduct(catalog){
 const product=catalog.products?.find(p=>p.slug==='fresh-wheatgrass'&&p.status==='active');
 const variants=(catalog.variants||[]).filter(v=>v.product_id===product?.id&&v.active!==false).sort((a,b)=>a.trays-b.trays);
 const variant=variants.find(v=>v.trays===1)||variants[0];
 const plan=catalog.plans?.find(p=>p.variant_id===variant?.id&&p.active!==false);
 const stock=catalog.stock?.find(row=>row.product_id===product?.id);
 const availabilityKnown=catalog.availabilityReady===true&&!!product&&!!stock&&Number.isFinite(Number(stock.available));
 return {...product,id:product?.id,name:product?.name||'Wheatgrass Trays',description:product?.description||'Living greens, thoughtfully grown for your daily ritual.',image:catalog.images?.filter(i=>i.product_id===product?.id).sort((a,b)=>a.sort_order-b.sort_order)[0]?.url||'/media/wheatgrass-tray.png',price:variant?variant.price_paise/100:0,subscriptionPrice:plan?plan.price_paise/100:0,variant,plan,variants,availabilityKnown,available:availabilityKnown?Number(stock.available):null};
}
