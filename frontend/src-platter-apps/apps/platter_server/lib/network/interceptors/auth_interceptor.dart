import 'package:dio/dio.dart';
import '../../session/secure_storage_service.dart';

class AuthInterceptor extends Interceptor {
  final List<String> _publicEndpoints = [
    '/login',
    '/refresh-token',
  ];

  bool _isPublicEndpoint(String path) {
    return _publicEndpoints.any((endpoint) => path.contains(endpoint));
  }

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (!_isPublicEndpoint(options.path)) {
      final storage = SecureStorageService();
      final token = await storage.getToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }
}
