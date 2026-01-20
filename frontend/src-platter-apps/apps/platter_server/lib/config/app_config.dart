enum Environment { dev, prod }

class AppConfig {
  static Environment currentEnvironment = Environment.dev; // Default to development

  // Placeholder for your actual production Firebase Functions URL
  // Example: https://<region>-<project-id>.cloudfunctions.net
  static const String _prodBaseUrl = 'https://us-central1-rms-app-dd875.cloudfunctions.net';

  // Your current emulator URL (adjust if needed, e.g., for Android emulator use 10.0.2.2)
  static const String _devBaseUrl = 'http://localhost:5002/rms-app-dd875/us-central1';

  static String get firebaseFunctionsBaseUrl {
    switch (currentEnvironment) {
      case Environment.prod:
        return _prodBaseUrl;
      case Environment.dev:
      default:
        return _devBaseUrl;
    }
  }

  /// Initializes the application configuration with the specified environment.
  /// Call this method at the beginning of your main() function.
  static void initialize(Environment env) {
    currentEnvironment = env;
    // You could add more environment-specific initializations here if needed
  }
}
