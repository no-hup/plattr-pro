const functions = require("firebase-functions");
const { ORDER_STATUS, PAYMENT_STATUS, CART_STATUS } = require('./orderConstants');
const { mapOrderStatus, mapCartStatus } = require('../utils/statusUtils');

/**
 * Order input validation utilities
 */
class OrderInputValidation {
  /**
   * Validates restaurant ID
   * @param {string} restaurantId - Restaurant ID to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateRestaurantId(restaurantId) {
    if (!restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "restaurantId is required and cannot be empty"
      );
    }
  }

  /**
   * Validates table ID
   * @param {string} tableId - Table ID to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateTableId(tableId) {
    if (!tableId || typeof tableId !== 'string' || tableId.trim() === '') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "tableId is required and cannot be empty"
      );
    }
  }

  /**
   * Validates order ID
   * @param {string} orderId - Order ID to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateOrderId(orderId) {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId is required"
      );
    }
  }

  /**
   * Validates cart data
   * @param {Object} cart - Cart data to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateCart(cart) {
    if (!cart || typeof cart !== 'object') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cart data is required"
      );
    }

    if (!cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cart must contain at least one item"
      );
    }
  }

  /**
   * Validates session ID if provided
   * @param {string} sessionId - Session ID to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateSessionId(sessionId) {
    if (sessionId !== null && sessionId !== undefined && typeof sessionId !== 'string') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "sessionId must be a string when provided"
      );
    }
  }

  /**
   * Validates cart status
   * @param {string} status - Status to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateCartStatus(status) {
    if (!status || typeof status !== 'string') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "status is required and must be a string"
      );
    }

    const allowedStatuses = Object.values(CART_STATUS);
    const normalizedStatus = mapCartStatus(status);
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `status must be one of: ${allowedStatuses.join(', ')}`
      );
    }
    return normalizedStatus;
  }

  /**
   * Validates cart index
   * @param {number} cartIndex - Cart index to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateCartIndex(cartIndex) {
    if (cartIndex === undefined || cartIndex === null || isNaN(cartIndex) || cartIndex < 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "cartIndex must be a non-negative integer"
      );
    }
  }

  /**
   * Validates request data exists
   * @param {Object} data - Request data to validate
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateRequestData(data) {
    if (!data) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Request data is missing"
      );
    }
  }

  /**
   * Validates all fields required for updating cart status
   * @param {Object} data - Input data object
   * @throws {functions.https.HttpsError} If required fields are missing or invalid
   */
  static validateUpdateCartStatusFields(data) {
    this.validateRequestData(data);
    
    const { restaurantId, orderId, cartIndex, newStatus, sessionId } = data;
    
    this.validateRestaurantId(restaurantId);
    this.validateOrderId(orderId);
    this.validateCartIndex(cartIndex);
    this.validateCartStatus(newStatus);
    
    // Optional sessionId validation
    if (sessionId !== undefined) {
      this.validateSessionId(sessionId);
    }
  }

  /**
   * Validates fields required for getting an order
   * @param {Object} data - Input data object
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateGetOrderFields(data) {
    this.validateRequestData(data);
    
    const { restaurantId, tableId, orderId, sessionId } = data;
    
    this.validateRestaurantId(restaurantId);
    
    // Check if we have either orderId or tableId
    if (!orderId && !tableId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Either orderId or tableId is required"
      );
    }
    
    // Validate orderId if provided
    if (orderId !== undefined) {
      this.validateOrderId(orderId);
    }
    
    // Validate tableId if provided
    if (tableId !== undefined) {
      this.validateTableId(tableId);
    }
    
    // Optional sessionId validation
    if (sessionId !== undefined) {
      this.validateSessionId(sessionId);
    }
  }

  /**
   * Validates fields required for creating or updating an order
   * @param {string} restaurantId - Restaurant ID
   * @param {string} tableId - Table ID
   * @param {Object} cart - Cart data
   * @throws {Error} If validation fails
   */
  static validateCreateOrUpdateOrderFields(restaurantId, tableId, cart) {
    if (!restaurantId || !tableId) {
      throw new Error('Restaurant ID and table ID are required');
    }
    
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cannot process an empty cart');
    }
  }

  /**
   * Validates fields required for updating a menu item's status
   * @param {Object} data - Input data object
   * @throws {functions.https.HttpsError} If validation fails
   */
  static validateUpdateMenuItemStatusFields(data) {
    this.validateRequestData(data);
    
    const { restaurantId, orderId, menuItemId, newStatus } = data;
    
    this.validateRestaurantId(restaurantId);
    this.validateOrderId(orderId);
    
    if (!menuItemId || typeof menuItemId !== 'string' || menuItemId.trim() === '') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "menuItemId is required and cannot be empty"
      );
    }
    
    if (!newStatus || typeof newStatus !== 'string') {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "newStatus is required and must be a string"
      );
    }
    
    const validStatuses = [
      CART_STATUS.PENDING,
      CART_STATUS.ACCEPTED,
      CART_STATUS.PREPARING,
      CART_STATUS.READY,
      CART_STATUS.SERVED,
      CART_STATUS.RETURNED,
      CART_STATUS.CANCELLED
    ];
    
    const normalizedStatus = mapCartStatus(newStatus);
    if (!validStatuses.includes(normalizedStatus)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Status must be one of: ${validStatuses.join(', ')}`
      );
    }
    return normalizedStatus;
  }

  /**
   * Validates fields for updating order status
   * @param {Object} data - { restaurantId, orderId, orderStatus, sessionId }
   */
  static validateUpdateOrderStatusFields(data) {
    this.validateRequestData(data);
    const { restaurantId, orderId, orderStatus, sessionId } = data;
    this.validateRestaurantId(restaurantId);
    this.validateOrderId(orderId);
    if (!orderStatus || typeof orderStatus !== 'string') {
      throw new functions.https.HttpsError('invalid-argument','orderStatus is required and must be a string');
    }
    const allowed = Object.values(ORDER_STATUS);
    const normalizedOrderStatus = mapOrderStatus(orderStatus);
    if (!allowed.includes(normalizedOrderStatus)) {
      throw new functions.https.HttpsError('invalid-argument',`orderStatus must be one of: ${allowed.join(', ')}`);
    }
    if (!sessionId || typeof sessionId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument','sessionId is required and must be a string');
    }
  }
}

module.exports = OrderInputValidation; 