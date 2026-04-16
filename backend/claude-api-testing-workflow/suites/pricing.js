/**
 * Suite: pricing
 *
 * Verifies exact price calculations against known expected values.
 * Tests respectParentDiscount logic for variants and addons.
 * Uses TABLE_CLEAN_3.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertPrice, assertFieldExists } from '../lib/assert.js';
import { customerLogin } from '../lib/auth.js';
import config from '../lib/config.js';
import { narrator } from '../lib/narrator.js';

const { RESTAURANT_ID, TABLE_CLEAN_3, ITEMS, VARIANTS, ADDONS, EXPECTED_PRICES } = config;

export default async function pricingSuite() {
  const results = { name: 'pricing', pass: 0, fail: 0, tests: [] };

  function record(assertion) {
    results.tests.push(assertion);
    assertion.pass ? results.pass++ : results.fail++;
  }

  // Setup: get a session
  let sessionId;
  try {
    sessionId = await customerLogin(RESTAURANT_ID, TABLE_CLEAN_3, config.TABLE_OTP, config.CUSTOMER_PHONE_2, 'Price Tester');
  } catch (e) {
    record({ pass: false, message: `Setup: customerLogin failed: ${e.message}` });
    return results;
  }

  const base = { restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_3, sessionId };

  /**
   * Helper: add item, checkout, verify order price, then clear state for next test.
   * We add item(s) to cart, checkout, check the order total, then move on.
   * Since each checkout appends to the same order, we check cart-level pricing instead.
   */
  async function addAndVerifyCartPrice(label, items, expectedFinalPrice) {
    // Clear any existing cart first
    await call('cart-clearCart', { restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_3 });

    // Add items
    for (const item of items) {
      const resp = await call('cart-addItemToCart', {
        ...base,
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        selectedVariants: item.selectedVariants || undefined,
        selectedAddons: item.selectedAddons || undefined,
      });
      const addOk = assertSuccess(resp, `${label} add ${item.menuItemId}`);
      if (!addOk.pass) {
        record(addOk);
        return;
      }
    }

    // Get cart to verify price
    const cartResp = await call('cart-getCart', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
    });
    record(assertSuccess(cartResp, `${label} get cart`));
    if (cartResp.status !== 'success') return;

    // getCart returns { data: { cart: { priceInfo: ... } } } or { data: { priceInfo: ... } }
    const priceInfo = cartResp.data?.cart?.priceInfo || cartResp.data?.priceInfo;
    if (!priceInfo) {
      record({ pass: false, message: `${label} → no priceInfo in cart response`, actual: cartResp });
      return;
    }
    const actual = priceInfo.finalPrice;
    const pass = Math.abs(actual - expectedFinalPrice) <= 0.01;
    record({
      pass,
      message: `${label} → finalPrice: expected ${expectedFinalPrice}, got ${actual}`,
      actual: pass ? undefined : cartResp,
    });
    narrator.cartTotal(expectedFinalPrice, actual);
  }

  // ── 1. Tiramisu ×1 (no discount, no variants) ─────────────────
  await addAndVerifyCartPrice('1. Tiramisu ×1', [
    { menuItemId: ITEMS.TIRAMISU.id },
  ], EXPECTED_PRICES.TIRAMISU_X1);

  // ── 2. Burger Regular ×1 (10% discount, variant Regular=0) ────
  await addAndVerifyCartPrice('2. Burger Regular', [
    {
      menuItemId: ITEMS.BURGER.id,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    },
  ], EXPECTED_PRICES.BURGER_REGULAR);

  // ── 3. Burger Large ×1 (respectParentDiscount=true on variant) ─
  // Burger final=180, Large variant base=50 → 50*(1-0.10)=45 → total=225
  await addAndVerifyCartPrice('3. Burger Large', [
    {
      menuItemId: ITEMS.BURGER.id,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
    },
  ], EXPECTED_PRICES.BURGER_LARGE);

  // ── 4. Burger Large + Cheese (cheese: respectParentDiscount=false) ──
  // 180 + 45 + 20 = 245
  await addAndVerifyCartPrice('4. Burger Large + Cheese', [
    {
      menuItemId: ITEMS.BURGER.id,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
      selectedAddons: [ADDONS.CHEESE.id],
    },
  ], EXPECTED_PRICES.BURGER_LARGE_CHEESE);

  // ── 5. Pizza Large + Jalapeno (jalapeno: respectParentDiscount=true) ──
  // Pizza final=450, Large=100*(1-0.10)=90, Jalapeno=25*(1-0.10)=22.5 → 562.5
  await addAndVerifyCartPrice('5. Pizza Large + Jalapeno', [
    {
      menuItemId: ITEMS.PIZZA.id,
      selectedVariants: { [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.LARGE.id },
      selectedAddons: [ADDONS.JALAPENO.id],
    },
  ], EXPECTED_PRICES.PIZZA_LARGE_JALAPENO);

  // ── 6. Pizza Large + Olives (olives: respectParentDiscount=false) ──
  // 450 + 90 + 30 = 570
  await addAndVerifyCartPrice('6. Pizza Large + Olives', [
    {
      menuItemId: ITEMS.PIZZA.id,
      selectedVariants: { [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.LARGE.id },
      selectedAddons: [ADDONS.OLIVES.id],
    },
  ], EXPECTED_PRICES.PIZZA_LARGE_OLIVES);

  // ── 7. Tiramisu ×3 (quantity multiplication) ───────────────────
  await addAndVerifyCartPrice('7. Tiramisu ×3', [
    { menuItemId: ITEMS.TIRAMISU.id, quantity: 3 },
  ], EXPECTED_PRICES.TIRAMISU_X3);

  // ── 8. Multi-item cart: Tiramisu + Burger Regular ──────────────
  await addAndVerifyCartPrice('8. Tiramisu + Burger Regular', [
    { menuItemId: ITEMS.TIRAMISU.id },
    {
      menuItemId: ITEMS.BURGER.id,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    },
  ], EXPECTED_PRICES.TIRAMISU_PLUS_BURGER_REG);

  // ── 9. Whiskey ×1 (no discount, no variants) ──────────────────
  await addAndVerifyCartPrice('9. Whiskey ×1', [
    { menuItemId: ITEMS.WHISKEY.id },
  ], EXPECTED_PRICES.WHISKEY_X1);

  // ── 10. Pizza Large + Stuffed Crust ────────────────────────────
  // 450 + 90 + 67.5 = 607.5
  await addAndVerifyCartPrice('10. Pizza Large + Stuffed Crust', [
    {
      menuItemId: ITEMS.PIZZA.id,
      selectedVariants: {
        [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.LARGE.id,
        [VARIANTS.PIZZA_CRUST.id]: VARIANTS.PIZZA_CRUST.options.STUFFED.id,
      },
    },
  ], EXPECTED_PRICES.PIZZA_LARGE_STUFFED);

  // ── 11. Pizza Med + Thin + Olives + Jalapeno ──────────────────
  // 450 + 0 + 0 + 30 + 22.5 = 502.5
  await addAndVerifyCartPrice('11. Pizza Med + Thin + Olives + Jalapeno', [
    {
      menuItemId: ITEMS.PIZZA.id,
      selectedVariants: {
        [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.MEDIUM.id,
        [VARIANTS.PIZZA_CRUST.id]: VARIANTS.PIZZA_CRUST.options.THIN.id,
      },
      selectedAddons: [ADDONS.OLIVES.id, ADDONS.JALAPENO.id],
    },
  ], EXPECTED_PRICES.PIZZA_MED_THIN_OLIVES_JALAPENO);

  // ── 12. Burger Large + Cheese x2 quantity ─────────────────────
  // (180 + 45 + 20) * 2 = 490
  await addAndVerifyCartPrice('12. Burger Large + Cheese ×2', [
    {
      menuItemId: ITEMS.BURGER.id,
      quantity: 2,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id },
      selectedAddons: [ADDONS.CHEESE.id],
    },
  ], EXPECTED_PRICES.BURGER_LARGE_CHEESE_X2);

  // ── 13. 5-item cart ───────────────────────────────────────────
  // Tiramisu(200) + BurgerReg(180) + BurgerLargeCheese(245) + PizzaMed(450) + Whiskey(500) = 1575
  await addAndVerifyCartPrice('13. 5-item cart', [
    { menuItemId: ITEMS.TIRAMISU.id },
    { menuItemId: ITEMS.BURGER.id, selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id } },
    { menuItemId: ITEMS.BURGER.id, selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.LARGE.id }, selectedAddons: [ADDONS.CHEESE.id] },
    { menuItemId: ITEMS.PIZZA.id, selectedVariants: { [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.MEDIUM.id } },
    { menuItemId: ITEMS.WHISKEY.id },
  ], EXPECTED_PRICES.FIVE_ITEM_CART);

  // ── 14. 3-item with quantities ────────────────────────────────
  // Tiramisu x3(600) + Whiskey x2(1000) + PizzaLarge(540) = 2140
  await addAndVerifyCartPrice('14. 3-item with quantities', [
    { menuItemId: ITEMS.TIRAMISU.id, quantity: 3 },
    { menuItemId: ITEMS.WHISKEY.id, quantity: 2 },
    { menuItemId: ITEMS.PIZZA.id, selectedVariants: { [VARIANTS.PIZZA_SIZE.id]: VARIANTS.PIZZA_SIZE.options.LARGE.id } },
  ], EXPECTED_PRICES.THREE_ITEM_QTY_CART);

  return results;
}
