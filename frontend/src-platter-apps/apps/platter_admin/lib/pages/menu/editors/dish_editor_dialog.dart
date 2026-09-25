import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../menu_catalog_provider.dart';
import 'addon_editor_dialog.dart';
import 'variant_editor_dialog.dart';

class DishEditorDialog extends StatefulWidget {
  const DishEditorDialog({
    super.key,
    required this.provider,
    required this.categories,
    this.taxBlocks = const {},
    this.initialItem,
    this.selectedCategoryId,
    this.selectedSubcategoryId,
  });

  /// The add-on and portion editors save shared records through it (D6).
  final MenuCatalogProvider provider;
  final List<MenuCategory> categories;
  /// Tax block id → label. Empty when the restaurant has none configured; the picker then hides.
  final Map<String, String> taxBlocks;
  final MenuItem? initialItem;
  final String? selectedCategoryId;
  final String? selectedSubcategoryId;

  @override
  State<DishEditorDialog> createState() => _DishEditorDialogState();
}

class _DishEditorDialogState extends State<DishEditorDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _imageController;
  late final TextEditingController _priceController;
  late final TextEditingController _discountController;
  late final TextEditingController _caloriesController;
  late final TextEditingController _allergenController;

  String? _categoryId;
  String? _primarySubcategoryId;
  List<String> _subcategoryIds = [];
  bool _isInStock = true;
  String? _taxBlockId;
  String _dietaryType = 'VEG';
  int _spiceLevel = 0;
  bool _isVegan = false;

  List<Variant> _variants = [];
  List<Addon> _addons = [];

  @override
  void initState() {
    super.initState();
    final item = widget.initialItem;
    _nameController = TextEditingController(text: item?.meta.name ?? '');
    _descriptionController =
        TextEditingController(text: item?.meta.description ?? '');
    _imageController = TextEditingController(text: item?.meta.image ?? '');
    _priceController = TextEditingController(
      text: item?.priceInfo.basePrice.toString() ?? '0',
    );
    _discountController = TextEditingController(
      text: item?.priceInfo.discount.toString() ?? '0',
    );
    _caloriesController = TextEditingController(
      text: item?.nutritionalInfo.calories.toString() ?? '0',
    );
    _allergenController = TextEditingController(
      text: item?.allergenTags.join(', ') ?? '',
    );

    _categoryId = item?.categoryId ??
        widget.selectedCategoryId ??
        (widget.categories.isNotEmpty ? widget.categories.first.id : null);
    _primarySubcategoryId =
        item?.primarySubcategoryId ?? widget.selectedSubcategoryId;
    _subcategoryIds =
        item?.subcategoryIds ??
        (widget.selectedSubcategoryId != null
            ? [widget.selectedSubcategoryId!]
            : []);
    _isInStock = item?.isAvailable ?? true;
    _taxBlockId = item?.taxBlockId;
    _dietaryType = item?.meta.dietaryType.isNotEmpty == true
        ? item!.meta.dietaryType
        : 'VEG';
    _spiceLevel = item?.meta.spiceLevel ?? 0;
    _isVegan = item?.meta.isVegan ?? false;
    _variants = item?.variants ?? [];
    _addons = item?.addons ?? [];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _imageController.dispose();
    _priceController.dispose();
    _discountController.dispose();
    _caloriesController.dispose();
    _allergenController.dispose();
    super.dispose();
  }

  List<MenuSubcategory> _availableSubcategories() {
    final categoryId = _categoryId;
    if (categoryId == null) return [];
    final category = widget.categories
        .cast<MenuCategory?>()
        .firstWhere((c) => c?.id == categoryId, orElse: () => null);
    return category?.subcategories ?? [];
  }

  Future<void> _editVariants() async {
    // Done is the only way out: an "Only this dish" copy is already saved, and a dismissed dialog would hand
    // this dish its old link back on the next save.
    final result = await showDialog<List<Variant>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => VariantEditorDialog(
        provider: widget.provider,
        variants: _variants,
        menuItemId: widget.initialItem?.id,
        dishName: _nameController.text.trim(),
      ),
    );
    if (result != null) {
      setState(() {
        _variants = result;
      });
    }
  }

  Future<void> _editAddons() async {
    final result = await showDialog<List<Addon>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AddonEditorDialog(
        provider: widget.provider,
        addons: _addons,
        menuItemId: widget.initialItem?.id,
        dishName: _nameController.text.trim(),
      ),
    );
    if (result != null) {
      setState(() {
        _addons = result;
      });
    }
  }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty || _categoryId == null) {
      return;
    }
    final basePrice = num.tryParse(_priceController.text.trim()) ?? 0;
    final discount = num.tryParse(_discountController.text.trim()) ?? 0;
    // discount is a PERCENTAGE (0-100) — backend BasicPriceInfo computes
    // basePrice * (1 - discount/100) and clamps to 0-100. Subtracting it as
    // rupees here made every discounted dish disagree with the recomputed bill
    // and mis-scaled variants that inherit the parent's discount.
    final discountPct = discount.clamp(0, 100);
    final finalPrice = basePrice * (1 - discountPct / 100);

    final calories = num.tryParse(_caloriesController.text.trim()) ?? 0;
    final allergens = _allergenController.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();

    final subcategoryIds = _subcategoryIds.toSet().toList();
    final primarySubcategoryId = _primarySubcategoryId;
    final categoryName = widget.categories
            .cast<MenuCategory?>()
            .firstWhere((c) => c?.id == _categoryId, orElse: () => null)
            ?.name ??
        '';
    final primarySubcategoryName = _availableSubcategories()
            .cast<MenuSubcategory?>()
            .firstWhere(
              (s) => s?.id == primarySubcategoryId,
              orElse: () => null,
            )
            ?.name ??
        '';

    final item = MenuItem(
      id: widget.initialItem?.id ??
          'temp_${DateTime.now().millisecondsSinceEpoch}',
      categoryId: _categoryId!,
      primarySubcategoryId: primarySubcategoryId,
      subcategoryIds: subcategoryIds,
      taxBlockId: _taxBlockId,
      meta: MenuItemMeta(
        name: name,
        description: _descriptionController.text.trim(),
        categoryName: categoryName,
        primarySubcategoryName: primarySubcategoryName,
        image: _imageController.text.trim(),
        dietaryType: _dietaryType,
        spiceLevel: _spiceLevel,
        isVegan: _isVegan,
      ),
      priceInfo: PriceInfo(
        basePrice: basePrice,
        finalPrice: finalPrice,
        discount: discount,
      ),
      // Only calories is on this form; the rest is kept, or a calorie fix zeroes protein, carbs and fat.
      nutritionalInfo: NutritionalInfo(
        calories: calories,
        carbs: widget.initialItem?.nutritionalInfo.carbs ?? 0,
        protein: widget.initialItem?.nutritionalInfo.protein ?? 0,
        fat: widget.initialItem?.nutritionalInfo.fat ?? 0,
      ),
      isAvailable: _isInStock,
      addons: _addons,
      variants: _variants,
      allergenTags: allergens,
      isCustomizable: _addons.isNotEmpty || _variants.isNotEmpty,
    );

    Navigator.of(context).pop(item);
  }

  @override
  Widget build(BuildContext context) {
    final subcategories = _availableSubcategories();

    return AlertDialog(
      title: Text(widget.initialItem == null ? 'Add Dish' : 'Edit Dish'),
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descriptionController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _imageController,
                decoration: const InputDecoration(labelText: 'Image URL'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _categoryId,
                decoration: const InputDecoration(labelText: 'Category'),
                items: widget.categories
                    .map((category) => DropdownMenuItem<String>(
                          value: category.id,
                          child: Text(category.name),
                        ))
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    _categoryId = value;
                    _primarySubcategoryId = null;
                    _subcategoryIds = [];
                  });
                },
              ),
              const SizedBox(height: 12),
              if (subcategories.isNotEmpty)
                DropdownButtonFormField<String>(
                  value: _primarySubcategoryId,
                  decoration: const InputDecoration(
                    labelText: 'Primary Subcategory',
                  ),
                  items: subcategories
                      .map((subcategory) => DropdownMenuItem<String>(
                            value: subcategory.id,
                            child: Text(subcategory.name),
                          ))
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      _primarySubcategoryId = value;
                      if (value != null && !_subcategoryIds.contains(value)) {
                        _subcategoryIds = [..._subcategoryIds, value];
                      }
                    });
                  },
                ),
              if (subcategories.isNotEmpty) const SizedBox(height: 12),
              if (subcategories.isNotEmpty)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: subcategories
                        .map(
                          (subcategory) => FilterChip(
                            label: Text(subcategory.name),
                            selected: _subcategoryIds.contains(subcategory.id),
                            onSelected: (selected) {
                              setState(() {
                                if (selected) {
                                  _subcategoryIds = [
                                    ..._subcategoryIds,
                                    subcategory.id
                                  ];
                                } else {
                                  _subcategoryIds = _subcategoryIds
                                      .where((id) => id != subcategory.id)
                                      .toList();
                                  if (_primarySubcategoryId == subcategory.id) {
                                    _primarySubcategoryId = null;
                                  }
                                }
                              });
                            },
                          ),
                        )
                        .toList(),
                  ),
                ),
              const SizedBox(height: 12),
              SwitchListTile(
                value: _isInStock,
                title: const Text('In Stock'),
                onChanged: (value) => setState(() => _isInStock = value),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _priceController,
                      decoration: const InputDecoration(labelText: 'Base Price'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _discountController,
                      decoration:
                          const InputDecoration(labelText: 'Discount %'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (widget.taxBlocks.isNotEmpty)
                DropdownButtonFormField<String?>(
                  value: _taxBlockId,
                  decoration: const InputDecoration(
                    labelText: 'Tax group',
                    helperText: 'Leave on "Same as category" unless this dish is taxed differently',
                  ),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('Same as category'),
                    ),
                    ...widget.taxBlocks.entries.map(
                      (e) => DropdownMenuItem<String?>(
                        value: e.key,
                        child: Text(e.value),
                      ),
                    ),
                  ],
                  onChanged: (value) => setState(() => _taxBlockId = value),
                ),
              if (widget.taxBlocks.isNotEmpty) const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _dietaryType,
                      decoration: const InputDecoration(labelText: 'Dietary'),
                      // The stored values (VEG / NON_VEG). The old 'Veg' / 'Non-Veg' items matched no seeded
                      // dish, and a debug build asserts on a value with no item, so the editor never opened.
                      items: [
                        const DropdownMenuItem(value: 'VEG', child: Text('Veg')),
                        const DropdownMenuItem(value: 'NON_VEG', child: Text('Non-Veg')),
                        if (_dietaryType != 'VEG' && _dietaryType != 'NON_VEG')
                          DropdownMenuItem(value: _dietaryType, child: Text(_dietaryType)),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _dietaryType = value);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _spiceLevel,
                      decoration:
                          const InputDecoration(labelText: 'Spice Level'),
                      items: const [
                        DropdownMenuItem(value: 0, child: Text('0')),
                        DropdownMenuItem(value: 1, child: Text('1')),
                        DropdownMenuItem(value: 2, child: Text('2')),
                        DropdownMenuItem(value: 3, child: Text('3')),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _spiceLevel = value);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                value: _isVegan,
                title: const Text('Vegan'),
                onChanged: (value) => setState(() => _isVegan = value),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _caloriesController,
                decoration: const InputDecoration(labelText: 'Calories'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _allergenController,
                decoration: const InputDecoration(
                  labelText: 'Allergen Tags (comma-separated)',
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Variants'),
                subtitle: Text(
                  _variants.isEmpty
                      ? 'No variants'
                      : '${_variants.length} variants',
                ),
                trailing: Semantics(
                  identifier: 'dish-edit-variants',
                  child: TextButton(
                    onPressed: _editVariants,
                    child: const Text('Edit'),
                  ),
                ),
              ),
              ListTile(
                title: const Text('Add-ons'),
                subtitle: Text(
                  _addons.isEmpty ? 'No add-ons' : '${_addons.length} add-ons',
                ),
                trailing: Semantics(
                  identifier: 'dish-edit-addons',
                  child: TextButton(
                    onPressed: _editAddons,
                    child: const Text('Edit'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        Semantics(
          identifier: 'dish-save',
          child: ElevatedButton(
            onPressed: _submit,
            child: const Text('Save'),
          ),
        ),
      ],
    );
  }
}
