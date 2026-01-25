/**
 * Strategies Index
 * 
 * Exports all strategy-related modules
 */

const OfferStrategyFactory = require('./OfferStrategyFactory');
const BaseOfferStrategy = require('./BaseOfferStrategy');
const BogoStrategy = require('./BogoStrategy');
const PercentageStrategy = require('./PercentageStrategy');
const FlatStrategy = require('./FlatStrategy');

module.exports = {
    OfferStrategyFactory,
    BaseOfferStrategy,
    BogoStrategy,
    PercentageStrategy,
    FlatStrategy,
    // Convenience re-exports
    getStrategy: OfferStrategyFactory.getStrategy,
    isSupported: OfferStrategyFactory.isSupported,
    getSupportedTypes: OfferStrategyFactory.getSupportedTypes
};
