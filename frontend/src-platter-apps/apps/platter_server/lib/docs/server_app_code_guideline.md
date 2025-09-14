# Platter Server App Code Guidelines

This document outlines the architecture, patterns, and conventions for developing the Platter Server Waiter App. Following these guidelines ensures consistent, maintainable code that adheres to the project's established patterns.

## Core Architecture Overview

The app follows a clean, feature-based architecture. The directory structure is organized for clarity and scalability, grouping files by feature and responsibility. Below is the current structure (as of May 2025):

### Directory Structure (Partial, 3 Levels)

#### `lib/`
```plaintext
.
├── config
├── converters
├── di
├── docs
├── firebase_options.dart
├── logging
├── main.dart
├── main_navigation.dart
├── network
├── pages
├── routes
├── session
├── singleton
└── theme
```

#### `lib/pages/`
```plaintext
pages/
├── menu_home
│   ├── menu_home_screen.dart
│   ├── menu_provider.dart
│   ├── models/
│   └── repository/
├── orders_home
│   ├── models/
│   ├── order_detail_screen.dart
│   ├── orders_home_screen.dart
│   ├── orders_provider.dart
│   └── repository/
└── tables_home
    ├── README.md
    ├── models/
    ├── repository/
    ├── table_detail_dialog.dart
    ├── table_models.g.dart
    ├── tables_home_screen.dart
    └── tables_provider.dart
```

**Key Points:**
- Each feature (menu, orders, tables) lives in its own directory under `pages/`, with subfolders for `models/` and `repository/`.
- Shared services and network logic are under `network/`, not in feature folders.
- Providers and screens are in their respective feature folders, not in a global `state/` or `ui/` directory.
- The `docs/` folder contains all developer documentation and guidelines.

---

The rest of the guideline below is updated to reference this structure.

## 1. Data Models with JsonSerializable

**Location**: `lib/pages/{feature}/models/{model_name}.dart`

All models must use JsonSerializable for consistent serialization:

```dart
import 'package:json_annotation/json_annotation.dart';
part 'order_item.g.dart'; // Generated file

@JsonSerializable(createToJson: true)
class OrderItem {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;
  
  @JsonKey(name: 'item_name') // Use for field name mismatches
  final String name;
  
  @JsonKey(defaultValue: 0) // Sensible defaults for optional fields
  final int quantity;

  OrderItem({required this.id, required this.name, required this.quantity});

  // Standard factory constructor pattern - DO NOT modify
  factory OrderItem.fromJson(Map<String, dynamic> json) => _$OrderItemFromJson(json);
  
  // Standard toJson method - DO NOT modify
  Map<String, dynamic> toJson() => _$OrderItemToJson(this);
}
```

**Important Notes**:
- Always run `flutter pub run build_runner build --delete-conflicting-outputs` after model changes
- Use appropriate JsonKey annotations for field requirements
- Never manually implement fromJson/toJson - use the generated methods

## 2. API Services (Repositories)

**Location**: `lib/pages/{feature}/repository/{feature}_api_service.dart`

API services (a.k.a. repositories) handle all HTTP communication with specific endpoints:

```dart
class OrderApiService {
  final Dio _dio = DioClient().dio; // Always use the singleton DioClient

  Future<ApiResponse<OrderDetail>> getOrderDetails(String orderId) async {
    try {
      final response = await _dio.get('/orders/$orderId');
      
      // ALWAYS use ResponseParser.parse for consistent parsing
      return ResponseParser.parse<OrderDetail>(
        response,
        (jsonData) => OrderDetail.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      // Use standard error handling for network errors
      final (code, msg) = DioClient.handleDioError(e, context: 'getOrderDetails');
      return ApiResponse<OrderDetail>.error(msg, errorCode: code);
    } catch (e) {
      // General error handling
      return ApiResponse<OrderDetail>.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}
```

**Important Notes**:
- Use the singleton `DioClient().dio` for all HTTP requests
- All services should return `ApiResponse<T>` objects
- Follow standard error handling patterns with DioClient.handleDioError
- For list responses that need custom extraction, use the dataExtractor parameter:

```dart
// For responses needing custom extraction
return ResponseParser.parse<List<OrderItem>>(
  response,
  (jsonData) => (jsonData as List)
      .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
      .toList(),
  dataExtractor: (envelope) => envelope['items'] ?? [], // Extract specific field
);
```

## 3. State Management with Provider

**Location**: `lib/pages/{feature}/{feature}_provider.dart`

State providers manage UI state and interact with API services:

```dart
enum DataState { initial, loading, loaded, error }

class OrderProvider extends ChangeNotifier {
  final OrderApiService _apiService;
  
  // State variables
  DataState _state = DataState.initial;
  OrderDetail? _orderDetail;
  String? _errorMessage;
  
  // Public getters
  DataState get state => _state;
  OrderDetail? get orderDetail => _orderDetail;
  String? get errorMessage => _errorMessage;
  
  OrderProvider({required OrderApiService apiService}) : _apiService = apiService;
  
  Future<void> fetchOrderDetails(String orderId) async {
    // Update state to loading
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();
    
    // Call API service
    final response = await _apiService.getOrderDetails(orderId);
    
    // Handle response
    if (response.success && response.data != null) {
      _orderDetail = response.data;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Unknown error';
      _state = DataState.error;
    }
    
    // Notify UI of changes
    notifyListeners();
  }
}
```

## 4. UI Implementation

**Location**: `lib/pages/{feature}/{screen_name}_screen.dart`

UI components should react to provider state changes:

```dart
class OrderDetailScreen extends StatelessWidget {
  final String orderId;
  
  const OrderDetailScreen({required this.orderId, Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    // Get the provider and listen to state changes
    final orderProvider = context.watch<OrderProvider>();
    
    // Load order data when widget is first built
    // Use WidgetsBinding or useEffect hook to avoid calling in build
    useEffect(() {
      orderProvider.fetchOrderDetails(orderId);
      return null;
    }, [orderId]);
    
    return Scaffold(
      appBar: AppBar(title: const Text('Order Details')),
      body: _buildContent(orderProvider),
    );
  }
  
  Widget _buildContent(OrderProvider provider) {
    // Conditional rendering based on state
    return switch (provider.state) {
      DataState.initial || DataState.loading => const Center(child: CircularProgressIndicator()),
      DataState.error => Center(child: Text('Error: ${provider.errorMessage ?? 'Unknown'}')),
      DataState.loaded => _buildOrderDetails(provider.orderDetail!),
    };
  }
  
  Widget _buildOrderDetails(OrderDetail order) {
    // Actual UI implementation
    return ListView(
      children: [
        // Order details widgets...
      ],
    );
  }
}
```

**Provider Setup**:
Always register providers in a centralized location like `main.dart` or a dedicated providers setup file:

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(
      create: (_) => OrderProvider(apiService: OrderApiService()),
    ),
    // Other providers...
  ],
  child: MyApp(),
)
```

## 5. Error Handling

**Core Rule**: All network responses must be wrapped in `ApiResponse<T>` objects for consistent error handling.

The `ApiResponse` class provides a standardized way to handle success and error states:

```dart
// Success case
return ApiResponse<OrderDetail>.success(orderDetail, message: 'Order fetched successfully');

// Error case
return ApiResponse<OrderDetail>.error('Failed to fetch order', errorCode: 'network_error');
```

## 6. Core Singleton Classes

The following singleton classes provide core functionality:

- **DioClient**: Central HTTP client with interceptors
  ```dart
  final dio = DioClient().dio; // Use this singleton for all HTTP requests
  ```

- **JsonMapper**: Safe JSON parsing with error handling
  ```dart
  final model = JsonMapper.map(json, MyModel.fromJson); // Safely parse JSON
  ```

- **ResponseParser**: Standardized API response handling
  ```dart
  return ResponseParser.parse<T>(response, Model.fromJson); // Parse API responses
  ```

## 7. Best Practices for Code Organization

- **Feature-Based Structure**: Group related files by feature (see directory structure above)
- **Separation of Concerns**: Keep UI, state, and data logic separate, but colocate them within the feature folder
- **Consistent Naming**: Follow naming conventions across the project (e.g., `menu_home_screen.dart`, `orders_provider.dart`)
- **Documentation**: Add clear comments for complex logic; keep documentation in the `docs/` folder
- **Error Handling**: Always handle errors gracefully with appropriate user feedback

By following these guidelines and the directory structure above, you will create consistent, maintainable code that integrates well with the existing Platter Server application architecture.

