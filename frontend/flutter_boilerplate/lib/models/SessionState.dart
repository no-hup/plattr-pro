class SessionState {

  const SessionState({
    this.restaurantId,
    this.tableId,
    this.userName,
    this.phoneNumber,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
    this.sessionId,
    this.sessionExpiresAt,
    this.isPrimaryCustomer = false,
    this.otpRequiredForOrder = false,
    this.isUsernameMandatory = true,
    this.isPhoneNumberMandatory = true,
    this.isMultiUserSupported = false,
  });
  final String? restaurantId;
  final String? tableId;
  final String? userName;
  final String? phoneNumber;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final String? sessionId;
  final String? sessionExpiresAt;
  final bool isPrimaryCustomer;
  final bool otpRequiredForOrder;
  final bool isUsernameMandatory;
  final bool isPhoneNumberMandatory;
  final bool isMultiUserSupported;

  SessionState copyWith({
    String? restaurantId,
    String? tableId,
    String? userName,
    String? phoneNumber,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    String? sessionId,
    String? sessionExpiresAt,
    bool? isPrimaryCustomer,
    bool? otpRequiredForOrder,
    bool? isUsernameMandatory,
    bool? isPhoneNumberMandatory,
    bool? isMultiUserSupported,
  }) {
    return SessionState(
      restaurantId: restaurantId ?? this.restaurantId,
      tableId: tableId ?? this.tableId,
      userName: userName ?? this.userName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      sessionId: sessionId ?? this.sessionId,
      sessionExpiresAt: sessionExpiresAt ?? this.sessionExpiresAt,
      isPrimaryCustomer: isPrimaryCustomer ?? this.isPrimaryCustomer,
      otpRequiredForOrder: otpRequiredForOrder ?? this.otpRequiredForOrder,
      isUsernameMandatory: isUsernameMandatory ?? this.isUsernameMandatory,
      isPhoneNumberMandatory: isPhoneNumberMandatory ?? this.isPhoneNumberMandatory,
      isMultiUserSupported: isMultiUserSupported ?? this.isMultiUserSupported,
    );
  }
}
