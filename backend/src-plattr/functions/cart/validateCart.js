/**
 * Validates the cart object to ensure all calculations are correct.
 * @param {Object} cart - The cart object containing items and their details.
 * @returns {boolean} Returns true if the cart is valid; otherwise, false.
 */
function validateCart(cart) {
  try {
    // Validate cart-level totals
    let totalBasePrice = 0;
    let totalVariantFinalPrice = 0;
    let totalAddonFinalPrice = 0;
    let totalFinalPrice = 0;

    cart.items.forEach(item => {
      // Validate item-level calculations
      const expectedItemFinalPrice =
        (item.priceInfo.itemBasePrice || 0) +
        (item.priceInfo.itemVariantBasePrice || 0) +
        (item.priceInfo.itemAddonBasePrice || 0);

      const expectedItemFinalPriceWithDiscount =
        expectedItemFinalPrice * (1 - (item.priceInfo.discount || 0) / 100);

      if (
        Math.abs(item.priceInfo.itemFinalPrice - expectedItemFinalPriceWithDiscount) > 0.01
      ) {
        console.error(`Validation failed for itemFinalPrice in item ${item.menuItemId}`);
        return false;
      }

      // Validate total-level calculations for the item
      const expectedTotalBasePrice = item.priceInfo.itemBasePrice * item.quantity;
      const expectedTotalVariantBasePrice = item.priceInfo.itemVariantBasePrice * item.quantity;
      const expectedTotalAddonBasePrice = item.priceInfo.itemAddonBasePrice * item.quantity;
      const expectedTotalFinalPrice = item.priceInfo.itemFinalPrice * item.quantity;

      if (
        Math.abs(item.priceInfo.totalBasePrice - expectedTotalBasePrice) > 0.01 ||
        Math.abs(item.priceInfo.totalVariantBasePrice - expectedTotalVariantBasePrice) > 0.01 ||
        Math.abs(item.priceInfo.totalAddonBasePrice - expectedTotalAddonBasePrice) > 0.01 ||
        Math.abs(item.priceInfo.finalPrice - expectedTotalFinalPrice) > 0.01
      ) {
        console.error(`Validation failed for totals in item ${item.menuItemId}`);
        return false;
      }

      // Accumulate cart-level totals
      totalBasePrice += item.priceInfo.totalBasePrice;
      totalVariantFinalPrice += item.priceInfo.totalVariantBasePrice;
      totalAddonFinalPrice += item.priceInfo.totalAddonBasePrice;
      totalFinalPrice += item.priceInfo.finalPrice;
    });

    // Validate cart-level totals
    if (
      Math.abs(cart.priceInfo.basePrice - totalBasePrice) > 0.01 ||
      Math.abs(cart.priceInfo.totalVariantFinalPrice - totalVariantFinalPrice) > 0.01 ||
      Math.abs(cart.priceInfo.totalAddonFinalPrice - totalAddonFinalPrice) > 0.01 ||
      Math.abs(cart.priceInfo.finalPrice - totalFinalPrice) > 0.01
    ) {
      console.error('Validation failed for cart-level totals.');
      return false;
    }

    return true; // All validations passed
  } catch (error) {
    console.error('Error validating cart:', error);
    return false;
  }
}

// Export the validateCart function
module.exports = {
  validateCart
};
