import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';

import 'models/offer_model.dart';
import 'offers_api_service.dart';

/// ChangeNotifier managing offers state for the admin app.
///
/// Mirrors `StaffProvider`: loads, mutates, and refreshes the list from the
/// backend, surfaces `DataState` transitions for the view layer, and returns
/// simple booleans/models for success so dialogs can decide whether to close.
class OffersProvider extends ChangeNotifier {
  final OffersApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  List<OfferModel> _offers = [];

  OffersProvider({
    required OffersApiService apiService,
    required this.restaurantId,
    required this.sessionId,
  }) : _apiService = apiService;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  List<OfferModel> get offers => _offers;

  /// Load all offers for the current restaurant.
  Future<void> loadOffers() async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getOffers(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    if (response.success && response.data != null) {
      _offers = response.data!;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to load offers';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Create a new offer. Returns the created offer on success, null on failure.
  Future<OfferModel?> createOffer(Map<String, dynamic> offerData) async {
    final response = await _apiService.createOffer(
      restaurantId: restaurantId,
      sessionId: sessionId,
      offerData: offerData,
    );

    if (response.success && response.data != null) {
      await loadOffers();
      return response.data;
    } else {
      _errorMessage = response.message ?? 'Failed to create offer';
      notifyListeners();
      return null;
    }
  }

  /// Update an existing offer by id.
  Future<bool> updateOffer(
    String offerId,
    Map<String, dynamic> offerData,
  ) async {
    final response = await _apiService.updateOffer(
      restaurantId: restaurantId,
      sessionId: sessionId,
      offerId: offerId,
      offerData: offerData,
    );

    if (response.success) {
      await loadOffers();
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to update offer';
      notifyListeners();
      return false;
    }
  }

  /// Delete an offer by id.
  Future<bool> deleteOffer(String offerId) async {
    final response = await _apiService.deleteOffer(
      restaurantId: restaurantId,
      sessionId: sessionId,
      offerId: offerId,
    );

    if (response.success) {
      await loadOffers();
      return true;
    } else {
      _errorMessage = response.message ?? 'Failed to delete offer';
      notifyListeners();
      return false;
    }
  }

  /// Convenience: flip `isActive` on an existing offer via `updateOffer`.
  Future<bool> toggleActive(String offerId, bool value) async {
    return updateOffer(offerId, {'isActive': value});
  }
}
