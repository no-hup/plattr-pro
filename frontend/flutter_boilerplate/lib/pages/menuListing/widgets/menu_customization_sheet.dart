import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/theme/app_typography.dart';
import 'package:flutterboilerplate/theme/design_system/app_colors.dart';
import 'package:flutterboilerplate/theme/design_system/app_dimensions.dart';
import 'package:flutterboilerplate/widgets/primary_action_button.dart';
import 'package:flutterboilerplate/widgets/quantity_selector.dart';

class MenuCustomizationSheet extends StatefulWidget {
  const MenuCustomizationSheet({
    required this.item,
    required this.onConfirm,
    super.key,
  });

  final MenuItem item;
  final void Function(Map<String, String> variants, Set<String> addons)
      onConfirm;

  @override
  State<MenuCustomizationSheet> createState() => _MenuCustomizationSheetState();
}

class _MenuCustomizationSheetState extends State<MenuCustomizationSheet> {
  late Map<String, String> _selectedVariants;
  late Set<String> _selectedAddons;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _selectedVariants = {};
    _selectedAddons = {};
    _initializeDefaults();
  }

  void _initializeDefaults() {
    for (final variant in widget.item.variants) {
      if (variant.options.isNotEmpty) {
         // Default to first option -> Logic can be improved to check 'isMandatory'
         _selectedVariants[variant.name] = variant.options.first.name;
      }
    }
  }

  double get _totalPrice {
    double total = widget.item.priceInfo.finalPrice.toDouble();

    // Add variants cost
    for (final variant in widget.item.variants) {
      final selectedOptionName = _selectedVariants[variant.name];
      if (selectedOptionName != null) {
        final option = variant.options.firstWhere(
          (o) => o.name == selectedOptionName,
          orElse: () => variant.options.first,
        );
        total += option.priceInfo.finalPrice;
      }
    }

    // Add addons cost
    for (final addon in widget.item.addons) {
      if (_selectedAddons.contains(addon.meta.name)) {
        total += addon.priceInfo.finalPrice;
      }
    }

    return total * _quantity;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: const BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppDimensions.radiusLG),
        ),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          _buildHeader(),

          // Scrollable Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppDimensions.space24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   // Description
                   if (widget.item.meta.description.isNotEmpty) ...[
                     Text(
                       widget.item.meta.description,
                       style: AppTypography.body.copyWith(
                         color: AppColors.inkLight,
                       ),
                     ),
                     const SizedBox(height: AppDimensions.space24),
                   ],

                   // Variants
                   ...widget.item.variants.map(_buildVariantGroup),

                   // Addons
                   if (widget.item.addons.isNotEmpty)
                     _buildAddonsSection(widget.item.addons),
                ],
              ),
            ),
          ),
          
          const Divider(height: 1, color: AppColors.divider),
          
          // Footer
          _buildFooter(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppDimensions.space24,
        AppDimensions.space24,
        AppDimensions.space24,
        AppDimensions.space12,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.item.meta.name,
                  style: AppTypography.h3,
                ),
                Text(
                  'Customize your order',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.inkLight,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: AppColors.ink),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.paperAlt,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVariantGroup(Variant variant) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppDimensions.space24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(variant.name, style: AppTypography.labelLarge),
          const SizedBox(height: AppDimensions.space12),
          ...variant.options.map((option) {
            // RadioGroup logic
            return InkWell(
              onTap: () {
                setState(() {
                  _selectedVariants[variant.name] = option.name;
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Row(
                  children: [
                    Radio<String>(
                      value: option.name,
                      groupValue: _selectedVariants[variant.name],
                      onChanged: (value) {
                         if (value != null) {
                           setState(() {
                             _selectedVariants[variant.name] = value;
                           });
                         }
                      },
                      activeColor: AppColors.primary,
                    ),
                    Expanded(
                      child: Text(option.name, style: AppTypography.body),
                    ),
                    if (option.priceInfo.finalPrice > 0)
                      Text(
                        '+₹${option.priceInfo.finalPrice.toStringAsFixed(0)}',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.inkLight,
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildAddonsSection(List<Addon> addons) {
     return Padding(
      padding: const EdgeInsets.only(bottom: AppDimensions.space24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Add-ons', style: AppTypography.labelLarge),
           const SizedBox(height: AppDimensions.space12),
          ...addons.map((addon) {
            final isSelected = _selectedAddons.contains(addon.meta.name);
            final price = addon.priceInfo.finalPrice;
            
            return InkWell(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedAddons.remove(addon.meta.name);
                  } else {
                    _selectedAddons.add(addon.meta.name);
                  }
                });
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Row(
                  children: [
                    Checkbox(
                      value: isSelected,
                      onChanged: (value) {
                        setState(() {
                          if (value == true) {
                            _selectedAddons.add(addon.meta.name);
                          } else {
                            _selectedAddons.remove(addon.meta.name);
                          }
                        });
                      },
                      activeColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Expanded(
                      child: Text(addon.meta.name, style: AppTypography.body),
                    ),
                    if (price > 0)
                      Text(
                        '+₹${price.toStringAsFixed(0)}',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.inkLight,
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.space24),
        child: Row(
          children: [
            QuantitySelector(
              quantity: _quantity,
              onIncrement: () => setState(() => _quantity++),
              onDecrement: () {
                if (_quantity > 1) setState(() => _quantity--);
              },
            ),
            const SizedBox(width: AppDimensions.space16),
            Expanded(
              child: PrimaryActionButton(
                label: 'ADD ₹${_totalPrice.toStringAsFixed(0)}',
                onPressed: () {
                  widget.onConfirm(_selectedVariants, _selectedAddons);
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
