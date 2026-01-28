import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:platter_core/platter_core.dart';
import 'firebase_options.dart';
import 'theme/app_theme.dart';
import 'pages/auth/login_screen.dart';
import 'pages/auth/login_provider.dart';
import 'main_navigation.dart';

/// Global navigator key for showing dialogs from anywhere (e.g., interceptors)
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize configuration
  AppConfig.initialize(Environment.dev);

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Set up global interrupt flow handler (for forced update, blocked user, etc.)
  InterruptFlowInterceptor.navigatorKey = navigatorKey;
  InterruptFlowInterceptor.registerHandler(DefaultInterruptFlowHandler.handle);

  runApp(const KitchenApp());
}

class KitchenApp extends StatelessWidget {
  const KitchenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey, // Global navigator key for dialogs
      title: 'Kitchen Plattr',
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
        kitchenName: _sessionData!.name, // Staff/Kitchen name
      );
    }

    return const LoginScreen();
  }
}
