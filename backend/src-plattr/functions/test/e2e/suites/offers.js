/**
 * Suite: offers — Offers V2, end to end, through a real checkout.
 *
 * There is no `applyOffer` endpoint any more. An offer is chosen by the server at checkout:
 * `createOrUpdateOrder` → `buildOrderPriceInfo` → `evaluateAndPickBestOffer`, and the winner is
 * written onto the order as `appliedOffer` (id, title, type, scope, discountAmount, appliedItems).
 * So the only honest way to test an offer is to order food and read the order back.
 *
 * The old `offers` and `offer-pricing` suites called the removed endpoint and had been gutted to
 * empty braces; they reported a fake pass each. This file replaces both.
 *
 * Runs on `res_e2e_offer_configs`, which carries all nine seeded offers, and on tables
 * `table_clean_1,2,3,5,6,7` (4 is seeded `disabled` on purpose) — no other suite touches that restaurant, so each scenario gets its own
 * session, its own cart and its own order.
 *
 * ── Offer selection, which is what makes the expected values below computable ──
 * Every active offer is evaluated against the whole order. The highest discount wins; a tie falls
 * back to `offer.priority`, and no seeded offer sets one (TD-020). So each cart below is chosen to
 * have exactly ONE winner, by a clear margin.
 *
 * Two arithmetic facts that are easy to get wrong:
 *   - ORDER-scope offers take their percentage off the cart's BASE price (pre item-discount);
 *     CATEGORY and ITEM scope take it off each eligible line's FINAL price.
 *   - An offer lands before charges. `priceInfo.finalPrice` is the post-offer total; the 7.5 %
 *     service charge and the −5 % global discount are computed on that and reported separately.
 *
 * ── Seeded menu (res_e2e_offer_configs) ──
 *   Burger  cat_food/sub_burger   base 200, 10 % off → 180   (Regular variant adds 0)
 *   Pizza   cat_food/sub_pizza    base 500, 10 % off → 450   (Medium + Thin add 0)
 *   Tiramisu cat_food/sub_dessert base 200, no discount → 200
 *   Whiskey cat_bar/sub_whiskey   base 500, no discount → 500
 *   Beer is seeded OUT OF STOCK, so no scenario can use it.
 */
import { call } from '../lib/api.js';
import { customerLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const { RESTAURANT_OFFER_CONFIGS: RID, TABLE_OTP, ITEMS, VARIANTS, OFFERS } = config;

const REG   = { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id };
const PLAIN = {
  [VARIANTS.PIZZA_SIZE.id]:  VARIANTS.PIZZA_SIZE.options.MEDIUM.id,
  [VARIANTS.PIZZA_CRUST.id]: VARIANTS.PIZZA_CRUST.options.THIN.id,
};

export default async function offersSuite() {
  const results = { name: 'offers', pass: 0, fail: 0, tests: [] };
  const check = (pass, message, actual) => {
    results.tests.push({ pass, message, actual: pass ? undefined : actual });
    pass ? results.pass++ : results.fail++;
  };

  /**
   * One scenario: fresh session on its own table, add every line, check out, read the order back.
   * Returns { appliedOffer, priceInfo } or throws with a message naming the step that failed.
   */
  async function orderOn(tableId, lines) {
    const sessionId = await customerLogin(RID, tableId, TABLE_OTP, config.CUSTOMER_PHONE, config.CUSTOMER_NAME);
    for (const l of lines) {
      const add = await call('cart-addItemToCart', {
        restaurantId: RID, tableId, sessionId,
        menuItemId: l.id, quantity: l.qty,
        ...(l.variants ? { selectedVariants: l.variants } : {}),
      });
      if (add.status !== 'success') throw new Error(`addItemToCart(${l.id}) → ${add.message || JSON.stringify(add)}`);
    }
    const co = await call('cart-checkoutCart', { restaurantId: RID, tableId, sessionId });
    if (co.status !== 'success') throw new Error(`checkoutCart → ${co.message || JSON.stringify(co)}`);
    const orderId = co.data?.orderId;
    if (!orderId) throw new Error(`checkoutCart returned no orderId: ${JSON.stringify(co)}`);
    const got = await call('order-getOrder', { restaurantId: RID, orderId, sessionId });
    if (got.status !== 'success') throw new Error(`getOrder → ${got.message || JSON.stringify(got)}`);
    return { offer: got.data?.appliedOffer, price: got.data?.priceInfo, orderId };
  }

  async function scenario(label, tableId, lines, assertions) {
    try {
      assertions(await orderOn(tableId, lines));
    } catch (e) {
      check(false, `${label}: setup failed — ${e.message}`);
    }
  }

  // ── OF-1 · BOGO, ITEM scope · two burgers, the second one free ──────────────────────
  // base 200×2 = 400, final 180×2 = 360. Unit price 360/2 = 180, buy 1 get 1 → 180 off.
  // Rivals: 15 % food = 54; complex 25 % of 400 = 100; cap offer = 100; first-time 20 % = 80.
  await scenario('OF-1', config.TABLE_CLEAN_1, [{ id: ITEMS.BURGER.id, qty: 2, variants: REG }], ({ offer, price }) => {
    check(offer?.id === OFFERS.BOGO_BURGER.id, 'OF-1 two burgers → BOGO wins over every percentage offer', offer);
    check(offer?.discountAmount === 180 && price?.offerDiscount === 180,
      'OF-1 the free burger is worth its post-discount unit price, ₹180 — not its ₹200 menu price', { offer, price });
    check(price?.finalPrice === 180, 'OF-1 pay ₹360 − ₹180 = ₹180', price);
    const it = offer?.appliedItems?.[0];
    check(offer?.appliedItems?.length === 1 && it?.menuItemId === ITEMS.BURGER.id && !!it?.cartItemId
      && it?.discountAmount === 180 && it?.discountedPrice === 0,
      'OF-1 BOGO names the cart item it freed — this breakdown is what TD-016 bills against', offer?.appliedItems);
    check(price?.chargesTotal === 4.5,
      'OF-1 charges land on the post-offer ₹180: 7.5 % service ₹13.50 − 5 % global ₹9 = ₹4.50', price);
  });

  // ── OF-2 · PERCENTAGE, CATEGORY scope, capped · ten tiramisu ────────────────────────
  // 50 % of ₹2000 = ₹1000, but the offer caps at ₹500, and the cap scales the line breakdown too.
  // Rivals: 15 % food = 300 (its own cap); first-time 20 % of 2000 = 400 → capped 200; cap offer 100.
  await scenario('OF-2', config.TABLE_CLEAN_2, [{ id: ITEMS.TIRAMISU.id, qty: 10 }], ({ offer, price }) => {
    check(offer?.id === OFFERS.DESSERT_50.id, 'OF-2 ten desserts → the dessert offer wins', offer);
    check(offer?.discountAmount === 500 && price?.offerDiscount === 500,
      'OF-2 50 % of ₹2000 is ₹1000, and maxDiscount holds it to ₹500', { offer, price });
    check(price?.finalPrice === 1500, 'OF-2 pay ₹2000 − ₹500 = ₹1500', price);
    check(offer?.appliedItems?.[0]?.discountAmount === 500 && offer?.appliedItems?.[0]?.discountedPrice === 1500,
      'OF-2 the cap scales the line breakdown down with it, so the parts still sum to the whole', offer?.appliedItems);
  });

  // ── OF-3 · PERCENTAGE, ORDER scope · one burger ─────────────────────────────────────
  // base 200, final 180. Cap offer: 50 % of 200 = 100, capped at 100 → ₹100, and the discount is
  // then held to the bill (min(100, 180)). Rivals: complex 25 % of 200 = 50; 15 % food = 27.
  // The bar's flat ₹100 needs a bar item, and there is none.
  await scenario('OF-3', config.TABLE_CLEAN_3, [{ id: ITEMS.BURGER.id, qty: 1, variants: REG }], ({ offer, price }) => {
    check(offer?.id === OFFERS.MAXDISCOUNT_CAP.id, 'OF-3 one burger → the ₹100-capped order offer wins', offer);
    check(offer?.discountAmount === 100 && price?.finalPrice === 80, 'OF-3 pay ₹180 − ₹100 = ₹80', { offer, price });
    check(offer?.scope === 'ORDER' && Array.isArray(offer?.appliedItems) && offer.appliedItems.length === 0,
      'OF-3 an ORDER offer ships NO itemised breakdown by design — TD-016 reads that as "spread across the bill"', offer);
  });

  // ── OF-4 · conditions.requiredItems · burger + tiramisu + whiskey ───────────────────
  // base 200+200+500 = 900, final 180+200+500 = 880. The complex offer needs a burger in the cart:
  // 25 % of base 900 = ₹225, cap 500. Rivals: first-time 20 % of 900 = 180; dessert 100; bar flat 100.
  const FOUR = [
    { id: ITEMS.BURGER.id, qty: 1, variants: REG },
    { id: ITEMS.TIRAMISU.id, qty: 1 },
    { id: ITEMS.WHISKEY.id, qty: 1 },
  ];
  await scenario('OF-4', config.TABLE_CLEAN_7, FOUR, ({ offer, price }) => {
    check(offer?.id === OFFERS.COMPLEX.id, 'OF-4 the burger the offer requires is in the cart, so it qualifies', offer);
    check(offer?.discountAmount === 225 && price?.finalPrice === 655,
      'OF-4 an ORDER percentage is taken off the ₹900 BASE, not the ₹880 discounted total: ₹225 off → ₹655', { offer, price });
  });

  // ── OF-5 · the same cart minus the required burger ──────────────────────────────────
  // base 700, final 700. Complex drops out. First-time 20 % of 700 = ₹140 (cap 200) wins over
  // dessert 100, bar flat 100 and the ₹100 cap offer. The expired 30 % would have been ₹210.
  await scenario('OF-5', config.TABLE_CLEAN_5, FOUR.slice(1), ({ offer, price }) => {
    check(offer?.id !== OFFERS.COMPLEX.id,
      'OF-5 take the burger away and requiredItems locks the offer out — the gate is real', offer);
    check(offer?.id !== OFFERS.EXPIRED.id && offer?.discountAmount !== 210,
      'OF-5 the expired offer would have beaten every rival at ₹210, and it never fires', offer);
    check(offer?.id === OFFERS.FIRST_TIME_20.id && offer?.discountAmount === 140 && price?.finalPrice === 560,
      'OF-5 20 % of ₹700 = ₹140 wins → pay ₹560', { offer, price });
  });

  // ── OF-6 · PERCENTAGE, CATEGORY scope across two lines · four pizzas + a tiramisu ────
  // base 4×500 + 200 = 2200, final 4×450 + 200 = 2000. Food 15 %: 15 % of 1800 = 270 on the pizza
  // line, 15 % of 200 = 30 on the dessert, ₹300 total — exactly its cap, so nothing is scaled.
  // Rivals: first-time 20 % of 2200 = 440 → capped 200; dessert 100; pizza flat 50; cap offer 100.
  const SIX = [{ id: ITEMS.PIZZA.id, qty: 4, variants: PLAIN }, { id: ITEMS.TIRAMISU.id, qty: 1 }];
  await scenario('OF-6', config.TABLE_CLEAN_6, SIX, ({ offer, price }) => {
    check(offer?.id === OFFERS.PCT_FOOD_15.id, 'OF-6 a food-category offer wins on a food-only cart', offer);
    check(offer?.discountAmount === 300 && price?.finalPrice === 1700, 'OF-6 ₹2000 − ₹300 = ₹1700', { offer, price });
    const by = Object.fromEntries((offer?.appliedItems || []).map(i => [i.menuItemId, i.discountAmount]));
    check(offer?.appliedItems?.length === 2 && by[ITEMS.PIZZA.id] === 270 && by[ITEMS.TIRAMISU.id] === 30,
      'OF-6 the breakdown splits per line — ₹270 pizza, ₹30 dessert — and the parts sum to the ₹300 whole', offer?.appliedItems);
    check((offer?.appliedItems || []).every(i => !!i.cartItemId),
      'OF-6 every line in the breakdown names its cartItemId, which is the only handle TD-016 has to bill it', offer?.appliedItems);
  });

  return results;
}
