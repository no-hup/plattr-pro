/**
 * FeatureFlags - Singleton class to manage feature flags across the application
 */
class FeatureFlags {
  constructor() {
    if (FeatureFlags.instance) {
      return FeatureFlags.instance;
    }
    
    // Initialize feature flags
    this.flags = {
      isOtpManadatoryAtScan: true,
      isUsernameEnabled: true,
      isMultiUserSupportEnabled: false,
      isMultipleVariantOrAddonForMenuItemsSupported: true,
      sendServerNotifications: false,
      // TODO: Implement item-level status tracking logic when this is enabled
      shouldUpdateFoodStatusAtItemLevelORAtOrderLevel: false,
      // Feature flag for auto-filling cart item configuration
      fallbackToSameCustomConfigurationForAddItem: true
    };
    
    FeatureFlags.instance = this;
  }
  
  /**
   * Get the value of a feature flag
   * @param {string} flagName - The name of the feature flag
   * @returns {boolean} - The value of the feature flag
   */
  isEnabled(flagName) {
    if (this.flags.hasOwnProperty(flagName)) {
      return this.flags[flagName];
    }
    console.warn(`Feature flag '${flagName}' not found`);
    return false;
  }
}

// Export a singleton instance
const featureFlags = new FeatureFlags();
Object.freeze(featureFlags);

module.exports = featureFlags; 