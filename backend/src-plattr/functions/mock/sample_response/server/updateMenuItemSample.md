\# updateMenuItemSample.md

## Success Response
```json
{
  "success": true,
  "message": "Menu item availability updated successfully",
  "data": {
    "menuItemId": "item001",
    "isAvailable": false,
    "menuItem": {
      "id": "item001",
      "nutritionalInfo": {
        "carbs": 40,
        "protein": 35,
        "fat": 38,
        "calories": 650
      },
      "priceInfo": {
        "discount": 10,
        "finalPrice": 90,
        "basePrice": 100
      },
      "addons": [
        "addon_burger_fries",
        "addon_burger_potato_chips"
      ],
      "isCustomizable": true,
      "allergenTags": [
        "dairy",
        "gluten"
      ],
      "meta": {
        "image": "https://example.com/images/classic-cheeseburger.jpg",
        "name": "Classic Cheeseburger",
        "description": "Juicy beef patty with melted cheddar cheese",
        "categoryName": "Burgers"
      },
      "variants": [
        {
          "id": "variant_burger_size",
          "name": "Size"
        }
      ],
      "categoryId": "cat_1_food",
      "menuItemId": "item001",
      "lastUpdated": {
        "_seconds": 1746877334,
        "_nanoseconds": 0
      },
      "isInStock": false
    }
  }
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/menu-updateMenuItemAvailability \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "REST001",
    "menuItemId": "item001",
    "isAvailable": false
        "finalPrice": 5.99
      }
    }
  }'
```
