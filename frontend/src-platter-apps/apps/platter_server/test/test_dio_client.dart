import 'package:dio/dio.dart';
// import 'package:platter_server/network/api_constants.dart'; // ApiConstants.baseUrl is no longer available
import 'package:platter_server/config/app_config.dart'; // Import AppConfig

class TestDioClient {
  static final TestDioClient _instance = TestDioClient._internal();
  factory TestDioClient() => _instance;

  late final Dio dio;

  TestDioClient._internal() {
    // Initialize AppConfig for test environment if not already done in a global test setup
    // This ensures AppConfig.firebaseFunctionsBaseUrl returns the dev URL for tests.
    // If you have a central test setup (e.g., flutter_test_config.dart or a setUpAll in a test file),
    // it's better to initialize it there once.
    AppConfig.initialize(Environment.dev);

    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.firebaseFunctionsBaseUrl, // Use AppConfig
        contentType: 'application/json',
        responseType: ResponseType.json,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    // Add logging for test visibility
    dio.interceptors.add(LogInterceptor(
      request: true,
      requestBody: true,
      responseBody: true,
    ));
  }
}
