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

// Cart status enum
exports.CART_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
}; 

// Cart item status enum
exports.CART_ITEM_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
};

