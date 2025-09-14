/**
 * Sample Response: getActiveOrdersForRestaurant Function
 *
 * NOTE: In the response, each order's carts array excludes carts with status 'served'.

 *
 * This file shows the expected response format from the getActiveOrdersForRestaurant cloud function.
 *
 * Input:
 *   - restaurantId (string, required)
 *   - sessionId (string, required)
 *   - serverId (string, optional): If provided, orders assigned to this server are sorted to the top.
 *
 * Response Filtering & Sorting Logic:
 *   - Orders assigned to the given serverId (if provided) appear first.
 *   - Remaining orders are sorted by updatedAt (most recent first).
 *   - Each order includes only: orderId, tableId, status, and a filtered carts array (carts with status 'served' are excluded).
 *
 * /**
 * Sorting Logic:
 * - If serverId is provided:
 *     1. Orders assigned to that serverId appear first.
 *     2. All orders are sorted by updatedAt (most recent first) within their group.
 * - If serverId is not provided:
 *     1. All orders are sorted by updatedAt (most recent first).
 * - Carts within orders are not sorted; only non-served carts are included.
 * carts with statys pending are excluded from the response
 * each cart will have a list of items(all items are sent by BE, even the served ones)

 * You can use this to understand the data structure returned by the function.
 */

// Sample success response (with orders)
const successResponse = {
    "orders": [
        {
            "orderId": "order001",
            "tableId": "table001",
            "status": "active",
            "carts": [
                {
                    "cartId": "cart001",
                    "status": "preparing",
                    "items": [
                        {
                            "itemId": "item001",
                            "name": "Paneer Tikka",
                            "quantity": 2,
                            "status": "preparing"
                        },
                        {
                            "itemId": "item002",
                            "name": "Butter Naan",
                            "quantity": 4,
                            "status": "ready"
                        }
                    ]
                },
                {
                    "cartId": "cart002",
                    "status": "ready",
                    "items": [
                        {
                            "itemId": "item003",
                            "name": "Dal Makhani",
                            "quantity": 1,
                            "status": "ready"
                        }
                    ]
                }
            ]
        },
        {
            "orderId": "order002",
            "tableId": "table002",
            "status": "active",
            "carts": [
                {
                    "cartId": "cart003",
                    "status": "preparing",
                    "items": [
                        {
                            "itemId": "item004",
                            "name": "Chicken Curry",
                            "quantity": 1,
                            "status": "preparing"
                        }
                    ]
                }
            ]
        }
    ]
};

// Sample error response (restaurant not found)
const notFoundResponse = {
    "code": "not-found",
    "message": "Restaurant not found"
};

// Sample success response (no active orders)
const emptyOrdersResponse = {
    "orders": []
};

// Note: If there are no matching active orders in Firestore (or the emulator DB), the response will contain an empty array as shown above. The mockData.json file does NOT automatically populate the emulator database; you must import/mock data into Firestore for the function to return real orders.

// Sample error response (missing restaurant ID)
const invalidArgumentResponse = {
    "code": "invalid-argument",
    "message": "Restaurant ID is required"
};
