# getRestaurantMenuSample.md

## Success Response
```json
{
  "success": true,
  "message": "Menu fetched successfully.",
  "data": {
    "restaurantId": "<restaurant_id>",
    "menu": [
      // ...menu items...
    ]
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to fetch menu for the restaurant.",
  "errorCode": "MENU_FETCH_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/menu-getRestaurantMenu-getRestaurantMenu \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "REST001"}'
```
