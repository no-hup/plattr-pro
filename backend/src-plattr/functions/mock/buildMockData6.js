/**
 * buildMockData6.js — Generator for MockData6BigRestaurants.json
 * ============================================================================
 * Produces a large, realistic, edge-case-rich seed for the Plattr Pro emulator.
 *
 * WHY A GENERATOR (not a hand-written JSON):
 *   - Guarantees referential integrity (every variant/addon/offer/menu/order
 *     reference is asserted against the entity registry before writing).
 *   - Computes all priceInfo objects with the SAME per-component discount logic
 *     the backend uses (cart/calculateCartValue.js + genericModels/priceinfo.js),
 *     so seeded carts/orders pass the checkout validators (0.01–0.05 tolerance).
 *   - Re-runnable: regenerate any time; timestamps are relative to "now".
 *
 * TWO RESTAURANTS, modeled on real Bangalore menus:
 *   res_toit       — Toit (brewpub): pub food + house craft beers. 7.5% service
 *                    charge (matches the real menu footer).
 *   res_karavalli  — Karavalli (Taj coastal fine-dining): high-ticket coastal
 *                    South-Indian. Service charge + packaging + a loyalty
 *                    global-discount (negative charge) to exercise Charges V1.
 *
 * EDGE CASES ARE BAKED IN (not in separate shells):
 *   - Out-of-stock items; disabled / reserved / pending(valid) / pending(expired)
 *     / active / active-multi-user tables.
 *   - Sessions: active, expired, ended.  OTP 123456 everywhere.
 *   - Orders in every ORDER_STATUS (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
 *     and every PAYMENT_STATUS; cart snapshots + items spanning every
 *     FULFILLMENT_STATUS (PENDING, PREPARING, READY, SERVED, RETURNED, CANCELLED).
 *   - Live carts (doc id == tableId, NO status/cartId) for "resume + add".
 *   - Offers covering PERCENTAGE / FLAT / BOGO / FREE_ITEM × ORDER / CATEGORY /
 *     ITEM, conditions (minOrderValue, requiredItems, userHistory), maxDiscount
 *     caps, priority tiebreaks, exclusionIds, AND negative cases (expired,
 *     future, inactive, invalid scope, empty targetIds).
 *   - Variants taken from the real menus (Veg/Lamb, Basa/Seasonal,
 *     Jackfruit/Chicken/Lamb, beer Pint/Pitcher) — mandatory & optional,
 *     respectParentDiscount true & false.  Addons (nachos/soup/salad toppings)
 *     in-stock & out-of-stock.
 *
 * SCHEMA CORRECTNESS — this seed FIXES latent bugs in MockData5:
 *   - Cart items use `status` (FULFILLMENT_STATUS), NOT the dead `kitchenStatus`.
 *   - Server `role` is UPPERCASE (SERVER/KITCHEN/MANAGER/ADMIN), not "waiter".
 *   - Variants carry a top-level `name` (required by the Flutter model).
 *   - Menu items carry `nutritionalInfo` (required by platter_core MenuItem).
 *   - Offer `conditions` use only engine-honoured keys (minOrderValue,
 *     requiredItems, userHistory) — `isFirstTimeUser` is dead, modeled via
 *     userHistory.minOrderCount instead.
 *   - Cart items carry top-level categoryId/subcategoryIds so CATEGORY/ITEM
 *     offers actually match at checkout (offers/strategies/BaseOfferStrategy.js).
 *
 * USAGE:
 *   node mock/buildMockData6.js                 # writes MockData6BigRestaurants.json
 *   node mock/buildMockData6.js --out=<path>    # custom output path
 * Then import with the existing loader:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node mock/importMockData5.js --file=mock/MockData6BigRestaurants.json --clean --refresh-timestamps
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers — timestamps are Firestore export form {_seconds,_nanoseconds}.
// importMockData5 --refresh-timestamps rewrites these, but we seed sensible
// relative values so the file is usable as-is.
// ─────────────────────────────────────────────────────────────────────────────
const NOW = Math.floor(Date.now() / 1000);
const MIN = 60, HOUR = 3600, DAY = 86400;
/** Firestore Timestamp object, `offset` seconds from now (negative = past). */
const ts = (offset = 0) => ({ _seconds: NOW + offset, _nanoseconds: 0 });
/** ISO string `offset` seconds from now (offers use ISO strings). */
const iso = (offset = 0) => new Date((NOW + offset) * 1000).toISOString();

const TEST_OTP = '123456';     // matches OTP_CONFIG.LENGTH=6 + emulator hardcode
const SERVER_PW = '1234';      // matches existing test harness

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Entity registries (per restaurant) + integrity tracking.
// ─────────────────────────────────────────────────────────────────────────────
function newRestaurant(id, info, charges) {
  return {
    id,
    info,
    _charges: charges,
    menus: {}, categories: {}, subcategories: {}, menuItems: {},
    variants: {}, addons: {}, kitchens: {}, servers: {}, tables: {},
    sessions: {}, carts: {}, orders: {}, offers: {},
    config: charges ? { settings: { billing: { charges } } } : undefined,
  };
}

// ── Price builders ───────────────────────────────────────────────────────────
/** BasicPriceInfo {basePrice, discount, finalPrice}. discount is a percentage. */
function pi(basePrice, discount = 0) {
  return { basePrice, discount, finalPrice: round2(basePrice * (1 - discount / 100)) };
}
/** Variant/addon option price (its own finalPrice; parent-discount applied at cart time). */
function optPI(basePrice) {
  return { basePrice, finalPrice: basePrice, discount: 0 };
}

// ── Nutrition estimator (plausible, deterministic — no zeros) ─────────────────
function estimateNutrition(base, diet) {
  // Rough kcal scaling by price band + macro split by dietary type.
  const cal = Math.min(1200, 120 + Math.round(base * 0.9));
  if (diet === 'VEGAN') return { calories: cal, protein: Math.round(cal * 0.04), carbs: Math.round(cal * 0.14), fat: Math.round(cal * 0.03) };
  if (diet === 'VEG' || diet === 'EGG') return { calories: cal, protein: Math.round(cal * 0.05), carbs: Math.round(cal * 0.12), fat: Math.round(cal * 0.045) };
  return { calories: cal, protein: Math.round(cal * 0.08), carbs: Math.round(cal * 0.08), fat: Math.round(cal * 0.05) }; // NON_VEG
}

// ─────────────────────────────────────────────────────────────────────────────
// Definition helpers — push fully-formed docs into a restaurant registry.
// ─────────────────────────────────────────────────────────────────────────────
function defMenu(R, menuId, name, { categoryIds, menuItemIds, isActive = true, isDefault = true, order = 0 }) {
  R.menus[menuId] = { menuId, name, isActive, isDefault, categoryIds, menuItemIds, order };
}
function defCategory(R, id, name, { order = 0, subcategoryIds = [], viewType = 'list', defaultExpanded = true, description = '', image = '' }) {
  R.categories[id] = { id, name, description, image, order, subcategoryIds, viewType, defaultExpanded };
}
function defSub(R, id, name, parentCategoryId, order = 0, description = '') {
  R.subcategories[id] = { id, name, parentCategoryId, description, image: '', order };
}
function defKitchen(R, id, name, status = 'active') { R.kitchens[id] = { name, status }; }

function defVariant(R, id, name, { mandatory = false, respectParent = true, items = [], catAssoc = [], description = '', options }) {
  // options: [{id,name,price}]
  R.variants[id] = {
    id, name,
    meta: { name, description, categoryAssociatedWith: catAssoc },
    options: options.map(o => ({ id: o.id, name: o.name, priceInfo: optPI(o.price) })),
    isMandatory: mandatory,
    respectParentDiscount: respectParent,
    itemsAssociatedWith: items,
  };
}
function defAddon(R, id, name, price, { inStock = true, respectParent = false, mandatory = false, items = [], catAssoc = [], description = '' }) {
  R.addons[id] = {
    id,
    meta: { name, description, categoryAssociatedWith: catAssoc },
    priceInfo: optPI(price),
    isInStock: inStock,
    respectParentDiscount: respectParent,
    isMandatory: mandatory,
    itemsAssociatedWith: items,
  };
}

let _itemSeq = 0;
function defItem(R, id, name, base, opts = {}) {
  const {
    cat, sub, subs, disc = 0, diet = 'VEG', spice = 0, vegan = false,
    stock = true, cust = null, variants = [], addons = [], img = '',
    allergens = [], desc = '', nutri = null, categoryName = '',
  } = opts;
  const subcategoryIds = subs || (sub ? [sub] : []);
  const isCustomizable = cust === null ? (variants.length > 0 || addons.length > 0) : cust;
  R.menuItems[id] = {
    menuItemId: id,
    categoryId: cat,
    primarySubcategoryId: sub || (subcategoryIds[0] || null),
    subcategoryIds,
    meta: {
      name,
      description: desc,
      categoryName,
      primarySubcategoryName: sub ? (R.subcategories[sub] ? R.subcategories[sub].name : '') : '',
      dietaryType: vegan ? 'VEGAN' : diet,
      spiceLevel: spice,
      isVegan: vegan,
      image: img,
    },
    priceInfo: pi(base, disc),
    variants: variants.map(vid => ({ id: vid, name: R.variants[vid] ? R.variants[vid].name : vid })),
    addons: addons.slice(),
    isInStock: stock,
    isCustomizable,
    nutritionalInfo: nutri || estimateNutrition(base, vegan ? 'VEGAN' : diet),
    allergenTags: allergens,
    restaurantId: R.id,
    lastUpdated: ts(-DAY),
    order: _itemSeq++,
  };
  return id;
}

function defServer(R, id, name, role, email, { phone = '', status = 'active' } = {}) {
  R.servers[id] = { name, role, status, email, phoneNumber: phone, password: SERVER_PW, profileImageUrl: '', createdAt: ts(-30 * DAY), updatedAt: ts(-DAY) };
}

function defTable(R, id, number, capacity, status, extra = {}) {
  const t = { number, capacity, status };
  // Default OTP block (valid for 60 min — emulator validity) unless overridden.
  if (extra.otp === 'valid') t.currentOTP = { code: TEST_OTP, createdAt: ts(-5 * MIN), expiresAt: ts(55 * MIN) };
  else if (extra.otp === 'expired') t.currentOTP = { code: TEST_OTP, createdAt: ts(-2 * HOUR), expiresAt: ts(-1 * HOUR) };
  else if (extra.otp === 'none') t.currentOTP = null;
  else t.currentOTP = { code: TEST_OTP, createdAt: ts(-5 * MIN), expiresAt: ts(55 * MIN) };

  if (extra.primaryCustomer) t.primaryCustomer = extra.primaryCustomer;
  if (extra.occupiedBy) t.occupiedBy = extra.occupiedBy;
  if (extra.assignedServerId) t.assignedServerId = extra.assignedServerId;
  if (extra.activeOrderId) t.activeOrderId = extra.activeOrderId;
  if (status === 'active') { t.lastActivity = ts(-10 * MIN); t.firstScannedAt = ts(-40 * MIN); }
  if (extra.section) t.section = extra.section;
  if (extra.floor) t.floor = extra.floor;
  R.tables[id] = t;
}

function defSession(R, id, tableId, primaryUserId, users, status, { ageMin = 30, ttlHours = 4 } = {}) {
  R.sessions[id] = {
    tableId,
    primaryUserId,
    users,
    status, // 'active' | 'ended' | 'expired'
    createdAt: ts(-ageMin * MIN),
    updatedAt: ts(-5 * MIN),
    expiresAt: status === 'active' ? ts(ttlHours * HOUR - ageMin * MIN) : ts(-(ageMin * MIN) + ttlHours * HOUR - ageMin * MIN),
  };
  // expired/ended: expiresAt in the past
  if (status !== 'active') R.sessions[id].expiresAt = ts(-(ageMin - ttlHours * 60) * MIN);
  return id;
}

// ── Cart item builder with full per-component price math ──────────────────────
// selVariants: [{variantId, optionId}]   selAddonIds: [addonId]
function buildCartItem(R, cartItemId, menuItemId, qty, status, { selVariants = [], selAddonIds = [], notes = '' } = {}) {
  const mi = R.menuItems[menuItemId];
  if (!mi) throw new Error(`buildCartItem: unknown menuItem ${menuItemId}`);
  const itemDiscount = mi.priceInfo.discount;
  const itemBase = mi.priceInfo.basePrice;
  const itemFinal = mi.priceInfo.finalPrice;

  // Variants
  const variantDetails = [];
  const selectedVariantsMap = {};
  let varBase = 0, varFinal = 0;
  for (const sv of selVariants) {
    const v = R.variants[sv.variantId];
    if (!v) throw new Error(`buildCartItem: unknown variant ${sv.variantId}`);
    const opt = v.options.find(o => o.id === sv.optionId);
    if (!opt) throw new Error(`buildCartItem: unknown option ${sv.optionId} on ${sv.variantId}`);
    const oBase = opt.priceInfo.basePrice;
    const oFinal = v.respectParentDiscount ? round2(oBase * (1 - itemDiscount / 100)) : opt.priceInfo.finalPrice;
    varBase += oBase; varFinal += oFinal;
    selectedVariantsMap[sv.variantId] = sv.optionId;
    variantDetails.push({
      id: v.id, name: v.name, isMandatory: v.isMandatory, respectParentDiscount: v.respectParentDiscount,
      selected_variant_id: opt.id, selected_variant_name: opt.name, priceInfo: { basePrice: oBase, discount: v.respectParentDiscount ? itemDiscount : 0, finalPrice: oFinal },
    });
  }
  // Addons
  const addonDetails = [];
  let addBase = 0, addFinal = 0;
  for (const aid of selAddonIds) {
    const a = R.addons[aid];
    if (!a) throw new Error(`buildCartItem: unknown addon ${aid}`);
    const aBase = a.priceInfo.basePrice;
    const aFinal = a.respectParentDiscount ? round2(aBase * (1 - itemDiscount / 100)) : a.priceInfo.finalPrice;
    addBase += aBase; addFinal += aFinal;
    addonDetails.push({ id: a.id, name: a.meta.name, respectParentDiscount: a.respectParentDiscount, priceInfo: { basePrice: aBase, discount: a.respectParentDiscount ? itemDiscount : 0, finalPrice: aFinal } });
  }

  const q = qty;
  const totalBasePerUnit = itemBase + varBase + addBase;
  const totalFinalPerUnit = itemFinal + varFinal + addFinal;
  const priceInfo = {
    itemBasePrice: round2(itemBase * q),
    itemFinalPrice: round2(itemFinal * q),
    totalVariantBasePrice: round2(varBase * q),
    totalVariantFinalPrice: round2(varFinal * q),
    totalAddonBasePrice: round2(addBase * q),
    totalAddonFinalPrice: round2(addFinal * q),
    totalBasePrice: round2(totalBasePerUnit * q),
    finalPrice: round2(totalFinalPerUnit * q),
    discount: itemDiscount,
    discountAmount: round2(totalBasePerUnit * q - totalFinalPerUnit * q),
  };

  // Embedded menuItem snapshot (what addItemToCart stores) — trimmed but sufficient.
  const embeddedMenuItem = {
    menuItemId: mi.menuItemId,
    categoryId: mi.categoryId,
    primarySubcategoryId: mi.primarySubcategoryId,
    subcategoryIds: mi.subcategoryIds,
    meta: mi.meta,
    priceInfo: mi.priceInfo,
    isInStock: mi.isInStock,
    isCustomizable: mi.isCustomizable,
  };

  return {
    cartItemId,                      // numeric, monotonic per cart
    menuItemId,
    categoryId: mi.categoryId,       // top-level for offer matching
    subcategoryIds: mi.subcategoryIds,
    name: mi.meta.name,
    menuItem: embeddedMenuItem,
    quantity: q,
    selectedVariants: selectedVariantsMap,
    selectedVariantsDetails: variantDetails,
    selectedAddons: selAddonIds.slice(),
    selectedAddonsDetails: addonDetails,
    priceInfo,
    notes,
    status,                          // FULFILLMENT_STATUS — NOT kitchenStatus
  };
}

// Cart total (CartTotalPriceInfo) — sum non-cancelled items.
function cartTotals(items) {
  let basePrice = 0, finalPrice = 0, varBase = 0, addBase = 0;
  for (const it of items) {
    if (it.status === 'CANCELLED') continue;
    basePrice += it.priceInfo.totalBasePrice;
    finalPrice += it.priceInfo.finalPrice;
    varBase += it.priceInfo.totalVariantBasePrice;
    addBase += it.priceInfo.totalAddonBasePrice;
  }
  const totalDiscountAmount = Math.max(0, round2(basePrice - finalPrice));
  return {
    basePrice: round2(basePrice),
    finalPrice: round2(finalPrice),
    totalVariantBasePrice: round2(varBase),
    totalAddonBasePrice: round2(addBase),
    totalDiscount: basePrice > 0 ? round2((totalDiscountAmount / basePrice) * 100) : 0,
    totalDiscountAmount,
  };
}

// Live cart (doc id == tableId): NO status / cartId / statusHistory.
function defLiveCart(R, tableId, sessionId, items) {
  R.carts[tableId] = {
    restaurantId: R.id,
    tableId,
    sessionId,
    items,
    priceInfo: cartTotals(items),
    lastUpdated: ts(-2 * MIN),
  };
}

// Cart snapshot for order.carts[] — live cart PLUS checkout-time fields.
function cartSnapshot(R, cartId, status, items, { userId, notes = '', prepMin = null, assignedTo = null, ageMin = 20 } = {}) {
  const snap = {
    restaurantId: R.id,
    cartId,
    status, // FULFILLMENT_STATUS (cart-level)
    items,
    priceInfo: cartTotals(items),
    statusHistory: [
      { status: 'PENDING', timestamp: ts(-ageMin * MIN), userId, notes: '' },
    ],
    checkoutTime: ts(-ageMin * MIN),
    notes,
    estimatedPrepTime: prepMin == null ? (10 + items.reduce((s, i) => s + 2 * i.quantity, 0)) : prepMin,
    assignedTo,
  };
  // Walk a realistic status history toward the current status.
  const chain = ['PENDING', 'PREPARING', 'READY', 'SERVED'];
  const idx = chain.indexOf(status);
  if (idx > 0) {
    for (let i = 1; i <= idx; i++) snap.statusHistory.push({ status: chain[i], timestamp: ts(-(ageMin - i * 4) * MIN), userId, notes: '' });
    snap.assignedTo = assignedTo || userId;
  }
  if (status === 'CANCELLED') snap.statusHistory.push({ status: 'CANCELLED', timestamp: ts(-(ageMin - 4) * MIN), userId, notes: 'Cancelled by server' });
  if (status === 'RETURNED') { snap.statusHistory.push({ status: 'SERVED', timestamp: ts(-(ageMin - 8) * MIN), userId, notes: '' }, { status: 'RETURNED', timestamp: ts(-(ageMin - 12) * MIN), userId, notes: 'Sent back to kitchen' }); }
  return snap;
}

// Normalize cart snapshot items into order.items[] (BasicPriceInfo, drop CANCELLED).
function normalizeForOrder(snapshots) {
  const out = [];
  for (const snap of snapshots) {
    for (const it of snap.items) {
      if (it.status === 'CANCELLED' || !it.menuItemId) continue;
      out.push({
        menuItemId: it.menuItemId,
        name: it.name,
        description: it.menuItem?.meta?.description || '',
        quantity: it.quantity,
        priceInfo: { basePrice: round2(it.priceInfo.itemBasePrice), discount: it.priceInfo.discount, finalPrice: round2(it.priceInfo.itemFinalPrice) },
        selectedVariants: it.selectedVariants || {},
        selectedVariantsDetails: it.selectedVariantsDetails || [],
        selectedAddons: it.selectedAddons || [],
        selectedAddonsDetails: it.selectedAddonsDetails || [],
        cartItemId: it.cartItemId || 0,
        checkoutTime: ts(-15 * MIN),
        status: it.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
      });
    }
  }
  return out;
}

// Charges V1 — percentage overlays on post-offer final price.
function calcCharges(postOfferFinal, chargesConfig) {
  if (!Array.isArray(chargesConfig) || chargesConfig.length === 0) return { charges: [], chargesTotal: 0 };
  const charges = chargesConfig
    .filter(c => c && typeof c.type === 'string' && c.type && typeof c.percentage === 'number')
    .map(c => ({ type: c.type, percentage: c.percentage, amount: round2(postOfferFinal * c.percentage / 100) }));
  const chargesTotal = round2(charges.reduce((s, c) => s + c.amount, 0));
  return { charges, chargesTotal };
}

// Full order doc.
function defOrder(R, orderId, orderNumber, { tableId, sessionId, customerId, orderStatus, paymentStatus, snapshots, appliedOffer = null, offerDiscount = 0, assignedServer = null, notes = '', ageMin = 30 }) {
  const items = normalizeForOrder(snapshots);
  let basePrice = 0, finalPrice = 0, varB = 0, addB = 0;
  for (const s of snapshots) {
    basePrice += s.priceInfo.basePrice;
    finalPrice += s.priceInfo.finalPrice;
  }
  basePrice = round2(basePrice); finalPrice = round2(finalPrice);
  const itemDiscountAmount = Math.max(0, round2(basePrice - finalPrice));
  const postOfferFinal = Math.max(0, round2(finalPrice - offerDiscount));
  const { charges, chargesTotal } = calcCharges(postOfferFinal, R._charges || []);
  const priceInfo = {
    basePrice,
    finalPrice: postOfferFinal,
    totalDiscount: basePrice > 0 ? round2((itemDiscountAmount / basePrice) * 100) : 0,
    totalDiscountAmount: round2(itemDiscountAmount + offerDiscount),
    offerDiscount: round2(offerDiscount),
  };
  if (charges.length > 0) { priceInfo.charges = charges; priceInfo.chargesTotal = chargesTotal; }

  R.orders[orderId] = {
    orderId,
    restaurantId: R.id,
    tableId,
    orderNumber,
    orderStatus,                 // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
    paymentStatus,               // unpaid | partially_paid | paid
    carts: snapshots,
    items,
    priceInfo,
    createdAt: ts(-ageMin * MIN),
    updatedAt: ts(-5 * MIN),
    isActive: orderStatus === 'IN_PROGRESS' || orderStatus === 'PENDING',
    assignedServer,
    notes,
    sessionId,
    customerId,
    appliedOffer,
  };
  return orderId;
}

// Offer doc. type: PERCENTAGE|FLAT|BOGO|FREE_ITEM, scope: ORDER|CATEGORY|ITEM.
function defOffer(R, id, title, { type, scope, targetIds = [], exclusionIds = [], benefit, conditions = {}, isActive = true, startOffset = -30 * DAY, endOffset = 180 * DAY, priority, description = '', code }) {
  const o = {
    id, title, description,
    type, scope, targetIds,
    isActive,
    validity: { startDate: iso(startOffset), endDate: iso(endOffset) },
    conditions,
    benefit,
  };
  if (exclusionIds.length) o.exclusionIds = exclusionIds;
  if (priority != null) o.priority = priority;
  if (code) o.code = code;
  R.offers[id] = o;
  return id;
}

// ═════════════════════════════════════════════════════════════════════════════
// RESTAURANT 1 — TOIT (brewpub)
// ═════════════════════════════════════════════════════════════════════════════
const toit = newRestaurant('res_toit',
  { name: 'Toit Brewpub', address: '298, 100 Feet Rd, Indiranagar, Bengaluru', phone: '8043416666', email: 'hello@toit.in', location: { _latitude: 12.9783, _longitude: 77.6408 }, cuisine: 'Brewpub · European · Pub Food', currency: 'INR', timezone: 'Asia/Kolkata' },
  [{ type: 'SERVICE_CHARGE', percentage: 7.5 }]
);

// Kitchens (routing is by category convention; these back the kitchen/chef path)
defKitchen(toit, 'kit_toit_food', 'Main Kitchen');
defKitchen(toit, 'kit_toit_pizza', 'Wood-Fired Pizza Oven');
defKitchen(toit, 'kit_toit_bar', 'Brewery & Bar');
defKitchen(toit, 'kit_toit_dessert', 'Dessert Station', 'inactive'); // edge: inactive kitchen

// Categories
defCategory(toit, 'tc_bites', 'Kudix Bites', { order: 0, subcategoryIds: ['ts_bites'], description: 'The second best companion at Toit, after beer' });
defCategory(toit, 'tc_platters', 'Toit Platters', { order: 1, subcategoryIds: ['ts_platters'] });
defCategory(toit, 'tc_appetisers', 'Appetisers', { order: 2, subcategoryIds: ['ts_app_veg', 'ts_app_chicken', 'ts_app_seafood', 'ts_app_meat'] });
defCategory(toit, 'tc_pizzas', 'Wood-Fired Pizzas', { order: 3, subcategoryIds: ['ts_pizza_veg', 'ts_pizza_nonveg'], viewType: 'carousel' });
defCategory(toit, 'tc_light', 'Light Meals', { order: 4, subcategoryIds: ['ts_soups', 'ts_salads'] });
defCategory(toit, 'tc_large', 'Large Plates', { order: 5, subcategoryIds: ['ts_large_veg', 'ts_large_nonveg', 'ts_burgers'] });
defCategory(toit, 'tc_brews', 'Craft Beers & Bar', { order: 6, subcategoryIds: ['ts_brew_wheat', 'ts_brew_ale', 'ts_brew_lager', 'ts_brew_stout', 'ts_pitchers'] });
defCategory(toit, 'tc_desserts', 'Desserts', { order: 7, subcategoryIds: ['ts_desserts'] });
defCategory(toit, 'tc_bestsellers', 'Toit Favourites', { order: 8, subcategoryIds: ['ts_bestsellers'], viewType: 'carousel', defaultExpanded: true, description: 'Most-loved plates & pints' });

// Subcategories
defSub(toit, 'ts_bites', 'Bar Bites', 'tc_bites', 0);
defSub(toit, 'ts_platters', 'Sharing Platters', 'tc_platters', 0);
defSub(toit, 'ts_app_veg', 'Vegetarian', 'tc_appetisers', 0);
defSub(toit, 'ts_app_chicken', 'Chicken', 'tc_appetisers', 1);
defSub(toit, 'ts_app_seafood', 'Seafood', 'tc_appetisers', 2);
defSub(toit, 'ts_app_meat', 'Red Meat & Pork', 'tc_appetisers', 3);
defSub(toit, 'ts_pizza_veg', 'Vegetarian Pizzas', 'tc_pizzas', 0);
defSub(toit, 'ts_pizza_nonveg', 'Non-Veg Pizzas', 'tc_pizzas', 1);
defSub(toit, 'ts_soups', 'Soups', 'tc_light', 0);
defSub(toit, 'ts_salads', 'Salads', 'tc_light', 1);
defSub(toit, 'ts_large_veg', 'Vegetarian Mains', 'tc_large', 0);
defSub(toit, 'ts_large_nonveg', 'Non-Veg Mains', 'tc_large', 1);
defSub(toit, 'ts_burgers', 'Burgers & Sandwiches', 'tc_large', 2);
defSub(toit, 'ts_brew_wheat', 'Wheat Beers', 'tc_brews', 0);
defSub(toit, 'ts_brew_ale', 'Ales & IPAs', 'tc_brews', 1);
defSub(toit, 'ts_brew_lager', 'Lagers', 'tc_brews', 2);
defSub(toit, 'ts_brew_stout', 'Stouts & Dark', 'tc_brews', 3);
defSub(toit, 'ts_pitchers', 'Pitchers', 'tc_brews', 4);
defSub(toit, 'ts_desserts', 'Desserts', 'tc_desserts', 0);
defSub(toit, 'ts_bestsellers', 'Favourites', 'tc_bestsellers', 0);

// ── Variants (from the real menu's per-style pricing) ──
defVariant(toit, 'tv_scotch_egg', 'Choice', { mandatory: true, respectParent: true, items: ['ti_scotch_eggs'], catAssoc: ['tc_appetisers'], description: 'Veg caponata or lamb mince', options: [{ id: 'opt_veg', name: 'Veg Caponata', price: 0 }, { id: 'opt_lamb', name: 'Lamb Mince', price: 100 }] });
defVariant(toit, 'tv_panfish', 'Fish', { mandatory: true, respectParent: true, items: ['ti_panfried_fish'], catAssoc: ['tc_appetisers'], options: [{ id: 'opt_basa', name: 'Basa', price: 0 }, { id: 'opt_seasonal', name: 'Seasonal Catch', price: 125 }] });
defVariant(toit, 'tv_appam_stew', 'Protein', { mandatory: true, respectParent: false, items: ['ti_appam_stew'], catAssoc: ['tc_large'], options: [{ id: 'opt_veg', name: 'Vegetable', price: 0 }, { id: 'opt_chicken', name: 'Chicken', price: 75 }, { id: 'opt_lamb', name: 'Lamb', price: 100 }] });
defVariant(toit, 'tv_donne', 'Protein', { mandatory: true, respectParent: false, items: ['ti_donne_biryani'], catAssoc: ['tc_large'], options: [{ id: 'opt_jackfruit', name: 'Tender Jackfruit', price: 0 }, { id: 'opt_chicken', name: 'Chicken', price: 50 }, { id: 'opt_lamb', name: 'Lamb', price: 100 }] });
defVariant(toit, 'tv_fishchips', 'Fish', { mandatory: true, respectParent: true, items: ['ti_fish_chips'], catAssoc: ['tc_large'], options: [{ id: 'opt_basa', name: 'Basa', price: 0 }, { id: 'opt_seasonal', name: 'Seasonal Catch', price: 175 }] });
defVariant(toit, 'tv_goan_curry', 'Choice', { mandatory: true, respectParent: false, items: ['ti_goan_curry'], catAssoc: ['tc_large'], options: [{ id: 'opt_fish', name: 'Fish', price: 0 }, { id: 'opt_prawns', name: 'Prawns', price: 50 }] });
// Beer pour size — optional, free upgrade modeled as price deltas; respectParent false
defVariant(toit, 'tv_pour', 'Pour Size', { mandatory: true, respectParent: false, items: ['ti_tintin', 'ti_weiss', 'ti_basmati_blonde', 'ti_dark_knight', 'ti_colonial', 'ti_toit_red'], catAssoc: ['tc_brews'], description: 'Half pint, pint or mug', options: [{ id: 'opt_half', name: 'Half Pint (330ml)', price: 0 }, { id: 'opt_pint', name: 'Pint (500ml)', price: 60 }, { id: 'opt_mug', name: 'Mug (1L)', price: 150 }] });

// ── Addons ──
defAddon(toit, 'ta_jalapeno_sauce', 'Jalapeño Cheese Sauce', 50, { items: ['ti_nachos'], catAssoc: ['tc_appetisers'] });
defAddon(toit, 'ta_chicken_mince', 'Chicken Mince', 75, { items: ['ti_nachos'], catAssoc: ['tc_appetisers'] });
defAddon(toit, 'ta_bacon', 'Bacon', 100, { items: ['ti_nachos', 'ti_minestrone', 'ti_farmers_salad'], catAssoc: ['tc_appetisers', 'tc_light'] });
defAddon(toit, 'ta_soup_chicken', 'Pulled Chicken', 55, { items: ['ti_minestrone'], catAssoc: ['tc_light'], respectParent: true });
defAddon(toit, 'ta_salad_chicken', 'Grilled Chicken', 50, { items: ['ti_farmers_salad'], catAssoc: ['tc_light'], respectParent: true });
defAddon(toit, 'ta_salad_prawns', 'Prawns', 150, { items: ['ti_quinoa_salad'], catAssoc: ['tc_light'], inStock: false }); // edge: out-of-stock addon
defAddon(toit, 'ta_extra_cheese', 'Extra Cheese', 60, { items: ['ti_margherita', 'ti_veg_fellows', 'ti_pork_pepperoni'], catAssoc: ['tc_pizzas'] });
defAddon(toit, 'ta_truffle_drizzle', 'Truffle Oil Drizzle', 80, { items: ['ti_tartufo', 'ti_margherita'], catAssoc: ['tc_pizzas'], respectParent: true });

// ── Items: Kudix Bites (₹125) ──
const C = 'Toit Brewpub';
defItem(toit, 'ti_goldfingers', 'Chilli-Dusted Goldfingers', 125, { cat: 'tc_bites', sub: 'ts_bites', diet: 'VEG', spice: 1, desc: 'Old Bangalore fried rice street snack', categoryName: C });
defItem(toit, 'ti_truffle_popcorn', 'Truffle Popcorn', 125, { cat: 'tc_bites', sub: 'ts_bites', diet: 'VEG', desc: 'Popcorn finished with truffle butter and parmesan', categoryName: C });
defItem(toit, 'ti_banana_slivers', 'Banana Slivers', 125, { cat: 'tc_bites', sub: 'ts_bites', vegan: true, desc: 'Salted crispy fried raw banana', categoryName: C });
defItem(toit, 'ti_lotus_seeds', 'Peri-Peri Lotus Seeds', 125, { cat: 'tc_bites', sub: 'ts_bites', vegan: true, spice: 2, desc: 'Pan-tossed puffed lotus seeds', categoryName: C });

// ── Platters ──
defItem(toit, 'ti_cheese_board', 'Artisanal Cheese Board', 650, { cat: 'tc_platters', sub: 'ts_platters', diet: 'VEG', desc: 'Local hill cheeses, Camembert, Montasio, Gouda with fig compote', categoryName: C, allergens: ['dairy', 'gluten'] });
defItem(toit, 'ti_pita_platter', 'Pita Platter', 450, { cat: 'tc_platters', sub: 'ts_platters', diet: 'VEG', desc: "Za'atar pita, hummus two ways, muhammara, labneh, falafel", categoryName: C, allergens: ['gluten', 'sesame'] });
defItem(toit, 'ti_liver_special', 'DIY... Toit Liver Special', 300, { cat: 'tc_platters', sub: 'ts_platters', diet: 'NON_VEG', desc: 'Chicken liver pâté, bacon crumble, fig compote, crostini', categoryName: C });

// ── Appetisers: Veg ──
defItem(toit, 'ti_beet_bruschetta', 'Beetroot & Goat Cheese Bruschetta', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', desc: 'Roasted beetroot, goat cheese, caramelised walnuts', categoryName: C });
defItem(toit, 'ti_puliyogare_poppers', 'Puliyogare Poppers', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', spice: 1, desc: 'South Indian tamarind rice arancini with parmesan', categoryName: C });
defItem(toit, 'ti_bbq_mushrooms', 'BBQ Madras Mushrooms', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', vegan: true, spice: 2, desc: 'Mushrooms in South Indian BBQ tamarind glaze', categoryName: C });
defItem(toit, 'ti_okra_chips', 'Okra Podi Chips', 225, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', spice: 1, desc: 'Ladies finger hot chips with curry leaves & podi', categoryName: C });
defItem(toit, 'ti_broccoli_cheddar', 'Broccoli Cheddarmelt', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', desc: 'Charred broccoli, garlicky cheese, olive tapenade', categoryName: C });
defItem(toit, 'ti_gunpowder_fries', 'Cheesy Gunpowder Fries', 225, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', spice: 2, disc: 10, desc: 'Fries with secret red chilli podi & mango pickle mayo', categoryName: C });
defItem(toit, 'ti_cajun_paneer', 'Cajun Spiced Cottage Cheese', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', spice: 2, desc: 'Grilled cottage cheese, green pea dip', categoryName: C });
defItem(toit, 'ti_baby_corn', 'Grilled Baby Corn', 225, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', desc: 'Baby corn a la plancha with roasted quinoa', categoryName: C });
defItem(toit, 'ti_mac_balls', 'Mac & Truffle Cheese Balls', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', desc: 'Bite-sized mac & cheese with truffle', categoryName: C });
defItem(toit, 'ti_nachos', 'Toit Baked Nachos', 250, { cat: 'tc_appetisers', sub: 'ts_app_veg', diet: 'VEG', spice: 1, addons: ['ta_jalapeno_sauce', 'ta_chicken_mince', 'ta_bacon'], desc: 'Baked wheat nachos, cream cheese sauce, salsa, refried beans', categoryName: C });
// ── Appetisers: Chicken ──
defItem(toit, 'ti_scotch_eggs', 'Deconstructed Scotch Eggs', 275, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'EGG', variants: ['tv_scotch_egg'], desc: 'Soft-boiled eggs, mash, veg caponata or lamb mince', categoryName: C, allergens: ['egg'] });
defItem(toit, 'ti_wings_bbq', 'Chicken Wings Smoky BBQ', 300, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', spice: 1, desc: 'Classic wings in smoky BBQ sauce', categoryName: C });
defItem(toit, 'ti_wingettes', 'Stuffed Chicken Wingettes', 350, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', spice: 2, desc: 'Piquant mince stuffing on red chilli sambal', categoryName: C });
defItem(toit, 'ti_chicken_62', 'Chicken 62', 300, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', spice: 2, desc: 'A tribute to South Indian fried chicken', categoryName: C });
defItem(toit, 'ti_andhra_chilli_chicken', 'Andhra Chilli Chicken', 300, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', spice: 3, desc: 'Boneless chicken in deadly Andhra green chilli masala', categoryName: C });
defItem(toit, 'ti_pesto_chicken', 'Pesto Chicken Strips', 300, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', desc: 'Chicken supreme, basil pesto, sundried tomato', categoryName: C });
defItem(toit, 'ti_pepper_drumsticks', 'Pepper Garlic Drumsticks', 400, { cat: 'tc_appetisers', sub: 'ts_app_chicken', diet: 'NON_VEG', spice: 2, desc: 'Grilled drumsticks with pepper, garlic & rosemary', categoryName: C });
// ── Appetisers: Seafood ──
defItem(toit, 'ti_salmon_bruschetta', 'Smoked Salmon Bruschetta', 450, { cat: 'tc_appetisers', sub: 'ts_app_seafood', diet: 'NON_VEG', desc: 'Smoked salmon, capers, cream cheese on toast', categoryName: C, allergens: ['fish', 'dairy', 'gluten'] });
defItem(toit, 'ti_calamari', 'Calamari Frito', 400, { cat: 'tc_appetisers', sub: 'ts_app_seafood', diet: 'NON_VEG', desc: 'Crunchy calamari tempura, creamy dip', categoryName: C });
defItem(toit, 'ti_beer_prawns', 'Beer Battered Prawns', 450, { cat: 'tc_appetisers', sub: 'ts_app_seafood', diet: 'NON_VEG', desc: 'Prawns in Tint-In-Wit beer batter, spicy mayo', categoryName: C, stock: false }); // edge: 86'd
defItem(toit, 'ti_panfried_fish', 'Toit Pan-Fried Fish', 325, { cat: 'tc_appetisers', sub: 'ts_app_seafood', diet: 'NON_VEG', spice: 1, variants: ['tv_panfish'], desc: 'Mustard-coriander-green chilli fish, beetroot dip', categoryName: C });
// ── Appetisers: Red Meat & Pork ──
defItem(toit, 'ti_pork_ribs', 'Pork Ribs', 425, { cat: 'tc_appetisers', sub: 'ts_app_meat', diet: 'NON_VEG', desc: "Slow cooked ribs, sweet 'n' spicy sauce", categoryName: C });
defItem(toit, 'ti_haleem_samosa', 'Haleem Samosa', 400, { cat: 'tc_appetisers', sub: 'ts_app_meat', diet: 'NON_VEG', spice: 1, desc: 'Hyderabad-style lamb pâté samosa, tamarind sauce', categoryName: C });
defItem(toit, 'ti_pepper_mutton', 'West Coast Pepper Mutton', 450, { cat: 'tc_appetisers', sub: 'ts_app_meat', diet: 'NON_VEG', spice: 3, desc: 'Mangalorean boneless mutton, black pepper, curry leaf', categoryName: C });
defItem(toit, 'ti_kerala_beef', 'Kerala Beef Fry', 325, { cat: 'tc_appetisers', sub: 'ts_app_meat', diet: 'NON_VEG', spice: 2, desc: 'Beef stir-fried with coconut chips on parottas', categoryName: C });

// ── Pizzas: Veg ──
defItem(toit, 'ti_margherita', 'Margherita', 475, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', diet: 'VEG', addons: ['ta_extra_cheese', 'ta_truffle_drizzle'], disc: 10, desc: 'The classic vegetarian pizza', categoryName: C, allergens: ['gluten', 'dairy'] });
defItem(toit, 'ti_veg_fellows', 'Veg Fellows', 550, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', diet: 'VEG', addons: ['ta_extra_cheese'], desc: 'Peppers, olives, sun-dried tomatoes, leeks, jalapeños', categoryName: C });
defItem(toit, 'ti_tartufo', 'Tartufo', 550, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', diet: 'VEG', addons: ['ta_truffle_drizzle'], desc: 'Signature burnt garlic & mushroom, truffle oil', categoryName: C });
defItem(toit, 'ti_vegan_fellows', 'Vegan Fellows', 550, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', vegan: true, desc: 'Kale, broccoli, smoked peppers, cashew cheese', categoryName: C });
defItem(toit, 'ti_pesto_veggies', 'Pesto Grilled Veggies', 550, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', diet: 'VEG', desc: 'Basil pesto base, zucchini, peppers, goat cheese', categoryName: C });
defItem(toit, 'ti_feta_asparagus', 'Roasted Onion, Feta & Asparagus', 575, { cat: 'tc_pizzas', sub: 'ts_pizza_veg', diet: 'VEG', desc: 'Roasted onion petals, asparagus, crumbled feta', categoryName: C });
// ── Pizzas: Non-Veg ──
defItem(toit, 'ti_spicy_chicken_pizza', 'Spicy Chicken', 600, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', spice: 2, desc: 'Buffalo mozzarella, spicy chicken, jalapeños', categoryName: C });
defItem(toit, 'ti_bbq_chicken_pizza', 'BBQ Chicken', 600, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', disc: 10, desc: 'Homemade BBQ sauce, chicken chunks, onions', categoryName: C });
defItem(toit, 'ti_shrimp_pizza', 'Shrimp Pizza', 675, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', desc: 'Crème fraîche, mustard-marinated shrimp, cheddar', categoryName: C, allergens: ['shellfish'] });
defItem(toit, 'ti_pork_pepperoni', 'Pork Pepperoni', 650, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', addons: ['ta_extra_cheese'], desc: 'Sliced pork salami — best with beer', categoryName: C });
defItem(toit, 'ti_goan_sausage_pizza', 'Goan Sausage', 675, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', spice: 1, desc: 'Traditional Goan pork sausage & mozzarella', categoryName: C });
defItem(toit, 'ti_pulled_beef_pizza', 'Juicy Pulled Beef', 625, { cat: 'tc_pizzas', sub: 'ts_pizza_nonveg', diet: 'NON_VEG', desc: 'Slow-cooked pulled beef, shoestring potatoes', categoryName: C });

// ── Light Meals: Soups ──
defItem(toit, 'ti_mushroom_veloute', 'Mushroom & Leek Velouté', 250, { cat: 'tc_light', sub: 'ts_soups', diet: 'VEG', desc: 'Field mushroom and leek soup', categoryName: C });
defItem(toit, 'ti_minestrone', 'Minestrone Soup For The Soul', 375, { cat: 'tc_light', sub: 'ts_soups', diet: 'VEG', addons: ['ta_soup_chicken', 'ta_bacon'], desc: 'Paysanne veggies, tomato, oregano, orzo broth', categoryName: C });
defItem(toit, 'ti_chicken_soup', 'Chicken Soup For The Toit', 300, { cat: 'tc_light', sub: 'ts_soups', diet: 'NON_VEG', desc: 'Chicken, carrot & leek broth, mini chicken sandwich', categoryName: C });
// ── Light Meals: Salads ──
defItem(toit, 'ti_watermelon_salad', 'Watermelon & Feta Salad', 275, { cat: 'tc_light', sub: 'ts_salads', diet: 'VEG', desc: 'Watermelon, Greek feta, rocket, pickled olives', categoryName: C });
defItem(toit, 'ti_tofu_salad', 'Tofu & Glass Noodle Salad', 275, { cat: 'tc_light', sub: 'ts_salads', vegan: true, spice: 1, desc: 'Tofu, glass noodles, peanut butter sesame dressing', categoryName: C });
defItem(toit, 'ti_farmers_salad', 'Farmer’s Market Salad', 275, { cat: 'tc_light', sub: 'ts_salads', diet: 'VEG', addons: ['ta_salad_chicken', 'ta_bacon'], desc: 'Mixed greens, cherry tomato, corn, avocado, walnuts', categoryName: C });
defItem(toit, 'ti_quinoa_salad', 'Beetroot, Orange & Quinoa Salad', 275, { cat: 'tc_light', sub: 'ts_salads', vegan: true, addons: ['ta_salad_prawns'], desc: 'Beetroot, mandarin, rocket, quinoa, seeds', categoryName: C });

// ── Large Plates: Veg ──
defItem(toit, 'ti_focaccia', 'Focaccia Tartine', 350, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', desc: 'Open focaccia, smoked peppers, leek, Camembert fondue', categoryName: C });
defItem(toit, 'ti_aglio_olio', 'Pasta Aglio e Olio', 350, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', spice: 1, desc: 'Spaghetti, garlic, olive oil, veggies, sundried tomato', categoryName: C });
defItem(toit, 'ti_risotto', 'Edamame & Asparagus Risotto', 400, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', desc: 'Arborio risotto, edamame, asparagus, forest mushroom', categoryName: C });
defItem(toit, 'ti_agnoletti', 'Spinach & Mascarpone Agnoletti', 400, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', desc: 'Ravioli, spinach, mascarpone, saffron parmesan cream', categoryName: C });
defItem(toit, 'ti_corn_steak', 'Corn & Jalapeño Steak', 400, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', spice: 2, desc: 'Cornmeal steak, mamarosa veggies, roasted tomato', categoryName: C });
defItem(toit, 'ti_tofu_bowl', 'Hot ‘n’ Sour Tofu Bowl', 400, { cat: 'tc_large', sub: 'ts_large_veg', vegan: true, spice: 2, desc: 'Silken tofu, scallion rice, pak choi, Napa cabbage', categoryName: C });
defItem(toit, 'ti_tagine', 'Moroccan Vegetable Tagine', 400, { cat: 'tc_large', sub: 'ts_large_veg', vegan: true, spice: 1, desc: 'Veggie tagine, couscous, hummus, pita, mint toum', categoryName: C });
defItem(toit, 'ti_mango_curry', 'Potato & Green Mango Curry', 350, { cat: 'tc_large', sub: 'ts_large_veg', vegan: true, spice: 2, desc: 'Baby potato & raw mango sweet-sour gravy, rice/appams', categoryName: C });
defItem(toit, 'ti_appam_stew', 'Appam Stew', 325, { cat: 'tc_large', sub: 'ts_large_veg', diet: 'VEG', variants: ['tv_appam_stew'], desc: 'Mixed veg in coconut stew with appams', categoryName: C });
defItem(toit, 'ti_donne_biryani', 'Donne Biryani', 350, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'VEG', spice: 2, variants: ['tv_donne'], desc: 'Bangalore military-hotel biryani in areca leaf parcel', categoryName: C });
// ── Large Plates: Non-Veg ──
defItem(toit, 'ti_club_sandwich', 'Classic Club Sandwich', 350, { cat: 'tc_large', sub: 'ts_burgers', diet: 'NON_VEG', desc: 'Triple-decker chicken, egg, tomato, bacon', categoryName: C, allergens: ['gluten', 'egg'] });
defItem(toit, 'ti_peruvian_sandwich', 'Peruvian Chicken Sandwich', 350, { cat: 'tc_large', sub: 'ts_burgers', diet: 'NON_VEG', spice: 1, desc: 'Spiced chicken, guacamole, jalapeño, ciabatta', categoryName: C });
defItem(toit, 'ti_fried_chicken_burger', 'Spicy Fried Chicken Burger', 400, { cat: 'tc_large', sub: 'ts_burgers', diet: 'NON_VEG', spice: 2, desc: 'Southern-fried chicken, brioche, fries & corn ribs', categoryName: C });
defItem(toit, 'ti_life_is_beach', 'Life is a Beach!', 400, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', spice: 1, desc: 'Balinese BBQ chicken in banana leaf, peanut salad', categoryName: C });
defItem(toit, 'ti_better_half', 'The Better Half', 400, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Half roast chicken, South American spices, root veg', categoryName: C });
defItem(toit, 'ti_naadan_kozhi', 'Naadan Kozhi Curry', 400, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', spice: 3, desc: 'Kerala chicken curry, roasted coconut, rice/appams', categoryName: C });
defItem(toit, 'ti_prawn_pasta', 'Prawn, Cherry Tomato & Feta Pasta', 450, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Spaghetti, prawns, garlic, cherry tomato, feta', categoryName: C });
defItem(toit, 'ti_citrus_salmon', 'Citrus Glazed Salmon', 650, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Seared salmon, caper citrus glaze, pak choi, quinoa', categoryName: C, allergens: ['fish'] });
defItem(toit, 'ti_fish_chips', 'Ay, Caramba! Fish ‘n’ Chips', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', variants: ['tv_fishchips'], desc: 'Crumb-fried fish, wasabi mayo, fries', categoryName: C });
defItem(toit, 'ti_goan_curry', 'Goan Fish or Prawn Curry', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', spice: 2, variants: ['tv_goan_curry'], desc: 'Goan red chilli coconut curry, tirphal, rice/appams', categoryName: C });
defItem(toit, 'ti_bangers_mash', 'Bangers & Mash', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Grilled pork sausages, mash, caramelised onion gravy', categoryName: C });
defItem(toit, 'ti_lamb_shanks', 'Red Wine Braised Lamb Shanks', 525, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Lamb shanks, red wine reduction, couscous', categoryName: C });
defItem(toit, 'ti_lamb_pappardelle', 'Lamb & Mushroom Pappardelle', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Slow-cooked lamb & mushroom, handmade pappardelle', categoryName: C });
defItem(toit, 'ti_pulled_lamb_burger', 'Pulled Lamb Burger', 500, { cat: 'tc_large', sub: 'ts_burgers', diet: 'NON_VEG', desc: 'Pulled lamb, mint sour cream, brioche, fries', categoryName: C });
defItem(toit, 'ti_beef_burger', 'Toit Beef Burger', 450, { cat: 'tc_large', sub: 'ts_burgers', diet: 'NON_VEG', disc: 10, desc: 'Beef patty, red wine onion compote, Emmenthal, brioche', categoryName: C });
defItem(toit, 'ti_char_steak', 'Char-Grilled Steak', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', desc: 'Signature marinated beef steak, creamy spinach', categoryName: C });
defItem(toit, 'ti_beef_rice_bowl', 'Beef ‘n’ Broccoli Rice Bowl', 500, { cat: 'tc_large', sub: 'ts_large_nonveg', diet: 'NON_VEG', spice: 1, desc: 'Flash-seared beef, broccoli rice, pak choi, fried egg', categoryName: C });

// ── Craft Beers (house brews) ──
defItem(toit, 'ti_tintin', 'Tintin Toit', 220, { cat: 'tc_brews', sub: 'ts_brew_wheat', diet: 'VEG', variants: ['tv_pour'], desc: 'Belgian-style witbier with coriander & orange peel', categoryName: C });
defItem(toit, 'ti_weiss', 'Toit Weiss', 230, { cat: 'tc_brews', sub: 'ts_brew_wheat', diet: 'VEG', variants: ['tv_pour'], desc: 'Bavarian hefeweizen, banana & clove notes', categoryName: C });
defItem(toit, 'ti_basmati_blonde', 'Basmati Blonde', 220, { cat: 'tc_brews', sub: 'ts_brew_lager', diet: 'VEG', variants: ['tv_pour'], disc: 20, desc: 'Crisp blonde ale brewed with basmati rice', categoryName: C });
defItem(toit, 'ti_colonial', 'Colonial Toit', 250, { cat: 'tc_brews', sub: 'ts_brew_ale', diet: 'VEG', spice: 0, variants: ['tv_pour'], desc: 'Toit’s flagship India Pale Ale, citrus & pine', categoryName: C });
defItem(toit, 'ti_dark_knight', 'Dark Knight', 260, { cat: 'tc_brews', sub: 'ts_brew_stout', diet: 'VEG', variants: ['tv_pour'], desc: 'Rich coffee-chocolate stout', categoryName: C });
defItem(toit, 'ti_toit_red', 'Toit Red', 240, { cat: 'tc_brews', sub: 'ts_brew_ale', diet: 'VEG', variants: ['tv_pour'], stock: false, desc: 'Malty Irish-style red ale (seasonal)', categoryName: C }); // edge: seasonal OOS
defItem(toit, 'ti_pitcher_blonde', 'Basmati Blonde Pitcher', 850, { cat: 'tc_brews', sub: 'ts_pitchers', diet: 'VEG', disc: 15, desc: '1.5L pitcher, best for sharing', categoryName: C });
defItem(toit, 'ti_pitcher_wit', 'Tintin Toit Pitcher', 880, { cat: 'tc_brews', sub: 'ts_pitchers', diet: 'VEG', desc: '1.5L pitcher of witbier', categoryName: C });

// ── Desserts ──
defItem(toit, 'ti_apple_crumble', 'Warm Apple Crumble', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'VEG', desc: 'Apple tart, cinnamon, streusel, vanilla ice cream', categoryName: C });
defItem(toit, 'ti_mysuru_pak', 'Baked Mysuru Pak', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'VEG', desc: 'Gram flour & ghee sweet baked in pastry', categoryName: C });
defItem(toit, 'ti_layer_cake', 'Layer Cake', 400, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'EGG', desc: 'The Toit OG dark chocolate layer cake', categoryName: C, allergens: ['egg', 'gluten', 'dairy'] });
defItem(toit, 'ti_tiramisu', 'Tiramisu', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'EGG', desc: 'Classic Italian, mascarpone, coffee liqueur', categoryName: C, allergens: ['egg', 'dairy'] });
defItem(toit, 'ti_orange_cake', 'Orange & Walnut Cake', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'EGG', desc: 'Soft cake, walnuts, citrus cream', categoryName: C, allergens: ['egg', 'nuts'] });
defItem(toit, 'ti_passion_cheesecake', 'Passion Cheesecake', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'EGG', desc: 'NY-style cheesecake, passion fruit coulis', categoryName: C, allergens: ['egg', 'dairy'] });
defItem(toit, 'ti_filter_kaapi_creme', 'Filter Kaapi Pot Du Crème', 300, { cat: 'tc_desserts', sub: 'ts_desserts', diet: 'EGG', desc: 'Filter coffee mousse in a coconut shell', categoryName: C, allergens: ['egg', 'dairy'] });

// ── Bestsellers (CROSS-LISTED — same item ids appear in carousel category) ──
// Add the bestseller subcategory to existing items + register them in the carousel category.
for (const bid of ['ti_nachos', 'ti_margherita', 'ti_donne_biryani', 'ti_colonial', 'ti_char_steak', 'ti_tiramisu']) {
  toit.menuItems[bid].subcategoryIds = [...toit.menuItems[bid].subcategoryIds, 'ts_bestsellers'];
}

// Toit menu doc
defMenu(toit, 'menu_toit_main', 'Toit Menu', {
  categoryIds: ['tc_bestsellers', 'tc_bites', 'tc_platters', 'tc_appetisers', 'tc_pizzas', 'tc_light', 'tc_large', 'tc_brews', 'tc_desserts'],
  menuItemIds: Object.keys(toit.menuItems),
});
// Edge: a second, INACTIVE seasonal menu (tests active-menu selection logic)
defMenu(toit, 'menu_toit_monsoon', 'Monsoon Specials (inactive)', { categoryIds: ['tc_large'], menuItemIds: ['ti_naadan_kozhi', 'ti_appam_stew'], isActive: false, isDefault: false, order: 1 });

// Servers
defServer(toit, 'srv_toit_mgr', 'Anita Rao', 'MANAGER', 'manager@toit.in', { phone: '9800000001' });
defServer(toit, 'srv_toit_1', 'Rahul Nair', 'SERVER', 'rahul@toit.in', { phone: '9800000002' });
defServer(toit, 'srv_toit_2', 'Priya Shetty', 'SERVER', 'priya@toit.in', { phone: '9800000003' });
defServer(toit, 'srv_toit_3', 'Imran Khan', 'SERVER', 'imran@toit.in', { phone: '9800000004', status: 'inactive' }); // edge: inactive server
defServer(toit, 'srv_toit_kitchen', 'Chef Lakshmi', 'KITCHEN', 'kitchen@toit.in', { phone: '9800000005' });
defServer(toit, 'srv_toit_bar', 'Bartender Sam', 'KITCHEN', 'bar@toit.in', { phone: '9800000006' });

// ═════════════════════════════════════════════════════════════════════════════
// RESTAURANT 2 — KARAVALLI (coastal fine dining)
// ═════════════════════════════════════════════════════════════════════════════
const kara = newRestaurant('res_karavalli',
  { name: 'Karavalli', address: 'The Gateway Hotel, 66 Residency Rd, Bengaluru', phone: '8066604545', email: 'karavalli.blr@tajhotels.com', location: { _latitude: 12.9627, _longitude: 77.6010 }, cuisine: 'Coastal · South Indian · Fine Dining', currency: 'INR', timezone: 'Asia/Kolkata' },
  [{ type: 'SERVICE_CHARGE', percentage: 10 }, { type: 'PACKAGING_CHARGE', percentage: 2 }, { type: 'LOYALTY_DISCOUNT', percentage: -5 }] // negative charge edge
);

defKitchen(kara, 'kit_kara_coastal', 'Coastal Kitchen');
defKitchen(kara, 'kit_kara_hearth', 'Wood-Fired Hearth');
defKitchen(kara, 'kit_kara_bar', 'Bar');
defKitchen(kara, 'kit_kara_dessert', 'Dessert Station');

// Categories
defCategory(kara, 'kc_grill', 'West Coast Seafood Grill', { order: 0, subcategoryIds: ['ks_seafood', 'ks_meat'], description: 'Starters from the coast' });
defCategory(kara, 'kc_veg', 'Vegetarian', { order: 1, subcategoryIds: ['ks_veg'] });
defCategory(kara, 'kc_curries', 'Scrumptious Curries', { order: 2, subcategoryIds: ['ks_curries'], description: 'Cooked on traditional wood-fired hearths' });
defCategory(kara, 'kc_combos', 'Classic Combinations', { order: 3, subcategoryIds: ['ks_combos'] });
defCategory(kara, 'kc_popular', 'Popular Meals', { order: 4, subcategoryIds: ['ks_popular'], viewType: 'carousel' });
defCategory(kara, 'kc_seasonal', 'Seasonal Stars', { order: 5, subcategoryIds: ['ks_seasonal'] });
defCategory(kara, 'kc_accomp', 'Accompaniments', { order: 6, subcategoryIds: ['ks_breads', 'ks_rice'] });
defCategory(kara, 'kc_desserts', 'Desserts', { order: 7, subcategoryIds: ['ks_desserts'] });

defSub(kara, 'ks_seafood', 'Seafood', 'kc_grill', 0);
defSub(kara, 'ks_meat', 'Meat & Poultry', 'kc_grill', 1);
defSub(kara, 'ks_veg', 'Vegetarian', 'kc_veg', 0);
defSub(kara, 'ks_curries', 'Curries', 'kc_curries', 0);
defSub(kara, 'ks_combos', 'Combinations', 'kc_combos', 0);
defSub(kara, 'ks_popular', 'Popular Meals', 'kc_popular', 0);
defSub(kara, 'ks_seasonal', 'Seasonal', 'kc_seasonal', 0);
defSub(kara, 'ks_breads', 'Breads', 'kc_accomp', 0);
defSub(kara, 'ks_rice', 'Rice', 'kc_accomp', 1);
defSub(kara, 'ks_desserts', 'Desserts', 'kc_desserts', 0);

// Variants — rice portion (optional) and appam type
defVariant(kara, 'kv_portion', 'Portion', { mandatory: false, respectParent: false, items: ['ki_neichoru', 'ki_lemon_rice', 'ki_tamarind_rice'], catAssoc: ['kc_accomp'], options: [{ id: 'opt_single', name: 'Single', price: 0 }, { id: 'opt_sharing', name: 'Sharing', price: 180 }] });
defVariant(kara, 'kv_appam', 'Appam Type', { mandatory: true, respectParent: false, items: ['ki_appam'], catAssoc: ['kc_accomp'], options: [{ id: 'opt_plain', name: 'Plain Appam', price: 0 }, { id: 'opt_egg', name: 'Egg Appam', price: 0 }] });
defVariant(kara, 'kv_spice', 'Spice Level', { mandatory: false, respectParent: true, items: ['ki_sea_crab_roast', 'ki_prawn_roast', 'ki_pepper_prawns'], catAssoc: ['kc_grill'], options: [{ id: 'opt_mild', name: 'Mild', price: 0 }, { id: 'opt_medium', name: 'Medium', price: 0 }, { id: 'opt_fiery', name: 'Fiery', price: 0 }] });

// Addons — extra accompaniments
defAddon(kara, 'ka_extra_appam', 'Extra Appam (2pc)', 195, { items: ['ki_kadala_gassi', 'ki_naadan_curry', 'ki_devde_beans'], catAssoc: ['kc_curries'] });
defAddon(kara, 'ka_neer_dosa', 'Neer Dosa (2pc)', 195, { items: ['ki_kadala_gassi', 'ki_naadan_curry'], catAssoc: ['kc_curries'] });
defAddon(kara, 'ka_papad', 'Roasted Papad', 90, { items: ['ki_kadala_gassi', 'ki_devde_beans', 'ki_neichoru'], catAssoc: ['kc_curries', 'kc_accomp'], respectParent: true });

const K = 'Karavalli';
// West Coast Seafood Grill — Seafood
defItem(kara, 'ki_sea_crab_roast', 'Sea Crab Ghee Roast', 1950, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 3, variants: ['kv_spice'], desc: 'Soft-shell crab, Mangalorean ghee roast masala', categoryName: K, allergens: ['shellfish'] });
defItem(kara, 'ki_prawn_roast', 'Malabar Prawn Roast', 1995, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 2, variants: ['kv_spice'], desc: 'Tiger prawns, Kerala spices, ginger, coconut slivers', categoryName: K, allergens: ['shellfish'] });
defItem(kara, 'ki_pepper_prawns', 'Karumulaga Konju (Pepper Prawns)', 1700, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 3, variants: ['kv_spice'], desc: 'Prawns tossed in black pepper masala', categoryName: K, allergens: ['shellfish'] });
defItem(kara, 'ki_kane_fry', 'Kane Rava Fry (Lady Fish)', 1485, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 1, desc: 'Semolina-crusted ladyfish, curry leaf', categoryName: K, allergens: ['fish'] });
defItem(kara, 'ki_meen_pollichathu', 'Meen Pollichathu (Black Pomfret)', 1485, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 2, desc: 'Shallow-fried pomfret in banana leaf', categoryName: K, allergens: ['fish'] });
defItem(kara, 'ki_surmai_tawa', 'Surmai Tawa Fry (Seer Fish)', 1485, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 2, desc: 'Shallow-fried seer fish, Malvani spice', categoryName: K, allergens: ['fish'], stock: false }); // edge: catch unavailable
defItem(kara, 'ki_squid', 'Koonthal Pattichathu (Squid)', 1400, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 2, desc: 'Squid with a spice reduction', categoryName: K, allergens: ['shellfish'] });
defItem(kara, 'ki_calamari_fry', 'Calamari Fry', 1400, { cat: 'kc_grill', sub: 'ks_seafood', diet: 'NON_VEG', spice: 1, desc: 'Crisp-fried calamari, lemon', categoryName: K, allergens: ['shellfish'] });
// Seafood Grill — Meat
defItem(kara, 'ki_ghee_roast_chicken', 'Ghee Roast Chicken', 1100, { cat: 'kc_grill', sub: 'ks_meat', diet: 'NON_VEG', spice: 2, desc: 'Chicken, Mangalorean ghee roast', categoryName: K });
defItem(kara, 'ki_lamb_roast', 'Attirachi Ularthu (Lamb Roast)', 1450, { cat: 'kc_grill', sub: 'ks_meat', diet: 'NON_VEG', spice: 2, desc: 'Lamb, shallots, ginger, green chilli, fennel', categoryName: K });
defItem(kara, 'ki_beef_roast', 'Erachi Ularthu (Tenderloin Roast)', 1500, { cat: 'kc_grill', sub: 'ks_meat', diet: 'NON_VEG', spice: 2, desc: 'Tenderloin, tomato, ginger, coconut', categoryName: K });
defItem(kara, 'ki_coorg_chicken', 'Koli Barthad (Coorg Fried Chicken)', 1150, { cat: 'kc_grill', sub: 'ks_meat', diet: 'NON_VEG', spice: 2, desc: 'Coorg-style fried chicken', categoryName: K });
defItem(kara, 'ki_kori_bezule', 'Kori Kempu Bezule', 1150, { cat: 'kc_grill', sub: 'ks_meat', diet: 'NON_VEG', spice: 3, desc: 'Butter-fried chicken strips, red chilli', categoryName: K });

// Vegetarian
defItem(kara, 'ki_gobi_bezule', 'Gobi Kempu Bezule', 1150, { cat: 'kc_veg', sub: 'ks_veg', diet: 'VEG', spice: 2, desc: 'Butter-fried cauliflower florets', categoryName: K });
defItem(kara, 'ki_malabar_potato', 'Malabar Potato Roast', 1150, { cat: 'kc_veg', sub: 'ks_veg', vegan: true, spice: 1, desc: 'Baby potatoes, tomato, Malabar spice', categoryName: K });
defItem(kara, 'ki_kotmir_vadi', 'Kasiya Kotmir Vadi', 1150, { cat: 'kc_veg', sub: 'ks_veg', diet: 'VEG', spice: 1, desc: 'Cashew & coriander fritters', categoryName: K, allergens: ['nuts'] });
defItem(kara, 'ki_masala_dosa', 'Khimya Masala Dosa', 1150, { cat: 'kc_veg', sub: 'ks_veg', diet: 'VEG', spice: 1, desc: 'Spiced lentil crepes', categoryName: K });
defItem(kara, 'ki_chattambadi', 'Chattambadi (Lentil Patties)', 1150, { cat: 'kc_veg', sub: 'ks_veg', vegan: true, spice: 1, desc: 'Fried lentil patties, green peas', categoryName: K });
defItem(kara, 'ki_aritha_pundi', 'Qagaravada Aritha Pundi', 1150, { cat: 'kc_veg', sub: 'ks_veg', vegan: true, desc: 'Steamed rice dumplings, coconut', categoryName: K });
defItem(kara, 'ki_pepper_mushroom', 'Kumil Pepper Fry (Mushroom)', 1150, { cat: 'kc_veg', sub: 'ks_veg', vegan: true, spice: 2, desc: 'Mushroom pepper fry', categoryName: K });

// Scrumptious Curries
defItem(kara, 'ki_kadala_gassi', 'Kadala Gassi', 1050, { cat: 'kc_curries', sub: 'ks_curries', vegan: true, spice: 2, addons: ['ka_extra_appam', 'ka_neer_dosa', 'ka_papad'], desc: 'Black chana, brown coconut, tamarind', categoryName: K });
defItem(kara, 'ki_devde_beans', 'Devde Beans Randhay', 1050, { cat: 'kc_curries', sub: 'ks_curries', vegan: true, spice: 1, addons: ['ka_extra_appam', 'ka_papad'], desc: 'Double beans & green beans curry', categoryName: K });
defItem(kara, 'ki_syrian_chicken', 'Kozhi Melagittathu (Syrian Chicken)', 1200, { cat: 'kc_curries', sub: 'ks_curries', diet: 'NON_VEG', spice: 3, desc: 'Syrian Christian pepper chicken curry', categoryName: K });
defItem(kara, 'ki_naadan_curry', 'Alleppey Fish Curry', 1375, { cat: 'kc_curries', sub: 'ks_curries', diet: 'NON_VEG', spice: 2, addons: ['ka_extra_appam', 'ka_neer_dosa'], desc: 'Alleppey-style fish curry, raw mango', categoryName: K, allergens: ['fish'] });
defItem(kara, 'ki_pork_sausage_curry', 'Pork Seyaboi', 1375, { cat: 'kc_curries', sub: 'ks_curries', diet: 'NON_VEG', spice: 2, desc: 'Goan pork, pickled spices, gaon vinegar', categoryName: K });
defItem(kara, 'ki_mutton_curry', 'Kundapur Mutton Curry', 1400, { cat: 'kc_curries', sub: 'ks_curries', diet: 'NON_VEG', spice: 3, desc: 'Mangalore Kundapur mutton, coconut', categoryName: K });

// Classic Combinations
defItem(kara, 'ki_lamb_ghee_rice', 'Attirachi Ularthu Neichoru', 1150, { cat: 'kc_combos', sub: 'ks_combos', diet: 'NON_VEG', spice: 2, desc: 'Lamb roast & fragrant ghee rice', categoryName: K });
defItem(kara, 'ki_pottu_choru', 'Pottu Choru', 1450, { cat: 'kc_combos', sub: 'ks_combos', diet: 'NON_VEG', spice: 2, desc: 'Flavoured rice & spiced chicken', categoryName: K });
defItem(kara, 'ki_prawn_biryani', 'Meen Biryani (Prawn)', 1750, { cat: 'kc_combos', sub: 'ks_combos', diet: 'NON_VEG', spice: 2, disc: 10, desc: 'Mayikh prawn biryani, Malabar style', categoryName: K, allergens: ['shellfish'] });

// Popular Meals
defItem(kara, 'ki_pallimathu_fry', 'Pallimathu Fry', 700, { cat: 'kc_popular', sub: 'ks_popular', diet: 'NON_VEG', spice: 2, desc: 'Pepper-fried fish, Mahe Mukti fish fry', categoryName: K, allergens: ['fish'] });
defItem(kara, 'ki_kori_roti', 'Kori Roti', 650, { cat: 'kc_popular', sub: 'ks_popular', diet: 'NON_VEG', spice: 3, desc: 'Mangalore chicken curry with crisp rice pancakes', categoryName: K });
defItem(kara, 'ki_idiappam_gassi', 'Idiappam Kadala Gassi', 700, { cat: 'kc_popular', sub: 'ks_popular', vegan: true, spice: 2, desc: 'String hoppers with black chickpea curry', categoryName: K });
defItem(kara, 'ki_ros_omelette', 'Ros Omelette', 700, { cat: 'kc_popular', sub: 'ks_popular', diet: 'EGG', spice: 2, desc: 'Goan street omelette in spiced curry', categoryName: K, allergens: ['egg'] });

// Seasonal Stars
defItem(kara, 'ki_patrade', 'Patrade (Colocasia Rolls)', 1150, { cat: 'kc_seasonal', sub: 'ks_seasonal', vegan: true, spice: 1, desc: 'Colocasia leaf rolls, lentil paste', categoryName: K });
defItem(kara, 'ki_banana_stem', 'Vaichapoo Cheruppayar Tharan', 1100, { cat: 'kc_seasonal', sub: 'ks_seasonal', vegan: true, desc: 'Banana stem & lentil stir fry', categoryName: K });
defItem(kara, 'ki_spinach_curry', 'Beuda Gassi (Spinach)', 1100, { cat: 'kc_seasonal', sub: 'ks_seasonal', diet: 'VEG', spice: 1, desc: 'Mangalore spinach curry', categoryName: K });
defItem(kara, 'ki_mango_menaskai', 'Maavinakai Menaskai', 1100, { cat: 'kc_seasonal', sub: 'ks_seasonal', vegan: true, spice: 2, desc: 'Preserved mango sweet-sour curry', categoryName: K });

// Accompaniments — breads & rice
defItem(kara, 'ki_appam', 'Appam', 195, { cat: 'kc_accomp', sub: 'ks_breads', diet: 'VEG', variants: ['kv_appam'], desc: 'Fermented rice pancake', categoryName: K });
defItem(kara, 'ki_idiappam', 'Idiappam (String Hoppers)', 195, { cat: 'kc_accomp', sub: 'ks_breads', vegan: true, desc: 'Steamed string hoppers', categoryName: K });
defItem(kara, 'ki_neer_dosa_acc', 'Neer Dosa', 195, { cat: 'kc_accomp', sub: 'ks_breads', vegan: true, desc: 'Soft rice crepes', categoryName: K });
defItem(kara, 'ki_sannas', 'Sannas (Steamed Rice Cake)', 195, { cat: 'kc_accomp', sub: 'ks_breads', diet: 'VEG', desc: 'Goan steamed rice cakes', categoryName: K });
defItem(kara, 'ki_ramassery_idli', 'Ramassery Idli', 195, { cat: 'kc_accomp', sub: 'ks_breads', diet: 'VEG', desc: 'Heirloom Kerala idli', categoryName: K });
defItem(kara, 'ki_malabar_paratha', 'Malabar Parratha', 195, { cat: 'kc_accomp', sub: 'ks_breads', diet: 'VEG', desc: 'Flaky refined-flour bread', categoryName: K, allergens: ['gluten'] });
defItem(kara, 'ki_red_rice', 'Unpolished Red Rice', 250, { cat: 'kc_accomp', sub: 'ks_rice', vegan: true, desc: 'Kerala matta red rice', categoryName: K });
defItem(kara, 'ki_steamed_rice', 'Plain Steamed Rice', 250, { cat: 'kc_accomp', sub: 'ks_rice', vegan: true, desc: 'Steamed white rice', categoryName: K });
defItem(kara, 'ki_neichoru', 'Neichoru (Ghee Rice)', 350, { cat: 'kc_accomp', sub: 'ks_rice', diet: 'VEG', variants: ['kv_portion'], addons: ['ka_papad'], desc: 'Fragrant ghee rice', categoryName: K });
defItem(kara, 'ki_lemon_rice', 'Lemon Rice', 350, { cat: 'kc_accomp', sub: 'ks_rice', vegan: true, spice: 1, variants: ['kv_portion'], desc: 'Lemon, mustard, cashew, curry leaf', categoryName: K, allergens: ['nuts'] });
defItem(kara, 'ki_tamarind_rice', 'Puliyogarre (Tamarind Rice)', 350, { cat: 'kc_accomp', sub: 'ks_rice', vegan: true, spice: 2, variants: ['kv_portion'], desc: 'Tamarind rice, peanuts', categoryName: K, allergens: ['nuts'] });

// Desserts
defItem(kara, 'ki_bebinca', 'Bebinca (Goan Layer Pancake)', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'EGG', desc: 'Multilayered Goan dessert, vanilla ice cream', categoryName: K, allergens: ['egg', 'dairy'] });
defItem(kara, 'ki_dodol', 'Dodol (Jaggery Rice Cake)', 475, { cat: 'kc_desserts', sub: 'ks_desserts', vegan: true, desc: 'Coconut milk, jaggery, rice', categoryName: K });
defItem(kara, 'ki_kashi_halwa', 'Kashi Halwa (Ash Gourd)', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: 'Ash gourd pudding, ghee, cardamom', categoryName: K });
defItem(kara, 'ki_elaneer_payasam', 'Elaneer Payasam', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: 'Tender coconut pudding', categoryName: K });
defItem(kara, 'ki_ada_pradhaman', 'Ada Pradhaman', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: 'Rice flakes & jaggery pudding', categoryName: K });
defItem(kara, 'ki_ragi_manni', 'Ragi Manni', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: 'Finger millet pudding, almond', categoryName: K, allergens: ['nuts'] });
defItem(kara, 'ki_chiroti', 'Chiroti', 475, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: 'Flaky wheat pastry, sugar, almond', categoryName: K, allergens: ['gluten', 'nuts'] });
defItem(kara, 'ki_coastal_cruise', 'Coastal Cruise', 500, { cat: 'kc_desserts', sub: 'ks_desserts', diet: 'VEG', desc: "Chef's coastal dessert sampler", categoryName: K });

// Cross-list popular items into the carousel (already their own category here)
defMenu(kara, 'menu_kara_main', 'Karavalli Menu', {
  categoryIds: ['kc_popular', 'kc_grill', 'kc_veg', 'kc_curries', 'kc_combos', 'kc_seasonal', 'kc_accomp', 'kc_desserts'],
  menuItemIds: Object.keys(kara.menuItems),
});

// Servers
defServer(kara, 'srv_kara_mgr', 'Joseph Fernandes', 'MANAGER', 'manager@karavalli.in', { phone: '9810000001' });
defServer(kara, 'srv_kara_1', 'Maria D’Souza', 'SERVER', 'maria@karavalli.in', { phone: '9810000002' });
defServer(kara, 'srv_kara_2', 'Vikram Pai', 'SERVER', 'vikram@karavalli.in', { phone: '9810000003' });
defServer(kara, 'srv_kara_kitchen', 'Chef Naren', 'KITCHEN', 'kitchen@karavalli.in', { phone: '9810000004' });

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMERS (top-level) — keep test phones 9876543210 / 9876543211
// ═════════════════════════════════════════════════════════════════════════════
const customers = {
  '9876543210': { phoneNumber: '9876543210', name: 'Customer One', email: 'c1@example.com', createdAt: ts(-200 * DAY), updatedAt: ts(-2 * HOUR), visits: [{ restaurantId: 'res_toit', tableId: 'tbl_toit_1', startTime: ts(-40 * MIN) }], currentVisit: { restaurantId: 'res_toit', tableId: 'tbl_toit_1', startTime: ts(-40 * MIN) }, preferences: { favoriteItems: ['ti_colonial', 'ti_char_steak'], dietaryRestrictions: [] } },
  '9876543211': { phoneNumber: '9876543211', name: 'Customer Two', email: 'c2@example.com', createdAt: ts(-1 * DAY), updatedAt: ts(-1 * DAY), visits: [], preferences: { favoriteItems: [], dietaryRestrictions: ['VEG'] } }, // fresh / first-time
  '9876543212': { phoneNumber: '9876543212', name: 'Karthik Menon', email: 'karthik@example.com', createdAt: ts(-400 * DAY), updatedAt: ts(-3 * DAY), visits: [{ restaurantId: 'res_karavalli', tableId: 'tbl_kara_1', startTime: ts(-30 * DAY), endTime: ts(-30 * DAY + 2 * HOUR) }, { restaurantId: 'res_karavalli', tableId: 'tbl_kara_2', startTime: ts(-7 * DAY), endTime: ts(-7 * DAY + 2 * HOUR) }], preferences: { favoriteItems: ['ki_sea_crab_roast'], dietaryRestrictions: [] } },
};

// ═════════════════════════════════════════════════════════════════════════════
// TABLES — full spread of states (Toit)
// ═════════════════════════════════════════════════════════════════════════════
defTable(toit, 'tbl_toit_1', '1', 4, 'active', { primaryCustomer: { phoneNumber: '9876543210', name: 'Customer One' }, occupiedBy: ['9876543210'], assignedServerId: 'srv_toit_1', activeOrderId: 'ord_toit_active', otp: 'valid', section: 'Indoor', floor: 'Ground' });
defTable(toit, 'tbl_toit_2', '2', 6, 'active', { primaryCustomer: { phoneNumber: '9876543211', name: 'Customer Two' }, occupiedBy: ['9876543211', '9876543210'], assignedServerId: 'srv_toit_2', otp: 'valid', section: 'Indoor', floor: 'Ground' }); // multi-user
defTable(toit, 'tbl_toit_3', '3', 2, 'pending', { otp: 'valid', section: 'Bar' }); // OTP issued, awaiting validation
defTable(toit, 'tbl_toit_4', '4', 2, 'pending', { otp: 'expired', section: 'Bar' }); // edge: expired OTP
defTable(toit, 'tbl_toit_5', '5', 4, 'vacant', { otp: 'valid' });
defTable(toit, 'tbl_toit_6', '6', 8, 'reserved', { otp: 'valid', section: 'Patio' }); // edge: reserved
defTable(toit, 'tbl_toit_7', '7', 4, 'disabled', { otp: 'none' }); // edge: disabled, no OTP
defTable(toit, 'tbl_toit_8', '8', 4, 'vacant', { otp: 'valid' }); // hosts a COMPLETED order in history
defTable(toit, 'tbl_toit_9', '9', 2, 'vacant', { otp: 'valid' }); // hosts a CANCELLED order
for (let i = 10; i <= 18; i++) defTable(toit, `tbl_toit_${i}`, String(i), i % 2 ? 2 : 4, 'vacant', { otp: 'valid' });

// Karavalli tables
defTable(kara, 'tbl_kara_1', '1', 4, 'active', { primaryCustomer: { phoneNumber: '9876543212', name: 'Karthik Menon' }, occupiedBy: ['9876543212'], assignedServerId: 'srv_kara_1', activeOrderId: 'ord_kara_active', otp: 'valid', section: 'Main Hall' });
defTable(kara, 'tbl_kara_2', '2', 2, 'pending', { otp: 'valid', section: 'Veranda' });
defTable(kara, 'tbl_kara_3', '3', 6, 'reserved', { otp: 'valid', section: 'Private Dining' });
defTable(kara, 'tbl_kara_4', '4', 4, 'vacant', { otp: 'valid' });
defTable(kara, 'tbl_kara_5', '5', 4, 'disabled', { otp: 'none' });
defTable(kara, 'tbl_kara_6', '6', 10, 'vacant', { otp: 'valid', section: 'Private Dining' });
for (let i = 7; i <= 12; i++) defTable(kara, `tbl_kara_${i}`, String(i), i % 3 === 0 ? 6 : 4, 'vacant', { otp: 'valid' });

// ═════════════════════════════════════════════════════════════════════════════
// SESSIONS
// ═════════════════════════════════════════════════════════════════════════════
defSession(toit, 'ses_toit_active', 'tbl_toit_1', '9876543210', ['9876543210'], 'active', { ageMin: 40 });
defSession(toit, 'ses_toit_multi', 'tbl_toit_2', '9876543211', ['9876543211', '9876543210'], 'active', { ageMin: 25 });
defSession(toit, 'ses_toit_expired', 'tbl_toit_5', '9876543210', ['9876543210'], 'expired', { ageMin: 300 }); // edge
defSession(toit, 'ses_toit_ended', 'tbl_toit_8', '9876543210', ['9876543210'], 'ended', { ageMin: 180 });
defSession(kara, 'ses_kara_active', 'tbl_kara_1', '9876543212', ['9876543212'], 'active', { ageMin: 50 });

// ═════════════════════════════════════════════════════════════════════════════
// ORDERS + CART SNAPSHOTS — cover every ORDER_STATUS + FULFILLMENT_STATUS
// ═════════════════════════════════════════════════════════════════════════════
// ── Toit active order (resume scenario): 2 carts, mixed item states ──
const toitCart1 = [
  buildCartItem(toit, 1, 'ti_colonial', 2, 'SERVED', { selVariants: [{ variantId: 'tv_pour', optionId: 'opt_pint' }], notes: 'Cold' }),
  buildCartItem(toit, 2, 'ti_nachos', 1, 'SERVED', { selAddonIds: ['ta_chicken_mince', 'ta_jalapeno_sauce'], notes: 'Extra salsa' }),
];
const toitCart2 = [
  buildCartItem(toit, 3, 'ti_char_steak', 1, 'PREPARING', { notes: 'Medium rare' }),
  buildCartItem(toit, 4, 'ti_margherita', 1, 'READY', { selAddonIds: ['ta_extra_cheese'] }),
  buildCartItem(toit, 5, 'ti_basmati_blonde', 2, 'PENDING', { selVariants: [{ variantId: 'tv_pour', optionId: 'opt_mug' }] }),
  buildCartItem(toit, 6, 'ti_okra_chips', 1, 'CANCELLED', { notes: 'Customer changed mind' }), // cancelled item
];
const snapT1 = cartSnapshot(toit, 'res_toit_tbl_toit_1_aaaa1111', 'SERVED', toitCart1, { userId: '9876543210', notes: 'First round', ageMin: 38 });
const snapT2 = cartSnapshot(toit, 'res_toit_tbl_toit_1_bbbb2222', 'PREPARING', toitCart2, { userId: '9876543210', notes: 'Second round', ageMin: 18, assignedTo: 'srv_toit_kitchen' });
defOrder(toit, 'ord_toit_active', 'TOIT-00118', { tableId: 'tbl_toit_1', sessionId: 'ses_toit_active', customerId: '9876543210', orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid', snapshots: [snapT1, snapT2], assignedServer: 'srv_toit_1', notes: 'Table 1 — celebrating', ageMin: 38 });

// Live cart on the SAME active table (new items not yet checked out → "add to existing order")
defLiveCart(toit, 'tbl_toit_1', 'ses_toit_active', [
  buildCartItem(toit, 1, 'ti_tiramisu', 1, 'PENDING'),
  buildCartItem(toit, 2, 'ti_filter_kaapi_creme', 1, 'PENDING'),
]);

// ── Toit multi-user live cart (table 2): items from both occupants, no order yet ──
defLiveCart(toit, 'tbl_toit_2', 'ses_toit_multi', [
  buildCartItem(toit, 1, 'ti_pork_pepperoni', 1, 'PENDING', { selAddonIds: ['ta_extra_cheese'] }),
  buildCartItem(toit, 2, 'ti_wings_bbq', 2, 'PENDING'),
  buildCartItem(toit, 3, 'ti_weiss', 4, 'PENDING', { selVariants: [{ variantId: 'tv_pour', optionId: 'opt_pint' }] }),
  buildCartItem(toit, 4, 'ti_beef_burger', 1, 'PENDING'),
]);

// ── Toit COMPLETED order (history, paid, offer applied) on table 8 ──
const toitDone = [
  buildCartItem(toit, 1, 'ti_donne_biryani', 2, 'SERVED', { selVariants: [{ variantId: 'tv_donne', optionId: 'opt_chicken' }] }),
  buildCartItem(toit, 2, 'ti_andhra_chilli_chicken', 1, 'SERVED'),
  buildCartItem(toit, 3, 'ti_colonial', 3, 'SERVED', { selVariants: [{ variantId: 'tv_pour', optionId: 'opt_pint' }] }),
];
const snapDone = cartSnapshot(toit, 'res_toit_tbl_toit_8_cccc3333', 'SERVED', toitDone, { userId: '9876543210', ageMin: 120 });
// Offer applied: 10% off food category (compute on this cart's finalPrice eligible items — approximated as a fixed discount)
defOrder(toit, 'ord_toit_completed', 'TOIT-00097', { tableId: 'tbl_toit_8', sessionId: 'ses_toit_ended', customerId: '9876543210', orderStatus: 'COMPLETED', paymentStatus: 'paid', snapshots: [snapDone], offerDiscount: 150, appliedOffer: { id: 'off_toit_food10', title: '10% Off Food', type: 'PERCENTAGE', scope: 'CATEGORY', discountAmount: 150, appliedItems: ['ti_donne_biryani', 'ti_andhra_chilli_chicken'] }, assignedServer: 'srv_toit_2', notes: '', ageMin: 120 });

// ── Toit CANCELLED order on table 9 ──
const toitCancel = [buildCartItem(toit, 1, 'ti_fish_chips', 1, 'CANCELLED', { selVariants: [{ variantId: 'tv_fishchips', optionId: 'opt_seasonal' }] })];
const snapCancel = cartSnapshot(toit, 'res_toit_tbl_toit_9_dddd4444', 'CANCELLED', toitCancel, { userId: '9876543211', ageMin: 60 });
defOrder(toit, 'ord_toit_cancelled', 'TOIT-00088', { tableId: 'tbl_toit_9', sessionId: 'ses_toit_ended', customerId: '9876543211', orderStatus: 'CANCELLED', paymentStatus: 'unpaid', snapshots: [snapCancel], assignedServer: 'srv_toit_2', notes: 'Walked out', ageMin: 60 });

// ── Toit PENDING order (rare — seeded directly; e.g. queued) on table 3-adjacent history ──
const toitPending = [buildCartItem(toit, 1, 'ti_cheese_board', 1, 'PENDING'), buildCartItem(toit, 2, 'ti_pita_platter', 1, 'PENDING')];
const snapPending = cartSnapshot(toit, 'res_toit_tbl_toit_10_eeee5555', 'PENDING', toitPending, { userId: '9876543210', ageMin: 8 });
defOrder(toit, 'ord_toit_pending', 'TOIT-00120', { tableId: 'tbl_toit_10', sessionId: 'ses_toit_active', customerId: '9876543210', orderStatus: 'PENDING', paymentStatus: 'unpaid', snapshots: [snapPending], assignedServer: 'srv_toit_3', notes: 'Just placed', ageMin: 8 });

// ── Karavalli active order: high-ticket, READY/RETURNED/PREPARING items ──
const karaCart1 = [
  buildCartItem(kara, 1, 'ki_sea_crab_roast', 1, 'SERVED', { selVariants: [{ variantId: 'kv_spice', optionId: 'opt_fiery' }], notes: 'Extra spicy' }),
  buildCartItem(kara, 2, 'ki_appam', 4, 'SERVED', { selVariants: [{ variantId: 'kv_appam', optionId: 'opt_plain' }] }),
];
const karaCart2 = [
  buildCartItem(kara, 3, 'ki_prawn_biryani', 1, 'PREPARING'),
  buildCartItem(kara, 4, 'ki_syrian_chicken', 1, 'READY'),
  buildCartItem(kara, 5, 'ki_kadala_gassi', 1, 'RETURNED', { selAddonIds: ['ka_extra_appam'], notes: 'Sent back — too cold' }), // RETURNED state
  buildCartItem(kara, 6, 'ki_steamed_rice', 2, 'SERVED'),
];
const snapK1 = cartSnapshot(kara, 'res_karavalli_tbl_kara_1_ffff6666', 'SERVED', karaCart1, { userId: '9876543212', ageMin: 45 });
const snapK2 = cartSnapshot(kara, 'res_karavalli_tbl_kara_1_aaaa7777', 'PREPARING', karaCart2, { userId: '9876543212', ageMin: 20, assignedTo: 'srv_kara_kitchen' });
defOrder(kara, 'ord_kara_active', 'KARA-00042', { tableId: 'tbl_kara_1', sessionId: 'ses_kara_active', customerId: '9876543212', orderStatus: 'IN_PROGRESS', paymentStatus: 'partially_paid', snapshots: [snapK1, snapK2], assignedServer: 'srv_kara_1', notes: 'Anniversary dinner', ageMin: 45 });

defLiveCart(kara, 'tbl_kara_1', 'ses_kara_active', [
  buildCartItem(kara, 1, 'ki_bebinca', 1, 'PENDING'),
  buildCartItem(kara, 2, 'ki_elaneer_payasam', 1, 'PENDING'),
]);

// ── Karavalli COMPLETED order (history) ──
const karaDone = [
  buildCartItem(kara, 1, 'ki_prawn_roast', 1, 'SERVED', { selVariants: [{ variantId: 'kv_spice', optionId: 'opt_medium' }] }),
  buildCartItem(kara, 2, 'ki_neichoru', 1, 'SERVED', { selVariants: [{ variantId: 'kv_portion', optionId: 'opt_sharing' }], selAddonIds: ['ka_papad'] }),
  buildCartItem(kara, 3, 'ki_ada_pradhaman', 2, 'SERVED'),
];
const snapKDone = cartSnapshot(kara, 'res_karavalli_tbl_kara_2_bbbb8888', 'SERVED', karaDone, { userId: '9876543212', ageMin: 200 });
defOrder(kara, 'ord_kara_completed', 'KARA-00031', { tableId: 'tbl_kara_2', sessionId: 'ses_kara_active', customerId: '9876543212', orderStatus: 'COMPLETED', paymentStatus: 'paid', snapshots: [snapKDone], assignedServer: 'srv_kara_2', notes: '', ageMin: 200 });

// ═════════════════════════════════════════════════════════════════════════════
// OFFERS — exhaustive type × scope × condition matrix + negative cases
// ═════════════════════════════════════════════════════════════════════════════
// Toit — positive offers
defOffer(toit, 'off_toit_food10', '10% Off Food', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['tc_appetisers', 'tc_large'], benefit: { value: 10, maxDiscount: 300 }, priority: 5, description: '10% off appetisers & large plates (max ₹300)' });
defOffer(toit, 'off_toit_bar_flat100', '₹100 Off Bar (min ₹500)', { type: 'FLAT', scope: 'CATEGORY', targetIds: ['tc_brews'], benefit: { value: 100 }, conditions: { minOrderValue: 500 }, priority: 4, description: 'Flat ₹100 off beers on bills over ₹500' });
defOffer(toit, 'off_toit_bogo_blonde', 'BOGO Basmati Blonde', { type: 'BOGO', scope: 'ITEM', targetIds: ['ti_basmati_blonde'], benefit: { buyQuantity: 1, getQuantity: 1 }, description: 'Buy one Basmati Blonde, get one free' });
defOffer(toit, 'off_toit_free_dessert', 'Free Dessert with Steak', { type: 'FREE_ITEM', scope: 'ITEM', targetIds: ['ti_tiramisu', 'ti_layer_cake'], benefit: { buyQuantity: 1, getQuantity: 1 }, conditions: { requiredItems: [{ menuItemId: 'ti_char_steak', quantity: 1 }] }, description: 'Free dessert when you order the Char-Grilled Steak' });
defOffer(toit, 'off_toit_order15_cap', '15% Off Order (max ₹250)', { type: 'PERCENTAGE', scope: 'ORDER', targetIds: [], benefit: { value: 15, maxDiscount: 250 }, conditions: { minOrderValue: 1500 }, priority: 6, description: 'Big-table reward: 15% off, capped at ₹250' });
defOffer(toit, 'off_toit_firsttime', 'First Visit 20% Off', { type: 'PERCENTAGE', scope: 'ORDER', targetIds: [], benefit: { value: 20, maxDiscount: 200 }, conditions: { userHistory: { minOrderCount: 0 } }, priority: 2, description: 'First-order reward (modeled via userHistory.minOrderCount; isFirstTimeUser is NOT engine-honoured)' });
defOffer(toit, 'off_toit_pizza_excl', '10% Off Pizzas (excl Shrimp)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['tc_pizzas'], exclusionIds: ['ti_shrimp_pizza'], benefit: { value: 10, maxDiscount: 150 }, priority: 7, description: 'Exclusion-list demo' });
// Toit — negative / inactive offers (must NOT apply)
defOffer(toit, 'off_toit_expired', 'Expired Republic Day Offer', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 25 }, isActive: true, startOffset: -120 * DAY, endOffset: -30 * DAY, description: 'NEGATIVE: endDate in the past' });
defOffer(toit, 'off_toit_future', 'Upcoming NYE Offer', { type: 'FLAT', scope: 'ORDER', benefit: { value: 500 }, isActive: true, startOffset: 30 * DAY, endOffset: 90 * DAY, description: 'NEGATIVE: startDate in the future' });
defOffer(toit, 'off_toit_inactive', 'Paused Happy Hour', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['tc_brews'], benefit: { value: 30 }, isActive: false, description: 'NEGATIVE: isActive false (also filtered by query)' });

// Karavalli — positive offers
defOffer(kara, 'off_kara_seafood10', '10% Off Seafood Grill', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['kc_grill'], benefit: { value: 10, maxDiscount: 500 }, priority: 5, description: '10% off the West Coast Seafood Grill' });
defOffer(kara, 'off_kara_dessert_flat', '₹200 Off Desserts (min ₹3000)', { type: 'FLAT', scope: 'CATEGORY', targetIds: ['kc_desserts'], benefit: { value: 200 }, conditions: { minOrderValue: 3000 }, priority: 4 });
defOffer(kara, 'off_kara_loyalty', 'Taj Loyalty 12% Off', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 12, maxDiscount: 1000 }, conditions: { userHistory: { minOrderCount: 2 } }, priority: 3, description: 'Repeat-guest reward — needs ≥2 prior orders in session' });
defOffer(kara, 'off_kara_bogo_appam', 'BOGO Appam', { type: 'BOGO', scope: 'ITEM', targetIds: ['ki_appam'], benefit: { buyQuantity: 1, getQuantity: 1 }, description: 'Buy one appam, get one free' });
defOffer(kara, 'off_kara_combo_required', 'Free Payasam with Crab', { type: 'FREE_ITEM', scope: 'ITEM', targetIds: ['ki_elaneer_payasam'], benefit: { buyQuantity: 1, getQuantity: 1 }, conditions: { requiredItems: [{ menuItemId: 'ki_sea_crab_roast', quantity: 1 }] } });
// Karavalli — negative: invalid scope + empty targetIds
defOffer(kara, 'off_kara_badscope', 'Invalid Cart Offer', { type: 'PERCENTAGE', scope: 'CART', benefit: { value: 10 }, description: 'NEGATIVE: scope CART is invalid — engine rejects' });
defOffer(kara, 'off_kara_empty_target', 'Misconfigured Category Offer', { type: 'FLAT', scope: 'CATEGORY', targetIds: [], benefit: { value: 100 }, description: 'NEGATIVE: CATEGORY scope with empty targetIds — rejected' });

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG OVERRIDES (emulator) — _system/featureFlagOverrides
// ═════════════════════════════════════════════════════════════════════════════
// NOTE 1: this is GLOBAL (not per-restaurant) in the current backend.
// NOTE 2: importMockData5.js only imports `restaurants` + `customers`, so this
//   block is NOT auto-loaded. Shipped at PRODUCTION DEFAULTS so it's safe if you
//   do load it (won't surprise the existing E2E suite). To exercise the seeded
//   multi-user table (Toit table 2 / ses_toit_multi), set the override doc to
//   isMultiUserSupportEnabled:true — see MockData6_SCENARIOS.md for the one-liner.
const systemDocs = {
  featureFlagOverrides: {
    isOtpManadatoryAtScan: true,
    isUsernameEnabled: true,
    isMultiUserSupportEnabled: false,
    sendServerNotifications: false,
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// ASSEMBLE + INTEGRITY VALIDATION
// ═════════════════════════════════════════════════════════════════════════════
function stripPrivate(R) {
  const { _charges, ...rest } = R;
  if (!rest.config) delete rest.config;
  return rest;
}

const errors = [];
function check(cond, msg) { if (!cond) errors.push(msg); }

for (const R of [toit, kara]) {
  const itemIds = new Set(Object.keys(R.menuItems));
  const catIds = new Set(Object.keys(R.categories));
  const subIds = new Set(Object.keys(R.subcategories));
  const varIds = new Set(Object.keys(R.variants));
  const addIds = new Set(Object.keys(R.addons));

  // menu references
  for (const [mid, m] of Object.entries(R.menus)) {
    for (const c of m.categoryIds) check(catIds.has(c), `${R.id}/${mid}: categoryId ${c} missing`);
    for (const it of m.menuItemIds) check(itemIds.has(it), `${R.id}/${mid}: menuItemId ${it} missing`);
  }
  // category → subcategory
  for (const [cid, c] of Object.entries(R.categories)) for (const s of c.subcategoryIds) check(subIds.has(s), `${R.id}/${cid}: subcategory ${s} missing`);
  // subcategory → parent
  for (const [sid, s] of Object.entries(R.subcategories)) check(catIds.has(s.parentCategoryId), `${R.id}/${sid}: parentCategory ${s.parentCategoryId} missing`);
  // item → cat/sub + variant/addon refs
  for (const [iid, it] of Object.entries(R.menuItems)) {
    check(catIds.has(it.categoryId), `${R.id}/${iid}: categoryId ${it.categoryId} missing`);
    for (const s of it.subcategoryIds) check(subIds.has(s), `${R.id}/${iid}: subcategoryId ${s} missing`);
    for (const v of it.variants) check(varIds.has(v.id), `${R.id}/${iid}: variant ${v.id} missing`);
    for (const a of it.addons) check(addIds.has(a), `${R.id}/${iid}: addon ${a} missing`);
  }
  // variant/addon → item back-refs
  for (const [vid, v] of Object.entries(R.variants)) for (const it of v.itemsAssociatedWith) check(itemIds.has(it), `${R.id}/${vid}: itemsAssociatedWith ${it} missing`);
  for (const [aid, a] of Object.entries(R.addons)) for (const it of a.itemsAssociatedWith) check(itemIds.has(it), `${R.id}/${aid}: itemsAssociatedWith ${it} missing`);
  // offers → targets
  for (const [oid, o] of Object.entries(R.offers)) {
    for (const t of (o.targetIds || [])) {
      if (o.scope === 'ITEM') check(itemIds.has(t), `${R.id}/${oid}: ITEM targetId ${t} missing`);
      if (o.scope === 'CATEGORY') check(catIds.has(t) || subIds.has(t), `${R.id}/${oid}: CATEGORY targetId ${t} missing`);
    }
    for (const rq of (o.conditions?.requiredItems || [])) check(itemIds.has(rq.menuItemId), `${R.id}/${oid}: requiredItem ${rq.menuItemId} missing`);
  }
  // tables → assigned server + active order + session
  const srvIds = new Set(Object.keys(R.servers));
  const ordIds = new Set(Object.keys(R.orders));
  const sesIds = new Set(Object.keys(R.sessions));
  for (const [tid, t] of Object.entries(R.tables)) {
    if (t.assignedServerId) check(srvIds.has(t.assignedServerId), `${R.id}/${tid}: assignedServerId ${t.assignedServerId} missing`);
    if (t.activeOrderId) check(ordIds.has(t.activeOrderId), `${R.id}/${tid}: activeOrderId ${t.activeOrderId} missing`);
  }
  // sessions → table
  for (const [sid, s] of Object.entries(R.sessions)) check(R.tables[s.tableId], `${R.id}/${sid}: tableId ${s.tableId} missing`);
  // orders → table/session + cartIds + items + cart-item menuItems
  for (const [oid, o] of Object.entries(R.orders)) {
    check(R.tables[o.tableId], `${R.id}/${oid}: tableId ${o.tableId} missing`);
    if (o.sessionId) check(sesIds.has(o.sessionId), `${R.id}/${oid}: sessionId ${o.sessionId} missing`);
    for (const snap of o.carts) for (const ci of snap.items) check(itemIds.has(ci.menuItemId), `${R.id}/${oid}: cart item ${ci.menuItemId} missing`);
  }
  // live carts → menuItems
  for (const [tid, cart] of Object.entries(R.carts)) for (const ci of cart.items) check(itemIds.has(ci.menuItemId), `${R.id}/${tid} live cart: item ${ci.menuItemId} missing`);
}

if (errors.length) {
  console.error(`\n❌ INTEGRITY ERRORS (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

const out = {
  _meta: {
    description: 'Toit + Karavalli — large realistic restaurants with baked-in edge cases. Generated by buildMockData6.js.',
    generatedAtUnix: NOW,
    testCredentials: { otp: TEST_OTP, serverPassword: SERVER_PW, customers: ['9876543210 (returning)', '9876543211 (first-time)', '9876543212 (Karavalli regular)'] },
    note: 'Run importMockData5.js with --refresh-timestamps to make timestamps relative to import time.',
  },
  _system: systemDocs,
  restaurants: {
    res_toit: stripPrivate(toit),
    res_karavalli: stripPrivate(kara),
  },
  customers,
};

const outArg = process.argv.find(a => a.startsWith('--out='));
const outPath = outArg ? path.resolve(outArg.split('=')[1]) : path.join(__dirname, 'MockData6BigRestaurants.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

// Summary
const sum = (R) => ({
  items: Object.keys(R.menuItems).length, cats: Object.keys(R.categories).length, subs: Object.keys(R.subcategories).length,
  variants: Object.keys(R.variants).length, addons: Object.keys(R.addons).length, tables: Object.keys(R.tables).length,
  servers: Object.keys(R.servers).length, sessions: Object.keys(R.sessions).length, orders: Object.keys(R.orders).length,
  liveCarts: Object.keys(R.carts).length, offers: Object.keys(R.offers).length,
});
console.log(`✅ Wrote ${outPath}`);
console.log('   Toit     :', JSON.stringify(sum(toit)));
console.log('   Karavalli:', JSON.stringify(sum(kara)));
console.log(`   Customers: ${Object.keys(customers).length}  |  Integrity: OK`);
