# Backend API Flow Test Suite

This test suite validates the complete backend API flow for the Plattr Pro consumer app, focusing on the QR Scan → Table Verify → OTP Auth → Menu Load sequence.

## Overview

The test suite covers:
- **QR Scan & URL Parsing**: URL parameter extraction and validation
- **Table Verification API**: Location validation and session management
- **OTP Authentication API**: Primary/secondary user authentication
- **Menu Loading API**: Menu data fetching and structure validation
- **Error Scenarios**: Comprehensive error handling validation
- **End-to-End Flow**: Complete user journey testing

## Prerequisites

1. **Firebase Emulator Running**:
   ```bash
   cd backend/src-plattr
   export GOOGLE_APPLICATION_CREDENTIALS="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/secure_stuff/service-account.json"
   firebase emulators:start --project rms-app-dd875 --only firestore,functions --debug
   ```

2. **Mock Data Imported**:
   ```bash
   cd backend/src-plattr
   npm run import-mock
   ```

3. **Flutter Dependencies**:
   ```bash
   cd consumer
   flutter pub get
   ```

## Running Tests

### Quick Start
```bash
cd consumer/test
./run_backend_tests.sh
```

### Individual Test Files
```bash
# Main flow tests
flutter test test/backend_flow_test.dart

# Error scenario tests
flutter test test/error_scenarios_test.dart

# Cart contract tests (existing)
flutter test test/cart_contract_check_test.dart
```

## Test Structure

### Files
- `backend_flow_test.dart` - Main flow tests (QR → Table → OTP → Menu)
- `error_scenarios_test.dart` - Error handling validation
- `api_client.dart` - HTTP client for API calls
- `run_backend_tests.sh` - Test runner script

### Test Data
Additional test data added to `backend/src-plattr/functions/mock/mockData.json`:
- `test_customer_001`, `test_customer_002` - Test customers
- `table_test_001`, `table_test_002`, `table_test_003` - Test tables with different states
- `session_test_001`, `session_test_002` - Test sessions (active and expired)

## Test Coverage

### QR Scan & URL Parsing Tests
- ✅ Valid URL parsing
- ✅ Malformed URL handling
- 🔄 TODO: Feature flag variations

### Table Verification API Tests
- ✅ Valid table and location validation
- ✅ Authentication requirement when OTP mandatory
- ✅ Invalid restaurant/table ID handling
- ✅ Missing parameter validation
- 🔄 TODO: Location validation (currently simplified)

### OTP Authentication API Tests
- ✅ Primary customer authentication
- ✅ Invalid OTP handling
- ✅ Required field validation (phone, username)
- ✅ Missing parameter validation
- 🔄 TODO: Multi-user support scenarios

### Menu Loading API Tests
- ✅ Menu data fetching
- ✅ In-stock filtering
- ✅ Invalid restaurant handling
- ✅ Data structure validation
- ✅ Missing parameter validation

### Error Scenarios Tests
- ✅ Unauthenticated errors (401)
- ✅ Invalid argument errors (400)
- ✅ Failed precondition errors (412)
- ✅ Not found errors (404)
- ✅ Error response structure validation

## Feature Flags Tested

Current default configuration:
- `isOtpManadatoryAtScan: true` - OTP required at scan
- `isUsernameEnabled: true` - Username required for primary customers
- `isMultiUserSupportEnabled: false` - Single user per table

**TODO**: Add tests for different feature flag combinations:
- `isOtpManadatoryAtScan: false` - OTP not required at scan
- `isMultiUserSupportEnabled: true` - Multi-user scenarios
- `isUsernameEnabled: false` - Username not required

## API Endpoints Tested

- `table-validateTableAndLocation` - Table and location validation
- `table-validateOTP` - OTP authentication
- `menu-fetchMenu-fetchMenu` - Menu data fetching

## Error Codes Tested

- `invalid-argument` (400) - Missing or invalid parameters
- `unauthenticated` (401) - Authentication required
- `permission-denied` (403) - Access denied (disabled table)
- `not-found` (404) - Resource not found
- `failed-precondition` (412) - Precondition failed

## Mock Data Structure

Test data follows the pattern `*_test_*` to avoid conflicts with existing data:

### Test Tables
- `table_test_001` - Vacant table with OTP
- `table_test_002` - Disabled table
- `table_test_003` - Active table with session

### Test Customers
- `test_customer_001` - Primary customer
- `test_customer_002` - Secondary customer

### Test Sessions
- `session_test_001` - Active session
- `session_test_002` - Expired session

## Troubleshooting

### Common Issues

1. **Emulator Not Running**:
   ```
   Error: Firebase emulator is not running
   Solution: Start emulator with the command in Prerequisites
   ```

2. **Mock Data Not Imported**:
   ```
   Error: Mock data not imported
   Solution: Run `npm run import-mock` in backend/src-plattr
   ```

3. **Flutter Dependencies Missing**:
   ```
   Error: Package not found
   Solution: Run `flutter pub get` in consumer directory
   ```

### Debug Mode

Run tests with verbose output:
```bash
flutter test test/backend_flow_test.dart --reporter=expanded --verbose
```

## Future Enhancements

1. **Feature Flag Testing**: Add comprehensive feature flag combination tests
2. **Location Validation**: Add proper geolocation validation tests
3. **Session Management**: Add session expiry and cleanup tests
4. **Performance Testing**: Add API response time validation
5. **Contract Validation**: Add JSON schema validation for all responses

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Add test data with `_test_` suffix
3. Include both success and error scenarios
4. Update this README with new test coverage
5. Add TODO comments for future enhancements
