# Terminal Output Piping for Log Capture

## Learning

❌ **Initial Assumption:** Flutter web `debugPrint()` only goes to browser console, not capturable.

✅ **Correct Understanding:** When running `flutter run -d chrome`, ALL `debugPrint()` output appears in the **terminal** that started the process. This terminal output can be piped through filters.

💡 **Key Insight:** Any long-running process that outputs to stdout/stderr (emulators, dev servers, Flutter, etc.) can have its output piped through a filter script to extract and save relevant logs.

## Pattern

```bash
# Instead of running directly:
flutter run -d chrome

# Wrap with a filter:
flutter run -d chrome 2>&1 | while IFS= read -r line; do
    echo "$line"  # Show original output
    
    # Filter and save specific logs
    if echo "$line" | grep -q "\[MyPrefix\]"; then
        echo "$line" >> /path/to/logs.json
    fi
done
```

## When to Apply

This pattern works for:
- Firebase emulator logs
- Flutter run output (any platform)
- Node.js dev servers
- Any CLI tool with continuous output

## Implementation Examples

- `response_guard/scripts/capture_firebase_logs.sh` - Firebase emulator
- `response_guard/scripts/capture_flutter_web.sh` - Flutter web app
