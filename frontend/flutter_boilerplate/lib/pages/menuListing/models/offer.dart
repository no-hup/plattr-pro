import 'package:freezed_annotation/freezed_annotation.dart';

part 'offer.freezed.dart';
part 'offer.g.dart';

/// Represents an offer/promotion that can be applied to a cart
@freezed
class Offer with _$Offer {
  const factory Offer({
    required String id,
    String? code,
    required String title,
    required String description,
    String? imageUrl,
    required String type,
    OfferBenefit? benefit,
    @Default(false) bool isApplicable,
    String? reason,
    @Default(0) double potentialSaving,
  }) = _Offer;

  factory Offer.fromJson(Map<String, dynamic> json) => _$OfferFromJson(json);
}

/// Represents the benefit/reward of an offer
@freezed
class OfferBenefit with _$OfferBenefit {
  const factory OfferBenefit({
    required String type,
    @Default(0) double value,
    double? maxDiscount,
    OfferFreeItem? freeItem,
  }) = _OfferBenefit;

  factory OfferBenefit.fromJson(Map<String, dynamic> json) =>
      _$OfferBenefitFromJson(json);
}

/// Represents a free item reward
@freezed
class OfferFreeItem with _$OfferFreeItem {
  const factory OfferFreeItem({
    required String menuItemId,
    @Default(1) int quantity,
  }) = _OfferFreeItem;

  factory OfferFreeItem.fromJson(Map<String, dynamic> json) =>
      _$OfferFreeItemFromJson(json);
}

/// Response from the getApplicableOffers API
@freezed
class OffersResponse with _$OffersResponse {
  const factory OffersResponse({
    @Default([]) List<Offer> offers,
  }) = _OffersResponse;

  factory OffersResponse.fromJson(Map<String, dynamic> json) =>
      _$OffersResponseFromJson(json);
}

/// Response from the applyOffer API
@freezed
class ApplyOfferResponse with _$ApplyOfferResponse {
  const factory ApplyOfferResponse({
    required Map<String, dynamic> cart,
    AppliedOfferInfo? appliedOffer,
  }) = _ApplyOfferResponse;

  factory ApplyOfferResponse.fromJson(Map<String, dynamic> json) =>
      _$ApplyOfferResponseFromJson(json);
}

/// Info about the applied offer
@freezed
class AppliedOfferInfo with _$AppliedOfferInfo {
  const factory AppliedOfferInfo({
    required String id,
    required String title,
    @Default(0) double discountAmount,
  }) = _AppliedOfferInfo;

  factory AppliedOfferInfo.fromJson(Map<String, dynamic> json) =>
      _$AppliedOfferInfoFromJson(json);
}
