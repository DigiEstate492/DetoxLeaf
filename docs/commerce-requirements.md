# Detox Leaf commerce requirements

The attached storefront specification is preserved in storefront-specification.txt. The following requirements extend it and are the roadmap for continued development. Preserve the premium design, large readable typography, grass video, and mobile compatibility already requested.

## Scope and status
Implemented: Home, About, product quantity and purchase-plan controls, preview cart, local hero video, mobile development access. Storefront navigation and footer are being aligned with this specification.
Pending: durable cart, product catalogue/database, authentication, checkout/payment integration, real subscriptions, order tracking, verified reviews, coupons, serviceable PIN codes, notifications, operational admin and analytics.
Never present example sales, customers, inventory, reviews, deliveries, or serviceability as live records. Do not invent social URLs, contact details, legal policies, tax rates or delivery availability. Live order confirmation must follow verified payment/order creation.

## 21. Order management
The pasted document ends at “ORDER M”; detailed order-management requirements are incomplete. Implement order lifecycle consistently with checkout, tracking, delivery and stock reservations once the backend is designed.

## 22. Product management
Admin edits name, images, price, discount, inventory, description, variants, subscription pricing, SKU, GST/tax settings and shipping settings. Use one authoritative product model across storefront, checkout and admin.

## 23. Fresh-produce inventory
Track growing, ready, reserved and delivered quantities. Examples supplied: available/ready 86 trays, growing 420, reserved 47, delivered 31; these are sample values only. Define whether ready includes reservations; calculate sellable stock consistently. Reserve stock atomically at checkout, expire abandoned reservations, prevent overselling, and keep an auditable movement ledger.

## 24. Farm batches
Each harvest has a batch identifier, e.g. DL-WG-061026, planting date, harvest date, number of trays, production quantity and order allocations. Link delivered items to their source batch for traceability. Track units and quantities explicitly.

## 25. Customer CRM
Customer profile: orders, total spent, last order, subscription state, next delivery and tags such as Regular, Subscriber and Gurugram. Sheetal / 4 orders / ₹2,000 / October dates are illustrative. Restrict customer data to authorized staff.

## 26. Analytics
Sales by day/week/month. New and repeat customers, retention, average order value. Conversion, cart and checkout abandonment, top products and locations. Active/new/cancelled subscriptions and monthly recurring revenue. Define events and metric calculations before reporting values.

## 27. Delivery management
Today's deliveries grouped by location. Each order shows customer, address, phone, items, delivery slot and payment status. Gurugram 21 / Delhi 12 / Noida 8 are examples. Connect slots to capacity, order status, and farm readiness.

## 28. PIN-code serviceability
Validate six-digit Indian PINs against configured service areas. When supported, show delivery charge, available dates and slots; when unsupported show “We’re coming soon” and a Notify Me option. Notifications require a saved opt-in and a real destination. Do not infer coverage merely from a PIN prefix.

## 29. SEO and content
Routes planned: Home, Shop, Fresh Wheatgrass, Subscriptions, Our Farm, How It Works, Recipes, Blog, FAQ, Contact, Track Order. Give each real page its own metadata. Structured product data uses real offers/reviews only.

## 30. Footer
Brand: DETOX LEAF; “Farm fresh wellness delivered to your home.”
Shop: Fresh Wheatgrass, Subscriptions.
Learn: Our Farm, How It Works, Recipes, Blog, FAQs.
Support: Contact, Track Order, Shipping Policy, Refund Policy, Privacy Policy, Terms & Conditions.
Social: Instagram, Facebook, YouTube. Link only when actual destinations are provided; show unconfigured items as non-interactive until implemented.

## Delivery plan
1. Align existing storefront with specification, keeping functional destinations and honest previews.
2. Product data model, catalogue/product routes, durable cart and serviceability configuration.
3. Authentication, checkout, payment webhooks, order reservation lifecycle and customer account.
4. Subscriptions, delivery schedules, customer controls and notifications.
5. Protected admin, farm batches, inventory ledger, CRM, delivery management and analytics.
6. Verified reviews, coupons, wishlist, search and content/SEO expansion.

Track Order frontend implemented at /track-order: order number/email form, native validation, explicit unavailable-live-lookup message, labelled demo delivery timeline, sample summary, and FAQs. Real lookups must verify customer ownership server-side before exposing order data. No order lookup API, carrier feed, or WhatsApp destination is connected yet.

## Complete demo order flow
Use /fresh-wheatgrass or the homepage to add bundles. Continue through /cart → /checkout → /order-confirmation → /track-order.
- Browser-local cart shared between product/home/cart/checkout.
- Checkout uses fictional default details and explicit demo disclosure.
- Coverage checker: 122001 Gurugram ₹40; 110001 Delhi ₹60; 201301 Noida ₹50. Any other six-digit PIN is unsupported in this sample. These rules are not real serviceability.
- Select a sample delivery slot and simulated payment or demo COD; no actual payment is attempted.
- Successful local order creation generates a DEMO ID, saves the name/email/PIN/city/slot/price and stage history, clears the basket, and opens confirmation.
- Phone and address form values are not persisted. Use fictional information in all fields.
- Track the latest order, select a previous order, or look it up with matching demo ID and email in the same browser. This lookup is not authentication or a server security boundary.
- Advance stages manually or start/pause a five-second-per-stage simulation. State transitions and in-app notifications persist. The final Delivered notification is retained in the order history.
- Clear demo history from tracking with explicit confirmation. Maximum 20 demo orders retained per browser.
- Toasts are dismissible and announced through an accessible status region. Tracking controls work without animation; reduced-motion is respected.
- No backend inventory reservation, recurring billing, real courier delivery, email, SMS or push notification occurs.
Verification: test-demo-flow.cjs validates PIN rules, invalid checkout, totals, subscriber pricing, unique demo orders, persistence, stage limits, notification count/final message and reset. ESLint passed.

## Quick commerce enhancements
Implemented /search (products, recipe ideas, reading destinations and FAQs with category filters and empty state) and /wishlist (browser-local favourite with remove and product link). Header access added.
Product page: 2/4/8-tray presets map to 1/2/4 two-tray bundles; total price follows quantity; Buy Now sets the exact selection and opens demo checkout; delivery checker uses the existing sample PIN rules; keyboard-accessible information tabs link to supporting content. No invented care instructions or shelf-life claims.
Demo coupons at checkout: WELCOME100 gives ₹100 off first demo order in this browser; GREEN10 gives 10% off product subtotal. Minimum ₹500; non-subscription purchases only; shipping is not discounted. Discounts are recomputed when placing the demo order and stored with the order for confirmation/tracking. Clearing demo history resets first-order eligibility; this is not a production coupon security model.
Validation: ESLint, demo flow and coupon tests passed.
