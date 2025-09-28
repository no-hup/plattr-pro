const { ORDER_STATUS, CART_STATUS } = require('../orders/orderConstants');

function normalizeStatusString(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase();
}

function mapOrderStatus(value) {
  const normalized = normalizeStatusString(value);

  switch (normalized) {
    case ORDER_STATUS.PENDING:
    case 'PLACED':
      return ORDER_STATUS.PENDING;

    case ORDER_STATUS.IN_PROGRESS:
    case 'ACTIVE':
    case 'PROCESSING':
    case 'CONFIRMED':
    case 'PREPARING':
    case 'READY':
      return ORDER_STATUS.IN_PROGRESS;

    case ORDER_STATUS.COMPLETED:
    case 'COMPLETE':
      return ORDER_STATUS.COMPLETED;

    case ORDER_STATUS.CANCELLED:
    case 'CANCELED':
      return ORDER_STATUS.CANCELLED;

    default:
      return normalized || '';
  }
}

function mapCartStatus(value) {
  const normalized = normalizeStatusString(value);

  switch (normalized) {
    case CART_STATUS.PENDING:
    case 'ORDERED':
      return CART_STATUS.PENDING;

    case CART_STATUS.ACCEPTED:
    case 'ACCEPT':
    case 'ACKNOWLEDGED':
      return CART_STATUS.ACCEPTED;

    case CART_STATUS.PREPARING:
    case 'COOKING':
      return CART_STATUS.PREPARING;

    case CART_STATUS.READY:
    case 'READY_FOR_PICKUP':
      return CART_STATUS.READY;

    case CART_STATUS.SERVED:
    case 'COMPLETED':
    case 'SERVED_TO_CUSTOMER':
      return CART_STATUS.SERVED;

    case CART_STATUS.RETURNED:
      return CART_STATUS.RETURNED;

    case CART_STATUS.CANCELLED:
    case 'CANCELED':
      return CART_STATUS.CANCELLED;

    default:
      return normalized || '';
  }
}

module.exports = {
  normalizeStatusString,
  mapOrderStatus,
  mapCartStatus,
};

