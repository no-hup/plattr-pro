import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/pages/menuListing/models/offer.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Repository for offers-related API calls
class OffersRepository {
  factory OffersRepository() => _instance;

  OffersRepository._internal() : _dio = DioClient().dio;
  static final OffersRepository _instance = OffersRepository._internal();
  final Dio _dio;

  /// Fetches all applicable offers for a restaurant
  /// 
  /// [restaurantId] - Required restaurant ID
  /// [tableId] - Optional table ID for fetching cart context
  /// [sessionId] - Optional session ID for session-based offers
  Future<ApiResponse<OffersResponse>> getApplicableOffers({
    required String restaurantId,
    String? tableId,
    String? sessionId,
  }) async {
    try {
      AppLogger.log('🎁 OFFERS: Fetching applicable offers for restaurant $restaurantId');

      final payload = {
        'data': {
          'restaurantId': restaurantId,
          if (tableId != null) 'tableId': tableId,
          if (sessionId != null) 'sessionId': sessionId,
        },
      };
      AppLogger.log('📦 OFFERS Request Payload: $payload');

      final response = await _dio.post(
        ApiConfig.getApplicableOffersEndpoint,
        data: payload,
      );

      AppLogger.log('📡 OFFERS Response Status: ${response.statusCode}');
      AppLogger.log('📡 OFFERS Response Data: ${response.data}');

      return _parseOffersResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ OFFERS Dio Error: $e');
      return _handleDioError(e);
    } catch (e) {
      AppLogger.log('❌ OFFERS General Error: $e');
      return ApiResponse.error(
        'Failed to fetch offers: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  /// Applies an offer to the current cart
  /// 
  /// [restaurantId] - Required restaurant ID
  /// [tableId] - Required table ID
  /// [offerId] - Required offer ID to apply
  Future<ApiResponse<ApplyOfferResponse>> applyOffer({
    required String restaurantId,
    required String tableId,
    required String offerId,
  }) async {
    try {
      AppLogger.log('🎁 OFFERS: Applying offer $offerId');

      final payload = {
        'data': {
          'restaurantId': restaurantId,
          'tableId': tableId,
          'offerId': offerId,
        },
      };
      AppLogger.log('📦 OFFERS Apply Payload: $payload');

      final response = await _dio.post(
        ApiConfig.applyOfferEndpoint,
        data: payload,
      );

      AppLogger.log('📡 OFFERS Apply Response Status: ${response.statusCode}');
      AppLogger.log('📡 OFFERS Apply Response Data: ${response.data}');

      return _parseApplyOfferResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ OFFERS Apply Dio Error: $e');
      return _handleDioError(e);
    } catch (e) {
      AppLogger.log('❌ OFFERS Apply General Error: $e');
      return ApiResponse.error(
        'Failed to apply offer: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  ApiResponse<OffersResponse> _parseOffersResponse(Response<dynamic> response) {
    try {
      final data = response.data as Map<String, dynamic>;

      // Handle error response
      if (data['status'] == 'error') {
        final message = data['message'] as String? ?? 'Failed to fetch offers';
        final errorData = data['error'] as Map<String, dynamic>?;
        final code = errorData?['code'] as String? ?? 'API_ERROR';
        return ApiResponse.error(message, errorCode: code);
      }

      // Parse success response
      final responseData = data['data'] as Map<String, dynamic>?;
      if (responseData == null) {
        return ApiResponse.success(
          OffersResponse(offers: []),
          message: 'No offers available',
        );
      }

      final offersList = responseData['offers'] as List<dynamic>? ?? [];
      final offers = offersList
          .map((json) => Offer.fromJson(json as Map<String, dynamic>))
          .toList();

      AppLogger.log('🎁 OFFERS: Parsed ${offers.length} offers');

      final successMessage = data['message'] as String? ?? 'Offers fetched successfully';
      return ApiResponse.success(
        OffersResponse(offers: offers),
        message: successMessage,
      );
    } catch (e) {
      AppLogger.log('❌ OFFERS Parse Error: $e');
      return ApiResponse.error(
        'Failed to parse offers response: $e',
        errorCode: 'PARSE_ERROR',
      );
    }
  }

  ApiResponse<ApplyOfferResponse> _parseApplyOfferResponse(Response<dynamic> response) {
    try {
      final data = response.data as Map<String, dynamic>;

      // Handle error response
      if (data['status'] == 'error') {
        final message = data['message'] as String? ?? 'Failed to apply offer';
        final errorData = data['error'] as Map<String, dynamic>?;
        final code = errorData?['code'] as String? ?? 'API_ERROR';
        return ApiResponse.error(message, errorCode: code);
      }

      // Parse success response
      final responseData = data['data'] as Map<String, dynamic>?;
      if (responseData == null) {
        return ApiResponse.error(
          'Invalid response from server',
          errorCode: 'INVALID_RESPONSE',
        );
      }

      final applyResponse = ApplyOfferResponse.fromJson(responseData);

      AppLogger.log('🎁 OFFERS: Offer applied successfully');

      final successMessage = data['message'] as String? ?? 'Offer applied successfully';
      return ApiResponse.success(
        applyResponse,
        message: successMessage,
      );
    } catch (e) {
      AppLogger.log('❌ OFFERS Apply Parse Error: $e');
      return ApiResponse.error(
        'Failed to parse apply offer response: $e',
        errorCode: 'PARSE_ERROR',
      );
    }
  }

  ApiResponse<T> _handleDioError<T>(DioException e) {
    String errorMessage;
    String errorCode;

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        errorMessage = 'Request timed out';
        errorCode = 'TIMEOUT_ERROR';
      case DioExceptionType.connectionError:
        errorMessage = 'No internet connection';
        errorCode = 'CONNECTION_ERROR';
      case DioExceptionType.badCertificate:
      case DioExceptionType.badResponse:
      case DioExceptionType.cancel:
      case DioExceptionType.unknown:
        errorMessage = 'Network error: ${e.message}';
        errorCode = 'NETWORK_ERROR';
    }

    return ApiResponse.error(errorMessage, errorCode: errorCode);
  }
}
