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

// Auth
export 'src/auth/session_storage.dart';
export 'src/auth/login_request.dart';
export 'src/auth/login_response_data.dart';
export 'src/auth/login_api_service.dart';

// Logger
export 'src/logging/app_logger.dart';

// State
export 'src/state/data_state.dart';
export 'src/state/result.dart';

// Models
export 'src/models/api_error.dart';

// UI
export 'src/ui/error_handler.dart';

