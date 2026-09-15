const config = {
    verbose: true,
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    // Unit tests only. The e2e suite (test/e2e/) is a standalone ESM plain-Node
    // harness run via `node test/e2e/run.js`, NOT through Jest.
    // lib/ holds tsc output of the new TypeScript layers (domain/app/adapters/api); tests live beside the code.
    testMatch: ['**/test/unit/**/*.test.js', '<rootDir>/lib/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/e2e/'],
    collectCoverage: true,
    collectCoverageFrom: [
        'cart/**/*.js',
        'genericModels/**/*.js',
        'session/**/*.js',
        'singleton/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**',
        '!**/test/**'
    ],
    coverageDirectory: 'coverage',
    moduleDirectories: ['node_modules', '<rootDir>'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1'
    }
};

module.exports = config;
