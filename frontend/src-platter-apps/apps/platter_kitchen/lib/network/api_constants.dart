/// Cloud Function endpoint names consumed by the kitchen app.
///
/// These mirror the `exports[...]` keys in
/// `backend/src-plattr/functions/index.js`. Keep in sync with the backend.
class KitchenApiConstants {
  KitchenApiConstants._();

  /// Kitchen-scoped read endpoint: returns all non-completed orders with
  /// non-served carts. Backend: orders/getActiveCartsForKitchen.js
  static const String getActiveCartsForKitchen = '/order-getActiveCartsForKitchen';

  /// Cart status mutation. Shared with the server/waiter app.
  /// Backend: cart/updateCartStatus.js
  static const String updateCartStatus = '/cart-updateCartStatus';

  /// Default polling cadence for the live kitchen queue. Centralised here so
  /// the provider and any future manual-refresh code agree on the value.
  static const Duration livePollingInterval = Duration(seconds: 60);
}
