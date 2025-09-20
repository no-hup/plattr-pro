import 'package:flutterboilerplate/home_page.dart';
import 'package:flutterboilerplate/navigation/app_navigator.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_page.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/order_listing_page.dart';
import 'package:flutterboilerplate/pages/menuListing/MenuPage.dart';
import 'package:flutterboilerplate/pages/table_verification/table_verification_page.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:go_router/go_router.dart';

final _rootNavigatorKey = AppNavigator.navigatorKey;

GoRouter appRouter() => GoRouter(
      navigatorKey: _rootNavigatorKey,
      debugLogDiagnostics: true,
      errorBuilder: (context, state) {
        AppLogger.e('🔴 ROUTER: Error page');
        return const HomePage();
      },
      redirect: (context, state) {
        // Get current path components
        final isLoggingIn = state.matchedLocation.contains('/login');
        final hasValidSession = _checkSession(); // Implement this method

        // Handle authenticated routes
        if (!hasValidSession && !isLoggingIn && state.matchedLocation != '/') {
          // Store the attempted path to redirect back after login
          final attempted = state.matchedLocation;
          return '/r/${state.pathParameters['restaurantId']}/t/${state.pathParameters['tableId']}/login?from=$attempted';
        }

        // Prevent accessing login page if already logged in
        if (hasValidSession && isLoggingIn) {
          final from = state.uri.queryParameters['from'];
          return from ?? '/';
        }

        return null; // No redirect needed
      },
      routes: [
        // Home page
        GoRoute(
          path: AppRoutes.home,
          builder: (context, state) {
            AppLogger.i('🏠 ROUTER: Home page');
            return const HomePage();
          },
        ),

        // Table verification (QR scan landing)
        GoRoute(
          path: AppRoutes.tablePath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];

            AppLogger.i(
                '🔐 ROUTER: Table Verification page\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId');

            if (restaurantId == null || tableId == null) {
              return const HomePage();
            }
            return TableVerificationPage(
              restaurantId: restaurantId,
              tableId: tableId,
              onLoginSuccess: () {
                context.go(AppRoutes.menu(restaurantId, tableId));
              },
            );
          },
        ),

        // Direct verification page
        GoRoute(
          path: AppRoutes.verifyPath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];
            final from = state.uri.queryParameters['from'];

            AppLogger.i(
                '🔐 ROUTER: Table Verification page (direct)\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId\n📍 FROM: $from');

            if (restaurantId == null || tableId == null) {
              return const HomePage();
            }
            return TableVerificationPage(
              restaurantId: restaurantId,
              tableId: tableId,
              onLoginSuccess: () {
                final destination =
                    from ?? AppRoutes.menu(restaurantId, tableId);
                context.go(destination);
              },
            );
          },
        ),

        // Menu page
        GoRoute(
          path: AppRoutes.menuPath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];

            AppLogger.i(
                '🍽️ ROUTER: Menu page\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId');

            if (restaurantId == null || tableId == null) {
              return const HomePage();
            }
            return MenuPage(
              restaurantId: restaurantId,
              tableId: tableId,
            );
          },
        ),

        // Cart page
        GoRoute(
          path: AppRoutes.cartPath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];

            AppLogger.i(
                '🛒 ROUTER: Cart page\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId');

            if (restaurantId == null || tableId == null) {
              return const HomePage();
            }
            return CartPage(
              restaurantId: restaurantId,
              tableId: tableId,
            );
          },
        ),

        // Order history page
        GoRoute(
          path: AppRoutes.ordersPath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];

            AppLogger.i(
                '📜 ROUTER: Orders History page\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId');

            if (restaurantId == null || tableId == null) {
              return const HomePage();
            }
            return OrderListingPage(
              restaurantId: restaurantId,
              tableId: tableId,
            );
          },
        ),

        // Order details page
        GoRoute(
          path: AppRoutes.orderDetailsPath,
          builder: (context, state) {
            final restaurantId = state.pathParameters['restaurantId'];
            final tableId = state.pathParameters['tableId'];
            final orderId = state.pathParameters['orderId'];

            AppLogger.i(
                '📜 ROUTER: Order Details page\n📝 PARAMS: restaurantId=$restaurantId, tableId=$tableId, orderId=$orderId');

            if (restaurantId == null || tableId == null || orderId == null) {
              return const HomePage();
            }
            return OrderListingPage(
              restaurantId: restaurantId,
              tableId: tableId,
              orderId: orderId,
            );
          },
        ),
      ],
    );

// Helper function to check session status
bool _checkSession() {
  // TODO: Implement actual session check
  // This should check local storage or state management for valid session
  return true;
}
