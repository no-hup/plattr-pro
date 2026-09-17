/**
 * FeatureFlags - Singleton class to manage feature flags across the application
 *
 * === FLOW-IMPACT MAP ===
 * Before modifying any flow, check which flags affect it and test both true/false.
 *
 * isOtpManadatoryAtScan (default: true)
 *   - TRUE:  User must enter OTP before seeing menu. validateTableAndLocation returns 401.
 *            Affected: table.js:validateTableAndLocation, table.js:validateOTP
 *            Apps: Consumer (OTP dialog at scan), Server (OTP displayed on table)
 *   - FALSE: User browses menu freely, OTP required at checkout.
 *            Affected: cartInputValidation.js:validateCheckoutSession
 *            Apps: Consumer (OTP dialog at checkout)
 *
 * isUsernameEnabled (default: true)
 *   - TRUE:  Name field is mandatory for primary customers during OTP validation.
 *            Affected: table.js:validateOTP, table.js:validateTableAndLocation
 *            Apps: Consumer (name field in OTP dialog)
 *   - FALSE: Name field hidden, not required.
 *
 * isMultiUserSupportEnabled (default: false)
 *   - TRUE:  Multiple users can join same table. Phone number always required.
 *            Affected: table.js:validateOTP, table.js:validateTableAndLocation,
 *                      cartInputValidation.js:validateCheckoutSession
 *            Apps: Consumer (multi-user join flow), Kitchen (shows multiple occupants)
 *   - FALSE: Single user per table. Phone required only for primary (VACANT/OTP_PENDING).
 *
 * sendServerNotifications (default: false)
 *   - TRUE:  Push notifications sent to assigned server on order events.
 *            Affected: orders/updateOrderStatus.js, cart/triggers/orderTriggers.js
 *            Apps: Server (receives push notifications)
 *   - FALSE: No server notifications.
 */
const environment = require('./Environment');

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
      sendServerNotifications: false
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
    // Emulator-only: in production this would be a Firestore read on every
    // hot-path call AND a live surface for flipping flags by writing a doc.
    if (!environment.isEmulator()) return;
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