
/// Safely parses an integer from dynamic input (String, int, double).
/// Returns null if parsing fails or input is null.
int? parseIntFlexible(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is String) return int.tryParse(value);
  // Optional: Log unexpected type in debug mode
  // if (kDebugMode) {
  //   print('⚠️ parseIntFlexible: Unexpected type ${value.runtimeType} for value $value');
  // }
  return null;
}

/// Safely parses an integer from dynamic input (String, int, double).
/// Returns 0 if parsing fails or input is null/invalid.
int parseIntFlexibleZero(dynamic value) {
  return parseIntFlexible(value) ?? 0;
}

/// Reads a value from a nested map structure using a list of keys.
/// Returns null if the path does not exist.
dynamic readNestedValue(Map json, List<String> keys) {
  dynamic value = json;
  for (final key in keys) {
    if (value is Map && value.containsKey(key)) {
      value = value[key];
    } else {
      return null; // Path not found
    }
  }
  return value;
}

/// Factory function that returns a `readValue` function suitable for `@JsonKey`.
/// The returned function attempts to read the value from the `topLevelKey` first,
/// and falls back to reading from the specified `nestedPath` if the top-level key
/// is not present or its value is null.
///
/// Usage:
/// ```dart
/// @JsonKey(
///   name: 'primaryName', // This becomes topLevelKey
///   readValue: readValueWithFallback(['metadata', 'details', 'name'])
/// )
/// String? name;
/// ```
Object? Function(Map, String) readValueWithFallback(List<String> nestedPath) {
  return (Map json, String topLevelKey) {
    // Try the top-level key first. Check for presence AND non-null value.
    if (json.containsKey(topLevelKey) && json[topLevelKey] != null) {
        return json[topLevelKey];
    }
    // Fallback to the nested path
    return readNestedValue(json, nestedPath);
  };
}
