export function normalizeToast(message,options={}){
 const value=typeof message==='object'&&message!==null?message:{message,...options};
 const type=['success','error','info'].includes(value.type)?value.type:'success';
 const href=typeof value.href==='string'&&/^\/(?!\/)/.test(value.href)&&!/[\\\s]/.test(value.href)?value.href:null;
 return {message:String(value.message||'').slice(0,700),type,title:value.title||(type==='error'?'Something needs attention':type==='info'?'A little update':'All set'),href,action:href?String(value.action||'View details'):null};
}
export function mutationFeedback(url,input={},data={}){
 if(url==='/api/payments')return input.action==='verify'?{message:'Payment verified. Check your saved order for its latest status.',href:'/account/orders',action:'View order'}:input.action==='start'?{message:'Secure payment is ready. Complete it in the payment window.',type:'info'}:null;
 if(url==='/api/manage')return {message:input.action==='collect_cod'?'Cash collection recorded.':input.action==='transition'?'Order status updated.':input.action==='moderate'?'Your update has been saved.':'Changes saved successfully.'};
 if(url!=='/api/store')return null;
 switch(input.action){
  case 'wishlist':return {message:input.saved?'Saved to your wishlist.':'Removed from your wishlist.',href:'/wishlist',action:'View wishlist'};
  case 'checkout':return {message:data.order?.mode==='test'?'Test order saved. No live charge or physical delivery is implied.':data.order?.payment_method==='cod'?'Order placed. Your delivery is confirmed.':'Order saved. Your trays are reserved while you complete payment.',type:data.order?.payment_method==='cod'?'success':'info',href:'/account/orders',action:'View orders'};
  case 'waitlist':return {message:'You’re on the list. We’ll email when delivery reaches your PIN.'};
  case 'cancel':return {message:'Order cancelled. Its stock reservation has been released.',href:'/account/orders',action:'View orders'};
  case 'subscription':return {message:({pause:'Delivery schedule paused.',resume:'Delivery schedule resumed.',skip:'Next scheduled delivery skipped.',cancel:'Delivery schedule cancelled.'})[input.input?.operation]||'Delivery schedule updated.',href:'/account/subscriptions',action:'View schedule'};
  case 'support':return {message:'Support request sent. Follow replies in your account.',href:'/account/support',action:'View support'};
  case 'review':return {message:'Thanks! Your review was submitted for moderation.',href:'/account/reviews',action:'View reviews'};
  default:return null;
 }
}
