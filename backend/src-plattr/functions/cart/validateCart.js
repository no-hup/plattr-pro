/**
 * Validates the cart object to ensure all calculations are correct.
 * @param {Object} cart - The cart object containing items and their details.
 * @returns {boolean} Returns true if the cart is valid; otherwise, false.
 */
function validateCart(cart) {
  try {
    // Validate cart-level totals
    let totalBasePrice = 0;
    let totalVariantBasePrice = 0;
    let totalAddonBasePrice = 0;
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
      const expectedTotalBasePrice = (item.priceInfo.itemBasePrice || 0) * item.quantity;
      const expectedTotalVariantBasePrice = (item.priceInfo.totalVariantBasePrice || item.priceInfo.itemVariantBasePrice || 0) * item.quantity;
      const expectedTotalAddonBasePrice = (item.priceInfo.totalAddonBasePrice || item.priceInfo.itemAddonBasePrice || 0) * item.quantity;
      const expectedTotalFinalPrice = (item.priceInfo.itemFinalPrice || 0) * item.quantity;

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
      totalBasePrice += item.priceInfo.totalBasePrice || 0;
      totalVariantBasePrice += item.priceInfo.totalVariantBasePrice || 0;
      totalAddonBasePrice += item.priceInfo.totalAddonBasePrice || 0;
      totalFinalPrice += item.priceInfo.finalPrice || 0;
    });

    // Validate cart-level totals
    const offerDiscount = cart.priceInfo?.offerDiscount || 0;
    const expectedFinalPrice = Math.max(0, totalFinalPrice - offerDiscount);

    if (
      Math.abs((cart.priceInfo.basePrice || 0) - totalBasePrice) > 0.01 ||
      Math.abs((cart.priceInfo.totalVariantBasePrice || 0) - totalVariantBasePrice) > 0.01 ||
      Math.abs((cart.priceInfo.totalAddonBasePrice || 0) - totalAddonBasePrice) > 0.01 ||
      Math.abs((cart.priceInfo.finalPrice || 0) - expectedFinalPrice) > 0.01
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
