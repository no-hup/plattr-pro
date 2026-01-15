import 'package:flutter/foundation.dart';
import 'package:flutterboilerplate/pages/menuListing/models/offer.dart';
import 'package:flutterboilerplate/pages/menuListing/offers_repository.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Mixin providing shared offers state and fetching logic.
/// 
/// This eliminates code duplication between MenuState and CartListingState.
/// Both states manage offers fetching with debouncing to prevent excessive API calls.
mixin OffersStateMixin on ChangeNotifier {
  // Repository instance - created once per mixin use
  final OffersRepository _offersRepository = OffersRepository();
  
  // Offers state
  List<Offer> _offers = [];
  List<Offer> get offers => _offers;
  
  bool _isLoadingOffers = false;
  bool get isLoadingOffers => _isLoadingOffers;
  
  // Debounce tracking
  DateTime? _lastOffersFetch;
  
  /// Debounce threshold in seconds - skip fetch if called within this window
  static const int _offersFetchDebounceSeconds = 30;
  
  /// Override in subclass to provide session ID for session-based offers.
  /// Return null if session is not available.
  String? getSessionIdForOffers();
  
  /// Fetches offers in the background without blocking UI.
  /// Safe to call from initState or after main data load.
  void fetchOffersInBackground({
    required String restaurantId,
    required String tableId,
  }) {
    // Fire and forget - don't await
    fetchOffers(restaurantId: restaurantId, tableId: tableId);
  }
  
  /// Fetches applicable offers for the current restaurant/cart.
  /// 
  /// Includes debouncing: skips fetch if called within [_offersFetchDebounceSeconds].
  /// Called after menu/cart load and on app resume.
  Future<void> fetchOffers({
    required String restaurantId,
    String? tableId,
  }) async {
    // Debounce check - skip if fetched recently
    if (_lastOffersFetch != null) {
      final secondsSinceLastFetch = DateTime.now().difference(_lastOffersFetch!).inSeconds;
      if (secondsSinceLastFetch < _offersFetchDebounceSeconds) {
        AppLogger.log('🎁 OFFERS: Skipping fetch (debounced, ${secondsSinceLastFetch}s ago)');
        return;
      }
    }
    
    try {
      _isLoadingOffers = true;
      // Don't notify here to avoid unnecessary rebuilds during load
      
      AppLogger.log('🎁 OFFERS: Fetching offers for restaurant $restaurantId');
      
      final response = await _offersRepository.getApplicableOffers(
        restaurantId: restaurantId,
        tableId: tableId,
        sessionId: getSessionIdForOffers(),
      );
      
      _lastOffersFetch = DateTime.now();
      
      if (response.success && response.data != null) {
        _offers = response.data!.offers;
        AppLogger.log('🎁 OFFERS: Loaded ${_offers.length} offers');
      } else {
        AppLogger.log('⚠️ OFFERS: Failed to fetch - ${response.message}');
        _offers = [];
      }
      
      _isLoadingOffers = false;
      notifyListeners();
    } catch (e) {
      AppLogger.log('❌ OFFERS: Error fetching - $e');
      _isLoadingOffers = false;
      _offers = [];
      notifyListeners();
    }
  }
}
