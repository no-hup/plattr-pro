import 'package:flutter/material.dart';

import '../models/offer_model.dart';

/// Offer types supported by the backend engine.
class OfferTypes {
  static const String percentage = 'PERCENTAGE';
  static const String flat = 'FLAT';
  static const String bogo = 'BOGO';

  static const List<String> all = [percentage, flat, bogo];

  static String displayName(String type) {
    switch (type) {
      case percentage:
        return 'Percentage off';
      case flat:
        return 'Flat amount off';
      case bogo:
        return 'Buy X get Y (BOGO)';
      default:
        return type;
    }
  }
}

/// Offer scopes supported by the backend engine.
class OfferScopes {
  static const String order = 'ORDER';
  static const String category = 'CATEGORY';
  static const String item = 'ITEM';

  static const List<String> all = [order, category, item];

  static String displayName(String scope) {
    switch (scope) {
      case order:
        return 'Entire order';
      case category:
        return 'Specific categories';
      case item:
        return 'Specific items';
      default:
        return scope;
    }
  }
}

/// Form result returned by `OfferEditorDialog` on submit.
///
/// Mirrors the shape the backend expects in `offerData`, so the provider can
/// forward it verbatim via `createOffer` / `updateOffer`.
class OfferFormResult {
  final Map<String, dynamic> offerData;

  const OfferFormResult(this.offerData);
}

class OfferEditorDialog extends StatefulWidget {
  const OfferEditorDialog({super.key, this.existing});

  final OfferModel? existing;

  @override
  State<OfferEditorDialog> createState() => _OfferEditorDialogState();
}

class _OfferEditorDialogState extends State<OfferEditorDialog> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _targetIdsController;
  late final TextEditingController _exclusionIdsController;
  late final TextEditingController _benefitValueController;
  late final TextEditingController _maxDiscountController;
  late final TextEditingController _buyQuantityController;
  late final TextEditingController _getQuantityController;
  late final TextEditingController _minOrderValueController;
  late final TextEditingController _termsController;
  late final TextEditingController _priorityController;

  late String _type;
  late String _scope;
  late bool _isActive;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;

    _titleController = TextEditingController(text: e?.title ?? '');
    _descriptionController = TextEditingController(text: e?.description ?? '');
    _targetIdsController =
        TextEditingController(text: (e?.targetIds ?? const []).join(', '));
    _exclusionIdsController =
        TextEditingController(text: (e?.exclusionIds ?? const []).join(', '));

    final benefit = e?.benefit ?? const {};
    _benefitValueController = TextEditingController(
      text: benefit['value']?.toString() ?? '',
    );
    _maxDiscountController = TextEditingController(
      text: benefit['maxDiscount']?.toString() ?? '',
    );
    _buyQuantityController = TextEditingController(
      text: benefit['buyQuantity']?.toString() ?? '',
    );
    _getQuantityController = TextEditingController(
      text: benefit['getQuantity']?.toString() ?? '',
    );

    final conditions = e?.conditions;
    _minOrderValueController = TextEditingController(
      text: conditions?['minOrderValue']?.toString() ?? '',
    );

    _termsController =
        TextEditingController(text: e?.termsAndConditions ?? '');
    _priorityController =
        TextEditingController(text: e?.priority?.toString() ?? '');

    _type = e?.type ?? OfferTypes.percentage;
    _scope = e?.scope ?? OfferScopes.order;
    _isActive = e?.isActive ?? true;

    final validity = e?.validity ?? const {};
    _startDate = _parseDate(validity['startDate']);
    _endDate = _parseDate(validity['endDate']);
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
    return null;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _targetIdsController.dispose();
    _exclusionIdsController.dispose();
    _benefitValueController.dispose();
    _maxDiscountController.dispose();
    _buyQuantityController.dispose();
    _getQuantityController.dispose();
    _minOrderValueController.dispose();
    _termsController.dispose();
    _priorityController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial =
        (isStart ? _startDate : _endDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _startDate = picked;
      } else {
        _endDate = picked;
      }
    });
  }

  List<String> _parseCsv(String text) {
    return text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }

  double? _parseDoubleOrNull(String text) {
    if (text.trim().isEmpty) return null;
    return double.tryParse(text.trim());
  }

  int? _parseIntOrNull(String text) {
    if (text.trim().isEmpty) return null;
    return int.tryParse(text.trim());
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please pick start and end dates')),
      );
      return;
    }

    // Build benefit map based on type.
    final benefit = <String, dynamic>{};
    if (_type == OfferTypes.bogo) {
      final buyQty = _parseIntOrNull(_buyQuantityController.text);
      final getQty = _parseIntOrNull(_getQuantityController.text);
      if (buyQty == null || getQty == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Buy and get quantities are required for BOGO'),
          ),
        );
        return;
      }
      benefit['buyQuantity'] = buyQty;
      benefit['getQuantity'] = getQty;
    } else {
      final value = _parseDoubleOrNull(_benefitValueController.text);
      if (value == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Benefit value is required')),
        );
        return;
      }
      benefit['value'] = value;
      final maxDiscount = _parseDoubleOrNull(_maxDiscountController.text);
      if (maxDiscount != null) benefit['maxDiscount'] = maxDiscount;
    }

    // Build conditions map (optional).
    Map<String, dynamic>? conditions;
    final minOrderValue = _parseDoubleOrNull(_minOrderValueController.text);
    if (minOrderValue != null) {
      conditions = {'minOrderValue': minOrderValue};
    }

    final offerData = <String, dynamic>{
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'type': _type,
      'scope': _scope,
      'targetIds': _scope == OfferScopes.order
          ? <String>[]
          : _parseCsv(_targetIdsController.text),
      'exclusionIds': _parseCsv(_exclusionIdsController.text),
      'isActive': _isActive,
      'validity': {
        'startDate': _startDate!.toIso8601String(),
        'endDate': _endDate!.toIso8601String(),
      },
      if (conditions != null) 'conditions': conditions,
      'benefit': benefit,
      if (_termsController.text.trim().isNotEmpty)
        'termsAndConditions': _termsController.text.trim(),
      if (_parseIntOrNull(_priorityController.text) != null)
        'priority': _parseIntOrNull(_priorityController.text),
    };

    Navigator.of(context).pop(OfferFormResult(offerData));
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Select date';
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.existing != null;
    final showTargets = _scope != OfferScopes.order;
    final isBogo = _type == OfferTypes.bogo;

    final benefitValueLabel = _type == OfferTypes.percentage
        ? 'Percentage %'
        : 'Amount (INR)';

    return AlertDialog(
      title: Text(isEditing ? 'Edit Offer' : 'Create Offer'),
      content: SizedBox(
        width: 500,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title *',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description *',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _type,
                  decoration: const InputDecoration(
                    labelText: 'Type *',
                    border: OutlineInputBorder(),
                  ),
                  items: OfferTypes.all
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          child: Text(OfferTypes.displayName(t)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _type = v);
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _scope,
                  decoration: const InputDecoration(
                    labelText: 'Scope *',
                    border: OutlineInputBorder(),
                  ),
                  items: OfferScopes.all
                      .map(
                        (s) => DropdownMenuItem(
                          value: s,
                          child: Text(OfferScopes.displayName(s)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _scope = v);
                  },
                ),
                if (showTargets) ...[
                  const SizedBox(height: 12),
                  // TODO(offers): replace with a proper multi-select chip
                  // picker backed by MenuCatalogProvider so admins can pick
                  // categories/items by name rather than copy-pasting ids.
                  TextFormField(
                    controller: _targetIdsController,
                    decoration: InputDecoration(
                      labelText: _scope == OfferScopes.category
                          ? 'Target Category IDs (comma-separated)'
                          : 'Target Item IDs (comma-separated)',
                      border: const OutlineInputBorder(),
                    ),
                    validator: (v) {
                      if (showTargets && (v == null || v.trim().isEmpty)) {
                        return 'At least one target id required';
                      }
                      return null;
                    },
                  ),
                ],
                const SizedBox(height: 12),
                // TODO(offers): upgrade to proper picker as above.
                TextFormField(
                  controller: _exclusionIdsController,
                  decoration: const InputDecoration(
                    labelText: 'Exclusion IDs (comma-separated, optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                if (!isBogo) ...[
                  TextFormField(
                    controller: _benefitValueController,
                    decoration: InputDecoration(
                      labelText: '$benefitValueLabel *',
                      border: const OutlineInputBorder(),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) {
                      final parsed = _parseDoubleOrNull(v ?? '');
                      if (parsed == null) return 'Enter a number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _maxDiscountController,
                    decoration: const InputDecoration(
                      labelText: 'Max Discount (optional)',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _buyQuantityController,
                          decoration: const InputDecoration(
                            labelText: 'Buy Quantity *',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _getQuantityController,
                          decoration: const InputDecoration(
                            labelText: 'Get Quantity *',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                TextFormField(
                  controller: _minOrderValueController,
                  decoration: const InputDecoration(
                    labelText: 'Min Order Value (optional)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text('Start: ${_formatDate(_startDate)}'),
                        onPressed: () => _pickDate(isStart: true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text('End: ${_formatDate(_endDate)}'),
                        onPressed: () => _pickDate(isStart: false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _termsController,
                  decoration: const InputDecoration(
                    labelText: 'Terms & Conditions (optional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _priorityController,
                  decoration: const InputDecoration(
                    labelText: 'Priority (optional, higher = preferred)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Active'),
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: Text(isEditing ? 'Update' : 'Create'),
        ),
      ],
    );
  }
}
