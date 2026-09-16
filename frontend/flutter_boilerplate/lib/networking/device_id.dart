import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Who, on a shared table cart, added this item.
///
/// A table has one cart document that everyone at the table writes to. Nothing in
/// the guest app identifies a person — there is no login, and the sessionId belongs
/// to the table, not the diner — so the closest honest answer to "whose item is
/// this?" is "this phone". That is what this is: a random id minted once per
/// browser/install and kept in local storage.
///
/// It is not an account and it is not a security boundary. It stops one diner
/// deleting another's food by accident and stops one tap of Place order sending
/// the other half of the table's half-built list to the kitchen. Clear the browser
/// and you are a new diner, which is the correct behaviour for a QR guest anyway.
class DeviceId {
  DeviceId._();

  static const _key = 'plattr_device_id';

  static String? _value;

  /// The current device id, or null before [load] has run. Callers treat null as
  /// "unowned": the backend then behaves exactly as it did before ownership existed.
  static String? get value => _value;

  /// Reads the stored id, minting one on first run. Call once at startup.
  static Future<String> load() async {
    if (_value != null) return _value!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_key);
    if (id == null || id.isEmpty) {
      id = _mint();
      await prefs.setString(_key, id);
    }
    _value = id;
    return id;
  }

  /// 128 bits of hex. Random.secure() rather than a timestamp: two phones scanning
  /// the same QR code within the same millisecond must not become the same diner.
  static String _mint() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    return 'dev_${bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';
  }
}
