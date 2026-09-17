#!/usr/bin/env node
/**
 * build-seed.js — emits firestore-kaanchipuram-kaapi-hsr.json (import-ready, big-brewski format).
 *
 *   node build-seed.js                          # reuse passwords from CREDENTIALS.local.md if present
 *   node build-seed.js --passwords-file=<path>  # reuse passwords from another file
 *   node build-seed.js --new-passwords          # force-regenerate the 6-digit staff PINs
 *
 * Import with:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node functions/mock/importMockData5.js \
 *     --file=../../restaurant-menu-setup-prod/launch-1/firestore-kaanchipuram-kaapi-hsr.json --clean
 *
 * Output is deterministic apart from the bcrypt salts (and the PINs on first run,
 * which are then pinned by CREDENTIALS.local.md).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require(path.join(__dirname, '../../backend/src-plattr/functions/node_modules/bcryptjs'));

// ─── The one constant to change when the restaurant's real name is known ───────
const RESTAURANT_ID = 'res_kaanchipuram_kaapi_hsr';
const RESTAURANT_NAME = 'Kaanchipuram Kaapi';
const RESTAURANT_ADDRESS = 'HSR Layout, Bengaluru'; // street number not supplied
// ──────────────────────────────────────────────────────────────────────────────

const TABLE_COUNT = 10;
const TABLE_CAPACITY = 4;
const TABLE_SECTION = 'Main';
const BCRYPT_COST = 10;

// Fixed epoch so re-runs diff cleanly: 2026-09-08T00:00:00Z
const SEED_SECONDS = Math.floor(Date.UTC(2026, 8, 8) / 1000);
const TS = { _seconds: SEED_SECONDS, _nanoseconds: 0 };

const OUT_FILE = path.join(__dirname, 'firestore-kaanchipuram-kaapi-hsr.json');
const CREDS_FILE = path.join(__dirname, 'CREDENTIALS.local.md');

// ─── Menu, transcribed from the restaurant's two menu photos (INR) ────────────
// [id suffix, name, price, description, variantId|null]
const MENU = [
  ['Snacks', [
    ['methu_masala_vada', 'Methu Vada / Masala Vada', 35, 'Crisp golden lentil vada, choose soft Methu or spiced Masala.', 'var_type_vada'],
    ['sambar_vada', 'Sambar Vada', 45, 'Fried lentil vada soaked in hot sambar with coconut chutney.', null],
    ['banana_bajji', 'Banana Bajji', 40, 'Raw banana slices in gram flour batter, fried crisp. Available after 4 PM.', null],
    ['chilli_bajji', 'Chilli Bajji', 40, 'Whole chillies in spiced gram flour batter, fried crisp. Available after 4 PM.', null],
    ['kuzhi_paniyaram', 'Kuzhi Paniyaram (Paddu)', 75, 'Fluffy rice-lentil dumplings griddled in ghee. Available after 4 PM.', null],
  ]],
  ['Idli', [
    ['thatte_idli', 'Thatte Idli', 35, 'Soft plate-sized steamed idli with sambar and chutney.', null],
    ['thatte_idli_vada', 'Thatte Idli & Single Vada', 55, 'One thatte idli paired with a crisp medu vada.', null],
    ['podi_thatte_idli', 'Butter / Ghee Podi Thatte Idli', 55, 'Thatte idli tossed in podi with your choice of butter or ghee.', 'var_fat_podi_thatte_idli'],
    ['ghee_podi_button_idli', 'Ghee Podi Button Idli', 70, 'Bite-sized button idlis rolled in ghee and idli podi.', null],
    ['sambar_button_idli', 'Sambar Button Idli', 70, 'Mini button idlis soaked in piping hot sambar.', null],
  ]],
  ['Dosa', [
    ['kal_dosa', 'Kal Dosa (2 pcs)', 60, 'Two soft thick griddle dosas served with chutney and sambar.', null],
    ['ghee_plain_dosa', 'Ghee Plain Dosa', 70, 'Thin crisp dosa roasted in generous ghee.', null],
    ['plain_masala_dosa', 'Plain Masala Dosa', 80, 'Crisp dosa wrapped around spiced potato masala.', null],
    ['ghee_podi_plain_dosa', 'Ghee Podi Plain Dosa', 80, 'Ghee-roasted dosa smeared with fiery idli podi.', null],
    ['ghee_podi_masala_dosa', 'Ghee Podi Masala Dosa', 100, 'Ghee podi dosa filled with spiced potato masala.', null],
    ['ghee_onion_dosa', 'Ghee Onion Dosa', 110, 'Ghee dosa layered with sauteed onions and green chilli.', null],
    ['open_butter_masala_dosa', 'Open Butter Masala Dosa', 120, 'Open-faced butter dosa topped with potato masala.', null],
    ['ghee_onion_masala_dosa', 'Ghee Onion Masala Dosa', 120, 'Ghee onion dosa stuffed with spiced potato masala.', null],
  ]],
  ['Rice Dishes', [
    ['ven_pongal', 'Pongal (Ven)', 70, 'Creamy rice and moong dal with pepper, cumin and ghee.', null],
    ['dry_variety_rice', 'Dry Variety Rice (Rice bath)', 60, 'Todays dry rice bath, tempered and served with raita.', null],
    ['curry_variety_rice', 'Curry Variety Rice (Rice bath)', 60, 'Todays gravy rice bath, served with raita and papad.', null],
    ['curd_rice', 'Curd Rice', 60, 'Cooling curd rice tempered with curry leaves and ginger.', null],
    ['rice_combo', 'Rice Combo (Any 3 rice)', 75, 'Any 3 rice varieties — tell your server which.', null],
  ]],
  ['Sweets', [
    ['hot_gulab_jamun', 'Hot Gulab Jamun', 50, 'Warm milk dumplings soaked in fragrant sugar syrup.', null],
    ['sakkarai_pongal', 'Sakkarai Pongal', 60, 'Sweet rice and jaggery pongal with ghee, cashew and raisins.', null],
    ['kalkandu_pongal', 'Kalkandu Pongal', 60, 'Rice pongal sweetened with rock sugar and cardamom.', null],
    ['carrot_halwa', 'Carrot Halwa', 60, 'Slow-cooked carrot halwa rich with milk, ghee and nuts.', null],
    ['kesari_bat', 'Kesari Bat', 60, 'Saffron semolina kesari finished with ghee and cashews.', null],
  ]],
  ['Beverages', [
    ['tea', 'Tea', 20, 'Hot South Indian style milk tea.', null],
    ['filter_coffee', 'Filter Coffee', 20, 'Traditional decoction filter coffee, frothy and strong.', null],
  ]],
];

// Mandatory same-price variants (both options +0 — the menu prints one price).
const VARIANT_DEFS = {
  var_type_vada: {
    name: 'Type', description: 'Choose your vada', categoryId: 'cat_snacks',
    options: [['opt_methu_vada', 'Methu Vada'], ['opt_masala_vada', 'Masala Vada']],
  },
  var_fat_podi_thatte_idli: {
    name: 'Choice', description: 'Butter or ghee', categoryId: 'cat_idli',
    options: [['opt_butter', 'Butter'], ['opt_ghee', 'Ghee']],
  },
};

const STAFF = [
  ['srv_kitchen', 'Kitchen', 'KITCHEN', 'kitchen@kkaapi.hsr'],
  ['srv_server', 'Server', 'SERVER', 'server@kkaapi.hsr'],
  ['srv_manager', 'Manager', 'MANAGER', 'manager@kkaapi.hsr'],
];

// ─── Passwords ────────────────────────────────────────────────────────────────

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const price = (n) => ({ basePrice: n, discount: 0, finalPrice: n });

function randomPin() {
  // crypto.randomInt is uniform; 6 digits, leading zeros allowed (staff type all 6).
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/** Pulls `srv_x ... 123456` pairs out of an existing CREDENTIALS.local.md. */
function readExistingPins(file) {
  if (!fs.existsSync(file)) return {};
  const pins = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/\b(srv_[a-z0-9_]+)\b[^\n]*?\b(\d{6})\b/);
    if (m) pins[m[1]] = m[2];
  }
  return pins;
}

// ─── Build ────────────────────────────────────────────────────────────────────

function buildMenu() {
  const categories = {};
  const subcategories = {};
  const menuItems = {};
  const variants = {};
  const categoryIds = [];
  const menuItemIds = [];

  MENU.forEach(([catName, items], catIdx) => {
    const catId = `cat_${slug(catName)}`;
    // Two-level nav: every category needs at least one subcategory, so each
    // menu section becomes a category with a single same-named subcategory.
    const subId = `sub_${slug(catName)}`;
    categoryIds.push(catId);

    categories[catId] = { id: catId, name: catName, order: catIdx, subcategoryIds: [subId] };
    subcategories[subId] = { id: subId, name: catName, parentCategoryId: catId, order: 0 };

    items.forEach(([idSuffix, name, amount, description, variantId], itemIdx) => {
      const itemId = `item_${idSuffix}`;
      menuItemIds.push(itemId);
      menuItems[itemId] = {
        menuItemId: itemId,
        categoryId: catId,
        primarySubcategoryId: subId,
        subcategoryIds: [subId],
        meta: { name, description, categoryName: catName, image: '' },
        priceInfo: price(amount),
        // REQUIRED by platter_core's MenuItem model (menu_item.g.dart lists it in
        // requiredKeys): the staff apps throw "Required keys are missing:
        // nutritionalInfo" and show an error instead of the menu without it.
        // All four sub-fields default to 0, so zeros mean "not recorded"; the
        // admin dish editor lets the owner fill real values later.
        nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        // menuHelpers.organizeMenuWithSubcategories reads variant.id/.name off
        // these entries, so variants are {id,name} objects while addons are
        // plain id strings. Matches every existing seed.
        variants: variantId ? [{ id: variantId, name: VARIANT_DEFS[variantId].name }] : [],
        addons: [],
        isInStock: true,
        isCustomizable: Boolean(variantId),
        dietaryType: 'VEG',
        order: itemIdx,
      };

      if (variantId) {
        const def = VARIANT_DEFS[variantId];
        variants[variantId] = {
          id: variantId,
          meta: { name: def.name, categoryAssociatedWith: [def.categoryId], description: def.description },
          options: def.options.map(([optId, optName]) => ({
            id: optId, name: optName, priceInfo: { basePrice: 0, finalPrice: 0, discount: 0 },
          })),
          isMandatory: true,
          respectParentDiscount: true,
          itemsAssociatedWith: [itemId],
        };
      }
    });
  });

  return { categories, subcategories, menuItems, variants, categoryIds, menuItemIds };
}

function buildTables() {
  const tables = {};
  for (let i = 1; i <= TABLE_COUNT; i++) {
    // Fresh production table: VACANT ('vacant' per TABLE_STATUS in table/table.js),
    // no currentOTP, no primaryCustomer, nobody seated.
    tables[`tbl_${i}`] = {
      number: String(i),
      capacity: TABLE_CAPACITY,
      status: 'vacant',
      occupiedBy: [],
      section: TABLE_SECTION,
    };
  }
  return tables;
}

async function buildServers(pins) {
  const servers = {};
  for (const [id, name, role, email] of STAFF) {
    // Field set copied from adminApp/staff_admin.js addServer.
    servers[id] = {
      name,
      phoneNumber: '',
      email,
      role,
      status: 'active',
      password: await bcrypt.hash(pins[id], await bcrypt.genSalt(BCRYPT_COST)),
      profileImageUrl: '',
      createdAt: TS,
      updatedAt: TS,
    };
  }
  return servers;
}

function writeCredentials(pins) {
  const rows = STAFF.map(([id, name, role, email]) =>
    `| \`${id}\` | ${name} | ${role} | \`${email}\` | \`${pins[id]}\` |`).join('\n');
  fs.writeFileSync(CREDS_FILE, `# Kaanchipuram Kaapi (HSR) staff credentials (GITIGNORED — do not commit)

Restaurant: \`${RESTAURANT_ID}\` (${RESTAURANT_NAME})
Login endpoint: \`server-serverLogin\` (POST \`{"data":{"restaurantId":"${RESTAURANT_ID}","username":"<email>","password":"<pin>"}}\`).
Stored in Firestore as bcrypt hashes (cost ${BCRYPT_COST}); these plaintext PINs exist only here.
\`build-seed.js\` re-reads this file so re-runs keep the same PINs. Delete it (or pass
\`--new-passwords\`) to rotate.

| id | name | role | email | PIN |
|----|------|------|-------|-----|
${rows}
`);
}

async function main() {
  const args = process.argv.slice(2);
  const pinsFileArg = args.find((a) => a.startsWith('--passwords-file='));
  const pinsFile = pinsFileArg ? path.resolve(pinsFileArg.split('=')[1]) : CREDS_FILE;
  const existing = args.includes('--new-passwords') ? {} : readExistingPins(pinsFile);

  const pins = {};
  for (const [id] of STAFF) pins[id] = existing[id] || randomPin();
  const reused = STAFF.filter(([id]) => existing[id]).length;

  const { categories, subcategories, menuItems, variants, categoryIds, menuItemIds } = buildMenu();

  const seed = {
    _notes: [
      `Import-ready seed for ${RESTAURANT_ID} (${RESTAURANT_NAME}) — generated by build-seed.js.`,
      'Table count (10) and billing charges are placeholders pending the owner; address has no street line yet.',
      'Staff passwords are bcrypt hashes; plaintext lives only in CREDENTIALS.local.md (gitignored).',
      'No _system doc on purpose: production uses the code defaults in singleton/FeatureFlags.js.',
    ],
    customers: {},
    restaurants: {
      [RESTAURANT_ID]: {
        info: {
          name: RESTAURANT_NAME,
          address: RESTAURANT_ADDRESS,
          phone: '',
          email: '',
          location: { _latitude: 0, _longitude: 0 },
          cuisine: 'South Indian · Tiffin · Filter Coffee',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          isMultipleVariantOrAddonForMenuItemsSupported: true,
          fallbackToSameCustomConfigurationForAddItem: true,
        },
        menus: {
          menu_main: {
            menuId: 'menu_main',
            name: 'Main Menu',
            isActive: true,
            isDefault: true,
            categoryIds,
            menuItemIds,
            order: 0,
          },
        },
        categories,
        subcategories,
        menuItems,
        variants,
        addons: {},
        kitchens: { kit_main: { name: 'Main Kitchen', status: 'active' } },
        tables: buildTables(),
        servers: await buildServers(pins),
        sessions: {},
        carts: {},
        orders: {},
        offers: {},
        // Menu prices are inclusive; no service charge / GST decided yet.
        config: { settings: { billing: { charges: [] } } },
      },
    },
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(seed, null, 2) + '\n');
  writeCredentials(pins);

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  categories ${categoryIds.length} · subcategories ${Object.keys(subcategories).length} ·`
    + ` items ${menuItemIds.length} · variants ${Object.keys(variants).length} · addons 0`
    + ` · tables ${TABLE_COUNT} · staff ${STAFF.length}`);
  console.log(`Wrote ${CREDS_FILE} (${reused}/${STAFF.length} PINs reused)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
