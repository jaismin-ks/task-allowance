// jest.config.js — unit tests for the money math, recurrence and formatting.
// The DB layer runs against a real (in-memory) SQLite with the app's migrations.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleNameMapper: {
    '^\\.\\./client$': '<rootDir>/tests/sqliteClient.js',
    '(^|/)db/client$': '<rootDir>/tests/sqliteClient.js',
    '\\.sql$': '<rootDir>/tests/emptyModule.js',
  },
};
