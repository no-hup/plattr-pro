// Mirrors backend/src-plattr/functions/utils/statusUtils.js. The two state machines are
// kept in step by hand, so this file exists to make a drift fail loudly rather than
// show up as a button that is enabled when it should not be.
import 'package:flutter_test/flutter_test.dart';
// Imported by path, not through the package barrel: platter_core's barrel pulls in
// src/ui/auth/platter_login_form.dart, which uses `provider` without declaring it in
// pubspec.yaml, so the barrel does not compile on its own. Pre-existing and unrelated
// to statuses — but it would stop this file running.
import 'package:platter_core/src/converters/status_utils.dart';

void main() {
  group('AWAITING_CONFIRMATION (waiter-confirmation gate)', () {
    test('parses to its own status, not unknown', () {
      expect(
        StatusUtils.parseCartStatus('AWAITING_CONFIRMATION'),
        CartStatus.awaitingConfirmation,
      );
    });

    test('normalizes regardless of case', () {
      expect(
        StatusUtils.normalizeCartStatus('awaiting_confirmation'),
        'AWAITING_CONFIRMATION',
      );
    });

    test('the guest-facing label is not the raw enum', () {
      expect(StatusUtils.mapCartStatusToDisplay('AWAITING_CONFIRMATION'), 'To confirm');
    });

    test('has a colour of its own', () {
      expect(
        StatusColors.getColorForStatus(CartStatus.awaitingConfirmation),
        StatusColors.awaitingConfirmationColor,
      );
      expect(
        StatusColors.getColorForStatus(CartStatus.awaitingConfirmation),
        isNot(StatusColors.unknownColor),
      );
    });

    test('the waiter can confirm it or reject it, and nothing else', () {
      expect(StatusUtils.canTransition('AWAITING_CONFIRMATION', 'PENDING'), isTrue);
      expect(StatusUtils.canTransition('AWAITING_CONFIRMATION', 'CANCELLED'), isTrue);

      // The gate itself: no path to a kitchen state without the waiter.
      for (final target in ['PREPARING', 'READY', 'SERVED', 'RETURNED']) {
        expect(
          StatusUtils.canTransition('AWAITING_CONFIRMATION', target),
          isFalse,
          reason: 'AWAITING_CONFIRMATION must not reach $target directly',
        );
      }
    });

    test('nothing falls back into the gate', () {
      for (final from in ['PENDING', 'PREPARING', 'READY', 'SERVED', 'RETURNED', 'CANCELLED']) {
        expect(
          StatusUtils.canTransition(from, 'AWAITING_CONFIRMATION'),
          isFalse,
          reason: '$from must not go back to AWAITING_CONFIRMATION',
        );
      }
    });

    // The server app gates its Serve action on canTransition, so this is what stops a
    // waiter serving food the kitchen has not been told about.
    test('an unconfirmed cart cannot be served', () {
      expect(StatusUtils.canTransition('AWAITING_CONFIRMATION', 'SERVED'), isFalse);
    });
  });

  group('existing statuses are untouched', () {
    test('PENDING still behaves as before', () {
      expect(StatusUtils.parseCartStatus('PENDING'), CartStatus.pending);
      expect(StatusUtils.canTransition('PENDING', 'PREPARING'), isTrue);
      expect(StatusUtils.canTransition('PENDING', 'READY'), isTrue);
      expect(StatusUtils.canTransition('READY', 'SERVED'), isTrue);
    });

    test('an unrecognised status is still unknown, not a real state', () {
      expect(StatusUtils.parseCartStatus('SOMETHING_ELSE'), CartStatus.unknown);
    });
  });
}
