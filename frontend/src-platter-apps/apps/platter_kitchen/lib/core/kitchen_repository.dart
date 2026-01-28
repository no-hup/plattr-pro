import 'package:platter_core/platter_core.dart';
import '../models/order_models.dart';
import '../models/active_order_models.dart';
import '../network/network.dart';
import '../constants/kitchen_constants.dart';

/// Repository for handling kitchen order data.
/// 
/// Retrieves orders, updates statuses, and manages stock.
class KitchenRepository {
  // Singleton pattern if needed, or provided via DI.
  // For now simple class.
  
  // ignore: unused_field
  final NetworkService? _networkService; // To be injected

  KitchenRepository({NetworkService? networkService}) : _networkService = networkService;

  /// Fetches active orders for the live tab.
  /// 
  /// Currently mocks data for UI development.
  Future<List<KitchenOrder>> getLiveOrders(String restaurantId) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));

    // MOCK DATA
    return [
      KitchenOrder(
        id: 'ord_123',
        orderNumber: '1234',
        tableNumber: 'T-4',
        status: OrderStatus.preparing,
        updatedAt: DateTime.now().subtract(const Duration(minutes: 5)),
        serverName: 'John D.',
        carts: [
          KitchenCart(
            index: 0,
            status: OrderStatus.preparing,
            items: [
              KitchenOrderItem(
                itemId: 'item_1',
                menuItemId: 'menu_1',
                name: 'Spicy Ramen',
                quantity: 1,
                status: OrderStatus.preparing,
                modifiers: ['Extra Spicy', 'No Onions'],
              ),
              KitchenOrderItem(
                itemId: 'item_2',
                menuItemId: 'menu_2',
                name: 'Gyoza',
                quantity: 1,
                status: OrderStatus.ready,
              ),
            ],
          ),
        ],
      ),
      KitchenOrder(
        id: 'ord_124',
        orderNumber: '5678',
        tableNumber: 'T-12',
        status: OrderStatus.pending,
        updatedAt: DateTime.now().subtract(const Duration(minutes: 1)),
        serverName: 'Alice',
        carts: [
          KitchenCart(
            index: 0,
            status: OrderStatus.pending,
            items: [
              KitchenOrderItem(
                itemId: 'item_3',
                menuItemId: 'menu_3',
                name: 'Chicken Burger',
                quantity: 2,
                status: OrderStatus.pending,
                notes: 'Cut in half please',
              ),
              KitchenOrderItem(
                itemId: 'item_4',
                menuItemId: 'menu_4',
                name: 'Fries',
                quantity: 1,
                status: OrderStatus.pending,
              ),
            ],
          ),
        ],
      ),
       KitchenOrder(
        id: 'ord_125',
        orderNumber: '9012',
        tableNumber: 'T-8',
        status: OrderStatus.ready,
        updatedAt: DateTime.now().subtract(const Duration(minutes: 12)),
        serverName: 'Bob',
        carts: [
          KitchenCart(
            index: 0,
            status: OrderStatus.ready,
            items: [
              KitchenOrderItem(
                itemId: 'item_5',
                menuItemId: 'menu_5',
                name: 'Caesar Salad',
                quantity: 1,
                status: OrderStatus.ready,
              ),
            ],
          ),
        ],
      ),
    ];
  }

  /// Updates the status of a specific order item.
  Future<void> updateItemStatus(String orderId, String itemId, String newStatus, {String? reason}) async {
    // TODO: Implement API call
    // await _networkService.post('/orders/$orderId/items/$itemId/status', {'status': newStatus, 'reason': reason});
    await Future.delayed(const Duration(milliseconds: 500));
    AppLogger.info('Updated item $itemId to $newStatus (reason: $reason)');
  }

  /// Updates the stock status of a menu item.
  Future<void> updateMenuStock(String menuItemId, bool inStock) async {
    // TODO: Implement API call
    // await _networkService.post('/menu/$menuItemId/stock', {'inStock': inStock});
    await Future.delayed(const Duration(milliseconds: 500));
    AppLogger.info('Updated menu item $menuItemId stock to $inStock');
  }

  /// Fetches active carts (tickets) for the live kitchen view.
  /// 
  /// This returns a flattened list of active carts, sorted by submission time.
  Future<ActiveCartsResponse> getActiveCarts(String restaurantId) async {
    await Future.delayed(const Duration(milliseconds: 600));

    // MOCK DATA - Active Carts
    final now = DateTime.now();
    
    // Toggle this to test different views: KitchenViewType.cart or KitchenViewType.item
    const mockViewType = KitchenViewType.cart; 

    final carts = [
      ActiveKitchenCart(
        cartId: 'cart_001',
        orderId: 'ord_123',
        orderNumber: 1234,
        tableNumber: 'T-4',
        serverName: 'John D.',
        submittedAt: now.subtract(const Duration(minutes: 5)),
        status: ActiveCartStatus.cooking,
        kitchenNote: 'Nut Allergy',
        items: [
          ActiveCartItem(
            itemId: 'item_1',
            name: 'Spicy Ramen',
            quantity: 1,
            modifiers: ['Extra Spicy', 'No Onions'],
          ),
          ActiveCartItem(
            itemId: 'item_2',
            name: 'Gyoza',
            quantity: 1,
          ),
        ],
      ),
      ActiveKitchenCart(
        cartId: 'cart_002',
        orderId: 'ord_124',
        orderNumber: 5678,
        tableNumber: 'T-12',
        serverName: 'Alice',
        submittedAt: now.subtract(const Duration(minutes: 2)),
        status: ActiveCartStatus.pending,
        items: [
          ActiveCartItem(
            itemId: 'item_3',
            name: 'Chicken Burger',
            quantity: 2,
            itemNote: 'Cut in half',
          ),
          ActiveCartItem(
            itemId: 'item_4',
            name: 'Fries',
            quantity: 1,
          ),
        ],
      ),
       ActiveKitchenCart(
        cartId: 'cart_003',
        orderId: 'ord_125',
        orderNumber: 9012,
        tableNumber: 'T-8',
        serverName: 'Bob',
        submittedAt: now.subtract(const Duration(minutes: 15)),
        status: ActiveCartStatus.ready,
        items: [
          ActiveCartItem(
            itemId: 'item_5',
            name: 'Caesar Salad',
            quantity: 1,
          ),
        ],
      ),
    ];
    
    return ActiveCartsResponse(
      carts: carts,
      widgetType: mockViewType,
    );
  }

  /// Fetches history of served/cancelled orders.
  Future<List<ActiveKitchenCart>> getHistoryOrders({
    DateTime? date, 
    List<String>? statuses,
  }) async {
    await Future.delayed(const Duration(milliseconds: 800));
    final now = DateTime.now();
    
    // MOCK HISTORY DATA
    return [
      ActiveKitchenCart(
        cartId: 'hist_001',
        orderId: 'ord_hist_1',
        orderNumber: 8899,
        tableNumber: 'T-22',
        serverName: 'History Server',
        submittedAt: now.subtract(const Duration(hours: 2)),
        status: ActiveCartStatus.served,
        items: [
          ActiveCartItem(
            itemId: 'h_item_1',
            name: 'Completed Dish 1',
            quantity: 2,
          ),
        ],
      ),
      ActiveKitchenCart(
        cartId: 'hist_002',
        orderId: 'ord_hist_2',
        orderNumber: 7766,
        tableNumber: 'T-5',
        serverName: 'Old Server',
        submittedAt: now.subtract(const Duration(hours: 3)),
        status: ActiveCartStatus.cancelled,
        kitchenNote: 'Cancelled by customer',
        items: [
          ActiveCartItem(
            itemId: 'h_item_2',
            name: 'Cancelled Dish',
            quantity: 1,
            isVoided: true,
          ),
        ],
      ),
    ];
  }
}
