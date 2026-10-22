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

The existing `/admin/notifications` demo outbox links to this settings page. Local demo outbox records are not sent or marked as delivered.

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

`lib/resend-email.mjs` implements server-side Resend API sending with a 10-second timeout, plain-text/HTML bodies, safe error results, and required idempotency keys. It uses the API directly; no additional email SDK is necessary. Resend idempotency has a limited provider retention window and is not a substitute for a durable outbox.

`lib/email-templates.mjs` provides branded admin-test, verified Razorpay test-receipt, order-confirmation and packed/out-for-delivery/delivered templates. HTML values are escaped. Order/delivery helpers are for trusted database order snapshots, never arbitrary client payloads.

After successful `/api/razorpay/verify`, a test receipt is attempted only if RESEND_TEST_TO and valid sending configuration are present. Payment verification stays successful if email fails. The response includes only the email status. This sends a clearly labelled gateway test receipt, not a fulfilment confirmation, and never uses the checkout's entered email address. Reverification reuses the payment's provider idempotency key.

Real order/delivery emails are **not yet triggered**: checkout and operational transitions still use browser-local demo records. Connect the existing database notification_jobs outbox to trusted persisted order transitions, with leasing/retries/delivery-event handling, when that backend is implemented. This integration does not silently turn fictional demo orders into real customer communications.

## Checks

`node test-resend.mjs` uses a mock fetch transport and fake keys. It checks no-key behavior, recipient validation, idempotency, escaping, test-only routing and failure handling without sending anything.
