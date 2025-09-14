import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Conditional import for web
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._();
  factory SecureStorageService() => _instance;
  SecureStorageService._();

  static const _tokenKey = 'auth_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<String?> getToken() async {
    if (kIsWeb) {
      return html.window.sessionStorage[_tokenKey];
    } else {
      return await _storage.read(key: _tokenKey);
    }
  }

  Future<void> setToken(String token) async {
    if (kIsWeb) {
      html.window.sessionStorage[_tokenKey] = token;
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Future<void> clearToken() async {
    if (kIsWeb) {
      html.window.sessionStorage.remove(_tokenKey);
    } else {
      await _storage.delete(key: _tokenKey);
    }
  }
}
