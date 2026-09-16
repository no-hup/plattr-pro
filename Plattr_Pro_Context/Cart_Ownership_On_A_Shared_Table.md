# Whose item is it? — ownership on a shared table cart

**Decided 2026-09-16.** Consumer app + backend `cart/` and `orders/`. Governed by
[`AGENTS.md`](../AGENTS.md), not the moonshot contract — these are existing dirs, touched in
their own style with characterization tests first.

## The scene

Eight people at one table in a Koramangala restaurant. They scan the QR code and get one cart:
`restaurants/{id}/carts/{tableId}` — the document id *is* the table id. Asha adds a Margherita.
Bhanu adds a Margherita. They become **one line of quantity 2**, because `findIdenticalItemInCart`
matched on dish plus variants plus add-ons and nothing else. Asha changes her mind and taps
Remove; Bhanu's pizza goes with it and nobody notices until the bill. Then Chetan, still deciding,
taps Place order — and the other six people's half-built list goes to the kitchen and the cart is
deleted.

Without this, every table over about six people is a guessing game, and the restaurant either
cooks food nobody asked for or misses food somebody did.

## What we built

- **`addedBy` on each cart item.** A device id minted once per browser by the guest app and kept
  in local storage. Not an account: the guest app has no login, and `sessionId` belongs to the
  table, not the diner. "This phone" is the most honest answer available.
- **Merging is scoped to one person.** Same dish, same config, different `addedBy` = a different
  line.
- **Removing someone else's item is refused**, and the `menuItemId` fallback lookup only ever
  finds your own line.
- **Place order sends your group.** The rest of the table's items stay in the cart with a
  recalculated total; the cart is deleted only when nothing is left. An order already holds
  `carts[]`, so each person's send is one entry on the table's single order — the grouping the
  kitchen needs already existed.
- **The cart screen shows two sections**: *Yours*, editable, and *Rest of the table*, visible but
  read-only, so nobody orders the same thing twice.

## Decisions

| Call | Why |
|---|---|
| One cart document per table, partitioned by owner — **not** a cart per person | Same behaviour for the diner. A partition inside one document has no stale-cart lifecycle, no expiry, no "who may send the table's order", and leaves the existing transactions that prevent lost writes untouched. Per-user cart documents were the right idea at the wrong price. |
| Device id, **not** a login | A QR guest will not sign in to add a dosa. The device id costs one field and no screens. |
| Device-local cart rejected as the source of truth | A QR web app gets reloaded, backgrounded and tab-killed constantly, so local carts genuinely vanish. It also hides the table's combined list, so three people order water. The phone may hold a draft; the server holds the cart. |
| `addedBy: null` means unowned, and unowned behaves exactly as before | Carts written before today and clients that never send the field keep the old shared-list behaviour. Nothing breaks for a restaurant that is already live. |
| Sending only your group is opt-in on `addedBy` | Every existing caller — the e2e suites, the captain flow — passes nothing and still checks out the whole cart. |
| A retry's fingerprint is computed over the placed group, not the whole cart | Otherwise OF's `requestId` replay would compare against the other diners' leftover items and refuse a legitimate retry as "a different cart". |

## Out of scope, deliberately

- **"Order for everyone"** — one button that sends every group as a single round. Build it when a
  real table asks; the split already supports it.
- **Per-person bill splitting.** `addedBy` is on the line and survives into the order, so the data
  is there, but nothing reads it at billing yet.
- **Identity across devices.** Clear your browser and you are a new diner. Correct for a QR guest.
- **`addedBy` as a security boundary.** It is not one. A crafted request can claim any id. It stops
  accidents between people sitting at the same table, which is the actual problem.

## Where it lives

| Thing | File |
|---|---|
| The field, and merging scoped to one person | [`cart/addItemToCartBoilerplateHelper.js`](../backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js) |
| Endpoint passes the owner through | [`cart/addItemToCart.js`](../backend/src-plattr/functions/cart/addItemToCart.js) |
| Nobody deletes someone else's food | [`cart/removeItemFromCart.js`](../backend/src-plattr/functions/cart/removeItemFromCart.js) |
| Place order sends your group; the rest stays | [`orders/createOrUpdateOrder.js`](../backend/src-plattr/functions/orders/createOrUpdateOrder.js) |
| Checkout carries the owner | [`cart/checkoutCart.js`](../backend/src-plattr/functions/cart/checkoutCart.js) |
| The device id | [`networking/device_id.dart`](../frontend/flutter_boilerplate/lib/networking/device_id.dart) |
| One interceptor stamps it on the three cart writes | [`networking/dio_client.dart`](../frontend/flutter_boilerplate/lib/networking/dio_client.dart) |
| Yours / Rest of the table | [`cart_listing/cart_page.dart`](../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart) |

## Tests

| What | File |
|---|---|
| Merging, and the `addedBy` field itself | [`test/unit/cart/cartOwnership.test.js`](../backend/src-plattr/functions/test/unit/cart/cartOwnership.test.js) |
| Removal refuses someone else's item | [`test/unit/cart/removeItemFromCart.test.js`](../backend/src-plattr/functions/test/unit/cart/removeItemFromCart.test.js) — `describe('ownership')` |
| Partial checkout | [`test/unit/orders/createOrUpdateOrder.characterization.test.js`](../backend/src-plattr/functions/test/unit/orders/createOrUpdateOrder.characterization.test.js) — last `describe` |
| Device id and the interceptor | [`test/cart_device_id_test.dart`](../frontend/flutter_boilerplate/test/cart_device_id_test.dart) |
| The screen's split | [`test/cart_owner_split_test.dart`](../frontend/flutter_boilerplate/test/cart_owner_split_test.dart) |
| A real table, end to end: two phones, simultaneous taps, cancel, handover | [`test/e2e/suites/multi-diner.js`](../backend/src-plattr/functions/test/e2e/suites/multi-diner.js) |
| Offers under a split bill | [`test/e2e/suites/multi-diner-offers.js`](../backend/src-plattr/functions/test/e2e/suites/multi-diner-offers.js) |

## Verified against the emulator

Run on 2026-09-17, emulator slot 3, real Firestore transactions.

| Suite | Result |
| --- | --- |
| [`test/e2e/suites/multi-diner.js`](../backend/src-plattr/functions/test/e2e/suites/multi-diner.js) — 14 scenarios | 52 pass, 0 fail |
| [`test/e2e/suites/multi-diner-offers.js`](../backend/src-plattr/functions/test/e2e/suites/multi-diner-offers.js) — 5 scenarios | 27 pass, 0 fail |
| Full e2e set, 20 suites | 476 pass, 12 fail |
| Full e2e set with both new suites removed | 397 pass, 12 fail — **the same 12** |

The 12 are pre-existing and belong to nobody: 9 are TD-007, the other three are now TD-024. The
like-for-like run is the proof that none of them is ours.

Two phones on one table is the case a unit test cannot prove, and it is now driven for real: taps
landing in the same instant, a double tap on one `requestId`, a dish going out of stock under one
diner while another's round still has to leave, a round cancelled after the kitchen plated one of
its dishes, and the table handed to the next party.

### The offer question, settled

Splitting a bill by owner changes what the offer engine is handed — a round at a time instead of the
whole table's cart. That was the one thing this design could plausibly have broken, so it was tested
before it was believed:

- An offer needing **two** of something still fires when the two belong to **different people**.
  Asha's burger and Bhanu's burger, placed minutes apart, still buy the table one free burger.
- The offer is **replaced on each checkout, never stacked**. Asha's lone burger takes a ₹100 capped
  offer; when Bhanu's lands, BOGO's ₹180 replaces it. The bill is 180, not 360 − 100 − 180.
- **A split bill costs exactly what the same food costs in one tap** — ₹180 either way. This is the
  assertion that matters, and it has its own control scenario on its own table.
- Cancel a round and the offer **recomputes down**: with Bhanu's burger voided, BOGO stops
  qualifying and the bill falls back to one burger's capped offer.
- The **leftover cart carries no offer discount**. Offers live on the bill, not on the cart, and
  re-pricing the lines left behind does not invent one.

This holds because `buildOrderPriceInfo` evaluates every live round on the order together and
recomputes from scratch at each checkout. It was true before this change; what is new is that it is
now proven under a split bill.

## Still not verified

- **The e2e suites were never proven red.** Proving them means briefly breaking
  [`orders/createOrUpdateOrder.js`](../backend/src-plattr/functions/orders/createOrUpdateOrder.js),
  which the other agents' emulators hot-reload off the same source tree, so it would have broken
  their runs. The same logic is red-proven at unit level. Do it when the machine is quiet.
- **No browser check** on the two-group cart screen, which is a user-visible change.
- **Nothing is committed.**
