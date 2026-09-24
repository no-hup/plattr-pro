# Aggregator middleware for a one-outlet Bangalore POS (Sept 2026)

Only two products are sold as a pipe a new POS can plug into. UrbanPiper Hub (POS-integration partner, not Prime) is the one with a public partner programme, sandbox, and certification. Wera "Merge" is a real Mumbai company advertising the same job, with no public API, price, or aggregator approval. Everyone else a founder hears about is either a competing POS or not in this market.

| Candidate | Pricing model | Rough cost | Who contracts | Onboarding effort | Sandbox | Tablet goes dark | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UrbanPiper Hub, as a POS partner | Flat fee. No percentage of order value. INR amount, setup fee, minimum outlets, and term are not published. | No official INR figure. UK restaurant Hub is "from £79", no setup fee, no per-order fee. India blog ranges of ₹2,000–8,000/month conflict and are not quotes. | Not published. The partner motion is POS-led: you create the merchant; they issue the outlet account. A separate path exists where the restaurant is already their customer. | Signup, then sandbox, self-test, demo, certification form. Their site says most partners certify in "a few weeks". Sign-off after the form is "a day or two". One outlet maps in about 48 hours on weekdays after you request go-live. | Yes. Their staging, not a live Swiggy or Zomato store. | Unknown. Not stated for Swiggy or Zomato. | High on the mechanism and the gaps. Low on rupees and the tablet. |
| Wera Merge | "Contact us for pricing." Their own POS prices are published and are a different product. | Merge price: not published. Do not use the POS prices below as the API price. | Not published. | A demo, from the website. No public certification or timeline. | No public sandbox. | Unknown. | Low. The product page exists. The partnership does not, in public. |

## Not on the shortlist

**Petpooja, Rista (Dotpe), Restroworks (ex-POSist).** These are POS products with their own Swiggy/Zomato connections. Petpooja's published Online Ordering API is the other direction: an ordering platform pushes orders *into* Petpooja (`save_order`, push-menu callback) at [onlineorderingapisv210.docs.apiary.io](https://onlineorderingapisv210.docs.apiary.io/). Restroworks' technology-partner page ([restroworks.com/partners/technology-integration](https://www.restroworks.com/partners/technology-integration/), updated 2026-04-02) invites aggregators and payment firms to integrate *with Restroworks*, and says sandbox access comes after you apply. Rista sells its own POS with Swiggy/Zomato on [ristaapps.com](https://ristaapps.com/restaurant-point-of-sale-software). None of these is a pipe you rent while keeping your own POS. Petpooja's own FAQ says it charges the restaurant "zero commission" for Swiggy/Zomato on top of the Petpooja subscription ([petpooja.com/poss/online-order-management-software](https://www.petpooja.com/poss/online-order-management-software)). That is a reason for the restaurant to buy Petpooja, not a reason for you to integrate Petpooja.

**Deliverect.** Large global middleware. Its public country list (Australia, Belgium, Canada, France, Germany, Italy, LATAM, Mexico, Middle East, Netherlands, Nordics, Portugal, Spain, Switzerland, UK, US, plus "Global") has no India site, and its published channel pages do not list Swiggy. A Partnerbase page saying Deliverect and Zomato are "partners" (first seen 2026-02-25) is a shared-partner scrape, not a product page. Not a 2026 India shortlist until their sales team names a Swiggy channel in writing.

**LimeTray.** Still a private Gurugram restaurant-software company. Tracxn (updated 2026-07-04) puts headcount at 12 as of 2025-07-31 and revenue in the ₹0–10 crore band as of 2024-03-31. No public "POS vendors, buy our Swiggy pipe" programme found. Not a shortlist.

**Long-tail "cheap Swiggy API" sites.** Leave them off. Swiggy does not hand a restaurant an API token. Its own partner FAQ splits the world into "POS enabled" and "not integrated on POS", and a POS-enabled outlet's menu changes go by email to "your POS integrated partner", not through a self-serve key ([partner.swiggy.com/PartnerFAQ](https://partner.swiggy.com/PartnerFAQ), page dated 2026-02-03). A 2025 blog that tells you to open Swiggy Partner → Settings → API Access and get a token in 24–48 hours ([restroiqai.com](https://www.restroiqai.com/blog/swiggy-zomato-integration-guide-restaurants)) does not match that FAQ. What the cheap sites actually do is log into the restaurant's partner app, scrape it, or call an unpublished endpoint. That can get the outlet delisted, breaks without notice, has no idempotency contract, and puts customer phone numbers and addresses on a vendor Swiggy did not approve. There is no SLA to put in front of a pilot restaurant.

---

## UrbanPiper Hub (POS-integration partner)

Docs used: POS partner docs at [api-docs.urbanpiper.com/downstream](https://api-docs.urbanpiper.com/downstream/readme.md) and the restaurant help centre at [help.urbanpiper.com](https://help.urbanpiper.com/ordering-channels/swiggy/integrate-your-swiggy-account-with-urbanpiper.md). Partner marketing: [urbanpiper.com/partner-with-us](https://www.urbanpiper.com/partner-with-us).

### 1. Commercial model

The partner page says "Flat fee", "No hidden charges", "No percentage cut from your client's orders", "No bill that unexpectedly escalates as they grow." That is a model statement, not a rate card.

No India rupee price, setup fee, minimum outlet count, or contract term is on the partner page, the POS docs, or the help centre. The UK Hub page ([urbanpiper.com/uk/free-trial](https://www.urbanpiper.com/uk/free-trial)) says "Plans from £79", "No one-time set-up fee", "Unlimited orders; No per order charges", and that price depends on integration type, location count, and brand count. Same "no setup / no per-order" lines on the Canada Hub page. Do not convert £79 into an India price. The help-centre pricing answer is "contact us"; it depends on integration type, locations, and brands (same page family, Arabic mirror states the 7-working-day setup line separately).

Third-party India ranges, all unsourced and inconsistent, so not adopted: ₹2,000–3,000/month ([restrofi.com](https://restrofi.com/blog/restaurant-pos-alternatives-india), 2025-03-15, "last updated" 2026-09-16); ₹3,000–6,000/month ([dineopen.com](https://www.dineopen.com/blog/cloud-kitchen-pos-petpooja-vs-urbanpiper-vs-dineopen.html), 2026-03-12); ₹3,500–8,000/month ([codingclave.com](https://codingclave.com/blog/best-restaurant-pos-software-india-2026), 2026-03-22). These sites are selling their own POS. Treat them as noise.

No minimum-outlet or annual-commit figure found. (<80% if anyone quotes you one from memory.)

### 2. Who pays

Not stated. Two different motions exist in their own docs.

- POS-partner motion. After "signup formalities for the integration programme" you get a Gamma login. You add each restaurant under Backlog. Their partnership team converts that into a merchant, creates an Atlas account, and emails you the production auth key ([onboarding process](https://api-docs.urbanpiper.com/downstream/getting-started/onboarding-process.md)). You are the party driving the account. That is compatible with either you holding the contract or them invoicing the restaurant after you introduce it. Which one they do for a one-outlet vendor is not written down.
- Restaurant motion. The Swiggy help article says you must already be "an active UrbanPiper customer", then you press Request to Go Live and their onboarding team maps the outlet with Swiggy ([integrate Swiggy](https://help.urbanpiper.com/ordering-channels/swiggy/integrate-your-swiggy-account-with-urbanpiper.md)).

The partner page also offers "referral / reseller programs". That is a third commercial shape, also without a rate.

There is no public source for what is "usual" for a small POS vendor in 2026. (<80% on any claim that the restaurant always signs, or that you always rebill.)

### 3. Onboarding as a POS vendor

Public steps, in order:

1. Become a partner. The marketing page says who can join: POS providers, ordering platforms, delivery marketplaces, last-mile, loyalty, payments, hardware. It promises "developer access, sandbox credentials and a named integrations engineer" and "most partners go from kickoff to certified integration in a few weeks" ([partner-with-us](https://www.urbanpiper.com/partner-with-us)). "A few weeks" is their sentence, not a measured median.
2. Gamma credentials arrive by email after signup. If they do not, the docs say write to pos.support@urbanpiper.com. You mark each API New → In-Progress → To-be-verified in Gamma.
3. Sandbox email contains Atlas credentials, auth, and a Postman collection. Staging host `https://pos-int.urbanpiper.com`, Atlas `https://atlas-pos-int.urbanpiper.com/`, collection linked from the [sandbox page](https://api-docs.urbanpiper.com/downstream/getting-started/environments/sandbox.md). You can build against this before any real restaurant exists. Orders are placed with their Developer Tools inside Atlas, not on Swiggy.
4. Self-validate against a written checklist, then email pos.support@urbanpiper.com to book a testing demo. They can fail you and ask for another demo ([testing and validation](https://api-docs.urbanpiper.com/downstream/integration-certification/testing-and-validation.md)).
5. Submit the certification form (Google Form linked from the [certification page](https://api-docs.urbanpiper.com/downstream/integration-certification/certification.md)). "We generally take about a day or two to provide the sign-off." Production base URL comes with the sign-off. Partner status flips to Active only after they mark the APIs Completed.

No published minimum-outlet promise and no published requirement for a live demo restaurant. The test menu is a "virtual brand" in staging. The certification exercise does require you to implement menu push (master menu, then per-location menu), store toggle, item and option toggle, order relay, status updates, and rider-status handling. A POS that only receives orders and never pushes a menu does not pass the checklist as written.

### 4. Onboarding one outlet

After you are certified, from the same onboarding doc:

- You add the merchant in Gamma. They convert it and send Atlas plus the production key.
- You configure production webhooks, push store records (including platform ids), and push menu, or enter those in Atlas.
- An onboarding manager checks the data, then "the outlet will be sent for mapping to the aggregator." Go-live is communicated after the mapped menu is pushed to the aggregator.

Restaurant-side Swiggy steps ([help article](https://help.urbanpiper.com/ordering-channels/swiggy/integrate-your-swiggy-account-with-urbanpiper.md)): outlet must already exist on Swiggy Merchant and be eligible to take orders. You need the Swiggy outlet id and the outlet URL exactly as listed. Location, menu, hours, prep time, and packaging charges are expected to exist in UrbanPiper first. You submit Request to Go Live with the platform id. "This mapping is carried out offline, with assistance from the Swiggy team." Email confirmation when mapped. "Your outlet is expected to be live within 48 hours." Wrong id or URL delays it.

Zomato help centre: activation "can be completed from Monday to Friday and typically takes up to 48 hours to go live" ([Zomato integration overview](https://help.urbanpiper.com/ordering-channels/zomato/integration-overview), published 2026-04-23).

What the restaurant signs with UrbanPiper is not in these pages. The restaurant must already be a Swiggy/Zomato merchant. Swiggy's own partner video (2023-10-18, Swiggy Partners channel) says a new outlet picks "I have a POS", names the POS partner, and Swiggy then talks to that partner for menu and packaging. That is Swiggy's process, not UrbanPiper's SLA.

**Tablet.** No UrbanPiper page says the Swiggy or Zomato tablet/app stops receiving live orders after mapping, or that both keep receiving them. Their marketing says "no tablets, no double entry" ([partner-with-us](https://www.urbanpiper.com/partner-with-us)). Their Uber Eats help article says the opposite pattern for that channel: the order "appears on your Uber Eats tablet" for accept, and only then is sent to UrbanPiper ([Uber Eats getting started](https://help.urbanpiper.com/ordering-channels/uber-eats/getting-started), 2026-04-23). Do not copy the Uber Eats sentence onto Swiggy. Column stays unknown.

### 5. Compliance and paperwork

Published: there are "signup formalities" before Gamma credentials exist. The text of the agreement, any NDA, any data-processing terms, and any requirement that the POS vendor hold a GSTIN are not in the docs. (<80% on any specific clause.)

Aggregator-side: you do not get a Swiggy login. Mapping is requested by UrbanPiper's onboarding team and done with Swiggy offline. For a POS-enabled restaurant, Swiggy's FAQ says menu revisions are emailed to the POS partner, who raises them with Swiggy. FSSAI and, above the turnover line Swiggy states, GSTIN are the restaurant's problem with Swiggy, not yours ([Partner FAQ](https://partner.swiggy.com/PartnerFAQ)).

### 6. Technical surface

Push, not poll. New orders are a POST webhook ("order placed" / Order Relay) to your URL. You must return 2xx. Connection timeout 3 seconds, read timeout 5 seconds ([testing](https://api-docs.urbanpiper.com/downstream/integration-certification/testing-and-validation.md) and [circuit breaker](https://api-docs.urbanpiper.com/downstream/resources/webhook-circuit-breaker.md)). Non-2xx is retried. The certification page caps retries at 3. The circuit breaker: more than 15 failures in a minute on one biz disables every webhook on that hostname. Disable lasts 1 minute, or 3 minutes if that host has tripped 5 or more times in the past week. When webhooks come back, unsent orders are pushed in one burst, and `order_state` is whatever state UrbanPiper has *now*, which may already be Acknowledged rather than Placed. Email subject when this trips: `Webhooks disabled: {{biz_name}}`.

Idempotency, their words: keep the UrbanPiper order id unique; a retry must not insert the order again. Return your POS id as `order_ref_id` in the relay response.

If you missed relays, `POST /external/api/v1/webhooks/retry/` with event type 18 replays today's failed order relays only. Limit 2 calls per hour. No historical replay ([webhook order retry](https://api-docs.urbanpiper.com/downstream/api/endpoints/order-management/webhook-order-retry-api.md)).

Status you send them, `PUT /external/api/v1/orders/:id/status/`: Acknowledged, Food Ready, Dispatched, Completed, Cancelled. Throttle 100/min, then a 1-minute lockout on 429. Zomato prep time is passed at acknowledge as `extra.prep_time_mins`. Status they send you is a separate webhook. Documented states: Placed, Acknowledged, Food Ready, Dispatched, Completed, Cancelled, and `customer_cancelled` (Zomato, when the customer asks to cancel).

Rider: a rider-status webhook. Certification expects you to show rider name, phone, and current status. The test for that webhook is you injecting the payload with Postman. It is not a live rider.

Swiggy-specific, from the status API and the testing page: if `can_reject_order` is false, a cancel returns HTTP 400 with message "Cancellation of Swiggy orders is not allowed. Callback requested instead." You mark it cancelled locally. Swiggy support calls the store. Direct cancel exists only when `can_reject_order` is true and you set `extra.swiggy_direct_cancellation`. Swiggy constraints also say Swiggy does not send Swiggy's own share of the discount in the relay payload ([Swiggy constraints](https://api-docs.urbanpiper.com/downstream/aggregator-constraints/swiggy.md)).

Zomato-specific: show `delivery_type` of `self` vs `partner` (hybrid logistics). Cancel after accept is allowed until Completed for merchant delivery, and only until Food Ready for Zomato delivery. Customer-cancel webhook carries `timeout_secs`; the sample payload uses 180. That 180 is for accepting or rejecting the *customer's* cancellation, not the new-order accept window ([order status update](https://api-docs.urbanpiper.com/downstream/api/endpoints/order-management/order-status-update.md)).

**Accept window for a new order.** The order-status guide says if acceptance is not passed "within a specified time period, the aggregator may cancel the order." No number of seconds is published for Swiggy or Zomato. Do not invent one. No guess.

**Stock.** `POST /hub/api/v1/items/` with `item_ref_ids` and/or `option_ref_ids`, action `enable` or `disable`, optional `turn_on_at` epoch milliseconds. Async. They say 30 seconds to reflect inside UrbanPiper, and "no time-bound guarantees" for the aggregator. Peak-hour throttle (10:00–16:00 and 19:00–01:00 IST) is 20 requests/min; otherwise 100/min. Payload cap 400 items/options. Callback is per platform and per item can be `success` or `failed`. The documented option-callback example uses `"platform": "swiggy"`. If you disable and never enable, it stays out of stock. Swiggy and Zomato constraint pages both say store on/off and item on/off are supported. They do not separately promise every variant type. (<80% that every Swiggy variant shape accepts option-level off, despite the sample.)

**Catalogue read.** The published POS API index has no "GET the live Swiggy/Zomato menu" endpoint. Catalogue moves the other way: you `Add/Update Menu`, they callback, they publish to the aggregator. Certification requires that push, including categories, items, option groups, options, taxes, charges, and flush/clear semantics. Zomato help: "Once you publish the menu from the UrbanPiper platform", names, prices, taxes, and modifiers update on Zomato. This does not match a v1 that only reads the aggregator menu and never writes it. Whether Atlas can import an existing aggregator menu is not in the POS API docs. (<80% that a read-only mapping mode exists; I found no page for it.)

Swiggy menu caps, same constraints page, both sentences present: "items associated with a store cannot be more than 400" and, later, "a maximum of 1000 items". An item may have at most 4 variant groups. Same option cannot sit on two groups of the same item. Nutritional info is "mandatory" but "as of now" expected inside the item description. Treat the 400-vs-1000 clash as unresolved. (<80% on which cap is enforced.)

**Sandbox fidelity.** Staging plus Developer Tools can mint orders labelled as Swiggy or Zomato, with add-ons, variants, packaging, cash vs prepaid, and future orders. Self-delivery is explicitly "except Swiggy" in the test matrix. Rider events are hand-posted. This is not a Swiggy or Zomato test restaurant. Menu publish to the real aggregator is a production mapping step.

### 7. Lock-in and exit

No public notice period, no public description of what happens to the Swiggy/Zomato mapping when a POS partner leaves, and no public statement that the tablet can be turned back on. Unknown. Do not copy Deliverect's cancellation article onto them. Deliverect's own help centre says its channels are disconnected after cancellation is processed ([help.deliverect.com cancel subscription](https://help.deliverect.com/en/articles/7978942-cancel-a-subscription)); that is a different company.

### 8. Reputation, 2025–2026

Incident write-ups on [isdown.app/status/urbanpiper](https://isdown.app/status/urbanpiper), as indexed (the live page returned a Cloudflare interstitial when fetched directly on 2026-09-22, so this is the indexed text, not a fresh page view):

- 2025-12-16, "Swiggy order issues", about 1 hour: "swiggy Orders are not coming through for multiple businesses."
- 2025-12-24, "Intermittent issue with POS Order Relay", about 1 hour: an intermittent DB connection "caused few orders" not to relay. IsDown calls this the last outage as of its 2026-03-18 check.
- 2025-07-15, "Delay in relaying orders to POS", about 1 hour.
- 2025-07-10, "Delay in order acknowledgement", about 1 hour.

StatusGator, checked 2026-04-30 against UrbanPiper's status page, says it had logged "more than 39 outages" since it started watching on 2025-05-28. That count includes maintenance windows (the same page lists database maintenance of 5–30 minutes). It is not 39 order-loss events. Components listed include Order Ingestion, Generic POS Integrations, and Item/Modifier Availability. No duration-of-pain figure beyond the incidents above.

G2 review text, undated in the snippet retrieved, so not pinned to 2025–2026: a user wrote that support takes 24 to 48 hours by email and that they lose business in that window; another wrote "Frequent technical issues & awfully long duration to have a clear RCA" ([g2.com/products/urbanpiper/reviews](https://www.g2.com/products/urbanpiper/reviews)). No sourced 2025–2026 complaint about a surprise percentage fee. Their public pricing copy says the opposite, which is not the same as a contract.

---

## Wera Merge

Sources: [werafoods.com/merge.php](https://www.werafoods.com/merge.php), [werafoods.com](https://www.werafoods.com/), Tofler company page for CIN U74900MH2015PTC269159 (updated 2026-06-26), LinkedIn company page, IndiaMART listing, a 2021-11-10 post from @WeraFoods, and 2022 posts from the same account soliciting POS companies.

### 1. Commercial model

Merge price is not published. The Merge page says "Contact Us For Free Demo And Pricing." No per-order fee, percentage, setup fee, minimum outlets, or term is stated.

Prices that *are* published are for Wera's own POS, not for Merge. Do not mix them up.

- Homepage: WERA Online POS yearly subscription "₹10,000/- + Taxes".
- IndiaMART: "WERA-PoS @ 833/Month", "1 year Plan", "Swiggy & Zomato integration*" with an asterisk and no footnote. Techjockey shows Wera Cloud POS "₹833".
- Their 2021-11-10 post: cloud POS "INR 9,999/- for first year & INR 6999 from second year". That is five years old and is the POS, not the API.

No guess at a Merge rupee figure.

### 2. Who pays

Not published. The 2022 posts from @WeraFoods address "Restaurant POS software company" and "Restaurant POS organisation" and give a mobile number and sales@werafoods.com / kailash@werafoods.com. That is a vendor-to-vendor pitch. It does not say who signs or who is invoiced.

### 3. Onboarding as a POS vendor

The only published step is "contact us" / book a demo. No form, no certification checklist, no stated timeline, no minimum-outlet promise, and no sandbox URL. Nothing found at a developer subdomain. A 2024-07-11 post on erp.werafoods.com titled as a consumer "order food through Swiggy's API" article is marketing copy, not API documentation, and describes placing orders on the user's behalf. That is not a POS order-relay spec.

### 4. Onboarding an outlet

Not published. Who talks to Swiggy or Zomato, what the restaurant signs, how many days, and whether the tablet stops: all unknown. The Merge page claims orders from Zomato, Swiggy, Uber Eats, Foodpanda, GrabFood, and Deliveroo land on "your existing POS", and that the restaurant can accept or reject from the POS. Foodpanda, Grab, and Deliveroo are not India aggregator coverage. Listing them next to Swiggy is a reason to discount the page, not a reason to believe the integration list. (<80% that those six are live partnerships rather than a keyword list.)

### 5. Compliance

Nothing published: no NDA, no DPA, no GSTIN requirement, no aggregator-approval step. The company itself is real. Tofler: Wera Food Technology Private Limited, incorporated 2015-10-12, CIN U74900MH2015PTC269159, status Active, registered at Acme Industrial Park, Goregaon East, Mumbai 400063, authorised capital ₹2.50 lakh, paid-up ₹2.35 lakh. Directors named there include Kailash Baburao Chavan, which matches the sales mailbox in the 2022 posts. LinkedIn (crawled 2026-03-04): 11–50 employees, 510 followers, specialties include "Zomato order landing on POS" and "Swiggy order landing on POS". Paid-up capital of ₹2.35 lakh does not prove or disprove a Swiggy contract. It does bound how large the firm is.

### 6. Technical surface

No public webhook list, no stock endpoint, no catalogue-read endpoint, no accept-window number, no retry or idempotency rules, no sandbox. Cannot be compared with UrbanPiper on any of these. The Merge page says accept/reject from the POS and that customer and order data are "automatically added" to the POS. That is the whole technical description.

### 7. Lock-in and exit

Not published. Unknown.

### 8. Reputation, 2025–2026

No 2025 or 2026 complaint, outage report, or surprise-fee report from a POS vendor or a restaurant turned up in search. Techjockey shows a 4.2 score "based on 3 reviews" with no review text dated in-range. Absence of complaints is not a clean record. There is almost no public technical surface to have failed in public. (<80% that "no news" means reliable.)

---

## Three questions for the first sales call

Public pages do not answer these. Ask both vendors the same three, and do not accept a verbal "standard".

1. For one Bangalore outlet, who signs the contract, who is invoiced, and what are the rupee numbers: monthly or annual fee, one-time setup, anything per order, minimum outlets, minimum term, and what happens to the fee if the pilot outlet churns in month two.
2. On the day Swiggy mapping goes live, and separately for Zomato, does the aggregator's tablet or partner app stop receiving new live orders at that moment. If we leave you, how many hours to put that tablet back, and who calls Swiggy to do it.
3. Can the first outlet go live by reading the menu already on Swiggy and Zomato and only sending accept, reject, food-ready, and item or variant stock on/off, without us publishing a menu. If yes, what is the new-order accept window in seconds, and does silence auto-cancel on the aggregator.
