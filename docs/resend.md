# Resend email setup

## Variables

Blank placeholders have been added to `.env.local`, without replacing existing keys. `resend.env.example` is a shareable reference.

- `RESEND_API_KEY`: server-only API key from Resend.
- `RESEND_FROM_EMAIL`: raw email address on a domain you verified in Resend, e.g. `orders@yourdomain.com`. The displayed sender is Detoxleaf.
- `RESEND_REPLY_TO`: optional support inbox.
- `RESEND_TEST_TO`: optional operator-controlled inbox for Razorpay **test** receipts. Leave blank to disable test receipts. Checkout users cannot choose this address.
- `EMAIL_SITE_URL`: storefront origin for branded email links; replace localhost with the real HTTPS site before deployment.

Add the values and restart the Next.js server. Missing credentials do not make checkout fail and never pretend to send email. Keys are not sent to the browser or rendered in admin pages. No real email was sent during implementation.

## Test from admin

Open `/admin/email` as an approved owner/admin. It shows missing variable names and a test-email button. The button sends only to the signed-in admin's confirmed email address. It accepts no arbitrary recipient from the browser. Repeated clicks within the same minute use a provider idempotency key. A successful response means Resend accepted the request; check delivery/bounces in Resend and the recipient inbox separately.

The protected `/admin/notifications` screen shows persisted email jobs and their processing status.

## Signup confirmations and password resets

Hosted Supabase Auth sends these emails, rather than the Next.js app. `.env.local` does **not** change Supabase's SMTP settings automatically.

After verifying your domain in Resend, configure Supabase Dashboard > Authentication > Email/SMTP settings:

| Setting | Value |
| --- | --- |
| Enable custom SMTP | On |
| Sender email | Same verified email as RESEND_FROM_EMAIL |
| Sender name | Detoxleaf |
| Host | smtp.resend.com |
| Port | 465 (TLS) |
| Username | resend |
| Password | Your Resend API key |

Save the settings in Supabase. Keep the auth confirmation/reset flow unchanged; Supabase generates the secure links. Confirm your Site URL and allowed callback URLs as documented in `docs/authentication.md`. The first production verification should use a mailbox you control. Do not send a second custom confirmation from the app; it would duplicate the secure Auth flow.

Official references: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Transactional integration

The live commerce backend now queues real database action events for the /api/jobs worker. The action-email migration extends this to orders, delivery, payments, schedules, support, reviews, accounts, rewards, team access and consented delivery waitlists. See [action-emails.md](action-emails.md) for the current action map, recipient rules, migrations and scheduler configuration.

The active gateway API is /api/payments and /api/payments/webhook. Legacy /api/razorpay/order and /verify endpoints are retired. Test email delivery uses the configured operator inbox, never an arbitrary checkout email.

The HTML and plain text renderer uses trusted database snapshots and escapes dynamic fields. Outbox keys deduplicate replayed events. Resend acceptance is not proof of inbox delivery. No real email was sent during implementation.

## Checks

Run node test-resend.mjs and node test-action-emails.mjs. Both use isolated fixtures or mock transport and send no real messages.
