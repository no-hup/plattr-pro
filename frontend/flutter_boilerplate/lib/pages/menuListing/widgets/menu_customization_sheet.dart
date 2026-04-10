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
  final void Function(Map<String, String> variants, Set<String> addons, int quantity)
      onConfirm;

  @override
  State<MenuCustomizationSheet> createState() => _MenuCustomizationSheetState();
}

class _MenuCustomizationSheetState extends State<MenuCustomizationSheet> {
  // Maps variant.id -> option.id (for API)
  late Map<String, String> _selectedVariantIds;
  // Maps variant.id -> option.name (for display/price calculation)
  late Map<String, String> _selectedVariantNames;
  // Set of addon IDs (for API)
  late Set<String> _selectedAddonIds;
  // Set of addon names (for display/price calculation)
  late Set<String> _selectedAddonNames;
  bool _imageLoadFailed = false;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _selectedVariantIds = {};
    _selectedVariantNames = {};
    _selectedAddonIds = {};
    _selectedAddonNames = {};
    _initializeDefaults();
  }

  void _initializeDefaults() {
    for (final variant in widget.item.variants) {
      if (variant.options.isNotEmpty) {
        // Default to first option -> Logic can be improved to check 'isMandatory'
        final firstOption = variant.options.first;
        _selectedVariantIds[variant.id] = firstOption.id;
        _selectedVariantNames[variant.id] = firstOption.name;
      }
    }
  }

  double get _totalPrice {
    var total = widget.item.priceInfo.finalPrice.toDouble();

    // Add variants cost
    for (final variant in widget.item.variants) {
      final selectedOptionName = _selectedVariantNames[variant.id];
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
      if (_selectedAddonNames.contains(addon.meta.name)) {
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
          // Scrollable Content
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Image & Header Section
                  _buildStickyHeader(context),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppDimensions.space24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Description
                        if (widget.item.meta.description.isNotEmpty) ...[
                          const SizedBox(height: AppDimensions.space12),
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
                          
                        const SizedBox(height: AppDimensions.space24),
                      ],
                    ),
                  ),
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

  Widget _buildStickyHeader(BuildContext context) {
    final hasImage = widget.item.meta.image != null &&
        widget.item.meta.image!.isNotEmpty &&
        !_imageLoadFailed;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Close button overlay for image
        Stack(
          children: [
            if (hasImage) 
              AspectRatio(
                aspectRatio: 16/9,
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppDimensions.radiusLG), // Same as bottom sheet
                  ),
                  child: Image.network(
                    widget.item.meta.image!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted && !_imageLoadFailed) {
                          setState(() {
                            _imageLoadFailed = true;
                          });
                        }
                      });
                      return const SizedBox.shrink();
                    },
                  ),
                ),
              ),
            
            // If no image, we need a spacer for the close button or just normal padding
            if (!hasImage) 
              const SizedBox(height: AppDimensions.space24),

            Positioned(
              top: hasImage ? AppDimensions.space16 : 0,
              right: hasImage ? AppDimensions.space16 : AppDimensions.space8,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: AppColors.ink),
                style: IconButton.styleFrom(
                  backgroundColor: hasImage ? AppColors.paper : AppColors.paperAlt,
                  highlightColor: Colors.transparent, 
                ),
              ),
            ),
          ],
        ),
        
        // Title Section
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppDimensions.space24, 
            AppDimensions.space16, 
            AppDimensions.space24, 
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.item.meta.name,
                style: AppTypography.h3,
              ),
              const SizedBox(height: AppDimensions.space4),
              Text(
                'Customize your order',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.inkLight,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVariantGroup(Variant variant) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppDimensions.space24),
      decoration: BoxDecoration(
        color: AppColors.paperAlt,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMD),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppDimensions.space16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    variant.name.toUpperCase(), 
                    style: AppTypography.labelLarge.copyWith(letterSpacing: 0.5),
                  ),
                ),
                if (variant.isMandatory)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.ink,
                      borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
                    ),
                    child: Text(
                      'REQUIRED',
                      style: AppTypography.labelSmall.copyWith(fontSize: 10, color: AppColors.paper),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          ...variant.options.map((option) {
            final isSelected = _selectedVariantNames[variant.id] == option.name;
            return InkWell(
              onTap: () {
                setState(() {
                  _selectedVariantIds[variant.id] = option.id;
                  _selectedVariantNames[variant.id] = option.name;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.space16, 
                  vertical: AppDimensions.space12,
                ),
                color: isSelected ? AppColors.primaryLight.withValues(alpha: 0.5) : null,
                child: Row(
                  children: [
                    Radio<String>(
                      value: option.name,
                      groupValue: _selectedVariantNames[variant.id],
                      onChanged: (value) {
                         if (value != null) {
                           setState(() {
                             _selectedVariantIds[variant.id] = option.id;
                             _selectedVariantNames[variant.id] = value;
                           });
                         }
                      },
                      activeColor: AppColors.primary,
                      visualDensity: VisualDensity.compact,
                    ),
                    const SizedBox(width: AppDimensions.space8),
                    Expanded(
                      child: Text(
                        option.name, 
                        style: isSelected 
                            ? AppTypography.body.copyWith(fontWeight: FontWeight.w600) 
                            : AppTypography.body,
                      ),
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
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.paperAlt,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMD),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppDimensions.space16),
            child: Text(
              'ADD-ONS', 
              style: AppTypography.labelLarge.copyWith(letterSpacing: 0.5),
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          ...addons.map((addon) {
            final isSelected = _selectedAddonNames.contains(addon.meta.name);
            final price = addon.priceInfo.finalPrice;
            
            return InkWell(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedAddonIds.remove(addon.id);
                    _selectedAddonNames.remove(addon.meta.name);
                  } else {
                    _selectedAddonIds.add(addon.id);
                    _selectedAddonNames.add(addon.meta.name);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.space16, 
                  vertical: AppDimensions.space12,
                ),
                color: isSelected ? AppColors.primaryLight.withValues(alpha: 0.5) : null,
                child: Row(
                  children: [
                    Checkbox(
                      value: isSelected,
                      onChanged: (value) {
                        setState(() {
                          if (value ?? false) {
                            _selectedAddonIds.add(addon.id);
                            _selectedAddonNames.add(addon.meta.name);
                          } else {
                            _selectedAddonIds.remove(addon.id);
                            _selectedAddonNames.remove(addon.meta.name);
                          }
                        });
                      },
                      activeColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                      visualDensity: VisualDensity.compact,
                    ),
                    const SizedBox(width: AppDimensions.space8),
                    Expanded(
                      child: Text(
                        addon.meta.name, 
                        style: isSelected 
                            ? AppTypography.body.copyWith(fontWeight: FontWeight.w600)
                            : AppTypography.body,
                      ),
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
                  // Pass IDs and quantity to onConfirm for the API
                  widget.onConfirm(_selectedVariantIds, _selectedAddonIds, _quantity);
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
