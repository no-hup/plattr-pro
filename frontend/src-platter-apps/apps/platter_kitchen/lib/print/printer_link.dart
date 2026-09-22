import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

/// KT R12 · THE ONE DOOR to the wire. The only file in the kitchen app with `dart:io Socket` in it.
///
/// One write is: connect within [connectTimeout], hand the bytes over, flush, close — the whole thing under
/// [writeTimeout]. `flush` completing means Dart handed the bytes to the OS, not that the head printed them,
/// so "accepted every byte and closed cleanly" is the best the wire can say (R7). A printer that accepts and
/// never reads must time out to a failure rather than hang the loop (KT-0 row 15).
///
/// Tests hand in a [SocketOpener] that returns a fake; production uses [Socket.connect].
typedef SocketOpener = Future<Socket> Function(
    String host, int port, Duration timeout);

class PrinterLink {
  PrinterLink(
      {SocketOpener? open,
      this.connectTimeout = const Duration(seconds: 3),
      this.writeTimeout = const Duration(seconds: 10)})
      : _open = open ?? ((h, p, t) => Socket.connect(h, p, timeout: t));

  final SocketOpener _open;
  final Duration connectTimeout;
  final Duration writeTimeout;

  /// Parses `host:port` from `print.stations.<id>.address`; port 9100 when absent. Throws on an empty address.
  static (String, int) parseAddress(String address) {
    final a = address.trim();
    if (a.isEmpty) throw const FormatException('station has no address');
    final i = a.lastIndexOf(':');
    if (i < 0) return (a, 9100);
    final port = int.tryParse(a.substring(i + 1));
    if (port == null) throw FormatException('bad port in $address');
    return (a.substring(0, i), port);
  }

  /// Writes every byte to the printer at [address]. Completes with the byte count, or throws with a reason a
  /// human can read on the till: `connect timeout`, `connection refused`, `write timeout`, …
  Future<int> write(String address, Uint8List bytes) async {
    final (host, port) = parseAddress(address);
    return _timed(writeTimeout, () async {
      final Socket s;
      try {
        s = await _open(host, port, connectTimeout);
      } on TimeoutException {
        throw const PrinterError('connect timeout');
      } on SocketException catch (e) {
        throw PrinterError(
            e.osError?.message.toLowerCase().contains('refused') == true
                ? 'connection refused'
                : 'connect failed: ${e.message}');
      }
      try {
        s.add(bytes);
        await s.flush();
        await s.close();
        return bytes.length;
      } on SocketException catch (e) {
        throw PrinterError('write failed: ${e.message}');
      } finally {
        s.destroy();
      }
    });
  }

  Future<T> _timed<T>(Duration d, Future<T> Function() body) async {
    try {
      return await body().timeout(d);
    } on TimeoutException {
      throw const PrinterError('write timeout');
    }
  }
}

class PrinterError implements Exception {
  const PrinterError(this.reason);
  final String reason;
  @override
  String toString() => reason;
}
