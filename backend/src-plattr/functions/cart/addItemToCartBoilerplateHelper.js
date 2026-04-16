/**
 * Helper functions for addItemToCart.js to reduce verbosity
 */

const { admin, db, FieldValue, Timestamp } = require("../admin/admin");
const { compareArraysIgnoringOrder } = require('../utils/arrayUtils');
const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const { FULFILLMENT_STATUS } = require('../orders/orderConstants');
const { calculateItemPrice } = require('./calculateCartValue');

/**
 * Gets a reference to a cart document in Firestore
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @returns {Object} - Firestore document reference
 */
function getCartRef(db, restaurantId, tableId) {
  return db
    .collection("restaurants")
    .doc(restaurantId)
    .collection("tables")
    .doc(tableId)
    .collection("cart")
    .doc("cart");
}

/**
 * Gets a reference to a cart document in the carts collection (used by addItemToCart.js)
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @returns {Object} - Firestore document reference
 */
function getCartsCollectionRef(db, restaurantId, tableId) {
  return db
    .collection("restaurants")
    .doc(restaurantId)
    .collection("carts")
    .doc(tableId);
}

/**
 * Gets a reference to a menu item document in Firestore
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} menuItemId - ID of the menu item
 * @returns {Object} - Firestore document reference
 */
function getMenuItemRef(db, restaurantId, menuItemId) {
  return db
    .collection("restaurants")
    .doc(restaurantId)
    .collection("menuItems")
    .doc(menuItemId);
}

/**
 * Fetches addon documents from Firestore
 * Throws error if any addon is not found
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant
 * @param {Array} selectedIds - Array of addon IDs to fetch
 * @returns {Promise<Array>} - Array of addon objects
 */
function fetchAddons(db, restaurantId, selectedIds, errorHandler) {
  try {
    const promises = selectedIds.map((id) =>
      db
        .collection("restaurants")
        .doc(restaurantId)
        .collection("addons")
        .doc(id)
        .get()
    );

    return Promise.all(promises).then(docs => {
      // Check if any addon is missing
      const missingAddons = docs.filter((doc) => !doc.exists).length;
      if (missingAddons > 0) {
        errorHandler.notFound(`${missingAddons} addon(s) not found in the database.`);
      }

      return docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    });
  } catch (error) {
    console.error("Error fetching addons:", error);
    errorHandler.internalError("Error fetching addon details.", { originalError: error?.message });
    throw error;
  }
}

/**
 * Fetches variant documents from Firestore
 * Throws error if any variant is not found
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant
 * @param {Array} selectedIds - Array of variant IDs to fetch
 * @returns {Promise<Array>} - Array of variant objects
 */
function fetchVariants(db, restaurantId, selectedIds, errorHandler) {
  try {
    const promises = selectedIds.map((id) =>
      db
        .collection("restaurants")
        .doc(restaurantId)
        .collection("variants")
        .doc(id)
        .get()
    );

    return Promise.all(promises).then(docs => {
      // Check if any variant is missing
      const missingVariants = docs.filter((doc) => !doc.exists).length;
      if (missingVariants > 0) {
        errorHandler.notFound(`${missingVariants} variant(s) not found in the database.`);
      }

      return docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    });
  } catch (error) {
    console.error("Error fetching variants:", error);
    errorHandler.internalError("Error fetching variant details.", { originalError: error?.message });
    throw error;
  }
}

/**
 * Returns the next available ID for a cart item
 * @param {Array} cartItems - The current items in the cart
 * @returns {number} The next available ID
 */
function getNextCartItemId(cartItems) {
  if (!cartItems || !Array.isArray(cartItems)) {
    return 1;
  }
  const maxId = cartItems.reduce((max, item) => {
    // Guard against invalid cartItemId
    const itemId = typeof item.cartItemId === 'number' && !isNaN(item.cartItemId) ? item.cartItemId : 0;
    return itemId > max ? itemId : max;
  }, 0);
  return maxId + 1;
}

/**
 * Validates price information object to ensure all required fields are valid numbers
 * @param {Object} priceInfo - The price info object to validate
 * @param {string} context - Contextual information for error messages
 * @returns {boolean} - Whether the price info is valid
 */
function validatePriceData(priceInfo, context = 'unknown') {
  if (!priceInfo || typeof priceInfo !== 'object') {
    console.error(`Invalid priceInfo: not an object in ${context}`);
    return false;
  }

  const requiredFields = ['basePrice', 'finalPrice', 'discount'];
  const invalidFields = [];

  for (const field of requiredFields) {
    const value = priceInfo[field];
    const isValid = typeof value === 'number' && !isNaN(value) && isFinite(value);

    if (!isValid) {
      invalidFields.push(`${field}: ${value}`);
    }
  }

  if (invalidFields.length > 0) {
    console.error(`Invalid price data detected in ${context}. Invalid fields: ${invalidFields.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * Fixes invalid price information by setting default values
 * @param {Object} priceInfo - The price info object to fix
 * @returns {Object} - Fixed price info object
 */
function fixInvalidPriceInfo(priceInfo) {
  if (!priceInfo || typeof priceInfo !== 'object') {
    return {
      basePrice: 0,
      finalPrice: 0,
      discount: 0,
      totalBasePrice: 0,
      totalVariantBasePrice: 0,
      totalAddonBasePrice: 0,
      totalDiscountAmount: 0
    };
  }

  return {
    basePrice: sanitizeNumber(priceInfo.basePrice),
    finalPrice: sanitizeNumber(priceInfo.finalPrice),
    discount: sanitizeNumber(priceInfo.discount),
    totalBasePrice: sanitizeNumber(priceInfo.totalBasePrice),
    totalVariantBasePrice: sanitizeNumber(priceInfo.totalVariantBasePrice),
    totalAddonBasePrice: sanitizeNumber(priceInfo.totalAddonBasePrice),
    totalDiscountAmount: sanitizeNumber(priceInfo.totalDiscountAmount)
  };
}

/**
 * Helper function to sanitize numeric values
 * @param {any} value - The value to sanitize
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value, defaultValue = 0) {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}

/**
 * Checks if an identical item (same menuItem, variants, and addons) already exists in the cart
 * Returns the index of the matching item, or -1 if no match found
 *
 * @param {Array} cartItems - Array of items in the cart
 * @param {Object} newItem - Item to check for duplicates
 * @param {Function} compareArraysIgnoringOrder - Function to compare arrays ignoring order
 * @returns {number} Index of matching item or -1
 */
function findIdenticalItemInCart(cartItems, newItem, compareArraysIgnoringOrder) {
  if (!cartItems || !Array.isArray(cartItems)) {
    return -1;
  }
  // console.log("Checking for identical item in cart:", { cartItems, newItem }, "tag: cart-item-check");

  const { menuItemId, selectedVariantsDetails, selectedAddonsDetails } = newItem;

  if (!menuItemId) {
    return -1;
  }

  return cartItems.findIndex(item => {
    if (item?.menuItemId !== menuItemId) return false;

    // Compare variants regardless of order
    const variantsMatch = compareArraysIgnoringOrder(
      item?.selectedVariantsDetails || [],
      selectedVariantsDetails || [],
      'id', 'selected_variant_id'
    );

    // Compare addons regardless of order
    const addonsMatch = compareArraysIgnoringOrder(
      item?.selectedAddonsDetails || [],
      selectedAddonsDetails || [],
      'id'
    );

    return variantsMatch && addonsMatch;
  });
}

/**
 * Creates a default cart object with empty values
 * Used when no cart exists yet for a table
 * 
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {string} sessionId - Current user session ID
 * @returns {Object} - New cart object with default values
 */
function createDefaultCart(restaurantId, tableId, sessionId) {
  return {
    restaurantId,
    tableId,
    sessionId,
    items: [],
    priceInfo: {
      basePrice: 0,
      finalPrice: 0,
      totalDiscount: 0,
      totalDiscountAmount: 0,
      totalAddonBasePrice: 0,
      totalVariantBasePrice: 0
    }
  };
}

/**
 * Processes variant selections for a menu item
 * Retrieves variant documents, validates selections, and prepares data
 * 
 * @param {Object} db - Firestore database instance 
 * @param {string} restaurantId - ID of the restaurant
 * @param {Object} menuItem - Menu item document data
 * @param {Object} selectedVariants - Selected variants map (variantId → optionId)
 * @param {Object} errorHandler - Error handler for standardized errors
 * @returns {Promise<Array>} - Array of processed variant details
 */
async function processSelectedVariants(db, restaurantId, menuItem, selectedVariants, errorHandler) {
  // If menu item has no variants, return empty array
  if (!menuItem.variants || menuItem.variants.length === 0) {
    return [];
  }

  // Ensure selectedVariants is an object
  if (!selectedVariants) {
    selectedVariants = {};
  }

  // Map variants to Firebase promises
  const variantPromises = menuItem.variants.map((variantId) => {
    return db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("variants")
      .doc(variantId.id)
      .get();
  });

  // Wait for all promises to resolve
  const variantDocs = await Promise.all(variantPromises);

  // Filter out non-existent docs and extract data
  const validVariants = variantDocs
    .map((doc) => (doc.exists ? doc.data() : null))
    .filter((v) => v !== null);

  // Process each selected variant
  const selectedVariantsDetails = [];
  for (const [variantId, optionId] of Object.entries(selectedVariants)) {
    // Find the variant document
    const variant = validVariants.find((v) => v.id === variantId);
    if (!variant) {
      errorHandler.badRequest("Variant not found.", { variantId });
    }

    // Find the selected option within variant
    const selectedOption = variant.options.find((o) => o.id === optionId);
    if (!selectedOption) {
      errorHandler.badRequest("Selected option not found for the variant.", { variantId, optionId });
    }

    // Validate price data for the option
    if (!validatePriceData(selectedOption.priceInfo, `variant.${variant.id}.option.${selectedOption.id}`)) {
      console.warn("Invalid price data in variant option, using defaults:", selectedOption);
      selectedOption.priceInfo = {
        basePrice: 0,
        finalPrice: 0,
        discount: 0
      };
    }

    // Add processed variant to result array
    selectedVariantsDetails.push({
      id: variant.id,
      name: variant.name,
      isMandatory: variant.isMandatory,
      respectParentDiscount: variant.respectParentDiscount,
      selected_variant_id: selectedOption.id,
      selected_variant_name: selectedOption.name,
      priceInfo: selectedOption.priceInfo,
    });
  }

  // Validate that all mandatory variants are selected
  const mandatoryVariants = validVariants.filter(v => v.isMandatory);
  for (const variant of mandatoryVariants) {
    if (!selectedVariants[variant.id]) {
      errorHandler.badRequest(`Mandatory variant '${variant.name}' must be selected.`, { variantId: variant.id });
    }
  }

  // console.log("Processed variants:", JSON.stringify(selectedVariantsDetails, null, 2));
  return selectedVariantsDetails;
}

/**
 * Processes addon selections for a menu item
 * Retrieves addon documents, validates them, and prepares data
 * 
 * @param {Object} db - Firestore database instance
 * @param {string} restaurantId - ID of the restaurant 
 * @param {Array} selectedAddons - Array of selected addon IDs
 * @param {Object} errorHandler - Error handler for standardized errors
 * @returns {Promise<Array>} - Array of processed addon details
 */
async function processSelectedAddons(db, restaurantId, selectedAddons, errorHandler) {
  // If no addons selected, return empty array
  if (!selectedAddons || selectedAddons.length === 0) {
    return [];
  }

  // Map addon IDs to Firebase promises
  const addonPromises = selectedAddons.map((addonId) =>
    db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("addons")
      .doc(addonId)
      .get()
  );

  // Wait for all promises to resolve
  const addonDocs = await Promise.all(addonPromises);

  // Filter out non-existent docs and extract data
  const validAddons = addonDocs
    .map((doc) => (doc.exists ? { id: doc.id, ...doc.data() } : null))
    .filter(Boolean);

  // Process each addon
  const selectedAddonsDetails = validAddons.map((addon) => {
    /* console.log("Processing Addon:", {
      id: addon.id,
      name: addon.meta?.name,
      priceInfo: addon.priceInfo,
      respectParentDiscount: addon.respectParentDiscount,
    }); */

    // Validate price data for the addon
    if (!validatePriceData(addon.priceInfo, `addon.${addon.id}`)) {
      console.warn("Invalid price data in addon, using defaults:", addon);
      addon.priceInfo = {
        basePrice: 0,
        finalPrice: 0,
        discount: 0
      };
    }

    // Return processed addon data
    return {
      id: addon.id || "N/A",
      name: addon.meta?.name || "N/A",
      priceInfo: addon.priceInfo || {},
      respectParentDiscount: addon.respectParentDiscount || false,
    };
  });

  // console.log("Processed addons:", JSON.stringify(selectedAddonsDetails, null, 2));
  return selectedAddonsDetails;
}

/**
 * Creates a cart item object with all required fields
 * 
 * @param {string} menuItemId - ID of the menu item
 * @param {Object} menuItem - Menu item document data
 * @param {Array} selectedVariantsDetails - Processed variant selections
 * @param {Array} selectedAddonsDetails - Processed addon selections
 * @param {number} quantity - Quantity of the item
 * @param {Object} priceDetails - Price calculation results
 * @param {number} cartItemId - Unique ID for this cart item
 * @returns {Object} - Complete cart item object
 */
/**
 * Builds a CartItemPriceInfo object for a given quantity by freshly deriving
 * per-unit prices from the menu item and the immutable variant/addon snapshots
 * stored on the cart item, then multiplying by quantity.
 *
 * This is the single source of truth for "what should an item's priceInfo look
 * like at quantity N". It replaces the older, non-idempotent
 * `safeRecalculateItemPrice` helper in `utils/dataUtils.js`, which used to read
 * its own previous output as if it were per-unit — producing garbage on every
 * call after the first. See `Plattr_Pro_Context/TODO_Multi_Config_Cart_Feature.md`
 * Phase 2.5 for the full writeup.
 *
 * Callers MUST pass a fresh `menuItem` snapshot (from Firestore) — not a cached
 * value pulled off the cart item. This guarantees that the per-unit source of
 * truth is a document we control, not a possibly-corrupted `priceInfo` field.
 *
 * Output shape matches the historical `× quantity` schema that
 * `calculateCartValue`, `cart_page.dart`, and order creation all depend on.
 *
 * @param {Object} menuItem - Fresh menu item document (must contain priceInfo)
 * @param {Array}  selectedVariantsDetails - Variant snapshot stored on the cart item
 * @param {Array}  selectedAddonsDetails   - Addon snapshot stored on the cart item
 * @param {number} quantity - New quantity for the cart item
 * @returns {Object} CartItemPriceInfo-shaped priceInfo with every field × quantity
 */
function buildCartItemPriceInfoForQuantity(menuItem, selectedVariantsDetails, selectedAddonsDetails, quantity) {
  const safeQty = sanitizeNumber(quantity, 1);

  // Delegate per-unit computation to the same function used on initial add.
  // calculateItemPrice returns per-unit values across the board (see
  // cart/calculateCartValue.js:104-117).
  const { priceInfo: unit } = calculateItemPrice(
    menuItem,
    Array.isArray(selectedVariantsDetails) ? selectedVariantsDetails : [],
    Array.isArray(selectedAddonsDetails) ? selectedAddonsDetails : []
  );

  return new CartItemPriceInfo({
    itemBasePrice:          sanitizeNumber(unit.itemBasePrice          * safeQty),
    itemFinalPrice:         sanitizeNumber(unit.itemFinalPrice         * safeQty),
    totalVariantBasePrice:  sanitizeNumber(unit.totalVariantBasePrice  * safeQty),
    totalVariantFinalPrice: sanitizeNumber((unit.totalVariantFinalPrice || unit.totalVariantBasePrice) * safeQty),
    totalAddonBasePrice:    sanitizeNumber(unit.totalAddonBasePrice    * safeQty),
    totalAddonFinalPrice:   sanitizeNumber((unit.totalAddonFinalPrice  || unit.totalAddonBasePrice) * safeQty),
    totalBasePrice:         sanitizeNumber(unit.totalBasePrice         * safeQty),
    finalPrice:             sanitizeNumber(unit.finalPrice             * safeQty),
    discount:               sanitizeNumber(unit.discount),
    discountAmount:         sanitizeNumber((unit.discountAmount || 0) * safeQty)
  }).toObject();
}

function createCartItem(menuItemId, menuItem, selectedVariantsDetails, selectedAddonsDetails, quantity, priceDetails, cartItemId) {
  // priceDetails is kept in the signature for backward compatibility with the
  // one caller (addItemToCart.js), but we deliberately re-derive the priceInfo
  // from `menuItem` so createCartItem and the increment/decrement recalc paths
  // share exactly the same code. If priceDetails is ever missing or malformed,
  // buildCartItemPriceInfoForQuantity will still produce a correct priceInfo
  // from the menu item directly.
  let standardizedPriceInfo;
  try {
    standardizedPriceInfo = buildCartItemPriceInfoForQuantity(
      menuItem,
      selectedVariantsDetails,
      selectedAddonsDetails,
      quantity
    );
  } catch (err) {
    console.error("createCartItem: priceInfo derivation failed, using zeros", err);
    standardizedPriceInfo = new CartItemPriceInfo({
      itemBasePrice: 0,
      itemFinalPrice: 0,
      totalVariantBasePrice: 0,
      totalVariantFinalPrice: 0,
      totalAddonBasePrice: 0,
      totalAddonFinalPrice: 0,
      totalBasePrice: 0,
      finalPrice: 0,
      discount: 0,
      discountAmount: 0
    }).toObject();
  }

  // Construct cart item with standardized price info
  return {
    menuItemId,
    menuItem,
    selectedVariantsDetails,
    selectedAddonsDetails,
    quantity: sanitizeNumber(quantity, 1),
    priceInfo: standardizedPriceInfo,
    cartItemId,
    status: FULFILLMENT_STATUS.PENDING
  };
}

/**
 * Validates and processes the cart price information
 * Ensures the price info is valid and provides default values if not
 * 
 * @param {Object|null} updatedPriceInfo - Price information from price calculation
 * @returns {Object} - Validated price information object
 */
function validateCartPriceInfo(updatedPriceInfo) {
  if (!updatedPriceInfo || typeof updatedPriceInfo !== 'object') {
    console.error("Critical: Cart price calculation failed, using defaults");
    return {
      basePrice: 0,
      finalPrice: 0,
      totalDiscount: 0,
      totalDiscountAmount: 0,
      totalAddonBasePrice: 0,
      totalVariantBasePrice: 0,
    };
  }

  return updatedPriceInfo;
}

/**
 * Logs menu item, variants, and addons details in a single consolidated log
 * More efficient than multiple separate log statements
 * 
 * @param {Object} menuItem - Menu item data
 * @param {Array} selectedVariantsDetails - Processed variant selections
 * @param {Array} selectedAddonsDetails - Processed addon selections
 */
function logItemDetails(menuItem, selectedVariantsDetails, selectedAddonsDetails) {
  /* console.log("Cart Item Details:", {
    menuItem: menuItem,
    selectedVariants: selectedVariantsDetails,
    selectedAddons: selectedAddonsDetails
  }); */
}

module.exports = {
  getCartRef,
  getCartsCollectionRef,
  getMenuItemRef,
  fetchAddons,
  fetchVariants,
  getNextCartItemId,
  validatePriceData,
  fixInvalidPriceInfo,
  sanitizeNumber,
  findIdenticalItemInCart,
  createDefaultCart,
  processSelectedVariants,
  processSelectedAddons,
  createCartItem,
  buildCartItemPriceInfoForQuantity,
  validateCartPriceInfo,
  logItemDetails
};
