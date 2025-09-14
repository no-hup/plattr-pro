# addMenuItemSample.md

## Success Response
```json
{
  "success": true,
  "message": "Menu item added successfully",
  "data": {
    "menuItemId": "<menu_item_id>",
    "menuItem": {
      "id": "<menu_item_id>",
      "categoryId": "<category_id>",
      "meta": {
        "name": "Garlic Bread",
        "description": "Oven baked bread with garlic butter",
        "image": "https://example.com/images/garlic-bread.jpg"
      },
      "priceInfo": {
        "basePrice": 4.99,
        "discount": 0,
        "finalPrice": 4.99
      },
      "isInStock": true,
      "isCustomizable": false,
      "lastUpdated": "<timestamp>"
    }
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to add menu item",
  "errorCode": "MENU_ITEM_ADD_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/menu-addMenuItem-addMenuItem \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "REST001",
    "menuItemData": {
      "categoryId": "CAT001",
      "meta": {
        "name": "Garlic Bread",
        "description": "Oven baked bread with garlic butter",
        "image": "https://example.com/images/garlic-bread.jpg"
      },
      "priceInfo": {
        "basePrice": 4.99,
        "discount": 0,
        "finalPrice": 4.99
      }
    }
  }'
```
