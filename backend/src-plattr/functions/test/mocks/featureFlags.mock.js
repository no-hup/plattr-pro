/**
 * Mocks for Feature Flags
 */

function createFeatureFlagsMock(overrides = {}) {
    const defaults = {
        isMultipleVariantOrAddonForMenuItemsSupported: true,
        fallbackToSameCustomConfigurationForAddItem: true,
        isOtpManadatoryAtScan: true,
        isUsernameEnabled: true,
        isMultiUserSupportEnabled: false,
        sendServerNotifications: false,
        shouldUpdateFoodStatusAtItemLevelORAtOrderLevel: false
    };

    const flags = { ...defaults, ...overrides };

    return {
        isEnabled: jest.fn(flag => {
            if (flags.hasOwnProperty(flag)) {
                return flags[flag];
            }
            return false;
        })
    };
}

module.exports = { createFeatureFlagsMock };
