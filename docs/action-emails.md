# Action based email setup

## What is included

The application includes 30 operational HTML and plain text templates. /admin/email contains a role protected preview gallery with fictional data. Previewing a message does not send it. The existing test button sends only a connection test to the signed in administrator's verified email.

## One time database installation

Run these migrations in order in Supabase SQL Editor:
1. 202610160001_initial_commerce.sql
2. 202610210001_live_commerce.sql
3. 202610230001_tray_offers.sql
4. 202610230002_action_emails.sql

The fourth migration installs transactional triggers. It does not backfill old actions or send historical emails. The triggers queue notifications in the same transaction as the persisted change. A failed transaction queues no email. Protected helper functions cannot be called by customers. Normal reads, wishlist changes and browser basket actions do not send emails.

## Action map

| Action | Template |
| --- | --- |
| Online order awaiting payment | payment_pending |
| Order confirmed | order_confirmed |
| Growing, packed, dispatched, delivered | growing, packed, out_for_delivery, delivered |
| Unpaid order cancelled or reservation expired | cancelled |
| Verified payment or separately recorded COD cash | payment_received |
| Late captured payment on cancelled order | payment_review |
| Saved delivery schedule created | subscription_started |
| Schedule pause, resume, cancel, completion | subscription_paused, subscription_resumed, subscription_cancelled, subscription_completed |
| Schedule date or quantity changed, including skip | subscription_updated |
| Support request created | support_received |
| Public staff reply added | support_reply |
| Support resolved or closed | support_resolved |
| Review submitted, published, rejected | review_received, review_published, review_rejected |
| Consented delivery waitlist joined | waitlist_joined |
| Previously inactive requested PIN activated | delivery_available |
| Customer name or phone changed | profile_updated |
| Saved address added, edited, removed | address_added, address_updated, address_removed |
| Reward ledger entry | rewards_updated |
| Staff role or active state changed | team_access_updated |
| Administrator tests email configuration | connection_test |

No automated refunds, marketing campaign, recurring payment charge or live courier promise is introduced. Payment failed events that are not persisted are not emailed. Duplicate confirmation/payment callbacks reuse an outbox key. Distinct real state transitions can generate separate messages. Support resolution and a reply in the same action can each generate a notification. Delivery activation notifies each consenting waitlist entry once.

## Delivery configuration

Set RESEND_API_KEY, RESEND_FROM_EMAIL, optional RESEND_REPLY_TO, EMAIL_SITE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), RESEND_TEST_TO and CRON_SECRET. Use a verified sending domain and the production HTTPS site origin. Environment variables do not install the database triggers or create a scheduler.

An actual deployment scheduler must call /api/jobs with Authorization: Bearer followed by CRON_SECRET (at least 32 characters). The existing worker claims up to ten jobs, uses a lease and retries, and also expires abandoned reservations. Its current claim policy only attempts jobs younger than 23 hours, up to five attempts. Monitor /admin/notifications for failures and ageing jobs; no automatic provider delivery or bounce webhook is added here.

Recipients are resolved from the current confirmed Supabase Auth identity, never from a browser supplied email or payload recipient. All test-mode events go only to RESEND_TEST_TO. Non-order events capture the checkout payment mode at the time of the action, defaulting to test. Missing recipients and unknown templates are cancelled with a reason; provider errors remain retryable. A sent outbox status means Resend accepted the API call, not that the message reached an inbox. Live delivery still needs mailbox and provider testing.

The new migration upgrades the existing order queue function to store event snapshots. The renderer includes actual order items, including complimentary trays. Order and delivery links require account authentication. Already completed or expired payment reminders are skipped. Internal support notes are never emailed; replies prompt the customer to read the authenticated conversation.

## Supabase Auth templates

Eight branded HTML templates plus text references and subjects.json are in supabase/email-templates. Copy the HTML and matching subject into Supabase Dashboard > Authentication > Email Templates:
- confirmation
- recovery
- magic_link
- invite
- email_change
- reauthentication
- password_changed_notification
- email_changed_notification

Confirm Supabase Site URL and allowed redirect URLs first. Tokens remain Supabase-generated {{ .TokenHash }} and {{ .Token }} placeholders. The app callback supports email, signup, recovery, invite and email_change. Signup does not grant a staff role. Invitation and magic link templates are prepared for provider flows; this change does not create a new invitation or passwordless sign-in UI.

Auth email delivery uses Supabase SMTP configuration separately from the application Resend API key. Enable the relevant security notifications in Supabase if you want password/email change alerts. Disable email click tracking on auth messages so security links are not rewritten. No duplicate confirmation/reset email is sent by the app.

Regenerate these files after editing the shared email frame with node scripts/generate-auth-emails.mjs.

Official template variable reference: https://supabase.com/docs/guides/auth/auth-email-templates

## Checks

node test-resend.mjs checks safe recipient validation, mock provider failures, escaping and test receipt routing. node test-action-emails.mjs runs the complete migrations twice in isolated PostgreSQL, exercises 24 event types, checks duplicate protection, customer isolation, test routing and rendering all 30 templates. No test sends real email or creates remote orders.
