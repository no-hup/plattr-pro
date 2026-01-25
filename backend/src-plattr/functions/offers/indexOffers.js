/**
 * Offers Module - Entry Point
 * 
 * This module provides API endpoints for managing and applying offers/promotions.
 * Supports both generic (flat/percentage) and dynamic (rule-based) offers.
 * 
 * @version 1.0.0
 */

const getApplicableOffers = require('./getApplicableOffers');
const applyOffer = require('./applyOffer');
const removeOffer = require('./removeOffer');

module.exports = {
    getApplicableOffers,
    applyOffer,
    removeOffer,
};
