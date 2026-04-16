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
          ? tablesJson
              .whereType<Map<String, dynamic>>()
              .map(RestaurantTableSummary.fromJson)
              .toList()
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
