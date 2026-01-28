import 'package:platter_core/platter_core.dart';

/// Provider for login state management in Admin app.
/// Only allows admin role.
class LoginProvider extends BaseLoginProvider {
  /// Allowed roles for Admin app access
  @override
  Set<String> get allowedRoles => const {'admin'};

  /// Error message for unauthorized roles
  @override
  String get unauthorizedMessage => 'You are not authorized as an Admin';
}
