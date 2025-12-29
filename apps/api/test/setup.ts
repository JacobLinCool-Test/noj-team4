/**
 * Jest E2E Test Setup
 */

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// Clean up after all tests
afterAll(async () => {
  // Allow time for connections to close
  await new Promise((resolve) => setTimeout(resolve, 500));
});
