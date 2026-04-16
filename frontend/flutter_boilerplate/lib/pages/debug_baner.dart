import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class DebugBanner extends StatelessWidget {

  const DebugBanner({
    required this.tableId, required this.restaurantId, super.key,
  });
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      color: Colors.yellow,
      child: Text(
        'DEBUG: Restaurant: $restaurantId, Table: $tableId',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: Colors.black,
        ),
      ),
    );
  }
}