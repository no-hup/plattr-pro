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
      final data = ResponseParser.parse<LoginResponseData>(
        response,
        (jsonData) => LoginResponseData.fromJson(jsonData as Map<String, dynamic>),
      );
      return data;
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'login');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error('Unexpected error during login: $e', errorCode: 'parsing_error');
    }
  }
}
