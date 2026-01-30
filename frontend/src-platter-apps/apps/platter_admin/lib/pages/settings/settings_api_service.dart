import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

/// API service for restaurant settings
class SettingsApiService {
  final Dio _dio = DioClient().dio;

  /// Get restaurant settings
  Future<ApiResponse<RestaurantSettings>> getSettings({
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
        (json) {
          final settingsJson =
              (json['settings'] as Map<String, dynamic>?) ?? json as Map<String, dynamic>;
          return RestaurantSettings.fromJson(settingsJson);
        },
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'getSettings');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Update restaurant settings
  Future<ApiResponse<void>> updateSettings({
    required String restaurantId,
    required String sessionId,
    required Map<String, dynamic> settings,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateRestaurantSettings',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'settings': settings,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateSettings');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}
