# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Backend (Firebase Functions)
```bash
cd backend/src-plattr
```

**Start emulators:**
```bash
firebase emulators:start
```

**Deploy functions:**
```bash
cd functions && npm run deploy
```

**Import mock data:**
```bash
npm run import-mock
```

**View emulator UI:**
http://localhost:4001 (after starting emulators)

**Emulator ports:**
- Functions: localhost:5002
- Firestore: localhost:8080
- UI: localhost:4001
- Logging: localhost:4501

### Frontend Applications

#### Consumer App (Flutter Boilerplate)
```bash
cd frontend/flutter_boilerplate
flutter pub get
flutter run -d chrome --web-port=5100
```

**Build and generate icons/splash:**
```bash
dart run flutter_launcher_icons:main
dart run flutter_native_splash:create
dart run build_runner build --delete-conflicting-outputs
```

#### Admin App
```bash
cd frontend/src-platter-apps/apps/platter_admin
flutter pub get
flutter run -d chrome --web-port=5101
```

#### Kitchen App
```bash
cd frontend/src-platter-apps/apps/platter_kitchen
flutter pub get
flutter run -d chrome --web-port=5102
```

#### Server App
```bash
cd frontend/src-platter-apps/apps/platter_server
flutter run -d chrome --web-port=5103
```

### Testing

**Single test (Flutter):**
```bash
flutter test test/specific_test.dart
```

**All tests:**
```bash
flutter test
```

## Architecture Overview

### Multi-App Platform Structure
Plattr Pro is a restaurant management platform with 4 main applications:

1. **Consumer App** (`frontend/flutter_boilerplate`) - Customer-facing mobile/web app
2. **Admin App** (`frontend/src-platter-apps/apps/platter_admin`) - Restaurant administration
3. **Kitchen App** (`frontend/src-platter-apps/apps/platter_kitchen`) - Kitchen order management  
4. **Server App** (`frontend/src-platter-apps/apps/platter_server`) - Wait staff interface

### Backend Architecture
The backend is built on Firebase Functions with a modular structure:

**Core modules in `backend/src-plattr/functions/`:**
- `admin/` - Administrative functions
- `cart/` - Shopping cart management
- `customer/` - Customer operations
- `menu/` - Menu management
- `orders/` - Order processing
- `table/` - Table management
- `server/` - Server staff functions
- `notifications/` - Push notifications
- `utils/` - Shared utilities

**Key patterns:**
- Each module exports functions through index files
- Centralized Firebase Admin initialization via `admin/admin.js`
- Timestamp and array operations use utility functions for emulator compatibility
- Modular function exports in `index.js`

### Frontend Architecture
All Flutter apps follow a similar structure:
- **Provider** for state management
- **go_router** for navigation
- **dio** for HTTP client with Firebase Performance monitoring
- **envied** for environment configuration
- **get_it** for dependency injection

**Shared patterns:**
- Environment-based configuration with `.env` files
- Firebase integration (Analytics, Crashlytics, Performance)
- Material Design with consistent theming
- Code generation with build_runner for JSON serialization

## Development Workflow

### Firebase Emulator Setup
The project uses Firebase emulators for local development. The emulator configuration is defined in `backend/src-plattr/firebase.json` with specific ports for each service.

### Multi-workspace Development
The `plattr-pro.code-workspace` file defines a VS Code multi-root workspace with:
- Backend functions
- Consumer Flutter app  
- Admin Flutter app
- Kitchen Flutter app
- Server Flutter apps

### Environment Management
Each Flutter app uses **envied** for environment configuration:
1. Copy `.env-sample` to create environment-specific `.env` files
2. Run `dart run build_runner build` to generate environment classes
3. Use `@EnviedField(obfuscate: true)` for sensitive values

### Code Quality Standards
- Dart code follows Flutter best practices with `very_good_analysis` linting
- Format on save enabled for Dart files
- 100-character line length limit
- Automatic import organization

## Key Development Rules

### Firebase Operations
- Always use timestamp utility (`functions/utils/timestamp.js`) instead of direct Timestamp operations
- Use `safeArrayUnion()` and `safeArrayRemove()` instead of direct FieldValue operations  
- Import centralized admin module (`functions/admin/admin.js`) for Firebase initialization

### Code Standards
- Prefer simple solutions and avoid code duplication
- Check for existing functionality before implementing new features
- Keep changes minimal and focused
- Maintain clean, organized codebase
- Use Prettier for consistent formatting

### Firebase Emulator Compatibility
Critical initialization order for emulator support:
1. Initialize Firebase Admin: `admin.initializeApp()`
2. Get Firestore instance: `const db = admin.firestore()`
3. Get FieldValue and Timestamp references BEFORE settings
4. Apply emulator settings AFTER getting references

### Flutter Development
- Use Provider for state management
- Implement proper error handling with Firebase Crashlytics
- Follow Material Design guidelines
- Use code generation for JSON serialization with build_runner

## Browser Tools Integration
The codebase includes browser automation tools in `frontend/src-platter-apps/browser-tools-mcp/` with:
- Chrome extension for browser automation
- Puppeteer service for web scraping
- Lighthouse integration for performance auditing
- MCP server for browser tool coordination