/// KT-5 · the agent loop against a fake API and a fake socket. No printer, no network, no emulator.
/// KT-S7 (printer off → fail with reason, job left to the server), KT-S20 (write throws mid-ticket → no ack),
/// the happy path (ack with the byte count), one job in flight per station, and the install id.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:platter_core/platter_core.dart';
import 'package:platter_kitchen/network/print_api_service.dart';
import 'package:platter_kitchen/print/print_agent.dart';
import 'package:platter_kitchen/print/printer_link.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeApi extends PrintApiService {
  _FakeApi() : super();
  final calls = <String>[];
  List<Map<String, dynamic>> pendingJobs = [];
  Map<String, String> bytesFor = {};
  bool refuseClaim = false;

  ApiResponse<Map<String, dynamic>> _ok(Map<String, dynamic> d) =>
      ApiResponse<Map<String, dynamic>>.success(d, message: 'ok');

  @override
  Future<ApiResponse<Map<String, dynamic>>> config(
      {required String restaurantId, required String sessionId}) async {
    calls.add('config');
    return _ok({
      'stations': {
        'kitchen': {'address': '10.0.0.5:9100'},
        'bar': {'address': '10.0.0.6:9100'},
        'counter': {'address': ''}
      },
      'pollSeconds': 5,
      'retryCount': 1,
      'retryDelayMs': 1,
      'connectTimeoutMs': 3000,
      'writeTimeoutMs': 10000,
      'counterStation': 'counter'
    });
  }

  @override
  Future<ApiResponse<Map<String, dynamic>>> pending(
      {required String restaurantId,
      required String sessionId,
      required String agentId}) async {
    calls.add('pending');
    return _ok({'jobs': pendingJobs});
  }

  @override
  Future<ApiResponse<Map<String, dynamic>>> claim(
      {required String restaurantId,
      required String sessionId,
      required String agentId,
      required String jobId}) async {
    calls.add('claim:$jobId');
    if (refuseClaim)
      return ApiResponse<Map<String, dynamic>>.error(
          'another agent holds this job',
          errorCode: 'failed-precondition');
    return _ok({
      'jobId': jobId,
      'ticketNo': '42-1',
      'stationId': jobId.split(':').last,
      'bytes': bytesFor[jobId] ?? base64Encode([0x1b, 0x40, 0x41]),
      'copies': 1
    });
  }

  @override
  Future<ApiResponse<Map<String, dynamic>>> ack(
      {required String restaurantId,
      required String sessionId,
      required String agentId,
      required String jobId}) async {
    calls.add('ack:$jobId');
    return _ok({'jobId': jobId, 'state': 'printed'});
  }

  @override
  Future<ApiResponse<Map<String, dynamic>>> fail(
      {required String restaurantId,
      required String sessionId,
      required String agentId,
      required String jobId,
      required String reason}) async {
    calls.add('fail:$jobId:$reason');
    return _ok({'jobId': jobId, 'state': 'queued'});
  }
}

/// A socket that records what was written, or misbehaves on demand.
class _FakeSocket extends Stream<Uint8List> implements Socket {
  _FakeSocket({this.throwOnAdd = false, this.hangOnFlush = false});
  final bool throwOnAdd;
  final bool hangOnFlush;
  final written = <int>[];
  bool closed = false;

  @override
  void add(List<int> data) {
    if (throwOnAdd) throw const SocketException('connection reset by peer');
    written.addAll(data);
  }

  @override
  Future<void> flush() =>
      hangOnFlush ? Completer<void>().future : Future.value();

  @override
  Future<void> close() async {
    closed = true;
  }

  @override
  void destroy() {
    closed = true;
  }

  @override
  StreamSubscription<Uint8List> listen(void Function(Uint8List event)? onData,
          {Function? onError, void Function()? onDone, bool? cancelOnError}) =>
      const Stream<Uint8List>.empty().listen(onData,
          onError: onError, onDone: onDone, cancelOnError: cancelOnError);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

PrinterLink linkWith(Future<Socket> Function(String host, int port) open,
        {Duration write = const Duration(seconds: 10)}) =>
    PrinterLink(
        open: (h, p, _) => open(h, p),
        connectTimeout: const Duration(milliseconds: 50),
        writeTimeout: write);

PrintAgent agent(
        _FakeApi api, PrinterLink link, List<Map<String, Object?>> logs) =>
    PrintAgent(
        restaurantId: 'r1',
        sessionId: 's1',
        agentId: 'tab_A',
        api: api,
        link: link,
        log: logs.add,
        poll: const Duration(hours: 1));

void main() {
  test(
      'happy path: pending → claim → the bytes go down the socket to the station\'s address → ack',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        }
      ];
    api.bytesFor['kot:c1:kitchen'] = base64Encode([0x1b, 0x40, 0x54, 0x0a]);
    final sockets = <String, _FakeSocket>{};
    final link = linkWith((h, p) async => sockets['$h:$p'] = _FakeSocket());
    final logs = <Map<String, Object?>>[];
    final a = agent(api, link, logs);
    await a.start();
    await a.tick();
    expect(api.calls, [
      'config',
      'pending',
      'claim:kot:c1:kitchen',
      'ack:kot:c1:kitchen',
      'pending',
      'claim:kot:c1:kitchen',
      'ack:kot:c1:kitchen'
    ]);
    expect(sockets.keys, ['10.0.0.5:9100']);
    expect(sockets['10.0.0.5:9100']!.written, [0x1b, 0x40, 0x54, 0x0a]);
    expect(sockets['10.0.0.5:9100']!.closed, isTrue);
    expect(logs.where((l) => l['evt'] == 'printed').first['bytes'], 4);
    a.stop();
  });

  test(
      'KT-S7 the printer is off: connect refused twice (retryCount 1) → print-fail with "connection refused", never ack',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:bar',
          'kind': 'kot',
          'stationId': 'bar',
          'ticketNo': '42-1',
          'queuedAt': 1
        }
      ];
    var connects = 0;
    final link = linkWith((h, p) async {
      connects++;
      throw const SocketException('connect',
          osError: OSError('Connection refused', 61));
    });
    final logs = <Map<String, Object?>>[];
    final a = agent(api, link, logs);
    await a.start();
    expect(connects, 2);
    expect(api.calls.where((c) => c.startsWith('ack')), isEmpty);
    expect(api.calls.last, 'fail:kot:c1:bar:connection refused');
    a.stop();
  });

  test(
      'KT-S20 the write throws mid-ticket → no ack, fail with the reason; the job is the server\'s to re-lease',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        }
      ];
    final link = linkWith((h, p) async => _FakeSocket(throwOnAdd: true));
    final logs = <Map<String, Object?>>[];
    final a = agent(api, link, logs);
    await a.start();
    expect(api.calls.where((c) => c.startsWith('ack')), isEmpty);
    expect(api.calls.last, startsWith('fail:kot:c1:kitchen:write failed'));
    a.stop();
  });

  test(
      'a printer that accepts and never reads: flush hangs → "write timeout" fail at writeTimeout, the loop is not stuck',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        }
      ];
    final link = linkWith((h, p) async => _FakeSocket(hangOnFlush: true),
        write: const Duration(milliseconds: 30));
    final logs = <Map<String, Object?>>[];
    final a = agent(api, link, logs);
    await a.start().timeout(const Duration(seconds: 2));
    expect(api.calls.last, 'fail:kot:c1:kitchen:write timeout');
    a.stop();
  });

  test(
      'a station with no address → fail "station has no address", no retry loop, no socket opened',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'bill:b1',
          'kind': 'bill',
          'stationId': 'counter',
          'ticketNo': 'A/1',
          'queuedAt': 1
        }
      ];
    var opened = 0;
    final link = linkWith((h, p) async {
      opened++;
      return _FakeSocket();
    });
    final a = agent(api, link, []);
    await a.start();
    expect(opened, 0);
    expect(api.calls.last, 'fail:bill:b1:station has no address');
    a.stop();
  });

  test(
      'KT-S10 a claim refused (another tablet holds it) is logged and nothing is written',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        }
      ]
      ..refuseClaim = true;
    var opened = 0;
    final link = linkWith((h, p) async {
      opened++;
      return _FakeSocket();
    });
    final logs = <Map<String, Object?>>[];
    final a = agent(api, link, logs);
    await a.start();
    expect(opened, 0);
    expect(logs.any((l) => l['evt'] == 'claim.refused'), isTrue);
    a.stop();
  });

  test(
      'one job in flight per station: two kitchen jobs and one bar job in one poll → kitchen prints one, bar one; the second kitchen waits for the next poll',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        },
        {
          'jobId': 'kot:c2:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-2',
          'queuedAt': 2
        },
        {
          'jobId': 'kot:c1:bar',
          'kind': 'kot',
          'stationId': 'bar',
          'ticketNo': '42-1',
          'queuedAt': 1
        },
      ];
    final link = linkWith((h, p) async => _FakeSocket());
    final a = agent(api, link, []);
    await a.start();
    expect(api.calls.where((c) => c.startsWith('claim')).toList(),
        ['claim:kot:c1:kitchen', 'claim:kot:c1:bar']);
  });

  test(
      'a station that wedges does not stop the other: kitchen hangs, the bar ticket still prints',
      () async {
    final api = _FakeApi()
      ..pendingJobs = [
        {
          'jobId': 'kot:c1:kitchen',
          'kind': 'kot',
          'stationId': 'kitchen',
          'ticketNo': '42-1',
          'queuedAt': 1
        },
        {
          'jobId': 'kot:c1:bar',
          'kind': 'kot',
          'stationId': 'bar',
          'ticketNo': '42-1',
          'queuedAt': 1
        },
      ];
    final link = linkWith(
        (h, p) async => _FakeSocket(hangOnFlush: p == 9100 && h == '10.0.0.5'),
        write: const Duration(milliseconds: 40));
    final a = agent(api, link, []);
    await a.start();
    expect(api.calls, contains('ack:kot:c1:bar'));
    expect(api.calls, contains('fail:kot:c1:kitchen:write timeout'));
  });

  test(
      'the install id is minted once and read back; it is never the staff session',
      () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final a = await PrintAgent.installId(prefs);
    final b = await PrintAgent.installId(prefs);
    expect(a, b);
    expect(a, startsWith('tab_'));
    expect(a.length, 14);
  });

  test(
      'parseAddress: "192.168.1.51:9100", "printer.local" (port 9100 by default), "" throws',
      () {
    expect(
        PrinterLink.parseAddress('192.168.1.51:9100'), ('192.168.1.51', 9100));
    expect(PrinterLink.parseAddress('printer.local'), ('printer.local', 9100));
    expect(() => PrinterLink.parseAddress(''), throwsFormatException);
    expect(
        () => PrinterLink.parseAddress('10.0.0.1:abc'), throwsFormatException);
  });
}
