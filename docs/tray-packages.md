# Multi-week tray packages

Added on 27 October 2026 from the customer supplied offer poster.

| Display plan | Trays | Duration | Price | Approximate tray rate |
| --- | --- | --- | --- | --- |
| 1 month | 12 | 4 weeks | INR 5,000 | INR 417 |
| 2 months | 24 | 8 weeks | INR 7,200 | INR 300 |
| 3 months | 36 | 12 weeks | INR 8,500 | INR 236 |

All packages specify three trays per week and the existing listed weight of 1.25 kg per tray. Rates are rounded; package totals are authoritative. Savings compare the package price with the same tray count at the INR 500 one-time tray price, excluding unconfirmed delivery and tax amounts.

Source of truth: lib/tray-packages.mjs. The reusable app/tray-packages.js component appears through PlansList on the homepage and /subscriptions. Cards stay visible even before optional catalogue data loads. The existing single-delivery database plans remain available inside an expandable section. FAQ and the platform guide describe the new package offers.

Booking puts the package in the basket and opens checkout. Migration `202610310002_tray_package_orders.sql` adds the package variants (`DL-WG-PKG-*`) and plans (`WG-PKG-*`); until it is applied the buttons show "Opening soon". The server charges the plan price once, gives no first-order 1+1 and creates a schedule record 7 days after the first delivery.

Known limit: an order has one delivery date, slot and delivery charge. The whole package is reserved from stock and moves through fulfilment as one order, so the team arranges and tracks the later weekly deliveries by hand. Split weekly fulfilment and per-delivery charges are not built.

The reference poster's unsupported medical and certification claims have not been copied into the website. The existing Detoxleaf logo is retained; the phone screenshot and messaging controls are not used as site artwork.
