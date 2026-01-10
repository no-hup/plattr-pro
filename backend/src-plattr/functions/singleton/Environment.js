/**
 * Environment.js
 * Singleton module for environment detection and configuration
 */

class Environment {
  constructor() {
    this._isEmulator = this._detectEmulator();
    this._logEnvironment(); // Log at startup for debugging
    this._projectId = 'rms-app-dd875'; // Your Firebase project ID
    this._serviceAccountPath = '/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/secure_stuff/service-account.json';

    // List of trigger functions that should not be deployed to production
    this._restrictedTriggers = [
      'onOrderPlaced',
      'onOrderUpdated'
    ];
  }

  /**
   * Detect if running in emulator environment
   * @private
   * @returns {boolean} True if running in emulator
   */
  _detectEmulator() {
    return process.env.NODE_ENV === 'development' ||
      process.env.FUNCTIONS_EMULATOR === 'true' ||
      !!process.env.FIRESTORE_EMULATOR_HOST;
  }

  // Add logging for debugging
  _logEnvironment() {
    console.log(`Environment mode: ${this.mode}`);
    console.log(`FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`FUNCTIONS_EMULATOR: ${process.env.FUNCTIONS_EMULATOR}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  }

  /**
   * Get current environment mode
   * @returns {string} 'emulator' or 'production'
   */
  get mode() {
    return this._isEmulator ? 'emulator' : 'production';
  }

  /**
   * Check if running in emulator
   * @returns {boolean} True if running in emulator
   */
  isEmulator() {
    return this._isEmulator;
  }

  /**
   * Check if running in production
   * @returns {boolean} True if running in production
   */
  isProduction() {
    return !this._isEmulator;
  }

  /**
   * Get Firebase project ID
   * @returns {string} Project ID
   */
  get projectId() {
    return this._projectId;
  }

  /**
   * Get service account path
   * @returns {string} Path to service account JSON
   */
  get serviceAccountPath() {
    return this._serviceAccountPath;
  }

  /**
   * Get Firestore settings based on environment
   * @returns {Object} Firestore settings object
   */
  getFirestoreSettings() {
    if (this._isEmulator) {
      const hostFromEnv = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
      return {
        host: hostFromEnv,
        ssl: false,
        ignoreUndefinedProperties: true
      };
    }

    return {
      ignoreUndefinedProperties: true
    };
  }

  /**
   * Configure environment variables for the current mode
   * @param {boolean} forceProduction - Force production mode if true
   */
  configureEnvironment(forceProduction = false) {
    if (forceProduction) {
      process.env.NODE_ENV = 'production';
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FUNCTIONS_EMULATOR;
    } else {
      // Set emulator environment variables if in emulator mode
      if (this._isEmulator) {
        process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
        process.env.FUNCTIONS_EMULATOR = 'true';
        process.env.NODE_ENV = 'development';
      }
    }

    // Always set service account path
    // process.env.GOOGLE_APPLICATION_CREDENTIALS = this._serviceAccountPath;
  }

  /**
   * Wrap a trigger function to prevent deployment in production
   * @param {string} functionName - Name of the trigger function
   * @param {Function} triggerFunction - The trigger function to wrap
   * @returns {Function} Wrapped trigger function or no-op in production
   */
  wrapTriggerFunction(functionName, triggerFunction) {
    if (this._restrictedTriggers.includes(functionName)) {
      if (this.isProduction()) {
        console.warn(`⚠️ Trigger function ${functionName} is restricted in production and will not be deployed`);
        return () => {
          console.warn(`Trigger function ${functionName} is disabled in production`);
          return null;
        };
      }
    }
    return triggerFunction;
  }

  /**
   * Add a trigger function to the restricted list
   * @param {string} functionName - Name of the trigger function to restrict
   */
  addRestrictedTrigger(functionName) {
    if (!this._restrictedTriggers.includes(functionName)) {
      this._restrictedTriggers.push(functionName);
    }
  }

  /**
   * Remove a trigger function from the restricted list
   * @param {string} functionName - Name of the trigger function to unrestrict
   */
  removeRestrictedTrigger(functionName) {
    this._restrictedTriggers = this._restrictedTriggers.filter(name => name !== functionName);
  }

  /**
   * Get list of restricted trigger functions
   * @returns {string[]} List of restricted trigger function names
   */
  getRestrictedTriggers() {
    return [...this._restrictedTriggers];
  }
}

// Export singleton instance
module.exports = new Environment(); 