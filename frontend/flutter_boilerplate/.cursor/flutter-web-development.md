# Flutter Web Development with Live Reload - Cursor Rules

## Running the Flutter Web App with Live Edits

### Primary Command for Development
```bash
flutter run -d chrome --web-port 8080
```

### Alternative Development Commands
```bash
# Run with specific Chrome profile (useful for testing)
flutter run -d chrome --web-port 8080 --web-browser-flag="--user-data-dir=/tmp/chrome_dev_test"

# Run with hot reload enabled and verbose output
flutter run -d chrome --web-port 8080 --verbose

# Run with web renderer selection (auto, html, or canvaskit)
flutter run -d chrome --web-port 8080 --web-renderer auto
```

### Development Workflow
1. **Start the app**: Run `flutter run -d chrome --web-port 8080`
2. **Live editing**: Make changes to your Dart files
3. **Hot reload**: Press `r` in the terminal or save files (if your editor supports it)
4. **Hot restart**: Press `R` in the terminal for full app restart
5. **Quit**: Press `q` in the terminal to stop the development server

### Key Features
- **Hot Reload**: Instant reflection of UI changes without losing app state
- **Hot Restart**: Full app restart while maintaining the development session
- **Chrome DevTools**: Full debugging capabilities with breakpoints, network inspection, etc.
- **Live Error Display**: Compilation errors shown directly in the browser

### Useful Development Tips
- Use `--web-port 8080` to ensure consistent localhost URL
- Chrome DevTools can be accessed via F12 or right-click → Inspect
- The app will automatically reload when you save changes in supported editors
- Use `flutter run --help` to see all available options

### Building for Production
```bash
# Build optimized web version
flutter build web

# Build with specific web renderer
flutter build web --web-renderer canvaskit

# Serve the built app locally for testing
python3 -m http.server 8000 -d build/web
```

### Troubleshooting
- If hot reload stops working, try pressing `R` for hot restart
- Clear browser cache if you see stale content: Cmd+Shift+R (Mac)
- Check terminal output for compilation errors
- Ensure no other processes are using port 8080

### Project Structure Notes
- Main app entry point: `lib/main.dart`
- Web-specific files: `web/` directory
- Tests are in `test/` directory (excluded from builds)
- App configuration: `pubspec.yaml`

### Test Commands (Optional)
```bash
# Run all tests (may have issues as noted)
flutter test

# Run specific test file
flutter test test/widget_test.dart

# Run tests with verbose output
flutter test --verbose
```

**Note**: Test folder has some compilation issues but doesn't affect the main app functionality.

### Quick Reference
- **Start development server**: `flutter run -d chrome --web-port 8080`
- **Hot reload**: Press `r` or save file
- **Hot restart**: Press `R`
- **Stop server**: Press `q`
- **Access app**: http://localhost:8080