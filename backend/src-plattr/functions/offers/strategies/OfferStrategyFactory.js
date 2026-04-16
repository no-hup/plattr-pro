/**
 * Offer Strategy Factory
 * 
 * Returns the appropriate strategy instance based on offer type.
 * Supports: BOGO, FREE_ITEM, PERCENTAGE, FLAT
 */

const BogoStrategy = require('./BogoStrategy');
const PercentageStrategy = require('./PercentageStrategy');
const FlatStrategy = require('./FlatStrategy');

// Singleton instances (strategies are stateless)
const strategies = {
    BOGO: new BogoStrategy(),
    FREE_ITEM: new BogoStrategy(), // FREE_ITEM uses same logic as BOGO
    PERCENTAGE: new PercentageStrategy(),
    FLAT: new FlatStrategy()
};

/**
 * Get the strategy for a given offer type
 * @param {string} offerType - The offer type (BOGO, FREE_ITEM, PERCENTAGE, FLAT)
 * @returns {BaseOfferStrategy} Strategy instance
 * @throws {Error} If offer type is unknown
 */
function getStrategy(offerType) {
    const strategy = strategies[offerType];

    if (!strategy) {
        console.warn(`⚠️ OFFER_STRATEGY: Unknown offer type "${offerType}", defaulting to FLAT`);
        return strategies.FLAT;
    }

    return strategy;
}

/**
 * Check if an offer type is supported
 * @param {string} offerType 
 * @returns {boolean}
 */
function isSupported(offerType) {
    return offerType in strategies;
}

/**
 * Get list of supported offer types
 * @returns {string[]}
 */
function getSupportedTypes() {
    return Object.keys(strategies);
}

module.exports = {
    getStrategy,
    isSupported,
    getSupportedTypes
};
