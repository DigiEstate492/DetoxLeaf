# Supabase authentication

Customer routes: `/signup`, `/login`, `/forgot-password`, `/account`.
Team routes: `/admin-signup`, `/admin-login`, `/admin`.

Email/password signup, email confirmation, cookie sessions, password reset and logout use Supabase Auth. All passwords go to Supabase through server actions; they are not stored in localStorage or commerce tables. Sessions use HttpOnly, SameSite=Lax cookies, refreshed in Next.js Proxy. Protected requests and server data access validate with `auth.getUser()`, rather than trusting an unverified session cookie. Admin roles are looked up from the protected database table on each admin request; user-editable metadata never grants privileges.

## Dashboard setup

1. Run `supabase/migrations/202610160001_initial_commerce.sql` if not already installed. Run `supabase/verify.sql` to check it.
2. Supabase > Authentication > Providers: enable Email/password. Leave Confirm email enabled.
3. Authentication > URL Configuration: set Site URL to your actual site URL. Add your actual callback URLs to Redirect URLs, e.g. `http://localhost:3000/auth/callback` and `http://192.168.29.101:3000/auth/callback` for LAN development, plus the production HTTPS callback when deployed. Do not use wildcard production domains. Redirect URLs must match the browser origin, including port.
4. Default confirmation/reset email links use PKCE through `/auth/callback`. Open these links in the same browser that requested them. For cross-device links, configure email templates to use `/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/account` (signup) or `type=recovery&next=/reset-password` (password recovery), with your actual site origin. These token-hash callbacks are supported. Do not log confirmation tokens.
5. Configure production SMTP and confirm delivery before launch. Supabase email rate limits apply; UI reports throttling rather than creating a fake successful session.

The existing `.env.local` Supabase URL and publishable key are sufficient for this implementation. No service-role secret is required for public signup, login, customer profile/address changes or role checks. Never expose a secret/service-role key in a NEXT_PUBLIC variable.

## First owner and subsequent team access

Sign up at `/admin-signup`, confirm your email, then log in. The account waits for approval. `requested_admin: true` in Auth metadata is a request only; it is never authorization.

In Supabase Authentication > Users, find the intended account's verified UUID. In SQL Editor, assign its role using a reviewed UUID:

```sql
insert into public.staff_members(user_id,role,active)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid,'owner',true)
on conflict (user_id) do update set role=excluded.role,active=excluded.active;
```

Only bootstrap an owner you control. For other staff, use `admin`, `operations`, `support`, or `viewer` as appropriate. Set `active=false` to revoke access. No public action or client account can assign roles. SQL Editor approval remains necessary until an authenticated owner-only team management workflow is built.

Owners/admins can open all admin sections. Operations, support and viewer roles have restricted admin routes. Proxy checks run on navigations, RSC requests and server-action requests to protected routes. Server layouts and data helpers repeat identity/role checks. Business data in the admin dashboard still comes from the local demo and must not be treated as production operational authorization: real financial/stock mutations remain a separate database integration task.

## Customer account

The insecure local email selector has been removed. Account pages use the authenticated Supabase user ID and RLS for records. Profile and address edits persist in Supabase. Orders, subscriptions, support, reviews and rewards display the signed-in customer's database rows. The local demo checkout is not imported automatically; it cannot create real account orders. Wishlist and storefront checkout are still local demo features. No customer can select another email to view an account.

## Verification

`node test-auth.mjs` checks redirect sanitization and staff role restrictions. `node supabase/test-schema.mjs` verifies the schema/RLS boundaries. Build and logged-out HTTP route tests verify page compilation and account/admin redirects. A real signup, confirmation email, password reset and approved-admin login still require testing with a mailbox you control and the hosted project's SMTP/URL settings. No fake users are seeded and no email is sent by the test scripts.

## Spam protection (Cloudflare Turnstile)

Signup, login and password reset forms show a Cloudflare Turnstile check when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. Without the key the forms work exactly as before. The token is sent to Supabase Auth, which verifies it with the secret key stored in Supabase.

1. In the Cloudflare dashboard, open Turnstile and add a widget for your domain (and `localhost` for local testing), mode **Managed**. Copy the site key and secret key.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in your hosting environment and `.env.local`, then redeploy and restart `npm run dev`.
3. Only after that deploy is live: Supabase Dashboard > Authentication > Attack Protection > enable Captcha protection, provider Turnstile, and paste the secret key.

Doing step 3 before step 2 is live blocks every signup and login, because the forms would not send a token yet. Cloudflare's test site key `1x00000000000000000000AA` always passes; use it for local testing only.

## Blog managers

Run `supabase/migrations/202611100002_blog_managers.sql` once. It adds the `manager` role. Managers can create, edit, publish, hide and delete blog posts at **/admin/blog**, and nothing else: no orders, customers, settings, policies or sales reports. Row-level security enforces this in the database. Owners and admins can also use /admin/blog.

To add a manager, the person signs up at `/admin-signup` and confirms their email. Then an owner opens **Admin → Store & team → Staff access**, adds a record with their user ID and role `manager`, and ticks Active. Untick Active to remove access.

Each post records who created it (`author_id`, which cannot be changed later) and shows a byline (`author_name`, defaulting to the writer's profile name). Every create, edit and delete is written to the audit log with the person who did it.
