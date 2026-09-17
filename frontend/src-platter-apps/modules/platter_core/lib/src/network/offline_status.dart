import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// OF R5 · what this device knows about its own line to the server. "Offline" is a fact it observed,
/// never a guess: the last call FAILED to reach the server and the last answer is older than
/// [staleAfterSeconds]. A slow call still in flight is neither, so it shows nothing (OF-S16).
/// One per radio: the kitchen tablet on its own SIM does not inherit the till's outage (OF-S5).
class OfflineStatus extends ChangeNotifier {
  OfflineStatus({DateTime Function()? now}) : _now = now ?? DateTime.now;

  static final OfflineStatus instance = OfflineStatus();

  final DateTime Function() _now;
  DateTime? lastAnsweredAt;
  DateTime? lastFailedAt;
  int staleAfterSeconds = 15;
  Timer? _stale;

  void answered() {
    lastAnsweredAt = _now();
    _stale?.cancel();
    notifyListeners();
  }

  void failed() {
    lastFailedAt = _now();
    // The banner may only be due once the last answer has aged past the threshold; wake up then.
    _stale?.cancel();
    _stale = Timer(Duration(seconds: staleAfterSeconds + 1), notifyListeners);
    notifyListeners();
  }

  bool get isOffline {
    final f = lastFailedAt;
    if (f == null) return false;
    final a = lastAnsweredAt;
    if (a != null && !a.isBefore(f)) return false;
    return a == null || _now().difference(a).inSeconds > staleAfterSeconds;
  }

  /// Null while online. The time is the last ANSWER's, not the failure's: that is when the picture froze.
  String? get bannerText {
    if (!isOffline) return null;
    final a = lastAnsweredAt;
    if (a == null) return 'No connection yet';
    return 'No connection since ${_hhmm(a)}';
  }

  static String _hhmm(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _stale?.cancel();
    super.dispose();
  }
}

/// Feeds [OfflineStatus] from every call through the shared Dio. A server that answers, even with an
/// error body, is a server that answered; only a call that never reached it counts as a failure.
class OfflineStatusInterceptor extends Interceptor {
  OfflineStatusInterceptor([OfflineStatus? status]) : _status = status ?? OfflineStatus.instance;
  final OfflineStatus _status;

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _status.answered();
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    switch (err.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.unknown:
        _status.failed();
      case DioExceptionType.badResponse:
      case DioExceptionType.badCertificate:
      case DioExceptionType.cancel:
        if (err.type == DioExceptionType.badResponse) _status.answered();
    }
    handler.next(err);
  }
}
