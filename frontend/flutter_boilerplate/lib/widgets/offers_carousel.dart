import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/models/offer.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class OffersCarousel extends StatelessWidget {
  const OffersCarousel({
    super.key,
    required this.offers,
    this.onOfferTap,
  });

  final List<Offer> offers;
  final void Function(Offer offer)? onOfferTap;

  @override
  Widget build(BuildContext context) {
    if (offers.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: 48, // Adjusted height for banner style
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        scrollDirection: Axis.horizontal,
        itemCount: offers.length,
        separatorBuilder: (context, index) =>
            const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final offer = offers[index];
          return _OfferPill(
            offer: offer,
            onTap: onOfferTap,
          );
        },
      ),
    );
  }
}

IconData _iconForOfferType(String type) {
  switch (type.toUpperCase()) {
    case 'PERCENTAGE':
      return Icons.percent;
    case 'FLAT':
      return Icons.local_offer;
    case 'BOGO':
      return Icons.redeem;
    default:
      return Icons.card_giftcard;
  }
}

class _OfferPill extends StatelessWidget {
  const _OfferPill({required this.offer, this.onTap});

  final Offer offer;
  final void Function(Offer offer)? onTap;

  @override
  Widget build(BuildContext context) {
    // Width: Screen width minus 2x page padding (16*2=32)
    final width =
        MediaQuery.of(context).size.width - (AppSpacing.lg * 2);

    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: AppColors.paperAlt,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        border: Border.all(
          color: AppColors.divider.withOpacity(0.5),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Icon + Text
          Expanded(
            child: Row(
              children: [
                Icon(
                  _iconForOfferType(offer.type),
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    offer.title,
                    style: AppTypography.uiSerif.copyWith(
                      fontStyle: FontStyle.italic,
                      fontSize: 14,
                      color: AppColors.ink,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // Right: Action Button Text
          const SizedBox(width: AppSpacing.sm),
          GestureDetector(
            onTap: () => onTap?.call(offer),
            behavior: HitTestBehavior.opaque,
            child: Text(
              'VIEW',
              style: AppTypography.labelSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.ink.withOpacity(0.4),
                letterSpacing: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
