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

/** Keep the FIRST successful response per (endpoint,label): stable across reruns. */
function capture(endpoint, label, resp) {
  if (!resp || resp.status === 'error') return;
  if (!captured.has(endpoint)) captured.set(endpoint, new Map());
  const slot = captured.get(endpoint);
  if (!slot.has(label)) slot.set(label, resp);
}

export function writeFixtures() {
  let count = 0;
  for (const [endpoint, slot] of captured) {
    const dir = resolve(FIXTURE_DIR, endpoint);
    mkdirSync(dir, { recursive: true });
    for (const [label, resp] of slot) {
      const safe = label.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
      const { _httpStatus, ...clean } = resp;
      writeFileSync(resolve(dir, `${safe}.json`), JSON.stringify(clean, null, 2));
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

  removeItem(cartItemId) {
    return invoke('cart-removeItemFromCart', { ...this.base, cartItemId }, 'remove');
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
}

// ── Small helpers scenarios keep needing ────────────────────────────────────
export const orderIdOf = (checkoutResp) =>
  checkoutResp?.data?.order?.orderId || checkoutResp?.data?.orderId || null;

/**
 * order-getOrder returns the order's fields FLAT under `data`, while
 * server-getOrderDetails nests them under `data.order`. Callers must accept
 * both, which is exactly the ambiguity the Flutter models have to live with.
 */
export const orderOf = (resp) => resp?.data?.order || resp?.data || null;

export const priceInfoOf = (orderResp) =>
  orderResp?.data?.order?.priceInfo || orderResp?.data?.priceInfo || null;

export const cartsOf = (orderResp) =>
  orderResp?.data?.order?.carts || orderResp?.data?.carts || [];

export const ok = (resp) => resp?.status === 'success' || resp?.success === true;
