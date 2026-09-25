import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../menu_catalog_provider.dart';
import 'addon_editor_dialog.dart' show askSharedScope;

// DECISION(D6/TD-132, 2026-09-25): a portion group is a shared record. Its name, its options' names and prices, and
// added or deleted options save to that record, so every dish linking it follows ("Portion is on 3 dishes"), or,
// for one dish, to a copy. A new group is made here and linked by the dish's Save. Remove takes a group off this
// dish only. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
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

  Future<void> _createVariant() async {
    final created = await showDialog<Variant>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _SingleVariantEditor(provider: widget.provider, usedBy: 0),
    );
    if (created == null) return;
    setState(() {
      _variants.add(created);
      if (_usedBy != null) _usedBy = {..._usedBy!, created.id: 0};
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
            const SizedBox(height: 8),
            Semantics(
              identifier: 'variant-add',
              child: OutlinedButton.icon(
                onPressed: _createVariant,
                icon: const Icon(Icons.add),
                label: const Text('Add Variant'),
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
    this.variant,
    required this.usedBy,
    this.menuItemId,
    this.dishName,
  });

  final MenuCatalogProvider provider;
  /// Null for a new group (TD-132): Save creates the shared record, the dish's Save links it.
  final Variant? variant;
  final int usedBy;
  final String? menuItemId;
  final String? dishName;

  @override
  State<_SingleVariantEditor> createState() => _SingleVariantEditorState();
}

/// One option row on screen; [id] is null until the server has made the option.
class _Row {
  _Row({this.id, String name = '', String price = ''})
      : name = TextEditingController(text: name),
        price = TextEditingController(text: price);
  final String? id;
  final TextEditingController name;
  final TextEditingController price;
  final key = UniqueKey();
}

class _SingleVariantEditorState extends State<_SingleVariantEditor> {
  late final TextEditingController _nameController;
  late final List<_Row> _rows;
  final _dropped = <TextEditingController>[];
  bool _isMandatory = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.variant?.name ?? '');
    _rows = [
      for (final o in widget.variant?.options ?? const <VariantOption>[])
        _Row(id: o.id, name: o.name, price: o.priceInfo.basePrice.toString()),
    ];
    if (_rows.isEmpty) _rows.add(_Row());
  }

  @override
  void dispose() {
    for (final c in [_nameController, ..._dropped, for (final r in _rows) ...[r.name, r.price]]) {
      c.dispose();
    }
    super.dispose();
  }

  void _say(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  void _removeRow(_Row row) => setState(() {
        _rows.remove(row);
        _dropped.addAll([row.name, row.price]);
      });

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return _say('Give the variant a name');
    final rows = <OptionRow>[];
    for (final r in _rows) {
      final optName = r.name.text.trim();
      final price = num.tryParse(r.price.text.trim());
      if (optName.isEmpty || price == null || price < 0) {
        return _say('Each option needs a name and a price of ₹0 or more');
      }
      rows.add(OptionRow(id: r.id, name: optName, price: price));
    }
    if (rows.isEmpty) return _say('A variant needs at least one option');

    final was = widget.variant;
    if (was == null) {
      setState(() => _busy = true);
      final created = await widget.provider.createVariant(name: name, isMandatory: _isMandatory, options: rows);
      if (!mounted) return;
      setState(() => _busy = false);
      if (created == null) return _say(widget.provider.errorMessage ?? 'Could not create the variant');
      Navigator.of(context).pop(created);
      return;
    }

    final changes = portionChanges(was, name, rows);
    if (changes.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    // "Portion is on 2 dishes — Change all 2 / Only Chicken Dum Biryani": adding Jumbo or deleting Family asks too.
    final scope = await askSharedScope(context,
        name: was.name, usedBy: widget.usedBy, dishName: widget.menuItemId == null ? null : widget.dishName);
    if (scope == null || !mounted) return;
    setState(() => _busy = true);
    final record = await widget.provider.changeSharedOption(
      kind: 'variant',
      id: was.id,
      changes: changes,
      onlyForMenuItemId: scope == 'only' ? widget.menuItemId : null,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (record == null) return _say(widget.provider.errorMessage ?? 'Could not save the portion');
    Navigator.of(context).pop(Variant.fromJson(record));
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.variant == null;
    return AlertDialog(
      title: Text(isNew
          ? 'New Variant'
          : widget.usedBy > 1
              ? 'Edit Variant · on ${widget.usedBy} dishes'
              : 'Edit Variant'),
      content: SizedBox(
        width: 500,
        child: ListView(
          shrinkWrap: true,
          children: [
            Semantics(
              identifier: 'variant-name',
              child: TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Variant Name'),
              ),
            ),
            if (isNew)
              SwitchListTile(
                value: _isMandatory,
                title: const Text('Guest must pick one'),
                onChanged: (value) => setState(() => _isMandatory = value),
              ),
            const SizedBox(height: 16),
            const Text('Options'),
            const SizedBox(height: 8),
            for (final (i, row) in _rows.indexed)
              Padding(
                key: row.key,
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        identifier: 'variant-option-name-${row.id ?? 'new$i'}',
                        child: TextField(
                          controller: row.name,
                          decoration: const InputDecoration(labelText: 'Name'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 120,
                      child: Semantics(
                        identifier: 'variant-option-price-${row.id ?? 'new$i'}',
                        child: TextField(
                          controller: row.price,
                          decoration: const InputDecoration(labelText: 'Price'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ),
                    Semantics(
                      identifier: 'variant-option-delete-${row.id ?? 'new$i'}',
                      child: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: 'Remove option',
                        // The server refuses a group with no options; the last row stays.
                        onPressed: _busy || _rows.length == 1 ? null : () => _removeRow(row),
                      ),
                    ),
                  ],
                ),
              ),
            Semantics(
              identifier: 'variant-add-option',
              child: OutlinedButton.icon(
                onPressed: _busy ? null : () => setState(() => _rows.add(_Row())),
                icon: const Icon(Icons.add),
                label: const Text('Add Option'),
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
