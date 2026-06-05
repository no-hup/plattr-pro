import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:platter_core/platter_core.dart' hide AppConfig, Environment;
import 'theme/app_theme.dart';
import 'pages/auth/login_screen.dart';
import 'pages/auth/login_provider.dart';
import 'main_navigation.dart';
import 'config/app_config.dart';

/// Global navigator key for showing dialogs from anywhere (e.g., interceptors)
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  // Global error handler for errors caught by the Flutter framework
  FlutterError.onError = (FlutterErrorDetails details) {
    print(
        'Caught FlutterError: \n  Exception: ${details.exceptionAsString()}\n');
    final List<String> filteredStackLines = details.stack
        .toString()
        .split('\n')
        .where((line) =>
            line.contains('package:platter_server/') ||
            (!line.contains('package:') && line.trim().isNotEmpty) ||
            line.contains(RegExp(r'main\.dart')))
        .toList();

    if (filteredStackLines.isNotEmpty) {
      print(
          'Filtered Stack trace (FlutterError):\n${filteredStackLines.join('\n')}\n');
    } else {
      print(
          'Stack trace (FlutterError - compact):\n${details.stack.toString().split('\n').take(10).join('\n')}\n...');
    }
  };

  // Global error handler for other Dart errors (sync/async)
  runZonedGuarded<Future<void>>(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Initialize AppConfig based on build mode
    if (kReleaseMode) {
      AppConfig.initialize(Environment.prod);
    } else {
      AppConfig.initialize(Environment.dev);
    }

    // Set up global interrupt flow handler
    InterruptFlowInterceptor.navigatorKey = navigatorKey;
    InterruptFlowInterceptor.registerHandler(DefaultInterruptFlowHandler.handle);

    runApp(const MyApp());
  }, (error, stackTrace) {
    print('Caught unhandled Dart error: \n  Error: $error\n');
    final List<String> filteredStackLines = stackTrace
        .toString()
        .split('\n')
        .where((line) =>
            line.contains('package:platter_server/') ||
            (!line.contains('package:') && line.trim().isNotEmpty) ||
            line.contains(RegExp(r'main\.dart')))
        .toList();

    if (filteredStackLines.isNotEmpty) {
      print(
          'Filtered Stack trace (runZonedGuarded):\n${filteredStackLines.join('\n')}\n');
    } else {
      print(
          'Stack trace (runZonedGuarded - compact):\n${stackTrace.toString().split('\n').take(10).join('\n')}\n...');
    }
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Server Platter',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      routes: {
        '/': (context) => const _AuthWrapper(),
        '/login': (context) => const LoginScreen(),
      },
    );
  }
}

/// Wrapper that checks for existing session and auto-logs in if valid
class _AuthWrapper extends StatefulWidget {
  const _AuthWrapper();

  @override
  State<_AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<_AuthWrapper> {
  bool _isChecking = true;
  bool _hasSession = false;
  LoginResponseData? _sessionData;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final provider = LoginProvider();
    final restored = await provider.tryRestoreSession();

    if (mounted) {
      setState(() {
        _isChecking = false;
        _hasSession = restored;
        _sessionData = provider.loginData;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_hasSession && _sessionData != null) {
      return MainNavigation(
        restaurantId: _sessionData!.restaurantId,
        sessionId: _sessionData!.sessionId,
        restaurantName: _sessionData!.restaurantName,
        serverName: _sessionData!.name,
      );
    }

    return const LoginScreen();
  }
}
