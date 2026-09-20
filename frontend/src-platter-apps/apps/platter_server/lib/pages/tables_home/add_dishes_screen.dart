import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../menu_home/repository/menu_api_service.dart';
import 'dish_search.dart';
import 'models/table_models.dart';
import 'repository/order_entry_api_service.dart';

/// One screen: search a dish, tap to add, Send. Guest rounds and staff rounds land on the same
/// table session, so the kitchen and the bill see one sitting (OR-S1, OR-S22).
class AddDishesScreen extends StatefulWidget {
  const AddDishesScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.table,
  });

  final String restaurantId;
  /// The STAFF session. The table's own session comes back from openTable.
  final String sessionId;
  final TableModel table;

  @override
  State<AddDishesScreen> createState() => _AddDishesScreenState();
}

class _RoundLine {
  _RoundLine(this.item, this.variants);
  final MenuItem item;
  final Map<String, String> variants; // variantId → optionId, mandatory ones only
  int qty = 1;
  String get key => '${item.id}|${variants.entries.map((e) => '${e.key}=${e.value}').join(',')}';
}

class _AddDishesScreenState extends State<AddDishesScreen> {
  final _api = OrderEntryApiService();
  final _menuApi = MenuApiService();
  final _search = TextEditingController();

  OpenTableResult? _open;
  List<MenuItem> _all = const [];
  String? _category;
  List<MenuCategory> _categories = const [];
  final Map<String, _RoundLine> _round = {};
  String? _error;
  bool _busy = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    int? covers;
    if (widget.table.status.toLowerCase() == 'vacant') {
      covers = await _askCovers();
      if (!mounted) return;
    }
    final opened = await _api.openTable(
      restaurantId: widget.restaurantId,
      staffSessionId: widget.sessionId,
      tableId: widget.table.tableId,
      covers: covers,
    );
    final menu = await _menuApi.getRestaurantMenu(restaurantId: widget.restaurantId, sessionId: widget.sessionId);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (!opened.success || opened.data == null) {
        _error = opened.message ?? 'Could not open the table';
        return;
      }
      _open = opened.data;
      if (!menu.success || menu.data == null) {
        _error = menu.message ?? 'Could not load the menu';
        return;
      }
      _categories = menu.data!.categories;
      _all = menu.data!.menuItems.values.expand((l) => l).where((i) => i.isAvailable).toList();
    });
  }

  /// D4: "how many people?" at open. Optional, so Skip is always there.
  Future<int?> _askCovers() {
    final c = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Table ${widget.table.tableNumber}: how many people?'),
        content: TextField(
          controller: c,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: 'e.g. 4'),
          onSubmitted: (_) => Navigator.of(ctx).pop(int.tryParse(c.text.trim())),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: const Text('Skip')),
          ElevatedButton(onPressed: () => Navigator.of(ctx).pop(int.tryParse(c.text.trim())), child: const Text('OK')),
        ],
      ),
    );
  }

  Future<void> _tap(MenuItem item) async {
    final mandatory = item.variants.where((v) => v.isMandatory).toList();
    Map<String, String> chosen = const {};
    if (mandatory.isNotEmpty) {
      final picked = await _pickVariants(item, mandatory);
      if (picked == null) return;
      chosen = picked;
    }
    // ponytail: optional variants and add-ons are not offered here; the guest app has them.
    final line = _RoundLine(item, chosen);
    setState(() {
      final existing = _round[line.key];
      if (existing == null) {
        _round[line.key] = line;
      } else {
        existing.qty++;
      }
    });
  }

  Future<Map<String, String>?> _pickVariants(MenuItem item, List<Variant> mandatory) {
    final chosen = <String, String>{};
    return showDialog<Map<String, String>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setInner) => AlertDialog(
          title: Text(item.meta.name),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final v in mandatory) ...[
                  Align(alignment: Alignment.centerLeft, child: Text(v.name.isNotEmpty ? v.name : v.meta.name, style: const TextStyle(fontWeight: FontWeight.bold))),
                  for (final o in v.options)
                    RadioListTile<String>(
                      dense: true,
                      title: Text('${o.name}  ₹${o.priceInfo.finalPrice.toStringAsFixed(0)}'),
                      value: o.id,
                      groupValue: chosen[v.id],
                      onChanged: (val) => setInner(() => chosen[v.id] = val!),
                    ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: mandatory.every((v) => chosen.containsKey(v.id)) ? () => Navigator.of(ctx).pop(Map.of(chosen)) : null,
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _send() async {
    final open = _open;
    if (open == null || _round.isEmpty) return;
    setState(() => _sending = true);
    String? failed;
    for (final line in _round.values) {
      final r = await _api.addItem(
        restaurantId: widget.restaurantId,
        tableId: open.tableId,
        tableSessionId: open.sessionId,
        addedBy: open.addedBy,
        menuItemId: line.item.id,
        quantity: line.qty,
        selectedVariants: line.variants,
      );
      if (!r.success) {
        failed = '${line.item.meta.name}: ${r.message ?? 'not added'}';
        break;
      }
    }
    if (failed == null) {
      final r = await _api.checkout(
        restaurantId: widget.restaurantId,
        tableId: open.tableId,
        tableSessionId: open.sessionId,
        addedBy: open.addedBy,
      );
      if (!r.success) failed = r.message ?? 'Send failed';
    }
    if (!mounted) return;
    setState(() => _sending = false);
    if (failed != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failed), backgroundColor: Colors.red));
      return;
    }
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final results = searchDishes(_search.text, _category == null ? _all : _all.where((i) => i.categoryId == _category));
    final total = _round.values.fold<num>(0, (a, l) => a + l.item.priceInfo.finalPrice * l.qty);
    final count = _round.values.fold<int>(0, (a, l) => a + l.qty);
    return Scaffold(
      appBar: AppBar(title: Text('Table ${widget.table.tableNumber}: add dishes')),
      body: _busy
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, style: const TextStyle(color: Colors.red))))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                      child: TextField(
                        controller: _search,
                        autofocus: true,
                        decoration: InputDecoration(
                          hintText: 'Search a dish',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _search.text.isEmpty ? null : IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(_search.clear)),
                          border: const OutlineInputBorder(),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                    SizedBox(
                      height: 44,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(label: const Text('All'), selected: _category == null, onSelected: (_) => setState(() => _category = null)),
                          ),
                          for (final c in _categories)
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(label: Text(c.name), selected: _category == c.id, onSelected: (_) => setState(() => _category = c.id)),
                            ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: results.length,
                        itemBuilder: (_, i) {
                          final item = results[i];
                          final inRound = _round.values.where((l) => l.item.id == item.id).fold<int>(0, (a, l) => a + l.qty);
                          return ListTile(
                            title: Text(item.meta.name),
                            subtitle: item.meta.categoryName.isEmpty ? null : Text(item.meta.categoryName),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('₹${item.priceInfo.finalPrice.toStringAsFixed(0)}'),
                                const SizedBox(width: 8),
                                if (inRound > 0) CircleAvatar(radius: 12, child: Text('$inRound', style: const TextStyle(fontSize: 12))),
                              ],
                            ),
                            onTap: () => _tap(item),
                          );
                        },
                      ),
                    ),
                    if (_round.isNotEmpty) _roundPane(),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _round.isEmpty || _sending ? null : _send,
                            child: Text(_sending ? 'Sending…' : 'Send $count to kitchen  ·  ₹${total.toStringAsFixed(0)}'),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _roundPane() {
    return Container(
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
      child: ListView(
        shrinkWrap: true,
        children: [
          for (final line in _round.values)
            ListTile(
              dense: true,
              title: Text(line.item.meta.name),
              subtitle: line.variants.isEmpty ? null : Text(line.variants.values.join(', ')),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: () => setState(() {
                      if (--line.qty <= 0) _round.remove(line.key);
                    }),
                  ),
                  Text('${line.qty}'),
                  IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => setState(() => line.qty++)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
