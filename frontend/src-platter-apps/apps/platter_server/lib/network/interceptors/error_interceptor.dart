import 'package:dio/dio.dart';
import '../../session/secure_storage_service.dart';
import '../../app_logger.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // TODO: Attempt token refresh logic here using a separate Dio instance
      // Avoid using the same Dio instance to prevent interceptor recursion
      // If refresh succeeds: update token via SecureStorageService, retry original request
      // If refresh fails: proceed to general error handling
      AppLogger.log('401 detected - refresh logic needed');
    }
    // Optionally log or format error using DioClient.handleDioError
    // final tuple = DioClient.handleDioError(err);
    handler.next(err); // Always pass error unless retrying
  }
}
