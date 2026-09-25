import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';

import 'editors/offer_editor_dialog.dart';
import 'models/offer_model.dart';
import 'offers_api_service.dart';
import 'offers_provider.dart';

class OffersScreen extends StatelessWidget {
  final String restaurantId;
  final String sessionId;

  const OffersScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OffersProvider(
        apiService: OffersApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadOffers(),
      child: const _OffersView(),
    );
  }
}

class _OffersView extends StatelessWidget {
  const _OffersView();

  @override
  Widget build(BuildContext context) {
    return Consumer<OffersProvider>(
      builder: (context, provider, _) {
        if (provider.state == DataState.loading && provider.offers.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == DataState.error && provider.offers.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(provider.errorMessage ?? 'Failed to load offers'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: provider.loadOffers,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            _buildHeader(context, provider),
            Expanded(child: _buildOffersList(context, provider)),
          ],
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, OffersProvider provider) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Offers',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: provider.loadOffers,
            icon: const Icon(Icons.refresh),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () => _showCreateDialog(context, provider),
            icon: const Icon(Icons.add),
            label: const Text('Create Offer'),
          ),
        ],
      ),
    );
  }

  Widget _buildOffersList(BuildContext context, OffersProvider provider) {
    if (provider.offers.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.local_offer_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No offers yet',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Create your first offer to get started.',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: provider.offers.length,
      itemBuilder: (context, index) {
        final offer = provider.offers[index];
        return _OfferCard(
          offer: offer,
          onEdit: () => _showEditDialog(context, provider, offer),
          onDelete: () => _confirmDelete(context, provider, offer),
          onToggleActive: (value) =>
              provider.toggleActive(offer.id, value),
        );
      },
    );
  }

  Future<void> _showCreateDialog(
      BuildContext context, OffersProvider provider) async {
    final result = await showDialog<OfferFormResult>(
      context: context,
      builder: (context) => const OfferEditorDialog(),
    );

    if (result == null) return;

    await provider.createOffer(result.offerData);
    // TD-138: RefusalInterceptor shows the refusal.
  }

  Future<void> _showEditDialog(
    BuildContext context,
    OffersProvider provider,
    OfferModel offer,
  ) async {
    final result = await showDialog<OfferFormResult>(
      context: context,
      builder: (context) => OfferEditorDialog(existing: offer),
    );

    if (result == null) return;

    await provider.updateOffer(offer.id, result.offerData);
    // TD-138: RefusalInterceptor shows the refusal.
  }

  Future<void> _confirmDelete(
    BuildContext context,
    OffersProvider provider,
    OfferModel offer,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Offer'),
        content: Text('Delete "${offer.title}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    await provider.deleteOffer(offer.id);
    // TD-138: RefusalInterceptor shows the refusal.
  }
}

class _OfferCard extends StatelessWidget {
  final OfferModel offer;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final ValueChanged<bool> onToggleActive;

  const _OfferCard({
    required this.offer,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleActive,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (offer.description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      offer.description,
                      style: TextStyle(color: Colors.grey.shade700),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _chip(
                        label: offer.type,
                        color: _typeColor(offer.type),
                      ),
                      _chip(
                        label: offer.scope,
                        color: Colors.blueGrey,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Switch(
                  value: offer.isActive,
                  onChanged: onToggleActive,
                ),
                Builder(builder: (context) {
                  final status = offer.statusAt(DateTime.now());   // TD-144
                  return Text(
                    status,
                    style: TextStyle(
                      fontSize: 12,
                      color: status == 'Running' ? Colors.green : Colors.grey,
                    ),
                  );
                }),
              ],
            ),
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Edit',
              onPressed: onEdit,
              icon: const Icon(Icons.edit),
            ),
            IconButton(
              tooltip: 'Delete',
              onPressed: onDelete,
              icon: const Icon(Icons.delete, color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'PERCENTAGE':
        return Colors.purple;
      case 'FLAT':
        return Colors.orange;
      case 'BOGO':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }
}
