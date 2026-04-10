import 'package:platter_core/platter_core.dart';

import '../models/active_order_models.dart';
import '../models/order_models.dart';
import '../network/network.dart';

/// Exception surfaced when a kitchen API call fails with an
/// authentication/precondition error (expired session, kicked out, etc).
///
/// The provider uses this type to distinguish "stop polling, show reconnect"
/// from a normal transient failure.
class KitchenSessionExpiredException implements Exception {
  KitchenSessionExpiredException(this.message);
  final String message;

  @override
  String toString() => 'KitchenSessionExpiredException: $message';
}

/// Exception surfaced when a cart status transition is rejected by the
/// backend (e.g. trying to Mark Ready on a cart that is already READY/SERVED).
class KitchenCartTransitionException implements Exception {
  KitchenCartTransitionException(this.message);
  final String message;

  @override
  String toString() => 'KitchenCartTransitionException: $message';
}

/// Repository for kitchen read/write operations.
///
/// Phase scope:
///  - live queue: real backend-backed
///  - history: deferred (explicit placeholder)
///  - mutation: cart-level only, Mark Ready
class KitchenRepository {
  KitchenRepository({KitchenOrderApiService? apiService})
      : _apiService = apiService ?? KitchenOrderApiService();

  final KitchenOrderApiService _apiService;

  // ----------------------------------------------------------------------
  // Live queue
  // ----------------------------------------------------------------------

  /// Fetches active carts for the live kitchen view.
  ///
  /// Flattens the backend `orders[].carts[]` shape into one
  /// [ActiveKitchenCart] per non-served cart.
  Future<ActiveCartsResponse> getActiveCarts({
    required String restaurantId,
    required String sessionId,
  }) async {
    final response = await _apiService.getActiveCartsForKitchen(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    if (response.isError) {
      // Surface session-expiry / precondition errors as a distinct type so
      // the provider can stop polling instead of retrying forever.
      final code = response.errorCode ?? '';
      if (_isSessionExpiryCode(code)) {
        throw KitchenSessionExpiredException(
          response.message ?? 'Session expired',
        );
      }
      throw Exception(response.message ?? 'Failed to load active carts');
    }

    final raw = response.data ?? const <String, dynamic>{};
    final orders = (raw['orders'] as List<dynamic>? ?? const []);

    final carts = <ActiveKitchenCart>[];
    for (final order in orders) {
      if (order is! Map<String, dynamic>) continue;
      carts.addAll(_flattenOrderToActiveCarts(order));
    }

    return ActiveCartsResponse(
      carts: carts,
      widgetType: KitchenViewType.cart,
    );
  }

  // ----------------------------------------------------------------------
  // Mutation: Mark Ready
  // ----------------------------------------------------------------------

  /// Marks a single cart as READY via `cart-updateCartStatus`.
  ///
  /// [cartId] is the composite id produced by [_flattenOrderToActiveCarts]
  /// in the form `"{orderId}_{cartIndex}"`.
  Future<void> markCartReady({
    required String restaurantId,
    required String sessionId,
    required String cartId,
  }) async {
    final parsed = _parseCompositeCartId(cartId);
    if (parsed == null) {
      throw Exception('Invalid cartId: $cartId');
    }
    final (orderId, cartIndex) = parsed;

    final response = await _apiService.updateCartStatus(
      restaurantId: restaurantId,
      orderId: orderId,
      cartIndex: cartIndex,
      newStatus: 'READY',
      sessionId: sessionId,
    );

    if (response.isError) {
      final code = response.errorCode ?? '';
      if (_isSessionExpiryCode(code)) {
        throw KitchenSessionExpiredException(
          response.message ?? 'Session expired',
        );
      }
      // Backend rejects invalid state-machine transitions as generic errors
      // (see backend/src-plattr/functions/cart/updateCartStatus.js). We
      // normalize that into a user-friendly transition exception.
      if (_looksLikeTransitionRejection(response.message)) {
        throw KitchenCartTransitionException(
          response.message ?? 'Cannot mark this cart as ready.',
        );
      }
      throw Exception(response.message ?? 'Failed to mark cart as ready');
    }
  }

  // ----------------------------------------------------------------------
  // History: DEFERRED
  // ----------------------------------------------------------------------

  /// History is explicitly deferred in this phase. Callers should not use
  /// this method; the history screen renders a "coming soon" placeholder
  /// instead of invoking it. Kept as a typed no-op to avoid breaking
  /// imports until the history workflow is designed.
  Future<List<ActiveKitchenCart>> getHistoryOrders({
    DateTime? date,
    List<String>? statuses,
  }) async {
    AppLogger.warning(
      'KitchenRepository.getHistoryOrders called while history is deferred. '
      'Returning an empty list.',
    );
    return const <ActiveKitchenCart>[];
  }

  /// Legacy entry point retained by older callers.
  /// Deferred in this phase; returns an empty list so the "coming soon"
  /// history placeholder path does not trigger real network traffic.
  Future<List<KitchenOrder>> getLiveOrders(String restaurantId) async {
    return const <KitchenOrder>[];
  }

  // ----------------------------------------------------------------------
  // Flattening helpers
  // ----------------------------------------------------------------------

  List<ActiveKitchenCart> _flattenOrderToActiveCarts(
    Map<String, dynamic> order,
  ) {
    final orderId =
        (order['orderId'] as String?) ?? (order['id'] as String? ?? '');
    if (orderId.isEmpty) return const [];

    final orderNumber = _coerceInt(order['orderNumber']);
    final tableLabel = _coerceString(order['tableId']);
    final serverName = (order['assignedServerName'] as String?) ??
        (order['serverName'] as String?);
    final orderCreatedAt = _parseTimestamp(order['createdAt']);

    final carts = order['carts'];
    if (carts is! List) return const [];

    final result = <ActiveKitchenCart>[];
    for (final cart in carts) {
      if (cart is! Map<String, dynamic>) continue;

      // cartIndex is preserved by the backend sanitizer so it points at the
      // original slot in the Firestore array — do NOT recompute it from the
      // position in the filtered list.
      final cartIndex = _coerceInt(cart['cartIndex']);
      final statusStr = _coerceString(cart['status']);

      final submittedAt = _submittedAtForCart(cart, orderCreatedAt);
      final kitchenNote = _coerceNullableString(cart['notes']);

      final items = _flattenCartItems(cart['items']);

      result.add(
        ActiveKitchenCart(
          cartId: '${orderId}_$cartIndex',
          orderId: orderId,
          orderNumber: orderNumber,
          tableNumber: tableLabel,
          serverName: serverName,
          submittedAt: submittedAt,
          status: _mapStatus(statusStr),
          items: items,
          kitchenNote: kitchenNote,
        ),
      );
    }
    return result;
  }

  /// Per-plan rule: use `cart.statusHistory[0].timestamp` if present, else
  /// fall back to `order.createdAt`. No other fallbacks.
  DateTime _submittedAtForCart(
    Map<String, dynamic> cart,
    DateTime orderCreatedAt,
  ) {
    final history = cart['statusHistory'];
    if (history is List && history.isNotEmpty) {
      final first = history.first;
      if (first is Map<String, dynamic>) {
        final ts = _parseTimestamp(first['timestamp']);
        // _parseTimestamp returns DateTime.now() when it cannot parse; use
        // that as a signal to fall through.
        if (!_isEpochFallback(ts)) {
          return ts;
        }
      }
    }
    return orderCreatedAt;
  }

  List<ActiveCartItem> _flattenCartItems(dynamic rawItems) {
    if (rawItems is! List) return const [];
    final out = <ActiveCartItem>[];
    for (final item in rawItems) {
      if (item is! Map<String, dynamic>) continue;

      // Canonical name source per plan: item.menuItem.meta.name.
      // Single fallback: literal "Unknown Item".
      final menuItem = item['menuItem'];
      String name = 'Unknown Item';
      if (menuItem is Map<String, dynamic>) {
        final meta = menuItem['meta'];
        if (meta is Map<String, dynamic>) {
          final metaName = meta['name'];
          if (metaName is String && metaName.isNotEmpty) {
            name = metaName;
          }
        }
      }

      // Canonical id source: cartItemId (number in backend; coerce to string).
      final itemId = _coerceString(item['cartItemId']);

      final quantity = _coerceInt(item['quantity'], fallback: 1);
      final modifiers = _flattenModifiers(
        variants: item['selectedVariantsDetails'],
        addons: item['selectedAddonsDetails'],
      );

      out.add(
        ActiveCartItem(
          itemId: itemId,
          name: name,
          quantity: quantity,
          modifiers: modifiers,
          // Item-level notes are treated as absent in this phase.
          itemNote: null,
        ),
      );
    }
    return out;
  }

  List<String> _flattenModifiers({
    required dynamic variants,
    required dynamic addons,
  }) {
    final out = <String>[];
    if (variants is List) {
      for (final v in variants) {
        if (v is Map<String, dynamic>) {
          final name = v['selected_variant_name'];
          if (name is String && name.isNotEmpty) out.add(name);
        }
      }
    }
    if (addons is List) {
      for (final a in addons) {
        if (a is Map<String, dynamic>) {
          final name = a['name'];
          if (name is String && name.isNotEmpty) out.add('+ $name');
        }
      }
    }
    return out;
  }

  // ----------------------------------------------------------------------
  // Low-level coercion helpers
  // ----------------------------------------------------------------------

  int _coerceInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is double) return value.round();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }

  String _coerceString(dynamic value) {
    if (value == null) return '';
    return value.toString();
  }

  String? _coerceNullableString(dynamic value) {
    if (value == null) return null;
    final str = value.toString();
    return str.isEmpty ? null : str;
  }

  DateTime _parseTimestamp(dynamic value) {
    if (value is DateTime) return value;
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    if (value is double) {
      return DateTime.fromMillisecondsSinceEpoch(value.round());
    }
    if (value is String) {
      return DateTime.tryParse(value) ?? _epochFallback();
    }
    if (value is Map) {
      final seconds = value['_seconds'] ?? value['seconds'];
      final nanos = value['_nanoseconds'] ?? value['nanoseconds'] ?? 0;
      if (seconds is int) {
        return DateTime.fromMillisecondsSinceEpoch(
          (seconds * 1000) + (nanos is int ? (nanos / 1000000).round() : 0),
        );
      }
    }
    return _epochFallback();
  }

  /// Sentinel value returned from [_parseTimestamp] when a value cannot be
  /// parsed. Used by [_submittedAtForCart] to detect "no real timestamp".
  static final DateTime _kEpochSentinel =
      DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

  DateTime _epochFallback() => _kEpochSentinel;
  bool _isEpochFallback(DateTime t) => t.isAtSameMomentAs(_kEpochSentinel);

  ActiveCartStatus _mapStatus(String value) {
    switch (value.toUpperCase()) {
      case 'PENDING':
      case 'ORDERED':
        return ActiveCartStatus.pending;
      case 'PREPARING':
      case 'COOKING':
        return ActiveCartStatus.cooking;
      case 'READY':
        return ActiveCartStatus.ready;
      case 'SERVED':
        return ActiveCartStatus.served;
      case 'CANCELLED':
      case 'CANCELED':
      case 'RETURNED':
        return ActiveCartStatus.cancelled;
      default:
        return ActiveCartStatus.pending;
    }
  }

  (String, int)? _parseCompositeCartId(String cartId) {
    final idx = cartId.lastIndexOf('_');
    if (idx <= 0 || idx == cartId.length - 1) return null;
    final orderId = cartId.substring(0, idx);
    final cartIdx = int.tryParse(cartId.substring(idx + 1));
    if (cartIdx == null) return null;
    return (orderId, cartIdx);
  }

  bool _isSessionExpiryCode(String code) {
    final lower = code.toLowerCase();
    return lower.contains('failed-precondition') ||
        lower.contains('precondition') ||
        lower.contains('unauthenticated') ||
        lower == 'session_expired';
  }

  bool _looksLikeTransitionRejection(String? message) {
    if (message == null) return false;
    final lower = message.toLowerCase();
    return lower.contains('invalid status transition') ||
        lower.contains('cart status') ||
        lower.contains('not found in order');
  }
}
