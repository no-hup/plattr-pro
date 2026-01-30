const config = {
    verbose: true,
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: ['**/test/unit/**/*.test.js', '**/test/**/*.test.js'],
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
