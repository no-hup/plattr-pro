/**
 * Price Info Models
 * Standard model classes for price information objects used throughout the application.
 * These models provide consistent validation, formatting, and structure for all price-related data.
 */

/**
 * @typedef {Object} BasicPriceInfoObj
 * @property {number} basePrice - Original price before discount
 * @property {number} discount - Discount percentage (0-100)
 * @property {number} finalPrice - Price after applying discount
 */

/**
 * @typedef {Object} CartItemPriceInfoObj
 * @property {number} itemBasePrice - Original menu item price
 * @property {number} itemFinalPrice - Menu item price after discount
 * @property {number} totalVariantBasePrice - Sum of all variant prices
 * @property {number} totalVariantFinalPrice - Sum of variant prices after discount
 * @property {number} totalAddonBasePrice - Sum of all addon prices
 * @property {number} totalAddonFinalPrice - Sum of addon prices after discount
 * @property {number} totalBasePrice - Total original price
 * @property {number} finalPrice - Final price after all discounts
 * @property {number} discount - Original discount percentage
 * @property {number} discountAmount - Total discount amount in currency
 */

/**
 * @typedef {Object} CartTotalPriceInfoObj
 * @property {number} basePrice - Total original price
 * @property {number} finalPrice - Total price after discounts
 * @property {number} totalVariantBasePrice - Total price from variants
 * @property {number} totalAddonBasePrice - Total price from addons
 * @property {number} totalDiscount - Overall discount percentage
 * @property {number} totalDiscountAmount - Total discount amount in currency
 */

/**
 * @typedef {Object} OrderPriceInfoObj 
 * @property {number} basePrice - Total original price
 * @property {number} finalPrice - Total price after discounts
 * @property {number} totalDiscount - Overall discount percentage
 * @property {number} totalDiscountAmount - Total discount amount in currency
 */

/**
 * Base price info class used by menu items, variants, and addons.
 * Provides standardized price structure with discount calculations.
 * 
 * @example
 * // Create a new basic price info for a menu item
 * const menuItemPrice = new BasicPriceInfo(10.99, 15);
 * console.log('poopoo ' + menuItemPrice.toObject()); // { basePrice: 10.99, discount: 15, finalPrice: 9.34 }
 * 
 * @example
 * // Validate an existing price info object
 * const validatedPrice = BasicPriceInfo.fromObject(existingPriceObj);
 */
class BasicPriceInfo {
  /**
   * Create a new price info object with validation
   * @param {number} basePrice - Original price before discount
   * @param {number} discount - Discount percentage (0-100)
   * @param {number|null} finalPrice - Final price after discount (optional, calculated if null)
   */
  constructor(basePrice = 0, discount = 0, finalPrice = null) {
    // Log significant sanitization to help with debugging
    const sanitizedBasePrice = this._sanitizeNumber(basePrice);
    if (basePrice !== sanitizedBasePrice && basePrice !== undefined) {
      console.warn(`PriceInfo: Invalid basePrice sanitized: ${basePrice} → ${sanitizedBasePrice}`);
    }
    this.basePrice = sanitizedBasePrice;
    
    const rawDiscount = discount;
    const sanitizedDiscount = this._sanitizeNumber(discount);
    let clampedDiscount = Math.max(0, Math.min(100, sanitizedDiscount));
    
    // Log when discount values are clamped or sanitized
    if (rawDiscount !== sanitizedDiscount && rawDiscount !== undefined) {
      console.warn(`PriceInfo: Invalid discount sanitized: ${rawDiscount} → ${sanitizedDiscount}`);
    } else if (sanitizedDiscount !== clampedDiscount) {
      console.warn(`PriceInfo: Discount clamped to valid range: ${sanitizedDiscount} → ${clampedDiscount}`);
    }
    
    this.discount = clampedDiscount;
    
    // Handle final price calculation or validation
    if (finalPrice !== null) {
      const sanitizedFinalPrice = this._sanitizeNumber(finalPrice);
      if (finalPrice !== sanitizedFinalPrice && finalPrice !== undefined) {
        console.warn(`PriceInfo: Invalid finalPrice sanitized: ${finalPrice} → ${sanitizedFinalPrice}`);
      }
      this.finalPrice = sanitizedFinalPrice;
      
      // Check if provided finalPrice deviates significantly from calculated value
      const calculatedFinalPrice = this._roundPrice(this.basePrice * (1 - this.discount / 100));
      const deviation = Math.abs(calculatedFinalPrice - this.finalPrice);
      
      // Log significant deviation (more than 1% and at least $0.02)
      if (deviation > Math.max(this.finalPrice * 0.01, 0.02)) {
        console.warn(`PriceInfo: Provided finalPrice ${this.finalPrice} differs significantly from calculated value ${calculatedFinalPrice}`);
      }
    } else {
      // Calculate finalPrice if not provided
      this.finalPrice = this._roundPrice(this.basePrice * (1 - this.discount / 100));
    }
  }
  
  /**
   * Create from an existing object with validation
   * @param {Object} data - Raw price info data
   * @returns {BasicPriceInfo} - Validated instance
   */
  static fromObject(data = {}) {
    if (!data || typeof data !== 'object') {
      console.error('PriceInfo: Invalid data object provided to BasicPriceInfo.fromObject', data);
      return new BasicPriceInfo();
    }
    
    return new BasicPriceInfo(
      data.basePrice,
      data.discount,
      data.finalPrice
    );
  }
  
  /**
   * Convert to plain object for API responses and storage
   * @returns {BasicPriceInfoObj} - Plain object representation
   */
  toObject() {
    return {
      basePrice: this.basePrice,
      discount: this.discount,
      finalPrice: this.finalPrice
    };
  }
  
  /**
   * Sanitize numeric values
   * @private
   */
  _sanitizeNumber(value, defaultValue = 0) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : defaultValue;
  }
  
  /**
   * Round to 2 decimal places
   * @private
   */
  _roundPrice(price) {
    return Math.round((price + Number.EPSILON) * 100) / 100;
  }
}

/**
 * Cart item price info with detailed breakdown of prices for item, variants, and addons.
 * Used for individual items in a cart to track all price components.
 * 
 * @example
 * // Create from component prices
 * const itemPrice = CartItemPriceInfo.fromComponents(
 *   { basePrice: 10.99, discount: 15 }, // menu item
 *   2.50,  // variant price
 *   1.00   // addon price
 * );
 * 
 * @example
 * // Validate existing price info
 * const validItemPrice = new CartItemPriceInfo(existingItemPriceInfo);
 */
class CartItemPriceInfo {
  /**
   * Create a new cart item price info object with validation
   * @param {CartItemPriceInfoObj} data - Price info data for a cart item
   */
  constructor(data = {}) {
    if (!data || typeof data !== 'object') {
      console.error('PriceInfo: Invalid data object provided to CartItemPriceInfo constructor', data);
      data = {};
    }
    
    // Handle legacy property names
    if (data.itemVariantBasePrice !== undefined && data.totalVariantBasePrice === undefined) {
      data.totalVariantBasePrice = data.itemVariantBasePrice;
    }
    
    if (data.itemAddonBasePrice !== undefined && data.totalAddonBasePrice === undefined) {
      data.totalAddonBasePrice = data.itemAddonBasePrice;
    }
    
    // Track the number of sanitized fields to avoid excessive logging
    let sanitizedFieldCount = 0;
    
    // Helper to sanitize and track changes
    const sanitizeField = (fieldName, value) => {
      const sanitized = this._sanitizeNumber(value);
      if (value !== sanitized && value !== undefined) {
        sanitizedFieldCount++;
      }
      return sanitized;
    };
    
    // Sanitize all fields
    this.itemBasePrice = sanitizeField('itemBasePrice', data.itemBasePrice);
    this.itemFinalPrice = sanitizeField('itemFinalPrice', data.itemFinalPrice);
    this.totalVariantBasePrice = sanitizeField('totalVariantBasePrice', data.totalVariantBasePrice);
    this.totalVariantFinalPrice = sanitizeField('totalVariantFinalPrice', data.totalVariantFinalPrice || data.totalVariantBasePrice);
    this.totalAddonBasePrice = sanitizeField('totalAddonBasePrice', data.totalAddonBasePrice);
    this.totalAddonFinalPrice = sanitizeField('totalAddonFinalPrice', data.totalAddonFinalPrice || data.totalAddonBasePrice);
    this.totalBasePrice = sanitizeField('totalBasePrice', data.totalBasePrice);
    this.finalPrice = sanitizeField('finalPrice', data.finalPrice);
    
    // Handle discount specially as it needs clamping
    const rawDiscount = data.discount;
    const sanitizedDiscount = this._sanitizeNumber(rawDiscount);
    this.discount = Math.max(0, Math.min(100, sanitizedDiscount));
    
    if (rawDiscount !== this.discount && rawDiscount !== undefined) {
      sanitizedFieldCount++;
    }
    
    this.discountAmount = sanitizeField('discountAmount', data.discountAmount);
    
    // If discountAmount is missing, calculate it
    if (data.discountAmount === undefined) {
      this.discountAmount = Math.max(0, this.totalBasePrice - this.finalPrice);
    }
    
    // Log if multiple fields were sanitized
    if (sanitizedFieldCount > 0) {
      console.warn(`PriceInfo: Fixed ${sanitizedFieldCount} invalid fields in CartItemPriceInfo`);
    }
    
    // Validate price consistency
    this._validatePriceConsistency();
  }
  
  /**
   * Create from component prices (item, variants, addons)
   * @param {Object} itemPrice - Menu item price info
   * @param {number} variantPrice - Total variant price
   * @param {number} addonPrice - Total addon price
   * @param {number} discount - Discount percentage
   * @returns {CartItemPriceInfo} - Validated instance
   */
  static fromComponents(itemPrice, variantPrice, addonPrice, discount = 0) {
    // Validate inputs
    if (!itemPrice || typeof itemPrice !== 'object') {
      console.error('PriceInfo: Invalid itemPrice in CartItemPriceInfo.fromComponents', itemPrice);
      itemPrice = {};
    }
    
    if (typeof variantPrice !== 'number' || isNaN(variantPrice)) {
      console.warn(`PriceInfo: Invalid variantPrice in CartItemPriceInfo.fromComponents: ${variantPrice}, using 0`);
      variantPrice = 0;
    }
    
    if (typeof addonPrice !== 'number' || isNaN(addonPrice)) {
      console.warn(`PriceInfo: Invalid addonPrice in CartItemPriceInfo.fromComponents: ${addonPrice}, using 0`);
      addonPrice = 0;
    }
    
    const itemPriceObj = BasicPriceInfo.fromObject(itemPrice).toObject();
    
    const totalBasePrice = itemPriceObj.basePrice + variantPrice + addonPrice;
    const finalPrice = itemPriceObj.finalPrice + variantPrice + addonPrice;
    const discountAmount = Math.max(0, totalBasePrice - finalPrice);
    
    return new CartItemPriceInfo({
      itemBasePrice: itemPriceObj.basePrice,
      itemFinalPrice: itemPriceObj.finalPrice,
      totalVariantBasePrice: variantPrice,
      totalVariantFinalPrice: variantPrice,
      totalAddonBasePrice: addonPrice,
      totalAddonFinalPrice: addonPrice,
      totalBasePrice: totalBasePrice,
      finalPrice: finalPrice,
      discount: discount,
      discountAmount: discountAmount
    });
  }
  
  /**
   * Validate internal price consistency
   * @private
   */
  _validatePriceConsistency() {
    // Check if totalBasePrice matches sum of components
    const expectedTotalBasePrice = this.itemBasePrice + this.totalVariantBasePrice + this.totalAddonBasePrice;
    if (Math.abs(this.totalBasePrice - expectedTotalBasePrice) > 0.02) {
      console.warn(`PriceInfo: Total base price inconsistency detected: ${this.totalBasePrice} vs expected ${expectedTotalBasePrice}`);
    }
    
    // Check if discount amount is consistent with base and final price
    const expectedDiscountAmount = Math.max(0, this.totalBasePrice - this.finalPrice);
    if (Math.abs(this.discountAmount - expectedDiscountAmount) > 0.02) {
      console.warn(`PriceInfo: Discount amount inconsistency detected: ${this.discountAmount} vs expected ${expectedDiscountAmount}`);
    }
  }
  
  /**
   * Convert to plain object for API responses and storage
   * @returns {CartItemPriceInfoObj} - Plain object representation
   */
  toObject() {
    return {
      itemBasePrice: this.itemBasePrice,
      itemFinalPrice: this.itemFinalPrice,
      totalVariantBasePrice: this.totalVariantBasePrice,
      totalVariantFinalPrice: this.totalVariantFinalPrice,
      totalAddonBasePrice: this.totalAddonBasePrice,
      totalAddonFinalPrice: this.totalAddonFinalPrice,
      totalBasePrice: this.totalBasePrice,
      finalPrice: this.finalPrice,
      discount: this.discount,
      discountAmount: this.discountAmount
    };
  }
  
  /**
   * Sanitize numeric values
   * @private
   */
  _sanitizeNumber(value, defaultValue = 0) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : defaultValue;
  }
}

/**
 * Cart total price info for the entire cart.
 * Aggregates prices from all cart items and calculates final totals.
 * 
 * @example
 * // Create empty cart price info
 * const emptyCartPrice = new CartTotalPriceInfo().toObject();
 * 
 * @example
 * // Calculate from cart items
 * const cartTotal = CartTotalPriceInfo.fromCartItems(cartItems);
 */
class CartTotalPriceInfo {
  /**
   * Create a new cart total price info object with validation
   * @param {CartTotalPriceInfoObj} data - Price info data for a cart
   */
  constructor(data = {}) {
    if (!data || typeof data !== 'object') {
      console.error('PriceInfo: Invalid data object provided to CartTotalPriceInfo constructor', data);
      data = {};
    }
    
    // Track sanitized fields
    let sanitizedFieldCount = 0;
    
    // Helper to sanitize and track changes
    const sanitizeField = (fieldName, value) => {
      const sanitized = this._sanitizeNumber(value);
      if (value !== sanitized && value !== undefined) {
        sanitizedFieldCount++;
      }
      return sanitized;
    };
    
    this.basePrice = sanitizeField('basePrice', data.basePrice);
    this.finalPrice = sanitizeField('finalPrice', data.finalPrice);
    this.totalVariantBasePrice = sanitizeField('totalVariantBasePrice', data.totalVariantBasePrice);
    this.totalAddonBasePrice = sanitizeField('totalAddonBasePrice', data.totalAddonBasePrice);
    this.totalDiscount = sanitizeField('totalDiscount', data.totalDiscount);
    this.totalDiscountAmount = sanitizeField('totalDiscountAmount', data.totalDiscountAmount);
    
    if (sanitizedFieldCount > 0) {
      console.warn(`PriceInfo: Fixed ${sanitizedFieldCount} invalid fields in CartTotalPriceInfo`);
    }
    
    // Validate total discount calculation
    const expectedDiscountAmount = Math.max(0, this.basePrice - this.finalPrice);
    if (Math.abs(this.totalDiscountAmount - expectedDiscountAmount) > 0.05) {
      console.warn(`PriceInfo: Cart discount amount inconsistency detected: ${this.totalDiscountAmount} vs expected ${expectedDiscountAmount}`);
      this.totalDiscountAmount = expectedDiscountAmount;
    }
    
    // Ensure finalPrice is non-negative
    if (this.finalPrice < 0) {
      console.warn(`PriceInfo: Negative final price corrected: ${this.finalPrice} → 0`);
      this.finalPrice = 0;
    }
  }
  
  /**
   * Calculate total price from cart items
   * @param {Array} cartItems - Array of cart items with price info
   * @returns {CartTotalPriceInfo} - Calculated cart total
   */
  static fromCartItems(cartItems = []) {
    if (!Array.isArray(cartItems)) {
      console.error('PriceInfo: Invalid cartItems array in CartTotalPriceInfo.fromCartItems', cartItems);
      return new CartTotalPriceInfo();
    }
    
    let basePrice = 0;
    let finalPrice = 0;
    let totalVariantBasePrice = 0;
    let totalAddonBasePrice = 0;
    
    let invalidItemCount = 0;
    
    for (const item of cartItems) {
      if (item.status === 'cancelled') continue;
      
      if (!item.priceInfo) {
        invalidItemCount++;
        continue;
      }
      
      basePrice += this._sanitizeNumber(item.priceInfo.totalBasePrice);
      finalPrice += this._sanitizeNumber(item.priceInfo.finalPrice);
      totalVariantBasePrice += this._sanitizeNumber(item.priceInfo.totalVariantBasePrice);
      totalAddonBasePrice += this._sanitizeNumber(item.priceInfo.totalAddonBasePrice);
    }
    
    if (invalidItemCount > 0) {
      console.warn(`PriceInfo: Skipped ${invalidItemCount} invalid items in cart total calculation`);
    }
    
    const totalDiscountAmount = Math.max(0, basePrice - finalPrice);
    const totalDiscount = basePrice > 0 ? (totalDiscountAmount / basePrice) * 100 : 0;
    
    return new CartTotalPriceInfo({
      basePrice,
      finalPrice,
      totalVariantBasePrice,
      totalAddonBasePrice,
      totalDiscount,
      totalDiscountAmount
    });
  }
  
  /**
   * Convert to plain object for API responses and storage
   * @returns {CartTotalPriceInfoObj} - Plain object representation
   */
  toObject() {
    return {
      basePrice: this.basePrice,
      finalPrice: this.finalPrice,
      totalVariantBasePrice: this.totalVariantBasePrice,
      totalAddonBasePrice: this.totalAddonBasePrice,
      totalDiscount: this.totalDiscount,
      totalDiscountAmount: this.totalDiscountAmount
    };
  }
  
  /**
   * Sanitize numeric values
   * @private
   */
  _sanitizeNumber(value, defaultValue = 0) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : defaultValue;
  }
}

/**
 * Order price info model for order records.
 * Simplified version of cart price info used for order totals.
 * 
 * @example
 * // Create order price info from cart total
 * const cartTotalPrice = new CartTotalPriceInfo(cartData.priceInfo);
 * const orderPrice = OrderPriceInfo.fromCartTotal(cartTotalPrice);
 */
class OrderPriceInfo {
  /**
   * Create a new order price info object with validation
   * @param {OrderPriceInfoObj} data - Price info data for an order
   */
  constructor(data = {}) {
    if (!data || typeof data !== 'object') {
      console.error('PriceInfo: Invalid data object provided to OrderPriceInfo constructor', data);
      data = {};
    }
    
    // Track sanitized fields
    let sanitizedFieldCount = 0;
    
    // Helper to sanitize and track changes
    const sanitizeField = (fieldName, value) => {
      const sanitized = this._sanitizeNumber(value);
      if (value !== sanitized && value !== undefined) {
        sanitizedFieldCount++;
      }
      return sanitized;
    };
    
    this.basePrice = sanitizeField('basePrice', data.basePrice);
    this.finalPrice = sanitizeField('finalPrice', data.finalPrice);
    this.totalDiscount = sanitizeField('totalDiscount', data.totalDiscount);
    this.totalDiscountAmount = sanitizeField('totalDiscountAmount', data.totalDiscountAmount);
    
    if (sanitizedFieldCount > 0) {
      console.warn(`PriceInfo: Fixed ${sanitizedFieldCount} invalid fields in OrderPriceInfo`);
    }
    
    // Validate and correct any inconsistencies
    this._validateAndCorrect();
  }
  
  /**
   * Validate and correct price relationships
   * @private
   */
  _validateAndCorrect() {
    // Ensure finalPrice is non-negative
    if (this.finalPrice < 0) {
      console.warn(`PriceInfo: Negative final price corrected: ${this.finalPrice} → 0`);
      this.finalPrice = 0;
    }
    
    // Check discount amount consistency
    const expectedDiscountAmount = Math.max(0, this.basePrice - this.finalPrice);
    if (Math.abs(this.totalDiscountAmount - expectedDiscountAmount) > 0.05) {
      console.warn(`PriceInfo: Order discount amount inconsistency detected: ${this.totalDiscountAmount} vs expected ${expectedDiscountAmount}`);
      this.totalDiscountAmount = expectedDiscountAmount;
    }
  }
  
  /**
   * Create order price info from cart total price info
   * @param {CartTotalPriceInfo} cartTotalPriceInfo - Cart total price info
   * @returns {OrderPriceInfo} - Order price info
   */
  static fromCartTotal(cartTotalPriceInfo) {
    if (!cartTotalPriceInfo || !(cartTotalPriceInfo instanceof CartTotalPriceInfo)) {
      console.error('PriceInfo: Invalid cartTotalPriceInfo in OrderPriceInfo.fromCartTotal', cartTotalPriceInfo);
      return new OrderPriceInfo();
    }
    
    return new OrderPriceInfo({
      basePrice: cartTotalPriceInfo.basePrice,
      finalPrice: cartTotalPriceInfo.finalPrice,
      totalDiscount: cartTotalPriceInfo.totalDiscount,
      totalDiscountAmount: cartTotalPriceInfo.totalDiscountAmount
    });
  }
  
  /**
   * Convert to plain object for API responses and storage
   * @returns {OrderPriceInfoObj} - Plain object representation
   */
  toObject() {
    return {
      basePrice: this.basePrice,
      finalPrice: this.finalPrice,
      totalDiscount: this.totalDiscount,
      totalDiscountAmount: this.totalDiscountAmount
    };
  }
  
  /**
   * Sanitize numeric values
   * @private
   */
  _sanitizeNumber(value, defaultValue = 0) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : defaultValue;
  }
}

module.exports = {
  BasicPriceInfo,
  CartItemPriceInfo,
  CartTotalPriceInfo,
  OrderPriceInfo
};
