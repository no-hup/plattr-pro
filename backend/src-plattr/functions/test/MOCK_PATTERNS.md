# Mock Patterns

## Firestore Mock (`firestore.mock.js`)
- **Structure**: Factory function `mockFirestoreDb(initialData)`.
- **Capabilities**:
  - `collection()`, `doc()` chaining.
  - `get()` returns mock snapshots based on `initialData`.
  - `runTransaction(updateFn)` executes the callback immediately with a mock transaction object.
- **Usage**:
  ```javascript
  const mockData = { 'path/to/doc': { key: 'value' } };
  const mockDb = mockFirestoreDb(mockData);
  // ... pass mockDb to dependency injection ...
  ```

## Feature Flags Mock (`featureFlags.mock.js`)
- **Structure**: simple object or `jest.fn()`.
- **Usage**:
  ```javascript
  mockFeatureFlagEnabled.mockImplementation((flag) => {
      if (flag === 'myFlag') return true;
      return false;
  });
  ```

## Common Mocking Strategy (`jest.doMock`)
To ensure full isolation and dependency injection into modules that use `require()` internally (like `admin/admin.js` singletons):
```javascript
beforeEach(() => {
    jest.resetModules();
    jest.doMock('target-dependency', () => mockImplementation);
    const sut = require('system-under-test');
});
```
This forces the SUT to load with the fresh mock.
