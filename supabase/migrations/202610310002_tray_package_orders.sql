-- Apply after 202610310001_booking_alerts.sql. Makes the 1, 2 and 3 month tray packages orderable.
BEGIN;
-- Variant prices stay at the one-time tray rate. The plan price is what a package order charges.
INSERT INTO public.product_variants(product_id,sku,name,trays,price_paise,active)
 SELECT p.id,x.sku,x.name,x.trays,x.trays*50000,true FROM public.products p CROSS JOIN (VALUES('DL-WG-PKG-12','12 trays · 3 per week',12),('DL-WG-PKG-24','24 trays · 3 per week',24),('DL-WG-PKG-36','36 trays · 3 per week',36)) AS x(sku,name,trays) WHERE p.slug='fresh-wheatgrass'
 ON CONFLICT(sku) DO UPDATE SET name=excluded.name,trays=excluded.trays,price_paise=excluded.price_paise,active=true;
INSERT INTO public.subscription_plans(variant_id,code,name,interval_days,price_paise,active)
 SELECT v.id,x.code,x.name,7,x.price,true FROM public.product_variants v JOIN (VALUES('DL-WG-PKG-12','WG-PKG-1-MONTH','1 month plan',500000),('DL-WG-PKG-24','WG-PKG-2-MONTHS','2 months plan',720000),('DL-WG-PKG-36','WG-PKG-3-MONTHS','3 months plan',850000)) AS x(sku,code,name,price) ON x.sku=v.sku
 ON CONFLICT(code) DO UPDATE SET variant_id=excluded.variant_id,name=excluded.name,interval_days=excluded.interval_days,price_paise=excluded.price_paise,active=true;
COMMIT;
