/**
 * Jest Setup File
 *
 * Runs before all test suites. Configures:
 * - Test environment variables
 * - Database mocks
 * - Global test utilities
 * - Timeout handling
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/otrarondamas_test';
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.KAFKA_ENABLED = 'false'; // Disable Kafka for unit tests

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global test timeout
jest.setTimeout(30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
