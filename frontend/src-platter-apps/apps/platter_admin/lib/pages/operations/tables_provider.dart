import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'tables_api_service.dart';

/// The backend returns tables in Firestore document-id order, which puts
/// table "10" before table "2". Sort numerically when the table numbers are.
int _byTableNumber(TableInfo a, TableInfo b) {
  final aNumber = int.tryParse(a.number);
  final bNumber = int.tryParse(b.number);
  if (aNumber != null && bNumber != null) return aNumber.compareTo(bNumber);
  return a.number.compareTo(b.number);
}

/// Provider for table management state
class TablesProvider extends ChangeNotifier {
  final TablesApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  List<TableInfo> _tables = [];

  TablesProvider({
    required TablesApiService apiService,
    required this.restaurantId,
    required this.sessionId,
  }) : _apiService = apiService;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  List<TableInfo> get tables => _tables;

  /// Get counts for dashboard display
  int get totalTables => _tables.length;
  int get occupiedTables => _tables.where((t) => t.isOccupied).length;
  int get availableTables =>
      _tables.where((t) => t.isVacant && !t.isDisabled).length;
  int get disabledTables => _tables.where((t) => t.isDisabled).length;

  /// Load all tables
  Future<void> loadTables() async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getTables(
      restaurantId: restaurantId,
      sessionId: sessionId,
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

  /// Toggle table enabled/disabled status
  Future<bool> toggleTableStatus(String tableId, bool enabled) async {
    final status = enabled ? TableStatus.vacant : TableStatus.disabled;

    final response = await _apiService.updateTableStatus(
      restaurantId: restaurantId,
      sessionId: sessionId,
      tableId: tableId,
      status: status,
    );

    if (response.success) {
      await loadTables(); // Refresh list
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to update table';
      notifyListeners();
      return false;
    }
  }

  /// Update table details
  Future<bool> updateTable({
    required String tableId,
    String? number,
    int? capacity,
  }) async {
    final updateData = <String, dynamic>{};
    if (number != null) updateData['number'] = number;
    if (capacity != null) updateData['capacity'] = capacity;

    if (updateData.isEmpty) return true;

    final response = await _apiService.updateTable(
      restaurantId: restaurantId,
      sessionId: sessionId,
      tableId: tableId,
      updateData: updateData,
    );

    if (response.success) {
      await loadTables(); // Refresh list
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to update table';
      notifyListeners();
      return false;
    }
  }
}
