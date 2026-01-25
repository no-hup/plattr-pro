const environment = require('../singleton/Environment');
environment.configureEnvironment(false);
const { admin, db, FieldValue, Timestamp } = require('../admin/admin');
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } = require('../orders/orderConstants');

async function populateOrder() {
  const restaurantId = 'rest_full_hierarchy';
  const tableId = 'table001';
  const serverId = 'server001';

  console.log(`Populating order for ${restaurantId}, ${tableId}`);

  const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc('test_order_001');
  
  const orderData = {
    restaurantId,
    tableId,
    orderNumber: 'ORD-TEST-001',
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    assignedServer: serverId,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    priceInfo: {
      basePrice: 200,
      finalPrice: 180,
      totalDiscount: 10,
      totalDiscountAmount: 20
    },
    carts: [
      {
        cartId: 'cart_001',
        status: FULFILLMENT_STATUS.PENDING,
        items: [
          {
            menuItemId: 'item_classic_burger',
            name: 'Classic Cheeseburger',
            quantity: 1,
            status: FULFILLMENT_STATUS.PENDING,
            priceInfo: {
              itemBasePrice: 140,
              itemFinalPrice: 126,
              discount: 10
            }
          }
        ]
      }
    ],
    items: [
      {
        menuItemId: 'item_classic_burger',
        name: 'Classic Cheeseburger',
        quantity: 1,
        status: FULFILLMENT_STATUS.PENDING,
        priceInfo: {
          itemBasePrice: 140,
          itemFinalPrice: 126,
          discount: 10
        }
      }
    ]
  };

  await orderRef.set(orderData);
  console.log('Order created successfully');
}

populateOrder().catch(console.error);
