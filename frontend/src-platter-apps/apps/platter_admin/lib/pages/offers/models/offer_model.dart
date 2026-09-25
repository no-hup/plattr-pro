/// Plain Dart model representing an order-level auto-apply offer.
///
/// Mirrors the backend `admin-getOffers` / `admin-createOffer` shape.
/// Defensive null-guards follow the project convention: fields from
/// Firestore-backed responses may be missing on older documents, so we
/// default everything that isn't strictly required.
class OfferModel {
  final String id;
  final String title;
  final String description;

  /// PERCENTAGE, FLAT, or BOGO
  final String type;

  /// ORDER, CATEGORY, or ITEM
  final String scope;

  final List<String> targetIds;
  final List<String> exclusionIds;
  final bool isActive;

  /// Expected keys: startDate, endDate. Read as ISO instants with the zone written in; the editor sends days (A26).
  final Map<String, dynamic> validity;

  /// Optional. Expected keys: minOrderValue, requiredItems
  final Map<String, dynamic>? conditions;

  /// Expected keys: value, maxDiscount, buyQuantity, getQuantity
  final Map<String, dynamic> benefit;

  final String? termsAndConditions;
  final int? priority;

  OfferModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.scope,
    this.targetIds = const [],
    this.exclusionIds = const [],
    this.isActive = true,
    this.validity = const {},
    this.conditions,
    this.benefit = const {},
    this.termsAndConditions,
    this.priority,
  });

  // DECISION(TD-144, 2026-09-26): the label is what a guest gets now, read from the switch and the stored window the
  // way offers/offerEngine.js reads it (A26: instants with the zone written in; a date with no zone never fires).
  /// Off, Scheduled, Running or Ended at [now].
  String statusAt(DateTime now) {
    DateTime? instant(Object? iso) =>
        iso is String && RegExp(r'(Z|[+-]\d\d:\d\d)$').hasMatch(iso) ? DateTime.tryParse(iso) : null;
    final start = instant(validity['startDate']);
    final end = instant(validity['endDate']);
    if (!isActive || start == null || end == null) return 'Off';
    if (now.isBefore(start)) return 'Scheduled';
    if (now.isAfter(end)) return 'Ended';
    return 'Running';
  }

  factory OfferModel.fromJson(Map<String, dynamic> json) {
    return OfferModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? 'PERCENTAGE',
      scope: json['scope'] as String? ?? 'ORDER',
      targetIds:
          ((json['targetIds'] as List<dynamic>?) ?? const <dynamic>[])
              .map((e) => e.toString())
              .toList(),
      exclusionIds:
          ((json['exclusionIds'] as List<dynamic>?) ?? const <dynamic>[])
              .map((e) => e.toString())
              .toList(),
      isActive: json['isActive'] == true,   // TD-144: as the engine reads it; a missing switch is off
      validity: (json['validity'] as Map<String, dynamic>?) ?? const {},
      conditions: json['conditions'] as Map<String, dynamic>?,
      benefit: (json['benefit'] as Map<String, dynamic>?) ?? const {},
      termsAndConditions: json['termsAndConditions'] as String?,
      priority: (json['priority'] is num)
          ? (json['priority'] as num).toInt()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'type': type,
      'scope': scope,
      'targetIds': targetIds,
      'exclusionIds': exclusionIds,
      'isActive': isActive,
      'validity': validity,
      if (conditions != null) 'conditions': conditions,
      'benefit': benefit,
      if (termsAndConditions != null) 'termsAndConditions': termsAndConditions,
      if (priority != null) 'priority': priority,
    };
  }
}
