# Response Guard

A lean LLM-integrated package for monitoring backend-frontend response adherence in the Plattr Pro app.

> **Note**: This project is under active development. Breaking changes may be introduced without backward compatibility guarantees as the application has not yet launched.

never upgrade node version
## Log Capture Methods

### How Logs Are Captured

| Flutter Target | Log Location | Capture Method |
|----------------|--------------|----------------|
| **Mobile (iOS/Android)** | Device/Emulator | `flutter logs` command ✅ |
| **Web (Chrome)** | Browser Console + VS Code | Custom interceptor needed |

### Option 1: Mobile Emulator (Recommended for Testing)
```bash
# Logs are captured via flutter logs command
./scripts/capture_logs.sh
```

### Option 2: Flutter Web - Add Log Interceptor (Recommended)

For Flutter web, add this interceptor to your `DioClient` to write logs to a local file:

**In `dio_client.dart`, add:**
```dart
import 'dart:io';
import 'dart:convert';

class ResponseGuardInterceptor extends Interceptor {
  final String logPath;
  
  ResponseGuardInterceptor({
    this.logPath = '/tmp/response_guard_logs.json'
  });
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _writeLog('request', {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'request',
      'endpoint': options.path,
      'method': options.method,
    });
    handler.next(options);
  }
  
  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final preview = response.data.toString();
    _writeLog('response', {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'response',
      'endpoint': response.requestOptions.path,
      'status': response.statusCode,
      'responsePreview': preview.length > 500 ? preview.substring(0, 500) : preview,
    });
    handler.next(response);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _writeLog('error', {
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'type': 'error',
      'endpoint': err.requestOptions.path,
      'errorType': err.type.toString(),
      'message': err.message,
    });
    handler.next(err);
  }
  
  void _writeLog(String type, Map<String, dynamic> data) {
    try {
      final file = File(logPath);
      file.writeAsStringSync(
        '${jsonEncode(data)}\n',
        mode: FileMode.append,
      );
    } catch (e) {
      // Silently fail in production
      print('[ResponseGuard] Log write failed: $e');
    }
  }
}
```

**Then add to DioClient constructor:**
```dart
// Add only in debug mode
if (kDebugMode) {
  dio.interceptors.add(ResponseGuardInterceptor(
    logPath: '/Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime/output/flutter_logs.json'
  ));
}
```

### Option 3: Copy VS Code Terminal Output Manually

1. Run your Flutter web app
2. Use the app, trigger API calls
3. Copy the relevant logs from VS Code terminal
4. Paste into `output/raw_logs.json` (one log per line)
5. Run `./scripts/generate_context.sh`

---

## Quick Start (Mobile Emulator)

```bash
# 1. Start Firebase emulator (in backend/src-plattr)
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
firebase emulators:start --project rms-app-dd875 --only firestore,functions

# 2. Import mock data
npm run import-mock

# 3. Start Flutter app on mobile emulator
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/src-platter-apps/apps/platter_server
flutter run -d <emulator_id>

# 4. Run Response Guard
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime
./scripts/capture_logs.sh        # Interactive capture
# ... use the app, trigger API calls ...
# Ctrl+C to stop
./scripts/generate_context.sh    # Generate LLM context
```

## Firebase Emulator Logs (Backend)
refer this file - firebase_emulator_tips
Capture backend logs alongside Flutter logs for complete visibility:

```bash
# Option 1: Start emulator with log capture
./scripts/capture_firebase_logs.sh

# Option 2: Capture from already running emulator
./scripts/capture_firebase_logs.sh --capture-only

# Check if emulator is running
./scripts/capture_firebase_logs.sh --check

# View status
./scripts/capture_firebase_logs.sh --status
```

The script filters out noise (startup messages, UI logs) and keeps:
- ✅ Function execution start/end
- ✅ Errors and warnings
- ✅ HTTP requests/responses
- ✅ Console.log from your functions

## Session Management


```bash
./scripts/capture_logs.sh --help      # Show all commands
./scripts/capture_logs.sh --clear     # Clear current session
./scripts/capture_logs.sh --archive   # Archive and start fresh  
./scripts/capture_logs.sh --list      # List all sessions
./scripts/capture_logs.sh --status    # Show current session status
```

## Flutter Web Logs

For Flutter web, we wrap the terminal to capture [ResponseGuard] logs:

```bash
./scripts/capture_flutter_web.sh       # Run Flutter web with log capture
./scripts/capture_flutter_web.sh --status  # Check captured logs
```

### General Flutter App Logging (Agent Friendly)
For optimized general development logs (Dio, Exceptions, Crashes) redirected to a file:
See [Flutter App Tips & Best Practices](flutter_app_tips.md)

## Package Structure

```
response_guard/
├── README.md                    # This file
├── config/
│   ├── endpoints.json           # API endpoints to monitor
│   └── log_patterns.json        # Patterns to filter/capture
├── scripts/
│   ├── capture_logs.sh          # Capture Flutter logs (mobile)
│   ├── capture_firebase_logs.sh # Capture Firebase emulator logs
│   ├── generate_context.sh      # Generate LLM-ready output
│   └── extract_contracts.py     # Parse HTML specs
├── output/                      # Session logs (gitignored)
│   ├── session_*.json           # Flutter session files
│   ├── firebase_*.json          # Firebase session files
│   ├── latest_session.json      # Symlink to current session
│   ├── llm_context.md           # Token-optimized LLM input
│   └── archive/                 # Old sessions
├── contracts/
│   └── extracted_contracts.json # Auto-parsed from specs
└── llm_instructions.md          # Instructions for supervisor LLM
```


## For LLM Supervisor

If you're an LLM tasked with response monitoring:

1. **Read** `llm_instructions.md` for your workflow
2. **Check** `output/llm_context.md` for the latest session data
3. **Reference** `contracts/extracted_contracts.json` for expected schemas
4. **Generate** anomaly reports in the format specified in instructions

## Source of Truth

API response contracts are extracted from:
- `/backend/src-plattr/warp/complete_app_flow_html/specs/*.html`
- `/backend-overview/scenarios/**/*.html`

## Dependencies

- Python 3.8+ (for spec parsing)
- `beautifulsoup4` package: `pip install beautifulsoup4`
- `jq` (for JSON processing in bash)
