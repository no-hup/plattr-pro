/// The backend returns tables in Firestore document-id order, which puts
/// table "10" before table "2". Sort numerically when the labels are numbers.
int _byTableNumber(RestaurantTableSummary a, RestaurantTableSummary b) {
  final aNumber = int.tryParse(a.label);
  final bNumber = int.tryParse(b.label);
  if (aNumber != null && bNumber != null) return aNumber.compareTo(bNumber);
  return a.label.compareTo(b.label);
}

class RestaurantSummary {
  const RestaurantSummary({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    required this.tables,
  });

  factory RestaurantSummary.fromJson(Map<String, dynamic> json) {
    final tablesJson = json['tables'];
    return RestaurantSummary(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      tables: tablesJson is List
          ? (tablesJson
              .whereType<Map<String, dynamic>>()
              .map(RestaurantTableSummary.fromJson)
              .toList()
            ..sort(_byTableNumber))
          : const <RestaurantTableSummary>[],
    );
  }

  final String id;
  final String name;
  final String address;
  final String phone;
  final List<RestaurantTableSummary> tables;

  bool get hasTables => tables.isNotEmpty;
}

class RestaurantTableSummary {
  const RestaurantTableSummary({
    required this.id,
    required this.label,
    required this.status,
  });

  factory RestaurantTableSummary.fromJson(Map<String, dynamic> json) {
    return RestaurantTableSummary(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? json['id'] ?? '').toString(),
      status: (json['status'] ?? 'unknown').toString(),
    );
  }

  final String id;
  final String label;
  final String status;
}
