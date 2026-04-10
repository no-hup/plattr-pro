/**
 * Offers Module - Entry Point
 *
 * Offers V2: order-level auto-apply architecture.
 * Consumers no longer apply offers manually — the system evaluates and applies
 * the best offer at checkout via evaluateOrderOffers.js. This module only
 * exposes the consumer-facing read endpoint for displaying offer hints.
 *
 * @version 2.0.0
 */

const getApplicableOffers = require('./getApplicableOffers');

module.exports = {
    getApplicableOffers,
};
