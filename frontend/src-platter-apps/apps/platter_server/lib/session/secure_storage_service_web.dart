// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._();
  factory SecureStorageService() => _instance;
  SecureStorageService._();

  static const _tokenKey = 'auth_token';

  Future<String?> getToken() async {
    return html.window.sessionStorage[_tokenKey];
  }

  Future<void> setToken(String token) async {
    html.window.sessionStorage[_tokenKey] = token;
  }

  Future<void> clearToken() async {
    html.window.sessionStorage.remove(_tokenKey);
  }
}
