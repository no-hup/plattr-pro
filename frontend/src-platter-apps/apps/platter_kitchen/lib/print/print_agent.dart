import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:platter_core/platter_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../network/print_api_service.dart';
import 'printer_link.dart';

/// KT · agent #1 (KT-D1c): the kitchen tablet pulls print jobs and drives the LAN printers. No ticket logic
/// lives here — the server rendered and encoded the bytes (R3). The loop is: pending → claim → write → ack,
/// else fail(reason) and back off; one job in flight per station, and a station that wedges never stops the
/// other (R12). Sheet: moonshot/SPEC_KT_print_path.md v4, KT-5.
///
/// Identity (R13): `agentId` is minted once per install and kept in shared preferences under a key the
/// Android backup rules exclude (see android/app/src/main/res/xml/backup_rules.xml), so a restored tablet is a
/// new agent and two tablets never share a lease. The staff session is the credential; the id is the lease holder.
class PrintAgent {
  PrintAgent({
    required this.restaurantId,
    required this.sessionId,
    required this.agentId,
    PrintApiService? api,
    PrinterLink? link,
    this.log = _defaultLog,
    Duration? poll,
  })  : _api = api ?? PrintApiService(),
        _link = link ?? PrinterLink(),
        _pollOverride = poll;

  static const prefsKey = 'print.agentId';

  /// The install's id, minted on first use. Never restored from a backup (backup_rules.xml excludes the prefs file).
  static Future<String> installId(SharedPreferences prefs) async {
    final existing = prefs.getString(prefsKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final r = Random.secure();
    final id =
        'tab_${List.generate(10, (_) => r.nextInt(36).toRadixString(36)).join()}';
    await prefs.setString(prefsKey, id);
    return id;
  }

  final String restaurantId;
  final String sessionId;
  final String agentId;
  final PrintApiService _api;
  final PrinterLink _link;
  final void Function(Map<String, Object?> line) log;
  final Duration? _pollOverride;

  Timer? _timer;
  bool _ticking = false;
  final Set<String> _inFlight =
      <String>{}; // stationIds with a socket open right now
  Map<String, dynamic> _stations = const {};
  int _pollSeconds = 5,
      _retryCount = 2,
      _retryDelayMs = 2000,
      _connectTimeoutMs = 3000,
      _writeTimeoutMs = 10000;
  String _counterStation = 'counter';

  bool get running => _timer != null;

  /// Reads the config, runs one pass, then polls every `print.pollSeconds`. Safe to call twice.
  Future<void> start() async {
    if (_timer != null) return;
    await _loadConfig();
    _timer = Timer.periodic(
        _pollOverride ?? Duration(seconds: _pollSeconds), (_) => tick());
    log({
      'mod': 'print.agent',
      'evt': 'start',
      'agentId': agentId,
      'pollSeconds': _pollSeconds
    });
    await tick();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    log({'mod': 'print.agent', 'evt': 'stop', 'agentId': agentId});
  }

  Future<void> _loadConfig() async {
    final r =
        await _api.config(restaurantId: restaurantId, sessionId: sessionId);
    final d = r.data;
    if (!r.success || d == null) {
      log({'mod': 'print.agent', 'evt': 'config.failed', 'error': r.message});
      return; // defaults stand; the next start re-reads
    }
    _stations = (d['stations'] as Map?)?.cast<String, dynamic>() ?? const {};
    _pollSeconds = _int(d['pollSeconds'], _pollSeconds);
    _retryCount = _int(d['retryCount'], _retryCount);
    _retryDelayMs = _int(d['retryDelayMs'], _retryDelayMs);
    _connectTimeoutMs = _int(d['connectTimeoutMs'], _connectTimeoutMs);
    _writeTimeoutMs = _int(d['writeTimeoutMs'], _writeTimeoutMs);
    _counterStation = (d['counterStation'] as String?) ?? _counterStation;
  }

  static int _int(Object? v, int d) => v is num && v > 0 ? v.toInt() : d;

  /// One poll: ask what is waiting, take one job per idle station, print it. Never throws.
  Future<void> tick() async {
    if (_ticking) return; // a slow printer must not stack polls
    _ticking = true;
    try {
      final r = await _api.pending(
          restaurantId: restaurantId, sessionId: sessionId, agentId: agentId);
      final jobs = (r.data?['jobs'] as List?)?.cast<Map>() ?? const [];
      if (!r.success) {
        log({
          'mod': 'print.agent',
          'evt': 'pending.failed',
          'error': r.message
        });
        return;
      }
      final byStation = <String, Map>{};
      for (final j in jobs) {
        final st = (j['stationId'] as String?) ?? _counterStation;
        byStation.putIfAbsent(
            st, () => j); // oldest first is the server's order
      }
      await Future.wait(byStation.entries
          .where((e) => !_inFlight.contains(e.key))
          .map((e) => _printOne(e.key, e.value['jobId'] as String)));
    } finally {
      _ticking = false;
    }
  }

  Future<void> _printOne(String stationId, String jobId) async {
    _inFlight.add(stationId);
    try {
      final c = await _api.claim(
          restaurantId: restaurantId,
          sessionId: sessionId,
          agentId: agentId,
          jobId: jobId);
      final d = c.data;
      if (!c.success || d == null) {
        log({
          'mod': 'print.agent',
          'evt': 'claim.refused',
          'jobId': jobId,
          'error': c.message
        }); // taken, stale, held: someone else's or not now
        return;
      }
      final station = _stations[stationId] as Map?;
      final address = (station?['address'] as String?) ?? '';
      final bytes = Uint8List.fromList(base64Decode(d['bytes'] as String));
      String? failure;
      for (var attempt = 0; attempt <= _retryCount; attempt++) {
        try {
          final n = await _link.write(address, bytes);
          await _api.ack(
              restaurantId: restaurantId,
              sessionId: sessionId,
              agentId: agentId,
              jobId: jobId);
          log({
            'mod': 'print.agent',
            'evt': 'printed',
            'jobId': jobId,
            'station': stationId,
            'bytes': n,
            'attempt': attempt
          });
          return;
        } on PrinterError catch (e) {
          failure = e.reason;
        } on FormatException catch (e) {
          failure = e.message; // no address configured for the station
          break;
        } catch (e) {
          failure = e.toString();
        }
        if (attempt < _retryCount)
          await Future<void>.delayed(Duration(milliseconds: _retryDelayMs));
      }
      // KT-S7: the holder gives it back with a reason the till can show. Never ack what did not go down the wire.
      await _api.fail(
          restaurantId: restaurantId,
          sessionId: sessionId,
          agentId: agentId,
          jobId: jobId,
          reason: failure ?? 'unknown');
      log({
        'mod': 'print.agent',
        'evt': 'failed',
        'jobId': jobId,
        'station': stationId,
        'reason': failure
      });
    } finally {
      _inFlight.remove(stationId);
    }
  }

  static void _defaultLog(Map<String, Object?> line) =>
      AppLogger.info(jsonEncode(line));
}
