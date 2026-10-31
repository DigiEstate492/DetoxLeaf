// Extra words staff may search for that do not appear in a screen's menu label.
const terms={
 batches:'stock harvest trays',inventory:'stock trays',plans:'subscription package',settings:'pin pincode area service',slots:'time window pin',calendar:'dates schedule capacity',
 customers:'users profiles',team:'admin role users',content:'terms privacy refund shipping blog faq',configuration:'checkout cod payment settings',
 notifications:'mail jobs',overview:'analytics reports revenue sales charts',coupons:'discount offer',support:'tickets help',variants:'sku',backups:'backup download',audit:'history logs',orders:'payment cod'
};
export const adminMenuGroups=[
 {id:'home',keys:['overview']},
 {id:'orders',label:'Orders & customers',keys:['orders','deliveries','subscriptions','customers','support','reviews']},
 {id:'stock',label:'Stock',keys:['batches','inventory','stock-health']},
 {id:'catalogue',label:'Products & offers',keys:['products','variants','images','plans','coupons']},
 {id:'delivery',label:'Delivery setup',keys:['settings','slots','calendar','waitlist']},
 {id:'store',label:'Store & team',keys:['content','configuration','team','email','notifications']},
 {id:'advanced',label:'Advanced',keys:['setup','data','audit','backups']}
];
export const adminMenuHref=key=>key==='overview'?'/admin':'/admin/'+key;
export function adminMenuMatches(key,label,query){
 const words=query.toLowerCase().split(/\s+/).filter(Boolean),text=[label,key,Object.hasOwn(terms,key)?terms[key]:''].join(' ').toLowerCase();
 return words.every(word=>text.includes(word));
}
