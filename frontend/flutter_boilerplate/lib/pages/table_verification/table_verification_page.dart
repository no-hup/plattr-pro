import 'package:flutter/material.dart';
import 'table_verification_state.dart';

/// Table verification page that handles user authentication for table access
///
/// This page is responsible for:
/// 1. Validating the table ID and restaurant ID
/// 2. Collecting user information if needed
/// 3. Handling OTP verification if required
/// 4. Redirecting to the menu page after successful verification
class TableVerificationPage extends StatefulWidget {
  const TableVerificationPage({
    required this.restaurantId, required this.tableId, super.key,
    this.onLoginSuccess,
  });
  final String? restaurantId;
  final String? tableId;
  
  /// Optional callback to execute after successful login
  final VoidCallback? onLoginSuccess;

  @override
  State<TableVerificationPage> createState() => TableVerificationPageState();
}
 
