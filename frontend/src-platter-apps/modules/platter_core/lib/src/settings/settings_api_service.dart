import 'package:dio/dio.dart';
import '../network/api_response.dart';
import '../network/response_parser.dart';
import '../network/dio_client.dart';
import '../models/settings/restaurant_settings.dart';

class SettingsApiService {
  final Dio _dio = DioClient().dio;

  Future<ApiResponse<RestaurantSettings>> getRestaurantSettings({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getRestaurantSettings',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<RestaurantSettings>(
        response,
        (json) => RestaurantSettings.fromJson(json),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'getRestaurantSettings');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> updateRestaurantSettings({
    required String restaurantId,
    required String sessionId,
    required RestaurantSettings settings,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateRestaurantSettings',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'settings': settings.toJson(),
          }
        },
      );

      return ResponseParser.parse<void>(
        response,
        (_) => null,
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'updateRestaurantSettings');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}
