#!/bin/bash
# Backend Flow Test Runner
# Runs the backend API flow tests against Firebase Functions emulator

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() { echo -e "\n${YELLOW}==== $1 ====${NC}\n"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
ok() { echo -e "${GREEN}✓ $1${NC}"; }

print_header "Backend Flow Test Runner"

# Check if Firebase emulator is running
echo "Checking if Firebase emulator is running..."
if ! curl -s http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation > /dev/null 2>&1; then
    fail "Firebase emulator is not running. Please start it with: cd backend/src-plattr && firebase emulators:start --project rms-app-dd875 --only firestore,functions"
fi
ok "Firebase emulator is running"

# Check if mock data is imported
echo "Checking if mock data is imported..."
if ! curl -s -X POST http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation \
  -H "Content-Type: application/json" \
  -d '{"data":{"restaurantId":"rest001","tableId":"table001","userLocation":{"latitude":40.7128,"longitude":-74.006,"accuracy":10.0}}}' > /dev/null 2>&1; then
    fail "Mock data not imported. Please run: cd backend/src-plattr && npm run import-mock"
fi
ok "Mock data is imported"

# Run Flutter tests
print_header "Running Backend Flow Tests"

echo "Running QR Scan & URL Parsing tests..."
flutter test test/backend_flow_test.dart --reporter=expanded

echo "Running Error Scenarios tests..."
flutter test test/error_scenarios_test.dart --reporter=expanded

print_header "All Backend Flow Tests Completed Successfully!"
ok "Backend API flow tests passed"

echo -e "\n${YELLOW}Test Summary:${NC}"
echo "✓ QR Scan & URL Parsing Tests"
echo "✓ Table Verification API Tests"
echo "✓ OTP Authentication API Tests"
echo "✓ Menu Loading API Tests"
echo "✓ End-to-End Flow Tests"
echo "✓ Error Scenarios Tests"
echo ""
echo "All tests completed successfully! 🎉"
