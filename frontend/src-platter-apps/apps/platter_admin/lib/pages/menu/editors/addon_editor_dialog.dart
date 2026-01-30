import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

class AddonEditorDialog extends StatefulWidget {
  const AddonEditorDialog({
    super.key,
    required this.addons,
  });

  final List<Addon> addons;

  @override
  State<AddonEditorDialog> createState() => _AddonEditorDialogState();
}

class _AddonEditorDialogState extends State<AddonEditorDialog> {
  late List<Addon> _addons;

  @override
  void initState() {
    super.initState();
    _addons = widget.addons
        .map((addon) => Addon(
              id: addon.id,
              priceInfo: addon.priceInfo,
              meta: addon.meta,
              respectParentDiscount: addon.respectParentDiscount,
              isInStock: addon.isInStock,
              itemsAssociatedWith: addon.itemsAssociatedWith,
              isMandatory: addon.isMandatory,
            ))
        .toList();
  }

  void _addAddon() {
    final now = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      _addons.add(Addon(
        id: 'addon_$now',
        priceInfo: PriceInfo(basePrice: 0, finalPrice: 0, discount: 0),
        meta: const AddonMeta(name: ''),
      ));
    });
  }

  void _removeAddon(Addon addon) {
    setState(() {
      _addons.removeWhere((a) => a.id == addon.id);
    });
  }

  void _updateAddon(Addon addon, String name, num price, bool inStock,
      bool isMandatory) {
    final updated = Addon(
      id: addon.id,
      priceInfo: PriceInfo(basePrice: price, finalPrice: price, discount: 0),
      meta: AddonMeta(name: name),
      isInStock: inStock,
      isMandatory: isMandatory,
    );
    setState(() {
      final index = _addons.indexWhere((a) => a.id == addon.id);
      if (index != -1) {
        _addons[index] = updated;
      }
    });
  }

  void _submit() {
    final cleaned = _addons
        .where((addon) => addon.meta.name.trim().isNotEmpty)
        .toList();
    Navigator.of(context).pop(cleaned);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit Add-ons'),
      content: SizedBox(
        width: 500,
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final addon in _addons)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    children: [
                      TextField(
                        controller: TextEditingController(text: addon.meta.name),
                        decoration: const InputDecoration(labelText: 'Name'),
                        onChanged: (value) => _updateAddon(
                          addon,
                          value,
                          addon.priceInfo.basePrice,
                          addon.isInStock,
                          addon.isMandatory,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: TextEditingController(
                          text: addon.priceInfo.basePrice.toString(),
                        ),
                        decoration: const InputDecoration(labelText: 'Price'),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateAddon(
                          addon,
                          addon.meta.name,
                          num.tryParse(value) ?? 0,
                          addon.isInStock,
                          addon.isMandatory,
                        ),
                      ),
                      SwitchListTile(
                        value: addon.isInStock,
                        title: const Text('In Stock'),
                        onChanged: (value) => _updateAddon(
                          addon,
                          addon.meta.name,
                          addon.priceInfo.basePrice,
                          value,
                          addon.isMandatory,
                        ),
                      ),
                      SwitchListTile(
                        value: addon.isMandatory,
                        title: const Text('Mandatory'),
                        onChanged: (value) => _updateAddon(
                          addon,
                          addon.meta.name,
                          addon.priceInfo.basePrice,
                          addon.isInStock,
                          value,
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: () => _removeAddon(addon),
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Remove'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _addAddon,
              icon: const Icon(Icons.add),
              label: const Text('Add Add-on'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('Save'),
        ),
      ],
    );
  }
}
