# getTablesForRestaurantSample.md

## Success Response
```json
{
  "success": true,
  "message": "Tables fetched successfully.",
  "data": {
    "restaurantId": "<restaurant_id>",
    "tables": []
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to fetch tables for restaurant.",
  "errorCode": "TABLES_FOR_RESTAURANT_FETCH_ERROR"
}
```
