// File: menu_customization_sheet.dart
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';

class MenuCustomizationSheet extends StatefulWidget {
  const MenuCustomizationSheet({
    required this.item,
    required this.onConfirm,
    super.key,
  });

  final MenuItem item;
  final Function(Map<String, String> selectedVariants, List<String> selectedAddons) onConfirm;

  @override
  State<MenuCustomizationSheet> createState() => _MenuCustomizationSheetState();
}

class _MenuCustomizationSheetState extends State<MenuCustomizationSheet> {
  final Map<String, String> _selectedVariants = {};
  final List<String> _selectedAddons = [];

  bool get _canConfirm {
    if (widget.item.variants.isEmpty) return true;
    
    // Check if all mandatory variants are selected
    for (final variant in widget.item.variants) {
      if (variant.isMandatory) {
        if (!_selectedVariants.containsKey(variant.id)) {
          return false;
        }
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(),
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.item.variants.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text(
                        'Variants',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    ..._buildVariantSelections(),
                  ],
                  if (widget.item.addons.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text(
                        'Add Ons',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    ..._buildAddonSelections(),
                  ],
                ],
              ),
            ),
          ),
          _buildFooter(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.item.meta.name,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.item.meta.description,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  List<Widget> _buildVariantSelections() {
    return widget.item.variants.map((variant) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  variant.name,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                if (variant.isMandatory)
                  Text(
                    ' *',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            ...variant.options.map((option) {
              return RadioListTile<String>(
                title: Text(option.name),
                value: option.id,
                groupValue: _selectedVariants[variant.id],
                onChanged: (value) {
                  setState(() {
                    if (value != null) {
                      _selectedVariants[variant.id] = value;
                    }
                  });
                },
              );
            }).toList(),
          ],
        ),
      );
    }).toList();
  }

  List<Widget> _buildAddonSelections() {
    return widget.item.addons.map((addon) {
      return CheckboxListTile(
        title: Text(addon.meta.name),
        subtitle: Text(addon.meta.description),
        value: _selectedAddons.contains(addon.id),
        onChanged: (selected) {
          setState(() {
            if (selected == true) {
              _selectedAddons.add(addon.id);
            } else {
              _selectedAddons.remove(addon.id);
            }
          });
        },
      );
    }).toList();
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: Theme.of(context).dividerColor,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          const SizedBox(width: 16),
          ElevatedButton(
            onPressed: _canConfirm
                ? () {
                    widget.onConfirm(_selectedVariants, _selectedAddons);
                    Navigator.pop(context);
                  }
                : null,
            child: const Text('Add to Cart'),
          ),
        ],
      ),
    );
  }
}