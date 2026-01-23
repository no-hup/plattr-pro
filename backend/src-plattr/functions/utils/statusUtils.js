const { ORDER_STATUS, FULFILLMENT_STATUS } = require('../orders/orderConstants');

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
    case FULFILLMENT_STATUS.PENDING:
    case 'ORDERED':
      return FULFILLMENT_STATUS.PENDING;

    case FULFILLMENT_STATUS.PREPARING:
    case 'COOKING':
      return FULFILLMENT_STATUS.PREPARING;

    case FULFILLMENT_STATUS.READY:
    case 'READY_FOR_PICKUP':
      return FULFILLMENT_STATUS.READY;

    case FULFILLMENT_STATUS.SERVED:
    case 'COMPLETED':
    case 'SERVED_TO_CUSTOMER':
      return FULFILLMENT_STATUS.SERVED;

    case FULFILLMENT_STATUS.RETURNED:
      return FULFILLMENT_STATUS.RETURNED;

    case FULFILLMENT_STATUS.CANCELLED:
    case 'CANCELED':
      return FULFILLMENT_STATUS.CANCELLED;

    default:
      return normalized || '';
  }
}

module.exports = {
  normalizeStatusString,
  mapOrderStatus,
  mapCartStatus,
};
