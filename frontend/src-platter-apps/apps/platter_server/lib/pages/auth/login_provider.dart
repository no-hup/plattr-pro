import 'package:flutter/material.dart';
// import '../../models/data_state.dart'; // Removed incorrect import
import '../auth/models/login_request.dart';
import '../auth/models/login_response_data.dart';
import '../auth/repository/login_api_service.dart';
import '../../../network/api_response.dart';

enum DataState { initial, loading, loaded, error }

class LoginProvider extends ChangeNotifier {
  final LoginApiService _apiService;

  LoginProvider({required LoginApiService apiService}) : _apiService = apiService;

  DataState _state = DataState.initial;
  LoginResponseData? _loginData;
  String? _errorMessage;

  DataState get state => _state;
  LoginResponseData? get loginData => _loginData;
  String? get errorMessage => _errorMessage;

  bool get isLoading => _state == DataState.loading;

  Future<void> loginUser({
    required String restaurantId,
    String? username,
    String? password,
    String? sessionId,
  }) async {
    _state = DataState.loading;
    _errorMessage = null;
    _loginData = null;
    notifyListeners();

    final request = LoginRequest(
      restaurantId: restaurantId,
      username: username,
      password: password,
      sessionId: sessionId,
    );

    try {
      final ApiResponse<LoginResponseData> response = await _apiService.login(request);

      if (response.success && response.data != null) {
        _loginData = response.data;
        _state = DataState.loaded;
      } else {
        _errorMessage = response.message ?? 'Login failed';
        _state = DataState.error;
      }
    } catch (e) {
      _errorMessage = 'An unexpected error occurred: $e';
      _state = DataState.error;
    }
    notifyListeners();
  }

  void resetState() {
    _state = DataState.initial;
    _loginData = null;
    _errorMessage = null;
    notifyListeners();
  }
}
