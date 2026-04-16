import 'package:flutter/material.dart';
import 'package:flutterboilerplate/navigation/app_navigator.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_listing_state.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/otp/models/otp_models.dart';
import 'package:flutterboilerplate/pages/otp/otp_input_dialog.dart';
import 'package:flutterboilerplate/session/session_provider.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class AuthPrompt {
  AuthPrompt._();

  static bool _isShowing = false;

  static Future<void> showIfNeeded({
    String? restaurantId,
    String? tableId,
  }) async {
    if (_isShowing) return;
    AppLogger.log('🔐 AUTH_PROMPT: showIfNeeded called');
    final ctx = AppNavigator.navigatorKey.currentContext;
    if (ctx == null) {
      // Try on next frame if context not yet available
      try {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _isShowing = false;
          showIfNeeded(restaurantId: restaurantId, tableId: tableId);
        });
      } catch (_) {}
      return;
    }

    final session = Provider.of<SessionProvider>(ctx, listen: false);
    if ((session.sessionId ?? '').isNotEmpty) {
      AppLogger.log('🔐 AUTH_PROMPT: Session already present, not showing');
      return;
    }

    // Try to infer restaurantId/tableId
    var rId = restaurantId;
    var tId = tableId;

    // 1) From cart state
    try {
      final cartState = Provider.of<CartListingState>(ctx, listen: false).cart;
      rId ??= cartState?.restaurantId ?? '';
      tId ??= cartState?.tableId ?? '';
    } catch (_) {}

    // 2) From menu state
    if ((rId == null || rId.isEmpty) || (tId == null || tId.isEmpty)) {
      try {
        final menuState = Provider.of<MenuState>(ctx, listen: false);
        final cart = menuState.cart;
        rId ??= cart?.restaurantId ?? '';
        tId ??= cart?.tableId ?? '';
      } catch (_) {}
    }

    // 3) From current route path /r/:restaurantId/t/:tableId
    if ((rId == null || rId.isEmpty) || (tId == null || tId.isEmpty)) {
      try {
        final loc = GoRouterState.of(ctx).uri.toString();
        final reg = RegExp('/r/([^/]+)/t/([^/]+)');
        final match = reg.firstMatch(loc);
        if (match != null) {
          rId ??= match.group(1);
          tId ??= match.group(2);
        }
      } catch (_) {}
    }

    if (rId == null || rId.isEmpty || tId == null || tId.isEmpty) {
      AppLogger.log(
        '🔐 AUTH_PROMPT: Missing restaurantId/tableId, cannot show OTP dialog',
      );
      return;
    }

    bool requireName = true;
    bool requirePhone = true;
    try {
      final sessionState =
          Provider.of<SessionProvider>(ctx, listen: false).state;
      requireName = sessionState.isUsernameMandatory;
      requirePhone = sessionState.isPhoneNumberMandatory;
    } catch (_) {}

    _isShowing = true;
    try {
      await showDialog<void>(
        context: ctx,
        builder: (context) => OtpInputDialog(
          handleOtpApi: true,
          requireName: requireName,
          requirePhoneNumber: requirePhone,
          restaurantId: rId,
          tableId: tId,
          onOtpSuccess: (OtpValidationResponse resp) {
            Provider.of<SessionProvider>(context, listen: false)
                .setSessionFromOtp(
              sessionId: resp.sessionId,
              restaurantId: rId!,
              tableId: tId!,
            );
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Authenticated successfully')),
            );
          },
          onOtpFailed: (msg, code) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(msg.isNotEmpty ? msg : 'Authentication failed'),
              ),
            );
          },
        ),
      );
    } catch (_) {
      // ignore
    } finally {
      _isShowing = false;
    }
  }
}
