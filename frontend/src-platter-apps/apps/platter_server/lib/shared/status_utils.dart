// Re-export from platter_core for backward compatibility
// This allows existing imports in flatter_server to continue working
// while centralizing the logic in platter_core.
export 'package:platter_core/platter_core.dart'
    show OrderStatus, CartStatus, StatusUtils, StatusColors;
