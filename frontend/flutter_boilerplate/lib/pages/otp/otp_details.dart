/// Data class to hold details collected from the OTP Input Dialog.
class OtpDetails {
  /// The entered OTP code (mandatory).
  final String otp;
  /// The entered name (optional).
  final String? name;
  /// The entered phone number (optional).
  final String? phoneNumber;

  const OtpDetails({
    required this.otp,
    this.name,
    this.phoneNumber,
  });

  @override
  String toString() {
    return 'OtpDetails(otp: $otp, name: $name, phoneNumber: $phoneNumber)';
  }
} 