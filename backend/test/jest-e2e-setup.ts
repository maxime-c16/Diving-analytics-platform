/**
 * Jest E2E Test Setup
 * Configures test environment for end-to-end backend tests
 */

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Global setup - can be extended for database connections, etc.
beforeAll(async () => {
  // Setup code here - e.g., database connections
});

afterAll(async () => {
  // Cleanup code here - e.g., close database connections
});
