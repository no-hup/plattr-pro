enum Environment { dev, prod }

/// Application configuration for Platter apps.
/// Provides environment-aware base URL management.
class AppConfig {
  static Environment currentEnvironment = Environment.dev;
  static String? _overrideBaseUrl;

  // Production Firebase Functions URL
  static const String _prodBaseUrl =
      'https://us-central1-rms-app-dd875.cloudfunctions.net';

  // Development/Emulator URL
  static const String _devBaseUrl =
      'http://localhost:5002/rms-app-dd875/us-central1';

  static String get firebaseFunctionsBaseUrl {
    final override = _overrideBaseUrl;
    if (override != null && override.isNotEmpty) {
      return override;
    }
    switch (currentEnvironment) {
      case Environment.prod:
        return _prodBaseUrl;
      case Environment.dev:
        return _devBaseUrl;
    }
  }


  /// Initializes the application configuration with the specified environment.
  static void initialize(Environment env) {
    currentEnvironment = env;
  }

  /// Overrides the base URL (useful for tests).
  static void setOverrideBaseUrl(String? url) {
    _overrideBaseUrl = url;
  }
}
