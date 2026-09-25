import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:platter_core/platter_core.dart';
import 'firebase_options.dart';
import 'theme/app_theme.dart';
import 'pages/auth/login_screen.dart';
import 'pages/auth/login_provider.dart';
import 'pages/home/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize configuration
  AppConfig.initialize(kReleaseMode ? Environment.prod : Environment.dev);

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const AdminApp());
}

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Admin Plattr',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
      // No `home:` next to a '/' route: debug builds assert on the pair and the app never paints.
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
      return HomeScreen(
        restaurantId: _sessionData!.restaurantId,
        sessionId: _sessionData!.sessionId,
        restaurantName: _sessionData!.restaurantName,
        staffName: _sessionData!.name,
        staffId: _sessionData!.staffId,
        role: _sessionData!.role,
      );
    }

    return const LoginScreen();
  }
}
