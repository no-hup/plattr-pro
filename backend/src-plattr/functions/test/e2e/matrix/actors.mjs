/**
 * actors.mjs — the people in the restaurant, as objects.
 *
 * Every scenario is written as "a customer does X, then a waiter does Y", so the
 * runner reads like the situation it is testing rather than like a pile of HTTP
 * calls. Each actor wraps the same lib/api.js used by the existing suites.
 *
 * Every response also lands in the fixture capture, so one live run produces the
 * corpus the contract layer and the Flutter parse tests consume. That is the
 * only way the app-side checks stay honest: they parse what the backend actually
 * returned today, not what someone hand-wrote months ago.
 */
import { call } from '../lib/api.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, '../fixtures/golden');

const OTP = '123456';
const STAFF_PW = '1234';

export const SLUG = {
  res_meghana: 'meg', res_pizzabakery: 'pb', res_truffles: 'tr',
  res_salt: 'salt', res_chowman: 'cw',
};

// ── Fixture capture ─────────────────────────────────────────────────────────
const captured = new Map();   // endpoint -> Map(label -> response)

/** Keep the FIRST successful response per (endpoint,label): stable across reruns.
 *  A label starting with '_' is a transient probe (e.g. a poll deliberately racing
 *  other traffic) — asserted on by its scenario but never written as a golden. */
function capture(endpoint, label, resp) {
  if (!resp || resp.status === 'error' || label.startsWith('_')) return;
  if (!captured.has(endpoint)) captured.set(endpoint, new Map());
  const slot = captured.get(endpoint);
  if (!slot.has(label)) slot.set(label, resp);
}

/**
 * Fixtures are committed, so a re-capture diff is meant to be REVIEWABLE: it
 * should show a changed response shape or a changed price and nothing else.
 * Raw captures do the opposite — every run mints new Firestore ids and new
 * wall-clock timestamps, so all 117 files churn and the real change drowns.
 * (The June per-unit pricing change produced a 1365-line fixture diff that was
 * 100% ids and seconds, and zero lines of the actual change.)
 *
 * So volatile values are replaced on write with stable placeholders. Equal
 * values still map to equal placeholders, which keeps the relationships a
 * reader cares about — this cart belongs to that session — intact and visible.
 * Types and structure are untouched, so a field that stops being a timestamp,
 * or an id that turns into an object, still shows up as a diff.
 */
const STABLE_EPOCH = 1780000000;
const STABLE_ISO = '2026-01-01T00:00:00.000Z';
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
// Firestore auto-ids (20 chars) and the hex suffix on a generated cartId.
const AUTO_ID_RE = /^[A-Za-z0-9]{20}$/;
const CART_ID_RE = /^(.*_)[0-9a-f]{8}$/;
const JWT_RE = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;

function stabilize(value, key, ids) {
  if (Array.isArray(value)) return value.map(v => stabilize(v, key, ids));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === '_seconds' && typeof v === 'number' ? STABLE_EPOCH : stabilize(v, k, ids);
    }
    return out;
  }
  // Epoch milliseconds (lastUpdated, a checkoutTime written as a number): wall clock, so stable.
  if (typeof value === 'number') return value > 1e12 && value < 1e13 ? STABLE_EPOCH * 1000 : value;
  if (typeof value !== 'string') return value;
  if (ISO_RE.test(value)) return STABLE_ISO;
  if (JWT_RE.test(value)) return 'JWT';   // a login token is signed with its mint time: new every run
  const cart = CART_ID_RE.exec(value);
  if (cart) return `${cart[1]}CART`;
  if (AUTO_ID_RE.test(value)) {
    if (!ids.has(value)) ids.set(value, `${(key || 'ID').toUpperCase()}_${ids.size + 1}`);
    return ids.get(value);
  }
  return value;
}

export function writeFixtures() {
  let count = 0;
  for (const [endpoint, slot] of captured) {
    const dir = resolve(FIXTURE_DIR, endpoint);
    mkdirSync(dir, { recursive: true });
    for (const [label, resp] of slot) {
      const safe = label.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
      const { _httpStatus, ...clean } = resp;
      // Numbering is per FILE, not per run: a whole-matrix run and a single
      // `--scenario` run must produce byte-identical fixtures, or "re-capture
      // and read the diff" only works when you happen to re-run the same scope.
      // The cost is that the same session in two files gets two placeholders;
      // within a file — where it actually gets read — identity is preserved.
      const ids = new Map();
      writeFileSync(resolve(dir, `${safe}.json`), JSON.stringify(stabilize(clean, null, ids), null, 2));
      count++;
    }
  }
  return count;
}

export function fixtureStats() {
  return [...captured.entries()].map(([e, s]) => ({ endpoint: e, count: s.size }));
}

/** Thin call wrapper that captures and tags every request for the findings log. */
async function invoke(endpoint, payload, label) {
  const resp = await call(endpoint, payload);
  capture(endpoint, label || 'default', resp);
  return resp;
}

// ── Customer ────────────────────────────────────────────────────────────────
export class Customer {
  constructor(restaurantId, phone = '9876543210', name = 'Customer One') {
    this.restaurantId = restaurantId;
    this.phone = phone;
    this.name = name;
    this.sessionId = null;
    this.tableId = null;
  }

  /** Scan + OTP. Returns the raw response so scenarios can assert on failures. */
  async join(tableId, otp = OTP) {
    this.tableId = tableId;
    const resp = await invoke('table-validateOTP', {
      restaurantId: this.restaurantId, tableId, otp,
      phoneNumber: this.phone, name: this.name,
    }, `join_${this.phone}`);
    this.sessionId = resp?.data?.sessionId || null;
    this.isPrimary = resp?.data?.isPrimaryCustomer;
    return resp;
  }

  get base() {
    return { restaurantId: this.restaurantId, tableId: this.tableId, sessionId: this.sessionId };
  }

  async addItem(spec, label) {
    const selectedVariants = (spec.selVariants || []).reduce((m, v) => {
      m[v.variantId] = v.optionId; return m;
    }, {});
    return invoke('cart-addItemToCart', {
      ...this.base,
      menuItemId: spec.menuItemId,
      quantity: spec.quantity || 1,
      selectedVariants: Object.keys(selectedVariants).length ? selectedVariants : undefined,
      selectedAddons: spec.selAddonIds?.length ? spec.selAddonIds : undefined,
    }, label || `add_${spec.menuItemId}`);
  }

  getCart(label) {
    return invoke('cart-getCart', { restaurantId: this.restaurantId, tableId: this.tableId }, label || 'cart');
  }

  clearCart() {
    return invoke('cart-clearCart', { restaurantId: this.restaurantId, tableId: this.tableId }, 'clear');
  }

  checkout(label) {
    return invoke('cart-checkoutCart', { ...this.base }, label || 'checkout');
  }

  getOrder(orderId, label) {
    return invoke('order-getOrder', { ...this.base, orderId }, label || 'order');
  }

  getOffers(label) {
    return invoke('offers-getApplicableOffers', { ...this.base }, label || 'offers');
  }

  /** validateRemoveItemFields requires menuItemId; cartItemId alone is rejected. */
  removeItem(menuItemId, cartItemId, label) {
    return invoke('cart-removeItemFromCart',
      { ...this.base, menuItemId, cartItemId }, label || 'remove');
  }
}

// ── Staff (kitchen + waiter share the login, differ by what they call) ──────
class Staff {
  constructor(restaurantId, role) {
    this.restaurantId = restaurantId;
    this.role = role;
    this.sessionId = null;
  }

  async login(userSuffix = '') {
    const username = `${this.role}${userSuffix}@${SLUG[this.restaurantId]}.test`;
    const resp = await invoke('server-serverLogin',
      { restaurantId: this.restaurantId, username, password: STAFF_PW }, `login_${this.role}${userSuffix}`);
    this.sessionId = resp?.data?.sessionId || null;
    if (!this.sessionId) throw new Error(`${username} login failed: ${resp?.message || JSON.stringify(resp)}`);
    return resp;
  }
}

export class Kitchen extends Staff {
  constructor(restaurantId) { super(restaurantId, 'kitchen'); }

  activeCarts(label) {
    return invoke('order-getActiveCartsForKitchen',
      { restaurantId: this.restaurantId, sessionId: this.sessionId }, label || 'kitchen_active');
  }

  /** Kitchen moves a whole cart along the fulfillment chain. */
  setCartStatus(orderId, cartIndex, newStatus, label) {
    return invoke('cart-updateCartStatus', {
      restaurantId: this.restaurantId, orderId, cartIndex,
      newStatus, sessionId: this.sessionId,
    }, label || `cart_${newStatus}`);
  }
}

export class Waiter extends Staff {
  constructor(restaurantId, suffix = '') { super(restaurantId, 'server'); this.suffix = suffix; }

  login() { return super.login(this.suffix); }

  activeOrders(label) {
    return invoke('order-getActiveOrdersForRestaurant',
      { restaurantId: this.restaurantId, sessionId: this.sessionId }, label || 'server_active');
  }

  orderDetails(orderId, label) {
    return invoke('server-getOrderDetails',
      { restaurantId: this.restaurantId, orderId, sessionId: this.sessionId }, label || 'server_detail');
  }

  markItemServed(orderId, menuItemId, cartItemId, label) {
    return invoke('server-markItemServed', {
      restaurantId: this.restaurantId, orderId, menuItemId, cartItemId, sessionId: this.sessionId,
    }, label || 'item_served');
  }

  markCartServed(orderId, cartIndex, label) {
    return invoke('order-markCartAsServed', {
      restaurantId: this.restaurantId, orderId, cartIndex, sessionId: this.sessionId,
    }, label || 'cart_served');
  }

  setOrderStatus(orderId, orderStatus, label) {
    return invoke('order-updateOrderStatus', {
      restaurantId: this.restaurantId, orderId, orderStatus, sessionId: this.sessionId,
    }, label || `order_${orderStatus}`);
  }

  servedCarts(label) {
    return invoke('order-getServedCartsForServer',
      { restaurantId: this.restaurantId, sessionId: this.sessionId }, label || 'served_carts');
  }

  tables(label) {
    return invoke('server-getTables', { restaurantId: this.restaurantId, sessionId: this.sessionId }, label || 'tables');
  }

  /**
   * Turning a table over. Setting it 'vacant' is what actually ends the table's
   * sessions (table.js calls sessionService.endTableSessions), so this is the
   * only way a scenario can stage a genuinely new sitting rather than a second
   * person joining the party that is already seated.
   */
  /** Setting a table vacant clears its OTP, so a new party needs a fresh one. */
  generateTableOtp(tableId, label) {
    return invoke('server-generateTableOTP', {
      restaurantId: this.restaurantId, tableId, sessionId: this.sessionId,
    }, label || 'table_otp');
  }

  setTableStatus(tableId, status, label) {
    return invoke('table-updateTableStatus', {
      restaurantId: this.restaurantId, tableId, status, sessionId: this.sessionId,
    }, label || `table_${status}`);
  }
}

// ── Small helpers scenarios keep needing ────────────────────────────────────
export const orderIdOf = (checkoutResp) =>
  checkoutResp?.data?.order?.orderId || checkoutResp?.data?.orderId || null;

/**
 * Both order-getOrder and server-getOrderDetails return the order's fields FLAT
 * under `data` — verified against captured fixtures, not assumed. This accessor
 * still tolerates a nested `data.order` because the two endpoints disagree on
 * everything else (priceInfo vs a scalar total, `id` vs `orderId` in lists) and
 * a caller that has to handle both shapes should not also have to guess.
 */
export const orderOf = (resp) => resp?.data?.order || resp?.data || null;

export const priceInfoOf = (orderResp) =>
  orderResp?.data?.order?.priceInfo || orderResp?.data?.priceInfo || null;

export const cartsOf = (orderResp) =>
  orderResp?.data?.order?.carts || orderResp?.data?.carts || [];

export const ok = (resp) => resp?.status === 'success' || resp?.success === true;
