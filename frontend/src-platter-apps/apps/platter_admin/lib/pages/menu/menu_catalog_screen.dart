import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'menu_api_service.dart';
import 'menu_catalog_provider.dart';
import 'editors/category_editor_dialog.dart';
import 'editors/subcategory_editor_dialog.dart';
import 'editors/dish_editor_dialog.dart';

class MenuCatalogScreen extends StatelessWidget {
  const MenuCatalogScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  final String restaurantId;
  final String sessionId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => MenuCatalogProvider(
        apiService: AdminMenuApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadMenu(),
      child: const _MenuCatalogView(),
    );
  }
}

class _MenuCatalogView extends StatelessWidget {
  const _MenuCatalogView();

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuCatalogProvider>(
      builder: (context, provider, _) {
        if (provider.state == DataState.loading && provider.menu == null) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == DataState.error && provider.menu == null) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(provider.errorMessage ?? 'Failed to load menu'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: provider.loadMenu,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 900;
            if (isWide) {
              return Row(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: _CategoryPanel(provider: provider),
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(
                    flex: 2,
                    child: SingleChildScrollView(
                      child: _ItemsPanel(provider: provider),
                    ),
                  ),
                ],
              );
            }

            return ListView(
              children: [
                _CategoryPanel(provider: provider),
                const Divider(height: 1),
                _ItemsPanel(provider: provider),
              ],
            );
          },
        );
      },
    );
  }
}

class _CategoryPanel extends StatelessWidget {
  const _CategoryPanel({required this.provider});

  final MenuCatalogProvider provider;

  Future<void> _openCategoryDialog(BuildContext context,
      {MenuCategory? category}) async {
    final result = await showDialog<CategoryFormResult>(
      context: context,
      builder: (context) => CategoryEditorDialog(category: category),
    );

    if (result == null) return;
    if (category == null) {
      await provider.addCategory(
        name: result.name,
        order: result.order,
        description: result.description,
        image: result.image,
      );
    } else {
      await provider.updateCategory(
        categoryId: category.id,
        name: result.name,
        order: result.order,
        description: result.description,
        image: result.image,
      );
    }
  }

  Future<void> _openSubcategoryDialog(BuildContext context,
      {MenuSubcategory? subcategory, MenuCategory? parentCategory}) async {
    final result = await showDialog<SubcategoryFormResult>(
      context: context,
      builder: (context) => SubcategoryEditorDialog(
        categories: provider.categories,
        subcategory: subcategory,
      ),
    );

    if (result == null) return;
    if (subcategory == null) {
      final parentId = parentCategory?.id ?? result.parentCategoryId;
      await provider.addSubcategory(
        parentCategoryId: parentId,
        name: result.name,
        order: result.order,
        description: result.description,
        image: result.image,
      );
    } else {
      await provider.updateSubcategory(
        subcategoryId: subcategory.id,
        parentCategoryId: result.parentCategoryId,
        name: result.name,
        order: result.order,
        description: result.description,
        image: result.image,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = provider.categories;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Categories',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              IconButton(
                tooltip: 'Refresh',
                onPressed: provider.loadMenu,
                icon: const Icon(Icons.refresh),
              ),
              ElevatedButton.icon(
                onPressed: () => _openCategoryDialog(context),
                icon: const Icon(Icons.add),
                label: const Text('Add'),
              ),
            ],
          ),
        ),
        if (categories.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('No categories yet.'),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final category = categories[index];
              final isSelected = provider.selectedCategoryId == category.id;
              return Card(
                child: ExpansionTile(
                  key: ValueKey(category.id),
                  initiallyExpanded: isSelected,
                  title: InkWell(
                    onTap: () => provider.selectCategory(category.id),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            category.name,
                            style: TextStyle(
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                        Text('Order: ${category.order}'),
                      ],
                    ),
                  ),
                  subtitle: category.subcategories.isEmpty
                      ? const Text('No subcategories')
                      : Text('${category.subcategories.length} subcategories'),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.add),
                        tooltip: 'Add subcategory',
                        onPressed: () =>
                            _openSubcategoryDialog(context, parentCategory: category),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit),
                        tooltip: 'Edit category',
                        onPressed: () =>
                            _openCategoryDialog(context, category: category),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: 'Delete category',
                        onPressed: () async {
                          final confirmed = await _confirm(context,
                              'Delete category "${category.name}"?');
                          if (confirmed) {
                            await provider.deleteCategory(category.id);
                          }
                        },
                      ),
                    ],
                  ),
                  children: [
                    if (category.subcategories.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(12.0),
                        child: Text('No subcategories added.'),
                      )
                    else
                      ...category.subcategories.map((subcategory) {
                        final isSubSelected =
                            provider.selectedSubcategoryId == subcategory.id;
                        return ListTile(
                          title: Text(subcategory.name),
                          subtitle: Text('Order: ${subcategory.order}'),
                          selected: isSubSelected,
                          onTap: () => provider.selectSubcategory(subcategory.id),
                          trailing: Wrap(
                            spacing: 8,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit),
                                onPressed: () => _openSubcategoryDialog(
                                  context,
                                  subcategory: subcategory,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () async {
                                  final confirmed = await _confirm(context,
                                      'Delete subcategory "${subcategory.name}"?');
                                  if (confirmed) {
                                    await provider
                                        .deleteSubcategory(subcategory.id);
                                  }
                                },
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}

class _ItemsPanel extends StatelessWidget {
  const _ItemsPanel({required this.provider});

  final MenuCatalogProvider provider;

  Future<void> _openDishDialog(BuildContext context, {MenuItem? item}) async {
    final result = await showDialog<MenuItem>(
      context: context,
      builder: (context) => DishEditorDialog(
        provider: provider,
        categories: provider.categories,
        taxBlocks: provider.taxBlocks,
        initialItem: item,
        selectedCategoryId: provider.selectedCategoryId,
        selectedSubcategoryId: provider.selectedSubcategoryId,
      ),
    );

    // A shared add-on or portion edit is saved the moment it is made, so the list reloads even on Cancel.
    final sharedEdited = provider.takeSharedEdited();
    if (result != null && item == null) {
      await provider.addMenuItem(item: result);
    } else if (result != null) {
      await provider.updateMenuItem(original: item!, item: result);
    }
    if (sharedEdited) await provider.loadMenu();
  }

  @override
  Widget build(BuildContext context) {
    final items = provider.selectedItems;
    final selectionLabel = provider.selectedSubcategory != null
        ? provider.selectedSubcategory!.name
        : provider.selectedCategory != null
            ? provider.selectedCategory!.name
            : 'All Items';

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  selectionLabel,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => _openDishDialog(context),
                icon: const Icon(Icons.add),
                label: const Text('Add Dish'),
              ),
            ],
          ),
        ),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('No items found.'),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return Card(
                child: ListTile(
                  title: Text(item.meta.name),
                  subtitle: Text(
                    "Price: ${item.priceInfo.finalPrice} • ${item.isAvailable ? 'In Stock' : 'Out of Stock'}",
                  ),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      Switch(
                        value: item.isAvailable,
                        onChanged: (value) =>
                            provider.updateMenuItemAvailability(
                          menuItemId: item.id,
                          isAvailable: value,
                        ),
                      ),
                      Semantics(
                        identifier: 'menu-edit-${item.id}',
                        child: IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _openDishDialog(context, item: item),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () async {
                          final confirmed = await _confirm(
                            context,
                            'Delete "${item.meta.name}"?',
                          );
                          if (confirmed) {
                            await provider.deleteMenuItem(item.id);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}

Future<bool> _confirm(BuildContext context, String message) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Confirm'),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );
  return result ?? false;
}
