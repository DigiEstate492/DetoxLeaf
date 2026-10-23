-- Run after installing 202610210001_live_commerce.sql. Read-only verification.
SELECT version,applied_at FROM detoxleaf_private.migrations ORDER BY version;
SELECT proname,prosecdef FROM pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE n.nspname='public' AND proname IN ('dl_availability','dl_slots','dl_checkout','dl_transition','dl_capture_payment','dl_collect_cod','dl_customer_action','dl_admin_write','dl_expire_reservations','dl_claim_emails') ORDER BY proname;
SELECT public.dl_availability();
SELECT slug,status,tax_confirmed FROM public.products;
SELECT key,value FROM public.store_settings WHERE key='checkout';
SELECT slug,status FROM public.content_pages WHERE kind='policy';
SELECT status,count(*) FROM public.orders GROUP BY status;
