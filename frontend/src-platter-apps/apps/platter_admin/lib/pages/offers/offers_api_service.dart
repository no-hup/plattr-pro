import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

import 'models/offer_model.dart';

/// API service for admin-side offer management.
///
/// Mirrors the envelope pattern used by `StaffApiService`: everything goes
/// through `DioClient().dio` as a POST with `{ data: { ... } }` body, and
/// responses are parsed via `ResponseParser.parse` so error handling matches
/// the rest of the admin app.
class OffersApiService {
  final Dio _dio = DioClient().dio;

  /// List all offers for a restaurant.
  Future<ApiResponse<List<OfferModel>>> getOffers({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getOffers',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<List<OfferModel>>(
        response,
        (json) {
          final offers = (json['offers'] as List<dynamic>?) ?? const [];
          return offers
              .map((o) => OfferModel.fromJson(o as Map<String, dynamic>))
              .toList();
        },
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'getOffers');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Create a new offer.
  Future<ApiResponse<OfferModel>> createOffer({
    required String restaurantId,
    required String sessionId,
    required Map<String, dynamic> offerData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-createOffer',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'offerData': offerData,
          }
        },
      );

      return ResponseParser.parse<OfferModel>(
        response,
        (json) =>
            OfferModel.fromJson(json['offer'] as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'createOffer');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Update an existing offer.
  Future<ApiResponse<OfferModel>> updateOffer({
    required String restaurantId,
    required String sessionId,
    required String offerId,
    required Map<String, dynamic> offerData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateOffer',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'offerId': offerId,
            'offerData': offerData,
          }
        },
      );

      return ResponseParser.parse<OfferModel>(
        response,
        (json) =>
            OfferModel.fromJson(json['offer'] as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'updateOffer');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Delete an offer.
  Future<ApiResponse<void>> deleteOffer({
    required String restaurantId,
    required String sessionId,
    required String offerId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-deleteOffer',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'offerId': offerId,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'deleteOffer');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}
