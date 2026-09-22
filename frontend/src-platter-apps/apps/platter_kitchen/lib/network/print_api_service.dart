import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

/// KT · the agent's four calls plus its config read. Sheet: moonshot/SPEC_KT_print_path.md v4, R13.
///
/// Every call carries the kitchen app's STAFF session (an install id is not a credential) and
/// `{ kind: 'kitchen', agentId }`. The server checks `kind` against `print.agents` and records
/// `agentId` as the lease holder. Endpoint names mirror `exports.print` in index.js.
class PrintApiService {
  PrintApiService({Dio? dio}) : _dio = dio ?? DioClient().dio;

  final Dio _dio;

  Future<ApiResponse<Map<String, dynamic>>> _post(
      String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(endpoint, data: {'data': data});
      return ResponseParser.parse<Map<String, dynamic>>(
          response, (j) => (j as Map<String, dynamic>?) ?? <String, dynamic>{});
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: endpoint);
      return ApiResponse<Map<String, dynamic>>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>.error(
          'Unexpected error on $endpoint: $e',
          errorCode: 'parsing_error');
    }
  }

  Map<String, dynamic> _agent(
          {required String restaurantId,
          required String sessionId,
          required String agentId}) =>
      {
        'restaurantId': restaurantId,
        'sessionId': sessionId,
        'kind': 'kitchen',
        'agentId': agentId
      };

  /// Stations, poll and retry numbers. Never the PIN policy (that is `approvals-config`, the till's read).
  Future<ApiResponse<Map<String, dynamic>>> config(
          {required String restaurantId, required String sessionId}) =>
      _post('/print-config',
          {'restaurantId': restaurantId, 'sessionId': sessionId});

  Future<ApiResponse<Map<String, dynamic>>> pending(
          {required String restaurantId,
          required String sessionId,
          required String agentId}) =>
      _post(
          '/print-pending',
          _agent(
              restaurantId: restaurantId,
              sessionId: sessionId,
              agentId: agentId));

  /// Answers `{ jobId, ticketNo, stationId, bytes (base64), copies }`. The same agent asking again inside its
  /// lease gets the same bytes: a lost answer is recovered by asking again (R4).
  Future<ApiResponse<Map<String, dynamic>>> claim(
          {required String restaurantId,
          required String sessionId,
          required String agentId,
          required String jobId}) =>
      _post('/print-claim', {
        ..._agent(
            restaurantId: restaurantId, sessionId: sessionId, agentId: agentId),
        'jobId': jobId
      });

  Future<ApiResponse<Map<String, dynamic>>> ack(
          {required String restaurantId,
          required String sessionId,
          required String agentId,
          required String jobId}) =>
      _post('/print-ack', {
        ..._agent(
            restaurantId: restaurantId, sessionId: sessionId, agentId: agentId),
        'jobId': jobId
      });

  Future<ApiResponse<Map<String, dynamic>>> fail(
          {required String restaurantId,
          required String sessionId,
          required String agentId,
          required String jobId,
          required String reason}) =>
      _post('/print-fail', {
        ..._agent(
            restaurantId: restaurantId, sessionId: sessionId, agentId: agentId),
        'jobId': jobId,
        'reason': reason
      });
}
