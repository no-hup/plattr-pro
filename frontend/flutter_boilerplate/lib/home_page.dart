import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/home/home_state.dart';
import 'package:flutterboilerplate/home/models/restaurant_summary.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/widgets/page_state_view.dart';
import 'package:flutterboilerplate/widgets/primary_action_button.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HomeState>().loadRestaurants();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome'),
      ),
      body: Consumer<HomeState>(
        builder: (context, state, _) {
          if (state.isLoading) {
            return PageStateView.loading();
          }

          if (state.error != null) {
            return PageStateView.error(
              message: state.error,
              primaryAction: PrimaryActionButton(
                label: 'Try Again',
                onPressed: () => state.retry(),
              ),
            );
          }

          if (state.isEmpty) {
            return PageStateView.empty(
              title: 'No restaurants found',
              message: 'Import mock data or add restaurants in the emulator.',
              primaryAction: PrimaryActionButton(
                label: 'Refresh',
                onPressed: () => state.retry(),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: state.retry,
            child: ListView.separated(
              padding: AppSpacing.pagePadding,
              itemCount: state.restaurants.length,
              separatorBuilder: (_, __) => AppSpacing.verticalLG,
              itemBuilder: (context, index) {
                final restaurant = state.restaurants[index];
                return _RestaurantCard(restaurant: restaurant);
              },
            ),
          );
        },
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  const _RestaurantCard({
    required this.restaurant,
  });

  final RestaurantSummary restaurant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              restaurant.name,
              style: theme.textTheme.titleLarge,
            ),
            if (restaurant.address.isNotEmpty) ...[
              AppSpacing.verticalXS,
              Text(
                restaurant.address,
                style: theme.textTheme.bodyMedium,
              ),
            ],
            if (restaurant.phone.isNotEmpty) ...[
              AppSpacing.verticalXXS,
              Text(
                restaurant.phone,
                style: theme.textTheme.bodySmall,
              ),
            ],
            AppSpacing.verticalMD,
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final table in restaurant.tables)
                  ElevatedButton(
                    onPressed: () {
                      _goToTableVerification(context, restaurant.id, table.id);
                    },
                    child: Text('QR: ${table.label}'),
                  ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.menu(restaurant.id, tableId));
                  },
                  child: const Text('Test Menu Page'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.cart(restaurant.id, tableId));
                  },
                  child: const Text('Test Cart Page'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.orders(restaurant.id, tableId));
                  },
                  child: const Text('Test Orders Page'),
                ),
              ],
            ),
            _DebugTestingGuide(restaurant: restaurant),
          ],
        ),
      ),
    );
  }

  void _goToTableVerification(
    BuildContext context,
    String restaurantId,
    String tableId,
  ) {
    context.go(AppRoutes.tableVerification(restaurantId, tableId));
  }
}

// ---------------------------------------------------------------------------
// Debug-only collapsible testing guide per restaurant card
// Only rendered in kDebugMode. Invisible in production builds.
// ---------------------------------------------------------------------------

class _DebugTestingGuide extends StatelessWidget {
  const _DebugTestingGuide({required this.restaurant});

  final RestaurantSummary restaurant;

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    final scenarios = _scenariosFor(restaurant.id, restaurant.name);
    if (scenarios == null) return const SizedBox.shrink();

    return Theme(
      // Remove the default ExpansionTile divider tint
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: EdgeInsets.zero,
        title: Row(
          children: [
            const Icon(Icons.bug_report_outlined, size: 14, color: Colors.deepOrange),
            const SizedBox(width: 4),
            Text(
              'Debug: test scenarios',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Colors.deepOrange,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (scenarios.credentials != null) ...[
                  _DebugSection(
                    label: 'LOGIN',
                    content: scenarios.credentials!,
                    color: Colors.indigo.shade50,
                  ),
                  const SizedBox(height: 6),
                ],
                _DebugSection(
                  label: 'SCENARIOS',
                  content: scenarios.steps.map((s) => '• $s').join('\n'),
                  color: Colors.orange.shade50,
                ),
                if (scenarios.watchFor != null) ...[
                  const SizedBox(height: 6),
                  _DebugSection(
                    label: 'WATCH FOR',
                    content: scenarios.watchFor!.map((s) => '⚠ $s').join('\n'),
                    color: Colors.red.shade50,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  static _RestaurantScenarios? _scenariosFor(String id, String name) {
    switch (id) {
      case 'res_e2e_all_on':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e.com / 1234\nCustomer OTP: 1234  Phone: 9876543210  Name: Customer One',
          steps: [
            'QR:1 → OTP 1234 → lands on menu',
            'Add Burger → Size picker appears (mandatory variant)',
            'Pick Size + Cheese addon → verify price = base + variant + addon − discount',
            'Add Tiramisu → NO variant prompt',
            'Craft Beer shows OUT OF STOCK, cannot add',
            'Add same Burger again → auto-fills previous config (fallback ON)',
            'Checkout → order appears in Kitchen app (server1@e2e.com)',
            'Kitchen: mark items served → mark cart served',
            'Kitchen: Table 1 = active, Table 2 = vacant',
          ],
          watchFor: [
            'Discount % applied correctly in cart total',
            'Mandatory variant blocks "Add" if not selected',
            'Fallback config re-populates on re-add (not a fresh sheet)',
          ],
        );

      case 'res_e2e_simple_menu':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-simple.com / 1234\nCustomer OTP: 1234  Phone: 9876543210',
          steps: [
            'QR:1 → OTP 1234 → lands on menu',
            'Add any item → NO variant or addon prompt',
            'Add multiple items → cart shows correct quantities',
            'Checkout → order visible in Kitchen app',
            'Kitchen: mark served',
          ],
          watchFor: [
            'No variant/addon UI shown (simple menu)',
            'Checkout flow completes without customisation steps',
          ],
        );

      case 'res_e2e_multi_variant_off':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-mv.com / 1234\nCustomer OTP: 1234',
          steps: [
            'Add item with variants → only ONE config allowed per item',
            'Re-add same item → does NOT create a second line with different config',
            'Quantity increases on the existing line instead',
          ],
          watchFor: [
            'Multi-variant OFF: two taps on same item = qty 2, not two separate lines',
          ],
        );

      case 'res_e2e_fallback_off':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-fb.com / 1234\nCustomer OTP: 1234',
          steps: [
            'Add Burger, pick Size + addons, add to cart',
            'Add the same Burger again → variant sheet should be BLANK (no pre-fill)',
            'Verify both lines in cart can have different configs',
          ],
          watchFor: [
            'Fallback OFF: re-add should NOT pre-fill previous config',
          ],
        );

      case 'res_e2e_empty_menu':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-empty.com / 1234\nCustomer OTP: 1234',
          steps: [
            'Enter table → menu page shows empty state message',
            'No categories, no items rendered',
            'Cart and checkout unreachable from menu',
          ],
          watchFor: [
            'Empty state UI renders without crash',
          ],
        );

      case 'res_e2e_all_out_of_stock':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-oos.com / 1234\nCustomer OTP: 1234',
          steps: [
            'Menu loads → all items show out-of-stock indicator',
            'Tapping any item does NOT add it to cart',
            'Cart should remain empty',
          ],
          watchFor: [
            'Out-of-stock items visually disabled',
            'No way to reach checkout from a fully OOS menu',
          ],
        );

      case 'res_e2e_offer_configs':
        return _RestaurantScenarios(
          credentials: 'Server: server1@e2e-offer.com / 1234\nCustomer OTP: 1234',
          steps: [
            'Add items to cart that qualify for an offer',
            'On cart page: applicable offer badge/banner appears',
            'Apply offer → discount reflected in cart total',
            'Checkout with offer applied → order shows discounted amount',
          ],
          watchFor: [
            'Offer applies only to qualifying items',
            'Discount amount matches offer config (% or flat)',
            'Offer not double-applied if re-opening cart',
          ],
        );

      default:
        // Show a generic entry for unknown restaurants (e.g. old V2/V3 data)
        if (name.isEmpty) return null;
        return _RestaurantScenarios(
          credentials: null,
          steps: [
            'Open QR button for any table → complete OTP flow',
            'Browse menu, add items, checkout',
            'Check kitchen app to confirm order received',
          ],
          watchFor: null,
        );
    }
  }
}

class _RestaurantScenarios {
  const _RestaurantScenarios({
    required this.credentials,
    required this.steps,
    required this.watchFor,
  });

  final String? credentials;
  final List<String> steps;
  final List<String>? watchFor;
}

class _DebugSection extends StatelessWidget {
  const _DebugSection({
    required this.label,
    required this.content,
    required this.color,
  });

  final String label;
  final String content;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: const TextStyle(fontSize: 11.5, height: 1.5),
          ),
        ],
      ),
    );
  }
}
