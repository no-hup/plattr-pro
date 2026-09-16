const functions = require("firebase-functions");
const { admin, db } = require('../admin/admin');
const { validateRemoveItemFields, requireActiveTableSession } = require('./cartInputValidation');
const timestamp = require('../utils/timestamp');
const { calculateCartValue } = require('./calculateCartValue');
const { CartTotalPriceInfo } = require('../genericModels/priceinfo');
const errorHandler = require('../singleton/ErrorHandler');
const {
  getMenuItemRef,
  buildCartItemPriceInfoForQuantity,
} = require('./addItemToCartBoilerplateHelper');
const { resolveTableId } = require('../table/mergedTables');

/**
 * Simplified function to remove an item from cart
 */
const removeItemFromCart = functions.https.onCall(async (data, context) => {
  // console.log("removeItemFromCart called with data:", JSON.stringify(data.data));
  let { tableId, restaurantId, menuItemId, cartItemId, addedBy = null } = data.data;

  // Input validation
  validateRemoveItemFields(data.data);

  try {
    // A merged table shares the parent's cart, so resolve before we touch any doc.
    tableId = await resolveTableId(restaurantId, tableId);

    // Public restaurantId/tableId must not be enough to mutate a cart.
    await requireActiveTableSession(restaurantId, tableId);

    const cartRef = db.collection("restaurants").doc(restaurantId).collection("carts").doc(tableId);

    // Same transaction shape as addItemToCart: two diners removing at once
    // must not overwrite each other's items with a stale array.
    const cart = await db.runTransaction(async (transaction) => {
      const cartDoc = await transaction.get(cartRef);

      if (!cartDoc.exists) {
        console.error("Cart not found for the table:", { tableId, restaurantId });
        throw new functions.https.HttpsError("not-found", "Cart not found for the table.");
      }

      const cart = cartDoc.data();

      // Ensure cart.items is an array
      if (!cart.items || !Array.isArray(cart.items)) {
        console.error("Cart items is not an array or is undefined");
        throw new functions.https.HttpsError("internal", "Cart data is corrupted.");
      }

      // Find target item (prefer cartItemId when provided).
      // The menuItemId fallback is scoped to the caller's own lines: the table shares one
      // cart, so an unscoped "first Burger in the array" let Asha's minus button take
      // Bhanu's Burger whenever his was added first.
      const mine = (it) => !addedBy || (it.addedBy || null) === addedBy;
      let targetIndex = -1;
      if (cartItemId !== undefined && cartItemId !== null) {
        targetIndex = cart.items.findIndex((it) => it.cartItemId === cartItemId);
      }
      if (targetIndex === -1) {
        targetIndex = cart.items.findIndex((it) => it.menuItemId === menuItemId && mine(it));
      }
      if (targetIndex === -1) {
        console.error("Item not found in cart:", { menuItemId, cartItemId });
        throw new functions.https.HttpsError("not-found", "Item not found in cart.");
      }

      // Nobody deletes someone else's food. A caller that sends no addedBy is a legacy
      // client and keeps the old free-for-all — this only binds once the app identifies itself.
      if (!mine(cart.items[targetIndex])) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "That item is not yours to remove."
        );
      }

      // Decrement quantity; if it reaches 0, remove the item entirely.
      const item = cart.items[targetIndex];
      const prevQty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
      const newQty = prevQty - 1;
      if (newQty > 0) {
        // Re-derive priceInfo from a trusted per-unit source (the menu item doc
        // + the item's own immutable selectedVariantsDetails/selectedAddonsDetails).
        // Historically this function called safeRecalculateItemPrice which read
        // the existing item.priceInfo fields as if they were per-unit, but
        // createCartItem/addItemToCart store them as "× current quantity". Every
        // call after the first compounded the multiplication and corrupted the
        // cart. See Phase 2.5 in
        // Plattr_Pro_Context/TODO_Multi_Config_Cart_Feature.md for the full trace.
        const menuItemDoc = await transaction.get(getMenuItemRef(db, restaurantId, item.menuItemId));
        if (!menuItemDoc.exists) {
          console.error("Menu item no longer exists during decrement:", { menuItemId: item.menuItemId });
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Menu item no longer exists."
          );
        }
        item.quantity = newQty;
        item.priceInfo = buildCartItemPriceInfoForQuantity(
          menuItemDoc.data(),
          item.selectedVariantsDetails,
          item.selectedAddonsDetails,
          newQty
        );
        cart.items[targetIndex] = item;
      } else {
        cart.items.splice(targetIndex, 1);
      }

      if (cart.items.length > 0) {
        cart.priceInfo = await calculateCartValue(cart);
        transaction.update(cartRef, {
          items: cart.items,
          priceInfo: cart.priceInfo,
          lastUpdated: timestamp.now()
        });
      } else {
        // Delete empty cart
        transaction.delete(cartRef);
        cart.items = [];
        cart.priceInfo = new CartTotalPriceInfo().toObject();
      }
      return cart;
    });

    return {
      message: "Item removed from cart successfully.",
      status: "success",
      data: { cart }
    };

  } catch (error) {
    // Preserves HttpsError codes (e.g. unauthenticated → 401) instead of
    // collapsing everything to internal/500.
    errorHandler.handleError(error, 'removeItemFromCart');
  }
});

module.exports = removeItemFromCart;

/**
 * removeItemFromCart.js
 * 
 * This function removes a menu item or decreases its quantity from a user's cart for a specific restaurant.
 * 
 * - Validates input to ensure required fields are provided.
 * - Retrieves the user's cart and checks if the item exists.
 * - Either decreases the quantity or removes the item entirely if the quantity becomes zero.
 * - Recalculates the total cart amount using calculateCartValue with our price info models.
 * - Updates the cart document in Firestore or deletes it if the cart becomes empty.
 * 
 * Date Created: 2024-11-23
 */
