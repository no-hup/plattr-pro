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
    
    // Test override cache (populated by loadOverrides from Firestore)
    // Using an object so we can mutate its contents after Object.freeze
    this._overrideStore = { data: null };

    FeatureFlags.instance = this;
  }
  
  /**
   * Get the value of a feature flag.
   * In emulator: checks synchronous cache populated by loadOverrides().
   * @param {string} flagName - The name of the feature flag
   * @returns {boolean} - The value of the feature flag
   */
  isEnabled(flagName) {
    // Check test overrides (populated asynchronously from Firestore by calling loadOverrides)
    if (this._overrideStore.data && this._overrideStore.data.hasOwnProperty(flagName)) {
      return this._overrideStore.data[flagName];
    }
    if (this.flags.hasOwnProperty(flagName)) {
      return this.flags[flagName];
    }
    console.warn(`Feature flag '${flagName}' not found`);
    return false;
  }

  /**
   * Load feature flag overrides from Firestore (emulator-only).
   * Reads from `_system/featureFlagOverrides` doc.
   * Must be called before isEnabled() checks to pick up test overrides.
   * @param {object} db - Firestore instance
   */
  async loadOverrides(db) {
    try {
      const doc = await db.collection('_system').doc('featureFlagOverrides').get();
      if (doc.exists) {
        this._overrideStore.data = doc.data();
      } else {
        this._overrideStore.data = null;
      }
    } catch (e) {
      // Silently ignore — overrides are optional
      this._overrideStore.data = null;
    }
  }
}

// Export a singleton instance
const featureFlags = new FeatureFlags();
Object.freeze(featureFlags);

module.exports = featureFlags; 