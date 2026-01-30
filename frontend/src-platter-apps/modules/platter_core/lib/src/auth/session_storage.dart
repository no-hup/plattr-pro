import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../logging/app_logger.dart';

/// Session data to be persisted
class SessionData {
  final String sessionId;
  final String restaurantId;
  final String staffId;
  final String staffName;
  final String restaurantName;
  final String role;
  final DateTime expiresAt;

  SessionData({
    required this.sessionId,
    required this.restaurantId,
    required this.staffId,
    required this.staffName,
    required this.restaurantName,
    required this.role,
    required this.expiresAt,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'restaurantId': restaurantId,
        'staffId': staffId,
        'staffName': staffName,
        'restaurantName': restaurantName,
        'role': role,
        'expiresAt': expiresAt.toIso8601String(),
      };

  factory SessionData.fromJson(Map<String, dynamic> json) {
    return SessionData(
      sessionId: json['sessionId'] as String? ?? '',
      restaurantId: json['restaurantId'] as String? ?? '',
      staffId: json['staffId'] as String? ?? '',
      staffName: json['staffName'] as String? ?? '',
      restaurantName: json['restaurantName'] as String? ?? '',
      role: json['role'] as String? ?? '',
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}

/// Service for persisting and retrieving authentication sessions.
class SessionStorage {
  static const String _sessionKey = 'platter_session';
  final FlutterSecureStorage _storage;

  SessionStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Save session data securely
  Future<void> saveSession(SessionData session) async {
    try {
      final jsonString = jsonEncode(session.toJson());
      await _storage.write(key: _sessionKey, value: jsonString);
      AppLogger.debug('Session saved successfully');
    } catch (e) {
      AppLogger.error('Failed to save session', error: e);
    }
  }

  /// Retrieve stored session, returns null if not found or expired
  Future<SessionData?> getSession() async {
    try {
      final jsonString = await _storage.read(key: _sessionKey);
      if (jsonString == null || jsonString.isEmpty) {
        return null;
      }

      final json = jsonDecode(jsonString) as Map<String, dynamic>;
      final session = SessionData.fromJson(json);

      if (session.isExpired) {
        AppLogger.debug('Session expired, clearing');
        await clearSession();
        return null;
      }

      if (session.sessionId.isEmpty) {
        AppLogger.warning('Stored session has empty sessionId');
        await clearSession();
        return null;
      }

      return session;
    } catch (e) {
      AppLogger.error('Failed to retrieve session', error: e);
      return null;
    }
  }

  /// Clear stored session
  Future<void> clearSession() async {
    try {
      await _storage.delete(key: _sessionKey);
      AppLogger.debug('Session cleared');
    } catch (e) {
      AppLogger.error('Failed to clear session', error: e);
    }
  }

  /// Check if a valid session exists
  Future<bool> hasValidSession() async {
    final session = await getSession();
    return session != null && !session.isExpired;
  }
}
