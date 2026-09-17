#!/usr/bin/env node
/**
 * validate-seed.js — cross-reference validator for an import-ready seed.
 *
 *   node validate-seed.js [path/to/firestore-kaanchipuram-kaapi-hsr.json]
 *
 * Exits non-zero on any failure. Checks the ONBOARDING_PROMPT cross-reference
 * rules plus the structural/price/staff/table invariants the backend relies on.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, 'firestore-kaanchipuram-kaapi-hsr.json'));

// The transcription of the two menu photos enumerates 30 priced lines.
// (The Phase A brief said "31 lines" — see PROD_DEPLOY_LOG.md; recount with the
// owner before printing anything.)
const EXPECTED_ITEM_COUNT = 30;
const EXPECTED_TABLE_COUNT = 10;
const VALID_ROLES = ['ADMIN', 'MANAGER', 'SERVER', 'KITCHEN'];
const VALID_TABLE_STATUS = ['active', 'vacant', 'disabled', 'pending', 'reserved'];

const fails = [];
const notes = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

const seed = JSON.parse(fs.readFileSync(FILE, 'utf8'));

check(seed.customers !== undefined, 'top level: missing `customers` key (importer expects it)');
check(seed.restaurants && Object.keys(seed.restaurants).length > 0, 'top level: no restaurants');
check(seed._system === undefined, 'top level: `_system` must not be emitted for production');

for (const [rid, r] of Object.entries(seed.restaurants || {})) {
  const P = (m) => `${rid}: ${m}`;
  const cats = r.categories || {};
  const subs = r.subcategories || {};
  const items = r.menuItems || {};
  const variants = r.variants || {};
  const addons = r.addons || {};
  const menu = (r.menus || {}).menu_main;

  // ── info ────────────────────────────────────────────────────────────────
  check(r.info && r.info.name, P('info.name is required (serverLogin + validateTableAndLocation read it)'));
  check(r.info && r.info.location && typeof r.info.location._latitude === 'number'
    && typeof r.info.location._longitude === 'number', P('info.location needs numeric _latitude/_longitude'));

  // ── menu doc ────────────────────────────────────────────────────────────
  check(menu, P('menus.menu_main missing'));
  if (menu) {
    check(menu.isActive === true || menu.isDefault === true, P('menu_main must be isActive or isDefault'));
    const inMenu = new Set(menu.menuItemIds || []);
    const inMenuCats = new Set(menu.categoryIds || []);
    for (const id of Object.keys(items)) check(inMenu.has(id), P(`menuItem ${id} missing from menu.menuItemIds`));
    for (const id of menu.menuItemIds || []) check(items[id], P(`menu.menuItemIds references unknown item ${id}`));
    for (const id of Object.keys(cats)) check(inMenuCats.has(id), P(`category ${id} missing from menu.categoryIds`));
    for (const id of menu.categoryIds || []) check(cats[id], P(`menu.categoryIds references unknown category ${id}`));
  }

  // ── categories / subcategories ──────────────────────────────────────────
  for (const [cid, c] of Object.entries(cats)) {
    check(c.id === cid, P(`category ${cid}: id field mismatch (${c.id})`));
    check(!!c.name, P(`category ${cid}: name required (fetchMenu skips nameless categories)`));
    check(typeof c.order === 'number', P(`category ${cid}: numeric order required (fetchMenu orderBy('order'))`));
    check(Array.isArray(c.subcategoryIds) && c.subcategoryIds.length >= 1,
      P(`category ${cid}: needs >=1 subcategory (two-level nav)`));
    for (const sid of c.subcategoryIds || []) {
      check(subs[sid], P(`category ${cid}: subcategoryIds references unknown subcategory ${sid}`));
      check(subs[sid] && subs[sid].parentCategoryId === cid,
        P(`subcategory ${sid}: parentCategoryId should be ${cid}`));
    }
  }
  for (const [sid, s] of Object.entries(subs)) {
    check(s.id === sid, P(`subcategory ${sid}: id field mismatch (${s.id})`));
    check(!!s.name, P(`subcategory ${sid}: name required`));
    check(typeof s.order === 'number', P(`subcategory ${sid}: numeric order required (orderBy('order'))`));
    const parent = cats[s.parentCategoryId];
    check(parent, P(`subcategory ${sid}: unknown parentCategoryId ${s.parentCategoryId}`));
    check(parent && (parent.subcategoryIds || []).includes(sid),
      P(`subcategory ${sid}: not listed in parent ${s.parentCategoryId}.subcategoryIds`));
  }

  // ── menu items ──────────────────────────────────────────────────────────
  const seenNames = new Map();
  const variantRefs = new Map();   // variantId -> [itemIds]
  const addonRefs = new Map();     // addonId  -> [itemIds]

  for (const [iid, it] of Object.entries(items)) {
    check(it.menuItemId === iid, P(`item ${iid}: menuItemId mismatch (${it.menuItemId})`));
    check(it.meta && it.meta.name, P(`item ${iid}: meta.name required`));
    check(it.meta && typeof it.meta.description === 'string' && it.meta.description.length > 0,
      P(`item ${iid}: meta.description required`));
    check(it.meta && it.meta.image !== undefined, P(`item ${iid}: meta.image required (use "")`));
    check(it.isInStock === true, P(`item ${iid}: isInStock must be true (fetchMenu defaults inStock=true and filters)`));

    // exactly one category, and it exists
    const cat = cats[it.categoryId];
    check(cat, P(`item ${iid}: unknown categoryId ${it.categoryId}`));
    check(typeof it.categoryId === 'string', P(`item ${iid}: categoryId must be a single string`));
    check(cat && it.meta && it.meta.categoryName === cat.name,
      P(`item ${iid}: meta.categoryName "${it.meta && it.meta.categoryName}" != category name "${cat && cat.name}"`));

    check(Array.isArray(it.subcategoryIds) && it.subcategoryIds.length >= 1,
      P(`item ${iid}: needs >=1 subcategoryIds (fetchMenu groups items by it)`));
    check(subs[it.primarySubcategoryId], P(`item ${iid}: unknown primarySubcategoryId ${it.primarySubcategoryId}`));
    check((it.subcategoryIds || []).includes(it.primarySubcategoryId),
      P(`item ${iid}: primarySubcategoryId not in subcategoryIds`));
    for (const sid of it.subcategoryIds || []) {
      check(subs[sid], P(`item ${iid}: unknown subcategory ${sid}`));
      check(subs[sid] && subs[sid].parentCategoryId === it.categoryId,
        P(`item ${iid}: subcategory ${sid} belongs to a different category`));
    }

    // price arithmetic
    const pi = it.priceInfo || {};
    check(typeof pi.basePrice === 'number' && pi.basePrice > 0, P(`item ${iid}: priceInfo.basePrice must be > 0`));
    check(typeof pi.discount === 'number' && pi.discount >= 0 && pi.discount < 100,
      P(`item ${iid}: priceInfo.discount must be 0-99`));
    const expected = round2(pi.basePrice * (1 - pi.discount / 100));
    check(round2(pi.finalPrice) === expected,
      P(`item ${iid}: finalPrice ${pi.finalPrice} != basePrice*(1-discount/100) = ${expected}`));

    // duplicate names
    const nm = it.meta && it.meta.name;
    if (nm) {
      if (seenNames.has(nm)) fails.push(P(`duplicate item name "${nm}" (${seenNames.get(nm)} and ${iid})`));
      else seenNames.set(nm, iid);
    }

    // variants: array of {id,name} objects — menuHelpers reads variant.id/.name
    for (const v of it.variants || []) {
      check(v && typeof v === 'object' && typeof v.id === 'string',
        P(`item ${iid}: variants entries must be {id,name} objects, got ${JSON.stringify(v)}`));
      if (v && v.id) {
        check(variants[v.id], P(`item ${iid}: references unknown variant ${v.id}`));
        check(variants[v.id] && v.name === variants[v.id].meta.name,
          P(`item ${iid}: variant ${v.id} name "${v.name}" != variant meta.name`));
        variantRefs.set(v.id, [...(variantRefs.get(v.id) || []), iid]);
      }
    }
    // addons: array of plain id strings — menuHelpers indexes addons[addonId]
    for (const a of it.addons || []) {
      check(typeof a === 'string', P(`item ${iid}: addons entries must be id strings, got ${JSON.stringify(a)}`));
      if (typeof a === 'string') {
        check(addons[a], P(`item ${iid}: references unknown addon ${a}`));
        addonRefs.set(a, [...(addonRefs.get(a) || []), iid]);
      }
    }

    const hasCustom = (it.variants || []).length > 0 || (it.addons || []).length > 0;
    check(it.isCustomizable === hasCustom,
      P(`item ${iid}: isCustomizable=${it.isCustomizable} but has ${(it.variants || []).length} variants / ${(it.addons || []).length} addons`));
  }

  check(Object.keys(items).length === EXPECTED_ITEM_COUNT,
    P(`expected ${EXPECTED_ITEM_COUNT} menu items, found ${Object.keys(items).length}`));

  // ── variants ────────────────────────────────────────────────────────────
  for (const [vid, v] of Object.entries(variants)) {
    check(v.id === vid, P(`variant ${vid}: id mismatch`));
    check(v.meta && v.meta.name, P(`variant ${vid}: meta.name required`));
    check(Array.isArray(v.options) && v.options.length >= 2, P(`variant ${vid}: needs >=2 options`));
    const first = (v.options || [])[0];
    check(first && first.priceInfo && first.priceInfo.basePrice === 0 && first.priceInfo.finalPrice === 0,
      P(`variant ${vid}: first option must be the base (basePrice and finalPrice 0)`));
    const optIds = new Set();
    for (const o of v.options || []) {
      check(o.id && o.name, P(`variant ${vid}: option missing id/name`));
      check(!optIds.has(o.id), P(`variant ${vid}: duplicate option id ${o.id}`));
      optIds.add(o.id);
      const op = o.priceInfo || {};
      check(typeof op.basePrice === 'number' && op.basePrice >= 0, P(`variant ${vid}/${o.id}: basePrice must be >= 0`));
      check(round2(op.finalPrice) === round2(op.basePrice * (1 - (op.discount || 0) / 100)),
        P(`variant ${vid}/${o.id}: finalPrice != basePrice*(1-discount/100)`));
    }
    check(typeof v.isMandatory === 'boolean', P(`variant ${vid}: isMandatory required`));
    check(typeof v.respectParentDiscount === 'boolean',
      P(`variant ${vid}: respectParentDiscount required (calculateItemPrice branches on it)`));
    const refs = (variantRefs.get(vid) || []).sort();
    check(sameSet(v.itemsAssociatedWith || [], refs),
      P(`variant ${vid}: itemsAssociatedWith ${JSON.stringify(v.itemsAssociatedWith)} != referencing items ${JSON.stringify(refs)}`));
    for (const cid of (v.meta && v.meta.categoryAssociatedWith) || []) {
      check(cats[cid], P(`variant ${vid}: categoryAssociatedWith unknown category ${cid}`));
    }
  }

  // ── addons ──────────────────────────────────────────────────────────────
  for (const [aid, a] of Object.entries(addons)) {
    check(a.id === aid, P(`addon ${aid}: id mismatch`));
    check(a.meta && a.meta.name, P(`addon ${aid}: meta.name required`));
    check(a.isInStock === true, P(`addon ${aid}: isInStock must be true (fetchMenu filters addons too)`));
    const ap = a.priceInfo || {};
    check(round2(ap.finalPrice) === round2(ap.basePrice * (1 - (ap.discount || 0) / 100)),
      P(`addon ${aid}: finalPrice != basePrice*(1-discount/100)`));
    const refs = (addonRefs.get(aid) || []).sort();
    check(sameSet(a.itemsAssociatedWith || [], refs),
      P(`addon ${aid}: itemsAssociatedWith != referencing items ${JSON.stringify(refs)}`));
  }

  // ── kitchens ────────────────────────────────────────────────────────────
  check(Object.keys(r.kitchens || {}).length >= 1, P('needs at least one kitchen'));

  // ── tables (fresh production state) ─────────────────────────────────────
  const tables = r.tables || {};
  check(Object.keys(tables).length === EXPECTED_TABLE_COUNT,
    P(`expected ${EXPECTED_TABLE_COUNT} tables, found ${Object.keys(tables).length}`));
  const numbers = new Set();
  for (const [tid, t] of Object.entries(tables)) {
    check(t.status === 'vacant', P(`table ${tid}: status must be 'vacant' (TABLE_STATUS.VACANT), got '${t.status}'`));
    check(VALID_TABLE_STATUS.includes(t.status), P(`table ${tid}: status not in TABLE_STATUS enum`));
    check(t.currentOTP === undefined, P(`table ${tid}: production tables must ship with no currentOTP`));
    check(t.primaryCustomer === undefined, P(`table ${tid}: production tables must ship with no primaryCustomer`));
    check(Array.isArray(t.occupiedBy) && t.occupiedBy.length === 0, P(`table ${tid}: occupiedBy must be []`));
    check(typeof t.number === 'string' && t.number.length > 0, P(`table ${tid}: number must be a non-empty string`));
    check(typeof t.capacity === 'number' && t.capacity > 0, P(`table ${tid}: capacity must be a positive number`));
    check(typeof t.section === 'string' && t.section.length > 0, P(`table ${tid}: section required`));
    check(!numbers.has(t.number), P(`table ${tid}: duplicate table number ${t.number}`));
    numbers.add(t.number);
  }

  // ── staff ───────────────────────────────────────────────────────────────
  const emails = new Set();
  for (const [sid, s] of Object.entries(r.servers || {})) {
    check(VALID_ROLES.includes(s.role), P(`server ${sid}: role '${s.role}' not in ${VALID_ROLES.join('/')} (uppercase)`));
    check(s.status === 'active', P(`server ${sid}: status must be 'active' (SERVER_STATUS.ACTIVE)`));
    check(typeof s.email === 'string' && s.email.includes('@'), P(`server ${sid}: email is the login username`));
    check(!emails.has(s.email), P(`server ${sid}: duplicate email ${s.email}`));
    emails.add(s.email);
    check(/^\$2[aby]\$\d{2}\$/.test(s.password || ''),
      P(`server ${sid}: password must be a bcrypt hash ($2a/$2b/$2y), never plaintext in production`));
    check(s.name && s.profileImageUrl !== undefined && s.createdAt && s.updatedAt,
      P(`server ${sid}: missing name/profileImageUrl/createdAt/updatedAt (addServer field set)`));
  }
  for (const role of ['KITCHEN', 'SERVER', 'MANAGER']) {
    check(Object.values(r.servers || {}).some((s) => s.role === role), P(`no ${role} staff account`));
  }

  // ── empty collections the importer expects ──────────────────────────────
  for (const k of ['sessions', 'carts', 'orders', 'offers']) {
    check(r[k] !== undefined, P(`missing \`${k}\` (importer expects the key, even if {})`));
    check(Object.keys(r[k] || {}).length === 0, P(`\`${k}\` must be empty for a fresh production restaurant`));
  }

  // ── billing config ──────────────────────────────────────────────────────
  const charges = ((r.config || {}).settings || {}).billing;
  check(charges && Array.isArray(charges.charges),
    P('config.settings.billing.charges must be an array (calculateCharges reads config/settings)'));
  if (charges && charges.charges.length === 0) {
    notes.push(P('billing.charges is [] — menu prices treated as inclusive; confirm service charge / GST with the owner'));
  }

  notes.push(P(`categories ${Object.keys(cats).length} · subcategories ${Object.keys(subs).length}`
    + ` · items ${Object.keys(items).length} · variants ${Object.keys(variants).length}`
    + ` · addons ${Object.keys(addons).length} · tables ${Object.keys(tables).length}`
    + ` · staff ${Object.keys(r.servers || {}).length}`));
}

function round2(n) { return Math.round(Number(n) * 100) / 100; }
function sameSet(a, b) {
  const x = [...new Set(a)].sort(); const y = [...new Set(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

console.log(`validate-seed: ${FILE}`);
for (const n of notes) console.log(`  note: ${n}`);
if (fails.length) {
  console.error(`\nFAIL (${fails.length}):`);
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nPASS — all cross-reference, price, table and staff checks green.');
