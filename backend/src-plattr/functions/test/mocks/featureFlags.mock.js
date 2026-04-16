/**
 * Mocks for Feature Flags
 */

function createFeatureFlagsMock(overrides = {}) {
    const defaults = {
        isOtpManadatoryAtScan: true,
        isUsernameEnabled: true,
        isMultiUserSupportEnabled: false,
        sendServerNotifications: false
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
