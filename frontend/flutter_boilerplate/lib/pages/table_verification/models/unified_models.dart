import 'package:flutterboilerplate/utils/UnifiedResponseParser.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'unified_models.freezed.dart';
part 'unified_models.g.dart';

/// Unified Table Validation Response Data
/// 
/// This represents the data field within the unified response for table validation
@freezed
class TableValidationData with _$TableValidationData { // Private constructor for custom methods

  const factory TableValidationData({
    required String status,
    String? tableStatus,
    RestaurantInfo? restaurant,
    TableInfo? table,
    SessionInfo? session,
    PrimaryCustomer? primaryCustomer,
    List<String>? occupiedBy,
    @Default(false) bool otpRequiredForOrder,
    @Default(false) bool isUsernameMandatory,
    @Default(false) bool isPhoneNumberMandatory,
    @Default(false) bool isMultiUserSupported,
    String? authMessage,
    AssignedServer? assignedServer,
  }) = _TableValidationData;
  const TableValidationData._();

  factory TableValidationData.fromJson(Map<String, dynamic> json) => 
      _$TableValidationDataFromJson(json);

  // Convenience getters for easier access
  String? get sessionId => session?.sessionId;
  String? get sessionExpiresAt => session?.expiresAt;
  String? get tableNumber => table?.number;
  int? get tableCapacity => table?.capacity;
  String? get restaurantName => restaurant?.name;
  String? get restaurantId => restaurant?.id;
  String? get primaryCustomerName => primaryCustomer?.name;
  String? get primaryCustomerPhone => primaryCustomer?.phoneNumber;
  bool get isTableActive => tableStatus == 'active';
  bool get isTableVacant => tableStatus == 'vacant';
}

/// Restaurant information within table validation response
@freezed
class RestaurantInfo with _$RestaurantInfo {
  const factory RestaurantInfo({
    required String name,
    required String id,
  }) = _RestaurantInfo;

  factory RestaurantInfo.fromJson(Map<String, dynamic> json) => 
      _$RestaurantInfoFromJson(json);
}

/// Table information within table validation response
@freezed
class TableInfo with _$TableInfo {
  const factory TableInfo({
    required String number,
    required String id,
    int? capacity,
    String? assignedServerId,
  }) = _TableInfo;

  factory TableInfo.fromJson(Map<String, dynamic> json) => 
      _$TableInfoFromJson(json);
}

/// Session information within table validation response
@freezed
class SessionInfo with _$SessionInfo {
  const factory SessionInfo({
    required String sessionId,
    required String expiresAt,
  }) = _SessionInfo;

  factory SessionInfo.fromJson(Map<String, dynamic> json) => 
      _$SessionInfoFromJson(json);
}

/// Primary customer information within table validation response
@freezed
class PrimaryCustomer with _$PrimaryCustomer {
  const factory PrimaryCustomer({
    required String phoneNumber,
    required String name,
  }) = _PrimaryCustomer;

  factory PrimaryCustomer.fromJson(Map<String, dynamic> json) => 
      _$PrimaryCustomerFromJson(json);
}

/// Assigned server information within table validation response
@freezed
class AssignedServer with _$AssignedServer {
  const factory AssignedServer({
    required String name,
    required String status,
  }) = _AssignedServer;

  factory AssignedServer.fromJson(Map<String, dynamic> json) => 
      _$AssignedServerFromJson(json);
}

/// Unified OTP Validation Response Data
/// 
/// This represents the data field within the unified response for OTP validation
@freezed
class OtpValidationData with _$OtpValidationData {
  const factory OtpValidationData({
    required String status,
    required String sessionId, String? customToken,
    @Default(false) bool isPrimaryCustomer,
  }) = _OtpValidationData;

  factory OtpValidationData.fromJson(Map<String, dynamic> json) => 
      _$OtpValidationDataFromJson(json);
}

/// Table Status Response Data
/// 
/// This represents the data field within the unified response for table status
@freezed
class TableStatusData with _$TableStatusData {
  const factory TableStatusData({
    required String tableNumber,
    required String status, int? capacity,
    PrimaryCustomer? primaryCustomer,
    @Default([]) List<String> occupiedBy,
    AssignedServer? assignedServer,
    @Default(false) bool hasActiveOTP,
  }) = _TableStatusData;

  factory TableStatusData.fromJson(Map<String, dynamic> json) => 
      _$TableStatusDataFromJson(json);
}

/// Table List Response Data
/// 
/// This represents the data field within the unified response for table list
@freezed
class TableListData with _$TableListData {
  const factory TableListData({
    required String restaurantId,
    required int count, @Default([]) List<TableListItem> tables,
  }) = _TableListData;

  factory TableListData.fromJson(Map<String, dynamic> json) => 
      _$TableListDataFromJson(json);
}

/// Individual table item in table list
@freezed
class TableListItem with _$TableListItem {
  const factory TableListItem({
    required String id,
    required String number,
    required String status,
    int? capacity,
    String? assignedServerId,
    @Default(false) bool isOccupied,
    PrimaryCustomer? primaryCustomer,
    String? lastActivity,
    String? activeOrderId,
    String? tableOtp,
  }) = _TableListItem;

  factory TableListItem.fromJson(Map<String, dynamic> json) => 
      _$TableListItemFromJson(json);
}

/// Table Details Response Data
/// 
/// This represents the data field within the unified response for table details
@freezed
class TableDetailsData with _$TableDetailsData {
  const factory TableDetailsData({
    required String id,
    required String number,
    required String status,
    required RestaurantInfo restaurant, int? capacity,
    String? section,
    String? floor,
    AssignedServer? assignedServer,
    @Default(false) bool isOccupied,
    @Default(false) bool hasActiveOTP,
    @Default([]) List<RecentOrder> recentOrders,
    PrimaryCustomer? primaryCustomer,
    @Default([]) List<String> occupiedBy,
    String? lastActivity,
    String? activeOrderId,
    String? otp,
    String? otpGeneratedAt,
    Map<String, dynamic>? reservationDetails,
  }) = _TableDetailsData;

  factory TableDetailsData.fromJson(Map<String, dynamic> json) => 
      _$TableDetailsDataFromJson(json);
}

/// Recent order information
@freezed
class RecentOrder with _$RecentOrder {
  const factory RecentOrder({
    required String id,
    required String status,
    required String createdAt,
    required double totalAmount,
    required int itemCount,
  }) = _RecentOrder;

  factory RecentOrder.fromJson(Map<String, dynamic> json) => 
      _$RecentOrderFromJson(json);
}

/// Table Assignment Response Data
/// 
/// This represents the data field within the unified response for table assignment
@freezed
class TableAssignmentData with _$TableAssignmentData {
  const factory TableAssignmentData({
    required String tableId,
    required String serverId,
    required String serverName,
    required String tableNumber,
  }) = _TableAssignmentData;

  factory TableAssignmentData.fromJson(Map<String, dynamic> json) => 
      _$TableAssignmentDataFromJson(json);
}

/// Table Unassignment Response Data
/// 
/// This represents the data field within the unified response for table unassignment
@freezed
class TableUnassignmentData with _$TableUnassignmentData {
  const factory TableUnassignmentData({
    required String tableId,
    required String tableNumber,
    String? previousServerId,
    String? previousServerName,
  }) = _TableUnassignmentData;

  factory TableUnassignmentData.fromJson(Map<String, dynamic> json) => 
      _$TableUnassignmentDataFromJson(json);
}

/// Table OTP Generation Response Data
/// 
/// This represents the data field within the unified response for OTP generation
@freezed
class TableOtpData with _$TableOtpData {
  const factory TableOtpData({
    required String tableId,
    required String tableNumber,
    required String otp,
    required String otpGeneratedAt,
    required String otpExpiresAt,
  }) = _TableOtpData;

  factory TableOtpData.fromJson(Map<String, dynamic> json) => 
      _$TableOtpDataFromJson(json);
}

/// Table Status Update Response Data
/// 
/// This represents the data field within the unified response for table status update
@freezed
class TableStatusUpdateData with _$TableStatusUpdateData {
  const factory TableStatusUpdateData({
    required String tableId,
    required String tableNumber,
    required String previousStatus,
    required String currentStatus,
    required bool changed,
  }) = _TableStatusUpdateData;

  factory TableStatusUpdateData.fromJson(Map<String, dynamic> json) => 
      _$TableStatusUpdateDataFromJson(json);
}

/// Type aliases for easier usage with UnifiedResponseParser
typedef TableValidationResponse = ApiResponse<TableValidationData>;
typedef OtpValidationResponse = ApiResponse<OtpValidationData>;
typedef TableStatusResponse = ApiResponse<TableStatusData>;
typedef TableListResponse = ApiResponse<TableListData>;
typedef TableDetailsResponse = ApiResponse<TableDetailsData>;
typedef TableAssignmentResponse = ApiResponse<TableAssignmentData>;
typedef TableUnassignmentResponse = ApiResponse<TableUnassignmentData>;
typedef TableOtpResponse = ApiResponse<TableOtpData>;
typedef TableStatusUpdateResponse = ApiResponse<TableStatusUpdateData>;
