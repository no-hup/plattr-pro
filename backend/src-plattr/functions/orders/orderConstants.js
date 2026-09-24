/**
 * Constants for order management
 */

// Order status enum.
// COMPLETED means "service finished" (set by the captain), NOT "paid". Payment is the separate
// PAYMENT_STATUS below, and since 2026-09-20 COMPLETED frees nothing: open money keeps the table.
// Two words for one visit confuses people (Shaurya, 2026-09-24). Simplify later: one lifecycle,
// or derive "done" from paid + served. Not now; nothing is broken.
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
  // Placed by the guest but not yet confirmed by a waiter. Only reachable when the
  // restaurant sets `ordering.requireWaiterConfirmation` (config/settings); otherwise a
  // checkout lands straight on PENDING and this value never appears.
  // A cart in this state is deliberately invisible to the kitchen.
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED'
};

// Status color hex mapping for UI
exports.STATUS_COLOR_HEX = {
  AWAITING_CONFIRMATION: '#607D8B', // Blue grey — a real state, deliberately not the
                                    // #9E9E9E an unrecognised status falls back to
  PENDING: '#FFC107',    // Yellow
  PREPARING: '#FFC107',  // Yellow
  READY: '#4CAF50',      // Green
  SERVED: '#4CAF50',     // Green
  CANCELLED: '#F44336',  // Red
  RETURNED: '#F44336'    // Red
};

// Lookback period for served carts query (in hours)
exports.SERVED_CARTS_LOOKBACK_HOURS = 6;
