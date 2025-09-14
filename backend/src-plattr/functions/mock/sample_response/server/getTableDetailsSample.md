# getTableDetailsSample.md

## Success Response
```json
{
  "success": true,
  "message": "Table details fetched successfully.",
  "data": {
    "tableId": "<table_id>",
    "details": {}
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to fetch table details.",
  "errorCode": "TABLE_DETAILS_FETCH_ERROR"
}
```
