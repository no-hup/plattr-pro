/**
 * Narrative logger for E2E tests.
 *
 * Writes a human-readable, business-logic-focused log to results/narrative.log.
 * Designed to be tailed in a separate terminal:
 *   tail -f results/narrative.log
 *
 * The narrative focuses on WHAT is being tested (items, configs, prices, offers,
 * order transitions) — not boilerplate setup steps.
 */

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '..', 'results', 'narrative.log');

function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function write(line) {
  appendFileSync(LOG_PATH, line + '\n');
}

function blank() {
  write('');
}

export const narrator = {
  /** Call once at start of test run — truncates previous log */
  init() {
    mkdirSync(resolve(__dirname, '..', 'results'), { recursive: true });
    writeFileSync(LOG_PATH, `Plattr Pro E2E — ${new Date().toISOString()}\n${'─'.repeat(55)}\n\n`);
  },

  /** Suite header with restaurant context */
  suite(suiteName, restaurantName) {
    write(`\n${'═'.repeat(55)}`);
    write(`[${ts()}] SUITE: ${suiteName}`);
    if (restaurantName) write(`         Restaurant: ${restaurantName}`);
    write(`${'═'.repeat(55)}`);
    blank();
  },

  /** Collapsed one-liner for setup steps (OTP, table scan, session) */
  setup(msg) {
    write(`[${ts()}]    Setup: ${msg}`);
  },

  /** Cart item added — the core narrative event */
  cartAdd(itemName, config = {}, expectedPrice) {
    write(`[${ts()}]    📦 Added: ${itemName}`);
    if (config.variant) write(`            Variant: ${config.variant}`);
    if (config.addon) write(`            Addon: ${config.addon}`);
    if (config.quantity && config.quantity > 1) write(`            Qty: x${config.quantity}`);
    if (config.discount) write(`            Discount: ${config.discount}`);
    if (config.respectParentDiscount !== undefined) {
      write(`            respectParentDiscount: ${config.respectParentDiscount}`);
    }
    if (expectedPrice !== undefined) write(`            Expected price: ₹${expectedPrice}`);
  },

  /** Cart total verification */
  cartTotal(expected, actual) {
    const match = actual !== undefined ? (Math.abs(actual - expected) <= 0.01 ? '✓' : `✗ got ₹${actual}`) : '';
    write(`[${ts()}]    💰 Cart total: ₹${expected} ${match}`);
  },

  /** Offer successfully applied */
  offerApplied(offerName, scope, discount, newTotal) {
    write(`[${ts()}]    🎫 Offer applied: ${offerName}`);
    write(`            Scope: ${scope}`);
    write(`            Discount: ₹${discount}`);
    if (newTotal !== undefined) write(`            New total: ₹${newTotal}`);
  },

  /** Offer rejected with reason */
  offerRejected(offerName, reason) {
    write(`[${ts()}]    🚫 Offer rejected: ${offerName}`);
    write(`            Reason: ${reason}`);
  },

  /** Checkout result */
  checkout(orderId, orderNumber, status) {
    write(`[${ts()}]    ✅ Checkout → Order #${orderNumber || orderId}`);
    write(`            Status: ${status}`);
    if (orderId) write(`            OrderId: ${orderId}`);
  },

  /** Order-level status transition */
  orderStatus(orderId, from, to) {
    write(`[${ts()}]    📋 Order ${orderId}: ${from} → ${to}`);
  },

  /** Cart-level status transition */
  cartStatus(cartIndex, from, to) {
    write(`[${ts()}]    🍽  Cart #${cartIndex}: ${from} → ${to}`);
  },

  /** Cart removed / cleared */
  cartCleared() {
    write(`[${ts()}]    🗑  Cart cleared`);
  },

  /** Item removed from cart */
  cartRemove(itemName) {
    write(`[${ts()}]    ➖ Removed: ${itemName}`);
  },

  /** Menu fetched */
  menuFetched(itemCount, categoryCount) {
    write(`[${ts()}]    📋 Menu fetched: ${itemCount} items, ${categoryCount} categories`);
  },

  /** Error case tested */
  errorCase(testName, expectedError) {
    write(`[${ts()}]    ⚠️  Error case: ${testName} → ${expectedError}`);
  },

  /** Feature flag toggle */
  flagToggle(flagName, value) {
    write(`[${ts()}]    🚩 Flag: ${flagName} = ${value}`);
  },

  /** Test failure context */
  error(testName, msg) {
    write(`[${ts()}]    ❌ FAILED: ${testName}`);
    write(`            ${msg}`);
  },

  /** Known bug skip */
  skip(testName, bugId) {
    write(`[${ts()}]    ⏭  SKIP: ${testName} (${bugId})`);
  },

  /** Generic info line */
  info(msg) {
    write(`[${ts()}]    ℹ️  ${msg}`);
  },
};
