/**
 * Jest Configuration for ESM
 */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'run_server_only.js',
    'public/js/api.js',
    'public/js/admin.js',
    'public/js/user.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000
};
