# Non-payment business workflows

All workflows below remain browser-local and use fictional details. No real payment, refund, email, SMS or WhatsApp delivery was added.

## Customer account
/account provides a demo email selector, order history and reordering. /account/profile edits the local profile; /account/addresses manages saved addresses and checkout can load them. Selecting an email is not authentication.

## Subscription scheduling
Subscription-selected checkout creates a local schedule. /account/subscriptions supports weekly/fortnightly frequency, quantity/date/address/PIN changes, skip, pause/resume and cancellation with confirmation. Simulate next delivery creates a local stock-reserved order and advances the schedule. No background scheduler or recurring billing is enabled; existing orders are unaffected by schedule changes.

## Support and reviews
/account/support saves order-linked cancellation, refund-request, delivery and general-help tickets. /admin/support replies and status changes appear in the customer account; explicit cancellation approval releases reserved stock. Refund requests are records only; no money moves.
/account/reviews accepts ratings, review text and optional photo/video HTTPS links for delivered local orders, with one review per order. /admin/reviews moderates them. Published reviews display on the product page with local ratings and filters, explicitly labelled demo purchases. Files are not uploaded to a server.

## Rewards and coupons
Delivered orders earn one local point per ₹100. /account/rewards redeems 20 points into a customer-specific, single-use ₹100 coupon. Referral codes are displayed and can be recorded on profiles; automatic referral bonuses are not implemented.
/admin/coupons configures fixed/percentage discounts, minimum subtotal, expiry, usage limit, first-order, subscription-only, repeat-customer segment and optional email eligibility. Rules are rechecked at local order creation. Local state can be edited/cleared and is not a production coupon security boundary.

## Fresh stock and reporting
/admin/stock-health records spoilage/damage and batch use-by dates. Only unreserved trays can be written off. Expired batches are excluded from allocation; progressing an order with expired allocated stock is blocked, requiring cancellation/replacement. Existing tests cover reservation/delivery/cancellation invariants.
/admin/reports configures daily tray capacity (0 = unlimited) and estimated tray cost, reports simulated totals/tax/contribution and exports orders as CSV. Capacity is checked during local order placement. Estimates exclude shipping costs, staff, packaging and overhead. No real accounting statements are generated.

## Notifications, staff and backup
/admin/notifications contains automatic local order/stage previews and manual email/WhatsApp/SMS template previews. Messages are not sent outside the app.
/admin/team stores a staff roster and role plan. Permissions are descriptive and not enforced; real staff authentication/authorization still needs a backend.
/admin/backups exports JSON and restores a selected local backup after explicit replacement confirmation. Import validates order/batch counts, allocation reservations, delivery rules and business records before changing storage. Backups contain fictional customer details; browsers/devices are not synchronized.

Verification: business-workflow, coupon, order-flow, inventory/operations tests and ESLint passed. Optimized build and HTTP route checks are run separately.

Final verification: all 48 customer/admin page routes returned HTTP 200; production build passed after the checkout coupon integration fix. Stock allocation additionally validates batch use-by against the selected delivery date, and tests cover expired stock, future use-by, capacity, backup mismatch rejection and failure atomicity. Payments were not integrated.
