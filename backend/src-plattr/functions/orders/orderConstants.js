/**
 * Constants for order management
 */

// Order status enum
exports.ORDER_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Payment status enum
exports.PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid'
};

// Fulfillment status enum used for both carts and cart items
exports.FULFILLMENT_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
};

// Status color hex mapping for UI
exports.STATUS_COLOR_HEX = {
  PENDING: '#FFC107',    // Yellow
  PREPARING: '#FFC107',  // Yellow
  READY: '#4CAF50',      // Green
  SERVED: '#4CAF50',     // Green
  CANCELLED: '#F44336',  // Red
  RETURNED: '#F44336'    // Red
};

// Lookback period for served carts query (in hours)
exports.SERVED_CARTS_LOOKBACK_HOURS = 6;
