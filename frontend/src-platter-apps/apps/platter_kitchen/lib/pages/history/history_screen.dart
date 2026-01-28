import 'package:flutter/material.dart';
import '../../models/active_order_models.dart';
import '../../core/kitchen_repository.dart';
import '../../widgets/active_cart_card.dart';
import '../../widgets/empty_state_widget.dart';
import '../../theme/design_system/kitchen_dimensions.dart';
import '../../theme/design_system/kitchen_typography.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String? selectedCategory;

  const HistoryScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.selectedCategory,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final KitchenRepository _repository = KitchenRepository();
  bool _isLoading = false;
  List<ActiveKitchenCart> _historyOrders = [];
  DateTime _selectedDate = DateTime.now();
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final orders = await _repository.getHistoryOrders(
        date: _selectedDate,
      );
      if (mounted) {
        setState(() => _historyOrders = orders);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = 'Failed to load history.');
        ScaffoldMessenger.of(context).showSnackBar(
           const SnackBar(content: Text('Failed to fetch history orders')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
      _fetchHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter by category if needed (locally)
    final displayOrders = _historyOrders; 

    return Scaffold(
      body: Column(
        children: [
          // Filter Bar
          Container(
            padding: const EdgeInsets.all(KitchenDimensions.space16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(
                bottom: BorderSide(
                  color: Theme.of(context).dividerColor,
                ),
              ),
            ),
            child: Row(
              children: [
                Text(
                  'Date:',
                  style: KitchenTypography.bodyBold,
                ),
                const SizedBox(width: 8),
                ActionChip(
                  avatar: const Icon(Icons.calendar_today, size: 16),
                  label: Text(DateFormat.yMMMd().format(_selectedDate)),
                  onPressed: _selectDate,
                ),
                const Spacer(),
                // Summary Stats
                Text(
                  '${displayOrders.length} Orders',
                  style: KitchenTypography.caption,
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? EmptyStateWidget.error(
                        message: _error!,
                        onRetry: _fetchHistory,
                      )
                    : displayOrders.isEmpty
                        ? const EmptyStateWidget(
                            title: 'No History',
                            subtitle: 'No orders found for this date.',
                            icon: Icons.history_toggle_off,
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(KitchenDimensions.space16),
                            itemCount: displayOrders.length,
                            separatorBuilder: (ctx, i) => const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              return ActiveCartCard(
                                cart: displayOrders[index],
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('History Detail View')),
                                  );
                                },
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
