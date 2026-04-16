import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

class SubcategoryFormResult {
  final String name;
  final int order;
  final String description;
  final String image;
  final String parentCategoryId;

  const SubcategoryFormResult({
    required this.name,
    required this.order,
    required this.description,
    required this.image,
    required this.parentCategoryId,
  });
}

class SubcategoryEditorDialog extends StatefulWidget {
  const SubcategoryEditorDialog({
    super.key,
    required this.categories,
    this.subcategory,
  });

  final List<MenuCategory> categories;
  final MenuSubcategory? subcategory;

  @override
  State<SubcategoryEditorDialog> createState() => _SubcategoryEditorDialogState();
}

class _SubcategoryEditorDialogState extends State<SubcategoryEditorDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _orderController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _imageController;
  String? _parentCategoryId;

  @override
  void initState() {
    super.initState();
    _nameController =
        TextEditingController(text: widget.subcategory?.name ?? '');
    _orderController = TextEditingController(
      text: widget.subcategory?.order.toString() ?? '0',
    );
    _descriptionController =
        TextEditingController(text: widget.subcategory?.description ?? '');
    _imageController =
        TextEditingController(text: widget.subcategory?.image ?? '');
    _parentCategoryId = widget.subcategory?.parentCategoryId ??
        (widget.categories.isNotEmpty ? widget.categories.first.id : null);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _orderController.dispose();
    _descriptionController.dispose();
    _imageController.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _nameController.text.trim();
    final order = int.tryParse(_orderController.text.trim()) ?? 0;
    final parentCategoryId = _parentCategoryId;
    if (name.isEmpty || parentCategoryId == null) {
      return;
    }

    Navigator.of(context).pop(SubcategoryFormResult(
      name: name,
      order: order,
      description: _descriptionController.text.trim(),
      image: _imageController.text.trim(),
      parentCategoryId: parentCategoryId,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title:
          Text(widget.subcategory == null ? 'Add Subcategory' : 'Edit Subcategory'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: _parentCategoryId,
              decoration: const InputDecoration(labelText: 'Parent Category'),
              items: widget.categories
                  .map((category) => DropdownMenuItem<String>(
                        value: category.id,
                        child: Text(category.name),
                      ))
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _parentCategoryId = value;
                });
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _orderController,
              decoration: const InputDecoration(labelText: 'Order'),
              keyboardType: TextInputType.number,
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
