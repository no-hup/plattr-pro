/// Platter Core - Shared utilities and models for Platter apps.
library platter_core;

// Config
export 'src/config/app_config.dart';

// Network
export 'src/network/api_response.dart';
export 'src/network/response_parser.dart';
export 'src/network/dio_client.dart';
export 'src/network/response_guard_interceptor.dart';
export 'src/network/interrupt_flow_interceptor.dart';
export 'src/network/offline_status.dart';
export 'src/widgets/offline_banner.dart';

// Auth
export 'src/auth/session_storage.dart';
export 'src/auth/login_request.dart';
export 'src/auth/login_response_data.dart';
export 'src/auth/login_api_service.dart';
export 'src/auth/base_login_provider.dart';
export 'src/auth/dev_logins.dart';

// Logger
export 'src/logging/app_logger.dart';

// State
export 'src/state/data_state.dart';
export 'src/state/result.dart';

// Models
export 'src/models/api_error.dart';
export 'src/models/menu/menu_item.dart';
export 'src/models/menu/menu_item_meta.dart';
export 'src/models/menu/menu_category.dart';
export 'src/models/menu/menu_subcategory.dart';
export 'src/models/menu/price_info.dart';
export 'src/models/menu/nutritional_info.dart';
export 'src/models/menu/addon.dart';
export 'src/models/menu/addon_meta.dart';
export 'src/models/menu/variant.dart';
export 'src/models/menu/variant_meta.dart';
export 'src/models/menu/variant_option.dart';
export 'src/models/menu/full_restaurant_menu_response.dart';
export 'src/models/menu/update_menu_item_availability_response.dart';
export 'src/models/settings/restaurant_settings.dart';

// Settings
export 'src/settings/settings_api_service.dart';

// UI
export 'src/ui/error_handler.dart';
export 'src/ui/auth/platter_login_form.dart';
export 'src/ui/theme/platter_theme_service.dart';

// Converters
export 'src/converters/timestamp_converter.dart';
export 'src/converters/id_converter.dart';
export 'src/converters/status_utils.dart';

// Logging
export 'src/logging/field_logger.dart';
