-- Detoxleaf initial schema. Run the ENTIRE file in Supabase SQL Editor as postgres.
-- Amounts are integer paise. No credentials or fabricated orders/customers/stock.
-- This migration is transactional and may be rerun without resetting business data.
BEGIN;
CREATE SCHEMA IF NOT EXISTS detoxleaf_private;
REVOKE ALL ON SCHEMA detoxleaf_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA detoxleaf_private TO authenticated, service_role;
CREATE TABLE IF NOT EXISTS detoxleaf_private.migrations(version text primary key, applied_at timestamptz not null default now());
REVOKE ALL ON detoxleaf_private.migrations FROM PUBLIC, anon, authenticated;
-- Refuse to adopt pre-existing, unrelated tables on first installation.
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM detoxleaf_private.migrations WHERE version='202610160001')
 AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename = ANY(ARRAY['profiles','staff_members','addresses','products','product_images','product_variants','subscription_plans','service_areas','delivery_slots','delivery_calendar','farm_batches','coupons','orders','order_items','order_events','batch_allocations','inventory_movements','deliveries','payments','webhook_events','coupon_redemptions','subscriptions','subscription_events','wishlist','support_tickets','support_messages','reviews','review_media','reward_ledger','referrals','waitlist','notification_jobs','content_pages','store_settings','audit_log'])) THEN
 RAISE EXCEPTION 'Existing commerce tables detected. Review schema before applying Detoxleaf migration; nothing has been changed.';
 END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', phone text, tags text[] not null default '{}', created_at timestamptz not null default now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('owner','admin','operations','support','viewer')), active boolean not null default true, created_at timestamptz not null default now()
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_members FROM anon, authenticated;
GRANT ALL ON public.staff_members TO service_role;

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id) on delete cascade, label text not null default 'Home', recipient text not null, phone text not null, line1 text not null, line2 text, city text not null, state text not null, pincode text not null check(pincode ~ '^[0-9]{6}$'), is_default boolean not null default false, created_at timestamptz not null default now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.addresses FROM anon, authenticated;
GRANT ALL ON public.addresses TO service_role;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text not null default '', sku text not null unique, status text not null default 'draft' check(status in ('draft','active','coming_soon','archived')), price_paise integer check(price_paise >= 0), compare_at_paise integer check(compare_at_paise >= 0), discount_percent numeric(5,2) not null default 0 check(discount_percent between 0 and 100), gst_percent numeric(5,2) not null default 0 check(gst_percent between 0 and 100), tax_confirmed boolean not null default false, shipping_required boolean not null default true, created_at timestamptz not null default now(), check(status <> 'active' or (price_paise is not null and tax_confirmed))
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM anon, authenticated;
GRANT ALL ON public.products TO service_role;

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, url text not null, alt text not null default '', sort_order integer not null default 0, unique(product_id,url)
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_images FROM anon, authenticated;
GRANT ALL ON public.product_images TO service_role;

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, sku text not null unique, name text not null, trays integer not null check(trays > 0), price_paise integer not null check(price_paise >= 0), active boolean not null default false
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_variants FROM anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id), code text not null unique, name text not null, interval_days integer not null check(interval_days > 0), price_paise integer not null check(price_paise >= 0), active boolean not null default false
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_plans FROM anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

CREATE TABLE IF NOT EXISTS public.service_areas (
  pincode text primary key check(pincode ~ '^[0-9]{6}$'), city text not null, delivery_charge_paise integer not null check(delivery_charge_paise >= 0), lead_days integer not null default 1 check(lead_days >= 0), active boolean not null default false
);
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_areas FROM anon, authenticated;
GRANT ALL ON public.service_areas TO service_role;

CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id uuid primary key default gen_random_uuid(), pincode text not null references public.service_areas(pincode), label text not null, starts_at time not null, ends_at time not null, capacity integer not null default 0 check(capacity >= 0), active boolean not null default false, unique(pincode,label), check(ends_at > starts_at)
);
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_slots FROM anon, authenticated;
GRANT ALL ON public.delivery_slots TO service_role;

CREATE TABLE IF NOT EXISTS public.delivery_calendar (
  id uuid primary key default gen_random_uuid(), slot_id uuid not null references public.delivery_slots(id), delivery_date date not null, capacity integer not null check(capacity >= 0), reserved integer not null default 0 check(reserved >= 0 and reserved <= capacity), closed boolean not null default false, unique(slot_id,delivery_date)
);
ALTER TABLE public.delivery_calendar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_calendar FROM anon, authenticated;
GRANT ALL ON public.delivery_calendar TO service_role;

CREATE TABLE IF NOT EXISTS public.farm_batches (
  id uuid primary key default gen_random_uuid(), code text not null unique, product_id uuid not null references public.products(id), planting_date date not null, harvest_date date not null, expires_on date not null, trays integer not null check(trays >= 0), production_quantity_grams integer check(production_quantity_grams >= 0), status text not null check(status in ('growing','ready','closed')), reserved integer not null default 0 check(reserved >= 0), delivered integer not null default 0 check(delivered >= 0), wasted integer not null default 0 check(wasted >= 0), created_at timestamptz not null default now(), check(harvest_date >= planting_date and expires_on >= harvest_date), check(reserved + delivered + wasted <= trays)
);
ALTER TABLE public.farm_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.farm_batches FROM anon, authenticated;
GRANT ALL ON public.farm_batches TO service_role;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique check(code = upper(code)), kind text not null check(kind in ('fixed','percentage')), value integer not null check(value > 0), minimum_paise integer not null default 0 check(minimum_paise >= 0), max_discount_paise integer check(max_discount_paise >= 0), usage_limit integer check(usage_limit > 0), per_customer_limit integer not null default 1 check(per_customer_limit > 0), first_order_only boolean not null default false, subscriber_only boolean not null default false, starts_at timestamptz, expires_at timestamptz, active boolean not null default false, check(kind <> 'percentage' or value <= 100), check(expires_at is null or starts_at is null or expires_at > starts_at)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM anon, authenticated;
GRANT ALL ON public.coupons TO service_role;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique, customer_id uuid references public.profiles(id) on delete set null, customer_name text not null, email text not null, phone text not null, shipping_address jsonb not null check(jsonb_typeof(shipping_address) = 'object'), pincode text not null check(pincode ~ '^[0-9]{6}$'), delivery_date date not null, delivery_slot text not null, currency text not null default 'INR' check(currency = 'INR'), subtotal_paise integer not null check(subtotal_paise >= 0), discount_paise integer not null default 0 check(discount_paise >= 0 and discount_paise <= subtotal_paise), shipping_paise integer not null default 0 check(shipping_paise >= 0), tax_paise integer not null default 0 check(tax_paise >= 0), total_paise integer not null check(total_paise >= 0), status text not null default 'pending' check(status in ('pending','confirmed','growing','packed','out_for_delivery','delivered','cancelled')), payment_status text not null default 'pending' check(payment_status in ('pending','authorized','paid','failed','partially_refunded','refunded','cod')), mode text not null default 'test' check(mode in ('test','live')), idempotency_key text not null unique, created_at timestamptz not null default now(), check(total_paise = subtotal_paise - discount_paise + shipping_paise + tax_paise)
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT ALL ON public.orders TO service_role;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), variant_id uuid references public.product_variants(id), product_name text not null, sku text not null, quantity integer not null check(quantity > 0), trays_per_unit integer not null check(trays_per_unit > 0), unit_price_paise integer not null check(unit_price_paise >= 0), gst_percent numeric(5,2) not null default 0 check(gst_percent between 0 and 100), subscription boolean not null default false
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_items FROM anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), status text not null, message text not null, customer_visible boolean not null default true, created_at timestamptz not null default now()
);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_events FROM anon, authenticated;
GRANT ALL ON public.order_events TO service_role;

CREATE TABLE IF NOT EXISTS public.batch_allocations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), batch_id uuid not null references public.farm_batches(id), trays integer not null check(trays > 0), status text not null default 'reserved' check(status in ('reserved','delivered','released')), unique(order_id,batch_id)
);
ALTER TABLE public.batch_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.batch_allocations FROM anon, authenticated;
GRANT ALL ON public.batch_allocations TO service_role;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.farm_batches(id), order_id uuid references public.orders(id), kind text not null check(kind in ('harvest','reserve','release','deliver','waste','adjust')), trays integer not null check(trays <> 0), reason text not null, actor_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_movements FROM anon, authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id), status text not null default 'scheduled' check(status in ('scheduled','packed','out_for_delivery','delivered','failed')), assigned_to uuid references public.staff_members(user_id), dispatched_at timestamptz, delivered_at timestamptz, proof_url text, internal_notes text, created_at timestamptz not null default now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deliveries FROM anon, authenticated;
GRANT ALL ON public.deliveries TO service_role;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), provider text not null default 'razorpay', provider_order_id text unique, provider_payment_id text unique, amount_paise integer not null check(amount_paise > 0), refunded_paise integer not null default 0 check(refunded_paise >= 0 and refunded_paise <= amount_paise), currency text not null default 'INR' check(currency = 'INR'), status text not null check(status in ('created','authorized','captured','failed','partially_refunded','refunded')), mode text not null default 'test' check(mode in ('test','live')), created_at timestamptz not null default now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null, event_type text not null, payload jsonb not null, processed_at timestamptz, error text, created_at timestamptz not null default now(), unique(provider,provider_event_id)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.webhook_events FROM anon, authenticated;
GRANT ALL ON public.webhook_events TO service_role;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.coupons(id), order_id uuid not null unique references public.orders(id), customer_id uuid references public.profiles(id) on delete set null, discount_paise integer not null check(discount_paise > 0), created_at timestamptz not null default now()
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_redemptions FROM anon, authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id), plan_id uuid not null references public.subscription_plans(id), address_id uuid references public.addresses(id), source_order_id uuid references public.orders(id), quantity integer not null default 1 check(quantity > 0), price_paise integer not null check(price_paise >= 0), interval_days integer not null check(interval_days > 0), next_delivery_date date not null, status text not null default 'active' check(status in ('active','paused','cancelled','completed')), provider_subscription_id text unique, created_at timestamptz not null default now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
GRANT ALL ON public.subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id), action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_events FROM anon, authenticated;
GRANT ALL ON public.subscription_events TO service_role;

CREATE TABLE IF NOT EXISTS public.wishlist (
  customer_id uuid not null references public.profiles(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, created_at timestamptz not null default now(), primary key(customer_id,product_id)
);
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wishlist FROM anon, authenticated;
GRANT ALL ON public.wishlist TO service_role;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.profiles(id) on delete set null, order_id uuid references public.orders(id), category text not null check(category in ('general','delivery','cancellation','return_refund')), subject text not null, status text not null default 'open' check(status in ('open','in_progress','resolved','closed')), created_at timestamptz not null default now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_tickets FROM anon, authenticated;
GRANT ALL ON public.support_tickets TO service_role;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id), author_id uuid references auth.users(id) on delete set null, body text not null check(length(body) between 1 and 10000), internal boolean not null default false, created_at timestamptz not null default now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_messages FROM anon, authenticated;
GRANT ALL ON public.support_messages TO service_role;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id), order_item_id uuid not null unique references public.order_items(id), product_id uuid not null references public.products(id), display_name text not null, rating integer not null check(rating between 1 and 5), body text not null check(length(body) between 1 and 5000), status text not null default 'pending' check(status in ('pending','published','rejected')), created_at timestamptz not null default now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT ALL ON public.reviews TO service_role;

CREATE TABLE IF NOT EXISTS public.review_media (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.reviews(id) on delete cascade, url text not null, kind text not null check(kind in ('image','video'))
);
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_media FROM anon, authenticated;
GRANT ALL ON public.review_media TO service_role;

CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.profiles(id), order_id uuid references public.orders(id), points integer not null check(points <> 0), reason text not null, idempotency_key text not null unique, created_at timestamptz not null default now()
);
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_ledger FROM anon, authenticated;
GRANT ALL ON public.reward_ledger TO service_role;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid primary key default gen_random_uuid(), referrer_id uuid not null references public.profiles(id), referred_id uuid not null unique references public.profiles(id), qualifying_order_id uuid unique references public.orders(id), status text not null default 'pending' check(status in ('pending','qualified','rewarded','rejected')), created_at timestamptz not null default now(), check(referrer_id <> referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referrals FROM anon, authenticated;
GRANT ALL ON public.referrals TO service_role;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid primary key default gen_random_uuid(), email text not null, pincode text not null check(pincode ~ '^[0-9]{6}$'), consent boolean not null check(consent), created_at timestamptz not null default now(), unique(email,pincode)
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist FROM anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.profiles(id) on delete set null, order_id uuid references public.orders(id), channel text not null check(channel in ('email','sms','whatsapp','in_app')), template text not null, payload jsonb not null default '{}', status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')), attempts integer not null default 0 check(attempts >= 0), idempotency_key text not null unique, scheduled_at timestamptz not null default now(), sent_at timestamptz, created_at timestamptz not null default now()
);
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_jobs FROM anon, authenticated;
GRANT ALL ON public.notification_jobs TO service_role;

CREATE TABLE IF NOT EXISTS public.content_pages (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, kind text not null check(kind in ('page','blog','recipe','faq','policy')), body jsonb not null default '{}', seo_title text, seo_description text, status text not null default 'draft' check(status in ('draft','published','archived')), published_at timestamptz, created_at timestamptz not null default now()
);
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_pages FROM anon, authenticated;
GRANT ALL ON public.content_pages TO service_role;

CREATE TABLE IF NOT EXISTS public.store_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_settings FROM anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id text, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT ALL ON public.audit_log TO service_role;

CREATE OR REPLACE FUNCTION detoxleaf_private.is_staff(allowed text[] DEFAULT ARRAY['owner','admin','operations','support','viewer'])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_members WHERE user_id=(SELECT auth.uid()) AND active AND role=ANY(allowed));
$$;
REVOKE ALL ON FUNCTION detoxleaf_private.is_staff(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION detoxleaf_private.is_staff(text[]) TO authenticated, service_role;
GRANT SELECT ON public.profiles TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.profiles;
CREATE POLICY staff_read ON public.profiles FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.staff_members TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.staff_members;
CREATE POLICY staff_read ON public.staff_members FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.addresses TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.addresses;
CREATE POLICY staff_read ON public.addresses FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.products TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.products;
CREATE POLICY staff_read ON public.products FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.product_images TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.product_images;
CREATE POLICY staff_read ON public.product_images FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.product_variants TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.product_variants;
CREATE POLICY staff_read ON public.product_variants FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.subscription_plans TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.subscription_plans;
CREATE POLICY staff_read ON public.subscription_plans FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.service_areas TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.service_areas;
CREATE POLICY staff_read ON public.service_areas FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.delivery_slots TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.delivery_slots;
CREATE POLICY staff_read ON public.delivery_slots FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.delivery_calendar TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.delivery_calendar;
CREATE POLICY staff_read ON public.delivery_calendar FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.farm_batches TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.farm_batches;
CREATE POLICY staff_read ON public.farm_batches FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.coupons TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.coupons;
CREATE POLICY staff_read ON public.coupons FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.orders TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.orders;
CREATE POLICY staff_read ON public.orders FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.order_items TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.order_items;
CREATE POLICY staff_read ON public.order_items FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.order_events TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.order_events;
CREATE POLICY staff_read ON public.order_events FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.batch_allocations TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.batch_allocations;
CREATE POLICY staff_read ON public.batch_allocations FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.inventory_movements TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.inventory_movements;
CREATE POLICY staff_read ON public.inventory_movements FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT(id,order_id,status,dispatched_at,delivered_at,created_at) ON public.deliveries TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.deliveries;
CREATE POLICY staff_read ON public.deliveries FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.payments TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.payments;
CREATE POLICY staff_read ON public.payments FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.webhook_events TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.webhook_events;
CREATE POLICY staff_read ON public.webhook_events FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.coupon_redemptions TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.coupon_redemptions;
CREATE POLICY staff_read ON public.coupon_redemptions FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.subscriptions;
CREATE POLICY staff_read ON public.subscriptions FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.subscription_events TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.subscription_events;
CREATE POLICY staff_read ON public.subscription_events FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.wishlist TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.wishlist;
CREATE POLICY staff_read ON public.wishlist FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.support_tickets TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.support_tickets;
CREATE POLICY staff_read ON public.support_tickets FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.support_messages TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.support_messages;
CREATE POLICY staff_read ON public.support_messages FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.reviews TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.reviews;
CREATE POLICY staff_read ON public.reviews FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.review_media TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.review_media;
CREATE POLICY staff_read ON public.review_media FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.reward_ledger TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.reward_ledger;
CREATE POLICY staff_read ON public.reward_ledger FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.referrals TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.referrals;
CREATE POLICY staff_read ON public.referrals FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.waitlist TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.waitlist;
CREATE POLICY staff_read ON public.waitlist FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.notification_jobs TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.notification_jobs;
CREATE POLICY staff_read ON public.notification_jobs FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.content_pages TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.content_pages;
CREATE POLICY staff_read ON public.content_pages FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.store_settings TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.store_settings;
CREATE POLICY staff_read ON public.store_settings FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT SELECT ON public.audit_log TO authenticated;

DROP POLICY IF EXISTS staff_read ON public.audit_log;
CREATE POLICY staff_read ON public.audit_log FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
GRANT INSERT, UPDATE ON public.products TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.products;
CREATE POLICY admin_manage ON public.products FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.product_images TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.product_images;
CREATE POLICY admin_manage ON public.product_images FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.product_variants TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.product_variants;
CREATE POLICY admin_manage ON public.product_variants FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.subscription_plans TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.subscription_plans;
CREATE POLICY admin_manage ON public.subscription_plans FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.service_areas TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.service_areas;
CREATE POLICY admin_manage ON public.service_areas FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.delivery_slots TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.delivery_slots;
CREATE POLICY admin_manage ON public.delivery_slots FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.delivery_calendar TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.delivery_calendar;
CREATE POLICY admin_manage ON public.delivery_calendar FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.farm_batches TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.farm_batches;
CREATE POLICY admin_manage ON public.farm_batches FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.coupons TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.coupons;
CREATE POLICY admin_manage ON public.coupons FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.content_pages TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.content_pages;
CREATE POLICY admin_manage ON public.content_pages FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT INSERT, UPDATE ON public.store_settings TO authenticated;

DROP POLICY IF EXISTS admin_manage ON public.store_settings;
CREATE POLICY admin_manage ON public.store_settings FOR ALL TO authenticated USING ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin']))) WITH CHECK ((SELECT detoxleaf_private.is_staff(ARRAY['owner','admin'])));
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS public_read ON public.products;
CREATE POLICY public_read ON public.products FOR SELECT TO anon, authenticated USING (status IN ('active','coming_soon'));
GRANT SELECT ON public.product_images TO anon;

DROP POLICY IF EXISTS public_read ON public.product_images;
CREATE POLICY public_read ON public.product_images FOR SELECT TO anon, authenticated USING (EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.status IN ('active','coming_soon')));
GRANT SELECT ON public.product_variants TO anon;

DROP POLICY IF EXISTS public_read ON public.product_variants;
CREATE POLICY public_read ON public.product_variants FOR SELECT TO anon, authenticated USING (active AND EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.status='active'));
GRANT SELECT ON public.subscription_plans TO anon;

DROP POLICY IF EXISTS public_read ON public.subscription_plans;
CREATE POLICY public_read ON public.subscription_plans FOR SELECT TO anon, authenticated USING (active AND EXISTS(SELECT 1 FROM public.product_variants v WHERE v.id=variant_id AND v.active));
GRANT SELECT ON public.service_areas TO anon;

DROP POLICY IF EXISTS public_read ON public.service_areas;
CREATE POLICY public_read ON public.service_areas FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.delivery_slots TO anon;

DROP POLICY IF EXISTS public_read ON public.delivery_slots;
CREATE POLICY public_read ON public.delivery_slots FOR SELECT TO anon, authenticated USING (active AND EXISTS(SELECT 1 FROM public.service_areas a WHERE a.pincode=delivery_slots.pincode AND a.active));
GRANT SELECT ON public.content_pages TO anon;

DROP POLICY IF EXISTS public_read ON public.content_pages;
CREATE POLICY public_read ON public.content_pages FOR SELECT TO anon, authenticated USING (status='published');
-- Public reviews are exposed through a redacted view below.

DROP POLICY IF EXISTS public_read ON public.reviews;
-- Customer and staff policies alone control the underlying review records.
GRANT SELECT ON public.review_media TO anon;

CREATE OR REPLACE VIEW public.published_reviews WITH (security_barrier=true) AS
SELECT id,product_id,display_name,rating,body,created_at FROM public.reviews WHERE status='published';
REVOKE ALL ON public.published_reviews FROM PUBLIC;
GRANT SELECT ON public.published_reviews TO anon,authenticated,service_role;

DROP POLICY IF EXISTS public_read ON public.review_media;
CREATE POLICY public_read ON public.review_media FOR SELECT TO anon, authenticated USING (EXISTS(SELECT 1 FROM public.published_reviews r WHERE r.id=review_id));

DROP POLICY IF EXISTS customer_read ON public.profiles;
CREATE POLICY customer_read ON public.profiles FOR SELECT TO authenticated USING (id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.addresses;
CREATE POLICY customer_read ON public.addresses FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.orders;
CREATE POLICY customer_read ON public.orders FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.subscriptions;
CREATE POLICY customer_read ON public.subscriptions FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.wishlist;
CREATE POLICY customer_read ON public.wishlist FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.support_tickets;
CREATE POLICY customer_read ON public.support_tickets FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.reviews;
CREATE POLICY customer_read ON public.reviews FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.reward_ledger;
CREATE POLICY customer_read ON public.reward_ledger FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.coupon_redemptions;
CREATE POLICY customer_read ON public.coupon_redemptions FOR SELECT TO authenticated USING (customer_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS customer_read ON public.order_items;
CREATE POLICY customer_read ON public.order_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=(SELECT auth.uid())));

DROP POLICY IF EXISTS customer_read ON public.order_events;
CREATE POLICY customer_read ON public.order_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=(SELECT auth.uid())) AND customer_visible);

DROP POLICY IF EXISTS customer_read ON public.deliveries;
CREATE POLICY customer_read ON public.deliveries FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=(SELECT auth.uid())));

DROP POLICY IF EXISTS customer_read ON public.payments;
CREATE POLICY customer_read ON public.payments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=(SELECT auth.uid())));

DROP POLICY IF EXISTS customer_read ON public.subscription_events;
CREATE POLICY customer_read ON public.subscription_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND s.customer_id=(SELECT auth.uid())));

DROP POLICY IF EXISTS customer_read ON public.support_messages;
CREATE POLICY customer_read ON public.support_messages FOR SELECT TO authenticated USING (NOT internal AND EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id AND t.customer_id=(SELECT auth.uid())));
GRANT UPDATE(full_name,phone) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS customer_update ON public.profiles;
CREATE POLICY customer_update ON public.profiles FOR UPDATE TO authenticated USING (id=(SELECT auth.uid())) WITH CHECK (id=(SELECT auth.uid()));
GRANT INSERT,UPDATE,DELETE ON public.addresses TO authenticated;

DROP POLICY IF EXISTS customer_manage ON public.addresses;
CREATE POLICY customer_manage ON public.addresses FOR ALL TO authenticated USING (customer_id=(SELECT auth.uid())) WITH CHECK (customer_id=(SELECT auth.uid()));
GRANT INSERT,UPDATE,DELETE ON public.wishlist TO authenticated;

DROP POLICY IF EXISTS customer_manage ON public.wishlist;
CREATE POLICY customer_manage ON public.wishlist FOR ALL TO authenticated USING (customer_id=(SELECT auth.uid())) WITH CHECK (customer_id=(SELECT auth.uid()));

-- A profile is created on authenticated signup; metadata never grants staff roles.
CREATE OR REPLACE FUNCTION detoxleaf_private.handle_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles(id,full_name) VALUES(NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name',''),200)) ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.handle_signup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS detoxleaf_auth_signup ON auth.users;
CREATE TRIGGER detoxleaf_auth_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.handle_signup();
INSERT INTO public.profiles(id,full_name) SELECT id,left(coalesce(raw_user_meta_data->>'full_name',''),200) FROM auth.users ON CONFLICT(id) DO NOTHING;

-- Verify reviews against the delivered order, customer and purchased variant.
CREATE OR REPLACE FUNCTION detoxleaf_private.validate_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
 JOIN public.product_variants v ON v.id=i.variant_id
 WHERE i.id=NEW.order_item_id AND o.customer_id=NEW.customer_id AND o.status='delivered' AND v.product_id=NEW.product_id)
 THEN RAISE EXCEPTION 'Review requires a matching delivered purchase'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.validate_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS detoxleaf_review_purchase ON public.reviews;
CREATE TRIGGER detoxleaf_review_purchase BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.validate_review();

-- A deliberate public projection excludes customer IDs, order IDs and moderation data.

-- Stock is derived from the single batch balance; only staff can inspect it.
CREATE OR REPLACE VIEW public.inventory_summary WITH (security_invoker=true) AS
SELECT product_id,
 coalesce(sum(trays) FILTER(WHERE status='growing'),0) AS growing,
 coalesce(sum(trays-delivered-wasted) FILTER(WHERE status='ready' AND expires_on>=CURRENT_DATE),0) AS ready,
 coalesce(sum(reserved),0) AS reserved,
 coalesce(sum(trays-reserved-delivered-wasted) FILTER(WHERE status='ready' AND expires_on>=CURRENT_DATE),0) AS available,
 coalesce(sum(delivered),0) AS delivered, coalesce(sum(wasted),0) AS wasted
FROM public.farm_batches GROUP BY product_id;
REVOKE ALL ON public.inventory_summary FROM anon, authenticated;
GRANT SELECT ON public.inventory_summary TO authenticated,service_role;
CREATE INDEX IF NOT EXISTS addresses_customer_id_idx ON public.addresses(customer_id);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS subscription_plans_variant_id_idx ON public.subscription_plans(variant_id);
CREATE INDEX IF NOT EXISTS delivery_calendar_slot_id_idx ON public.delivery_calendar(slot_id);
CREATE INDEX IF NOT EXISTS farm_batches_product_id_idx ON public.farm_batches(product_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS batch_allocations_order_id_idx ON public.batch_allocations(order_id);
CREATE INDEX IF NOT EXISTS batch_allocations_batch_id_idx ON public.batch_allocations(batch_id);
CREATE INDEX IF NOT EXISTS inventory_movements_batch_id_idx ON public.inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS inventory_movements_order_id_idx ON public.inventory_movements(order_id);
CREATE INDEX IF NOT EXISTS inventory_movements_actor_id_idx ON public.inventory_movements(actor_id);
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS deliveries_assigned_to_idx ON public.deliveries(assigned_to);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_id_idx ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_order_id_idx ON public.coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_customer_id_idx ON public.coupon_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_address_id_idx ON public.subscriptions(address_id);
CREATE INDEX IF NOT EXISTS subscriptions_source_order_id_idx ON public.subscriptions(source_order_id);
CREATE INDEX IF NOT EXISTS subscription_events_subscription_id_idx ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS wishlist_customer_id_idx ON public.wishlist(customer_id);
CREATE INDEX IF NOT EXISTS wishlist_product_id_idx ON public.wishlist(product_id);
CREATE INDEX IF NOT EXISTS support_tickets_customer_id_idx ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS support_tickets_order_id_idx ON public.support_tickets(order_id);
CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS support_messages_author_id_idx ON public.support_messages(author_id);
CREATE INDEX IF NOT EXISTS reviews_customer_id_idx ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS reviews_order_item_id_idx ON public.reviews(order_item_id);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS review_media_review_id_idx ON public.review_media(review_id);
CREATE INDEX IF NOT EXISTS reward_ledger_customer_id_idx ON public.reward_ledger(customer_id);
CREATE INDEX IF NOT EXISTS reward_ledger_order_id_idx ON public.reward_ledger(order_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS referrals_qualifying_order_id_idx ON public.referrals(qualifying_order_id);
CREATE INDEX IF NOT EXISTS notification_jobs_customer_id_idx ON public.notification_jobs(customer_id);
CREATE INDEX IF NOT EXISTS notification_jobs_order_id_idx ON public.notification_jobs(order_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx ON public.audit_log(actor_id);

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default ON public.addresses(customer_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS orders_customer_created ON public.orders(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_delivery_queue ON public.orders(delivery_date,status);
CREATE INDEX IF NOT EXISTS farm_batches_available ON public.farm_batches(product_id,harvest_date) WHERE status='ready';
CREATE INDEX IF NOT EXISTS notification_queue ON public.notification_jobs(scheduled_at) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS reviews_published ON public.reviews(product_id,created_at DESC) WHERE status='published';

-- Starter catalogue: prices from the existing app, not live sale authorization.
INSERT INTO public.products(slug,name,description,sku,status,price_paise) VALUES
('fresh-wheatgrass','Fresh Wheatgrass','Two living wheatgrass trays for your daily green ritual.','DL-WG-2','draft',50000),
('wheatgrass-powder','Wheatgrass Powder','The Detoxleaf wheatgrass powder collection. Coming soon.','DL-WGP','coming_soon',NULL)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO public.product_images(product_id,url,alt)
SELECT id,'/media/grass-poster.jpg','Fresh living wheatgrass' FROM public.products WHERE slug='fresh-wheatgrass' ON CONFLICT DO NOTHING;
INSERT INTO public.product_images(product_id,url,alt)
SELECT id,'/brand/wheatgrass-powder-clear.png','Detoxleaf wheatgrass powder' FROM public.products WHERE slug='wheatgrass-powder' ON CONFLICT DO NOTHING;
INSERT INTO public.product_variants(product_id,sku,name,trays,price_paise)
SELECT p.id,v.sku,v.name,v.trays,v.price FROM public.products p CROSS JOIN
(VALUES('DL-WG-2-T','2 trays',2,50000),('DL-WG-4-T','4 trays',4,100000),('DL-WG-8-T','8 trays',8,200000)) v(sku,name,trays,price)
WHERE p.slug='fresh-wheatgrass' ON CONFLICT(sku) DO NOTHING;
INSERT INTO public.subscription_plans(variant_id,code,name,interval_days,price_paise)
SELECT id,'WG-WEEKLY','Weekly fresh greens',7,45000 FROM public.product_variants WHERE sku='DL-WG-2-T' ON CONFLICT(code) DO NOTHING;
INSERT INTO public.subscription_plans(variant_id,code,name,interval_days,price_paise)
SELECT id,'WG-FORTNIGHTLY','Fortnightly fresh greens',14,45000 FROM public.product_variants WHERE sku='DL-WG-2-T' ON CONFLICT(code) DO NOTHING;
-- Sample areas remain inactive until real coverage, capacity and fees are confirmed.
INSERT INTO public.service_areas(pincode,city,delivery_charge_paise,lead_days) VALUES
('122001','Gurugram',4000,1),('110001','Delhi',6000,1),('201301','Noida',5000,2) ON CONFLICT DO NOTHING;
INSERT INTO public.delivery_slots(pincode,label,starts_at,ends_at)
SELECT pincode,'4:00–7:00 PM','16:00'::time,'19:00'::time FROM public.service_areas WHERE pincode IN ('122001','110001','201301') ON CONFLICT DO NOTHING;
INSERT INTO public.coupons(code,kind,value,first_order_only) VALUES
('GREEN10','percentage',10,false),('WELCOME100','fixed',10000,true) ON CONFLICT(code) DO NOTHING;
INSERT INTO public.store_settings(key,value) VALUES
('brand','{"name":"Detoxleaf","tagline":"Pure Wellness From Nature","currency":"INR","timezone":"Asia/Kolkata"}'),
('checkout','{"enabled":false,"payment_mode":"test","cod_enabled":false,"reason":"Confirm stock, tax, delivery coverage and server checkout before launch"}'),
('rewards','{"enabled":false,"points_per_100_rupees":1,"redemption_points":20,"redemption_value_paise":10000}') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.content_pages(slug,title,kind) VALUES
('shipping-policy','Shipping Policy','policy'),('refund-policy','Refund Policy','policy'),
('privacy-policy','Privacy Policy','policy'),('terms','Terms & Conditions','policy'),
('faq','Frequently Asked Questions','faq'),('our-farm','Our Farm','page') ON CONFLICT(slug) DO NOTHING;
INSERT INTO detoxleaf_private.migrations(version) VALUES('202610160001') ON CONFLICT DO NOTHING;
COMMIT;
-- Success here means schema installed, not storefront integration or production readiness.
SELECT 'Detoxleaf schema installed' AS result,version,applied_at FROM detoxleaf_private.migrations WHERE version='202610160001';
