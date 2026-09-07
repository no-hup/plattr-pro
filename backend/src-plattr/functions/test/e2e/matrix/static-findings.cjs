/**
 * static-findings.cjs — issues found by READING the code during the pre-launch
 * audit, before any test ran. They are seeded as `unconfirmed`; a live scenario
 * that reproduces one re-reports it as `confirmed` and the dedupe upgrades it.
 *
 * Anything still `unconfirmed` after a full run is either not reachable through
 * the public API or needs a scenario nobody has written yet — both worth knowing.
 */
'use strict';
const F = require('../../findings.cjs');

const STATIC = [
  // ── Lifecycle / concurrency ────────────────────────────────────────────────
  // ── Added after the 2026-06-05-goodbye merge (order.items went per-unit) ───
  {
    title: 'Variant and addon prices are repeated next to an all-inclusive item price',
    severity: 'MEDIUM', area: 'pricing', endpoint: 'order-getOrder',
    file: 'orders/getOrder.js:211-215, orders/serverGetOrderDetails.js:124-128',
    detail: 'items[].price is now per-unit AND all-inclusive, but items[].variants[] and items[].addons[] still ship their own per-unit priceInfo beside it. The same money is in the response twice. No client sums them today — the consumer renders customisation names only, and the waiter/kitchen/admin read paths are price-blind here — so this is a trap rather than a live defect. On res_meghana it turns a correct 1860 line into 2760. Either drop the sibling prices or document them as display-only; the matrix asserts that the additive form does NOT reconcile, so a regression to the base-only basis is caught.',
  },
  {
    title: 'One order can hold items priced on two different bases across a deploy',
    severity: 'HIGH', area: 'pricing', endpoint: 'order-getOrder',
    file: 'orders/createOrUpdateOrder.js normalizeCartItemsForOrder / updateExistingOrder',
    detail: 'ACCEPTED-TRANSITIONAL — reviewed and deliberately not fixed before go-live. updateExistingOrder APPENDS newly normalised items to order.items and never re-normalises what is already there, and no field records which price basis an entry used. items[].price changed basis twice on 2026-09-07 (line total, then base-item-only per-unit, now per-unit all-inclusive), so an order left open across such a deploy mixes them and the flat item list stops adding up. REPRODUCED: the multicart_3 fixture, captured across an emulator reload, held mi_chicken_bir at 320 (base-only) beside its own cart snapshot at 620 — short by exactly the 260 variant + 40 addon. Items with no variants or addons are identical under both bases, so it only shows on customised lines. WHY IT IS ACCEPTED: order.items is display-only — every total, including the COMPLETED recompute, is derived from carts[], confirmed by three independent reader inventories — and this is the first production deploy, so no live order can straddle the basis change. OPERATIONAL RULE: drain open orders, or wait for them to reach COMPLETED, before any future deploy that changes the order.items price basis. A code fix is NOT small: normalizeCartItemsForOrder stamps a fresh status and checkoutTime, so re-normalising existing items would reset SERVED ones.',
    status: 'confirmed'
  },
  {
    title: 'The consumer prices an order line without its variants and addons',
    severity: 'HIGH', area: 'pricing', endpoint: 'order-getOrder',
    file: 'flutter_boilerplate/lib/pages/checkout_order_flow/order_listing_page.dart:542',
    detail: 'items[].price is the base component only — a Chicken Dum Biryani with a 260 variant and a 40 addon is published at 320 while contributing 620 per unit. The response is still sufficient: variants[] and addons[] carry their own per-unit priceInfo and the matrix confirms (price + variants + addons) x quantity rebuilds the order total exactly. But OrderItemTile renders `item.price * item.quantity` and only lists the customisation NAMES, so at quantity 3 it shows 960 for a line the customer is charged 1860 for. The bill total shown below it is correct, so the itemisation visibly fails to add up.'
  },
  {
    title: 'The waiter table list crashes on a table with no capacity',
    severity: 'HIGH', area: 'contract', endpoint: 'server-getTables',
    file: 'server/tables_fetch.js:61 vs platter_server .../tables_home/models/table_models.g.dart',
    detail: 'The backend deliberately emits `capacity: tableData.capacity || null`, so a table doc missing capacity (or holding 0) sends an explicit null. TableModel is $checkKeys-guarded with capacity in both requiredKeys and disallowNullValues and then casts `(json[\'capacity\'] as num).toInt()`. One such table throws DisallowedNullValueException and takes down the whole table list, which is the waiter app home screen. The MockData7 seed gives all 52 tables a capacity, so this cannot reproduce locally — it is a production-data risk per the change-impact checklist.',
  },

  {
    title: 'markCartAsServed skips the fulfillment transition table',
    severity: 'HIGH', area: 'lifecycle', endpoint: 'order-markCartAsServed',
    file: 'orders/markCartAsServed.js:84-95',
    detail: 'Only rejects CANCELLED/RETURNED and short-circuits on already-SERVED. A waiter can move a cart PENDING to SERVED, skipping PREPARING and READY. The kitchen\'s later PENDING to READY call then fails as an invalid SERVED to READY transition, so the ticket is stuck.',
  },
  {
    title: 'Checkout is not atomic end to end',
    severity: 'CRITICAL', area: 'concurrency', endpoint: 'cart-checkoutCart',
    file: 'cart/checkoutCart.js',
    detail: 'The cart is read with a plain get() outside any transaction, createOrUpdateOrder runs its own transaction, then the cart is deleted separately. Two simultaneous checkouts on one table both read the same cart and produce duplicate cart snapshots. An addItemToCart landing between the read and the delete is silently lost. A clearCart failure is swallowed and checkout still returns success, leaving a live cart that can be checked out again.',
  },
  {
    title: 'Orders group by tableId only, never sessionId',
    severity: 'HIGH', area: 'lifecycle', endpoint: 'cart-checkoutCart',
    file: 'orders/createOrUpdateOrder.js:89-113',
    detail: 'The existing-order lookup queries by tableId and .find()s the first IN_PROGRESS or PENDING doc with no orderBy. An abandoned order from a previous party at the same table absorbs the new party\'s cart, and updateExistingOrder overwrites order.sessionId with the new session. With two live orders on a table the choice is non-deterministic.',
  },
  {
    title: 'COMPLETED recompute drops charges from the bill',
    severity: 'CRITICAL', area: 'pricing', endpoint: 'order-updateOrderStatus',
    file: 'orders/updateOrderStatus.js:96',
    detail: 'The COMPLETED path rebuilds OrderPriceInfo from scratch but never passes charges or chargesTotal, so service charge and GST vanish from the final bill at the exact moment the customer pays. Checkout and completion are two independent implementations of the same total.',
  },
  {
    title: 'Orders never auto-complete when all carts are served',
    severity: 'MEDIUM', area: 'lifecycle', endpoint: 'cart-updateCartStatus',
    file: 'cart/updateCartStatus.js:161-176',
    detail: 'allActiveCartsServed is computed and then discarded behind a TODO. Order completion is only ever a manual waiter action, so an order whose carts are all SERVED stays IN_PROGRESS and keeps appearing in active lists and polling responses.',
  },
  {
    title: 'Second waiter tapping the same item gets an error',
    severity: 'MEDIUM', area: 'concurrency', endpoint: 'server-markItemServed',
    file: 'orders/serverMarkItemServed.js:88-94',
    detail: 'SERVED to SERVED is not in the transition table, so the second of two waiters marking the same item sees an invalid-transition error rather than an idempotent no-op. markCartAsServed is idempotent here, so the two staff endpoints disagree.',
  },
  {
    title: 'Kitchen cart status does not cascade to items',
    severity: 'HIGH', area: 'lifecycle', endpoint: 'cart-updateCartStatus',
    file: 'cart/updateCartStatus.js',
    detail: 'Kitchen marking a cart READY leaves every carts[].items[].status at PENDING, but server-markItemServed requires an item to be READY first. The two staff flows cannot be used together without the Firestore seam the coverage suite uses.',
    status: 'known',
  },
  {
    title: 'Multi-user table has no per-user cart attribution',
    severity: 'HIGH', area: 'lifecycle', endpoint: 'cart-addItemToCart',
    file: 'cart/addItemToCartBoilerplateHelper.js:35',
    detail: 'There is one cart doc per table (carts/{tableId}) with no userId or phoneNumber on the cart or its items, and checkoutCart hardcodes userId to "system". cart.sessionId is written once at creation and never refreshed, so a cart started by customer A and checked out by B still carries A\'s session. Split-bill and per-person totals are not representable in the current schema.',
  },
  {
    title: 'Secondary customer OTP skips the expiry check',
    severity: 'MEDIUM', area: 'lifecycle', endpoint: 'table-validateOTP',
    file: 'table/table.js:410',
    detail: 'On an already-active table the secondary-join path compares the OTP code but deliberately does not check expiry, so an expired OTP still admits a second customer to the session.',
  },
  {
    title: 'paymentStatus partially_paid is never written or read',
    severity: 'LOW', area: 'lifecycle', file: 'orders/orderConstants.js:14',
    detail: 'The enum defines partially_paid but the only writes are UNPAID at creation and PAID at COMPLETED. Split or partial payment is not implemented anywhere.',
  },
  // ── Pricing / offers ───────────────────────────────────────────────────────
  {
    title: 'calculateCartValue sanitises quantity then never uses it',
    severity: 'INFO', area: 'pricing', file: 'cart/calculateCartValue.js:151-168',
    detail: 'The quantity validation block is dead: totals accumulate the stored per-line priceInfo directly. This is correct today only because buildCartItemPriceInfoForQuantity bakes quantity into every stored field. Any future caller that stores a unit priceInfo would silently undercharge, with the dead validation making it look handled.',
  },
  {
    title: 'Order totalDiscount is a meaningless average across carts',
    severity: 'LOW', area: 'pricing', file: 'orders/createOrUpdateOrder.js:437',
    detail: 'calculateTotalPriceInfo divides the summed discount percentage by the number of carts, so a multi-cart order reports an arithmetic mean of percentages rather than an effective discount. Any UI showing this number shows nonsense.',
  },
  {
    title: 'ORDER-scope percentage offers change their discount base when exclusions exist',
    severity: 'HIGH', area: 'offers', file: 'offers/strategies/PercentageStrategy.js:48-53',
    detail: 'With no exclusions the discount is taken on cartTotal, which is the pre-item-discount basePrice. With exclusions it is taken on the sum of eligible finalPrice, which is post-item-discount. Adding an exclusion to an offer therefore silently changes what every other item is discounted against. No seed exercises the exclusions branch.',
  },
  {
    title: 'userHistory.minOrderCount counts session orders, not lifetime orders',
    severity: 'MEDIUM', area: 'offers', file: 'offers/evaluateOrderOffers.js:34-40',
    detail: 'getSessionData queries orders by sessionId and returns the same number as both totalOrderCount and sessionOrderCount, so a "loyalty, 3+ previous orders" offer really means "3 orders in this sitting". activeSessionOrderCount additionally compares against count - 1, an off-by-one.',
  },
  {
    title: 'FLAT offers default maxDiscount to their own value',
    severity: 'LOW', area: 'offers', file: 'offers/strategies/FlatStrategy.js:34',
    detail: 'PERCENTAGE and BOGO default maxDiscount to Infinity but FLAT defaults it to the offer value, so the two families respond differently to an unset cap. Easy to misconfigure when authoring offers.',
  },
  {
    title: 'Offer priority tie-break is unreachable and ends in Firestore doc order',
    severity: 'LOW', area: 'offers', file: 'offers/evaluateOrderOffers.js:102-110',
    detail: 'No seeded scenario produces two offers with an identical discountAmount, so the priority tie-break has never run. If two offers do tie and both lack a priority, the winner is whatever order Firestore returned, which is not stable.',
  },
  {
    title: 'Cancelled-item exclusion is case-sensitive and bypasses the status normaliser',
    severity: 'MEDIUM', area: 'pricing', file: 'cart/calculateCartValue.js:155',
    detail: 'calculateCartValue compares item.status === FULFILLMENT_STATUS.CANCELLED on the raw stored value, rather than going through utils/statusUtils.js mapCartStatus, which exists precisely to trim and upper-case legacy status strings. Verified: a line stored as "CANCELLED" is correctly excluded, but "cancelled" or "Cancelled" is billed in full. All current writers use the uppercase constant, so this is latent rather than live, but session and cart documents created by older code versions are explicitly not trusted elsewhere in this codebase, and a single lower-cased status silently charges a customer for food that was cancelled. One-line fix: normalise through mapCartStatus before comparing.',
    expected: 'any casing of "cancelled" excluded from the total',
    actual: 'only the exact string CANCELLED is excluded; other casings are charged',
    status: 'confirmed',
  },
  {
    title: 'Two unit tests assert cancelled-item exclusion with the wrong casing',
    severity: 'LOW', area: 'pricing',
    file: 'test/unit/cart/calculateCartValue.test.js:118, test/unit/cart/addItemToCart.test.js:410',
    detail: 'Both tests build a cart line with status "cancelled" in lower case and expect it to be excluded. The product only ever writes the uppercase constant, so these two have failed continuously and were previously recorded as evidence of a real over-charging bug. They are test defects, not product defects: with the uppercase value the exclusion works. Fix the casing in the fixtures, or normalise in calculateCartValue and keep the tests as the reason why.',
    expected: 'the suite green, or the test asserting a case it can actually produce',
    actual: '2 permanently failing tests that misattribute a product bug',
    status: 'confirmed',
  },
  // ── Config / architecture ──────────────────────────────────────────────────
  {
    title: 'No multi-kitchen or bar-vs-kitchen routing exists',
    severity: 'INFO', area: 'config', endpoint: 'order-getActiveCartsForKitchen',
    file: 'kitchen/chef.js',
    detail: 'Menu items carry no station id, getActiveCartsForKitchen returns every active cart for the restaurant with no filter, and the kitchens subcollection the seeds write is never read by any code path. The only trace is an orphaned updateChef that hardcodes restaurant rest001. Seeding an "inactive kitchen" edge case asserts something no code can observe. Out of scope for launch by owner decision; recorded so it is not mistaken for working.',
    status: 'confirmed',
  },
  {
    title: 'Feature flags are global, not per-restaurant',
    severity: 'HIGH', area: 'config', file: 'singleton/FeatureFlags.js',
    detail: 'Overrides live in one _system/featureFlagOverrides doc shared by every restaurant, so two restaurants cannot differ on OTP-at-scan or multi-user. adminApp/settings.js writes a per-restaurant featureFlags block that nothing reads, and spells the key isOtpMandatoryAtScan while the code reads isOtpManadatoryAtScan. Three unrelated namespaces are called featureFlags.',
  },
  {
    title: 'Seed loader silently drops _system feature flag overrides',
    severity: 'MEDIUM', area: 'config', file: 'mock/importMockData5.js:140',
    detail: 'The importer only iterates restaurants and customers, so the _system.featureFlagOverrides block that MockData6 and MockData7 ship is never written. Every flag scenario needs an out-of-band Firestore write or it silently tests the defaults.',
  },
  {
    title: 'uiFlags cache lets pollers disagree for five minutes',
    severity: 'LOW', area: 'config', endpoint: 'order-getActiveOrdersForRestaurant',
    file: 'orders/getActiveOrdersForRestaurant.js:238-265',
    detail: 'The 5-minute uiFlags cache is a module-level Map, so with maxInstances 10 different function instances serve different flag values to different polling clients until every instance expires.',
  },
  {
    title: 'order-getOrder and server-getOrderDetails disagree on response shape',
    severity: 'MEDIUM', area: 'contract', endpoint: 'order-getOrder',
    file: 'orders/getOrder.js vs orders/serverGetOrderDetails.js',
    detail: 'order-getOrder returns the order fields flat under data (data.orderStatus, data.carts), while server-getOrderDetails nests them under data.order. Every caller has to try both shapes, which is exactly what goalline.mjs already does with a fallback chain. A model written against one shape silently reads undefined from the other, and because both responses report status success the mistake looks like missing data rather than a wrong path.',
    expected: 'one envelope shape for a single order across endpoints',
    actual: 'data.<field> from order-getOrder, data.order.<field> from server-getOrderDetails',
    status: 'confirmed',
  },
  // ── Frontend contract ──────────────────────────────────────────────────────
  {
    title: 'Consumer app still calls the removed offers-applyOffer endpoint',
    severity: 'MEDIUM', area: 'frontend', endpoint: 'offers-applyOffer',
    file: 'flutter_boilerplate/lib/singletonGods/api_constants.dart',
    detail: 'Offers V2 removed manual offer application in favour of auto-apply at checkout, but the consumer app still declares and calls the endpoint. Any code path reaching it gets a not-found.',
  },
  {
    title: 'Server app detail models throw on a missing field',
    severity: 'HIGH', area: 'contract', endpoint: 'server-getOrderDetails',
    file: 'platter_server/lib/pages/orders_home/models/*.g.dart',
    detail: 'order_detail_response, order_item_detail, variant_detail and table_models use non-nullable casts with no defaults. variant_detail is the sharpest: it requires isMandatory and respectParentDiscount, which come straight off the variant doc with no backend default, so a variant seeded without them crashes the order-detail screen. table_models requires capacity, which is optional in most seeds. The server app is the only one of the three that can hard-crash on a backend field change.',
  },
  {
    title: 'Consumer model casts a totalAmount field the backend never sends',
    severity: 'MEDIUM', area: 'contract',
    file: 'flutter_boilerplate/lib/pages/table_verification/models/unified_models.g.dart:290',
    detail: 'The model does a non-null cast of totalAmount, but no backend endpoint emits that name: server-getOrderDetails sends total and order-getOrder sends priceInfo. Whatever screen uses this model throws the moment it is fed a real response.',
  },
  {
    title: 'Kitchen tickets read item names from one source only',
    severity: 'MEDIUM', area: 'contract', endpoint: 'order-getActiveCartsForKitchen',
    file: 'platter_kitchen/lib/core/kitchen_repository.dart:222-234',
    detail: 'Names are read only from item.menuItem.meta.name. That works because the endpoint serves raw cart items, but the normalized order.items[] use a flat name field. If the endpoint ever switches source every kitchen ticket silently renders "Unknown Item" rather than failing loudly.',
  },
  {
    title: 'The kitchen app does not compile: json_serializable is missing',
    severity: 'CRITICAL', area: 'frontend',
    file: 'frontend/src-platter-apps/apps/platter_kitchen/pubspec.yaml',
    detail: 'active_order_models.dart declares `part active_order_models.g.dart` and fromJson factories, but the generated file does not exist, is not committed, and cannot be produced because json_serializable is absent from dev_dependencies (the app has json_annotation and freezed only). flutter analyze reports 7 errors and build_runner emits no .g.dart, so the kitchen app cannot be built or tested at all as the repo stands. Every other app that uses freezed JSON has json_serializable; platter_admin is missing it too but does not currently need it. Fix is one line: add json_serializable to the kitchen dev_dependencies and run build_runner.',
    expected: 'flutter analyze clean, app builds',
    actual: '7 compile errors, active_order_models.g.dart never generated',
    status: 'confirmed',
  },
  {
    title: 'The waiter app cannot resolve dependencies on current stable Flutter',
    severity: 'HIGH', area: 'frontend',
    file: 'frontend/src-platter-apps/apps/platter_server/pubspec.yaml',
    detail: 'On Flutter 3.47.2 (current stable) `flutter pub get` fails version solving: envied_generator ^0.5.1 pins analyzer <7.0.0, which cannot coexist with the test/matcher versions this SDK forces through flutter_test. --enforce-lockfile fails the same way. The repo pins no Flutter version (no fvm config, no .tool-versions), so which SDK is correct is unwritten, and a fresh machine or CI on stable cannot build or test the waiter app. Either pin the Flutter version the team actually uses, or move envied_generator to a version compatible with current stable.',
    expected: 'flutter pub get succeeds on a documented SDK version',
    actual: 'version solving failed; no SDK pin exists in the repo',
    status: 'confirmed',
  },
  {
    title: 'The only consumer fixture test self-skips and the kitchen app has none',
    severity: 'MEDIUM', area: 'contract',
    file: 'flutter_boilerplate/test/cart_contract_check_test.dart',
    detail: 'cart_contract_check_test reads fixtures from a CONTRACT_DIR env var that nothing sets, so it emits a passing placeholder and tests nothing. platter_kitchen has only the stock counter-app widget test. No captured backend response is checked in anywhere on the frontend.',
  },
];

function seed() {
  for (const f of STATIC) {
    F.report({ ...f, status: f.status || 'unconfirmed', scenario: null });
  }
  return STATIC.length;
}

module.exports = { seed, STATIC };

if (require.main === module) {
  F.reset();
  console.log(`seeded ${seed()} static findings`);
  const list = F.render();
  console.log(`rendered ${list.length} findings -> test/e2e/results/FINDINGS.md`);
}
