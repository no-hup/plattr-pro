import 'dart:math';

/// OF R1 / OF-S1 · one id per "Place order" tap, kept until the server has definitely answered it, so a
/// retry after a lost answer sends the SAME id and the server returns the order that already landed
/// (`retry: true`) instead of cooking it twice. A refusal the server did give (session, cart, stock)
/// settles it too: the next tap is a new act.
class CheckoutRequestId {
  String? _current;

  String? _items;

  String get current => _current ??= _mint();

  /// D5: the id for sending exactly these cart items. "Send your 1 dish" timed out keeps its id for a retry of the
  /// same dishes; switching to "Send all 3" is a different act and gets a new one, or the server refuses it as
  /// "requestId already used for a different cart".
  String forItems(List<int> cartItemIds) {
    final key = ([...cartItemIds]..sort()).join(',');
    if (key != _items) {
      _current = null;
      _items = key;
    }
    return current;
  }

  void settled() => _current = null;

  /// Only a call that never reached the server keeps the id.
  static bool keepsId(String? errorCode) => errorCode == 'connection_error' || errorCode == 'timeout_error';

  static String _mint() =>
      'req_${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}_${Random().nextInt(1 << 30).toRadixString(36)}';
}
