// Global test setup and mocks for Jest

// Mock firebase-admin
jest.mock('firebase-admin', () => {
    return {
        initializeApp: jest.fn(),
        firestore: jest.fn(() => ({
            settings: jest.fn(),
        })),
    };
});

// Mock console globals to keep test output clean if needed, 
// but allowing them for now for debug purposes.
// global.console = {
//   ...console,
//   // log: jest.fn(),
//   // debug: jest.fn(),
//   // info: jest.fn(),
//   // warn: jest.fn(),
//   // error: jest.fn(),
// };
