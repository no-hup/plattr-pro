/**
 * Data utility functions for sanitization and validation
 */

/**
 * Safely sanitizes data by replacing invalid values and ensuring structure integrity
 * Handles NaN values, preserves critical properties, and logs issues
 * 
 * @param {Object} data - Data to sanitize
 * @param {Object} [options] - Sanitization options
 * @param {Array<string>} [options.criticalProps] - Properties that must be preserved
 * @param {Object} [options.defaultValues] - Default values for critical properties if missing
 * @returns {Object} Sanitized data
 */
function sanitizeData(data, options = {}) {
  const {
    criticalProps = [],
    defaultValues = {}
  } = options;

  if (!data) {
    console.error("sanitizeData received null or undefined data");
    return {};
  }

  try {
    // Track original properties for validation
    const originalProps = new Set(criticalProps.filter(prop => data[prop] !== undefined));

    // Clone and sanitize the data
    const clone = JSON.parse(JSON.stringify(data, (key, value) => {
      // Handle NaN values
      if (typeof value === "number" && isNaN(value)) {
        console.error(`Found NaN value at field: ${key}`);
        return 0; // Replace NaN with 0
      }

      // Handle Infinity values
      if (typeof value === "number" && !isFinite(value)) {
        console.error(`Found Infinity value at field: ${key}`);
        return 0; // Replace Infinity with 0
      }

      return value;
    }));

    // Verify critical properties were preserved
    for (const prop of originalProps) {
      if (clone[prop] === undefined) {
        console.warn(`Sanitization removed critical property: ${prop}`);

        // Restore from default values if available
        if (defaultValues[prop] !== undefined) {
          clone[prop] = defaultValues[prop];
        } else if (data[prop] !== undefined) {
          // Try to safely copy the original value
          try {
            clone[prop] = JSON.parse(JSON.stringify(data[prop]));
          } catch (err) {
            console.error(`Failed to restore property ${prop}:`, err);
            clone[prop] = null;
          }
        }
      }
    }

    return clone;
  } catch (error) {
    console.error("Error during data sanitization:", error);

    // Create a minimal safe object with critical properties
    const safeObject = {};

    for (const prop of criticalProps) {
      if (defaultValues[prop] !== undefined) {
        safeObject[prop] = defaultValues[prop];
      } else if (data[prop] !== undefined) {
        // Try to safely copy simple values
        if (typeof data[prop] !== 'object' || data[prop] === null) {
          safeObject[prop] = data[prop];
        } else {
          safeObject[prop] = null;
          console.warn(`Could not preserve complex property: ${prop}`);
        }
      }
    }

    return safeObject;
  }
}

/**
 * Detects NaN values in an object and reports their path
 * Useful for debugging cart pricing issues
 * 
 * @param {Object} obj - Object to scan for NaN values
 * @param {string} [prefix] - Path prefix for nested properties
 * @returns {Array} Array of paths where NaN values were found
 */
function detectNaNValues(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const nanPaths = [];

  // Check all properties in the object
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'number' && isNaN(value)) {
      nanPaths.push(currentPath);
      console.error(`NaN detected at ${currentPath}`);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check nested objects
      const nestedNaNs = detectNaNValues(value, currentPath);
      if (nestedNaNs.length > 0) {
        nanPaths.push(...nestedNaNs);
      }
    }
  }

  return nanPaths;
}

/**
 * Specialized function to sanitize cart data
 * 
 * @param {Object} cartData - Cart data to sanitize
 * @returns {Object} Sanitized cart data
 */
function sanitizeCart(cartData) {
  // First detect any NaN values to log them for debugging
  const nanPaths = detectNaNValues(cartData, 'cart');
  if (nanPaths.length > 0) {
    console.warn(`Found ${nanPaths.length} NaN values in cart data at: ${nanPaths.join(', ')}`);
  }

  return sanitizeData(cartData, {
    criticalProps: ['items', 'priceInfo', 'restaurantId', 'menuItem', 'selectedVariantsDetails', 'selectedAddonsDetails'],
    defaultValues: {
      items: [],
      priceInfo: {
        basePrice: 0,
        finalPrice: 0,
        totalDiscount: 0,
        totalDiscountAmount: 0,
        totalAddonBasePrice: 0,
        totalVariantBasePrice: 0
      },
      menuItem: { meta: { name: "Unknown item" } }
    }
  });
}

/**
 * Safely get a number value, defaulting to 0 if NaN or invalid
 * @param {any} value - Value to sanitize
 * @returns {number} Sanitized number
 */
function safeGetNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
}

// NOTE: `safeRecalculateItemPrice` used to live here but was removed in
// Phase 2.5 of TODO_Multi_Config_Cart_Feature.md. The function was
// non-idempotent — it read `priceInfo.itemBasePrice` as per-unit but wrote
// it back as `per-unit × quantity`, so every call after the first compounded
// the multiplication and corrupted cart totals. Its two callers
// (addItemToCart merge path, removeItemFromCart decrement path) now use
// `buildCartItemPriceInfoForQuantity` in
// `cart/addItemToCartBoilerplateHelper.js`, which always re-derives from a
// fresh menuItem snapshot via `calculateItemPrice`.

module.exports = {
  sanitizeData,
  sanitizeCart,
  detectNaNValues,
  safeGetNumber
};