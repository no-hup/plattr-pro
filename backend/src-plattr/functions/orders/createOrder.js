const { createOrUpdateOrder } = require('./createOrUpdateOrder');

// Update the export to maintain full parameter signature
module.exports = {
  createOrder: (restaurantId, tableId, cart, userId = 'system', notes = '', sessionId = null) => 
    createOrUpdateOrder(restaurantId, tableId, cart, userId, notes, sessionId)
}; 