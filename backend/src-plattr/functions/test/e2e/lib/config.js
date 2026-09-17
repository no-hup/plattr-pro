/**
 * Central configuration for all E2E tests.
 * All IDs and expected prices come from MockData5EndToEndTesting.json.
 */

// Ports come from the emulator slot this session started (see ../../../../emu.sh);
// unset = slot 0 = the historical 5002/8080.
const BASE_URL = process.env.PLATTR_BASE_URL || 'http://127.0.0.1:5002/rms-app-dd875/us-central1';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID = 'rms-app-dd875';

// ── Restaurants (7 configs) ──────────────────────────────────────
const RESTAURANT_ALL_ON = 'res_e2e_all_on';
const RESTAURANT_MULTI_VARIANT_OFF = 'res_e2e_multi_variant_off';
const RESTAURANT_FALLBACK_OFF = 'res_e2e_fallback_off';
const RESTAURANT_EMPTY_MENU = 'res_e2e_empty_menu';
const RESTAURANT_ALL_OOS = 'res_e2e_all_out_of_stock';
const RESTAURANT_SIMPLE = 'res_e2e_simple_menu';
const RESTAURANT_OFFER_CONFIGS = 'res_e2e_offer_configs';

// Default restaurant for most tests
const RESTAURANT_ID = RESTAURANT_ALL_ON;

// ── Tables ───────────────────────────────────────────────────────
// Pre-seeded tables (may have sessions/state)
const TABLE_1 = 'table_1';
const TABLE_2 = 'table_2';
// Clean tables (vacant, no session, dedicated per-suite)
const TABLE_CLEAN_1 = 'table_clean_1'; // for customer-journey, order-lifecycle
const TABLE_CLEAN_2 = 'table_clean_2'; // for cart suite
const TABLE_CLEAN_3 = 'table_clean_3'; // for pricing suite
const TABLE_CLEAN_4 = 'table_clean_4'; // disabled table (for error tests)
const TABLE_CLEAN_5 = 'table_clean_5'; // for offers suite (res_e2e_offer_configs)
const TABLE_CLEAN_6 = 'table_clean_6'; // for order-lifecycle cancel flow
const TABLE_CLEAN_7 = 'table_clean_7'; // for customer-journey expanded
const TABLE_OTP = '123456';

// ── Customers ────────────────────────────────────────────────────
const CUSTOMER_PHONE = '9876543210';   // returning customer
const CUSTOMER_PHONE_2 = '9876543211'; // fresh customer
const CUSTOMER_NAME = 'Customer One';
const CUSTOMER_NAME_2 = 'Customer Two';

// ── Servers ──────────────────────────────────────────────────────
const SERVER_EMAIL = 'server1@e2e.com';
const SERVER_PASSWORD = '1234';
const SERVER_EMAIL_2 = 'server2@e2e.com';

// ── Menu Items (res_e2e_all_on prices) ───────────────────────────
const ITEMS = {
  BURGER: {
    id: 'item_burger_1',
    name: 'Classic Burger',
    basePrice: 200,
    discount: 10, // percent
    finalPrice: 180,
    isInStock: true,
    isCustomizable: true,
    variants: ['var_size_burger'],
    addons: ['addon_cheese'],
  },
  PIZZA: {
    id: 'item_pizza_1',
    name: 'Margherita Pizza',
    basePrice: 500,
    discount: 10,
    finalPrice: 450,
    isInStock: true,
    isCustomizable: true,
    variants: ['var_size_pizza', 'var_crust_pizza'],
    addons: ['addon_olives', 'addon_jalapeno'],
  },
  TIRAMISU: {
    id: 'item_tiramisu',
    name: 'Tiramisu',
    basePrice: 200,
    discount: 0,
    finalPrice: 200,
    isInStock: true,
    isCustomizable: false,
    variants: [],
    addons: [],
  },
  WHISKEY: {
    id: 'item_whiskey_1',
    name: 'Scotch Whiskey',
    basePrice: 500,
    discount: 0,
    finalPrice: 500,
    isInStock: true,
    isCustomizable: false,
    variants: [],
    addons: [],
  },
  BEER: {
    id: 'item_beer_1',
    name: 'Craft Beer',
    basePrice: 100,
    discount: 0,
    finalPrice: 100,
    isInStock: false, // OUT OF STOCK
    isCustomizable: false,
    variants: [],
    addons: [],
  },
};

// ── Variants ─────────────────────────────────────────────────────
const VARIANTS = {
  BURGER_SIZE: {
    id: 'var_size_burger',
    isMandatory: true,
    respectParentDiscount: true,
    options: {
      REGULAR: { id: 'opt_reg', basePrice: 0, finalPrice: 0 },
      LARGE:   { id: 'opt_large', basePrice: 50, finalPrice: 50 },
    },
  },
  PIZZA_SIZE: {
    id: 'var_size_pizza',
    isMandatory: true,
    respectParentDiscount: true,
    options: {
      MEDIUM: { id: 'opt_med', basePrice: 0, finalPrice: 0 },
      LARGE:  { id: 'opt_lrg', basePrice: 100, finalPrice: 100 },
    },
  },
  PIZZA_CRUST: {
    id: 'var_crust_pizza',
    isMandatory: false,
    respectParentDiscount: true,
    options: {
      THIN:    { id: 'opt_thin', basePrice: 0, finalPrice: 0 },
      STUFFED: { id: 'opt_stuffed', basePrice: 75, finalPrice: 75 },
    },
  },
};

// ── Addons ────────────────────────────────────────────────────────
const ADDONS = {
  CHEESE: {
    id: 'addon_cheese',
    basePrice: 20,
    finalPrice: 20,
    respectParentDiscount: false,
  },
  OLIVES: {
    id: 'addon_olives',
    basePrice: 30,
    finalPrice: 30,
    respectParentDiscount: false,
  },
  JALAPENO: {
    id: 'addon_jalapeno',
    basePrice: 25,
    finalPrice: 25,
    respectParentDiscount: true, // inherits parent item discount
  },
};

// ── Pre-seeded state (res_e2e_all_on only) ───────────────────────
const PRESEEDED = {
  SESSION_ACTIVE: 'session_active_1',
  ORDER_ACTIVE: 'order_active_1',
  CART_SERVED: 'cart_served_1',
  CART_PENDING: 'cart_pending_1',
};

// ── Expected Price Calculations ──────────────────────────────────
// These are hand-calculated from mock data for pricing.js tests
const EXPECTED_PRICES = {
  // Tiramisu: base=200, discount=0%, final=200
  TIRAMISU_X1: 200,
  TIRAMISU_X3: 600,

  // Burger Regular: base=200, discount=10% → final=180, variant Regular=0 → total=180
  BURGER_REGULAR: 180,

  // Burger Large: base=200 final=180, variant Large base=50, respectParentDiscount=true → 50*(1-0.10)=45 → total=225
  BURGER_LARGE: 225,

  // Burger Large + Cheese: 180 + 45 + 20 (cheese: respectParentDiscount=false) = 245
  BURGER_LARGE_CHEESE: 245,

  // Whiskey: base=500, discount=0% → 500
  WHISKEY_X1: 500,

  // Pizza Medium: base=500 final=450, variant Medium=0 → 450
  PIZZA_MEDIUM: 450,

  // Pizza Large: base=500 final=450, variant Large base=100 → 100*(1-0.10)=90 → 540
  PIZZA_LARGE: 540,

  // Pizza Large + Jalapeno: 450 + 90 + 25*(1-0.10)=22.5 → 562.5
  PIZZA_LARGE_JALAPENO: 562.5,

  // Pizza Large + Stuffed Crust: 450 + 90 + 75*(1-0.10)=67.5 → 607.5
  PIZZA_LARGE_STUFFED: 607.5,

  // Pizza Large + Olives: 450 + 90 + 30 (olives: respectParentDiscount=false) = 570
  PIZZA_LARGE_OLIVES: 570,

  // Multi-item cart: Tiramisu + Burger Regular = 200 + 180 = 380
  TIRAMISU_PLUS_BURGER_REG: 380,

  // ── New pricing scenarios ──────────────────────────────────────
  // Pizza Large + Stuffed Crust (no addon): 450 + 90 + 67.5 = 607.5
  PIZZA_LARGE_STUFFED: 607.5,

  // Pizza Med + Thin + Olives + Jalapeno: 450 + 0 + 0 + 30 + 22.5 = 502.5
  PIZZA_MED_THIN_OLIVES_JALAPENO: 502.5,

  // Burger Large + Cheese x2: (180 + 45 + 20) * 2 = 490
  BURGER_LARGE_CHEESE_X2: 490,

  // 5-item: Tiramisu(200) + BurgerReg(180) + BurgerLargeCheese(245) + PizzaMed(450) + Whiskey(500) = 1575
  FIVE_ITEM_CART: 1575,

  // 3-item quantities: Tiramisu x3(600) + Whiskey x2(1000) + PizzaLarge(540) = 2140
  THREE_ITEM_QTY_CART: 2140,
};

// ── Simple Menu Items (res_e2e_simple_menu) ─────────────────────
const ITEMS_SIMPLE = {
  CHICKEN: { id: 'item_simple_1', name: 'Grilled Chicken', basePrice: 150, discount: 0, finalPrice: 150 },
  PASTA:   { id: 'item_simple_2', name: 'Pasta Alfredo',   basePrice: 300, discount: 20, finalPrice: 240 },
  SALAD:   { id: 'item_simple_3', name: 'Caesar Salad',    basePrice: 100, discount: 0, finalPrice: 100 },
  STEAK:   { id: 'item_simple_4', name: 'Steak',           basePrice: 500, discount: 10, finalPrice: 450 },
};

// ── Offers Config ───────────────────────────────────────────────
const OFFERS = {
  DESSERT_50:       { id: 'offer_dessert_50',        type: 'PERCENTAGE', scope: 'CATEGORY' },
  FLAT_BAR_100:     { id: 'offer_flat_100',          type: 'FLAT',       scope: 'CATEGORY' },
  FIRST_TIME_20:    { id: 'offer_first_time_20',     type: 'PERCENTAGE', scope: 'ORDER' },
  BOGO_BURGER:      { id: 'offer_bogo_burger',       type: 'BOGO',       scope: 'ITEM' },
  PCT_FOOD_15:      { id: 'offer_pct_food_15',       type: 'PERCENTAGE', scope: 'CATEGORY' },
  FLAT_ITEM_50:     { id: 'offer_flat_item_50',      type: 'FLAT',       scope: 'ITEM' },
  EXPIRED:          { id: 'offer_expired',            type: 'PERCENTAGE', scope: 'ORDER' },
  COMPLEX:          { id: 'offer_complex_conditions', type: 'PERCENTAGE', scope: 'ORDER' },
  MAXDISCOUNT_CAP:  { id: 'offer_maxdiscount_cap',   type: 'PERCENTAGE', scope: 'ORDER' },
};

// ── Expected Offer Prices ───────────────────────────────────────
const EXPECTED_OFFER_PRICES = {
  // Tiramisu x1 (200) with 50% dessert offer → 100
  TIRAMISU_50PCT: 100,
  // Tiramisu x10 (2000) with 50% dessert, maxDiscount=500 → 1500
  TIRAMISU_X10_50PCT_CAPPED: 1500,
  // Whiskey x1 (500) meets min, flat 100 off → 400
  WHISKEY_FLAT100: 400,
  // BOGO Burger Reg x2: pay for 1 = 180
  BOGO_BURGER_REG_X2: 180,
  // BOGO Burger Large x2: pay for 1 = 225
  BOGO_BURGER_LARGE_X2: 225,
  // 15% off food: Burger Reg(180) + Tiramisu(200) = 380, 15% = 57, final = 323
  FOOD_15PCT_BURGER_TIRAMISU: 323,
  // Pizza Large (540) flat 50 off → 490
  PIZZA_LARGE_FLAT50: 490,
  // Cart 1000, 50% off maxDiscount=100 → 900
  MAXDISCOUNT_CAP_1000: 900,
};

export default {
  BASE_URL,
  FIRESTORE_HOST,
  PROJECT_ID,
  RESTAURANT_ID,
  RESTAURANT_ALL_ON,
  RESTAURANT_MULTI_VARIANT_OFF,
  RESTAURANT_FALLBACK_OFF,
  RESTAURANT_EMPTY_MENU,
  RESTAURANT_ALL_OOS,
  RESTAURANT_SIMPLE,
  RESTAURANT_OFFER_CONFIGS,
  TABLE_1,
  TABLE_2,
  TABLE_CLEAN_1,
  TABLE_CLEAN_2,
  TABLE_CLEAN_3,
  TABLE_CLEAN_4,
  TABLE_CLEAN_5,
  TABLE_CLEAN_6,
  TABLE_CLEAN_7,
  TABLE_OTP,
  CUSTOMER_PHONE,
  CUSTOMER_PHONE_2,
  CUSTOMER_NAME,
  CUSTOMER_NAME_2,
  SERVER_EMAIL,
  SERVER_PASSWORD,
  SERVER_EMAIL_2,
  ITEMS,
  ITEMS_SIMPLE,
  VARIANTS,
  ADDONS,
  PRESEEDED,
  EXPECTED_PRICES,
  OFFERS,
  EXPECTED_OFFER_PRICES,
};
