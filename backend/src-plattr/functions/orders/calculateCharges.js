/**
 * Pure helper for calculating percentage-based charges on an order total.
 *
 * Supports positive and negative percentages so the same array can express
 * both upward charges (service charge, convenience fee) and downward ones
 * (global discount). Each charge is computed independently on the supplied
 * base amount — no sequential stacking.
 *
 * Design notes:
 *   - Intended to run on `finalPrice` (post-offer, post-item-discount)
 *   - Stored as-is on `order.priceInfo.charges` so downstream UI can render
 *     a line per entry without knowing charge semantics
 *   - Missing / empty config → returns empty charges and zero total; caller
 *     can skip writing the fields entirely for backward compat with old orders
 */

'use strict';

const { db } = require('../admin/admin');

/**
 * Loads restaurant `billing.charges`. Missing doc / field / read error → []
 * so restaurants that never opted in see zero behavior change.
 * @param {string} restaurantId
 * @returns {Promise<ChargeConfig[]>}
 */
async function loadChargesConfig(restaurantId) {
  try {
    const settingsDoc = await db
      .collection('restaurants').doc(restaurantId)
      .collection('config').doc('settings')
      .get();
    const charges = settingsDoc.exists ? settingsDoc.data()?.billing?.charges : null;
    return Array.isArray(charges) ? charges : [];
  } catch (err) {
    console.warn(`loadChargesConfig: failed for ${restaurantId}: ${err.message}`);
    return [];
  }
}

/**
 * @typedef {Object} ChargeConfig
 * @property {string} type - Free-form identifier (e.g. "SERVICE_CHARGE", "GLOBAL_DISCOUNT")
 * @property {number} percentage - Can be negative for discounts
 */

/**
 * @typedef {Object} CalculatedCharge
 * @property {string} type
 * @property {number} percentage
 * @property {number} amount - Percentage applied to the base, rounded to 2 decimals
 */

/**
 * @typedef {Object} CalculateChargesResult
 * @property {CalculatedCharge[]} charges
 * @property {number} chargesTotal - Sum of amounts (can be negative)
 */

/**
 * @param {number} finalPrice - Post-offer base for percentage calculation
 * @param {ChargeConfig[]} chargesConfig - Restaurant billing.charges array
 * @returns {CalculateChargesResult}
 */
function calculateCharges(finalPrice, chargesConfig) {
  if (!Array.isArray(chargesConfig) || chargesConfig.length === 0) {
    return { charges: [], chargesTotal: 0 };
  }

  const safeFinalPrice = _sanitizeNumber(finalPrice);

  const charges = chargesConfig
    .filter((cfg) =>
      cfg &&
      typeof cfg === 'object' &&
      typeof cfg.type === 'string' &&
      cfg.type.length > 0 &&
      typeof cfg.percentage === 'number' &&
      isFinite(cfg.percentage)
    )
    .map((cfg) => ({
      type: cfg.type,
      percentage: cfg.percentage,
      amount: _roundTo2((safeFinalPrice * cfg.percentage) / 100),
    }));

  const chargesTotal = _roundTo2(
    charges.reduce((sum, c) => sum + c.amount, 0)
  );

  return { charges, chargesTotal };
}

function _sanitizeNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
}

function _roundTo2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { calculateCharges, loadChargesConfig };
