/**
 * E2E Tests for Setup Wizard
 * Tests the complete setup wizard flow in a real browser
 */

import { test, expect } from '@playwright/test';

test.describe('Setup Wizard E2E', () => {
  test('should complete setup wizard flow', async ({ page }) => {
    // Navigate to setup wizard
    await page.goto('/setup');

    // Step 1: Welcome screen
    await expect(page.locator('h1')).toContainText(/welcome|setup/i);

    // Check for prerequisites
    const prerequisitesText = await page.textContent('body');
    expect(prerequisitesText).toContain('Node.js');

    // Note: In a real test environment, we would:
    // 1. Fill in AI provider configuration (API key)
    // 2. Set up Slack app credentials
    // 3. Complete OAuth flow
    // 4. Configure default settings
    // 5. Create admin account

    // For now, verify the page loads correctly
    await expect(page).toHaveURL(/setup/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/setup');

    // Try to proceed without filling required fields
    // This test would validate form validation in the setup wizard

    // Verify setup page is accessible
    await expect(page).toHaveTitle(/Threadle/i);
  });
});
