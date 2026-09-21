/// The seeded guest, for debug builds only.
///
/// MockData7 gives every table the same OTP and seats the same three customers, so a dev
/// opening the consumer app should never have to type any of it. Every use site is behind
/// `kDebugMode`, so none of this reaches a release build.
///
/// Kept in step with `backend/src-plattr/functions/mock/buildMockData7.js`.
class DevGuest {
  DevGuest._();

  static const String name = 'Customer One';
  static const String phone = '9876543210';

  /// Every seeded table carries this OTP (`TEST_OTP`).
  static const String otp = '123456';
}
