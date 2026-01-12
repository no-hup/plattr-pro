import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Response Guard Interceptor
///
/// Captures API requests, responses, and errors for LLM analysis.
/// For web: Logs to console with structured format that can be copied.
/// For mobile: Logs are captured via flutter logs command.
class ResponseGuardInterceptor extends Interceptor {
  ResponseGuardInterceptor({
    this.maxResponseLength = 500,
  });

  /// Maximum characters to capture from response body
  final int maxResponseLength;

  /// In-memory log storage (for programmatic access)
  static final List<Map<String, dynamic>> logs = [];

  /// Clear all logs
  static void clearLogs() {
    logs.clear();
    debugPrint('[ResponseGuard] ✅ Logs cleared');
  }

  /// Get logs as JSON string (for copying)
  static String getLogsAsJson() {
    return logs.map(jsonEncode).join('\n');
  }

  /// Print all logs summary
  static void printSummary() {
    debugPrint('[ResponseGuard] ═══════════════════════════════════════');
    debugPrint('[ResponseGuard] 📊 Session Summary: ${logs.length} entries');
    for (final log in logs) {
      final type = log['type'];
      final endpoint = log['endpoint'];
      if (type == 'request') {
        debugPrint('[ResponseGuard] ⬆️ ${log['method']} $endpoint');
      } else if (type == 'response') {
        debugPrint('[ResponseGuard] ⬇️ [${log['status']}] $endpoint');
      } else if (type == 'error') {
        debugPrint('[ResponseGuard] ❌ ${log['errorType']} $endpoint');
      }
    }
    debugPrint('[ResponseGuard] ═══════════════════════════════════════');
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final entry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'request',
      'endpoint': options.path,
      'method': options.method,
      'log': '⬆️ ${options.method} ${options.path}',
    };
    _addLog(entry);
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final responseStr = response.data.toString();
    final preview = responseStr.length > maxResponseLength
        ? responseStr.substring(0, maxResponseLength)
        : responseStr;

    final entry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'response',
      'endpoint': response.requestOptions.path,
      'status': response.statusCode,
      'responsePreview': preview,
      'log': '⬇️ [${response.statusCode}] ${response.requestOptions.path}',
    };
    _addLog(entry);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final entry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'error',
      'endpoint': err.requestOptions.path,
      'errorType': err.type.toString(),
      'message': err.message ?? 'Unknown error',
      'log': '❌ ${err.type} ${err.requestOptions.path}: ${err.message}',
    };
    _addLog(entry);
    handler.next(err);
  }

  void _addLog(Map<String, dynamic> entry) {
    if (!kDebugMode) return;

    logs.add(entry);

    // Print structured log to console (for flutter logs capture)
    debugPrint('[ResponseGuard] ${entry['log']}');

    // Also print JSON for easy copying
    debugPrint('[ResponseGuard:JSON] ${jsonEncode(entry)}');
  }
}

