# Tray offers and platform guide

Apply supabase/migrations/202610230001_tray_offers.sql after the initial and live commerce migrations in Supabase SQL Editor. This updates the existing catalogue without deleting historical orders, stock allocations or subscription records. It archives powder, prices every tray at 50000 paise, adds a one tray option, and opens weekly 45000 paise and fortnightly 47500 paise schedule plans. Tax approval, available stock, delivery setup, approved policies and the checkout enabled flag remain owner controlled.

First-order 1+1 applies to one-time purchases only: one gift tray per paid tray. The existing customer profile lock serializes checkout. Any existing non-cancelled order makes the account ineligible; cancelled orders do not consume the offer. Complimentary order items have zero price and consume actual batch stock. Transactions fail if the entire paid plus gifted quantity cannot be allocated. Historical orders and existing reservations are not repriced. Eligibility is per account, not a cross-account abuse prevention system.

Three editorial articles are bundled for immediate reading at /blog and /blog/[slug]. The migration seeds them into content_pages without replacing existing edits. Published database articles override bundled articles with the same slug.

The Ask Detoxleaf widget is an on-device, topic-based platform guide, not a generative AI service or human operator. It works without an API key. Topics cover products, offers, plans, ordering, tracking, payment, account access, care, support, admin, reviews and rewards. It does not fetch private customer data, make live availability promises, mutate orders or authorize refunds. Chat history is held in component memory, clears on reload, and is not sent to an external AI service. Unmatched questions receive a contact handoff.

Tests: node test-tray-offers.mjs and node test-catalog.mjs. The new test runs migrations in an isolated PostgreSQL engine and checks first/repeat orders, free stock consumption, subscription exclusion, cancellation, idempotency and insufficient-stock rollback. No remote orders, emails or payments are made.
