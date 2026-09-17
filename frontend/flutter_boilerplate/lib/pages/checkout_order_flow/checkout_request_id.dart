import 'dart:math';

/// OF R1 / OF-S1 · one id per "Place order" tap, kept until the server has definitely answered it, so a
/// retry after a lost answer sends the SAME id and the server returns the order that already landed
/// (`retry: true`) instead of cooking it twice. A refusal the server did give (session, cart, stock)
/// settles it too: the next tap is a new act.
class CheckoutRequestId {
  String? _current;

  String get current => _current ??= _mint();

  void settled() => _current = null;

  /// Only a call that never reached the server keeps the id.
  static bool keepsId(String? errorCode) => errorCode == 'connection_error' || errorCode == 'timeout_error';

  static String _mint() =>
      'req_${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}_${Random().nextInt(1 << 30).toRadixString(36)}';
}
