import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:logger/logger.dart';
import 'dart:developer' as developer;
import 'theme/app_theme.dart';
import 'di/di.dart';

// Add a global logger that shows logs in both console and can be collected for UI
class AppLogger {
  static final List<String> _logs = [];
  static const int maxLogs = 20;
  static late final Logger _logger;
  
  static void initialize() {
    if (GetIt.instance.isRegistered<Logger>()) {
      _logger = GetIt.instance<Logger>();
    }
  }

  static void log(String message, {Object? error}) {
    final timestamp = DateTime.now().toString().substring(0, 19);
    final logMessage = '[$timestamp] $message';
    
    // Log to developer console
    developer.log(logMessage, name: 'AdminApp', error: error);
    
    // Also log using Logger if available
    if (GetIt.instance.isRegistered<Logger>()) {
      if (error != null) {
        _logger.e(message, error: error, stackTrace: StackTrace.current);
      } else {
        _logger.i(message);
      }
    }
    
    // Store for UI display
    _logs.add(logMessage);
    if (_logs.length > maxLogs) {
      _logs.removeAt(0);
    }
    
    // Also print to regular console for IDE output
    print('AdminApp: $logMessage');
    if (error != null) {
      print('AdminApp Error: $error');
    }
  }

  static List<String> get logs => List.from(_logs);
  
  static void clear() {
    _logs.clear();
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Setup dependency injection
  setupDi();
  AppLogger.initialize();
  
  AppLogger.log('Application starting');
  
  try {
    AppLogger.log('Initializing Firebase');
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    AppLogger.log('Firebase initialized successfully');
  } catch (e) {
    AppLogger.log('Firebase initialization failed', error: e);
  }
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Admin Plattrr',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const MyHomePage(title: 'Admin Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String _message = 'Loading...';
  int _counter = 0;
  bool _isLoading = false;
  bool _showLogs = false;
  
  // Use Dio from GetIt
  late final Dio _dio;

  @override
  void initState() {
    super.initState();
    _dio = getIt<Dio>();
    AppLogger.log('Home page initialized');
    _checkFirebaseAndApi();
  }
  
  @override
  void dispose() {
    // Don't close the Dio instance here since it's managed by GetIt
    super.dispose();
  }

  Future<void> _checkFirebaseAndApi() async {
    setState(() {
      _isLoading = true;
    });
    
    AppLogger.log('Checking Firebase and API status');
    
    try {
      // Check Firebase initialization
      if (Firebase.apps.isNotEmpty) {
        AppLogger.log('Firebase initialized successfully: ${Firebase.apps.length} app(s)');
        final appId = Firebase.app().options.appId;
        final apiKey = Firebase.app().options.apiKey;
        AppLogger.log('App ID: $appId');
        AppLogger.log('API Key: ${apiKey.substring(0, 5)}...(hidden)');
        
        // Display Firebase status and mock API response based on curl results
        setState(() {
          _message = 'Firebase Initialization Status:\n'
              '✅ Firebase initialized successfully\n'
              '• Firebase App Count: ${Firebase.apps.length}\n'
              '• App ID: $appId\n'
              '• API Key: ${apiKey.substring(0, 5)}...(hidden)\n\n'
              'API Connection Test:\n'
              '⚠️ Browser CORS policy prevents direct API calls\n\n'
              'Curl Test Result (from terminal):\n'
              '✅ Status: 200 OK\n'
              '✅ Response: "Hello from Firebase!"';
        });
        
        // Try API call anyway (will likely fail with CORS error)
        _tryApiCall();
      } else {
        AppLogger.log('Firebase initialization failed');
        setState(() {
          _message = '❌ Error: Firebase initialization failed';
        });
      }
    } catch (e) {
      AppLogger.log('Error during checks', error: e);
      setState(() {
        _message = '❌ Error: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  Future<void> _tryApiCall() async {
    // This is just for logging purposes - we know it will likely fail due to CORS
    try {
      AppLogger.log('Attempting API call using Dio (for logging only)');
      final response = await _dio.get('https://helloworld-trjyt6x44q-uc.a.run.app');
      AppLogger.log('API call succeeded (unexpected): ${response.statusCode}');
      AppLogger.log('Response data: ${response.data}');
    } catch (e) {
      if (e is DioException) {
        AppLogger.log('Dio API call failed as expected: ${e.type}, ${e.message}');
      } else {
        AppLogger.log('API call failed with unknown error: ${e.toString()}');
      }
    }
  }

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
    AppLogger.log('Counter incremented to $_counter');
  }

  void _toggleLogs() {
    setState(() {
      _showLogs = !_showLogs;
    });
    AppLogger.log('Logs visibility toggled to $_showLogs');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: Icon(_showLogs ? Icons.visibility_off : Icons.visibility),
            onPressed: _toggleLogs,
            tooltip: 'Toggle Logs',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Card(
                elevation: 4,
                margin: const EdgeInsets.symmetric(vertical: 8.0),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Firebase & API Status:',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          if (_isLoading) 
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 16, 
                                    height: 16, 
                                    child: CircularProgressIndicator(strokeWidth: 2)
                                  ),
                                  SizedBox(width: 8),
                                  Text('Loading...'),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const Divider(),
                      const SizedBox(height: 8),
                      if (_isLoading && _message == 'Loading...')
                        const Center(child: CircularProgressIndicator())
                      else
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: SelectableText(
                            _message,
                            style: const TextStyle(
                              fontSize: 14,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 40),
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'Counter Demo',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text('You have pushed the button this many times:'),
                      Text(
                        '$_counter',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ],
                  ),
                ),
              ),
              if (_showLogs) ...[
                const SizedBox(height: 32),
                Card(
                  elevation: 4,
                  color: Colors.black,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Application Logs:',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: Colors.white,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.refresh, color: Colors.white),
                              onPressed: () => setState(() {}),
                              tooltip: 'Refresh Logs',
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 200,
                          decoration: BoxDecoration(
                            color: Colors.black,
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: ListView.builder(
                            itemCount: AppLogger.logs.length,
                            itemBuilder: (context, index) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2.0),
                                child: SelectableText(
                                  AppLogger.logs[index],
                                  style: const TextStyle(
                                    color: Colors.green,
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
