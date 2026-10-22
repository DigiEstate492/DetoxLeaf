# Detoxleaf Supabase setup

## Run in SQL Editor

1. Open https://supabase.com/dashboard/project/gezztsjwuwgykryhhrmm/sql/new and sign in.
2. Paste the entire `migrations/202610160001_initial_commerce.sql` file into a new query and click Run as the database owner (`postgres`).
3. Expect `Detoxleaf schema installed`. If anything fails, the transaction rolls back. Do not run isolated fragments to bypass an error.
4. Run `verify.sql`. RLS should be true, products and service-area rows should appear, and the final forbidden-grants query should return no rows. Orders, batches and payments start empty on a fresh install.

The migration can be rerun. Seed rows use conflict handling and do not reset business edits. It refuses to adopt existing unrelated commerce tables on the first run; review a schema conflict rather than deleting data. It does not change unrelated tables or existing auth users. Existing auth users receive a profile; new signups receive one automatically.

## Included

35 tables cover catalogue/images/variants/plans, profiles and saved addresses, staff, service PINs/slots/date capacity, batches/allocations/stock movements, orders/items/tracking/delivery, provider payments and webhook deduplication, subscriptions, coupons, wishlist, support, moderated reviews/media, reward ledger/referrals, waitlist consent, notification jobs, content, settings and audit records. `inventory_summary` derives available stock. `published_reviews` deliberately exposes only approved presentation fields, excluding customer and order identifiers.

Prices use integer **paise**: 50000 = ₹500. Catalogue starter rows mirror the app's two/four/eight-tray pricing. Subscription prices are per delivery. Powder is coming soon; fresh trays, subscription plans, sample delivery areas/slots and coupons require activation. Tax remains unconfirmed, checkout disabled and payment mode test. No fake customers, reviews, orders, payments, batches, staff accounts or inventory totals are seeded.

## Access boundaries

RLS is enabled on every application table. Anonymous users can read only public catalogue/content/coverage and approved review presentations. Signed-in customers can read their own records and edit their own name, phone, addresses and wishlist. Customer CRM tags and staff roles cannot be edited by customers. Staff can read operations; owners/admins can configure catalogue, coverage, batches and settings. Order/payment/inventory ledger/reward writes require trusted server code, as do coupon redemption, subscription actions, support submission, review submission/moderation and notification processing. This prevents direct browser writes from forging business outcomes. These server workflows are not implemented by this migration.

`staff_members` is SQL/server managed. To bootstrap your first owner, create the intended account through Supabase Auth, verify the user UUID in Authentication > Users, then run the following **with that real UUID substituted** in SQL Editor:

```sql
insert into public.staff_members(user_id,role)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid,'owner')
on conflict (user_id) do nothing;
```

Do not auto-promote the first signup or use a public signup email as authorization. No credentials belong in tables or client code. Keep any future Supabase secret/service-role key server-only.

## Current application status

Creating the schema does **not** switch the site from browser-local demo storage to Supabase. The existing email-selector demo account and descriptive staff roster are not Supabase authentication. Next work is real Auth, server-side sessions/admin enforcement, database-backed catalogue/checkout with atomic stock/capacity/coupon reservations, verified payment persistence/webhooks, and customer data migration where appropriate. Do not enable live checkout before those workflows are connected and tested.

Storage bucket creation/uploads are not included; image rows currently point to existing Next.js public assets. Notification jobs store intent only and send nothing. Delivery dates/capacity and physical batch quantities must be entered from real operations. Draft policy content needs business-approved text before publishing.

## Local validation

Run `node supabase/test-schema.mjs`. It uses in-memory PGlite PostgreSQL with minimal Supabase Auth role stubs, never your remote project or credentials. It validates SQL execution/reexecution, RLS, safe seeds and constraints. The SQL Editor execution is still required; local tests cannot confirm your hosted project's existing schema or settings.
