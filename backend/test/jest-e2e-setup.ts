/**
 * Jest E2E Test Setup
 * Configures test environment for end-to-end backend tests
 */

// Increase timeout for E2E tests to allow DB startup and connection retries
jest.setTimeout(180000);

import * as net from 'net';

/**
 * Wait for database to accept TCP connections.
 * Uses raw TCP check rather than mysql driver to avoid driver-specific issues.
 */
async function waitForDatabaseReady(retries = 60, delayMs = 2000): Promise<void> {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  for (let i = 0; i < retries; i++) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => {
        resolve(false);
      });
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (connected) {
      // eslint-disable-next-line no-console
      console.log(`✓ Database available at ${host}:${port}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.warn(`DB not ready (${i + 1}/${retries}), retrying in ${delayMs}ms...`);
    await new Promise((res) => setTimeout(res, delayMs));
  }

  throw new Error(`Unable to connect to DB at ${host}:${port} after ${retries} retries`);
}

beforeAll(async () => {
  await waitForDatabaseReady();
});

afterAll(async () => {
  // Cleanup code here - e.g., close database connections
});
