# Guide to Common JSON Parsing Issues and Fixes

This document outlines common problems encountered when parsing JSON responses from backend APIs in our Flutter application, along with their typical solutions.

## Table of Contents

1.  [Mismatched Key Names](#mismatched-key-names)
2.  [Incorrect Data Types](#incorrect-data-types)
3.  [Nullability Issues](#nullability-issues)
4.  [List Parsing Problems](#list-parsing-problems)
5.  [Enum Parsing](#enum-parsing)
6.  [Date/Time Parsing](#datetime-parsing)
7.  [Issues with `build_runner`](#issues-with-build_runner)
8.  [Custom `fromJson` / `toJson` Logic Errors](#custom-fromjson--tojson-logic-errors)
9.  [Nested Object Parsing](#nested-object-parsing)
10. [API Response Structure Changes](#api-response-structure-changes)
11. [Error Response Handling](#error-response-handling)

---

## 1. Mismatched Key Names

*   **Problem:** The JSON key from the API (e.g., `user_id`, `product_title`) does not match the Dart model's field name (e.g., `userId`, `productTitle`).
*   **Symptom:** Fields are `null` after parsing, or `_$_$ModelNameFromJson` throws an error related to a missing field if it's non-nullable.
*   **Fix:** Use the `@JsonKey(name: 'api_key_name')` annotation above the Dart field.
    ```dart
    // Example
    @JsonKey(name: 'user_id')
    final String userId;
    ```

---

## 2. Incorrect Data Types

*   **Problem:** The API sends a value with a data type different from what the Dart model expects (e.g., API sends `"123"` as String, Dart expects `int 123`).
*   **Symptom:** `TypeError` during parsing (e.g., `_String cannot be cast to _Integer`).
*   **Fixes:**
    *   **Ensure API consistency:** Ideally, the API should send consistent data types.
    *   **Custom Converters:** Use `@JsonKey` with `fromJson` and `toJson` static functions for robust type conversion.
        ```dart
        // Example for String to int
        static int _stringToInt(String value) => int.parse(value);
        static String _intToString(int value) => value.toString();

        @JsonKey(fromJson: _stringToInt, toJson: _intToString)
        final int quantity;
        ```
    *   For simple cases like `dynamic` that could be `int` or `double` but you always want `double`:
        ```dart
        @JsonKey(fromJson: _dynamicToDouble)
        final double amount;

        static double _dynamicToDouble(dynamic val) {
          if (val is int) return val.toDouble();
          if (val is String) return double.tryParse(val) ?? 0.0;
          return val as double? ?? 0.0;
        }
        ```

---

## 3. Nullability Issues

*   **Problem 1:** A field is non-nullable in Dart (`String name;`) but the API might omit it or send `null`.
    *   **Symptom:** `MissingRequiredKeysException` or similar error during parsing if the key is absent, or `NullThrownError` if `null` is assigned to a non-nullable type.
    *   **Fix:** Make the Dart field nullable (`String? name;`) and handle the `null` case in your application logic. Provide a default value using `@JsonKey(defaultValue: ...)` if appropriate.
        ```dart
        @JsonKey(defaultValue: 'N/A')
        final String? description;
        ```
*   **Problem 2:** A field is nullable in Dart (`String? name;`) but the code using it doesn't account for the `null` possibility.
    *   **Symptom:** `NullPointerException` (or `NoSuchMethodError` on `null`) at runtime when accessing the field.
    *   **Fix:** Use null-aware operators (`?.`, `??`, `!`) appropriately or perform explicit null checks before using the field.

---

## 4. List Parsing Problems

*   **Problem:** Incorrectly parsing a list of objects, or the API returns a single object/null when a list is expected.
*   **Symptom:** `TypeError` (e.g., `_JsonMap cannot be cast to List<dynamic>`), or list is empty/`null` unexpectedly.
*   **Fix:**
    *   Ensure the Dart field is `List<YourModel> items;`.
    *   Ensure `YourModel` has a `factory YourModel.fromJson(Map<String, dynamic> json)` constructor.
    *   `json_serializable` handles list parsing automatically if the item type is correctly annotated.
    *   If the API might send `null` for a list, make the list nullable: `List<YourModel>? items;` and consider `@JsonKey(defaultValue: [])`.

---

## 5. Enum Parsing

*   **Problem:** API sends enums as strings (e.g., `"PENDING"`) or integers, and the Dart enum isn't set up for this.
*   **Symptom:** Enum field is `null` or a default value, or parsing error.
*   **Fix:**
    *   **For String enums:** Use `@JsonEnum` on the enum and `@JsonValue` on its members.
        ```dart
        @JsonEnum()
        enum OrderStatus {
          @JsonValue('PENDING')
          pending,
          @JsonValue('COMPLETED')
          completed,
          unknown // Fallback for unknown values
        }
        // In your model:
        @JsonKey(defaultValue: OrderStatus.unknown)
        final OrderStatus status;
        ```
    *   **For Int enums:** This is less common with `json_serializable` directly. You might need a custom converter or ensure the API sends strings that you then map to enums.

---

## 6. Date/Time Parsing

*   **Problem:** API sends dates in a format not directly parsable by `DateTime.parse()` or `json_serializable`'s default.
*   **Symptom:** `FormatException` during parsing or incorrect `DateTime` values.
*   **Fix:**
    *   **ISO 8601:** `json_serializable` handles ISO 8601 strings for `DateTime` fields by default.
    *   **Custom Formats / Timestamps:** Use a custom converter with `@JsonKey`.
        ```dart
        // Example for Unix timestamp (milliseconds)
        static DateTime _dateTimeFromTimestamp(int timestamp) => DateTime.fromMillisecondsSinceEpoch(timestamp);
        static int _dateTimeToTimestamp(DateTime dateTime) => dateTime.millisecondsSinceEpoch;

        @JsonKey(fromJson: _dateTimeFromTimestamp, toJson: _dateTimeToTimestamp)
        final DateTime createdAt;
        ```

---

## 7. Issues with `build_runner`

*   **Problem:** The generated `.g.dart` files are outdated or contain errors due to incorrect model annotations.
*   **Symptom:** Parsing logic doesn't reflect recent model changes, or `build_runner` fails with errors.
*   **Fix:**
    *   **Always run `build_runner`:** After any change to a model class annotated with `@JsonSerializable` or its fields/annotations, run:
        ```bash
        flutter pub run build_runner build --delete-conflicting-outputs
        ```
    *   **Check `build_runner` output:** Look for errors or warnings from the build command. These often point to issues in your model annotations (e.g., typos, incorrect `JsonKey` usage).
    *   Ensure all models involved in serialization (including nested ones) are correctly annotated and have the necessary `part '*.g.dart';` directive.

---

## 8. Custom `fromJson` / `toJson` Logic Errors

*   **Problem:** Bugs within manually written `fromJson` or `toJson` methods in the model (if not fully relying on `json_serializable` generation for a particular field or class).
*   **Symptom:** Unpredictable parsing behavior, incorrect data, or runtime errors originating from these custom methods.
*   **Fix:**
    *   **Prefer generated code:** Rely on `json_serializable` as much as possible.
    *   **Thoroughly test custom logic:** If custom logic is unavoidable, write unit tests specifically for these `fromJson` / `toJson` methods to cover various scenarios, including edge cases and invalid inputs.
    *   Step through the custom logic with a debugger to identify the point of failure.

---

## 9. Nested Object Parsing

*   **Problem:** An error in the `fromJson` factory or annotations of a nested object's model.
*   **Symptom:** The parent object fails to parse, or the nested object field is `null` or incomplete. Often, the error message might point to the parent model, but the root cause is in the child.
*   **Fix:**
    *   Ensure the nested model class (e.g., `Address` in `User`) is also annotated with `@JsonSerializable` and has its own `fromJson` factory and `part` directive.
    *   Verify all fields within the nested model are correctly annotated for their respective JSON keys and types.
    *   Run `build_runner` after any changes to nested models.
        ```dart
        // Parent Model
        @JsonSerializable()
        class User {
          final String name;
          final Address address; // Nested object

          User({required this.name, required this.address});
          factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
          Map<String, dynamic> toJson() => _$UserToJson(this);
        }

        // Nested Model
        @JsonSerializable()
        class Address {
          final String street;
          final String city;

          Address({required this.street, required this.city});
          factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);
          Map<String, dynamic> toJson() => _$AddressToJson(this);
        }
        ```

---

## 10. API Response Structure Changes

*   **Problem:** The backend API changes its response structure (e.g., renames a field, changes a data type, alters nesting) without corresponding updates to the frontend Dart models.
*   **Symptom:** Sudden parsing failures for an API endpoint that was previously working. Errors can vary widely based on the nature of the change.
*   **Fix:**
    *   **Communication:** Establish clear communication channels with the backend team about API changes.
    *   **API Versioning:** Utilize API versioning if available, allowing the frontend to adapt to changes more gradually.
    *   **Contract Testing:** Implement contract testing (e.g., using Pact) to detect breaking changes between API provider and consumer automatically.
    *   **Update Models:** When a change occurs, update the Dart models (`@JsonKey` names, types, nullability, structure) to match the new API response.
    *   **Regenerate Code:** Run `build_runner` after updating models.

---

## 11. Error Response Handling

*   **Problem:** The application attempts to parse an API error response (e.g., a JSON object describing an error like `{"error": "Invalid input", "status_code": 400}`) using the data model intended for successful responses.
*   **Symptom:** `MissingRequiredKeysException`, `TypeError`, or other parsing errors because the error JSON structure doesn't match the expected success data structure.
*   **Fix:**
    *   **Check Status Codes:** In your API service layer (e.g., using Dio interceptors or response validation), check the HTTP status code before attempting to parse the body into a success model.
    *   **Separate Error Model:** If error responses have a consistent JSON structure, create a separate Dart model (e.g., `ApiErrorResponse`) to parse them.
    *   **Robust `ResponseParser`:** Ensure your `ResponseParser` (as per `network_layer_guide.md`) correctly distinguishes success from failure and parses the body into the appropriate model (data or error).
        ```dart
        // Simplified example in an API service
        Future<ApiResponse<User>> fetchUser(String userId) async {
          try {
            final response = await dioClient.get('/users/$userId');
            // Assuming Dio throws an exception for non-2xx status codes, or you check response.statusCode
            User user = User.fromJson(response.data);
            return ApiResponse.success(user);
          } on DioError catch (e) {
            if (e.response != null && e.response.data is Map) {
              // Try to parse as a known API error structure
              ApiErrorResponse apiError = ApiErrorResponse.fromJson(e.response.data);
              return ApiResponse.error(apiError.message, error: apiError);
            } else {
              return ApiResponse.error('Network error or unknown API error');
            }
          } catch (e) {
            return ApiResponse.error('Parsing error or unexpected issue: ${e.toString()}');
          }
        }
        ```

---

**General Best Practices:**

*   **Validate with API Specs:** Always refer to the API documentation (e.g., Swagger/OpenAPI specs) to ensure your models match the expected request/response structures, types, and field names.
*   **Incremental Testing:** Test API integration and parsing for each model/endpoint as you develop it, rather than waiting until many models are created.
*   **Logging:** Add detailed logging during parsing (especially in development builds) to capture the raw JSON response when an error occurs. This is invaluable for debugging.
*   **Unit Tests:** Write unit tests for your `fromJson` methods, especially for models with custom converters or complex logic.

This guide should serve as a living document. Please update it with new issues and solutions as they are encountered.