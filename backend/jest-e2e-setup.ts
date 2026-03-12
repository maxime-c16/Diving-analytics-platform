/**
 * Jest E2E Test Setup (copied from `backend/test/jest-e2e-setup.ts`)
 * Configures test environment for end-to-end backend tests
 */

// Increase timeout for E2E tests (allow DB wait to complete)
jest.setTimeout(120000);

// Global setup - wait for DB to be ready before running tests.
import mysql from 'mysql2/promise';

async function waitForDatabaseReady(retries = 30, delayMs = 2000) {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'diver';
  const password = process.env.DB_PASSWORD || 'divepassword';
  const database = process.env.DB_NAME || 'diving_db';

  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mysql.createConnection({ host, port, user, password, database });
      await conn.ping();
      await conn.end();
      // console.info(`DB available at ${host}:${port}`);
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`DB not ready (${i + 1}/${retries}), retrying in ${delayMs}ms...`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error(`Unable to connect to DB at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}`);
}

beforeAll(async () => {
  await waitForDatabaseReady();
});

afterAll(async () => {
  // Cleanup code here - e.g., close database connections
});
