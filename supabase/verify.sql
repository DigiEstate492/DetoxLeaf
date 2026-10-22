-- Run after 202610160001_initial_commerce.sql in the same project SQL Editor.
SELECT version,applied_at FROM detoxleaf_private.migrations;
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN
('products','orders','payments','profiles','staff_members','farm_batches','subscriptions','reward_ledger') ORDER BY tablename;
SELECT slug,status,price_paise,tax_confirmed FROM public.products ORDER BY slug;
SELECT pincode,city,active FROM public.service_areas;
SELECT 'orders' AS entity,count(*) FROM public.orders UNION ALL
SELECT 'farm_batches',count(*) FROM public.farm_batches UNION ALL
SELECT 'payments',count(*) FROM public.payments;
SELECT key,value FROM public.store_settings;
-- No customer/anon INSERT or UPDATE grants should appear for these tables.
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated')
AND table_name IN ('orders','payments','reward_ledger','staff_members')
AND privilege_type IN ('INSERT','UPDATE','DELETE');
