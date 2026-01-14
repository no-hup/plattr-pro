import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class OffersCarousel extends StatelessWidget {
  const OffersCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    // Offers matching the design HTML
    final offers = [
      _OfferData(
        title: '50% off desserts for you',
        actionText: 'VIEW',
        icon: Icons.redeem,
        color: AppColors.paperAlt,
      ),
      _OfferData(
        title: 'Free Delivery on \$75+',
        actionText: 'DETAILS',
        icon: Icons.local_shipping,
        color: AppColors.paperAlt,
      ),
    ];

    return SizedBox(
      height: 48, // Adjusted height for banner style
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg), // 16px page padding
        scrollDirection: Axis.horizontal,
        itemCount: offers.length,
        separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.sm), // 8px gap
        itemBuilder: (context, index) {
          final offer = offers[index];
          return _OfferPill(offer: offer);
        },
      ),
    );
  }
}

class _OfferData {
  _OfferData({
    required this.title,
    required this.actionText,
    required this.icon,
    required this.color,
  });

  final String title;
  final String actionText;
  final IconData icon;
  final Color color;
}

class _OfferPill extends StatelessWidget {
  const _OfferPill({required this.offer});

  final _OfferData offer;

  @override
  Widget build(BuildContext context) {
    // Width: Screen width minus 2x page padding (16*2=32)
    // This makes it a full-width banner in a carousel
    final width = MediaQuery.of(context).size.width - (AppSpacing.lg * 2);

    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: offer.color,
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
                  offer.icon, 
                  size: 16, 
                  color: AppColors.primary
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
          Text(
            offer.actionText,
            style: AppTypography.labelSmall.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.ink.withOpacity(0.4), // ink/40
              letterSpacing: 1.5, // tracking-wider
            ),
          ),
        ],
      ),
    );
  }
}
