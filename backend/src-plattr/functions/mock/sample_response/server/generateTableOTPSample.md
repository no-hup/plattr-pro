# generateTableOTPSample.md

## Success Response
```json
{
  "success": true,
  "message": "OTP generated successfully.",
  "data": {
    "tableId": "<table_id>",
    "otp": "<otp>"
  }
}
```

## Error Response
```json
{
  "success": false,
  "message": "Failed to generate OTP for the table.",
  "errorCode": "OTP_GENERATION_ERROR"
}
```

## CURL Example
```sh
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/generateTableOTP \
  -H "Content-Type: application/json" \
  -d '{"tableId": "TBL001"}'
```
