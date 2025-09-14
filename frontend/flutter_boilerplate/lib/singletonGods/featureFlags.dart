/// Feature flags to control application behavior and features
/// Use these flags to toggle features on and off without deploying new code
class FeatureFlags {
  // Private constructor to prevent instantiation
  FeatureFlags._();
  
  // Singleton instance
  static final FeatureFlags _instance = FeatureFlags._();
  
  // Factory constructor to access the singleton instance
  factory FeatureFlags() => _instance;
  
  // Order Page Features
  
  /// When true, shows order items grouped by cart checkout session
  /// When false, shows a flattened list of all items in the order
  bool showCartLevelBreakupForOrder = false;
  
  // Method to enable the cart level breakup feature
  void enableCartLevelBreakup() {
    showCartLevelBreakupForOrder = true;
  }
  
  // Method to disable the cart level breakup feature
  void disableCartLevelBreakup() {
    showCartLevelBreakupForOrder = false;
  }
}
