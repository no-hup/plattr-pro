import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class DebugBanner extends StatelessWidget {
  final String tableId;
  final String restaurantId;

  const DebugBanner({
    super.key,
    required this.tableId,
    required this.restaurantId,
  });

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(8),
      color: Colors.yellow,
      child: Text(
        'DEBUG: Restaurant: $restaurantId, Table: $tableId',
        style: const TextStyle(color: Colors.black),
      ),
    );
  }
}