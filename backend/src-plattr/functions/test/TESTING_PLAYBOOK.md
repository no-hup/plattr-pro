# Testing Playbook

## Overview
This document outlines the testing strategy, standards, and workflows for the Plattr backend functions.

## Testing Stack
- **Framework**: Jest
- **Environment**: Node.js
- **Mocking**: Jest Mocks, Manual Mocks (for complex dependencies)

## Test Locations
- Unit Tests: `backend/src-plattr/functions/test/unit/`
- Integration Tests: `backend/src-plattr/functions/test/integration/`
- Fixtures: `backend/src-plattr/functions/test/fixtures/`
- Mocks: `backend/src-plattr/functions/test/mocks/`

## Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test.js

# Run with coverage
npm test -- --coverage
```

## Best Practices
1. **Isolation**: Use `jest.resetModules()` and `jest.doMock` in `beforeEach` to ensure clean state for every test.
2. **Mocking**: external dependencies like `firebase-functions`, `admin-admin` (Firestore), and Singletons should be mocked.
3. **Fixtures**: Use shared fixtures for data structures (Cart, MenuItem, Session) to maintain consistency.
4. **Error Handling**: Verify both the error code (if caught/returned) and the side effects (logs).
5. **Transaction Testing**: For functions using transactions, ensure your mock DB supports `runTransaction` execution (mocks the callback).

## Debugging
- Use `console.log` in tests to inspect intermediate states.
- Check `test_output.txt` if running in a constrained environment without interactive console.
