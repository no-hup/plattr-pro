# deleteMenuItemSample.md

## Success Response
```json
{
  "success": true,
  "message": "Menu item deleted successfully",
  "data": {
    "menuItemId": "<menu_item_id>"
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to delete menu item",
  "errorCode": "MENU_ITEM_DELETE_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/menu-deleteMenuItem-deleteMenuItem \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "REST001",
    "menuItemId": "ITEM001"
  }'
```
