import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutterboilerplate/models/SessionState.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'dart:html' if (dart.library.io) '../session_storage_stub.dart';

/// Service responsible for persisting session data
/// Uses sessionStorage on web platforms, which persists through
/// page refreshes but is cleared when the browser tab is closed
class SessionStorageService {
  static const String _sessionStateKey = 'restaurant_session_state';
  
  /// Singleton pattern implementation
  SessionStorageService._();
  static final SessionStorageService _instance = SessionStorageService._();
  factory SessionStorageService() => _instance;

  /// Loads session data from storage
  /// Returns null if no session is found or if the session is invalid/expired
  SessionState? loadSession() {
    if (!kIsWeb) {
      AppLogger.log('📦 SessionStorage: Load skipped - Not running on web platform');
      return null;
    }
    
    try {
      final sessionData = window.sessionStorage[_sessionStateKey];
      if (sessionData == null) {
        AppLogger.log('📦 SessionStorage: No stored session found in sessionStorage');
        return null;
      }
      
      AppLogger.log('📦 SessionStorage: Found stored session data: $sessionData');
      
      final Map<String, dynamic> decodedData = 
          jsonDecode(sessionData) as Map<String, dynamic>;
      
      // Check if session has expired
      final sessionExpiresAt = decodedData['sessionExpiresAt'] as String?;
      if (sessionExpiresAt != null) {
        final expiryTime = DateTime.tryParse(sessionExpiresAt);
        if (expiryTime != null && expiryTime.isBefore(DateTime.now())) {
          AppLogger.log('📦 SessionStorage: ⚠️ Stored session has expired - expiry time: $sessionExpiresAt');
          clearSession();
          return null;
        }
      }
      
      // Create SessionState from stored data
      final sessionState = SessionState(
        sessionId: decodedData['sessionId'] as String?,
        sessionExpiresAt: sessionExpiresAt,
        restaurantId: decodedData['restaurantId'] as String?,
        tableId: decodedData['tableId'] as String?,
        userName: decodedData['userName'] as String?,
        phoneNumber: decodedData['phoneNumber'] as String?,
        isAuthenticated: decodedData['isAuthenticated'] as bool? ?? false,
        isPrimaryCustomer: decodedData['isPrimaryCustomer'] as bool? ?? false,
        otpRequiredForOrder: decodedData['otpRequiredForOrder'] as bool? ?? false,
      );
      
      AppLogger.log('📦 SessionStorage: ✅ Successfully restored session with ID: ${sessionState.sessionId}');
      AppLogger.log('📦 SessionStorage: Session details - '
          'authenticated: ${sessionState.isAuthenticated}, '
          'isPrimary: ${sessionState.isPrimaryCustomer}, '
          'expiresAt: ${sessionState.sessionExpiresAt ?? "unspecified"}');
      return sessionState;
    } catch (e) {
      AppLogger.log('📦 SessionStorage: ❌ Error loading session: $e');
      clearSession();
      return null;
    }
  }
  
  /// Saves session data to storage
  /// Returns true if the operation was successful
  bool saveSession(SessionState sessionState) {
    if (!kIsWeb) {
      AppLogger.log('📦 SessionStorage: Save skipped - Not running on web platform');
      return false;
    }
    
    try {
      if (sessionState.sessionId == null) {
        AppLogger.log('📦 SessionStorage: Save skipped - No sessionId provided');
        clearSession();
        return false;
      }
      
      // Create a map with just the necessary session data
      final sessionData = {
        'sessionId': sessionState.sessionId,
        'sessionExpiresAt': sessionState.sessionExpiresAt,
        'restaurantId': sessionState.restaurantId,
        'tableId': sessionState.tableId,
        'userName': sessionState.userName,
        'phoneNumber': sessionState.phoneNumber,
        'isAuthenticated': sessionState.isAuthenticated,
        'isPrimaryCustomer': sessionState.isPrimaryCustomer,
        'otpRequiredForOrder': sessionState.otpRequiredForOrder,
      };
      
      final jsonData = jsonEncode(sessionData);
      window.sessionStorage[_sessionStateKey] = jsonData;
      
      AppLogger.log('📦 SessionStorage: ✅ Saved session to sessionStorage');
      AppLogger.log('📦 SessionStorage: Session ID: ${sessionState.sessionId}');
      AppLogger.log('📦 SessionStorage: Saved data: $jsonData');
      return true;
    } catch (e) {
      AppLogger.log('📦 SessionStorage: ❌ Error saving session: $e');
      return false;
    }
  }
  
  /// Clears session data from storage
  void clearSession() {
    if (!kIsWeb) {
      AppLogger.log('📦 SessionStorage: Clear skipped - Not running on web platform');
      return;
    }
    
    try {
      window.sessionStorage.remove(_sessionStateKey);
      AppLogger.log('📦 SessionStorage: 🗑️ Cleared session data from sessionStorage');
    } catch (e) {
      AppLogger.log('📦 SessionStorage: ❌ Error clearing session: $e');
    }
  }
} 