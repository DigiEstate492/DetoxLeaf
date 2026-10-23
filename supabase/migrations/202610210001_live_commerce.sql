-- Apply AFTER 202610160001_initial_commerce.sql in Supabase SQL Editor.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES public.delivery_calendar(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES public.subscription_plans(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_order_id text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'razorpay';
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS lease_at timestamptz;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS provider_id text;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS last_error text;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_source_order_unique ON public.subscriptions(source_order_id) WHERE source_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dl_availability() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('product_id',p.id,'available',coalesce((SELECT sum(b.trays-b.reserved-b.delivered-b.wasted) FROM public.farm_batches b WHERE b.product_id=p.id AND b.status='ready' AND b.harvest_date<=(now() AT TIME ZONE 'Asia/Kolkata')::date AND b.expires_on>=(now() AT TIME ZONE 'Asia/Kolkata')::date),0))),'[]') FROM public.products p WHERE p.status='active';
$$;
REVOKE ALL ON FUNCTION public.dl_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dl_availability() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.dl_slots(pin text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'date',c.delivery_date,'label',s.label,'available',c.capacity-c.reserved) ORDER BY c.delivery_date,s.starts_at),'[]') FROM public.delivery_calendar c JOIN public.delivery_slots s ON s.id=c.slot_id JOIN public.service_areas a ON a.pincode=s.pincode WHERE a.active AND a.pincode=pin AND s.active AND NOT c.closed AND c.delivery_date>=(now() AT TIME ZONE 'Asia/Kolkata')::date+a.lead_days AND c.capacity>c.reserved;
$$;
REVOKE ALL ON FUNCTION public.dl_slots(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dl_slots(text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION detoxleaf_private.queue_email(oid uuid,kind text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.notification_jobs(customer_id,order_id,channel,template,idempotency_key) SELECT customer_id,id,'email',kind,kind||'/'||id FROM public.orders WHERE id=oid ON CONFLICT(idempotency_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION detoxleaf_private.queue_email(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION detoxleaf_private.confirm_order(oid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=oid FOR UPDATE;
 IF o.status<>'pending' THEN RETURN; END IF;
 UPDATE public.orders SET status='confirmed',reservation_expires_at=NULL WHERE id=oid;
 INSERT INTO public.deliveries(order_id) VALUES(oid) ON CONFLICT(order_id) DO NOTHING;
 INSERT INTO public.order_events(order_id,status,message) VALUES(oid,'confirmed','Your order is confirmed.');
 IF o.subscription_plan_id IS NOT NULL THEN
 INSERT INTO public.subscriptions(customer_id,plan_id,source_order_id,quantity,price_paise,interval_days,next_delivery_date)
 SELECT o.customer_id,p.id,o.id,i.quantity,p.price_paise,p.interval_days,o.delivery_date+p.interval_days FROM public.subscription_plans p JOIN public.order_items i ON i.order_id=oid WHERE p.id=o.subscription_plan_id ON CONFLICT(source_order_id) WHERE source_order_id IS NOT NULL DO NOTHING;
 END IF;
 PERFORM detoxleaf_private.queue_email(oid,'order_confirmed');
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.confirm_order(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.dl_checkout(input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); v public.product_variants; p public.products; plan public.subscription_plans; cal public.delivery_calendar; slot public.delivery_slots; area public.service_areas; cp public.coupons; b public.farm_batches; o public.orders; cfg jsonb; qty integer; need integer; take_n integer; subtotal integer; discount_n integer:=0; tax_n integer; unit_n integer; oid uuid; ident text; method text; mode_n text; email_n text; used_n integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in before checkout'; END IF;
 SELECT email INTO email_n FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL;
 IF email_n IS NULL THEN RAISE EXCEPTION 'Confirm your email before ordering'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 qty:=(input->>'quantity')::integer; IF qty IS NULL OR qty<1 OR qty>99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
 ident:=uid||'/'||coalesce(input->>'request_id',''); IF length(ident)<50 OR length(ident)>120 THEN RAISE EXCEPTION 'Invalid checkout request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(ident,0));
 SELECT * INTO o FROM public.orders WHERE idempotency_key=ident;
 IF FOUND THEN RETURN to_jsonb(o); END IF;
 SELECT value INTO cfg FROM public.store_settings WHERE key='checkout';
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'Ordering is not open yet. Please contact us.'; END IF;
 -- Final legal pages must be published deliberately by the business.
 IF (SELECT count(*) FROM public.content_pages WHERE kind='policy' AND status='published' AND slug IN ('shipping-policy','refund-policy','privacy-policy','terms'))<4 THEN RAISE EXCEPTION 'Store policies need to be published before ordering opens'; END IF;
 SELECT * INTO v FROM public.product_variants WHERE id=(input->>'variant_id')::uuid AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This product option is unavailable'; END IF;
 SELECT * INTO p FROM public.products WHERE id=v.product_id AND status='active' AND tax_confirmed FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product or tax configuration is unavailable'; END IF;
 unit_n:=v.price_paise;
 IF nullif(input->>'plan_id','') IS NOT NULL THEN
 SELECT * INTO plan FROM public.subscription_plans WHERE id=(input->>'plan_id')::uuid AND variant_id=v.id AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Subscription plan unavailable'; END IF;
 unit_n:=plan.price_paise;
 END IF;
 SELECT * INTO cal FROM public.delivery_calendar WHERE id=(input->>'calendar_id')::uuid AND NOT closed FOR UPDATE;
 IF NOT FOUND OR cal.reserved>=cal.capacity THEN RAISE EXCEPTION 'That delivery slot is full'; END IF;
 SELECT * INTO slot FROM public.delivery_slots WHERE id=cal.slot_id AND active;
 SELECT * INTO area FROM public.service_areas WHERE pincode=slot.pincode AND active;
 IF area.pincode IS NULL OR area.pincode<>input->>'pincode' OR cal.delivery_date<(now() AT TIME ZONE 'Asia/Kolkata')::date+area.lead_days THEN RAISE EXCEPTION 'Check delivery availability again'; END IF;
 IF length(coalesce(input->>'name','')) NOT BETWEEN 2 AND 100 OR length(coalesce(input->>'phone','')) NOT BETWEEN 8 AND 30 OR length(coalesce(input->>'address','')) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Enter your full delivery details'; END IF;
 subtotal:=unit_n*qty;
 IF length(trim(coalesce(input->>'coupon','')))>0 THEN
 SELECT * INTO cp FROM public.coupons WHERE code=upper(trim(input->>'coupon')) AND active FOR UPDATE;
 IF NOT FOUND OR (cp.starts_at IS NOT NULL AND cp.starts_at>now()) OR (cp.expires_at IS NOT NULL AND cp.expires_at<now()) OR subtotal<cp.minimum_paise THEN RAISE EXCEPTION 'Coupon is not valid for this order'; END IF;
 SELECT count(*) INTO used_n FROM public.coupon_redemptions r JOIN public.orders x ON x.id=r.order_id WHERE r.coupon_id=cp.id AND x.status<>'cancelled';
 IF cp.usage_limit IS NOT NULL AND used_n>=cp.usage_limit THEN RAISE EXCEPTION 'Coupon limit reached'; END IF;
 SELECT count(*) INTO used_n FROM public.coupon_redemptions r JOIN public.orders x ON x.id=r.order_id WHERE r.coupon_id=cp.id AND r.customer_id=uid AND x.status<>'cancelled';
 IF used_n>=cp.per_customer_limit OR (cp.first_order_only AND EXISTS(SELECT 1 FROM public.orders WHERE customer_id=uid AND status<>'cancelled')) OR (cp.subscriber_only AND plan.id IS NULL AND NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE customer_id=uid AND status='active')) THEN RAISE EXCEPTION 'Coupon eligibility not met'; END IF;
 discount_n:=least(subtotal,CASE WHEN cp.kind='fixed' THEN cp.value ELSE round(subtotal*cp.value/100.0)::integer END);
 IF cp.max_discount_paise IS NOT NULL THEN discount_n:=least(discount_n,cp.max_discount_paise); END IF;
 END IF;
 tax_n:=round((subtotal-discount_n)*p.gst_percent/100.0)::integer;
 method:=coalesce(input->>'payment_method','razorpay'); mode_n:=coalesce(cfg->>'payment_mode','test');
 IF mode_n NOT IN ('test','live') THEN RAISE EXCEPTION 'Payment mode is not configured'; END IF;
 IF method NOT IN ('cod','razorpay') OR (method='cod' AND NOT coalesce((cfg->>'cod_enabled')::boolean,false)) THEN RAISE EXCEPTION 'Payment method unavailable'; END IF;
 IF method='razorpay' AND subtotal-discount_n+area.delivery_charge_paise+tax_n<100 THEN RAISE EXCEPTION 'Online payment requires an order total of at least one rupee'; END IF;
 oid:=gen_random_uuid();
 INSERT INTO public.orders(id,order_number,customer_id,customer_name,email,phone,shipping_address,pincode,delivery_date,delivery_slot,calendar_id,currency,subtotal_paise,discount_paise,shipping_paise,tax_paise,total_paise,status,payment_status,mode,idempotency_key,reservation_expires_at,subscription_plan_id,payment_method)
 VALUES(oid,'DL-'||upper(substr(replace(oid::text,'-',''),1,12)),uid,input->>'name',email_n,input->>'phone',jsonb_build_object('address',input->>'address','city',area.city),area.pincode,cal.delivery_date,slot.label,cal.id,'INR',subtotal,discount_n,area.delivery_charge_paise,tax_n,subtotal-discount_n+area.delivery_charge_paise+tax_n,'pending',CASE WHEN method='cod' THEN 'cod' ELSE 'pending' END,mode_n,ident,CASE WHEN method='razorpay' THEN now()+interval '30 minutes' END,plan.id,method);
 INSERT INTO public.order_items(order_id,variant_id,product_name,sku,quantity,trays_per_unit,unit_price_paise,gst_percent,subscription) VALUES(oid,v.id,p.name,v.sku,qty,v.trays,unit_n,p.gst_percent,plan.id IS NOT NULL);
 need:=v.trays*qty;
 FOR b IN SELECT * FROM public.farm_batches WHERE product_id=p.id AND status='ready' AND harvest_date<=cal.delivery_date AND expires_on>=cal.delivery_date AND trays-reserved-delivered-wasted>0 ORDER BY harvest_date,id FOR UPDATE LOOP
 take_n:=least(need,b.trays-b.reserved-b.delivered-b.wasted);
 UPDATE public.farm_batches SET reserved=reserved+take_n WHERE id=b.id;
 INSERT INTO public.batch_allocations(order_id,batch_id,trays) VALUES(oid,b.id,take_n);
 INSERT INTO public.inventory_movements(batch_id,order_id,kind,trays,reason,actor_id) VALUES(b.id,oid,'reserve',take_n,'Order reserved',uid);
 need:=need-take_n; EXIT WHEN need=0;
 END LOOP;
 IF need>0 THEN RAISE EXCEPTION 'Insufficient harvest stock for this delivery date'; END IF;
 UPDATE public.delivery_calendar SET reserved=reserved+1 WHERE id=cal.id;
 IF cp.id IS NOT NULL AND discount_n>0 THEN INSERT INTO public.coupon_redemptions(coupon_id,order_id,customer_id,discount_paise) VALUES(cp.id,oid,uid,discount_n); END IF;
 INSERT INTO public.order_events(order_id,status,message) VALUES(oid,'pending',CASE WHEN method='cod' THEN 'Order received.' ELSE 'Stock reserved while payment is completed.' END);
 IF method='cod' THEN PERFORM detoxleaf_private.confirm_order(oid); END IF;
 SELECT * INTO o FROM public.orders WHERE id=oid; RETURN to_jsonb(o);
END $$;
REVOKE ALL ON FUNCTION public.dl_checkout(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_checkout(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dl_transition(oid uuid,target text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; a public.batch_allocations; permitted boolean; uid uuid:=auth.uid();
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 permitted:=detoxleaf_private.is_staff(ARRAY['owner','admin','operations']);
 IF NOT permitted AND NOT (target='cancelled' AND o.customer_id=uid AND o.status IN ('pending','confirmed')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF o.status=target THEN RETURN; END IF;
 IF target='cancelled' THEN
 IF o.status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Order can no longer be cancelled'; END IF;
 IF o.payment_status IN ('paid','partially_refunded') THEN RAISE EXCEPTION 'A paid order requires a reviewed refund before cancellation'; END IF;
 FOR a IN SELECT * FROM public.batch_allocations WHERE order_id=oid AND status='reserved' ORDER BY batch_id FOR UPDATE LOOP
 UPDATE public.farm_batches SET reserved=reserved-a.trays WHERE id=a.batch_id;
 UPDATE public.batch_allocations SET status='released' WHERE id=a.id;
 INSERT INTO public.inventory_movements(batch_id,order_id,kind,trays,reason,actor_id) VALUES(a.batch_id,oid,'release',a.trays,'Order cancelled',uid);
 END LOOP;
 UPDATE public.delivery_calendar SET reserved=greatest(0,reserved-1) WHERE id=o.calendar_id;
 UPDATE public.orders SET reservation_expires_at=NULL WHERE id=oid;
 UPDATE public.deliveries SET status='failed' WHERE order_id=oid;
 ELSE
 IF NOT permitted OR NOT ((o.status='confirmed' AND target='growing') OR (o.status='growing' AND target='packed') OR (o.status='packed' AND target='out_for_delivery') OR (o.status='out_for_delivery' AND target='delivered')) THEN RAISE EXCEPTION 'Invalid order transition'; END IF;
 IF o.payment_status NOT IN ('paid','cod') THEN RAISE EXCEPTION 'Order is not paid'; END IF;
 IF target='delivered' THEN
 FOR a IN SELECT * FROM public.batch_allocations WHERE order_id=oid AND status='reserved' ORDER BY batch_id FOR UPDATE LOOP
 UPDATE public.farm_batches SET reserved=reserved-a.trays,delivered=delivered+a.trays WHERE id=a.batch_id;
 UPDATE public.batch_allocations SET status='delivered' WHERE id=a.id;
 INSERT INTO public.inventory_movements(batch_id,order_id,kind,trays,reason,actor_id) VALUES(a.batch_id,oid,'deliver',a.trays,'Order delivered',uid);
 END LOOP;
 -- Cash collection is recorded separately from delivery.
 INSERT INTO public.reward_ledger(customer_id,order_id,points,reason,idempotency_key) SELECT o.customer_id,oid,floor(o.total_paise/10000.0)::integer,'Delivered order','delivery/'||oid WHERE o.payment_status='paid' AND floor(o.total_paise/10000.0)>0 ON CONFLICT(idempotency_key) DO NOTHING;
 END IF;
 IF target IN ('packed','out_for_delivery','delivered') THEN
 UPDATE public.deliveries SET status=target,dispatched_at=CASE WHEN target='out_for_delivery' THEN now() ELSE dispatched_at END,delivered_at=CASE WHEN target='delivered' THEN now() ELSE delivered_at END WHERE order_id=oid;
 END IF;
 END IF;
 UPDATE public.orders SET status=target WHERE id=oid;
 INSERT INTO public.order_events(order_id,status,message) VALUES(oid,target,replace(target,'_',' '));
 PERFORM detoxleaf_private.queue_email(oid,target);
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,detail) VALUES(uid,'order_transition','orders',oid,jsonb_build_object('from',o.status,'to',target));
END $$;
REVOKE ALL ON FUNCTION public.dl_transition(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_transition(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dl_capture_payment(oid uuid,provider_order text,provider_payment text,amount integer,currency_n text,mode_n text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR o.gateway_order_id IS DISTINCT FROM provider_order OR o.total_paise<>amount OR currency_n<>'INR' OR o.mode<>mode_n THEN RAISE EXCEPTION 'Payment does not match order'; END IF;
 IF o.payment_status='paid' THEN
 IF NOT EXISTS(SELECT 1 FROM public.payments WHERE order_id=oid AND provider_payment_id=provider_payment) THEN RAISE EXCEPTION 'Different payment already recorded'; END IF; RETURN;
 END IF;
 INSERT INTO public.payments(order_id,provider_order_id,provider_payment_id,amount_paise,status,mode) VALUES(oid,provider_order,provider_payment,amount,'captured',mode_n);
 IF o.status='cancelled' THEN
 INSERT INTO public.audit_log(action,entity_type,entity_id,detail) VALUES('late_payment_refund_required','orders',oid,jsonb_build_object('payment_id',provider_payment));
 UPDATE public.orders SET payment_status='paid' WHERE id=oid;
 ELSE
 UPDATE public.orders SET payment_status='paid' WHERE id=oid;
 PERFORM detoxleaf_private.confirm_order(oid);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.dl_capture_payment(uuid,text,text,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dl_capture_payment(uuid,text,text,integer,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.dl_customer_action(action text,input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); oid uuid; tid uuid; sid uuid; rec public.subscriptions; days_n integer; order_item public.order_items; p_id uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 IF action='support' THEN
 oid:=nullif(input->>'order_id','')::uuid;
 IF oid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.orders WHERE id=oid AND customer_id=uid) THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF length(coalesce(input->>'subject','')) NOT BETWEEN 3 AND 150 OR length(coalesce(input->>'message','')) NOT BETWEEN 5 AND 5000 THEN RAISE EXCEPTION 'Enter a subject and message'; END IF;
 INSERT INTO public.support_tickets(customer_id,order_id,category,subject) VALUES(uid,oid,coalesce(input->>'category','general'),input->>'subject') RETURNING id INTO tid;
 INSERT INTO public.support_messages(ticket_id,author_id,body) VALUES(tid,uid,input->>'message'); RETURN jsonb_build_object('id',tid);
 ELSIF action='review' THEN
 SELECT i.* INTO order_item FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE i.id=(input->>'order_item_id')::uuid AND o.customer_id=uid AND o.status='delivered';
 IF NOT FOUND THEN RAISE EXCEPTION 'A delivered purchase is required'; END IF;
 SELECT product_id INTO p_id FROM public.product_variants WHERE id=order_item.variant_id;
 INSERT INTO public.reviews(customer_id,order_item_id,product_id,display_name,rating,body) SELECT uid,order_item.id,p_id,coalesce(nullif(full_name,''),'Customer'),(input->>'rating')::integer,input->>'body' FROM public.profiles WHERE id=uid; RETURN jsonb_build_object('status','pending');
 ELSIF action='subscription' THEN
 SELECT * INTO rec FROM public.subscriptions WHERE id=(input->>'id')::uuid AND customer_id=uid FOR UPDATE;
 IF NOT FOUND OR rec.status='cancelled' THEN RAISE EXCEPTION 'Subscription not available'; END IF;
 IF input->>'operation'='skip' THEN UPDATE public.subscriptions SET next_delivery_date=greatest((now() AT TIME ZONE 'Asia/Kolkata')::date,next_delivery_date)+interval_days WHERE id=rec.id;
 ELSIF input->>'operation' IN ('pause','resume','cancel') THEN UPDATE public.subscriptions SET status=CASE input->>'operation' WHEN 'pause' THEN 'paused' WHEN 'resume' THEN 'active' ELSE 'cancelled' END WHERE id=rec.id;
 ELSE RAISE EXCEPTION 'Unsupported subscription action'; END IF;
 INSERT INTO public.subscription_events(subscription_id,action) VALUES(rec.id,input->>'operation'); RETURN jsonb_build_object('saved',true);
 END IF;
 RAISE EXCEPTION 'Unsupported action';
END $$;
REVOKE ALL ON FUNCTION public.dl_customer_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_customer_action(text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dl_waitlist(pin text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE email_n text;
BEGIN
 SELECT email INTO email_n FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF email_n IS NULL OR pin!~'^[0-9]{6}$' THEN RAISE EXCEPTION 'Sign in with a confirmed email and enter a valid PIN'; END IF;
 INSERT INTO public.waitlist(email,pincode,consent) VALUES(email_n,pin,true) ON CONFLICT(email,pincode) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.dl_waitlist(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_waitlist(text) TO authenticated;

-- Centralized admin writes; the caller cannot choose SQL identifiers or protected balance fields.
CREATE OR REPLACE FUNCTION public.dl_admin_write(entity text,record_id text,fields jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed text[]; pk text:='id'; cols text; sets text; result jsonb; existing_role text; actor uuid:=auth.uid();
BEGIN
 IF NOT detoxleaf_private.is_staff(ARRAY['owner','admin']) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 CASE entity
 WHEN 'products' THEN allowed:=ARRAY['slug','name','description','sku','status','price_paise','compare_at_paise','discount_percent','gst_percent','tax_confirmed','shipping_required'];
 WHEN 'product_images' THEN allowed:=ARRAY['product_id','url','alt','sort_order'];
 WHEN 'product_variants' THEN allowed:=ARRAY['product_id','sku','name','trays','price_paise','active'];
 WHEN 'subscription_plans' THEN allowed:=ARRAY['variant_id','code','name','interval_days','price_paise','active'];
 WHEN 'service_areas' THEN allowed:=ARRAY['pincode','city','delivery_charge_paise','lead_days','active']; pk:='pincode';
 WHEN 'delivery_slots' THEN allowed:=ARRAY['pincode','label','starts_at','ends_at','capacity','active'];
 WHEN 'delivery_calendar' THEN allowed:=ARRAY['slot_id','delivery_date','capacity','closed'];
 WHEN 'farm_batches' THEN allowed:=ARRAY['code','product_id','planting_date','harvest_date','expires_on','trays','production_quantity_grams','status','wasted'];
 WHEN 'coupons' THEN allowed:=ARRAY['code','kind','value','minimum_paise','max_discount_paise','usage_limit','per_customer_limit','first_order_only','subscriber_only','starts_at','expires_at','active'];
 WHEN 'content_pages' THEN allowed:=ARRAY['slug','title','kind','body','seo_title','seo_description','status','published_at'];
 WHEN 'addresses' THEN allowed:=ARRAY['customer_id','label','recipient','phone','line1','line2','city','state','pincode'];
 WHEN 'subscriptions' THEN allowed:=ARRAY['status','next_delivery_date','quantity']; IF record_id IS NULL THEN RAISE EXCEPTION 'Schedules are created from confirmed customer orders'; END IF;
 WHEN 'reward_ledger' THEN
 IF record_id IS NOT NULL THEN RAISE EXCEPTION 'Reward history cannot be rewritten. Add a correcting adjustment.'; END IF;
 IF length(trim(coalesce(fields->>'reason','')))<5 OR coalesce((fields->>'points')::integer,0)=0 THEN RAISE EXCEPTION 'Enter a nonzero points adjustment and a clear reason'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=(fields->>'customer_id')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an existing customer'; END IF;
 IF (SELECT coalesce(sum(points),0) FROM public.reward_ledger WHERE customer_id=(fields->>'customer_id')::uuid)+(fields->>'points')::integer<0 THEN RAISE EXCEPTION 'Adjustment would make the reward balance negative'; END IF;
 fields:=fields||jsonb_build_object('idempotency_key','admin-adjustment/'||gen_random_uuid());
 allowed:=ARRAY['customer_id','points','reason','idempotency_key'];
 WHEN 'profiles' THEN allowed:=ARRAY['full_name','phone','tags']; IF record_id IS NULL THEN RAISE EXCEPTION 'Choose an existing customer'; END IF;
 WHEN 'store_settings' THEN allowed:=ARRAY['key','value']; pk:='key'; IF coalesce(record_id,fields->>'key') NOT IN ('brand','checkout','rewards') THEN RAISE EXCEPTION 'Unsupported business setting'; END IF;
 WHEN 'staff_members' THEN
 IF NOT detoxleaf_private.is_staff(ARRAY['owner']) THEN RAISE EXCEPTION 'Only an owner can assign staff roles'; END IF;
 LOCK TABLE public.staff_members IN SHARE ROW EXCLUSIVE MODE;
 allowed:=ARRAY['user_id','role','active'];pk:='user_id';
 SELECT role INTO existing_role FROM public.staff_members WHERE user_id=record_id::uuid AND active;
 IF existing_role='owner' AND (coalesce(fields->>'role','owner')<>'owner' OR fields->>'active'='false') AND (SELECT count(*) FROM public.staff_members WHERE role='owner' AND active)<=1 THEN RAISE EXCEPTION 'Keep at least one active owner'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported entity';
 END CASE;
 IF jsonb_typeof(fields)<>'object' OR fields='{}' OR EXISTS(SELECT 1 FROM jsonb_object_keys(fields) x WHERE NOT x=ANY(allowed)) THEN RAISE EXCEPTION 'Unsupported fields'; END IF;
 IF record_id IS NOT NULL AND fields?pk THEN fields:=fields-pk; END IF;
 SELECT string_agg(format('%I',x),','),string_agg(format('%1$I=x.%1$I',x),',') INTO cols,sets FROM jsonb_object_keys(fields) x;
 IF cols IS NULL THEN RAISE EXCEPTION 'No editable fields'; END IF;
 IF record_id IS NULL THEN
 EXECUTE format('WITH changed AS (INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) x RETURNING *) SELECT to_jsonb(changed) FROM changed',entity,cols) INTO result USING fields;
 ELSE
 EXECUTE format('WITH changed AS (UPDATE public.%1$I t SET %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) x WHERE t.%3$I::text=$2 RETURNING t.*) SELECT to_jsonb(changed) FROM changed',entity,sets,pk) INTO result USING fields,record_id;
 END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id) VALUES(actor,'save',entity,coalesce(result->>pk,record_id));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.dl_admin_write(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_admin_write(text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dl_staff_action(action text,input jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tid uuid; uid uuid:=auth.uid();
BEGIN
 IF NOT detoxleaf_private.is_staff(ARRAY['owner','admin','support']) THEN RAISE EXCEPTION 'Support staff access required'; END IF;
 IF action='support' THEN
 tid:=(input->>'id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.support_tickets WHERE id=tid) THEN RAISE EXCEPTION 'Ticket not found'; END IF;
 UPDATE public.support_tickets SET status=input->>'status' WHERE id=tid;
 IF length(trim(coalesce(input->>'reply','')))>0 THEN INSERT INTO public.support_messages(ticket_id,author_id,body) VALUES(tid,uid,input->>'reply'); END IF;
 ELSIF action='review' THEN
 IF input->>'status' NOT IN ('published','rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
 UPDATE public.reviews SET status=input->>'status' WHERE id=(input->>'id')::uuid;
 ELSE RAISE EXCEPTION 'Unsupported action'; END IF;
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id) VALUES(uid,'moderate',action,input->>'id');
END $$;
REVOKE ALL ON FUNCTION public.dl_staff_action(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_staff_action(text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dl_report() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT detoxleaf_private.is_staff() THEN RAISE EXCEPTION 'Reporting access required'; END IF;
 RETURN jsonb_build_object('orders',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'total',total_paise/100.0,'city',shipping_address->>'city','stage',CASE status WHEN 'confirmed' THEN 0 WHEN 'growing' THEN 1 WHEN 'packed' THEN 2 WHEN 'out_for_delivery' THEN 3 WHEN 'delivered' THEN 4 END,'cancelled',status='cancelled','status',status,'payment_status',payment_status,'mode',mode)) FROM public.orders),'[]'),'subscriptions',coalesce((SELECT jsonb_agg(jsonb_build_object('status',status,'price_paise',price_paise,'interval_days',interval_days)) FROM public.subscriptions),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.dl_report() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_report() TO authenticated;

-- Expiration and outbox claiming are server-only and safe for concurrent workers.
CREATE OR REPLACE FUNCTION public.dl_expire_reservations() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; a public.batch_allocations; n integer:=0;
BEGIN
 FOR o IN SELECT * FROM public.orders WHERE status='pending' AND payment_status='pending' AND reservation_expires_at<now() ORDER BY id FOR UPDATE SKIP LOCKED LOOP
 FOR a IN SELECT * FROM public.batch_allocations WHERE order_id=o.id AND status='reserved' ORDER BY batch_id FOR UPDATE LOOP
 UPDATE public.farm_batches SET reserved=reserved-a.trays WHERE id=a.batch_id;
 UPDATE public.batch_allocations SET status='released' WHERE id=a.id;
 INSERT INTO public.inventory_movements(batch_id,order_id,kind,trays,reason) VALUES(a.batch_id,o.id,'release',a.trays,'Payment reservation expired');
 END LOOP;
 UPDATE public.delivery_calendar SET reserved=greatest(0,reserved-1) WHERE id=o.calendar_id;
 UPDATE public.orders SET status='cancelled',reservation_expires_at=NULL WHERE id=o.id;
 INSERT INTO public.order_events(order_id,status,message) VALUES(o.id,'cancelled','The payment reservation expired. Contact support if payment was deducted.');n:=n+1;
 END LOOP;RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.dl_expire_reservations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dl_expire_reservations() TO service_role;
CREATE OR REPLACE FUNCTION public.dl_claim_emails() RETURNS SETOF public.notification_jobs LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.notification_jobs SET status='processing',attempts=attempts+1,lease_at=now()
 WHERE id IN (SELECT id FROM public.notification_jobs WHERE channel='email' AND attempts<5 AND scheduled_at<=now() AND created_at>now()-interval '23 hours' AND (status IN ('pending','failed') OR (status='processing' AND lease_at<now()-interval '5 minutes')) ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.dl_claim_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dl_claim_emails() TO service_role;
-- Remove the original broad staff-read policies for sensitive records.
DO $$ DECLARE t text; roles text[]; BEGIN
 FOR t IN SELECT unnest(ARRAY['profiles','addresses','orders','order_items','order_events','deliveries','batch_allocations','inventory_movements','farm_batches','inventory_summary','payments','coupon_redemptions','subscriptions','subscription_events','support_tickets','support_messages','reward_ledger','referrals','waitlist','notification_jobs','webhook_events','audit_log','store_settings','staff_members']) LOOP
 IF t='inventory_summary' THEN CONTINUE; END IF;
 roles:=CASE WHEN t IN ('payments','webhook_events','audit_log','notification_jobs','store_settings','reward_ledger','referrals') THEN ARRAY['owner','admin'] ELSE ARRAY['owner','admin','operations','support'] END;
 EXECUTE format('DROP POLICY IF EXISTS staff_read ON public.%I',t);
 EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (detoxleaf_private.is_staff(%L::text[]))',t,roles);
 END LOOP;
END $$;
DROP POLICY IF EXISTS own_staff_role ON public.staff_members;
CREATE POLICY own_staff_role ON public.staff_members FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.dl_reward_balance() RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT coalesce(sum(points),0) FROM public.reward_ledger WHERE customer_id=auth.uid() $$;
REVOKE ALL ON FUNCTION public.dl_reward_balance() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_reward_balance() TO authenticated;
CREATE OR REPLACE FUNCTION detoxleaf_private.validate_content() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='published' THEN
 IF jsonb_typeof(NEW.body->'sections') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.body->'sections')=0 THEN RAISE EXCEPTION 'Publish pages with at least one content section'; END IF;
 NEW.published_at:=coalesce(NEW.published_at,now());
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.validate_content() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS dl_validate_content ON public.content_pages;
CREATE TRIGGER dl_validate_content BEFORE INSERT OR UPDATE ON public.content_pages FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.validate_content();


CREATE OR REPLACE FUNCTION public.dl_collect_cod(oid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;
BEGIN
 IF NOT detoxleaf_private.is_staff(ARRAY['owner','admin','operations']) THEN RAISE EXCEPTION 'Fulfilment access required'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR o.payment_method<>'cod' OR o.status<>'delivered' THEN RAISE EXCEPTION 'A delivered cash-on-delivery order is required'; END IF;
 IF o.payment_status='paid' THEN RETURN; END IF;
 IF o.payment_status<>'cod' THEN RAISE EXCEPTION 'Payment status requires review'; END IF;
 UPDATE public.orders SET payment_status='paid' WHERE id=oid;
 INSERT INTO public.payments(order_id,provider,provider_payment_id,amount_paise,status,mode) VALUES(oid,'cod','cod_'||oid,o.total_paise,'captured',o.mode);
 INSERT INTO public.reward_ledger(customer_id,order_id,points,reason,idempotency_key) SELECT o.customer_id,oid,floor(o.total_paise/10000.0)::integer,'Paid delivered order','delivery/'||oid WHERE floor(o.total_paise/10000.0)>0 ON CONFLICT(idempotency_key) DO NOTHING;
 INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'cash_collected','orders',oid);
END $$;
REVOKE ALL ON FUNCTION public.dl_collect_cod(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_collect_cod(uuid) TO authenticated;

INSERT INTO detoxleaf_private.migrations(version) VALUES('202610210001') ON CONFLICT DO NOTHING;
COMMIT;
SELECT 'Live commerce migration installed' AS result;
