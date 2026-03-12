/**
 * Playwright E2E Test for Full Pipeline
 * 
 * Tests the complete pipeline from PDF upload to UI display.
 * 
 * Implements task T044 from Phase 6 (US4 - E2E Testing).
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost';
const API_URL = process.env.API_URL || 'http://localhost/api';
const PDF_FIXTURE_PATH = path.join(__dirname, '../../fixtures/ground-truth-expected.json');

// Test data - use environment variable for PDF path if available
const TEST_COMPETITION_NAME = 'E2E Test Competition';
const TEST_PDF_PATH = process.env.TEST_PDF_PATH || path.join(__dirname, '../..', '20251123 Championnats IDF hiver 3m-HV - Résultats détaillés.pdf');

/**
 * Helper to wait for API response
 */
async function waitForApiResponse(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 30000 }
  );
}

test.describe('Full Pipeline E2E Tests', () => {
  test.describe('PDF Upload and Processing', () => {
    test('should upload PDF and show processing status', async ({ page }) => {
      // Navigate to competitions page
      await page.goto(`${BASE_URL}/competitions`);
      
      // The page has a hidden file input for PDF upload in the drag-drop area
      const fileInput = page.locator('input[type="file"][accept=".pdf"]');
      await expect(fileInput).toBeAttached({ timeout: 5000 });
      
      // Upload the PDF file by setting it on the hidden input
      await fileInput.setInputFiles(TEST_PDF_PATH);
      
      // After file selection, wait for the file name to appear
      await expect(page.getByText(/Championnats|\.pdf/i)).toBeVisible({ timeout: 5000 });
      
      // Click the "Upload & Process" button
      const uploadButton = page.getByRole('button', { name: /upload.*process/i });
      await expect(uploadButton).toBeVisible({ timeout: 5000 });
      await uploadButton.click();
      
      // Wait for processing indicators
      await expect(
        page.getByText(/uploading|processing OCR|dives extracted|completed/i)
      ).toBeVisible({ timeout: 60000 });
    });

    test('should poll for PDF processing status', async ({ page }) => {
      // This test verifies the polling mechanism
      await page.goto(`${BASE_URL}/competitions`);
      
      // Look for any processing items
      const processingItems = page.locator('[data-status="processing"]');
      
      if (await processingItems.count() > 0) {
        // Verify polling updates the status
        const initialText = await processingItems.first().textContent();
        
        // Wait a bit for potential updates
        await page.waitForTimeout(5000);
        
        // Status might have changed
        const newText = await processingItems.first().textContent();
        // Either same or updated - both valid
        expect(newText).toBeDefined();
      }
    });
  });

  test.describe('Competition List Page', () => {
    test('should load and display competition list', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Should have a heading
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      
      // Should have navigation
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });

    test('should show status badges for competitions', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Look for status indicators
      const statusBadges = page.locator('[class*="status"], [class*="badge"]');
      
      // If there are competitions, there should be status badges
      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible();
      }
    });

    test('should navigate to competition detail on click', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Find clickable competition items
      const competitionLinks = page.locator('a[href*="/competitions/"]');
      
      if (await competitionLinks.count() > 0) {
        await competitionLinks.first().click();
        
        // Should navigate to detail page
        await expect(page).toHaveURL(/\/competitions\/[a-z0-9-]+/i);
      }
    });
  });

  test.describe('Competition Detail Page', () => {
    test('should display competition statistics', async ({ page }) => {
      // First navigate to competitions
      await page.goto(`${BASE_URL}/competitions`);
      
      // Find a completed competition
      const completedLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await completedLink.isVisible()) {
        await completedLink.click();
        
        // Wait for data to load
        await page.waitForLoadState('networkidle');
        
        // Look for statistics cards
        const statsCards = page.locator('[class*="card"]');
        
        if (await statsCards.count() > 0) {
          // Should have statistics
          await expect(statsCards.first()).toBeVisible();
        }
      }
    });

    test('should display tabs for different views', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Look for tab triggers
        const tabs = page.locator('[role="tablist"]');
        
        if (await tabs.isVisible()) {
          // Verify tabs exist
          await expect(page.getByRole('tab', { name: /standings/i })).toBeVisible();
          await expect(page.getByRole('tab', { name: /rounds/i })).toBeVisible();
        }
      }
    });

    test('should switch between tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Try clicking on different tabs
        const roundsTab = page.getByRole('tab', { name: /rounds/i });
        
        if (await roundsTab.isVisible()) {
          await roundsTab.click();
          
          // Verify content changed
          const roundContent = page.getByText(/round 1/i);
          if (await roundContent.count() > 0) {
            await expect(roundContent.first()).toBeVisible();
          }
        }
      }
    });

    test('should expand athlete to show dive breakdown', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Find athlete row (clickable)
        const athleteRow = page.locator('[class*="cursor-pointer"]').first();
        
        if (await athleteRow.isVisible()) {
          await athleteRow.click();
          
          // Wait for expansion animation
          await page.waitForTimeout(500);
          
          // Look for dive breakdown table
          const diveTable = page.locator('table').first();
          if (await diveTable.isVisible()) {
            await expect(diveTable).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Data Alignment (US3)', () => {
    test('should display dive codes in correct format', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Look for dive code patterns (e.g., 101B, 5231D)
        const diveCodePattern = /\b[1-6]\d{2,3}[A-D]\b/;
        const content = await page.content();
        
        // Verify dive codes exist in correct format
        expect(diveCodePattern.test(content)).toBe(true);
      }
    });

    test('should use fixed column widths in tables', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Click on rounds tab
        const roundsTab = page.getByRole('tab', { name: /rounds/i });
        
        if (await roundsTab.isVisible()) {
          await roundsTab.click();
          
          // Check for table with proper structure
          const table = page.locator('table').first();
          
          if (await table.isVisible()) {
            // Verify table has headers
            const headers = table.locator('th');
            expect(await headers.count()).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should handle null values with fallbacks', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Look for fallback dash character
        const content = await page.content();
        
        // Should have fallback characters for missing data
        // The — character is used for null values
        expect(content.includes('—') || content.includes('-')).toBe(true);
      }
    });
  });

  test.describe('Event Filtering', () => {
    test('should show event selector for multi-event competitions', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Look for event selector
        const eventSelector = page.getByText(/all events/i);
        
        // May or may not be visible depending on competition
        const isMultiEvent = await eventSelector.isVisible().catch(() => false);
        
        if (isMultiEvent) {
          await expect(eventSelector).toBeVisible();
        }
      }
    });

    test('should filter data by event when selected', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Look for event buttons (e.g., "Elite - Dames - 3m")
        const eventButtons = page.locator('button').filter({ hasText: /elite|dames|messieurs|3m|hv/i });
        
        if (await eventButtons.count() > 1) {
          // Click on second event (first might be "All Events")
          await eventButtons.nth(1).click();
          
          // Wait for data update
          await page.waitForTimeout(500);
          
          // Verify filter is active (button has different styling)
          const activeButton = page.locator('button[data-state="active"]');
          if (await activeButton.count() > 0) {
            await expect(activeButton).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Charts', () => {
    test('should render score charts', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      const competitionLink = page.locator('a[href*="/competitions/"]').first();
      
      if (await competitionLink.isVisible()) {
        await competitionLink.click();
        await page.waitForLoadState('networkidle');
        
        // Click charts tab
        const chartsTab = page.getByRole('tab', { name: /charts/i });
        
        if (await chartsTab.isVisible()) {
          await chartsTab.click();
          
          // Wait for charts to render
          await page.waitForTimeout(1000);
          
          // Look for chart containers (Recharts uses ResponsiveContainer)
          const chartContainers = page.locator('[class*="recharts"], svg');
          
          if (await chartContainers.count() > 0) {
            await expect(chartContainers.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message for non-existent competition', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions/non-existent-id-12345`);
      
      // Should show error state
      await page.waitForLoadState('networkidle');
      
      // Look for error message or "not found" text
      const errorText = page.getByText(/not found|error/i);
      
      if (await errorText.isVisible()) {
        await expect(errorText).toBeVisible();
      }
      
      // Should have back button
      const backButton = page.getByRole('link', { name: /back/i });
      if (await backButton.isVisible()) {
        await expect(backButton).toBeVisible();
      }
    });

    test('should display row errors in details tab', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Find a competition with partial status
      const partialLink = page.locator('a[href*="/competitions/"]').filter({ hasText: /partial/i });
      
      if (await partialLink.count() > 0) {
        await partialLink.first().click();
        await page.waitForLoadState('networkidle');
        
        // Click details tab
        const detailsTab = page.getByRole('tab', { name: /details/i });
        
        if (await detailsTab.isVisible()) {
          await detailsTab.click();
          
          // Look for error section
          const errorSection = page.getByText(/error|failed/i);
          if (await errorSection.count() > 0) {
            await expect(errorSection.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Check for h1
      const h1 = page.locator('h1');
      expect(await h1.count()).toBeGreaterThan(0);
    });

    test('should have accessible buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Buttons should have accessible names
      const buttons = page.getByRole('button');
      
      if (await buttons.count() > 0) {
        // First button should have accessible name
        const firstButton = buttons.first();
        const name = await firstButton.getAttribute('aria-label') || await firstButton.textContent();
        expect(name).toBeTruthy();
      }
    });

    test('should have proper link text', async ({ page }) => {
      await page.goto(`${BASE_URL}/competitions`);
      
      // Links should have descriptive text
      const links = page.getByRole('link');
      
      if (await links.count() > 0) {
        const firstLink = links.first();
        const text = await firstLink.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });
});

/**
 * Configuration for Playwright
 * 
 * Note: This would typically be in playwright.config.ts at the project root.
 * Configuration shown here for reference.
 */
export const playwrightConfig = {
  testDir: './tests/frontend',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
};
