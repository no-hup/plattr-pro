# unassignTableFromServerSample.md

## Success Response
```json
{
  "success": true,
  "message": "Table unassigned from server successfully.",
  "data": {
    "tableId": "<table_id>"
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Table is not currently assigned to any server or invalid table ID.",
  "errorCode": "TABLE_UNASSIGNMENT_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/unassignTableFromServer \
  -H "Content-Type: application/json" \
  -d '{"tableId": "TBL001"}'
```
