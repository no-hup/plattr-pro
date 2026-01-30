import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

class CategoryFormResult {
  final String name;
  final int order;
  final String description;
  final String image;

  const CategoryFormResult({
    required this.name,
    required this.order,
    required this.description,
    required this.image,
  });
}

class CategoryEditorDialog extends StatefulWidget {
  const CategoryEditorDialog({
    super.key,
    this.category,
  });

  final MenuCategory? category;

  @override
  State<CategoryEditorDialog> createState() => _CategoryEditorDialogState();
}

class _CategoryEditorDialogState extends State<CategoryEditorDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _orderController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _imageController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.category?.name ?? '');
    _orderController = TextEditingController(
      text: widget.category?.order.toString() ?? '0',
    );
    _descriptionController =
        TextEditingController(text: widget.category?.description ?? '');
    _imageController =
        TextEditingController(text: widget.category?.image ?? '');
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
    if (name.isEmpty) {
      return;
    }

    Navigator.of(context).pop(CategoryFormResult(
      name: name,
      order: order,
      description: _descriptionController.text.trim(),
      image: _imageController.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.category == null ? 'Add Category' : 'Edit Category'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
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
