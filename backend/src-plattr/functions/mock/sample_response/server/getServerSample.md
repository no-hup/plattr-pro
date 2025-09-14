# getServerSample.md

## Success Response
```json
{
  "success": true,
  "message": "Server fetched successfully.",
  "data": {
    "serverId": "<server_id>",
    "name": "<server_name>"
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to fetch server.",
  "errorCode": "SERVER_FETCH_ERROR"
}
```
