import 'package:flutter/material.dart';
import 'package:flutterboilerplate/home/home_repository.dart';
import 'package:flutterboilerplate/home/models/restaurant_summary.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class HomeState extends ChangeNotifier {
  HomeState(this._repository);

  final HomeRepository _repository;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  bool _hasLoadedOnce = false;

  List<RestaurantSummary> _restaurants = const [];
  List<RestaurantSummary> get restaurants => _restaurants;

  bool get isEmpty => !_isLoading && _error == null && _restaurants.isEmpty;

  Future<void> loadRestaurants({bool forceRefresh = false}) async {
    if (_isLoading) return;
    if (_hasLoadedOnce && !forceRefresh) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    final response = await _repository.fetchRestaurants();
    if (response.success) {
      _restaurants = response.data ?? const [];
      _hasLoadedOnce = true;
    } else {
      AppLogger.log('❌ HomeState: ${response.message}');
      _error = response.message;
      _restaurants = const [];
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> retry() => loadRestaurants(forceRefresh: true);
}
