# Razorpay Test Mode

Use `/checkout`, add a bundle, enter fictional contact details, check a configured PIN and choose `Pay with Razorpay · Test`. Existing local demo checkout remains available separately.

## Keys
Create `D:\DigiEstate\detoxleaf\.env.local`:
```
RAZORPAY_KEY_ID=rzp_test_your_test_id
RAZORPAY_SECRET=your_test_secret
```
`RAZORPAY_KEY_SECRET` is accepted as an alias. No secret uses a NEXT_PUBLIC prefix. The server rejects live-mode key IDs. Restart Next.js after configuring keys.

## Server pricing
The browser never supplies an authoritative payment amount. The server computes INR/paise totals from quantity, plan, exact PIN and permitted coupon. Defaults match the initial local demo: ₹500 one-time, ₹450 subscriber, 0% tax, delivery ₹40 (122001), ₹60 (110001), ₹50 (201301). Optional server settings are shown in `razorpay.env.example`. The server refuses a mismatch between local admin pricing and its own catalogue. Only GREEN10 is supported for gateway checkout; advanced browser-local coupons remain available in the separate simulated flow.

## Verification and recovery
POST `/api/razorpay/order` creates an actual Razorpay Test Mode order, then issues a signed two-hour checkout intent bound to that order and amount. The callback is sent to `/api/razorpay/verify`, which verifies the intent and payment signature, fetches the payment from Razorpay and checks order, amount, currency and captured status. Authorized test payments are captured server-side. Local fulfilment is created only after this verification.

Cancellation and failure keep the basket. A successful callback is retained in sessionStorage for Retry verification; this avoids repeating a test payment when confirmation fails. Payment-ID deduplication prevents duplicate local fulfilment while the order exists in browser storage. Local stock and totals are rechecked before fulfilment; if local data changed after payment, restore the matching state and retry confirmation. Do not make another payment to fix confirmation.

## Limits
This is test-only. Orders/inventory/customer records are still browser-local; there is no production database or persistent webhook reconciliation. Clearing browser/session storage discards recovery state. Do not enable live keys or real payments without a server catalogue, durable reservations/orders, idempotency and verified webhooks. No real refunds or recurring charges were added.

## Verification
`node test-razorpay.mjs` covers test-key enforcement, server totals, rejected custom coupons, signed intent integrity/expiry, HMAC signatures, order/amount/currency binding and test capture with mocked gateway responses. Existing business/order/stock regression tests also pass. Actual Razorpay sandbox payment testing requires configured test credentials and completing the official test checkout.

Official integration instructions: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## Payment celebrations
Verified Razorpay success triggers a short botanical confetti pop, followed by a gentle falling-confetti phase on confirmation. The local demo checkout uses the same visual confirmation. A session-scoped order marker is consumed once so refresh/back navigation does not replay the effect. Payment failure/cancellation/verification errors do not celebrate. The success card scrolls into view, its checkmark has a brief spring/ring animation, and the test-payment button has press feedback. Short vibration is requested only on browsers that support it; iOS and other unsupported browsers keep the visual feedback. Reduced-motion disables confetti/vibration and checkmark motion. The fixed canvas ignores pointer input, caps particle count and pixel ratio, stops on hidden tabs, and cleans up animation frames/listeners.
Validation: lint, Razorpay and order regression tests passed; optimized build passed. Browser demo checkout reached confirmation with the confetti canvas active and the confirmation card at 54px from the viewport top. No actual gateway payment was performed for this animation test.

## Popup origin fix
Razorpay requests now validate the browser Origin against the incoming Host header (or explicit STOREFRONT_ORIGIN), instead of Next.js's internal `0.0.0.0` request URL. This supports localhost and LAN access while rejecting unrelated origins. Phone validation now uses a Unicode-set-compatible escaped pattern for modern browser constraint validation.
Verified with actual Razorpay Test Mode order creation (HTTP 200, ₹540 test amount) and browser UI: gateway popup opened with Test Mode, Cards, Netbanking and Wallet options visible. No card details were entered and no payment was made. Origin regression tests and lint passed. The local server was restarted to load the updated routes.
