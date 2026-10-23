# Real commerce setup and operating limits

The active storefront and admin pages now call Supabase APIs. No browser-local order, sample stock or simulated delivery is used by the active purchasing flow. The cart remains browser-local as a basket; pricing and availability are rechecked on the server.

## One-time database step

The initial schema must be installed first. In Supabase SQL Editor run the **entire** `supabase/migrations/202610210001_live_commerce.sql`, then `supabase/verify-live.sql`. The migration is transactional, can be rerun, and adds no fake customer/order/inventory rows. API keys do not install database functions. Until installation, the catalogue can still be browsed, inventory is unknown, and purchase buttons stay disabled. Admin-only setup diagnostics are at `/admin/setup`.

## Credentials

Fill the blanks in `.env.local`; `commerce.env.example` is the complete reference. Existing user values were preserved.

- Supabase URL/publishable key: authentication and customer-scoped reads.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret/service-role credential for verified payment writes and background jobs. The existing alias `SUPABASE_SERVICE_ROLE_KEY` is also accepted. Never use NEXT_PUBLIC for it.
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET`, `RAZORPAY_MODE`, `RAZORPAY_WEBHOOK_SECRET`. Test is the default. Live keys additionally require `ALLOW_LIVE_PAYMENTS=true` and the store checkout setting `payment_mode=live`. No real charge was made during development.
- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_REPLY_TO`; `EMAIL_SITE_URL` must be your production origin. `RESEND_TEST_TO` is the only recipient for test-order messages. Supabase Auth email still needs hosted SMTP setup (see `docs/resend.md`).
- `CRON_SECRET`: random string of at least 32 characters. Your deployment scheduler must call `GET /api/jobs` with `Authorization: Bearer <CRON_SECRET>` every minute. This expires unpaid stock reservations and processes email jobs. Merely adding the variable does not create the scheduler.
- Optional public social links: NEXT_PUBLIC_INSTAGRAM_URL, NEXT_PUBLIC_FACEBOOK_URL, NEXT_PUBLIC_YOUTUBE_URL.

After changing environment values, restart the server or redeploy. Secrets are never rendered in setup status.

## Real business configuration

Approve your first owner in Supabase as described in `docs/authentication.md`. Admin tools now save database records. Configure products and active variants, confirmed tax, harvest batches with actual stock/use-by dates, service areas, slots and dated delivery-calendar capacity. Capacity is orders per dated slot. Product and plan prices are paise (50000 = ₹500).

Publish business-approved policies in `/admin/content`. Policy slugs must be `shipping-policy`, `refund-policy`, `privacy-policy`, `terms`, kind `policy`, status `published`. Body format: `{"sections":[{"title":"Heading","paragraphs":["Approved text"]}]}`. Published content replaces the pre-launch guide. Do not enable checkout until actual business policy decisions are made.

In `/admin/configuration` the checkout setting contains `enabled`, `cod_enabled`, `payment_mode`. It starts closed. Only an authorized admin can open it. Do not treat the original sample service areas or prices as confirmation that the business has approved them.

## Payments and fulfilment

Orders use authenticated customers and atomic SQL reservations of stock, coupon usage and dated delivery capacity. The server calculates totals. Cash-on-delivery is available only when enabled. Delivery and cash collection are separate actions; a delivered COD order stays unpaid until staff explicitly records collection.

Razorpay browser callbacks are signature-checked, amounts/order IDs are checked with the provider, and capture is persisted with a service-only database function. Configure `payment.captured` webhook delivery to `/api/payments/webhook` on your reachable HTTPS origin, with the same webhook secret in env. Repeated captures are deduplicated. A late captured payment on an expired/cancelled order is recorded for manual review/refund; it does not recreate stock or fulfilment.

Paid-order cancellation/refunds require business review and provider-side refund processing; no admin button pretends to transfer money. Support requests and replies are stored in the account. Delivery plans support pause/resume/skip/cancel as scheduling preferences; they **do not** automatically bill or create recurring orders. Each future delivery still requires confirmed checkout. Rewards are ledger entries from paid delivered orders, not invented balances; automated redemption/referral campaigns are not exposed as working features.

Tracking shows authenticated order events, not a live courier map. Wishlist, reviews (delivered purchase required), support and availability waitlist use database records. Analytics distinguishes test/live data and has no sample-data toggle; session conversion metrics are not fabricated. JSON exports are limited operational exports, not full managed backups.

## Validation

`node test-live-schema.mjs` runs both migrations twice against in-memory PostgreSQL, then checks canonical pricing, idempotency, rollback on insufficient stock, customer isolation, explicit COD collection, delivery, reviews, payment replay, expiration and outbox claiming. No hosted records or payments are created by it.

`node test-catalog.mjs` checks that missing inventory functions do not break catalogue browsing or expose admin diagnostics. Unknown stock remains null, distinct from confirmed zero stock.

A hosted end-to-end signup/payment/email/delivery test still requires configured provider accounts, the applied migration, actual stock and owner-approved business rules. Credentials alone cannot supply those business decisions.


## Admin data manager

Open `/admin/data` for every commerce table/view. Editable business records use forms, related-record dropdowns and paginated lists. Product image presets include the generated wheatgrass and powder assets; a negative image display order selects the wheatgrass homepage card image. Admin subscription edits change future schedule details only. Manual reward adjustments append a reasoned ledger entry; historical entries cannot be rewritten or make the balance negative. Orders, deliveries, reviews and support use dedicated workflow buttons. Financial, stock movement, webhook and audit history are read-only. Run/rerun the complete live-commerce migration once to install the latest write permissions; ongoing record changes then happen in the app.
