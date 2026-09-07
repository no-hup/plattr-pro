import 'package:platter_core/platter_core.dart';

/// Provider for login state management in Server app.
/// Only allows waiter and server roles.
class LoginProvider extends BaseLoginProvider {
  /// Allowed roles for Server app access
  @override
  Set<String> get allowedRoles => const {
    'waiter',
    'server',
  };

  /// Error message for unauthorized roles
  @override
  String get unauthorizedMessage => 'You are not authorized as a Server staff';
}
