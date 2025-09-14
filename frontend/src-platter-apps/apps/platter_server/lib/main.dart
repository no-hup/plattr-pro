import 'dart:async'; // For runZonedGuarded
import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'package:platter_server/pages/auth/login_screen.dart'; // Import LoginScreen
// import 'main_navigation.dart'; // No longer directly used here
import 'package:flutter/foundation.dart' show kReleaseMode;
import './config/app_config.dart'; // Import AppConfig

void main() async {
  // Ensure Flutter bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize AppConfig based on build mode
  if (kReleaseMode) {
    AppConfig.initialize(Environment.prod);
  } else {
    AppConfig.initialize(Environment.dev);
  }

  // Global error handler for errors caught by the Flutter framework
  FlutterError.onError = (FlutterErrorDetails details) {
    print('Caught FlutterError: \n  Exception: ${details.exceptionAsString()}\n');
    // Attempt to filter the stack trace to be more app-specific
    final List<String> filteredStackLines = details.stack
        .toString()
        .split('\n')
        .where((line) => 
            line.contains('package:platter_server/') || 
            (!line.contains('package:') && line.trim().isNotEmpty) ||
            line.contains(RegExp(r'main\.dart')) // Keep lines referencing main.dart directly
        )
        .toList();
    
    if (filteredStackLines.isNotEmpty) {
      print('Filtered Stack trace (FlutterError):\n${filteredStackLines.join('\n')}\n');
    } else {
      // If filtering removed everything, show a compact version of the original
      print('Stack trace (FlutterError - compact):\n${details.stack.toString().split('\n').take(10).join('\n')}\n... (full stack available via FlutterError.dumpErrorToConsole)\n');
    }
    // For full, unfiltered output if needed during deep debugging:
    // FlutterError.dumpErrorToConsole(details, forceReport: true);
  };

  // Global error handler for other Dart errors (sync/async)
  runZonedGuarded<Future<void>>(() async {
    runApp(const MyApp());
  }, (error, stackTrace) {
    print('Caught unhandled Dart error: \n  Error: $error\n');
    // Attempt to filter the stack trace
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
      // If filtering removed everything, show a compact version of the original
      print('Stack trace (runZonedGuarded - compact):\n${stackTrace.toString().split('\n').take(10).join('\n')}\n... (full stack logged if necessary)\n');
    }
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Default restaurant and session IDs are removed
    // const String restaurantId = 'rest001';
    // const String sessionId = 'session001';
    
    return MaterialApp(
      title: 'Server Platter',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const LoginScreen(), // New home: LoginScreen
    );
  }
}
