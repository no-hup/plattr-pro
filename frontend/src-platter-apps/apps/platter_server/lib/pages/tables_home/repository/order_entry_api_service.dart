import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart' hide DioClient;
import '../../../network/dio_client.dart';
import '../../../network/api_constants.dart';

/// What `table-openTable` hands back: the TABLE session the cart endpoints want, and the
/// `addedBy` tag the server derived from the staff session.
class OpenTableResult {
  final String tableId;
  final String sessionId;
  final String addedBy;
  final bool created;
  OpenTableResult({required this.tableId, required this.sessionId, required this.addedBy, required this.created});
  factory OpenTableResult.fromJson(Map<String, dynamic> json) => OpenTableResult(
        tableId: json['tableId'] as String? ?? '',
        sessionId: json['sessionId'] as String? ?? '',
        addedBy: json['addedBy'] as String? ?? '',
        created: json['created'] as bool? ?? false,
      );
}

/// Staff order entry on the existing cart endpoints. Nothing here is new server logic: open the
/// table, add lines with the table session, check out. The kitchen sees the round like any guest's.
class OrderEntryApiService {
  final Dio _dio = DioClient().dio;

  Future<ApiResponse<T>> _post<T>(String path, Map<String, dynamic> data, T Function(dynamic) parse, String ctx) async {
    try {
      final response = await _dio.post(path, data: {'data': data});
      return ResponseParser.parse<T>(response, parse);
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: ctx);
      return ApiResponse<T>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<T>.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<OpenTableResult>> openTable({
    required String restaurantId,
    required String staffSessionId,
    required String tableId,
    int? covers,
  }) =>
      _post(ApiConstants.openTable, {
        'restaurantId': restaurantId,
        'sessionId': staffSessionId,
        'tableId': tableId,
        if (covers != null) 'covers': covers,
      }, (json) => OpenTableResult.fromJson(json as Map<String, dynamic>), 'openTable');

  Future<ApiResponse<void>> addItem({
    required String restaurantId,
    required String tableId,
    required String tableSessionId,
    required String addedBy,
    required String menuItemId,
    required int quantity,
    Map<String, String> selectedVariants = const {},
  }) =>
      _post(ApiConstants.addItemToCart, {
        'restaurantId': restaurantId,
        'tableId': tableId,
        'sessionId': tableSessionId,
        'addedBy': addedBy,
        'menuItemId': menuItemId,
        'quantity': quantity,
        'selectedVariants': selectedVariants,
        'selectedAddons': const <String>[],
      }, (_) {}, 'addItemToCart');

  Future<ApiResponse<void>> checkout({
    required String restaurantId,
    required String tableId,
    required String tableSessionId,
    required String addedBy,
    String notes = '',
  }) =>
      _post(ApiConstants.checkoutCart, {
        'restaurantId': restaurantId,
        'tableId': tableId,
        'sessionId': tableSessionId,
        'addedBy': addedBy,
        'notes': notes,
      }, (_) {}, 'checkoutCart');
}
