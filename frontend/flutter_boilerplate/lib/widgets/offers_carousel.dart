import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class OffersCarousel extends StatelessWidget {
  const OffersCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    // Placeholder offers as per plan
    final offers = [
      _OfferData(
        title: 'FLAT 20% OFF',
        description: 'On orders above ₹500',
        icon: Icons.percent,
        color: const Color(0xFFE0F2FE), // Light Blue
        iconColor: const Color(0xFF0284C7),
      ),
      _OfferData(
        title: 'FREE DESSERT',
        description: 'With any main course',
        icon: Icons.cake,
        color: const Color(0xFFF3E8FF), // Light Purple
        iconColor: const Color(0xFF9333EA),
      ),
    ];

    return SizedBox(
      height: 60,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        scrollDirection: Axis.horizontal,
        itemCount: offers.length,
        separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.sm),
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
    required this.description,
    required this.icon,
    required this.color,
    required this.iconColor,
  });

  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final Color iconColor;
}

class _OfferPill extends StatelessWidget {
  const _OfferPill({required this.offer});

  final _OfferData offer;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: offer.color,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        border: Border.all(
          color: offer.color.withOpacity(0.5).withRed(200), // Slightly darker border
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(offer.icon, size: 16, color: offer.iconColor),
          const SizedBox(width: 8),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                offer.title,
                style: AppTypography.labelSmall.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.ink,
                ),
              ),
              Text(
                offer.description,
                style: AppTypography.labelSmall.copyWith(
                  fontSize: 10,
                  color: AppColors.inkLight,
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
    );
  }
}
