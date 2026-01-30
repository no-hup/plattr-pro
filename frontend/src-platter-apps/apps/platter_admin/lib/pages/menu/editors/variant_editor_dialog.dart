import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

class VariantEditorDialog extends StatefulWidget {
  const VariantEditorDialog({
    super.key,
    required this.variants,
  });

  final List<Variant> variants;

  @override
  State<VariantEditorDialog> createState() => _VariantEditorDialogState();
}

class _VariantEditorDialogState extends State<VariantEditorDialog> {
  late List<Variant> _variants;

  @override
  void initState() {
    super.initState();
    _variants = widget.variants
        .map((variant) => Variant(
              id: variant.id,
              meta: variant.meta,
              options: variant.options,
              respectParentDiscount: variant.respectParentDiscount,
              itemsAssociatedWith: variant.itemsAssociatedWith,
              isMandatory: variant.isMandatory,
              name: variant.name,
            ))
        .toList();
  }

  void _addVariant() {
    final now = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      _variants.add(
        Variant(
          id: 'variant_$now',
          meta: const VariantMeta(name: ''),
          options: const [],
          name: '',
        ),
      );
    });
  }

  Future<void> _editVariant(Variant variant) async {
    final result = await showDialog<Variant>(
      context: context,
      builder: (context) => _SingleVariantEditor(variant: variant),
    );
    if (result != null) {
      setState(() {
        final index = _variants.indexWhere((v) => v.id == variant.id);
        if (index != -1) {
          _variants[index] = result;
        }
      });
    }
  }

  void _removeVariant(Variant variant) {
    setState(() {
      _variants.removeWhere((v) => v.id == variant.id);
    });
  }

  void _submit() {
    Navigator.of(context).pop(_variants);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit Variants'),
      content: SizedBox(
        width: 500,
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final variant in _variants)
              Card(
                child: ListTile(
                  title: Text(variant.name.isEmpty ? 'Unnamed Variant' : variant.name),
                  subtitle: Text(
                    variant.options.isEmpty
                        ? 'No options'
                        : '${variant.options.length} options',
                  ),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => _editVariant(variant),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _removeVariant(variant),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _addVariant,
              icon: const Icon(Icons.add),
              label: const Text('Add Variant'),
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

class _SingleVariantEditor extends StatefulWidget {
  const _SingleVariantEditor({required this.variant});

  final Variant variant;

  @override
  State<_SingleVariantEditor> createState() => _SingleVariantEditorState();
}

class _SingleVariantEditorState extends State<_SingleVariantEditor> {
  late TextEditingController _nameController;
  late List<VariantOption> _options;
  bool _isMandatory = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.variant.name);
    _options = widget.variant.options
        .map((option) => VariantOption(
              id: option.id,
              name: option.name,
              priceInfo: option.priceInfo,
            ))
        .toList();
    _isMandatory = widget.variant.isMandatory;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _addOption() {
    final now = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      _options.add(VariantOption(
        id: 'option_$now',
        name: '',
        priceInfo: PriceInfo(basePrice: 0, finalPrice: 0, discount: 0),
      ));
    });
  }

  void _removeOption(VariantOption option) {
    setState(() {
      _options.removeWhere((o) => o.id == option.id);
    });
  }

  void _updateOption(VariantOption option, String name, num price) {
    final updated = VariantOption(
      id: option.id,
      name: name,
      priceInfo: PriceInfo(basePrice: price, finalPrice: price, discount: 0),
    );
    setState(() {
      final index = _options.indexWhere((o) => o.id == option.id);
      if (index != -1) {
        _options[index] = updated;
      }
    });
  }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      return;
    }
    final cleanedOptions = _options
        .where((option) => option.name.trim().isNotEmpty)
        .toList();

    Navigator.of(context).pop(Variant(
      id: widget.variant.id,
      meta: VariantMeta(name: name),
      options: cleanedOptions,
      isMandatory: _isMandatory,
      name: name,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit Variant'),
      content: SizedBox(
        width: 500,
        child: ListView(
          shrinkWrap: true,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Variant Name'),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              value: _isMandatory,
              title: const Text('Mandatory'),
              onChanged: (value) => setState(() => _isMandatory = value),
            ),
            const SizedBox(height: 8),
            const Text('Options'),
            const SizedBox(height: 8),
            for (final option in _options)
              Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: TextEditingController(text: option.name),
                        decoration: const InputDecoration(labelText: 'Name'),
                        onChanged: (value) {
                          _updateOption(
                            option,
                            value,
                            option.priceInfo.basePrice,
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 120,
                      child: TextField(
                        controller: TextEditingController(
                          text: option.priceInfo.basePrice.toString(),
                        ),
                        decoration: const InputDecoration(labelText: 'Price'),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          final price = num.tryParse(value) ?? 0;
                          _updateOption(option, option.name, price);
                        },
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => _removeOption(option),
                    ),
                  ],
                ),
              ),
            OutlinedButton.icon(
              onPressed: _addOption,
              icon: const Icon(Icons.add),
              label: const Text('Add Option'),
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
