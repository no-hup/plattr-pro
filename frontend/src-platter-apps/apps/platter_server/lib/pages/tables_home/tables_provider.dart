import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'repository/table_api_service.dart';
import 'models/table_models.dart';


/// The backend returns tables in Firestore document-id order, which puts
/// table "10" before table "2". Sort numerically when the table numbers are.
int _byTableNumber(TableModel a, TableModel b) {
  final aNumber = int.tryParse(a.tableNumber);
  final bNumber = int.tryParse(b.tableNumber);
  if (aNumber != null && bNumber != null) return aNumber.compareTo(bNumber);
  return a.tableNumber.compareTo(b.tableNumber);
}

class TablesProvider extends ChangeNotifier {
  final TableApiService _apiService;

  // State variables
  DataState _state = DataState.initial;
  List<TableModel> _tables = [];
  String? _errorMessage;
  bool _isRefreshing = false;

  // Selected table for details
  TableModel? _selectedTable;

  // Getters
  DataState get state => _state;
  List<TableModel> get tables => _tables;
  String? get errorMessage => _errorMessage;
  bool get isRefreshing => _isRefreshing;
  TableModel? get selectedTable => _selectedTable;
  bool get hasTables => _tables.isNotEmpty;

  TablesProvider({required TableApiService apiService})
      : _apiService = apiService;

  /// Fetch all tables for a restaurant
  Future<void> fetchTables({
    required String restaurantId,
  }) async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getRestaurantTables(
      restaurantId: restaurantId,
    );

    if (response.success && response.data != null) {
      _tables = response.data!..sort(_byTableNumber);
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to load tables';
      _state = DataState.error;
    }

    notifyListeners();
  }

  /// Refresh tables
  Future<void> refreshTables({
    required String restaurantId,
  }) async {
    _isRefreshing = true;
    notifyListeners();

    final response = await _apiService.getRestaurantTables(
      restaurantId: restaurantId,
    );

    if (response.success && response.data != null) {
      _tables = response.data!..sort(_byTableNumber);
      _state = DataState.loaded;
      _errorMessage = null;
    } else {
      _errorMessage = response.message;
      _state = DataState.error;
    }

    _isRefreshing = false;
    notifyListeners();
  }

  /// Get details for a specific table
  Future<void> getTableDetails({
    required String restaurantId,
    required String tableId,
  }) async {
    final response = await _apiService.getTableDetails(
      restaurantId: restaurantId,
      tableId: tableId,
    );

    if (response.success && response.data != null) {
      _selectedTable = response.data;

      // Also update this table in the list if it exists
      final index = _tables.indexWhere((t) => t.tableId == tableId);
      if (index >= 0) {
        _tables[index] = response.data!;
      }
    } else {
      _errorMessage = response.message ?? 'Failed to load table details';
    }

    notifyListeners();
  }

  /// Update status of a table
  Future<bool> updateTableStatus({
    required String restaurantId,
    required String tableId,
    required String status,
    required String sessionId,
  }) async {
    final response = await _apiService.updateTableStatus(
      restaurantId: restaurantId,
      tableId: tableId,
      status: status,
      sessionId: sessionId,
    );

    if (response.success && response.data != null && response.data!.changed) {
      // Update the table in our list
      final index = _tables.indexWhere((t) => t.tableId == tableId);
      if (index >= 0) {
        final updatedTable = TableModel(
          tableNumber: _tables[index].tableNumber,
          tableId: _tables[index].tableId,
          capacity: _tables[index].capacity,
          status: status,
          isDisabled: _tables[index].isDisabled,
          currentOrderId: _tables[index].currentOrderId,
          tableOtp: _tables[index].tableOtp,
          primaryCustomer: _tables[index].primaryCustomer,
        );
        _tables[index] = updatedTable;

        // Also update selected table if it's the same one
        if (_selectedTable?.tableId == tableId) {
          _selectedTable = updatedTable;
        }
        refreshTables(restaurantId: restaurantId);
        notifyListeners();
      }
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to update table status';
      notifyListeners();
      return false;
    }
  }

  /// Generate/refresh OTP for a table using Firebase Cloud Function
  Future<String?> refreshTableOtp({
    required String restaurantId,
    required String tableId,
    required String sessionId,
  }) async {
    final response = await _apiService.generateTableOTP(
      restaurantId: restaurantId,
      tableId: tableId,
      sessionId: sessionId,
    );

    if (response.success && response.data != null) {
      final tableOtpResponse = response.data!;
      final newOtp = tableOtpResponse.otp;

      // Update the OTP in our selected table
      if (_selectedTable?.tableId == tableId) {
        _selectedTable = TableModel(
          tableNumber: _selectedTable!.tableNumber,
          tableId: _selectedTable!.tableId,
          capacity: _selectedTable!.capacity,
          status: _selectedTable!.status,
          isDisabled: _selectedTable!.isDisabled,
          currentOrderId: _selectedTable!.currentOrderId,
          tableOtp: newOtp,
          primaryCustomer: _selectedTable!.primaryCustomer,
        );
      }

      // Also update the table in our list if it exists
      final index = _tables.indexWhere((t) => t.tableId == tableId);
      if (index >= 0) {
        _tables[index] = TableModel(
          tableNumber: _tables[index].tableNumber,
          tableId: _tables[index].tableId,
          capacity: _tables[index].capacity,
          status: _tables[index].status,
          isDisabled: _tables[index].isDisabled,
          currentOrderId: _tables[index].currentOrderId,
          tableOtp: newOtp,
          primaryCustomer: _tables[index].primaryCustomer,
        );
      }

      notifyListeners();
      return newOtp;
    } else {
      _errorMessage = response.message ?? 'Failed to generate table OTP';
      notifyListeners();
      return null;
    }
  }

  /// Set selected table
  void setSelectedTable(TableModel table) {
    _selectedTable = table;
    notifyListeners();
  }

  /// Clear selected table
  void clearSelectedTable() {
    _selectedTable = null;
    notifyListeners();
  }
}
