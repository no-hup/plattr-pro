# Network Layer – Quick Guide

## API Service/Repository Pattern
- Place feature-specific API services in `lib/src/services/api/` (e.g., `table_api_service.dart`).
- Each service uses: `final Dio _dio = DioClient().dio;`

### Backend Response Structure (IMPORTANT)
All backend API responses are wrapped in a `result` object with the following structure:
```json
{
  "result": {
    "success": true,
    "message": "...",
    "data": ... // main payload (list or object)
  }
}
```
- `success` (bool): Indicates if the operation succeeded.
- `message` (string): Human-readable message.
- `data` (object or list): The actual response payload.

### Parsing Pattern
- Always use `ResponseParser.parse` for all API responses.
- The parser will extract the relevant envelope (with or without a `result` wrapper) and pass `envelope['data']` to your model's `fromJson` by default.
- For custom/wrapped cases (e.g., lists), pass a `dataExtractor` argument to adapt the structure as needed.

#### Example (default):
```dart
final response = await _dio.post(ApiConstants.getOrder, data: {...});
return ResponseParser.parse<OrderDetailResponse>(
  response,
  (jsonData) => OrderDetailResponse.fromJson(jsonData as Map<String, dynamic>),
);
```

#### Example (custom extractor for lists):
```dart
final response = await _dio.post(ApiConstants.getActiveOrdersForRestaurant, data: {...});
return ResponseParser.parse<OrderListResponse>(
  response,
  (jsonData) => OrderListResponse.fromJson(jsonData as Map<String, dynamic>),
  dataExtractor: (envelope) => {'orders': envelope['data']},
);
```
- For any new or edge case, use a custom extractor to shape the data for your model as needed.

- On DioException:
    ```dart
    final (code, msg) = DioClient.handleDioError(e, context: 'getTables');
    return ApiResponse<List<TableModel>>.error(msg, errorCode: code);
    ```
- On other errors (e.g., parsing):
    ```dart
    return ApiResponse<List<TableModel>>.error(e.toString(), errorCode: 'parsing_error');
    ```

## Model Structure
- All models: `lib/src/models/`, `@JsonSerializable(createToJson: true)`, `part 'model_name.g.dart';`
- Required fields: `@JsonKey(required: true, disallowNullValue: true)`
- Optional fields: `@JsonKey(defaultValue: ...)`
- Always provide `fromJson` and `toJson`

## Build Runner Reminder
After creating or updating models, run:
```sh
flutter pub run build_runner build --delete-conflicting-outputs
```

---
- Never attach tokens manually—let interceptors handle it.
- Always use `ResponseParser` and `JsonMapper` for parsing.
- Only use the provided parsing & storage utilities.
