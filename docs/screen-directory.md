# Screen directory

## Customer
- / — Home
- /shop — Collection
- /fresh-wheatgrass — Product detail, quantity and plan selection
- /subscriptions — Plans and subscription preview
- /our-farm — Farm story
- /how-it-works — Purchase and fulfilment journey
- /recipes — Recipe inspiration
- /blog — Reading hub
- /about — Brand story
- /faq — Frequently asked questions
- /contact — Local validation only; does not send or store messages
- /cart — Browser-local preview basket shared with homepage and product page
- /checkout — Local form preview; no submission, payment or order creation
- /order-confirmation — Explicit demo confirmation
- /track-order — Demo tracking and live-lookup explanation
- /shipping-policy, /refund-policy, /privacy-policy, /terms-and-conditions — Explicit policy placeholders pending business-approved text

## Admin
- /admin — Sample overview
- /admin/orders — Search and change example order stages
- /admin/products — Edit sample product fields
- /admin/inventory — Sample stock counts; available = ready minus reserved
- /admin/batches — Add and validate sample harvest batches
- /admin/customers — Search sample CRM profiles
- /admin/analytics — Period selection and awaiting-data metrics
- /admin/deliveries — Search sample deliveries and change stages
- /admin/subscriptions — Change example subscription state
- /admin/settings — Validate a demo PIN-code delivery rule

The admin is a public UI prototype containing only sample records, not an authenticated operations system. Screen-local edits reset on navigation. Protect server routes with staff authentication and authorization before connecting operational or customer data. Product/admin demo edits do not change the storefront catalogue. No payment provider, order database, carrier, billing system or messaging service is connected.

Verification: ESLint passed. All 30 current page routes returned HTTP 200 using the Webpack development server. The development script uses Webpack because Turbopack failed to communicate with its CSS worker in this environment. Production compilation passed, but static generation failed with Windows EPERM creating a Next.js _not-found output directory; full production build remains unverified.
