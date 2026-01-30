import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'staff_api_service.dart';

/// Provider for staff management state
class StaffProvider extends ChangeNotifier {
  final StaffApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  List<StaffMember> _staff = [];

  StaffProvider({
    required StaffApiService apiService,
    required this.restaurantId,
    required this.sessionId,
  }) : _apiService = apiService;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  List<StaffMember> get staff => _staff;

  /// Load all staff members
  Future<void> loadStaff() async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getServers(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    if (response.success && response.data != null) {
      _staff = response.data!;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to load staff';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Add a new staff member
  Future<AddServerResponse?> addStaff({
    required String name,
    String? phoneNumber,
    String? email,
    String role = 'SERVER',
    String? password,
  }) async {
    final input = StaffMemberInput(
      name: name,
      phoneNumber: phoneNumber,
      email: email,
      role: role,
      password: password,
    );

    final response = await _apiService.addServer(
      restaurantId: restaurantId,
      sessionId: sessionId,
      server: input,
    );

    if (response.success && response.data != null) {
      await loadStaff(); // Refresh list
      return response.data;
    } else {
      _errorMessage = response.message ?? 'Failed to add staff';
      notifyListeners();
      return null;
    }
  }

  /// Update a staff member
  Future<bool> updateStaff({
    required String serverId,
    String? name,
    String? phoneNumber,
    String? email,
    String? role,
    String? status,
  }) async {
    final updateData = <String, dynamic>{};
    if (name != null) updateData['name'] = name;
    if (phoneNumber != null) updateData['phoneNumber'] = phoneNumber;
    if (email != null) updateData['email'] = email;
    if (role != null) updateData['role'] = role;
    if (status != null) updateData['status'] = status;

    if (updateData.isEmpty) return true;

    final response = await _apiService.updateServer(
      restaurantId: restaurantId,
      sessionId: sessionId,
      serverId: serverId,
      updateData: updateData,
    );

    if (response.success) {
      await loadStaff(); // Refresh list
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to update staff';
      notifyListeners();
      return false;
    }
  }

  /// Toggle staff active status
  Future<bool> toggleStaffStatus(String serverId, bool isActive) async {
    return updateStaff(
      serverId: serverId,
      status: isActive ? 'active' : 'inactive',
    );
  }

  /// Reset a staff member's PIN
  Future<ResetPinResponse?> resetPin(String serverId, {String? newPin}) async {
    final response = await _apiService.resetServerPin(
      restaurantId: restaurantId,
      sessionId: sessionId,
      serverId: serverId,
      newPin: newPin,
    );

    if (response.success && response.data != null) {
      return response.data;
    } else {
      _errorMessage = response.message ?? 'Failed to reset PIN';
      notifyListeners();
      return null;
    }
  }
}
