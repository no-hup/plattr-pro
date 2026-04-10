// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'offer.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OfferImpl _$$OfferImplFromJson(Map<String, dynamic> json) => _$OfferImpl(
      id: json['id'] as String,
      code: json['code'] as String?,
      title: json['title'] as String,
      description: json['description'] as String,
      imageUrl: json['imageUrl'] as String?,
      type: json['type'] as String,
      scope: json['scope'] as String?,
      exclusionIds: (json['exclusionIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      termsAndConditions: json['termsAndConditions'] as String?,
      priority: (json['priority'] as num?)?.toInt(),
      benefit: json['benefit'] == null
          ? null
          : OfferBenefit.fromJson(json['benefit'] as Map<String, dynamic>),
      isApplicable: json['isApplicable'] as bool? ?? false,
      reason: json['reason'] as String?,
      potentialSaving: (json['potentialSaving'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$$OfferImplToJson(_$OfferImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'title': instance.title,
      'description': instance.description,
      'imageUrl': instance.imageUrl,
      'type': instance.type,
      'scope': instance.scope,
      'exclusionIds': instance.exclusionIds,
      'termsAndConditions': instance.termsAndConditions,
      'priority': instance.priority,
      'benefit': instance.benefit,
      'isApplicable': instance.isApplicable,
      'reason': instance.reason,
      'potentialSaving': instance.potentialSaving,
    };

_$OfferBenefitImpl _$$OfferBenefitImplFromJson(Map<String, dynamic> json) =>
    _$OfferBenefitImpl(
      type: json['type'] as String,
      value: (json['value'] as num?)?.toDouble() ?? 0,
      maxDiscount: (json['maxDiscount'] as num?)?.toDouble(),
      freeItem: json['freeItem'] == null
          ? null
          : OfferFreeItem.fromJson(json['freeItem'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$OfferBenefitImplToJson(_$OfferBenefitImpl instance) =>
    <String, dynamic>{
      'type': instance.type,
      'value': instance.value,
      'maxDiscount': instance.maxDiscount,
      'freeItem': instance.freeItem,
    };

_$OfferFreeItemImpl _$$OfferFreeItemImplFromJson(Map<String, dynamic> json) =>
    _$OfferFreeItemImpl(
      menuItemId: json['menuItemId'] as String,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
    );

Map<String, dynamic> _$$OfferFreeItemImplToJson(_$OfferFreeItemImpl instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'quantity': instance.quantity,
    };

_$OffersResponseImpl _$$OffersResponseImplFromJson(Map<String, dynamic> json) =>
    _$OffersResponseImpl(
      offers: (json['offers'] as List<dynamic>?)
              ?.map((e) => Offer.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$OffersResponseImplToJson(
        _$OffersResponseImpl instance) =>
    <String, dynamic>{
      'offers': instance.offers,
    };

_$ApplyOfferResponseImpl _$$ApplyOfferResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$ApplyOfferResponseImpl(
      cart: json['cart'] as Map<String, dynamic>,
      appliedOffer: json['appliedOffer'] == null
          ? null
          : AppliedOfferInfo.fromJson(
              json['appliedOffer'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$ApplyOfferResponseImplToJson(
        _$ApplyOfferResponseImpl instance) =>
    <String, dynamic>{
      'cart': instance.cart,
      'appliedOffer': instance.appliedOffer,
    };

_$AppliedOfferInfoImpl _$$AppliedOfferInfoImplFromJson(
        Map<String, dynamic> json) =>
    _$AppliedOfferInfoImpl(
      id: json['id'] as String,
      title: json['title'] as String,
      discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$$AppliedOfferInfoImplToJson(
        _$AppliedOfferInfoImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'discountAmount': instance.discountAmount,
    };
