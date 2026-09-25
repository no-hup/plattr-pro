import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../menu_catalog_provider.dart';
import 'addon_editor_dialog.dart' show askSharedScope;

/// The dish's portion groups (D6). A group is a shared record: its name and its options' names and prices
/// save to that record, so every dish linking it follows ("Portion is on 3 dishes"), or, for one dish, to a
/// copy. Remove takes the group off this dish only, and lands with the dish's Save.
// DEBT(TD-132): new groups and new or removed options are not made here; D6 decided names and prices only.
class VariantEditorDialog extends StatefulWidget {
  const VariantEditorDialog({
    super.key,
    required this.provider,
    required this.variants,
    this.menuItemId,
    this.dishName,
  });

  final MenuCatalogProvider provider;
  final List<Variant> variants;
  final String? menuItemId;
  final String? dishName;

  @override
  State<VariantEditorDialog> createState() => _VariantEditorDialogState();
}

class _VariantEditorDialogState extends State<VariantEditorDialog> {
  late List<Variant> _variants;
  /// Null until the server has counted; an edit waits for it rather than guess "one dish".
  Map<String, int>? _usedBy;

  @override
  void initState() {
    super.initState();
    _variants = [...widget.variants];
    widget.provider.sharedUsage().then((u) {
      if (!mounted) return;
      if (u == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Could not count the dishes using these portions. Close and open again to edit them.')));
        return;
      }
      setState(() => _usedBy = u.variants);
    });
  }

  Future<void> _editVariant(Variant variant) async {
    final usedBy = _usedBy![variant.id] ?? 0;
    final result = await showDialog<Variant>(
      context: context,
      builder: (context) => _SingleVariantEditor(
        provider: widget.provider,
        variant: variant,
        usedBy: usedBy,
        menuItemId: widget.menuItemId,
        dishName: widget.dishName,
      ),
    );
    if (result == null) return;
    setState(() {
      final index = _variants.indexWhere((v) => v.id == variant.id);
      if (index != -1) _variants[index] = result;
      if (result.id != variant.id) _usedBy = {..._usedBy!, variant.id: usedBy - 1, result.id: 1};
    });
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
                  subtitle: Text([
                    variant.options.map((o) => '${o.name} ₹${o.priceInfo.basePrice}').join(', '),
                    if (_usedBy != null)
                      'on ${_usedBy![variant.id] ?? 0} ${_usedBy![variant.id] == 1 ? 'dish' : 'dishes'}',
                  ].join(' · ')),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      Semantics(
                        identifier: 'variant-edit-${variant.id}',
                        child: IconButton(
                          icon: const Icon(Icons.edit),
                          tooltip: 'Edit names and prices',
                          onPressed: _usedBy == null ? null : () => _editVariant(variant),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.link_off),
                        tooltip: 'Remove from this dish',
                        onPressed: () => setState(() => _variants.removeWhere((v) => v.id == variant.id)),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      // No Cancel: a group edit is already saved; undo a Remove by cancelling the dish.
      actions: [
        Semantics(
          identifier: 'variants-done',
          child: ElevatedButton(
            onPressed: () => Navigator.of(context).pop(_variants),
            child: const Text('Done'),
          ),
        ),
      ],
    );
  }
}

class _SingleVariantEditor extends StatefulWidget {
  const _SingleVariantEditor({
    required this.provider,
    required this.variant,
    required this.usedBy,
    this.menuItemId,
    this.dishName,
  });

  final MenuCatalogProvider provider;
  final Variant variant;
  final int usedBy;
  final String? menuItemId;
  final String? dishName;

  @override
  State<_SingleVariantEditor> createState() => _SingleVariantEditorState();
}

class _SingleVariantEditorState extends State<_SingleVariantEditor> {
  late final TextEditingController _nameController;
  late final Map<String, TextEditingController> _optionNames;
  late final Map<String, TextEditingController> _optionPrices;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.variant.name);
    _optionNames = {
      for (final o in widget.variant.options) o.id: TextEditingController(text: o.name)
    };
    _optionPrices = {
      for (final o in widget.variant.options)
        o.id: TextEditingController(text: o.priceInfo.basePrice.toString())
    };
  }

  @override
  void dispose() {
    for (final c in [_nameController, ..._optionNames.values, ..._optionPrices.values]) {
      c.dispose();
    }
    super.dispose();
  }

  void _say(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    // Only what the manager changed goes: Family ₹260 → ₹280 sends {options: [{id: family, price: 280}]}.
    final options = <Map<String, dynamic>>[];
    for (final o in widget.variant.options) {
      final optName = _optionNames[o.id]!.text.trim();
      final price = num.tryParse(_optionPrices[o.id]!.text.trim());
      if (optName.isEmpty || price == null || price < 0) {
        _say('Each option needs a name and a price of ₹0 or more');
        return;
      }
      final change = <String, dynamic>{
        if (optName != o.name) 'name': optName,
        if (price != o.priceInfo.basePrice) 'price': price,
      };
      if (change.isNotEmpty) options.add({'id': o.id, ...change});
    }
    final changes = <String, dynamic>{
      if (name != widget.variant.name) 'name': name,
      if (options.isNotEmpty) 'options': options,
    };
    if (changes.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    final scope = await askSharedScope(context,
        name: widget.variant.name,
        usedBy: widget.usedBy,
        dishName: widget.menuItemId == null ? null : widget.dishName);
    if (scope == null || !mounted) return;
    setState(() => _busy = true);
    final record = await widget.provider.changeSharedOption(
      kind: 'variant',
      id: widget.variant.id,
      changes: changes,
      onlyForMenuItemId: scope == 'only' ? widget.menuItemId : null,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (record == null) {
      _say(widget.provider.errorMessage ?? 'Could not save the portion');
      return;
    }
    Navigator.of(context).pop(Variant.fromJson(record));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.usedBy > 1 ? 'Edit Variant · on ${widget.usedBy} dishes' : 'Edit Variant'),
      content: SizedBox(
        width: 500,
        child: ListView(
          shrinkWrap: true,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Variant Name'),
            ),
            const SizedBox(height: 16),
            const Text('Options'),
            const SizedBox(height: 8),
            for (final option in widget.variant.options)
              Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _optionNames[option.id],
                        decoration: const InputDecoration(labelText: 'Name'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 120,
                      child: Semantics(
                        identifier: 'variant-option-price-${option.id}',
                        child: TextField(
                          controller: _optionPrices[option.id],
                          decoration: const InputDecoration(labelText: 'Price'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        Semantics(
          identifier: 'variant-save',
          child: ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: const Text('Save'),
          ),
        ),
      ],
    );
  }
}
