/**
 * seedKit.js — reusable emulator-seed builder engine
 * ============================================================================
 * Extracted verbatim (behaviour-preserving) from buildMockData6.js so that any
 * new seed generator computes priceInfo / cart / order / charge / offer math
 * with the SAME per-component logic the backend uses
 * (cart/calculateCartValue.js, orders/calculateCharges.js, offers/*). Seeds
 * built with this kit pass the checkout validators (0.01–0.05 tolerance).
 *
 * It is a FACTORY: `createSeedKit()` closes over a single `NOW` and the
 * per-run item sequence, and returns all builders + constants. buildMockData7
 * (and, in future, a refactored buildMockData6) consume it.
 *
 * NEW vs buildMockData6:
 *   - `orderPriceInfo(snapshots, chargesConfig, offerDiscount)` — the pure
 *     order-total math, factored out of defOrder so a golden-value recorder can
 *     reuse it.
 *   - `golden` registry + `recordGolden(...)` — records {scenario → expected
 *     priceInfo / grand total} computed by this same math, emitted as a golden
 *     fixture the E2E suite asserts the LIVE backend against.
 * ============================================================================
 */
'use strict';

function createSeedKit() {
  const NOW = Math.floor(Date.now() / 1000);
  const MIN = 60, HOUR = 3600, DAY = 86400;
  const ts = (offset = 0) => ({ _seconds: NOW + offset, _nanoseconds: 0 });
  const iso = (offset = 0) => new Date((NOW + offset) * 1000).toISOString();
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const TEST_OTP = '123456';
  const SERVER_PW = '1234';
  // bcrypt of the approval PIN '1234' (TD-041). A constant so the seed is deterministic and needs no
  // bcrypt at build time. Login password and PIN are separate secrets; the seed happens to use the same digits.
  const PIN_HASH = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';

  let _itemSeq = 0;

  // ── Restaurant registry ──────────────────────────────────────────────────
  function newRestaurant(id, info, charges) {
    return {
      id, info, _charges: charges,
      menus: {}, categories: {}, subcategories: {}, menuItems: {},
      variants: {}, addons: {}, kitchens: {}, servers: {}, tables: {},
      sessions: {}, carts: {}, orders: {}, offers: {},
      config: { settings: {
        ...(charges ? { billing: { charges } } : {}),
        tax: { blocks: {
          food: { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }], defaultCode: '996331' },
          liquor: { label: 'Liquor', mode: 'inclusive', collect: true, parts: [], defaultCode: '' },
        } },
        // PY reads `payments.tenders` (domain/payments configFrom); a top-level `tenders` key was never read.
        // BT / TD-012: `account` settles a bill as money owed — never in the drawer, the ref is who owes.
        payments: { tenders: [
          { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
          { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
          { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
          { id: 'account', label: 'On account', kind: 'credit', opensDrawer: false, needsRef: true },
          // D7 (Shaurya 2026-09-25): partner payments are external tenders with the partner's reference; the payout is
          // checked by hand the next day against day close's per-tender total. Config only.
          { id: 'dineout', label: 'Dineout', kind: 'external', opensDrawer: false, needsRef: true },
          { id: 'eazydiner', label: 'EazyDiner', kind: 'external', opensDrawer: false, needsRef: true },
          { id: 'swiggy_dineout', label: 'Swiggy Dineout', kind: 'external', opensDrawer: false, needsRef: true },
        ] },
        seller: { name: info.name, taxId: 'GSTIN_' + id.replace('res_', '').toUpperCase() },
      } },
    };
  }

  // ── Price builders ────────────────────────────────────────────────────────
  /** BasicPriceInfo {basePrice, discount, finalPrice}. discount is a percentage. */
  const pi = (basePrice, discount = 0) => ({ basePrice, discount, finalPrice: round2(basePrice * (1 - discount / 100)) });
  /** Variant/addon option price (own finalPrice; parent-discount applied at cart time). */
  const optPI = (basePrice) => ({ basePrice, finalPrice: basePrice, discount: 0 });

  function estimateNutrition(base, diet) {
    const cal = Math.min(1200, 120 + Math.round(base * 0.9));
    if (diet === 'VEGAN') return { calories: cal, protein: Math.round(cal * 0.04), carbs: Math.round(cal * 0.14), fat: Math.round(cal * 0.03) };
    if (diet === 'VEG' || diet === 'EGG') return { calories: cal, protein: Math.round(cal * 0.05), carbs: Math.round(cal * 0.12), fat: Math.round(cal * 0.045) };
    return { calories: cal, protein: Math.round(cal * 0.08), carbs: Math.round(cal * 0.08), fat: Math.round(cal * 0.05) };
  }

  // ── Definition helpers ─────────────────────────────────────────────────────
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

  function defItem(R, id, name, base, opts = {}) {
    const {
      cat, sub, subs, disc = 0, diet = 'VEG', spice = 0, vegan = false,
      stock = true, cust = null, variants = [], addons = [], img = '',
      allergens = [], desc = '', nutri = null, categoryName = '',
      taxBlockId = 'food', taxCode = '996331',
    } = opts;
    const subcategoryIds = subs || (sub ? [sub] : []);
    const isCustomizable = cust === null ? (variants.length > 0 || addons.length > 0) : cust;
    R.menuItems[id] = {
      menuItemId: id,
      categoryId: cat,
      primarySubcategoryId: sub || (subcategoryIds[0] || null),
      subcategoryIds,
      meta: {
        name, description: desc, categoryName,
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
      taxBlockId,
      taxCode,
      restaurantId: R.id,
      lastUpdated: ts(-DAY),
      order: _itemSeq++,
    };
    return id;
  }

  function defServer(R, id, name, role, email, { phone = '', status = 'active' } = {}) {
    R.servers[id] = { name, role, status, email, phoneNumber: phone, password: SERVER_PW, pinHash: PIN_HASH, profileImageUrl: '', createdAt: ts(-30 * DAY), updatedAt: ts(-DAY) };
  }

  function defTable(R, id, number, capacity, status, extra = {}) {
    const t = { number, capacity, status };
    // A table carries its code for as long as a party sits at it; `expiresAt` is the HOLD a scan
    // put on the table, not the life of the code (session/otpService.js, decided 2026-09-21). So:
    //   'code'   — has a code, nobody mid-scan. The normal state of every table.
    //   'held'   — someone scanned and is on the code screen: merge and move refuse it and the
    //              tile reads `signing in`. This is what the `pending` status used to mean.
    //   'lapsed' — scanned a while ago, never finished. The claim is spent, so the table is free
    //              again with nothing having had to run to free it. The edge worth seeding.
    //   'none'   — no code at all; the next scan mints one.
    if (extra.otp === 'held') t.currentOTP = { code: TEST_OTP, createdAt: ts(-2 * MIN), expiresAt: ts(55 * MIN) };
    else if (extra.otp === 'lapsed') t.currentOTP = { code: TEST_OTP, createdAt: ts(-2 * HOUR), expiresAt: ts(-1 * HOUR) };
    else if (extra.otp === 'none') t.currentOTP = null;
    else t.currentOTP = { code: TEST_OTP, createdAt: ts(-5 * MIN), expiresAt: null };
    if (extra.primaryCustomer) t.primaryCustomer = extra.primaryCustomer;
    if (extra.occupiedBy) t.occupiedBy = extra.occupiedBy;
    if (extra.assignedServerId) t.assignedServerId = extra.assignedServerId;
    if (extra.activeOrderId) t.activeOrderId = extra.activeOrderId;
    if (status === 'active') { t.lastActivity = ts(-10 * MIN); t.firstScannedAt = ts(-40 * MIN); }
    if (extra.section) t.section = extra.section;
    if (extra.floor) t.floor = extra.floor;
    // BT: the charge rows this table carries (a counter ticket: PACKING, never the service charge). Absent = every row.
    if (extra.charges) t.charges = extra.charges;
    R.tables[id] = t;
  }

  function defSession(R, id, tableId, primaryUserId, users, status, { ageMin = 30, ttlHours = 4 } = {}) {
    R.sessions[id] = {
      tableId, primaryUserId, users, status,
      createdAt: ts(-ageMin * MIN),
      updatedAt: ts(-5 * MIN),
      expiresAt: status === 'active' ? ts(ttlHours * HOUR - ageMin * MIN) : ts(-(ageMin * MIN) + ttlHours * HOUR - ageMin * MIN),
    };
    if (status !== 'active') R.sessions[id].expiresAt = ts(-(ageMin - ttlHours * 60) * MIN);
    return id;
  }

  // ── Cart item builder with full per-component price math ────────────────────
  // selVariants: [{variantId, optionId}]   selAddonIds: [addonId]
  function buildCartItem(R, cartItemId, menuItemId, qty, status, { selVariants = [], selAddonIds = [], notes = '' } = {}) {
    const mi = R.menuItems[menuItemId];
    if (!mi) throw new Error(`buildCartItem: unknown menuItem ${menuItemId}`);
    const itemDiscount = mi.priceInfo.discount;
    const itemBase = mi.priceInfo.basePrice;
    const itemFinal = mi.priceInfo.finalPrice;

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
        selected_variant_id: opt.id, selected_variant_name: opt.name,
        priceInfo: { basePrice: oBase, discount: v.respectParentDiscount ? itemDiscount : 0, finalPrice: oFinal },
      });
    }
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
      cartItemId, menuItemId,
      categoryId: mi.categoryId,
      subcategoryIds: mi.subcategoryIds,
      name: mi.meta.name,
      menuItem: embeddedMenuItem,
      quantity: q,
      selectedVariants: selectedVariantsMap,
      selectedVariantsDetails: variantDetails,
      selectedAddons: selAddonIds.slice(),
      selectedAddonsDetails: addonDetails,
      priceInfo, notes, status,
    };
  }

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

  function defLiveCart(R, tableId, sessionId, items) {
    R.carts[tableId] = { restaurantId: R.id, tableId, sessionId, items, priceInfo: cartTotals(items), lastUpdated: ts(-2 * MIN) };
  }

  function cartSnapshot(R, cartId, status, items, { userId, notes = '', prepMin = null, assignedTo = null, ageMin = 20 } = {}) {
    const snap = {
      restaurantId: R.id, cartId, status, items,
      priceInfo: cartTotals(items),
      statusHistory: [{ status: 'PENDING', timestamp: ts(-ageMin * MIN), userId, notes: '' }],
      checkoutTime: ts(-ageMin * MIN),
      notes,
      estimatedPrepTime: prepMin == null ? (10 + items.reduce((s, i) => s + 2 * i.quantity, 0)) : prepMin,
      assignedTo,
    };
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

  function normalizeForOrder(snapshots) {
    const out = [];
    for (const snap of snapshots) {
      for (const it of snap.items) {
        if (it.status === 'CANCELLED' || !it.menuItemId) continue;
        out.push({
          menuItemId: it.menuItemId,
          name: it.name,
          description: (it.menuItem && it.menuItem.meta && it.menuItem.meta.description) || '',
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

  function calcCharges(postOfferFinal, chargesConfig) {
    if (!Array.isArray(chargesConfig) || chargesConfig.length === 0) return { charges: [], chargesTotal: 0 };
    const charges = chargesConfig
      .filter(c => c && typeof c.type === 'string' && c.type && typeof c.percentage === 'number')
      .map(c => ({ type: c.type, percentage: c.percentage, amount: round2(postOfferFinal * c.percentage / 100) }));
    const chargesTotal = round2(charges.reduce((s, c) => s + c.amount, 0));
    return { charges, chargesTotal };
  }

  /**
   * Pure order-total math (factored from defOrder). Given cart snapshots, a
   * restaurant charges config, and a chosen offerDiscount, returns the exact
   * order priceInfo the backend produces + the grand total the customer pays.
   * grandTotal = postOfferFinal + chargesTotal.
   */
  function orderPriceInfo(snapshots, chargesConfig, offerDiscount = 0) {
    let basePrice = 0, finalPrice = 0;
    for (const s of snapshots) { basePrice += s.priceInfo.basePrice; finalPrice += s.priceInfo.finalPrice; }
    basePrice = round2(basePrice); finalPrice = round2(finalPrice);
    const itemDiscountAmount = Math.max(0, round2(basePrice - finalPrice));
    const postOfferFinal = Math.max(0, round2(finalPrice - offerDiscount));
    const { charges, chargesTotal } = calcCharges(postOfferFinal, chargesConfig || []);
    const priceInfo = {
      basePrice,
      finalPrice: postOfferFinal,
      totalDiscount: basePrice > 0 ? round2((itemDiscountAmount / basePrice) * 100) : 0,
      totalDiscountAmount: round2(itemDiscountAmount + offerDiscount),
      offerDiscount: round2(offerDiscount),
    };
    if (charges.length > 0) { priceInfo.charges = charges; priceInfo.chargesTotal = chargesTotal; }
    return { priceInfo, grandTotal: round2(postOfferFinal + chargesTotal), itemDiscountAmount, postOfferFinal, chargesTotal };
  }

  function defOrder(R, orderId, orderNumber, { tableId, sessionId, customerId, orderStatus, paymentStatus, snapshots, appliedOffer = null, offerDiscount = 0, assignedServer = null, notes = '', ageMin = 30 }) {
    const items = normalizeForOrder(snapshots);
    const { priceInfo } = orderPriceInfo(snapshots, R._charges || [], offerDiscount);
    R.orders[orderId] = {
      orderId, restaurantId: R.id, tableId, orderNumber,
      orderStatus, paymentStatus,
      carts: snapshots, items, priceInfo,
      createdAt: ts(-ageMin * MIN), updatedAt: ts(-5 * MIN),
      isActive: orderStatus === 'IN_PROGRESS' || orderStatus === 'PENDING',
      assignedServer, notes, sessionId, customerId, appliedOffer,
    };
    return orderId;
  }

  function defOffer(R, id, title, { type, scope, targetIds = [], exclusionIds = [], benefit, conditions = {}, isActive = true, startOffset = -30 * DAY, endOffset = 180 * DAY, priority, description = '', code }) {
    const o = {
      id, title, description, type, scope, targetIds, isActive,
      validity: { startDate: iso(startOffset), endDate: iso(endOffset) },
      conditions, benefit,
    };
    if (exclusionIds.length) o.exclusionIds = exclusionIds;
    if (priority != null) o.priority = priority;
    if (code) o.code = code;
    R.offers[id] = o;
    return id;
  }

  function stripPrivate(R) {
    const { _charges, ...rest } = R;
    if (!rest.config) delete rest.config;
    return rest;
  }

  // ── Integrity validation (same checks as buildMockData6) ────────────────────
  function runIntegrity(restaurants) {
    const errors = [];
    const check = (cond, msg) => { if (!cond) errors.push(msg); };
    for (const R of restaurants) {
      const itemIds = new Set(Object.keys(R.menuItems));
      const catIds = new Set(Object.keys(R.categories));
      const subIds = new Set(Object.keys(R.subcategories));
      const varIds = new Set(Object.keys(R.variants));
      const addIds = new Set(Object.keys(R.addons));
      for (const [mid, m] of Object.entries(R.menus)) {
        for (const c of m.categoryIds) check(catIds.has(c), `${R.id}/${mid}: categoryId ${c} missing`);
        for (const it of m.menuItemIds) check(itemIds.has(it), `${R.id}/${mid}: menuItemId ${it} missing`);
      }
      for (const [cid, c] of Object.entries(R.categories)) for (const s of c.subcategoryIds) check(subIds.has(s), `${R.id}/${cid}: subcategory ${s} missing`);
      for (const [sid, s] of Object.entries(R.subcategories)) check(catIds.has(s.parentCategoryId), `${R.id}/${sid}: parentCategory ${s.parentCategoryId} missing`);
      for (const [iid, it] of Object.entries(R.menuItems)) {
        check(catIds.has(it.categoryId), `${R.id}/${iid}: categoryId ${it.categoryId} missing`);
        for (const s of it.subcategoryIds) check(subIds.has(s), `${R.id}/${iid}: subcategoryId ${s} missing`);
        for (const v of it.variants) check(varIds.has(v.id), `${R.id}/${iid}: variant ${v.id} missing`);
        for (const a of it.addons) check(addIds.has(a), `${R.id}/${iid}: addon ${a} missing`);
      }
      for (const [vid, v] of Object.entries(R.variants)) for (const it of v.itemsAssociatedWith) check(itemIds.has(it), `${R.id}/${vid}: itemsAssociatedWith ${it} missing`);
      for (const [aid, a] of Object.entries(R.addons)) for (const it of a.itemsAssociatedWith) check(itemIds.has(it), `${R.id}/${aid}: itemsAssociatedWith ${it} missing`);
      for (const [oid, o] of Object.entries(R.offers)) {
        for (const t of (o.targetIds || [])) {
          if (o.scope === 'ITEM') check(itemIds.has(t), `${R.id}/${oid}: ITEM targetId ${t} missing`);
          if (o.scope === 'CATEGORY') check(catIds.has(t) || subIds.has(t), `${R.id}/${oid}: CATEGORY targetId ${t} missing`);
        }
        for (const rq of ((o.conditions && o.conditions.requiredItems) || [])) check(itemIds.has(rq.menuItemId), `${R.id}/${oid}: requiredItem ${rq.menuItemId} missing`);
      }
      const srvIds = new Set(Object.keys(R.servers));
      const ordIds = new Set(Object.keys(R.orders));
      const sesIds = new Set(Object.keys(R.sessions));
      for (const [tid, t] of Object.entries(R.tables)) {
        if (t.assignedServerId) check(srvIds.has(t.assignedServerId), `${R.id}/${tid}: assignedServerId ${t.assignedServerId} missing`);
        if (t.activeOrderId) check(ordIds.has(t.activeOrderId), `${R.id}/${tid}: activeOrderId ${t.activeOrderId} missing`);
      }
      for (const [sid, s] of Object.entries(R.sessions)) check(R.tables[s.tableId], `${R.id}/${sid}: tableId ${s.tableId} missing`);
      for (const [oid, o] of Object.entries(R.orders)) {
        check(R.tables[o.tableId], `${R.id}/${oid}: tableId ${o.tableId} missing`);
        if (o.sessionId) check(sesIds.has(o.sessionId), `${R.id}/${oid}: sessionId ${o.sessionId} missing`);
        for (const snap of o.carts) for (const ci of snap.items) check(itemIds.has(ci.menuItemId), `${R.id}/${oid}: cart item ${ci.menuItemId} missing`);
      }
      for (const [tid, cart] of Object.entries(R.carts)) for (const ci of cart.items) check(itemIds.has(ci.menuItemId), `${R.id}/${tid} live cart: item ${ci.menuItemId} missing`);
    }
    return errors;
  }

  // ── Golden expected-value registry ──────────────────────────────────────────
  // Each entry is an independent (non-backend) computation of what the LIVE
  // backend should return for a scenario. The E2E suite asserts backend ↔ golden.
  const golden = { scenarios: [] };   // no build time: it churned the committed file on every seed

  /**
   * Record a single-item pricing scenario (exercises calculateItemPrice).
   * itemSpec: { menuItemId, quantity, selVariants, selAddonIds }
   */
  function recordItemGolden(R, scenarioId, description, itemSpec, tags = []) {
    const ci = buildCartItem(R, 0, itemSpec.menuItemId, itemSpec.quantity || 1, 'PENDING', {
      selVariants: itemSpec.selVariants || [], selAddonIds: itemSpec.selAddonIds || [],
    });
    golden.scenarios.push({
      scenarioId, kind: 'item', restaurantId: R.id, description, tags,
      input: { menuItemId: itemSpec.menuItemId, quantity: itemSpec.quantity || 1, selVariants: itemSpec.selVariants || [], selAddonIds: itemSpec.selAddonIds || [] },
      expected: {
        itemBasePrice: ci.priceInfo.itemBasePrice,
        itemFinalPrice: ci.priceInfo.itemFinalPrice,
        totalVariantFinalPrice: ci.priceInfo.totalVariantFinalPrice,
        totalAddonFinalPrice: ci.priceInfo.totalAddonFinalPrice,
        totalBasePrice: ci.priceInfo.totalBasePrice,
        finalPrice: ci.priceInfo.finalPrice,
        discountAmount: ci.priceInfo.discountAmount,
      },
    });
    return ci;
  }

  /**
   * Record a full checkout scenario (item discounts + offer + charges → grand total).
   * itemSpecs: array of { menuItemId, quantity, selVariants, selAddonIds }
   * offer: { offerId, offerDiscount } (offerDiscount pre-computed by the caller).
   */
  function recordCheckoutGolden(R, scenarioId, description, itemSpecs, { offerId = null, offerDiscount = 0 } = {}, tags = []) {
    const items = itemSpecs.map((s, i) => buildCartItem(R, i + 1, s.menuItemId, s.quantity || 1, 'PENDING', {
      selVariants: s.selVariants || [], selAddonIds: s.selAddonIds || [],
    }));
    const snap = cartSnapshot(R, `golden_${scenarioId}`, 'PENDING', items, { userId: 'golden' });
    const { priceInfo, grandTotal } = orderPriceInfo([snap], R._charges || [], offerDiscount);
    golden.scenarios.push({
      scenarioId, kind: 'checkout', restaurantId: R.id, description, tags,
      input: { items: itemSpecs, offerId },
      expected: {
        basePrice: priceInfo.basePrice,
        itemFinalPrice: round2(priceInfo.finalPrice + (priceInfo.offerDiscount || 0)),
        offerDiscount: priceInfo.offerDiscount || 0,
        finalPriceAfterOffer: priceInfo.finalPrice,
        charges: priceInfo.charges || [],
        chargesTotal: priceInfo.chargesTotal || 0,
        grandTotal,
        totalDiscountAmount: priceInfo.totalDiscountAmount,
      },
    });
    return { items, snap, priceInfo, grandTotal };
  }

  return {
    NOW, MIN, HOUR, DAY, ts, iso, round2, TEST_OTP, SERVER_PW,
    newRestaurant, pi, optPI, estimateNutrition,
    defMenu, defCategory, defSub, defKitchen, defVariant, defAddon, defItem,
    defServer, defTable, defSession,
    buildCartItem, cartTotals, defLiveCart, cartSnapshot, normalizeForOrder,
    calcCharges, orderPriceInfo, defOrder, defOffer,
    stripPrivate, runIntegrity,
    golden, recordItemGolden, recordCheckoutGolden,
  };
}

module.exports = { createSeedKit };
