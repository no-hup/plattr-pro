import 'package:dio/dio.dart';
import '../../../network/dio_client.dart';
import '../../../network/api_constants.dart';
import '../../../network/api_response.dart';
import '../../../network/response_parser.dart'; 
import '../models/login_request.dart';
import '../models/login_response_data.dart';

class LoginApiService {
  final Dio _dio = DioClient().dio;

  Future<ApiResponse<LoginResponseData>> login(LoginRequest request) async {
    try {
      final response = await _dio.post(
        ApiConstants.serverLogin,
        data: {'data': request.toJson()}, 
      );
      final data =  ResponseParser.parse<LoginResponseData>(
        response,
        (jsonData) => LoginResponseData.fromJson(jsonData['data'] as Map<String, dynamic>),
        dataExtractor: (jsonEnvelope) {
          // Assuming jsonEnvelope is from response.data which is already a Map<String, dynamic>
          // or from e.response.data which can also be a Map.
          if (jsonEnvelope is Map<String, dynamic>) {
            final result = jsonEnvelope['result'];
            if (result is Map<String, dynamic> && result.containsKey('data')) {
              return result['data'];
            }
          }
          return jsonEnvelope;
        },
      );
      return data;
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map<String, dynamic>) {
         final errorData = e.response!.data as Map<String, dynamic>;
         if (errorData.containsKey('error') && errorData['error'] is Map<String,dynamic>) {
           final errorContent = errorData['error'] as Map<String,dynamic>;
           final message = errorContent['message'] as String? ?? 'Login failed';
           final errorCode = errorContent['details']?['data']?['code'] as String? ?? e.response?.statusCode?.toString() ?? 'dio_error';
           return ApiResponse.error(message, errorCode: errorCode);
         }
      }
      final code = e.response?.statusCode?.toString() ?? 'dio_error';
      final msg = e.message ?? 'Login failed due to network error';
      return ApiResponse.error('Network error: $msg', errorCode: code);
    } catch (e) {
      return ApiResponse.error('Unexpected error during login: $e', errorCode: 'parsing_error');
    }
  }
}
