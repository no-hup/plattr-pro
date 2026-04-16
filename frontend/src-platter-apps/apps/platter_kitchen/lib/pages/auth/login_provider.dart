import 'package:platter_core/platter_core.dart';

/// Provider for login state management in Kitchen app.
/// Only allows kitchen and kitchen_staff roles.
class LoginProvider extends BaseLoginProvider {
  /// Allowed roles for Kitchen app access - admin NOT allowed
  @override
  Set<String> get allowedRoles => const {
    'kitchen',
    'kitchen_staff',
  };

  /// Error message for unauthorized roles
  @override
  String get unauthorizedMessage => 'You are not authorized as a Kitchen staff';
}
