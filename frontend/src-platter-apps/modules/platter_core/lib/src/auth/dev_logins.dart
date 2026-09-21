import '../ui/auth/platter_login_form.dart';

/// The seeded logins, in one place, for debug builds only.
///
/// One rule, so nobody has to look anything up: **the app's own name is the username**.
/// `<app>@<slug>.test`, password `1234`, every restaurant. The server app takes
/// `server@meg.test`, the kitchen app `kitchen@meg.test`, the admin app `admin@meg.test`.
///
/// Kept in step with `backend/src-plattr/functions/mock/buildMockData7.js` (`standardStaff`).
/// Nothing here ships: every use site is behind `kDebugMode`.
class DevLogins {
  DevLogins._();

  static const String password = '1234';

  /// Guest OTP for every seeded table.
  static const String otp = '123456';

  /// Restaurant id → short slug, in the order they appear in the picker.
  /// Meghana is first because it is the biggest menu and the one with live orders.
  static const Map<String, String> restaurants = {
    'res_meghana': 'meg',
    'res_pizzabakery': 'pb',
    'res_truffles': 'tr',
    'res_salt': 'salt',
    'res_chowman': 'cw',
  };

  static const Map<String, String> _names = {
    'res_meghana': 'Meghana Foods',
    'res_pizzabakery': 'The Pizza Bakery',
    'res_truffles': 'Truffles',
    'res_salt': 'SALT',
    'res_chowman': 'Chowman',
  };

  /// Every restaurant's login for one app. `role` is the username prefix, which is
  /// the app's own name: `server`, `kitchen` or `admin`.
  static List<DebugCredential> forApp(String role) => [
        for (final entry in restaurants.entries)
          DebugCredential(
            name: '${_names[entry.key]} · $role',
            id: entry.key,
            username: '$role@${entry.value}.test',
            pass: password,
          ),
      ];
}
