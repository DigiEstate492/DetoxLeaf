# Booking alerts and WhatsApp

When a delivery plan is created from a confirmed order, the database queues these jobs in the same transaction:

| Recipient | Channel | Template | Condition |
| --- | --- | --- | --- |
| Customer | Email | subscription_started | Always (existing action email) |
| Customer | WhatsApp | subscription_started | Customer ticked the checkout opt-in |
| Owner | Email | owner_new_booking | OWNER_ALERT_EMAIL is set |
| Owner | WhatsApp | owner_new_booking | OWNER_ALERT_WHATSAPP is set |

An unpaid online order creates no plan, so it sends no alert until payment is verified.

## Setup

1. Run `supabase/migrations/202610310001_booking_alerts.sql` in Supabase SQL Editor after the earlier migrations.
2. In Meta Business, create a WhatsApp Cloud API app and a permanent access token.
3. Get these two utility templates approved, language `en`. Parameter order matters.

`subscription_started`

> Hi {{1}}, your {{2}} delivery plan with Detoxleaf is saved. Your next planned date is {{3}}. Our team will contact you if anything needs confirming.

`owner_new_booking`

> New Detoxleaf booking from {{1}}. Phone: {{2}}. Plan: {{3}}. First delivery: {{4}}. Address: {{5}}. Order: {{6}}. Please review it in the admin panel.

4. Set the variables listed in `commerce.env.example`, then restart or redeploy.
5. Your scheduler must call `/api/jobs` as described in `docs/action-emails.md`. It sends both email and WhatsApp jobs.

## Test mode

Test-order customer messages go only to WHATSAPP_TEST_TO. Owner alerts still go to the owner and are labelled [TEST].

## Limits

Jobs retry up to five times and stop after 23 hours. A rejected template or number is cancelled, not retried; check `last_error` in `notification_jobs`. A sent status means Meta accepted the request, not that the message was delivered. The Cloud API has no idempotency key, so a retry after a timeout could send a duplicate.

## Checks

`node test-booking-alerts.mjs` runs the migrations in in-memory PostgreSQL with a mocked provider. It sends no real messages.
