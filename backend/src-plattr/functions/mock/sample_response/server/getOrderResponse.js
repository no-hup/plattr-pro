/**
 * Sample Response: getOrder Function
 *
 * This file shows the expected response format from the getOrder cloud function.
 *
 * Input:
 *   - restaurantId (string, required)
 *   - orderId (string, required)
 *
 * Success Response Example:
 */
const successResponse = {
  status: "success",
  message: "Order retrieved successfully",
  data: {
    id: "order001",
    orderNumber: "",
    orderStatus: "pending",
    createdAt: "2023-03-15T17:27:14.000Z",
    updatedAt: "2023-03-15T17:27:14.000Z",
    tableId: "table001",
    restaurantId: "rest001",
    sessionId: "session001",
    total: 126,
    items: [
      {
        menuItemId: "item001",
        name: "Classic Cheeseburger",
        quantity: 1,
        price: 126,
        variants: [
          {
            id: "variant_burger_size",
            isMandatory: true,
            respectParentDiscount: true,
            selected_variant_id: "burger_size_large",
            selected_variant_name: "Large",
            priceInfo: {
              basePrice: 20,
              finalPrice: 18,
              discount: 10
            }
          }
        ],
        addons: [
          {
            id: "addon_burger_fries",
            name: "French Fries",
            priceInfo: {
              basePrice: 20,
              finalPrice: 18,
              discount: 10
            },
            respectParentDiscount: true
          }
        ]
      }
    ],
    notes: "",
    carts: [
      {
        status: "pending",
        statusHistory: [
          {
            status: "pending",
            timestamp: "2023-03-15T17:27:14.000Z",
            userId: "system"
          }
        ],
        checkoutTime: "2023-03-15T17:27:14.000Z",
        notes: "",
        estimatedPrepTime: 12,
        assignedTo: null,
        items: [
          {
            menuItemId: "item001",
            menuItem: {
              meta: {
                name: "Classic Cheeseburger",
                description: "Juicy beef patty with melted cheddar cheese",
                image: "https://example.com/images/classic-cheeseburger.jpg",
                categoryName: "Burgers"
              }
            },
            selectedVariantsDetails: [
              {
                id: "variant_burger_size",
                isMandatory: true,
                respectParentDiscount: true,
                selected_variant_id: "burger_size_large",
                selected_variant_name: "Large",
                priceInfo: {
                  basePrice: 20,
                  finalPrice: 18,
                  discount: 10
                }
              }
            ],
            selectedAddonsDetails: [
              {
                id: "addon_burger_fries",
                name: "French Fries",
                priceInfo: {
                  basePrice: 20,
                  finalPrice: 18,
                  discount: 10
                },
                respectParentDiscount: true
              }
            ],
            priceInfo: {
              itemBasePrice: 100,
              itemVariantBasePrice: 20,
              itemAddonBasePrice: 20,
              itemFinalPrice: 126,
              discount: 10,
              totalBasePrice: 140,
              totalVariantBasePrice: 20,
              totalAddonBasePrice: 20,
              finalPrice: 126
            },
            quantity: 1,
            status: "pending",
            statusUpdatedAt: { _seconds: 1678901234, _nanoseconds: 0 },
            statusUpdatedBy: "system",
            cartItemId: 1
          }
        ],
        priceInfo: {
          basePrice: 140,
          finalPrice: 126,
          totalDiscount: 10,
          totalDiscountAmount: 14,
          totalVariantBasePrice: 20,
          totalAddonBasePrice: 20
        }
      }
    ]
  }
};

/**
 * Sample Error Responses
 */
const errorResponses = {
  missingOrderId: {
    status: "error",
    message: "orderId is required",
    data: null
  },
  orderNotFound: {
    status: "error",
    message: "Order not found",
    data: null
  },
  invalidSession: {
    status: "error",
    message: "Invalid or inactive session",
    data: null
  },
  unauthenticated: {
    status: "error",
    message: "User must be authenticated to get order details",
    data: null
  }
};

module.exports = { successResponse, errorResponses };
