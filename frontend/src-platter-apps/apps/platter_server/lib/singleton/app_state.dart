/// Application state singleton container
class AppState {
  // Singleton instance
  static final AppState instance = AppState._internal();

  /// Session and restaurant IDs (default values)
  String sessionId = 'session001';
  String restaurantId = 'rest001';

  // Private constructor
  AppState._internal();

  // Optional: Add any other global state or methods here
}
