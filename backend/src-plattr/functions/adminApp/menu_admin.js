const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { validateAdminSession } = require('./auth');
const { safeArrayUnion, safeArrayRemove, applyArrayOperation } = require('../utils/arrayOperations');
const timestamp = require('../utils/timestamp');
const { BasicPriceInfo } = require('../genericModels/priceinfo');
const { auditRow } = require('../lib/domain/approvals');

// Raw FieldValue is undefined in the emulator (addSubcategory crashed there); go through the repo's safe ops.
async function updateSubcategoryIds(categoryRef, op) {
  const snap = await categoryRef.get();
  const update = {};
  applyArrayOperation(update, 'subcategoryIds', (snap.data() || {}).subcategoryIds || [], op);
  await categoryRef.update(update);
}

function requireField(value, message) {
  if (value === undefined || value === null || value === '') {
    errorHandler.badRequest(message);
  }
}

async function getRestaurantRef(restaurantId) {
  requireField(restaurantId, 'Restaurant ID is required');
  const restaurantRef = db.collection('restaurants').doc(restaurantId);
  const restaurantDoc = await restaurantRef.get();
  if (!restaurantDoc.exists) {
    errorHandler.notFound('Restaurant not found', { restaurantId });
  }
  return restaurantRef;
}

exports.addCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, category } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(category, 'Category payload is required');
    requireField(category?.name, 'Category name is required');
    requireField(category?.order, 'Category order is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const payload = {
      name: category.name,
      order: Number(category.order) || 0,
      description: category.description || '',
      image: category.image || '',
      subcategoryIds: category.subcategoryIds || [],
    };

    const docRef = await restaurantRef.collection('categories').add(payload);
    return ResponseBuilder.success({ categoryId: docRef.id }, 'Category created');
  } catch (error) {
    console.error('Error in addCategory:', error);
    return errorHandler.handleError(error, 'addCategory');
  }
});

exports.updateCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, categoryId, updateData } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(categoryId, 'Category ID is required');
    requireField(updateData, 'Update data is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);

    // Only include fields that are explicitly provided (not undefined)
    // This prevents overwriting existing values when fields are omitted
    const payload = {};

    if (updateData.name !== undefined) {
      payload.name = updateData.name;
    }
    if (updateData.order !== undefined) {
      payload.order = Number(updateData.order);
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description;
    }
    if (updateData.image !== undefined) {
      payload.image = updateData.image;
    }

    if (Object.keys(payload).length === 0) {
      return errorHandler.badRequest('No valid fields to update');
    }

    await restaurantRef.collection('categories').doc(categoryId).update(payload);
    return ResponseBuilder.success(null, 'Category updated');
  } catch (error) {
    console.error('Error in updateCategory:', error);
    return errorHandler.handleError(error, 'updateCategory');
  }
});

exports.deleteCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, categoryId } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(categoryId, 'Category ID is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    await restaurantRef.collection('categories').doc(categoryId).delete();
    return ResponseBuilder.success(null, 'Category deleted');
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    return errorHandler.handleError(error, 'deleteCategory');
  }
});

exports.addSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategory } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategory, 'Subcategory payload is required');
    requireField(subcategory?.name, 'Subcategory name is required');
    requireField(subcategory?.order, 'Subcategory order is required');
    requireField(subcategory?.parentCategoryId, 'Parent category is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const payload = {
      name: subcategory.name,
      order: Number(subcategory.order) || 0,
      description: subcategory.description || '',
      image: subcategory.image || '',
      parentCategoryId: subcategory.parentCategoryId,
    };

    const docRef = await restaurantRef.collection('subcategories').add(payload);
    await updateSubcategoryIds(restaurantRef.collection('categories').doc(subcategory.parentCategoryId), safeArrayUnion(docRef.id));

    return ResponseBuilder.success({ subcategoryId: docRef.id }, 'Subcategory created');
  } catch (error) {
    console.error('Error in addSubcategory:', error);
    return errorHandler.handleError(error, 'addSubcategory');
  }
});

exports.updateSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategoryId, updateData } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategoryId, 'Subcategory ID is required');
    requireField(updateData, 'Update data is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const subcategoryRef = restaurantRef.collection('subcategories').doc(subcategoryId);
    const snapshot = await subcategoryRef.get();

    if (!snapshot.exists) {
      errorHandler.notFound('Subcategory not found', { subcategoryId });
    }

    const existing = snapshot.data() || {};
    const newParentId = updateData.parentCategoryId !== undefined
      ? updateData.parentCategoryId
      : existing.parentCategoryId;

    // Only include fields that are explicitly provided (not undefined)
    // This prevents overwriting existing values when fields are omitted
    const payload = {};

    if (updateData.name !== undefined) {
      payload.name = updateData.name;
    }
    if (updateData.order !== undefined) {
      payload.order = Number(updateData.order);
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description;
    }
    if (updateData.image !== undefined) {
      payload.image = updateData.image;
    }
    if (updateData.parentCategoryId !== undefined) {
      payload.parentCategoryId = newParentId;
    }

    if (Object.keys(payload).length === 0) {
      return errorHandler.badRequest('No valid fields to update');
    }

    await subcategoryRef.update(payload);

    if (existing.parentCategoryId && existing.parentCategoryId !== newParentId) {
      await updateSubcategoryIds(restaurantRef.collection('categories').doc(existing.parentCategoryId), safeArrayRemove(subcategoryId));
      await updateSubcategoryIds(restaurantRef.collection('categories').doc(newParentId), safeArrayUnion(subcategoryId));
    }

    return ResponseBuilder.success(null, 'Subcategory updated');
  } catch (error) {
    console.error('Error in updateSubcategory:', error);
    return errorHandler.handleError(error, 'updateSubcategory');
  }
});

exports.deleteSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategoryId } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategoryId, 'Subcategory ID is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const subcategoryRef = restaurantRef.collection('subcategories').doc(subcategoryId);
    const snapshot = await subcategoryRef.get();
    if (!snapshot.exists) {
      errorHandler.notFound('Subcategory not found', { subcategoryId });
    }

    const subcategory = snapshot.data() || {};
    await subcategoryRef.delete();

    if (subcategory.parentCategoryId) {
      await updateSubcategoryIds(restaurantRef.collection('categories').doc(subcategory.parentCategoryId), safeArrayRemove(subcategoryId));
    }

    return ResponseBuilder.success(null, 'Subcategory deleted');
  } catch (error) {
    console.error('Error in deleteSubcategory:', error);
    return errorHandler.handleError(error, 'deleteSubcategory');
  }
});

// ── Shared add-ons and portions (D6) ────────────────────────────────────────────────────────────────────────
// DECISION(D6, 2026-09-25): an admin edit to an add-on or portion edits the shared record every dish links to, and
// the editor says so: "Extra Raita is on 3 dishes — this changes all 3". "Only this dish" copies the record and
// relinks that one dish. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
// Pricing is untouched: the cart and the menu read already price from these records. A price fixed when a guest
// added the dish stays (Q6-2): Raita ₹40 in a cart at 19:55, raised to ₹50 at 20:00, is sent at 20:05 at ₹40.
const SHARED = { addon: 'addons', variant: 'variants' };

/** One audit row per act, in the same transaction (moonshot/CLAUDE.md). A menu edit is a P1 for the morning look. */
function menuAuditRow(staffId, action, cid, before, after, note) {
  return { ...auditRow({ ts: Date.now(), cid, action, staffId, sev: 'P1', reason: 'menu edit', note, lineId: null, before, after }),
    createdAt: timestamp.serverTimestamp() };
}

/** How many dishes link each shared record. Counted over every dish, not the active menu's (TD-111). */
async function countUsage(restaurantRef) {
  // ponytail: reads every dish of the restaurant (a few hundred docs) per call; keep a count on the record if menus grow.
  const out = { addons: {}, variants: {} };
  for (const doc of (await restaurantRef.collection('menuItems').get()).docs) {
    const item = doc.data();
    for (const id of new Set(item.addons || [])) out.addons[id] = (out.addons[id] || 0) + 1;
    for (const id of new Set((item.variants || []).map(v => v.id))) out.variants[id] = (out.variants[id] || 0) + 1;
  }
  return out;
}

const priceOf = (p, what) => {
  if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) errorHandler.badRequest(`${what}: the price must be a number, ₹0 or more`, { price: p });
  return p;
};
const nameOf = n => {
  if (typeof n !== 'string' || !n.trim()) errorHandler.badRequest('The name must not be empty');
  return n.trim();
};
const onlyKeys = (o, keys, what) => {
  const extra = Object.keys(o || {}).filter(k => !keys.includes(k));
  if (extra.length) errorHandler.badRequest(`${what}: cannot change ${extra.join(', ')} here`, { extra });
};

/**
 * The changed fields applied to a copy of the record. Only name and price (per portion option); stock goes
 * through menu-updateMenuItemAvailability, where the waiter can reach it too. Returns the record and the
 * top-level fields it touched, so the write names only those.
 */
function applyChanges(kind, record, changes) {
  onlyKeys(changes, kind === 'addon' ? ['name', 'price'] : ['name', 'options'], kind);
  if (!changes || !Object.keys(changes).length) errorHandler.badRequest('Nothing to change');
  const next = JSON.parse(JSON.stringify(record));
  const touched = new Set();
  if (changes.name !== undefined) {
    next.meta = { ...(next.meta || {}), name: nameOf(changes.name) };
    touched.add('meta');
    if (kind === 'variant') { next.name = next.meta.name; touched.add('name'); }
  }
  if (kind === 'addon' && changes.price !== undefined) {
    next.priceInfo = new BasicPriceInfo(priceOf(changes.price, 'Add-on'), next.priceInfo?.discount || 0).toObject();
    touched.add('priceInfo');
  }
  if (kind === 'variant' && changes.options !== undefined) {
    if (!Array.isArray(changes.options) || !changes.options.length) errorHandler.badRequest('options must list the portion options to change');
    for (const c of changes.options) {
      onlyKeys(c, ['id', 'name', 'price'], 'portion option');
      const opt = (next.options || []).find(o => o.id === c?.id);
      if (!opt) errorHandler.badRequest(`Unknown portion option "${c?.id}" on ${record.name || record.id}`, { optionId: c?.id });
      if (c.name !== undefined) opt.name = nameOf(c.name);
      if (c.price !== undefined) opt.priceInfo = new BasicPriceInfo(priceOf(c.price, `Portion ${opt.name}`), opt.priceInfo?.discount || 0).toObject();
    }
    touched.add('options');
  }
  return { next, touched: [...touched] };
}

const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

/**
 * admin-sharedOption { restaurantId, sessionId, action, kind: 'addon'|'variant', id, menuItemId, changes }
 *   usage        → { addons: {id: n}, variants: {id: n} }   dishes linking each record
 *   create       → { id, record }            a new add-on (Q6-3), name + price; the dish save links it
 *   update       → { id, usedBy, record }    changes the shared record: every linked dish follows
 *   copyForDish  → { id, record, menuItemId } copies the record with the changes, relinks that one dish
 */
exports.sharedOption = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, action, kind, id, menuItemId, changes } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    const { serverId } = await validateAdminSession(restaurantId, sessionId);
    const restaurantRef = await getRestaurantRef(restaurantId);

    if (action === 'usage') return ResponseBuilder.success(await countUsage(restaurantRef), 'Usage counted');

    if (!SHARED[kind]) errorHandler.badRequest('kind must be addon or variant', { kind });
    const col = restaurantRef.collection(SHARED[kind]);
    const audit = restaurantRef.collection('audit');
    const label = kind === 'addon' ? 'add-on' : 'portion';

    if (action === 'create') {
      if (kind !== 'addon') errorHandler.badRequest('Only add-ons can be created here');
      requireField(changes?.name, 'The add-on needs a name');
      onlyKeys(changes, ['name', 'price'], 'add-on');
      const ref = col.doc();
      const record = {
        id: ref.id,   // the cart finds a record by this field, not the doc id: they must match
        meta: { name: nameOf(changes.name), description: '' },
        priceInfo: new BasicPriceInfo(priceOf(changes.price, 'Add-on'), 0).toObject(),
        isInStock: true, respectParentDiscount: false, isMandatory: false,
      };
      await db.runTransaction(async tx => {
        tx.set(ref, { ...record, lastUpdated: timestamp.serverTimestamp() });
        tx.create(audit.doc(), menuAuditRow(serverId, 'menuOptionCreate', `menu_${ref.id}`, null, record, 'addon'));
      });
      console.log(JSON.stringify({ cid: `menu_${ref.id}`, action: 'menuOptionCreate', restaurantId, kind, staffId: serverId }));
      return ResponseBuilder.success({ id: ref.id, record }, 'Add-on created');
    }

    requireField(id, `The ${label} id is required`);
    const ref = col.doc(id);

    if (action === 'update') {
      const record = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) errorHandler.notFound(`No ${label} "${id}"`, { id });
        const before = snap.data();
        const { next, touched } = applyChanges(kind, before, changes);
        tx.update(ref, { ...pick(next, touched), lastUpdated: timestamp.serverTimestamp() });
        tx.create(audit.doc(), menuAuditRow(serverId, 'menuOptionEdit', `menu_${id}`, pick(before, touched), pick(next, touched), kind));
        return next;
      });
      const usedBy = (await countUsage(restaurantRef))[SHARED[kind]][id] || 0;
      console.log(JSON.stringify({ cid: `menu_${id}`, action: 'menuOptionEdit', restaurantId, kind, usedBy, staffId: serverId }));
      return ResponseBuilder.success({ id, usedBy, record }, `Changed on ${usedBy} dishes`);
    }

    if (action === 'copyForDish') {
      requireField(menuItemId, 'Which dish? menuItemId is required');
      const dishRef = restaurantRef.collection('menuItems').doc(menuItemId);
      const copyRef = col.doc();
      // Chicken and Mutton Biryani share Family ₹260; "Only Mutton Biryani" at ₹300 makes a new portion record
      // for Mutton alone and repoints Mutton's link, in one transaction. Chicken keeps the shared ₹260.
      const record = await db.runTransaction(async tx => {
        const [snap, dish] = [await tx.get(ref), await tx.get(dishRef)];
        if (!snap.exists) errorHandler.notFound(`No ${label} "${id}"`, { id });
        if (!dish.exists) errorHandler.notFound(`No dish "${menuItemId}"`, { menuItemId });
        const item = dish.data();
        const links = kind === 'addon' ? (item.addons || []) : (item.variants || []).map(v => v.id);
        if (!links.includes(id)) errorHandler.badRequest(`${item.meta?.name || menuItemId} does not use this ${label}`, { id, menuItemId });
        const { next } = applyChanges(kind, snap.data(), changes);
        const { itemsAssociatedWith, ...copy } = { ...next, id: copyRef.id };   // that list is maintained by no code
        tx.set(copyRef, { ...copy, lastUpdated: timestamp.serverTimestamp() });
        tx.update(dishRef, kind === 'addon'
          ? { addons: item.addons.map(a => (a === id ? copyRef.id : a)), lastUpdated: timestamp.serverTimestamp() }
          : { variants: item.variants.map(v => (v.id === id ? { id: copyRef.id, name: copy.name } : v)), lastUpdated: timestamp.serverTimestamp() });
        tx.create(audit.doc(), menuAuditRow(serverId, 'menuOptionCopy', `menu_${copyRef.id}`, { from: id, record: snap.data() }, copy, `${kind} for ${menuItemId}`));
        return copy;
      });
      console.log(JSON.stringify({ cid: `menu_${copyRef.id}`, action: 'menuOptionCopy', restaurantId, kind, from: id, menuItemId, staffId: serverId }));
      return ResponseBuilder.success({ id: copyRef.id, record, menuItemId }, 'Copied for this dish');
    }

    return errorHandler.badRequest('action must be usage, create, update or copyForDish', { action });
  } catch (error) {
    console.error('Error in sharedOption:', error);
    return errorHandler.handleError(error, 'sharedOption');
  }
});

exports.menuAuditRow = menuAuditRow;
