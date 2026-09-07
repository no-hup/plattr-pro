/**
 * scenarios.mjs — lifecycle situations, written the way they happen in a restaurant.
 *
 * Each scenario gets a fresh table and asserts both the money and the state
 * machine. Scenarios are deliberately adversarial: they interleave customers,
 * waiters and the kitchen the way a busy service does, because that is where the
 * single-actor suites stop looking.
 *
 * A scenario never throws to fail. It calls ctx.record() for a normal assertion
 * and ctx.finding() when it has proven something worth a human's attention, so
 * one run produces both a pass/fail bar and a triaged issue list.
 */
import { Customer, Kitchen, Waiter, orderIdOf, priceInfoOf, cartsOf, orderOf, ok } from './actors.mjs';
import { call } from '../lib/api.js';

const near = (a, b, tol = 0.05) => Math.abs((a ?? NaN) - (b ?? NaN)) <= tol;

/** Two cheap, always-available items per restaurant, plus a construct-rich one. */
const MENU = {
  // Derived from MockData7: `simple` and `second` are variant-free items that
  // always add cleanly, `rich` exercises a mandatory variant plus an in-stock
  // addon. Items with a mandatory variant are deliberately NOT used as `simple`,
  // because the backend correctly rejects them without a selection and that
  // would look like a lifecycle failure instead of the validation working.
  res_meghana: {
    simple: { menuItemId: 'mi_paneer65' },
    second: { menuItemId: 'mi_chicken65' },
    rich: { menuItemId: 'mi_chicken_bir', selVariants: [{ variantId: 'mv_bir_portion', optionId: 'family' }], selAddonIds: ['ma_extra_raita'] },
  },
  res_pizzabakery: {
    simple: { menuItemId: 'pi_alfredo' },
    second: { menuItemId: 'pi_arrabiata' },
    rich: { menuItemId: 'pi_margherita', selVariants: [{ variantId: 'pv_size', optionId: 'large' }], selAddonIds: ['pa_cheese'] },
  },
  res_truffles: {
    simple: { menuItemId: 'tri_steak' },
    second: { menuItemId: 'tri_fish' },
    rich: { menuItemId: 'tri_classic', selVariants: [{ variantId: 'trv_patty', optionId: 'veg' }], selAddonIds: ['tra_cheese'] },
  },
  res_salt: {
    simple: { menuItemId: 'si_butter_chicken' },
    second: { menuItemId: 'si_dal_makhani' },
    rich: { menuItemId: 'si_seekh', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }], selAddonIds: ['sa_mint'] },
  },
  res_chowman: {
    simple: { menuItemId: 'ci_spring_roll' },
    second: { menuItemId: 'ci_chilli_paneer' },
    rich: { menuItemId: 'ci_hakka', selVariants: [{ variantId: 'cv_portion', optionId: 'full' }], selAddonIds: ['ca_prawns'] },
  },
};

const menuOf = (rid) => MENU[rid] || MENU.res_meghana;

// ═══════════════════════════════════════════════════════════════════════════
// 1. The ordinary happy path — but checking the bill at EVERY state change.
// ═══════════════════════════════════════════════════════════════════════════
async function singleUserLifecycle(ctx) {
  const { restaurantId, kitchen, waiter } = ctx;
  const menu = menuOf(restaurantId);
  const c = new Customer(restaurantId);

  const join = await c.join(ctx.freshTable());
  if (!ctx.record(ok(join), 'customer joins table', join?.message)) return;

  await c.addItem(menu.rich, 'rich_item');
  await c.addItem(menu.simple, 'simple_item');
  const cart = await c.getCart('populated');
  const cartTotal = cart?.data?.cart?.priceInfo?.finalPrice ?? cart?.data?.priceInfo?.finalPrice;
  ctx.record(typeof cartTotal === 'number' && cartTotal > 0, 'cart has a positive total', `got ${cartTotal}`);

  const co = await c.checkout('lifecycle');
  if (!ctx.record(ok(co), 'checkout succeeds', co?.message)) return;
  const orderId = orderIdOf(co);
  if (!ctx.record(!!orderId, 'checkout returns an orderId')) return;

  // The bill as it stands the moment the order is placed.
  const placed = priceInfoOf(await c.getOrder(orderId, 'placed'));
  if (!ctx.record(!!placed, 'order carries priceInfo')) return;
  const atPlacement = {
    finalPrice: placed.finalPrice,
    chargesTotal: placed.chargesTotal ?? 0,
    grand: (placed.finalPrice ?? 0) + (placed.chargesTotal ?? 0),
  };
  ctx.record(atPlacement.finalPrice >= 0, 'order total is not negative', `${atPlacement.finalPrice}`);

  // Kitchen works the ticket.
  const prep = await kitchen.setCartStatus(orderId, 0, 'PREPARING');
  ctx.record(ok(prep), 'kitchen can move cart to PREPARING', prep?.message);
  const ready = await kitchen.setCartStatus(orderId, 0, 'READY');
  ctx.record(ok(ready), 'kitchen can move cart to READY', ready?.message);

  // The bill must not move because the food moved.
  const afterKitchen = priceInfoOf(await c.getOrder(orderId, 'after_kitchen'));
  ctx.record(near(afterKitchen?.finalPrice, atPlacement.finalPrice),
    'total unchanged after kitchen status changes',
    `placed ${atPlacement.finalPrice} -> ${afterKitchen?.finalPrice}`);

  // Waiter serves, then closes the bill.
  const served = await waiter.markCartServed(orderId, 0);
  ctx.record(ok(served), 'waiter can mark the cart served', served?.message);

  // The Served tab the waiter checks after delivering. Also the only thing that
  // exercises the ServedCart model's required-field contract.
  const servedList = await waiter.servedCarts('after_serve');
  ctx.record(ok(servedList), 'waiter can list served carts', servedList?.message);

  const completed = await waiter.setOrderStatus(orderId, 'COMPLETED');
  ctx.record(ok(completed), 'waiter can complete the order', completed?.message);

  // THE moment that matters: what the customer actually pays.
  const final = priceInfoOf(await c.getOrder(orderId, 'completed'));
  const finalGrand = (final?.finalPrice ?? 0) + (final?.chargesTotal ?? 0);

  ctx.record(near(final?.finalPrice, atPlacement.finalPrice),
    'item total unchanged at COMPLETED',
    `placed ${atPlacement.finalPrice} -> completed ${final?.finalPrice}`);

  if (atPlacement.chargesTotal !== 0 && !near(final?.chargesTotal ?? 0, atPlacement.chargesTotal)) {
    ctx.finding({
      title: 'Charges are dropped from the bill when an order is COMPLETED',
      severity: 'CRITICAL', area: 'pricing', endpoint: 'order-updateOrderStatus',
      file: 'orders/updateOrderStatus.js:96',
      detail: 'The COMPLETED path rebuilds OrderPriceInfo from scratch and never re-applies billing.charges, so service charge and GST disappear from the bill at the exact moment the customer pays. The restaurant undercharges every completed order by its full charge percentage.',
      expected: `chargesTotal ${atPlacement.chargesTotal}, grand ${atPlacement.grand}`,
      actual: `chargesTotal ${final?.chargesTotal ?? 0}, grand ${finalGrand}`,
    });
  }
  ctx.record(near(final?.chargesTotal ?? 0, atPlacement.chargesTotal),
    'charges survive COMPLETED',
    `placed ${atPlacement.chargesTotal} -> completed ${final?.chargesTotal ?? 0}`);
  ctx.record(near(finalGrand, atPlacement.grand),
    'grand total unchanged at COMPLETED',
    `placed ${atPlacement.grand} -> completed ${finalGrand}`);

  // Cross-app: everyone must quote the same number while the order is live.
  ctx.orderForCrossApp = { orderId, expected: atPlacement.finalPrice };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. One session, three checkouts — the multi-cart order.
// ═══════════════════════════════════════════════════════════════════════════
async function multiCartOrder(ctx) {
  const { restaurantId } = ctx;
  const menu = menuOf(restaurantId);
  const c = new Customer(restaurantId);
  if (!ctx.record(ok(await c.join(ctx.freshTable())), 'customer joins for multi-cart')) return;

  let orderId = null;
  const runningItemTotals = [];

  for (let round = 1; round <= 3; round++) {
    await c.addItem(round === 2 ? menu.rich : menu.simple, `round${round}`);
    const co = await c.checkout(`multicart_${round}`);
    if (!ctx.record(ok(co), `checkout round ${round} succeeds`, co?.message)) return;
    const id = orderIdOf(co);
    if (round === 1) orderId = id;
    else ctx.record(id === orderId, `round ${round} joins the SAME order (multi-cart grouping)`, `expected ${orderId}, got ${id}`);

    const pi = priceInfoOf(await c.getOrder(orderId, `multicart_${round}`));
    runningItemTotals.push(pi?.finalPrice ?? 0);

    const carts = cartsOf(await c.getOrder(orderId));
    ctx.record(carts.length === round, `order has ${round} cart snapshot(s)`, `got ${carts.length}`);
    const ids = carts.map(x => x.cartId).filter(Boolean);
    ctx.record(new Set(ids).size === ids.length, 'cart snapshots have unique cartIds', ids.join(','));
  }

  // Each checkout adds food, so the total must be non-decreasing.
  for (let i = 1; i < runningItemTotals.length; i++) {
    ctx.record(runningItemTotals[i] >= runningItemTotals[i - 1] - 0.05,
      `order total does not shrink after checkout ${i + 1}`,
      `${runningItemTotals[i - 1]} -> ${runningItemTotals[i]}`);
  }

  // The order-level offer is re-evaluated on the union each time, so a bigger
  // basket must never produce a WORSE outcome than a subset of itself.
  const finalPi = priceInfoOf(await c.getOrder(orderId, 'multicart_final'));
  ctx.record((finalPi?.finalPrice ?? 0) >= 0, 'multi-cart total stays non-negative', `${finalPi?.finalPrice}`);
  ctx.record((finalPi?.offerDiscount ?? 0) <= (finalPi?.basePrice ?? 0) + 0.05,
    'offer discount never exceeds the order base', `discount ${finalPi?.offerDiscount}, base ${finalPi?.basePrice}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Two customers at one table.
// ═══════════════════════════════════════════════════════════════════════════
async function multiUserTable(ctx) {
  const { restaurantId } = ctx;
  const menu = menuOf(restaurantId);
  const table = ctx.freshTable();

  const a = new Customer(restaurantId, '9876543210', 'Customer One');
  const b = new Customer(restaurantId, '9876543211', 'Customer Two');

  const joinA = await a.join(table);
  if (!ctx.record(ok(joinA), 'first customer joins', joinA?.message)) return;
  ctx.record(joinA?.data?.isPrimaryCustomer === true, 'first customer is primary', `got ${joinA?.data?.isPrimaryCustomer}`);

  const wrongOtp = await b.join(table, '000000');
  ctx.record(!ok(wrongOtp), 'wrong OTP is rejected for the second customer', wrongOtp?.message);

  const joinB = await b.join(table);
  if (!ctx.record(ok(joinB), 'second customer joins the active table', joinB?.message)) return;
  ctx.record(joinB?.data?.isPrimaryCustomer === false, 'second customer is NOT primary', `got ${joinB?.data?.isPrimaryCustomer}`);
  ctx.record(joinB?.data?.sessionId === joinA?.data?.sessionId,
    'both customers share one table session',
    `A=${joinA?.data?.sessionId} B=${joinB?.data?.sessionId}`);

  // Both add to what is, in this schema, a single shared cart.
  await a.addItem(menu.simple, 'userA_item');
  await b.addItem(menu.second, 'userB_item');
  const cart = await a.getCart('shared');
  const items = cart?.data?.cart?.items || cart?.data?.items || [];
  ctx.record(items.length === 2, 'both customers\' items land in the cart', `got ${items.length}`);

  const attributed = items.filter(i => i.userId || i.phoneNumber || i.addedBy);
  if (attributed.length === 0 && items.length > 0) {
    ctx.finding({
      title: 'Cart items carry no per-customer attribution',
      severity: 'HIGH', area: 'lifecycle', endpoint: 'cart-addItemToCart',
      file: 'cart/addItemToCartBoilerplateHelper.js',
      detail: 'With two customers on one table session, every item lands in the shared carts/{tableId} document with no userId, phoneNumber or addedBy field. Nothing downstream can say who ordered what, so split-bill and per-person totals are not expressible, and a customer disputing a line has no record to point at.',
      expected: 'each cart item tagged with the customer who added it',
      actual: `${items.length} items, 0 with any attribution field`,
    });
  }
  ctx.record(attributed.length === items.length, 'every cart item is attributed to a customer',
    `${attributed.length}/${items.length} attributed`);

  // Second customer checks out a cart the first one contributed to.
  const co = await b.checkout('by_second_user');
  ctx.record(ok(co), 'second customer can check out the shared cart', co?.message);
  const orderId = orderIdOf(co);
  if (orderId) {
    const order = orderOf(await a.getOrder(orderId, 'multiuser'));
    if (order && order.sessionId && order.sessionId !== b.sessionId && order.sessionId !== a.sessionId) {
      ctx.finding({
        title: 'Order sessionId does not match either customer at the table',
        severity: 'MEDIUM', area: 'lifecycle', endpoint: 'cart-checkoutCart',
        detail: 'The order was written with a session that belongs to neither the customer who built the cart nor the one who checked it out.',
        expected: `${a.sessionId} or ${b.sessionId}`, actual: order.sessionId,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Two people hit Place Order at the same instant.
// ═══════════════════════════════════════════════════════════════════════════
async function concurrentCheckout(ctx) {
  const { restaurantId } = ctx;
  const menu = menuOf(restaurantId);
  const table = ctx.freshTable();
  const c = new Customer(restaurantId);
  if (!ctx.record(ok(await c.join(table)), 'customer joins for concurrent checkout')) return;

  await c.addItem(menu.simple, 'concurrent_seed');
  const cartBefore = await c.getCart('before_concurrent');
  const expectedItems = (cartBefore?.data?.cart?.items || cartBefore?.data?.items || []).length;

  // Two taps, genuinely in flight together.
  const [r1, r2] = await Promise.all([c.checkout('race_a'), c.checkout('race_b')]);
  const successes = [r1, r2].filter(ok);
  ctx.record(successes.length >= 1, 'at least one concurrent checkout succeeds');

  const orderIds = [...new Set(successes.map(orderIdOf).filter(Boolean))];
  const order = orderIds.length ? orderOf(await c.getOrder(orderIds[0], 'after_race')) : null;
  const carts = order?.carts || [];
  const totalItems = carts.reduce((n, cart) => n + (cart.items || []).length, 0);

  if (successes.length === 2 || totalItems > expectedItems) {
    ctx.finding({
      title: 'Concurrent checkout duplicates the cart onto the order',
      severity: 'CRITICAL', area: 'concurrency', endpoint: 'cart-checkoutCart',
      file: 'cart/checkoutCart.js',
      detail: 'Two checkouts fired together on one table both read the same live cart before either deleted it, so the same food was written to the order more than once. The customer is billed twice for one order and the kitchen sees duplicate tickets. checkoutCart reads the cart outside the transaction that writes the order.',
      expected: `1 cart snapshot with ${expectedItems} item(s)`,
      actual: `${successes.length} successful checkouts, ${carts.length} cart snapshot(s), ${totalItems} item(s) total`,
    });
  }
  ctx.record(successes.length === 1, 'exactly ONE of two concurrent checkouts succeeds',
    `${successes.length} succeeded`);
  ctx.record(totalItems <= expectedItems, 'concurrent checkout does not duplicate items',
    `expected <= ${expectedItems}, got ${totalItems}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. An item added while checkout is in flight.
// ═══════════════════════════════════════════════════════════════════════════
async function addDuringCheckout(ctx) {
  const { restaurantId } = ctx;
  const menu = menuOf(restaurantId);
  const c = new Customer(restaurantId);
  if (!ctx.record(ok(await c.join(ctx.freshTable())), 'customer joins for add-during-checkout')) return;

  await c.addItem(menu.simple, 'pre_checkout');
  // Fire the late add and the checkout together.
  const [co, late] = await Promise.all([c.checkout('during_add'), c.addItem(menu.second, 'late_add')]);

  if (!ok(co)) { ctx.record(false, 'checkout succeeds during a concurrent add', co?.message); return; }
  ctx.record(true, 'checkout succeeds during a concurrent add');

  const orderId = orderIdOf(co);
  const order = orderOf(await c.getOrder(orderId, 'after_late_add'));
  const orderedIds = (order?.carts || []).flatMap(x => (x.items || []).map(i => i.menuItemId));
  const cartAfter = await c.getCart('after_late_add');
  const stillInCart = (cartAfter?.data?.cart?.items || cartAfter?.data?.items || []).map(i => i.menuItemId);

  const lateItem = menu.second.menuItemId;
  const lateAccepted = ok(late);
  const lateLanded = orderedIds.includes(lateItem) || stillInCart.includes(lateItem);

  if (lateAccepted && !lateLanded) {
    ctx.finding({
      title: 'An item accepted during checkout is silently lost',
      severity: 'CRITICAL', area: 'concurrency', endpoint: 'cart-addItemToCart',
      file: 'cart/checkoutCart.js',
      detail: 'addItemToCart returned success while a checkout was in flight, but the item appears in neither the resulting order nor the live cart. checkoutCart reads the cart, then deletes it outside that read\'s transaction, so a write landing in between is destroyed. The customer was told the item was added and it will never be cooked.',
      expected: `${lateItem} present in the order or still in the cart`,
      actual: `ordered [${orderedIds.join(',')}], cart [${stillInCart.join(',')}]`,
    });
  }
  ctx.record(!lateAccepted || lateLanded, 'an accepted late add is never silently lost',
    `accepted=${lateAccepted} landed=${lateLanded}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 + 7. Staff stepping on each other.
// ═══════════════════════════════════════════════════════════════════════════
async function staffRaces(ctx) {
  const { restaurantId, kitchen, waiter, waiter2 } = ctx;
  const menu = menuOf(restaurantId);

  // ── 7. Kitchen READY vs waiter SERVED, fired together.
  {
    const c = new Customer(restaurantId);
    if (ctx.record(ok(await c.join(ctx.freshTable())), 'customer joins for kitchen/waiter race')) {
      await c.addItem(menu.simple, 'race_item');
      const co = await c.checkout('kitchen_waiter_race');
      const orderId = orderIdOf(co);
      if (ctx.record(ok(co) && !!orderId, 'checkout for kitchen/waiter race', co?.message)) {
        const [kResp, wResp] = await Promise.all([
          kitchen.setCartStatus(orderId, 0, 'READY', 'race_ready'),
          waiter.markCartServed(orderId, 0, 'race_served'),
        ]);
        const order = orderOf(await c.getOrder(orderId, 'after_staff_race'));
        const cartStatus = order?.carts?.[0]?.status;

        // Whatever the interleaving, the cart must end in a legal state.
        ctx.record(['READY', 'SERVED', 'PREPARING', 'PENDING'].includes(cartStatus),
          'cart ends the race in a legal state', `got ${cartStatus}`);

        if (ok(wResp) && !ok(kResp) && cartStatus === 'SERVED') {
          ctx.finding({
            title: 'A waiter can serve a cart the kitchen has not finished',
            severity: 'HIGH', area: 'lifecycle', endpoint: 'order-markCartAsServed',
            file: 'orders/markCartAsServed.js:84-95',
            detail: 'markCartAsServed does not consult the fulfillment transition table, so it moved the cart straight to SERVED. The kitchen\'s concurrent READY call was then rejected as an invalid SERVED to READY transition. The kitchen display can no longer advance a ticket that is still cooking.',
            expected: 'markCartAsServed rejects a cart that is not READY',
            actual: `waiter SERVED succeeded, kitchen READY failed: ${kResp?.message}`,
          });
        }
      }
    }
  }

  // ── 6. Two waiters tap Serve on the same item.
  {
    const c = new Customer(restaurantId);
    if (ctx.record(ok(await c.join(ctx.freshTable())), 'customer joins for two-waiter race')) {
      await c.addItem(menu.simple, 'two_waiter_item');
      const co = await c.checkout('two_waiter');
      const orderId = orderIdOf(co);
      if (ctx.record(ok(co) && !!orderId, 'checkout for two-waiter race', co?.message)) {
        await kitchen.setCartStatus(orderId, 0, 'READY', 'two_waiter_ready');
        const order = orderOf(await c.getOrder(orderId, 'two_waiter_order'));
        const firstItem = order?.carts?.[0]?.items?.[0];

        if (firstItem) {
          const [w1, w2] = await Promise.all([
            waiter.markItemServed(orderId, firstItem.menuItemId, firstItem.cartItemId, 'w1'),
            waiter2.markItemServed(orderId, firstItem.menuItemId, firstItem.cartItemId, 'w2'),
          ]);
          const both = [w1, w2];
          const failures = both.filter(r => !ok(r));
          const successes = both.filter(ok);

          if (failures.length === 2) {
            // Neither waiter could serve: the item is still PENDING because the
            // kitchen marking the CART ready never cascaded to its items.
            ctx.finding({
              title: 'A READY cart still contains PENDING items, so no waiter can serve them',
              severity: 'HIGH', area: 'lifecycle', endpoint: 'server-markItemServed',
              file: 'cart/updateCartStatus.js',
              detail: 'The kitchen marked the cart READY, but cart-updateCartStatus does not cascade to carts[].items[].status, and server-markItemServed requires an item to be READY before it can be SERVED. So the kitchen says the food is ready and the waiter app refuses to serve it. No API sets item-level READY, which means the per-item serve flow cannot be used at all as currently wired.',
              expected: 'a cart marked READY makes its items servable',
              actual: `both waiters rejected: ${failures.map(f => f?.message).join(' | ')}`,
            });
            ctx.record(false, 'a READY cart has servable items',
              `both markItemServed calls rejected: ${failures[0]?.message}`);
          } else if (failures.length === 1) {
            // One won the race and the other got an error rather than a no-op.
            ctx.finding({
              title: 'Second waiter marking the same item served gets an error',
              severity: 'MEDIUM', area: 'concurrency', endpoint: 'server-markItemServed',
              file: 'orders/serverMarkItemServed.js:88-94',
              detail: 'SERVED to SERVED is not in the transition table, so when two waiters tap Serve on the same item the loser sees an invalid-transition error rather than a harmless no-op. On a busy floor a double-tap is routine, and the waiter is shown a failure for work that actually completed. markCartAsServed is idempotent in the same situation, so the two staff endpoints behave inconsistently.',
              expected: 'both calls succeed, the second as an idempotent no-op',
              actual: `1 of 2 failed: ${failures[0]?.message}`,
            });
            ctx.record(false, 'double-serving one item is idempotent', `1/2 failed: ${failures[0]?.message}`);
          } else {
            ctx.record(true, 'double-serving one item is idempotent');
          }
          ctx.record(successes.length <= 1 || failures.length === 0,
            'concurrent item-serve leaves a consistent result', `${successes.length} succeeded`);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. The state machine, every edge.
// ═══════════════════════════════════════════════════════════════════════════
const LEGAL_CART = {
  PENDING: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
  SERVED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};
const ALL_FULFILLMENT = Object.keys(LEGAL_CART);

async function cartTransitionMatrix(ctx) {
  const { restaurantId, kitchen } = ctx;
  const menu = menuOf(restaurantId);

  // One table, one order, many carts: each checkout appends a fresh PENDING cart
  // to the same order, so a single session gives us an independent subject for
  // every (from, to) pair without burning a table each time.
  const c = new Customer(restaurantId);
  const table = ctx.freshTable();
  if (!table) return;
  if (!ctx.record(ok(await c.join(table)), 'customer joins for the transition matrix')) return;

  let cartIndex = -1;
  const nextCart = async (label) => {
    await c.addItem(menu.simple, label);
    const co = await c.checkout(label);
    if (!ok(co)) return null;
    cartIndex++;
    return { orderId: orderIdOf(co), cartIndex };
  };

  for (const from of ['PENDING', 'PREPARING', 'READY']) {
    for (const to of ALL_FULFILLMENT) {
      if (to === from) continue;
      const subject = await nextCart(`transition_${from}_${to}`);
      if (!subject) { ctx.record(false, `could not create a cart for ${from} to ${to}`); continue; }
      const { orderId, cartIndex: idx } = subject;

      // Walk this cart to the `from` state using only legal steps.
      let reached = 'PENDING';
      if (from === 'PREPARING') {
        if (ok(await kitchen.setCartStatus(orderId, idx, 'PREPARING'))) reached = 'PREPARING';
      } else if (from === 'READY') {
        await kitchen.setCartStatus(orderId, idx, 'PREPARING');
        if (ok(await kitchen.setCartStatus(orderId, idx, 'READY'))) reached = 'READY';
      }
      if (reached !== from) { ctx.record(false, `could not reach ${from} to test ${to}`); continue; }

      const resp = await kitchen.setCartStatus(orderId, idx, to, `t_${from}_${to}`);
      const shouldAllow = LEGAL_CART[from].includes(to);
      const didAllow = ok(resp);

      if (didAllow !== shouldAllow) {
        ctx.finding({
          title: `Cart transition ${from} to ${to} is ${didAllow ? 'allowed but should not be' : 'rejected but should be allowed'}`,
          severity: didAllow ? 'HIGH' : 'MEDIUM', area: 'lifecycle', endpoint: 'cart-updateCartStatus',
          file: 'cart/updateCartStatus.js:12-19',
          detail: `The documented fulfillment state machine ${shouldAllow ? 'permits' : 'forbids'} ${from} to ${to}, but the endpoint ${didAllow ? 'accepted' : 'rejected'} it. A cart reaching a state it should not be able to reach lets staff skip preparation steps, or strands a ticket the kitchen can no longer advance.`,
          expected: shouldAllow ? 'accepted' : 'rejected',
          actual: didAllow ? 'accepted' : `rejected: ${resp?.message}`,
        });
      }
      ctx.record(didAllow === shouldAllow, `cart ${from} to ${to} ${shouldAllow ? 'allowed' : 'rejected'}`,
        didAllow ? 'accepted' : `rejected: ${resp?.message}`);
    }
  }

  // The waiter endpoint enforces a DIFFERENT (looser) rule than the kitchen one.
  // Prove it on a cart that is still PENDING.
  const fresh = await nextCart('waiter_pending_serve');
  if (fresh) {
    const resp = await ctx.waiter.markCartServed(fresh.orderId, fresh.cartIndex, 'pending_to_served');
    if (ok(resp)) {
      ctx.finding({
        title: 'markCartAsServed lets a waiter jump a PENDING cart straight to SERVED',
        severity: 'HIGH', area: 'lifecycle', endpoint: 'order-markCartAsServed',
        file: 'orders/markCartAsServed.js:84-95',
        detail: 'cart-updateCartStatus enforces the fulfillment transition table, but markCartAsServed only rejects CANCELLED and RETURNED. A waiter can therefore mark food served that the kitchen has not started, and the kitchen can no longer move that ticket because SERVED to READY is invalid. Two endpoints writing the same field disagree about the rules.',
        expected: 'rejected, the cart is not READY',
        actual: 'accepted, cart is now SERVED',
      });
    }
    ctx.record(!ok(resp), 'markCartAsServed rejects a PENDING cart',
      ok(resp) ? 'accepted PENDING to SERVED' : `rejected: ${resp?.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8b. Order-level state machine.
// ═══════════════════════════════════════════════════════════════════════════
const LEGAL_ORDER = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function orderTransitionMatrix(ctx) {
  const { restaurantId, waiter } = ctx;
  const menu = menuOf(restaurantId);

  for (const to of ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
    const c = new Customer(restaurantId);
    const table = ctx.freshTable();
    if (!table) return;
    if (!ok(await c.join(table))) continue;
    await c.addItem(menu.simple, 'order_transition');
    const co = await c.checkout(`order_t_${to}`);
    const orderId = orderIdOf(co);
    if (!ok(co) || !orderId) continue;

    const order = orderOf(await c.getOrder(orderId));
    const from = order?.orderStatus || 'IN_PROGRESS';   // orders are born IN_PROGRESS
    const resp = await waiter.setOrderStatus(orderId, to, `order_${from}_${to}`);
    const shouldAllow = (LEGAL_ORDER[from] || []).includes(to);
    ctx.record(ok(resp) === shouldAllow, `order ${from} to ${to} ${shouldAllow ? 'allowed' : 'rejected'}`,
      ok(resp) ? 'accepted' : `rejected: ${resp?.message}`);

    // Terminal states must stay terminal.
    if (ok(resp) && (to === 'COMPLETED' || to === 'CANCELLED')) {
      const revive = await waiter.setOrderStatus(orderId, 'IN_PROGRESS', `revive_${to}`);
      if (ok(revive)) {
        ctx.finding({
          title: `A ${to} order can be moved back to IN_PROGRESS`,
          severity: 'HIGH', area: 'lifecycle', endpoint: 'order-updateOrderStatus',
          file: 'orders/updateOrderStatus.js:52-67',
          detail: `${to} is documented as terminal, but the endpoint accepted a transition back to IN_PROGRESS. A paid or cancelled bill can be reopened, which breaks reconciliation.`,
          expected: 'rejected', actual: 'accepted',
        });
      }
      ctx.record(!ok(revive), `${to} is terminal and cannot be reopened`,
        ok(revive) ? 'reopened' : 'correctly rejected');

      // A checkout after completion must not resurrect the completed order.
      if (to === 'COMPLETED') {
        await c.addItem(menu.second, 'post_complete');
        const co2 = await c.checkout('after_completed');
        const newId = orderIdOf(co2);
        if (ok(co2) && newId === orderId) {
          const after = orderOf(await c.getOrder(orderId, 'resurrected'));
          if (after?.orderStatus === 'IN_PROGRESS') {
            ctx.finding({
              title: 'Checking out again resurrects a COMPLETED order',
              severity: 'HIGH', area: 'lifecycle', endpoint: 'cart-checkoutCart',
              file: 'orders/createOrUpdateOrder.js',
              detail: 'A new checkout at the same table attached to the already-COMPLETED order and set its status back to IN_PROGRESS, bypassing the transition guard on updateOrderStatus. A settled bill reopens and the earlier payment status is no longer trustworthy.',
              expected: 'a new order, leaving the completed one closed',
              actual: `reused order ${orderId}, status now ${after?.orderStatus}`,
            });
          }
          ctx.record(after?.orderStatus !== 'IN_PROGRESS', 'a COMPLETED order is not resurrected by a new checkout',
            `status ${after?.orderStatus}`);
        } else {
          ctx.record(true, 'a post-completion checkout starts a new order');
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. A new party sits at a table whose previous order was never closed.
// ═══════════════════════════════════════════════════════════════════════════
async function staleOrderSameTable(ctx) {
  const { restaurantId } = ctx;
  const menu = menuOf(restaurantId);
  const table = ctx.freshTable();
  if (!table) return;

  // Party one orders and leaves without the bill being closed.
  const first = new Customer(restaurantId, '9876543210', 'Customer One');
  if (!ctx.record(ok(await first.join(table)), 'first party joins')) return;
  await first.addItem(menu.rich, 'party1');
  const co1 = await first.checkout('party1');
  const order1 = orderIdOf(co1);
  if (!ctx.record(ok(co1) && !!order1, 'first party checks out', co1?.message)) return;
  const total1 = priceInfoOf(await first.getOrder(order1, 'party1'))?.finalPrice ?? 0;

  // Party two sits at the same table. Nobody closed the previous order.
  const second = new Customer(restaurantId, '9876543211', 'Customer Two');
  const joined = await second.join(table);
  if (!ok(joined)) { ctx.record(true, 'second party cannot join a table with a live order (acceptable)'); return; }

  await second.addItem(menu.simple, 'party2');
  const co2 = await second.checkout('party2');
  const order2 = orderIdOf(co2);
  if (!ctx.record(ok(co2) && !!order2, 'second party checks out', co2?.message)) return;

  if (order2 === order1) {
    const merged = priceInfoOf(await second.getOrder(order1, 'merged'));
    ctx.finding({
      title: 'A new party inherits the previous party\'s unpaid order',
      severity: 'CRITICAL', area: 'lifecycle', endpoint: 'cart-checkoutCart',
      file: 'orders/createOrUpdateOrder.js:89-113',
      detail: 'Orders are grouped by tableId alone, never by sessionId. The second party\'s cart was appended to the first party\'s still-open order, so the new customer\'s bill now includes food they did not order, and the order\'s sessionId was overwritten with theirs. On a table that is not properly closed between sittings this charges the wrong people.',
      expected: `a new order for session ${second.sessionId}`,
      actual: `reused order ${order1}; total went ${total1} -> ${merged?.finalPrice}`,
    });
  }
  ctx.record(order2 !== order1, 'a new party gets its own order',
    order2 === order1 ? `both parties on ${order1}` : `${order1} then ${order2}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. Everyone polling at once while customers order.
// ═══════════════════════════════════════════════════════════════════════════
async function staffLoad(ctx) {
  const { restaurantId, kitchen, waiter, waiter2 } = ctx;
  const menu = menuOf(restaurantId);

  // Four tables ordering concurrently.
  const tables = [ctx.freshTable(), ctx.freshTable(), ctx.freshTable(), ctx.freshTable()].filter(Boolean);
  if (tables.length < 2) { ctx.record(true, 'not enough free tables for the load scenario (skipped)'); return; }

  const customers = tables.map(t => new Customer(restaurantId, '9876543210', 'Customer One'));
  await Promise.all(customers.map((c, i) => c.join(tables[i])));
  await Promise.all(customers.map(c => c.addItem(menu.simple, 'load')));

  // Checkouts and staff polls, all in flight together, the way a real service looks.
  const pollers = [
    kitchen.activeCarts('load_kitchen'), waiter.activeOrders('load_server'),
    waiter2.activeOrders('load_server2'), kitchen.activeCarts('load_kitchen2'),
  ];
  const [checkouts, polls] = await Promise.all([
    Promise.all(customers.map(c => c.checkout('load'))),
    Promise.all(pollers),
  ]);

  ctx.record(checkouts.every(ok), 'every concurrent checkout succeeds under load',
    `${checkouts.filter(ok).length}/${checkouts.length}`);
  ctx.record(polls.every(ok), 'every staff poll succeeds under load',
    `${polls.filter(ok).length}/${polls.length}`);

  // The lists staff see must be well-formed and bounded, not truncated silently.
  for (const p of polls.filter(ok)) {
    const orders = p?.data?.orders || [];
    ctx.record(Array.isArray(orders), 'a staff poll returns an orders array');
    ctx.record(orders.length <= 300, 'staff poll respects the 300-order bound', `${orders.length}`);
    const malformed = orders.filter(o => !o.orderId || !o.priceInfo);
    ctx.record(malformed.length === 0, 'every polled order has an id and priceInfo',
      `${malformed.length} malformed`);
  }

  // After the dust settles every checkout must be visible to staff.
  const finalPoll = await waiter.activeOrders('load_final');
  const visible = new Set((finalPoll?.data?.orders || []).map(o => o.orderId));
  const placed = checkouts.filter(ok).map(orderIdOf).filter(Boolean);
  const missing = placed.filter(id => !visible.has(id));
  if (missing.length) {
    ctx.finding({
      title: 'An order placed under load is not visible to staff',
      severity: 'CRITICAL', area: 'lifecycle', endpoint: 'order-getActiveOrdersForRestaurant',
      detail: 'A checkout returned success but the resulting order does not appear in the waiter\'s active order list, so the food would never be made or served.',
      expected: `all ${placed.length} orders visible`, actual: `${missing.length} missing: ${missing.join(',')}`,
    });
  }
  ctx.record(missing.length === 0, 'every order placed under load is visible to staff',
    `${missing.length} missing of ${placed.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Cross-app agreement: every app quotes the same rupee value.
// ═══════════════════════════════════════════════════════════════════════════
async function crossAppAgreement(ctx) {
  const { restaurantId, kitchen, waiter } = ctx;
  const menu = menuOf(restaurantId);
  const c = new Customer(restaurantId);
  if (!ctx.record(ok(await c.join(ctx.freshTable())), 'customer joins for cross-app check')) return;

  await c.addItem(menu.rich, 'crossapp_rich');
  await c.addItem(menu.simple, 'crossapp_simple');
  const co = await c.checkout('crossapp');
  const orderId = orderIdOf(co);
  if (!ctx.record(ok(co) && !!orderId, 'checkout for cross-app check', co?.message)) return;

  const consumer = priceInfoOf(await c.getOrder(orderId, 'crossapp_consumer'));
  const expected = consumer?.finalPrice;
  if (!ctx.record(typeof expected === 'number', 'consumer sees a total')) return;

  const kResp = await kitchen.activeCarts('crossapp_kitchen');
  const kOrder = (kResp?.data?.orders || []).find(o => o.orderId === orderId);
  ctx.record(!!kOrder, 'kitchen can see the order', kResp?.message);
  if (kOrder) {
    ctx.record(near(kOrder.priceInfo?.finalPrice, expected), 'kitchen quotes the same total',
      `consumer ${expected}, kitchen ${kOrder.priceInfo?.finalPrice}`);
  }

  const sResp = await waiter.activeOrders('crossapp_server');
  const sOrder = (sResp?.data?.orders || []).find(o => o.orderId === orderId);
  ctx.record(!!sOrder, 'waiter list can see the order', sResp?.message);
  if (sOrder) {
    ctx.record(near(sOrder.priceInfo?.finalPrice, expected), 'waiter list quotes the same total',
      `consumer ${expected}, server ${sOrder.priceInfo?.finalPrice}`);
  }

  const dResp = await waiter.orderDetails(orderId, 'crossapp_detail');
  const detailTotal = dResp?.data?.order?.total ?? dResp?.data?.total;
  ctx.record(near(detailTotal, expected), 'waiter detail quotes the same total',
    `consumer ${expected}, detail ${detailTotal}`);

  // The detail payload is the one the strict Dart models parse; check the
  // fields those models declare non-nullable are actually present.
  const detail = dResp?.data?.order || dResp?.data;
  if (detail) {
    for (const field of ['id', 'orderNumber', 'orderStatus', 'tableId', 'restaurantId', 'total']) {
      const present = detail[field] !== undefined && detail[field] !== null;
      if (!present) {
        ctx.finding({
          title: `server-getOrderDetails omits "${field}", which the Dart model requires`,
          severity: 'HIGH', area: 'contract', endpoint: 'server-getOrderDetails',
          file: 'platter_server/lib/pages/orders_home/models/order_detail_response.g.dart',
          detail: `The waiter app declares ${field} non-nullable with no default, so a response without it throws during parsing and the order-detail screen fails to open.`,
          expected: `${field} present`, actual: 'missing or null',
        });
      }
      ctx.record(present, `order detail includes required field "${field}"`);
    }
  }
}

export const SCENARIOS = [
  { id: 'single-user-lifecycle', tables: 1, run: singleUserLifecycle },
  { id: 'multi-cart-order', tables: 1, run: multiCartOrder },
  { id: 'multi-user-table', tables: 1, run: multiUserTable },
  { id: 'concurrent-checkout', tables: 1, run: concurrentCheckout },
  { id: 'add-during-checkout', tables: 1, run: addDuringCheckout },
  { id: 'staff-races', tables: 2, run: staffRaces },
  { id: 'cart-transition-matrix', tables: 1, run: cartTransitionMatrix },
  { id: 'order-transition-matrix', tables: 3, run: orderTransitionMatrix },
  { id: 'stale-order-same-table', tables: 1, run: staleOrderSameTable },
  { id: 'staff-load', tables: 4, run: staffLoad },
  { id: 'cross-app-agreement', tables: 1, run: crossAppAgreement },
];
