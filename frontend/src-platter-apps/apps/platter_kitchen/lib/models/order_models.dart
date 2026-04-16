import 'package:platter_core/platter_core.dart' hide OrderStatus;
import '../constants/kitchen_constants.dart';

/// Represents a consolidated Order for the kitchen view.
///
/// An order contains one or more [KitchenCart]s.
class KitchenOrder {
  final String id;
  final String tableNumber;
  final String status;
  final DateTime updatedAt;
  final List<KitchenCart> carts;
  final String? serverName;
  final String orderNumber; // e.g., "DOC-1234" usually last 4 chars

  const KitchenOrder({
    required this.id,
    required this.tableNumber,
    required this.status,
    required this.updatedAt,
    this.carts = const [],
    this.serverName,
    required this.orderNumber,
  });

  /// Consolidates status from carts/items if needed
  /// For now, relies on the backend provided status.
  bool get isReady => status == OrderStatus.ready;
  bool get isCancelled => status == OrderStatus.cancelled;

  factory KitchenOrder.fromJson(Map<String, dynamic> json) {
    final orderId = _parseString(json['orderId'] ?? json['id']);
    final updated = _parseDateTime(json['updatedAt']);

    // safely parse carts
    var cartsList = <KitchenCart>[];
    if (json['carts'] != null && json['carts'] is List) {
      cartsList = (json['carts'] as List)
          .map((c) => KitchenCart.fromJson(c as Map<String, dynamic>, orderId: orderId))
          .toList();
    }

    return KitchenOrder(
      id: orderId,
      tableNumber: _parseTableNumber(json),
      status: _parseOrderStatus(json['status'] ?? json['orderStatus']),
      updatedAt: updated,
      carts: cartsList,
      serverName: _parseServerName(json),
      orderNumber: _parseOrderNumber(json['orderNumber'] ?? orderId),
    );
  }

  /// Helper to get all active items across all carts
  List<KitchenOrderItem> get allItems => carts.expand((c) => c.items).toList();
}

/// Represents a sub-group (cart) within an order.
class KitchenCart {
  final int index;
  final String status;
  final List<KitchenOrderItem> items;
  final String? assignedTo; // Server ID

  const KitchenCart({
    required this.index,
    required this.status,
    this.items = const [],
    this.assignedTo,
  });

  factory KitchenCart.fromJson(Map<String, dynamic> json, {required String orderId}) {
    var itemsList = <KitchenOrderItem>[];
    if (json['items'] != null && json['items'] is List) {
      final cartIndex = _parseInt(json['cartIndex']);
      final rawItems = (json['items'] as List).cast<Map<String, dynamic>>();
      itemsList = rawItems.asMap().entries
          .map((entry) => KitchenOrderItem.fromJson(
                entry.value,
                fallbackId: '$orderId:$cartIndex:${entry.key}',
              ))
          .toList();
    }

    return KitchenCart(
      index: _parseInt(json['cartIndex']),
      status: _parseFulfillmentStatus(json['status']),
      items: itemsList,
      assignedTo: json['assignedTo'],
    );
  }
}

/// Represents a single dish/item.
class KitchenOrderItem {
  final String itemId; // Refers to the specific line item (unique in cart)
  final String menuItemId; // Refers to the menu definition
  final String name;
  final int quantity;
  final String status;
  final List<String> modifiers;
  final String? notes;
  final bool inStock;

  const KitchenOrderItem({
    required this.itemId,
    required this.menuItemId,
    required this.name,
    required this.quantity,
    required this.status,
    this.modifiers = const [],
    this.notes,
    this.inStock = true,
  });

  bool get isReady => status == OrderStatus.ready;
  bool get isCancelled => status == OrderStatus.cancelled;

  factory KitchenOrderItem.fromJson(Map<String, dynamic> json, {required String fallbackId}) {
    return KitchenOrderItem(
      itemId: _parseItemId(json, fallbackId),
      menuItemId: _parseString(json['menuItemId']),
      name: _parseItemName(json),
      quantity: _parseInt(json['quantity'], fallback: 1),
      status: _parseFulfillmentStatus(json['status']),
      modifiers: _parseModifiers(json),
      notes: json['notes'] ?? json['itemNote'] ?? json['note'],
      inStock: _parseBool(json['inStock'] ?? json['isInStock'], fallback: true),
    );
  }

  KitchenOrderItem copyWith({String? status, bool? inStock}) {
    return KitchenOrderItem(
      itemId: itemId,
      menuItemId: menuItemId,
      name: name,
      quantity: quantity,
      status: status ?? this.status,
      modifiers: modifiers,
      notes: notes,
      inStock: inStock ?? this.inStock,
    );
  }
}

String _parseString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}

int _parseInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

bool _parseBool(dynamic value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is String) {
    final normalized = value.toLowerCase();
    if (normalized == 'true') return true;
    if (normalized == 'false') return false;
  }
  return fallback;
}

DateTime _parseDateTime(dynamic value) {
  if (value is DateTime) return value;
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  if (value is double) return DateTime.fromMillisecondsSinceEpoch(value.round());
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
    final asInt = int.tryParse(value);
    if (asInt != null) return DateTime.fromMillisecondsSinceEpoch(asInt);
  }
  if (value is Map) {
    final seconds = value['seconds'] ?? value['_seconds'];
    final nanos = value['nanoseconds'] ?? value['_nanoseconds'] ?? 0;
    if (seconds is int) {
      return DateTime.fromMillisecondsSinceEpoch(
        (seconds * 1000) + (nanos is int ? (nanos / 1000000).round() : 0),
      );
    }
  }
  return DateTime.now();
}

String _parseOrderStatus(dynamic value) {
  final normalized = value?.toString().trim().toLowerCase() ?? '';
  switch (normalized) {
    case 'pending':
    case 'placed':
      return OrderStatus.pending;
    case 'in_progress':
    case 'in-progress':
    case 'processing':
    case 'confirmed':
    case 'preparing':
    case 'ready':
      return OrderStatus.preparing;
    case 'completed':
    case 'complete':
    case 'served':
      return OrderStatus.served;
    case 'cancelled':
    case 'canceled':
      return OrderStatus.cancelled;
    default:
      return normalized.isEmpty ? OrderStatus.pending : normalized;
  }
}

String _parseFulfillmentStatus(dynamic value) {
  final normalized = value?.toString().trim().toLowerCase() ?? '';
  switch (normalized) {
    case 'pending':
    case 'ordered':
      return OrderStatus.pending;
    case 'preparing':
    case 'cooking':
      return OrderStatus.preparing;
    case 'ready':
    case 'ready_for_pickup':
      return OrderStatus.ready;
    case 'served':
    case 'completed':
    case 'served_to_customer':
      return OrderStatus.served;
    case 'cancelled':
    case 'canceled':
    case 'returned':
      return OrderStatus.cancelled;
    default:
      return normalized.isEmpty ? OrderStatus.pending : normalized;
  }
}

String _parseOrderNumber(dynamic value) {
  final raw = _parseString(value);
  if (raw.isEmpty) return '----';
  return raw;
}

String _parseTableNumber(Map<String, dynamic> json) {
  final tableNumber = _parseString(json['tableNumber']);
  if (tableNumber.isNotEmpty) return tableNumber;
  final tableId = _parseString(json['tableId']);
  return tableId.isNotEmpty ? tableId : 'Unknown';
}

String? _parseServerName(Map<String, dynamic> json) {
  final serverName = _parseString(json['serverName']);
  if (serverName.isNotEmpty) return serverName;
  final assignedName = _parseString(json['assignedServerName']);
  return assignedName.isNotEmpty ? assignedName : null;
}

String _parseItemId(Map<String, dynamic> json, String fallbackId) {
  final itemId = json['itemId'] ?? json['id'] ?? json['cartItemId'];
  final parsed = _parseString(itemId);
  return parsed.isNotEmpty ? parsed : fallbackId;
}

String _parseItemName(Map<String, dynamic> json) {
  final direct = _parseString(json['name']);
  if (direct.isNotEmpty) return direct;
  final menuItem = json['menuItem'];
  if (menuItem is Map) {
    final meta = menuItem['meta'];
    if (meta is Map) {
      final metaName = _parseString(meta['name']);
      if (metaName.isNotEmpty) return metaName;
    }
  }
  return 'Unknown Item';
}

List<String> _parseModifiers(Map<String, dynamic> json) {
  final modifiers = <String>{};
  modifiers.addAll(_parseStringList(json['modifiers']));
  modifiers.addAll(_parseStringList(json['selectedVariantsDetails']));
  modifiers.addAll(_parseStringList(json['selectedAddonsDetails']));
  modifiers.addAll(_parseStringList(json['variants']));
  modifiers.addAll(_parseStringList(json['addons']));
  return modifiers.where((value) => value.trim().isNotEmpty).toList();
}

List<String> _parseStringList(dynamic value) {
  if (value is List) {
    return value
        .map((entry) => _extractListEntryLabel(entry))
        .where((entry) => entry.isNotEmpty)
        .toList();
  }
  return [];
}

String _extractListEntryLabel(dynamic entry) {
  if (entry == null) return '';
  if (entry is String) return entry;
  if (entry is Map) {
    final name = _parseString(entry['name']);
    if (name.isNotEmpty) return name;
    final title = _parseString(entry['title']);
    if (title.isNotEmpty) return title;
    final label = _parseString(entry['label']);
    if (label.isNotEmpty) return label;
    final meta = entry['meta'];
    if (meta is Map) {
      final metaName = _parseString(meta['name']);
      if (metaName.isNotEmpty) return metaName;
    }
  }
  return entry.toString();
}
