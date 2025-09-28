import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/home/home_repository.dart';
import 'package:flutterboilerplate/home/home_state.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_listing_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/order_listing_state.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/order_repository.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_repository.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/session/session_provider.dart';
import 'package:flutterboilerplate/theme/app_theme.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'pages/cart_listing/cart_listing_state.dart';
import 'router.dart';

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late GoRouter router;

  @override
  void initState() {
    super.initState();
    // Ensure Dio singleton (with interceptors) is initialized early
    DioClient.ensureInitialized();
    router = appRouter();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => HomeState(HomeRepository()),
        ),
        ChangeNotifierProvider(
          create: (context) => MenuState(MenuRepository()),
        ),
        ChangeNotifierProvider(
          create: (context) => SessionProvider(),
        ),
        ChangeNotifierProvider(
          create: (context) => CartListingState(
            CartListingRepository(),
            MenuRepository(),
            Provider.of<SessionProvider>(context, listen: false),
          ),
        ),
        ChangeNotifierProvider(
          create: (context) => OrderListingState(
            OrderRepository(),
            Provider.of<SessionProvider>(context, listen: false),
          ),
        ),
      ],
      child: MaterialApp.router(
        title: 'Flutter Boilerplate',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        routeInformationParser: router.routeInformationParser,
        routerDelegate: router.routerDelegate,
        routeInformationProvider: router.routeInformationProvider,
      ),
    );
  }
}

// ----- Logging helpers (SDK noise filtering) -----
const _sdkNoise = <String>[
  'dart-sdk/',
  '_internal/js_dev_runtime/',
  'ddc_runtime/',
  'package:flutter/',
  'flutter/lib/src/',
  'isolate_helper.dart',
];

String filterSdkNoise(String input) {
  final lines = input.split('\n');
  final kept = lines.where((l) => !_sdkNoise.any(l.contains)).toList();
  return kept.where((l) => l.trim().isNotEmpty).join('\n');
}

void appLog(String message) {
  final filtered = filterSdkNoise(message);
  if (filtered.isEmpty) return;
  developer.log(filtered, name: 'APP');
}
