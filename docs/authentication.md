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
