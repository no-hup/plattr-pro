

# Flutter Module Architecture Guidelines

## Overview

This document outlines a standardized architecture for Flutter modules based on our experience refactoring the Table Verification module. Following these guidelines will help create maintainable, testable, and scalable code while avoiding common pitfalls.

## Module Structure

### Directory Organization

```
lib/pages/feature_name/
├── models/                  # Data models for the feature
│   └── models.dart          # Main models file with Freezed annotations
├── feature_repository.dart  # API communication and data handling
├── feature_error_codes.dart # Standardized error codes
├── feature_response_parser.dart # Parsing logic for API responses
├── feature_page.dart        # Main UI entry point
├── feature_state.dart       # State management and UI logic
└── README.md                # Documentation for the module
```

### Key Components

1. **Models**: Data classes that represent domain entities
2. **Repository**: Handles API communication and data operations
3. **Error Codes**: Standardized error handling
4. **Response Parser**: Separates parsing logic from models
5. **Page**: Main UI entry point with minimal logic
6. **State**: Contains the business logic and UI state management

## Implementation Guidelines

### 1. Models with Freezed

Use Freezed for immutable data models:

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

@freezed
class FeatureModel with _$FeatureModel {
  const FeatureModel._(); // For custom methods
  
  const factory FeatureModel({
    required String id,
    required String name,
    @Default(false) bool isActive,
  }) = _FeatureModel;
  
  factory FeatureModel.fromJson(Map<String, dynamic> json) => 
      _$FeatureModelFromJson(json);
      
  // Custom getters/methods
  String get displayName => name.toUpperCase();
}
```

**Important Nuances**:
- Always add `part` directives for generated files
- Use a private constructor (`const FeatureModel._()`) for custom methods
- Use `@Default()` annotation for default values
- Remember to run `dart run build_runner build --delete-conflicting-outputs` after changes
- When moving model files to a new directory, regenerate the Freezed files
- Use `copyWith()` instead of direct property assignment for immutable objects

### 2. Repository Pattern

Separate API communication from business logic:

```dart
class FeatureRepository {
  static final FeatureRepository _instance = FeatureRepository._internal();
  factory FeatureRepository() => _instance;
  
  final Dio _dio;
  
  // Standard timeout durations
  static const Duration _connectTimeout = Duration(seconds: 10);
  static const Duration _receiveTimeout = Duration(seconds: 10);
  
  FeatureRepository._internal() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: _connectTimeout,
    receiveTimeout: _receiveTimeout,
    headers: {'Content-Type': 'application/json'},
  )) {
    // Add logging interceptors
    _dio.interceptors.add(LoggingInterceptor());
  }
  
  Future<ApiResponse<FeatureModel>> fetchFeature(String id) async {
    try {
      // Prepare request
      final payload = _preparePayload(id);
      
      // Make API request with timeout handling
      final response = await _dio.get(
        ApiConfig.featureEndpoint,
        queryParameters: payload,
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw TimeoutException(),
      );
      
      // Process response
      return _processResponse(response);
    } on DioException catch (e) {
      return _handleDioException(e);
    } catch (e) {
      return _handleGenericException(e);
    }
  }
  
  // Helper methods for request/response handling
  Map<String, dynamic> _preparePayload(String id) { /* ... */ }
  ApiResponse<FeatureModel> _processResponse(Response response) { /* ... */ }
  ApiResponse<FeatureModel> _handleDioException(DioException e) { /* ... */ }
  ApiResponse<FeatureModel> _handleGenericException(dynamic e) { /* ... */ }
}
```

**Important Nuances**:
- Use the singleton pattern for repositories
- Define standard timeout durations as constants
- Add interceptors for logging
- Break down large methods into smaller, focused helper methods
- Handle different types of exceptions separately
- Use explicit timeout handling with custom error messages
- Return consistent response types (e.g., `ApiResponse<T>`)

### 3. Error Handling

Create standardized error codes:

```dart
class FeatureErrorCodes {
  // HTTP status code related errors
  static const String badRequest = 'FEATURE_BAD_REQUEST';
  static const String unauthorized = 'FEATURE_UNAUTHORIZED';
  static const String notFound = 'FEATURE_NOT_FOUND';
  
  // Network related errors
  static const String timeoutError = 'FEATURE_TIMEOUT_ERROR';
  static const String connectionError = 'FEATURE_CONNECTION_ERROR';
  
  // Data parsing errors
  static const String parseError = 'FEATURE_PARSE_ERROR';
  
  // Helper method to get error code from HTTP status
  static String fromHttpStatus(int statusCode) {
    switch (statusCode) {
      case 400: return badRequest;
      case 401: return unauthorized;
      case 404: return notFound;
      default: return 'FEATURE_SERVER_ERROR_$statusCode';
    }
  }
}
```

**Important Nuances**:
- Prefix error codes with the feature name to avoid conflicts
- Create helper methods to convert HTTP status codes to error codes
- Use string interpolation with curly braces for variable parts (`${variable}`)
- Ensure error messages are user-friendly and actionable

### 4. Response Parsing

Separate parsing logic from models:

```dart
class FeatureResponseParser {
  static FeatureModel parseFromJson(Map<String, dynamic> json) {
    try {
      AppLogger.log('Parsing JSON: $json');
      
      // Extract data from response
      final result = json['result'] as Map<String, dynamic>?;
      if (result == null) {
        throw FeatureException('Missing result object');
      }
      
      // Parse model fields
      final id = result['id'] as String? ?? '';
      final name = result['name'] as String? ?? '';
      final isActive = result['isActive'] as bool? ?? false;
      
      // Create model instance
      return FeatureModel(
        id: id,
        name: name,
        isActive: isActive,
      );
    } catch (e) {
      AppLogger.log('Parse Error: $e');
      throw FeatureException('Invalid response format: $e');
    }
  }
}
```

**Important Nuances**:
- Use static methods for parsing
- Add comprehensive error handling
- Log parsing steps for debugging
- Use null-safe access with fallback values
- Throw specific exceptions for parsing errors

### 5. State Management

Use a clear state enum and separate UI building methods:

```dart
enum FeatureState {
  loading,
  success,
  error,
}

class FeaturePageState extends State<FeaturePage> {
  FeatureState _state = FeatureState.loading;
  String? _error;
  FeatureModel? _data;
  
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  
  Future<void> _loadData() async {
    setState(() => _state = FeatureState.loading);
    
    try {
      final response = await _repository.fetchFeature(widget.featureId);
      
      if (!response.success) {
        _handleError(response.message);
        return;
      }
      
      _handleSuccess(response.data!);
    } catch (e) {
      _handleError(e.toString());
    }
  }
  
  void _handleSuccess(FeatureModel data) {
    setState(() {
      _data = data;
      _state = FeatureState.success;
    });
  }
  
  void _handleError(String message) {
    setState(() {
      _error = message;
      _state = FeatureState.error;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    switch (_state) {
      case FeatureState.loading:
        return _buildLoadingView();
      case FeatureState.error:
        return _buildErrorView();
      case FeatureState.success:
        return _buildSuccessView();
    }
  }
  
  Widget _buildLoadingView() { /* ... */ }
  Widget _buildErrorView() { /* ... */ }
  Widget _buildSuccessView() { /* ... */ }
}
```

**Important Nuances**:
- Define a clear state enum for all possible UI states
- Break down the `build` method into smaller, focused methods
- Create helper methods for state transitions
- Add proper logging at key points
- Handle edge cases (null data, unexpected states)
- Ensure state updates trigger UI rebuilds correctly

## Common Pitfalls and Solutions

### 1. Freezed Model Issues

**Problem**: After moving model files or changing Freezed annotations, properties become inaccessible.

**Solution**:
- Always run `dart run build_runner build --delete-conflicting-outputs` after changes
- Update all imports to point to the new location
- Use `copyWith()` instead of direct property assignment
- Add a private constructor for custom methods

### 2. String Interpolation Errors

**Problem**: String concatenation with variables can cause syntax errors.

**Solution**:
- Use curly braces for variable interpolation: `'${variable}_suffix'`
- For simple variables, you can omit braces: `'$variable'`

### 3. Repository Method Complexity

**Problem**: Repository methods become large and difficult to maintain.

**Solution**:
- Break down large methods into smaller, focused helper methods
- Create separate methods for request preparation, response handling, and error handling
- Use consistent return types for all methods

### 4. State Management Complexity

**Problem**: State management becomes complex with multiple conditions.

**Solution**:
- Use a state enum to represent all possible states
- Create helper methods for state transitions
- Break down the UI building logic into smaller methods
- Use switch statements for clarity

### 5. Error Handling Inconsistency

**Problem**: Inconsistent error handling leads to poor user experience.

**Solution**:
- Create standardized error codes
- Use consistent error message formatting
- Add proper logging for all errors
- Provide retry functionality for recoverable errors

## Documentation Guidelines

Each module should include a README.md file with:

1. **Overview**: Brief description of the module's purpose
2. **Key Components**: List of main classes and their responsibilities
3. **State Management**: Description of the state approach
4. **Error Handling**: Explanation of error handling strategy
5. **API Integration**: Details of backend communication
6. **Usage**: Examples of how to use the module

## Conclusion

Following these architecture guidelines will help create maintainable, testable, and scalable Flutter modules. The separation of concerns, standardized error handling, and clear state management will make the codebase easier to understand and extend.

By learning from the challenges faced during the Table Verification module refactoring, we can avoid similar issues in future modules and create a more robust application.
