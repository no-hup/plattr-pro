/**
 * menuValidation.js - Central validation module for menu package
 * 
 * This module provides validation functions for all menu-related cloud functions,
 * centralizing input validation to maintain consistency and reduce code duplication.
 */

const functions = require('firebase-functions');

class MenuValidation {
  /**
   * Validates required fields exist in the provided data
   * @param {Object} data - The data object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @throws {functions.https.HttpsError} - If any required field is missing
   */
  static validateRequiredFields(data, requiredFields) {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new functions.https.HttpsError(
          'invalid-argument', 
          `${field} is required`
        );
      }
    }
  }

  /**
   * Validates user authentication
   * @param {Object} context - The Firebase functions context
   * @throws {functions.https.HttpsError} - If user is not authenticated
   */
  static validateAuthentication(context) {
    const userId = context.auth?.uid;
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'User must be authenticated'
      );
    }
    return userId;
  }

  /**
   * Validates restaurant ID
   * @param {string} restaurantId - The restaurant ID to validate
   * @throws {functions.https.HttpsError} - If restaurant ID is missing
   */
  static validateRestaurantId(restaurantId) {
    if (!restaurantId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Restaurant ID is required'
      );
    }
  }

  /**
   * Validates item ID
   * @param {string} itemId - The item ID to validate
   * @throws {functions.https.HttpsError} - If item ID is missing
   */
  static validateItemId(itemId) {
    if (!itemId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Item ID is required'
      );
    }
  }

  /**
   * Validates category ID
   * @param {string} categoryId - The category ID to validate
   * @throws {functions.https.HttpsError} - If category ID is missing
   */
  static validateCategoryId(categoryId) {
    if (!categoryId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Category ID is required'
      );
    }
  }

  /**
   * Validates variant ID
   * @param {string} variantId - The variant ID to validate
   * @throws {functions.https.HttpsError} - If variant ID is missing
   */
  static validateVariantId(variantId) {
    if (!variantId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Variant ID is required'
      );
    }
  }

  /**
   * Validates menu add input
   * @param {Object} data - The data object to validate
   * @returns {Object} - The validated data with defaults applied
   */
  static validateMenuAddInput(data) {
    this.validateItemId(data.itemId);
    return {
      itemId: data.itemId,
      selectedVariants: data.selectedVariants || [],
      selectedAddOns: data.selectedAddOns || [],
      quantity: data.quantity || 1
    };
  }

  /**
   * Validates menu remove input
   * @param {Object} data - The data object to validate
   * @returns {Object} - The validated data with defaults applied
   */
  static validateMenuRemoveInput(data) {
    this.validateItemId(data.itemId);
    return {
      itemId: data.itemId,
      selectedVariants: data.selectedVariants || [],
      selectedAddOns: data.selectedAddOns || []
    };
  }

  /**
   * Validates menu fetch input
   * @param {Object} data - The data object to validate
   * @returns {Object} - The validated data with defaults applied
   */
  static validateMenuFetchInput(data) {
    // Safely log only the data property to avoid circular references
    const safeDataToLog = data && typeof data === 'object' ? (data.data || 'No data property found') : data;
    console.log("poopoo validateMenuFetchInput received:", JSON.stringify(safeDataToLog));
    
    if (!data || !data.data) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Invalid request data'
      );
    }
    
    const { restaurantId, inStock = true } = data.data;
    console.log("poopoo extracted restaurantId:", restaurantId, "inStock:", inStock);
    this.validateRestaurantId(restaurantId);
    
    return { restaurantId, inStock };
  }

  /**
   * Validates menu item creation input
   * @param {Object} menuItemData - The menu item data to validate
   * @throws {functions.https.HttpsError} - If required fields are missing
   */
  static validateCreateMenuItemInput(menuItemData) {
    const requiredFields = ['meta', 'categoryId', 'priceInfo'];
    this.validateRequiredFields(menuItemData, requiredFields);
    
    // Validate meta fields
    if (menuItemData.meta) {
      const requiredMetaFields = ['name'];
      this.validateRequiredFields(menuItemData.meta, requiredMetaFields);
    }
    
    // Validate price info
    if (menuItemData.priceInfo) {
      const requiredPriceFields = ['basePrice'];
      this.validateRequiredFields(menuItemData.priceInfo, requiredPriceFields);
    }
  }

  /**
   * Validates menu item update input
   * @param {Object} updateData - The menu item update data to validate
   * @throws {functions.https.HttpsError} - If the update data is invalid
   */
  static validateUpdateMenuItemInput(updateData) {
    // For updates, we don't require specific fields, but if they exist, they should be valid
    if (updateData.meta && !updateData.meta.name) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Menu item name is required if meta is provided'
      );
    }
    
    if (updateData.priceInfo && typeof updateData.priceInfo.basePrice !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Base price must be a number if priceInfo is provided'
      );
    }
  }

  /**
   * Validates category creation input
   * @param {Object} categoryData - The category data to validate
   * @throws {functions.https.HttpsError} - If required fields are missing
   */
  static validateCreateCategoryInput(categoryData) {
    const requiredFields = ['name', 'order'];
    this.validateRequiredFields(categoryData, requiredFields);
    
    if (typeof categoryData.order !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Order must be a number'
      );
    }
  }

  /**
   * Validates category update input
   * @param {Object} updateData - The category update data to validate
   * @throws {functions.https.HttpsError} - If the update data is invalid
   */
  static validateUpdateCategoryInput(updateData) {
    if (updateData.order !== undefined && typeof updateData.order !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Order must be a number if provided'
      );
    }
  }

  /**
   * Validates variant creation input
   * @param {Object} variantData - The variant data to validate
   * @throws {functions.https.HttpsError} - If required fields are missing
   */
  static validateCreateVariantInput(variantData) {
    const requiredFields = ['meta', 'priceInfo'];
    this.validateRequiredFields(variantData, requiredFields);
    
    // Validate meta fields
    if (variantData.meta) {
      const requiredMetaFields = ['name'];
      this.validateRequiredFields(variantData.meta, requiredMetaFields);
    }
    
    // Validate price info
    if (variantData.priceInfo) {
      const requiredPriceFields = ['basePrice'];
      this.validateRequiredFields(variantData.priceInfo, requiredPriceFields);
    }
  }

  /**
   * Validates variant update input
   * @param {Object} updateData - The variant update data to validate
   * @throws {functions.https.HttpsError} - If the update data is invalid
   */
  static validateUpdateVariantInput(updateData) {
    // For updates, we don't require specific fields, but if they exist, they should be valid
    if (updateData.meta && !updateData.meta.name) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Variant name is required if meta is provided'
      );
    }
    
    if (updateData.priceInfo && typeof updateData.priceInfo.basePrice !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Base price must be a number if priceInfo is provided'
      );
    }
  }
}

module.exports = MenuValidation;