import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

/// TD-138: the one place the admin app answers a refused call. Every screen's save, switch and delete goes
/// through the shared [DioClient], so a refusal shows the backend's own words once, here, and an expired session
/// (HTTP 401: a callable's UNAUTHENTICATED, or the stock switch's onRequest "unauthorized") shows "Session Expired"
/// and goes to login. Both body shapes carry `error.message`. Screens keep their own
/// loading/error states; they no longer need a snackbar of their own.
///
/// Admin only: the waiter and kitchen apps share [DioClient] but not this interceptor. Their
/// [InterruptFlowInterceptor] matches a `session_expired` code the backend never sends (TD-100).
class RefusalInterceptor extends Interceptor {
  RefusalInterceptor(this.messengerKey, this.navigatorKey);

  final GlobalKey<ScaffoldMessengerState> messengerKey;
  final GlobalKey<NavigatorState> navigatorKey;
  bool _sendingToLogin = false;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final data = err.response?.data;
    final error = data is Map ? data['error'] : null;
    // The login form reports its own refusals (a wrong password is also UNAUTHENTICATED).
    if (err.requestOptions.path.endsWith('Login')) {
      // left to the login form
    } else if (err.response == null) {
      // No answer at all (Wi-Fi down, timeout): the dialog has already closed, so say nothing was saved.
      messengerKey.currentState?.showSnackBar(const SnackBar(
        content: Text('Could not reach the server. Nothing was saved; try again.'),
      ));
    } else {
      if (err.response!.statusCode == 401) {
        _toLogin(error is Map ? error : const {});
      } else {
        final message = error is Map ? error['message']?.toString() : null;
        messengerKey.currentState?.showSnackBar(SnackBar(
          content: Text(message ?? 'Refused (HTTP ${err.response!.statusCode})'),
        ));
      }
    }
    handler.next(err);
  }

  Future<void> _toLogin(Map error) async {
    final context = navigatorKey.currentContext;
    if (_sendingToLogin || context == null) return;
    _sendingToLogin = true;
    try {
      await DefaultInterruptFlowHandler.handle(context, InterruptFlowType.sessionExpired, error);
    } finally {
      _sendingToLogin = false;
    }
  }
}
