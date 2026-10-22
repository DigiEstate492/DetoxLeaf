# Connected local operations

This implementation is a browser-local testing system, not production commerce. The same browser origin shares catalogue, inventory, batches, orders, customer summaries, delivery rules and waitlist entries through localStorage. Different devices/browsers do not share records. Do not enter real customer data.

## Important flows implemented
- Product editor persists name, multiple image URLs/paths (first image used in storefront), price, discount, description, descriptive variants, subscriber price, SKU, tax and shipping description. Product page, homepage prices, basket, checkout, shop card and wishlist consume shared settings. Two trays remain the order fulfilment unit.
- Ready stock is derived from batches. Available = ready − reserved. Each new order reserves trays against ready batches; fulfilled orders consume reservations and ready stock exactly once; cancelled orders release reservations. Growing trays are editable. Ledger records reservations, delivery, release and added harvests.
- Batch editor validates unique ID, planting/harvest order and positive tray quantity. It records production quantity and shows allocated order IDs. Initial stock/batch figures are explicitly local demo values.
- Admin orders/deliveries display actual local checkout records including fictional address and phone. Admin progress updates appear on customer tracking; cancellation releases stock. Delivery filtering supports today and pending counts by location.
- CRM derives order count, local booked amount, last order, subscription selection, next pending subscription-selected delivery, and tags from local orders.
- Analytics supports daily/weekly/monthly local booked orders and values, average value, repeat customers, products and locations. No invented conversion, retention, abandonment or recurring-revenue metrics. Subscription-selected orders are not actual recurring subscriptions.
- Delivery rules configure exact six-digit PINs, city, charge, lead time and slots. Checkout validates the configured PIN, slot and dates and calculates tax and delivery using current settings. No real coverage claim is made.
- Unsupported PINs offer an opt-in Notify Me form saved to the local waitlist, visible in admin settings. No email is sent.

## Limits before real launch
Requires a persistent server database, transaction-safe stock reservations across devices, customer/staff authentication and authorization, payment or approved COD operations, secure notification services, actual delivery coverage and capacity, approved policies/product-care guidance, business tax configuration, analytics events, backups and production hosting. Browser data can be edited or cleared, and localStorage mutations are not a multi-user transaction system. Do not publish this public local admin as a live operational backend.

Legacy demo orders have no batch allocations and are labelled accordingly in admin; no retrospective stock consumption is inferred from them.

Verification: test-local-operations.cjs, test-demo-flow.cjs, test-demo-coupons.cjs and ESLint passed. All 32 routes returned HTTP 200.

Optimized production build now passes using `next build --webpack`, including all static routes. The build script uses Webpack consistently with the working development compiler. This resolves the previous compiler/build verification blocker; it does not remove the production-backend requirements above.

## Recharts analytics
/admin/analytics now includes themed booked-value area, order-count bar, order-status donut and delivery-location bar charts. Daily view uses hourly buckets; weekly uses the last seven calendar days; monthly uses month-to-date. Cancelled orders are excluded from booked value/count and included in the status breakdown. The labelled sample-preview toggle affects only chart rendering, not stored orders, inventory or summary cards. Cards have responsive sizing, green gradient fills, cream surfaces, tooltips, keyboard-accessible charts, reduced-motion support and expandable data tables. No fabricated live metrics are shown.
Verification: lint, chart aggregation/period/cancellation/empty-state assertions passed; analytics route returned HTTP 200.

Mobile overflow fix: the homepage header previously measured 450px scroll width at a 375px viewport. Account/wishlist shortcuts now live in the mobile menu; compact logo/search/cart/menu controls fit the header. Shared grid children and form controls can shrink, long strings wrap, and table/tab overflow stays in local scroll containers. Browser checks passed at 320px and 390px on home, product, checkout, account, admin analytics and orders; additional 320px checks passed for About, FAQ, tracking, shop, subscriptions, search, wishlist, admin products and backups. Expanded mobile menu also showed no document overflow.
