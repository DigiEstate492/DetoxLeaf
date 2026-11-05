# Data layer events for Google Tag Manager

The website pushes these events to `window.dataLayer`. GTM listens for them with **Custom Event** triggers and fires GA4, Google Ads, Meta and other tags. Code: `lib/analytics.mjs` (helpers) and `app/analytics-tracker.js` (page views, clicks and form tracking for the whole site).

## Naming convention

- Event names are lowercase `snake_case`, using GA4's recommended event names wherever one exists (`view_item`, `add_to_cart`, `purchase`, `generate_lead`, `login`, `sign_up`, `search`).
- Site-specific events use the same style and say what happened: `whatsapp_click`, `check_delivery`, `form_error`.
- Parameter names are `snake_case` and stay the same across events.

## Sent with every event

| Parameter | Example |
| --- | --- |
| `page_path` | `/fresh-wheatgrass` |
| `page_location` | `https://www.detoxleaf.in/fresh-wheatgrass` (query string removed) |
| `page_title` | `Fresh Wheatgrass Trays ₹500 \| Detoxleaf` |
| `page_type` | `Product Page`, `Checkout`, `Contact Page`, `Account` … |

## Events

| Event | When it fires | Main parameters |
| --- | --- | --- |
| `page_view` | Every page, including moves between pages without a reload | `page_referrer` (origin only) |
| `view_item` | Product page opens | `ecommerce` |
| `view_item_list` | Tray plan cards load | `item_list_name`, `ecommerce` |
| `select_item` | A tray option, delivery plan or plan card is chosen | `item_list_name`, `ecommerce` |
| `add_to_cart` | Add to basket, add to cart, Book this plan, basket quantity + | `ecommerce` |
| `remove_from_cart` | Basket quantity − or Remove | `ecommerce` |
| `view_cart` | Basket page opens with items | `ecommerce` |
| `add_to_wishlist` | Product saved to the wishlist | `ecommerce` |
| `begin_checkout` | Checkout opens with items in the basket | `ecommerce` |
| `add_shipping_info` | Order placed (delivery details submitted) | `ecommerce.shipping_tier` |
| `add_payment_info` | Order placed | `ecommerce.payment_type` (`razorpay` or `cod`) |
| `purchase` | Order confirmation page shows a confirmed or paid order. Once per order per device | `ecommerce.transaction_id`, `value`, `tax`, `shipping`, `discount`, `order_mode`, `payment_type`, `delivery_plan` |
| `generate_lead` | Contact form, bulk quote form or delivery waitlist submitted | `form_name`, `form_id`, `form_location`, `lead_type`, `currency`, `value` (0), plus `topic`, `quantity`, `frequency`, `contact_method` where relevant |
| `form_start` | First field of any form is focused | `form_name`, `form_id`, `form_location`, `lead_type` |
| `form_submit` | Any form is submitted | same as `form_start` |
| `form_success` | The form's action succeeded | same as `form_start` |
| `form_error` | Browser validation blocked the form, or the server returned an error | `error_type` (`validation`, `server`, `auth`, `not_signed_in`, `checkout`, `delivery_check`), `error_field`, `error_message` |
| `login` | Sign-in succeeded (confirmed on the next page) | `method: email` |
| `sign_up` | Account created | `method: email` |
| `search` | Site search, 1 second after typing stops | `search_term`, `search_results`, `search_category` |
| `search_filter` | Search category chosen | `search_category` |
| `check_delivery` | PIN delivery check on the product page or checkout | `delivery_available`, `delivery_city`, `check_location` |
| `track_order` | Track order form used | |
| `manage_subscription` | Pause, resume, skip or cancel in the account | `subscription_action` |
| `cancel_order` | Customer cancels an unpaid order | |
| `cta_click` | Any button-styled link or hero link (not form submit buttons) | `link_text`, `click_location`, `link_url` |
| `navigation_click` | Header or footer menu link | `link_text`, `click_location`, `link_url` |
| `outbound_click` | Link to another website | `link_text`, `link_domain` |
| `phone_click` | `tel:` link | `link_text`, `click_location`, `contact_method` |
| `whatsapp_click` | Any WhatsApp link, including the floating button | `link_text`, `click_location`, `contact_method` |
| `email_click` | `mailto:` link (none on the site today; fires once one is added) | `link_text`, `click_location`, `contact_method` |

`click_location` is one of `header`, `footer`, `hero`, `content`, `mobile_buy_bar`, `floating_button`.

### Form names

`Contact Form` (lead_type `enquiry`), `Bulk Quote Form` (`bulk_quote`), `Delivery Waitlist Form` (`delivery_waitlist`), `Delivery Check Form`, `Checkout Form`, `Track Order Form`, `Site Search`, `Recipe Submission Form`, `Support Request Form`, `Product Review Form`, `Login Form`, `Signup Form`, `Password Reset Request`, `Password Update Form`.

## Ecommerce format

GA4's format, in rupees. An `{ecommerce: null}` push always comes first so values do not carry over between events.

```js
{
  event: "add_to_cart",
  page_path: "/fresh-wheatgrass", page_title: "…", page_type: "Product Page",
  ecommerce: {
    currency: "INR",
    value: 500,
    items: [{
      item_id: "DL-WG-1-T",          // SKU, or the plan code for delivery plans
      item_name: "Wheatgrass Trays",
      item_brand: "Detoxleaf",
      item_category: "Wheatgrass Trays", // or "Delivery Plans"
      item_variant: "1 tray · 1.25 kg",
      price: 500,
      quantity: 1
    }]
  }
}
```

## Privacy

- **Personal details are never pushed:** names, emails, phone numbers, addresses, PIN codes and message text are dropped. Any email address or long number inside other text is replaced with `[redacted]`, so tags cannot forward personal data to ad platforms.
- **Admin pages push nothing,** and neither do the staff login and signup forms.

## GTM setup

1. **Tags fire on these events:** create a Custom Event trigger per event name, for example `generate_lead` or `purchase`. Read parameters with Data Layer Variables, for example `ecommerce.value` or `form_name`.
2. **Page views:**
   - Either set the GA4 Google tag to not send page views (`send_page_view: false`) and send a GA4 `page_view` event on the `page_view` custom event.
   - Or keep GA4's automatic page views and enhanced measurement history changes, and don't use the data layer `page_view`.
   - Don't do both, or page views count twice.
3. **GA4 enhanced measurement:** turn off **Form interactions**. Its `form_start` and `form_submit` would duplicate these, which are more accurate.
4. **Test orders:** every `purchase` carries `order_mode` (`test` or `live`). Add a trigger condition `order_mode equals live` on conversion tags, so test orders are not reported to Google Ads or Meta.
5. **GA4 ecommerce:** tick "Send Ecommerce data" from the Data Layer on the GA4 event tags for the ecommerce events.

## Testing

Open the site with GTM **Preview** (Tag Assistant), go through each action and check the event appears with its parameters. `node test-analytics.mjs` checks the helpers, privacy filtering and once-only purchase without a browser.
