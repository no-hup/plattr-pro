import 'dart:async'; // For runZonedGuarded
import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'package:platter_server/pages/auth/login_screen.dart'; // Import LoginScreen
// import 'main_navigation.dart'; // No longer directly used here
import 'package:flutter/foundation.dart' show kReleaseMode;
import './config/app_config.dart'; // Import AppConfig

void main() async {
  // Global error handler for errors caught by the Flutter framework
  FlutterError.onError = (FlutterErrorDetails details) {
    print('Caught FlutterError: \n  Exception: ${details.exceptionAsString()}\n');
    final List<String> filteredStackLines = details.stack
        .toString()
        .split('\n')
        .where((line) => 
            line.contains('package:platter_server/') || 
            (!line.contains('package:') && line.trim().isNotEmpty) ||
            line.contains(RegExp(r'main\.dart'))
        )
        .toList();
    
    if (filteredStackLines.isNotEmpty) {
      print('Filtered Stack trace (FlutterError):\n${filteredStackLines.join('\n')}\n');
    } else {
      print('Stack trace (FlutterError - compact):\n${details.stack.toString().split('\n').take(10).join('\n')}\n...');
    }
  };

  // Global error handler for other Dart errors (sync/async)
  runZonedGuarded<Future<void>>(() async {
    // Ensure Flutter bindings are initialized inside the zone
    WidgetsFlutterBinding.ensureInitialized();

    // Initialize AppConfig based on build mode
    if (kReleaseMode) {
      AppConfig.initialize(Environment.prod);
    } else {
      AppConfig.initialize(Environment.dev);
    }
    
    runApp(const MyApp());
  }, (error, stackTrace) {
    print('Caught unhandled Dart error: \n  Error: $error\n');
    final List<String> filteredStackLines = stackTrace
        .toString()
        .split('\n')
        .where((line) => 
            line.contains('package:platter_server/') || 
            (!line.contains('package:') && line.trim().isNotEmpty) ||
            line.contains(RegExp(r'main\.dart'))
        )
        .toList();

    if (filteredStackLines.isNotEmpty) {
      print('Filtered Stack trace (runZonedGuarded):\n${filteredStackLines.join('\n')}\n');
    } else {
      print('Stack trace (runZonedGuarded - compact):\n${stackTrace.toString().split('\n').take(10).join('\n')}\n...');
    }
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Server Platter',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const LoginScreen(),
    );
  }
}
