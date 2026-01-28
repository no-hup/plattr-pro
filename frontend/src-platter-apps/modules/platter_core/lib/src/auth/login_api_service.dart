import 'package:dio/dio.dart';
import '../network/api_response.dart';
import '../network/response_parser.dart';
import '../network/dio_client.dart';
import 'login_request.dart';
import 'login_response_data.dart';

/// API service for authentication operations.
/// Shared across all Platter apps.
class LoginApiService {
  final Dio _dio;
  final String _loginEndpoint;

  LoginApiService({
    Dio? dio,
    String loginEndpoint = '/server-serverLogin',
  })  : _dio = dio ?? DioClient().dio,
        _loginEndpoint = loginEndpoint;

  Future<ApiResponse<LoginResponseData>> login(LoginRequest request) async {
    try {
      final response = await _dio.post(
        _loginEndpoint,
        data: {'data': request.toJson()},
      );
      return ResponseParser.parse<LoginResponseData>(
        response,
        (jsonData) =>
            LoginResponseData.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'login');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error during login: $e',
        errorCode: 'parsing_error',
      );
    }
  }
}
