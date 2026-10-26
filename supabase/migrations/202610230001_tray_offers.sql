-- Apply after 202610210001_live_commerce.sql. Existing orders and allocations are preserved.
BEGIN;
UPDATE public.products SET status='archived' WHERE slug='wheatgrass-powder';
UPDATE public.product_variants SET active=false WHERE product_id IN (SELECT id FROM public.products WHERE slug='wheatgrass-powder');
UPDATE public.subscription_plans SET active=false WHERE variant_id IN (SELECT v.id FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE p.slug IN ('fresh-wheatgrass','wheatgrass-powder'));
UPDATE public.products SET name='Wheatgrass Trays',description='Fresh wheatgrass trays. 1.25 kg per tray. One-time price ₹500 per tray. First eligible one-time order: one complimentary tray for each tray purchased.',price_paise=50000 WHERE slug='fresh-wheatgrass';
-- Keep tax approval and active/draft status under the owner's existing control.
UPDATE public.product_variants v SET price_paise=v.trays*50000,active=true FROM public.products p WHERE p.id=v.product_id AND p.slug='fresh-wheatgrass';
INSERT INTO public.product_variants(product_id,sku,name,trays,price_paise,active)
 SELECT id,'DL-WG-1-T','1 tray · 1.25 kg',1,50000,true FROM public.products WHERE slug='fresh-wheatgrass'
 ON CONFLICT(sku) DO UPDATE SET name=excluded.name,price_paise=excluded.price_paise,active=true;
INSERT INTO public.subscription_plans(variant_id,code,name,interval_days,price_paise,active)
 SELECT id,'WG-TRAY-WEEKLY','Weekly greens · save 10%',7,45000,true FROM public.product_variants WHERE sku='DL-WG-1-T'
 ON CONFLICT(code) DO UPDATE SET price_paise=excluded.price_paise,active=true;
INSERT INTO public.subscription_plans(variant_id,code,name,interval_days,price_paise,active)
 SELECT id,'WG-TRAY-FORTNIGHTLY','Fortnightly greens · save 5%',14,47500,true FROM public.product_variants WHERE sku='DL-WG-1-T'
 ON CONFLICT(code) DO UPDATE SET price_paise=excluded.price_paise,active=true;
INSERT INTO public.product_images(product_id,url,alt,sort_order)
 SELECT id,'/media/wheatgrass-tray.png','Fresh wheatgrass tray',-1 FROM public.products WHERE slug='fresh-wheatgrass' ON CONFLICT(product_id,url) DO NOTHING;
INSERT INTO public.store_settings(key,value) VALUES('checkout','{"first_order_bogo":true}'::jsonb)
 ON CONFLICT(key) DO UPDATE SET value=public.store_settings.value||excluded.value;
CREATE OR REPLACE FUNCTION public.dl_store_offers() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('ready',true,'tray_weight_grams',1250,'one_time_price_paise',50000,'first_order_bogo',coalesce((value->>'first_order_bogo')::boolean,false)) FROM public.store_settings WHERE key='checkout';
$$;
REVOKE ALL ON FUNCTION public.dl_store_offers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dl_store_offers() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.dl_offer_eligibility() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to check your offer'; END IF;
 RETURN jsonb_build_object('eligible',coalesce((SELECT (value->>'first_order_bogo')::boolean FROM public.store_settings WHERE key='checkout'),false) AND NOT EXISTS(SELECT 1 FROM public.orders WHERE customer_id=auth.uid() AND status<>'cancelled'));
END $$;
REVOKE ALL ON FUNCTION public.dl_offer_eligibility() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dl_offer_eligibility() TO authenticated;
CREATE OR REPLACE FUNCTION public.dl_checkout(input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); v public.product_variants; p public.products; plan public.subscription_plans; cal public.delivery_calendar; slot public.delivery_slots; area public.service_areas; cp public.coupons; b public.farm_batches; o public.orders; cfg jsonb; qty integer; need integer; take_n integer; subtotal integer; discount_n integer:=0; tax_n integer; unit_n integer; oid uuid; ident text; method text; mode_n text; email_n text; used_n integer; gift_n integer:=0;
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
 IF plan.id IS NULL AND coalesce((cfg->>'first_order_bogo')::boolean,false)
 AND NOT EXISTS(SELECT 1 FROM public.orders WHERE customer_id=uid AND id<>oid AND status<>'cancelled') THEN
 gift_n:=v.trays*qty;
 INSERT INTO public.order_items(order_id,variant_id,product_name,sku,quantity,trays_per_unit,unit_price_paise,gst_percent,subscription)
 VALUES(oid,v.id,p.name||' — First order complimentary tray',v.sku,qty,v.trays,0,0,false);
 END IF;
 need:=v.trays*qty+gift_n;
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


INSERT INTO public.content_pages(slug,title,kind,body,seo_title,seo_description,status) VALUES('meet-your-wheatgrass-tray','Meet your wheatgrass tray','blog','{"sections":[{"title":"Fresh greens for preparation at home","paragraphs":["Detoxleaf sells fresh wheatgrass trays, rather than bottled juice or wheatgrass powder. Each tray is listed at 1.25 kg. That is the tray product quantity, not a promise of juice yield. Your preparation method and equipment will affect how much juice you make."]},{"title":"Start with one tray","paragraphs":["A one-time tray costs ₹500, before delivery charges and any applicable tax shown at checkout. Choose the tray quantity that suits your household and check your PIN before deciding on a delivery date."]},{"title":"Your first order goes a little further","paragraphs":["On an eligible first one-time order, the 1+1 offer adds one complimentary tray for each tray purchased. The offer is checked against your signed-in account and confirmed on the saved order. It does not combine with subscription pricing."]},{"title":"Keep the instructions close","paragraphs":["Follow the care, storage and preparation instructions that arrive with your tray. If you are unsure about your delivery or how to handle it, contact our team before using it."]}]}'::jsonb,'Meet your wheatgrass tray','One living tray, a simpler routine. Get to know the fresh greens at the heart of Detoxleaf.','published') ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.content_pages(slug,title,kind,body,seo_title,seo_description,status) VALUES('choose-your-wheatgrass-delivery-rhythm','Find your fresh delivery rhythm','blog','{"sections":[{"title":"Try a one-time order first","paragraphs":["A one-time order is a useful way to see how a fresh tray fits into your week. Notice when you prepare it and how quickly your household uses it before deciding on a schedule."]},{"title":"Choose the interval that suits you","paragraphs":["Our weekly offer is ₹450 per tray every seven days, saving ₹50 against the ₹500 one-time price. The fortnightly option is ₹475 per tray every fourteen days, saving ₹25. Delivery charges and applicable taxes are shown separately. Each tray is listed at 1.25 kg."]},{"title":"You stay in control","paragraphs":["A Detoxleaf subscription records your preferred delivery schedule. It does not automatically debit a card or create an unlimited supply of paid deliveries. Future orders still need confirmation and payment. Manage the schedule in your account and check availability for the next delivery."]},{"title":"A smaller commitment can work better","paragraphs":["Choose a quantity and interval you can comfortably use. You can pause, skip or cancel an eligible schedule from your account instead of building up deliveries you do not need."]}]}'::jsonb,'Find your fresh delivery rhythm','Weekly, fortnightly or one tray at a time. A practical guide to choosing your next delivery.','published') ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.content_pages(slug,title,kind,body,seo_title,seo_description,status) VALUES('from-farm-batch-to-front-door','From a growing batch to your front door','blog','{"sections":[{"title":"Every harvest starts with a record","paragraphs":["The farm workspace tracks batches using a planting date, harvest date, tray quantity and expiry date. Keeping those records together helps the team allocate available trays to orders."]},{"title":"Availability means more than a PIN code","paragraphs":["Checkout checks both delivery coverage and dated slot capacity. An area can be supported while a particular date is full. Enter your PIN, then choose an open delivery date and time window."]},{"title":"Your order has a traceable path","paragraphs":["After confirmation, order updates follow growing, packed, out for delivery and delivered. These are recorded updates from the store team, not a live GPS location. Your tracking page and account show the updates connected to your order."]},{"title":"Know where to ask for help","paragraphs":["Use your account support page for an order-related request. For a quick question about coverage or products, the WhatsApp button opens a draft conversation with our team. Keep your order number handy, and never share a payment OTP or password."]}]}'::jsonb,'From a growing batch to your front door','How batch records, delivery slots and order updates connect the farm to your doorstep.','published') ON CONFLICT(slug) DO NOTHING;
COMMIT;
