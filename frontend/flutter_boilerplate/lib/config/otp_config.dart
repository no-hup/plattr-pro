/// Central configuration for OTP-related settings.
/// Changing these values will affect all OTP validation across the app.
///
/// **Important**: These values must stay synchronized with the backend's
/// OTP_CONFIG in `functions/session/otpService.js`.
class OtpConfig {
  OtpConfig._(); // Prevent instantiation

  /// The expected length of OTP codes.
  /// This should match the backend's OTP_CONFIG.LENGTH value.
  static const int otpLength = 6;

  /// OTP validity duration in minutes.
  /// This should match the backend's OTP_CONFIG.VALIDITY_MINUTES value.
  static const int validityMinutes = 5;
}
