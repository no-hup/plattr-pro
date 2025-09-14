# updateTableStatusSample.md

## Success Response
```json
{
  "success": true,
  "message": "Table status updated successfully.",
  "data": {
    "tableId": "<table_id>",
    "status": "<new_status>"
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to update table status or invalid status provided.",
  "errorCode": "TABLE_STATUS_UPDATE_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/updateTableStatus \
  -H "Content-Type: application/json" \
  -d '{"tableId": "TBL001", "status": "vacant"}'
```
