import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../menu_catalog_provider.dart';

/// D6: where a shared add-on or portion edit goes. 'all' changes the shared record, 'only' copies it for this
/// dish; null is Cancel. One dish (or a dish not saved yet) needs no question.
Future<String?> askSharedScope(
  BuildContext context, {
  required String name,
  required int usedBy,
  required String? dishName,
}) async {
  if (usedBy <= 1) return 'all';
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('$name is on $usedBy dishes'),
      content: Text('This changes all $usedBy.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('Cancel'),
        ),
        if (dishName != null)
          Semantics(
            identifier: 'shared-scope-only',
            child: TextButton(
              onPressed: () => Navigator.of(ctx).pop('only'),
              child: Text('Only $dishName'),
            ),
          ),
        Semantics(
          identifier: 'shared-scope-all',
          child: ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop('all'),
            child: Text('Change all $usedBy'),
          ),
        ),
      ],
    ),
  );
}

// DECISION(D6, 2026-09-25): "Raita is on 6 dishes — this changes all 6"; removing from one dish is a dish edit.
// See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
/// The dish's add-ons. Name, price and stock are the shared record's and save the moment they are changed;
/// Remove takes the add-on off this dish only, and lands with the dish's Save.
class AddonEditorDialog extends StatefulWidget {
  const AddonEditorDialog({
    super.key,
    required this.provider,
    required this.addons,
    this.menuItemId,
    this.dishName,
  });

  final MenuCatalogProvider provider;
  final List<Addon> addons;
  /// Null while the dish is new: then there is no "only this dish" to copy for.
  final String? menuItemId;
  final String? dishName;

  @override
  State<AddonEditorDialog> createState() => _AddonEditorDialogState();
}

class _AddonEditorDialogState extends State<AddonEditorDialog> {
  late List<Addon> _addons;
  /// Null until the server has counted; a shared save waits for it rather than guess "one dish".
  Map<String, int>? _usedBy;
  final _names = <String, TextEditingController>{};
  final _prices = <String, TextEditingController>{};
  final _newName = TextEditingController();
  final _newPrice = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _addons = [...widget.addons];
    widget.provider.sharedUsage().then((u) {
      if (!mounted) return;
      if (u == null) return _say('Could not count the dishes using these add-ons. Close and open again to edit them.');
      setState(() => _usedBy = u.addons);
    });
  }

  @override
  void dispose() {
    for (final c in [..._names.values, ..._prices.values, _newName, _newPrice]) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _name(Addon a) =>
      _names.putIfAbsent(a.id, () => TextEditingController(text: a.meta.name));
  TextEditingController _price(Addon a) => _prices.putIfAbsent(
      a.id, () => TextEditingController(text: a.priceInfo.basePrice.toString()));

  void _replace(String oldId, Addon next) {
    setState(() {
      final i = _addons.indexWhere((a) => a.id == oldId);
      if (i != -1) _addons[i] = next;
      _names.remove(oldId)?.dispose();
      _prices.remove(oldId)?.dispose();
    });
  }

  void _say(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Future<void> _saveShared(Addon addon) async {
    final name = _name(addon).text.trim();
    final price = num.tryParse(_price(addon).text.trim());
    if (name.isEmpty || price == null || price < 0) {
      _say('Give the add-on a name and a price of ₹0 or more');
      return;
    }
    final changes = <String, dynamic>{
      if (name != addon.meta.name) 'name': name,
      if (price != addon.priceInfo.basePrice) 'price': price,
    };
    if (changes.isEmpty) return;
    final usedBy = _usedBy![addon.id] ?? 0;
    final scope = await askSharedScope(context,
        name: addon.meta.name, usedBy: usedBy, dishName: widget.menuItemId == null ? null : widget.dishName);
    if (scope == null) return;
    setState(() => _busy = true);
    final record = await widget.provider.changeSharedOption(
      kind: 'addon',
      id: addon.id,
      changes: changes,
      onlyForMenuItemId: scope == 'only' ? widget.menuItemId : null,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (record == null) {
      _say(widget.provider.errorMessage ?? 'Could not save the add-on');
      return;
    }
    final saved = Addon.fromJson(record);
    _replace(addon.id, saved);
    if (scope == 'only') {
      _usedBy = {..._usedBy!, addon.id: usedBy - 1, saved.id: 1};
      _say('${saved.meta.name} changed on ${widget.dishName} only');
    } else {
      _say('${saved.meta.name} changed on $usedBy ${usedBy == 1 ? 'dish' : 'dishes'}');
    }
  }

  Future<void> _setStock(Addon addon, bool inStock) async {
    setState(() => _busy = true);
    final ok = await widget.provider.setAddonStock(addon.id, inStock);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      _say(widget.provider.errorMessage ?? 'Could not switch the add-on');
      return;
    }
    _replace(
        addon.id,
        Addon(
          id: addon.id,
          priceInfo: addon.priceInfo,
          meta: addon.meta,
          respectParentDiscount: addon.respectParentDiscount,
          isInStock: inStock,
          isMandatory: addon.isMandatory,
        ));
    final n = _usedBy?[addon.id] ?? 0;
    _say('${addon.meta.name} ${inStock ? 'back on' : 'off'} on $n ${n == 1 ? 'dish' : 'dishes'}');
  }

  // Q6-3: "Extra cheese ₹30" typed here becomes a shared add-on straight away; the dish's Save links it.
  Future<void> _create() async {
    final name = _newName.text.trim();
    final price = num.tryParse(_newPrice.text.trim());
    if (name.isEmpty || price == null || price < 0) {
      _say('Give the new add-on a name and a price of ₹0 or more');
      return;
    }
    setState(() => _busy = true);
    final addon = await widget.provider.createAddon(name: name, price: price);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (addon != null) {
        _addons.add(addon);
        if (_usedBy != null) _usedBy = {..._usedBy!, addon.id: 0};
        _newName.clear();
        _newPrice.clear();
      }
    });
    if (addon == null) _say(widget.provider.errorMessage ?? 'Could not create the add-on');
  }

  void _done() {
    // A price typed but never saved would read as done; say so instead of dropping it.
    final pending = _addons.where((a) =>
        (_names[a.id] != null && _names[a.id]!.text.trim() != a.meta.name) ||
        (_prices[a.id] != null && num.tryParse(_prices[a.id]!.text.trim()) != a.priceInfo.basePrice));
    if (pending.isNotEmpty) {
      _say('Press Save change on ${pending.first.meta.name}, or put it back, first');
      return;
    }
    Navigator.of(context).pop(_addons);
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
                key: ValueKey(addon.id),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _usedBy == null
                            ? 'Counting dishes…'
                            : 'On ${_usedBy![addon.id] ?? 0} ${_usedBy![addon.id] == 1 ? 'dish' : 'dishes'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      TextField(
                        controller: _name(addon),
                        decoration: const InputDecoration(labelText: 'Name'),
                      ),
                      const SizedBox(height: 8),
                      Semantics(
                        identifier: 'addon-price-${addon.id}',
                        child: TextField(
                          controller: _price(addon),
                          decoration: const InputDecoration(labelText: 'Price'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      Semantics(
                        identifier: 'addon-stock-${addon.id}',
                        child: SwitchListTile(
                          value: addon.isInStock,
                          title: const Text('In Stock'),
                          onChanged: _busy ? null : (value) => _setStock(addon, value),
                        ),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            onPressed: _busy
                                ? null
                                : () => setState(() => _addons.removeWhere((a) => a.id == addon.id)),
                            icon: const Icon(Icons.link_off),
                            label: const Text('Remove from this dish'),
                          ),
                          const SizedBox(width: 8),
                          Semantics(
                            identifier: 'addon-save-${addon.id}',
                            child: ElevatedButton(
                              onPressed: _busy || _usedBy == null ? null : () => _saveShared(addon),
                              child: const Text('Save change'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _newName,
                    decoration: const InputDecoration(labelText: 'New add-on name'),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 100,
                  child: TextField(
                    controller: _newPrice,
                    decoration: const InputDecoration(labelText: 'Price'),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _create,
                  icon: const Icon(Icons.add),
                  label: const Text('Add'),
                ),
              ],
            ),
          ],
        ),
      ),
      // No Cancel: shared edits are already saved, and a Cancel here would hand the dish its old links back.
      // Undo a Remove by cancelling the dish.
      actions: [
        Semantics(
          identifier: 'addons-done',
          child: ElevatedButton(
            onPressed: _busy ? null : _done,
            child: const Text('Done'),
          ),
        ),
      ],
    );
  }
}
