const functions = require("firebase-functions");
const { admin, db } = require("../admin/admin");
const { validateGetCartFields, validateSessionId } = require('./cartInputValidation');
const timestamp = require('../utils/timestamp');
const { calculateCartValue } = require('./calculateCartValue');
const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { resolveTableId } = require('../table/mergedTables');

/**
 * Sanitizes numeric values to prevent NaN errors
 * @param {any} value - The value to sanitize
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value, defaultValue = 0) {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}

/**
 * Sanitizes a cart object to ensure all price-related fields are valid numbers
 * @param {Object} cart - The cart object to sanitize
 * @returns {Object} - The sanitized cart object
 */
function sanitizeCart(cart) {
  if (!cart) return null;

  try {
    // Sanitize cart price info using CartTotalPriceInfo model
    cart.priceInfo = new CartTotalPriceInfo(cart.priceInfo).toObject();

    // Sanitize items if they exist
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.map(item => {
        if (!item) return null;

        // Ensure quantity is valid
        item.quantity = sanitizeNumber(item.quantity, 1);

        // Sanitize item price info using CartItemPriceInfo model
        if (item.priceInfo) {
          item.priceInfo = new CartItemPriceInfo(item.priceInfo).toObject();
        }

        return item;
      }).filter(item => item !== null);
    } else {
      cart.items = [];
    }

    return cart;
  } catch (error) {
    console.error("Error sanitizing cart:", error);
    return cart; // Return original cart if sanitization fails
  }
}

/**
 * Get Cart Cloud Function
 * 
 * Retrieves a user's cart from Firestore for a specific restaurant and table.
 * If no cart exists, returns an empty cart structure.
 * 
 * @param {Object} data - Input parameters
 * @param {string} data.restaurantId - ID of the restaurant
 * @param {string} data.tableId - ID of the table
 * @param {string} [data.sessionId] - Optional session ID
 * @returns {Object} Cart details including items and price information
 */
const getCart = functions.https.onCall(async (data, context) => {
  try {
    // console.log("getCart request received:", data.data);
    validateGetCartFields(data.data);

    let { restaurantId, tableId, sessionId } = data.data;
    // A merged table shares the parent's cart, so resolve before we touch any doc.
    tableId = await resolveTableId(restaurantId, tableId);

    // Validate session if provided
    if (sessionId) {
      await validateSessionId(restaurantId, sessionId);
    }

    const cartRef = db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("carts")
      .doc(tableId);

    const cartDoc = await cartRef.get().catch((error) => {
      console.error("Error fetching cart:", error);
      errorHandler.internalError(
        "Failed to access cart document.",
        {
          restaurantId,
          tableId,
        }
      );
    });

    let cart;
    if (cartDoc.exists) {
      cart = cartDoc.data();
      // console.log("Cart found:", JSON.stringify(cart, null, 2));
    } else {
      cart = {
        restaurantId,
        tableId,
        sessionId,
        items: [],
        priceInfo: new CartTotalPriceInfo().toObject(),
        lastUpdated: timestamp.now(),
      };
      // console.log("No existing cart, returning empty structure");
    }

    if (cart.items && Array.isArray(cart.items)) {
      cart.items = cart.items.map(item => {
        if (!item.selectedVariantsDetails) item.selectedVariantsDetails = [];
        if (!item.selectedAddonsDetails) item.selectedAddonsDetails = [];

        // Fix NaN quantity values
        if (item.quantity === undefined || item.quantity === null || isNaN(item.quantity)) {
          // console.log(`Fixing invalid quantity for item ${item.menuItemId}, setting to 1`);
          item.quantity = 1;
        }

        return item;
      });
    }

    const sanitizedCart = sanitizeCart(cart);

    // Recalculate the cart value to ensure correct totals
    try {
      // Only recalculate if there are items in the cart
      if (Array.isArray(sanitizedCart.items) && sanitizedCart.items.length > 0) {
        const recalculatedPriceInfo = await calculateCartValue(sanitizedCart);
        sanitizedCart.priceInfo = recalculatedPriceInfo;

        // Update the cart in Firestore with recalculated values
        await cartRef.update({
          priceInfo: recalculatedPriceInfo,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error recalculating cart value:", error);
      // Continue with existing price info, but ensure it's sanitized
      sanitizedCart.priceInfo = new CartTotalPriceInfo().toObject();
    }

    return ResponseBuilder.success(
      {
        cart: sanitizedCart,
      },
      "Cart retrieved successfully."
    );
  } catch (error) {
    console.error("Error in getCart:", error, error.stack);
    errorHandler.handleError(error, "getCart", {
      restaurantId: data?.data?.restaurantId,
      tableId: data?.data?.tableId,
      sessionId: data?.data?.sessionId,
    });
  }
});

module.exports = getCart;
