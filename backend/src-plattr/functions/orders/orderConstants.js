/**
 * Constants for order management
 */

// Order status enum
exports.ORDER_STATUS = {
  ACTIVE: 'active',      // Order is in progress, table is occupied
  COMPLETED: 'completed', // Order is finished and paid
  CANCELLED: 'cancelled'  // Order was cancelled
};

// Payment status enum
exports.PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid'
};

// Cart status enum
exports.CART_STATUS = {
  PENDING: 'pending',      // Initial state when order is placed
  ACCEPTED: 'accepted',    // Kitchen has seen and accepted the order
  READY: 'ready',          // Items are ready for serving
  COMPLETED: 'completed',   // Items have been completed/served to the customer
  CANCELLED: 'cancelled',  // Items were cancelled
}; 

// Cart item status enum
exports.CART_ITEM_STATUS = {
  PENDING: 'pending',      // Initial state when order is placed
  READY: 'ready',          // Items are ready for serving
  COMPLETED: 'completed',   // Items have been completed/served to the customer
  CANCELLED: 'cancelled',  // Items were cancelled
};

