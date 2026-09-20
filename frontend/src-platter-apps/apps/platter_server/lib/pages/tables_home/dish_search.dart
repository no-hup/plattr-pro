import 'package:platter_core/platter_core.dart';

/// How a captain finds a dish: the start of any word, case and punctuation ignored.
/// "chi" → Chicken 65, Butter Chicken, Chilli Paneer. "paneertik" → Paneer Tikka.
/// Best matches first: a hit at the start of the name beats one mid-name, then A→Z.
// ponytail: no typo tolerance and no sales ranking; add when a real cashier asks for either.
List<MenuItem> searchDishes(String query, Iterable<MenuItem> all) {
  final q = _norm(query);
  if (q.isEmpty) return all.toList()..sort((a, b) => a.meta.name.compareTo(b.meta.name));
  final scored = <(int, MenuItem)>[];
  for (final item in all) {
    final name = _norm(item.meta.name);
    final rank = _rank(name, q);
    if (rank != null) scored.add((rank, item));
  }
  scored.sort((a, b) => a.$1 != b.$1 ? a.$1.compareTo(b.$1) : a.$2.meta.name.compareTo(b.$2.meta.name));
  return scored.map((e) => e.$2).toList();
}

/// 0 = name starts with the query, 1 = some later word starts with it, 2 = the query typed without
/// spaces matches from some word start ("paneertik" → Paneer Tikka). Null = no match.
int? _rank(String name, String q) {
  if (name.startsWith(q)) return 0;
  for (final w in name.split(' ').skip(1)) {
    if (w.startsWith(q)) return 1;
  }
  final tightQ = q.replaceAll(' ', '');
  final words = name.split(' ');
  for (var i = 0; i < words.length; i++) {
    if (words.sublist(i).join().startsWith(tightQ)) return 2; // still from a word start, never mid-word
  }
  return null;
}

String _norm(String s) => s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9 ]'), '').replaceAll(RegExp(r'\s+'), ' ').trim();
