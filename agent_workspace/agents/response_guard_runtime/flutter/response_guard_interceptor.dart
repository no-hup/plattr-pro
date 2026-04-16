import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Response Guard Interceptor
/// 
/// Add this to your DioClient to capture API logs for LLM analysis.
/// Logs are written to a file that Response Guard scripts can read.
/// 
/// Usage:
/// ```dart
/// if (kDebugMode) {
///   dio.interceptors.add(ResponseGuardInterceptor());
/// }
/// ```
class ResponseGuardInterceptor extends Interceptor {
  /// Path where logs will be written
  /// Default: ~/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime/output/flutter_logs.json
  final String logPath;
  
  /// Maximum characters to capture from response body
  final int maxResponseLength;
  
  /// Whether to log request bodies (can be verbose)
  final bool logRequestBody;
  
  ResponseGuardInterceptor({
    this.logPath = '/Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime/output/flutter_logs.json',
    this.maxResponseLength = 500,
    this.logRequestBody = false,
  });
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final logEntry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'sessionId': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      'type': 'request',
      'endpoint': options.path,
      'method': options.method,
      'baseUrl': options.baseUrl,
    };
    
    if (logRequestBody && options.data != null) {
      final dataStr = options.data.toString();
      logEntry['requestBody'] = dataStr.length > maxResponseLength 
          ? dataStr.substring(0, maxResponseLength) 
          : dataStr;
    }
    
    _writeLog(logEntry);
    
    // Also print for VS Code console visibility
    if (kDebugMode) {
      debugPrint('⬆️ [ResponseGuard] ${options.method} ${options.path}');
    }
    
    handler.next(options);
  }
  
  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final responseStr = response.data.toString();
    
    final logEntry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'sessionId': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      'type': 'response',
      'endpoint': response.requestOptions.path,
      'status': response.statusCode,
      'responsePreview': responseStr.length > maxResponseLength 
          ? responseStr.substring(0, maxResponseLength) 
          : responseStr,
      'parseResult': 'pending', // Will be updated by actual parsing
    };
    
    _writeLog(logEntry);
    
    // Also print for VS Code console visibility
    if (kDebugMode) {
      debugPrint('⬇️ [ResponseGuard] ${response.statusCode} ${response.requestOptions.path}');
    }
    
    handler.next(response);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final logEntry = {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'sessionId': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      'type': 'error',
      'endpoint': err.requestOptions.path,
      'errorType': err.type.toString(),
      'errorCode': _extractErrorCode(err),
      'message': err.message ?? 'Unknown error',
      'statusCode': err.response?.statusCode,
    };
    
    _writeLog(logEntry);
    
    // Also print for VS Code console visibility
    if (kDebugMode) {
      debugPrint('❌ [ResponseGuard] Error: ${err.type} ${err.requestOptions.path}');
    }
    
    handler.next(err);
  }
  
  String? _extractErrorCode(DioException err) {
    try {
      final data = err.response?.data;
      if (data is Map) {
        // Try common error code locations
        return data['code'] as String? 
            ?? data['errorCode'] as String?
            ?? (data['result'] as Map?)?['code'] as String?
            ?? (data['error'] as Map?)?['code'] as String?;
      }
    } catch (_) {}
    return null;
  }
  
  void _writeLog(Map<String, dynamic> data) {
    if (!kDebugMode) return; // Only log in debug mode
    
    try {
      final file = File(logPath);
      
      // Ensure directory exists
      final dir = file.parent;
      if (!dir.existsSync()) {
        dir.createSync(recursive: true);
      }
      
      // Append JSON line
      file.writeAsStringSync(
        '${jsonEncode(data)}\n',
        mode: FileMode.append,
      );
    } catch (e) {
      // Silently fail - don't break the app for logging
      if (kDebugMode) {
        debugPrint('[ResponseGuard] Log write failed: $e');
      }
    }
  }
  
  /// Clear the log file (call at app start for fresh session)
  void clearLogs() {
    try {
      final file = File(logPath);
      if (file.existsSync()) {
        file.writeAsStringSync('');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ResponseGuard] Clear logs failed: $e');
      }
    }
  }
}
