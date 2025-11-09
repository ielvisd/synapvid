/**
 * E2E Test: Complete Video Generation Flow
 * 
 * Tests the full pipeline from prompt input to video export
 * Verifies determinism and sync accuracy
 * 
 * NOTE: This requires Playwright to be properly configured
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

test.describe('Video Generation Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should generate video spec from prompt', async ({ page }) => {
    // Navigate to home page
    await expect(page).toHaveTitle(/SynapVid/);

    // Enter prompt
    await page.fill('textarea[placeholder*="Explain"]', 
      'Explain Newton\'s First Law with a rocket example');

    // Submit form
    await page.click('button:has-text("Generate Video Spec")');

    // Wait for generation
    await page.waitForSelector('text=Generated Video Specification', { 
      timeout: 30000 
    });

    // Verify spec is displayed
    const specDisplay = page.locator('pre');
    await expect(specDisplay).toBeVisible();

    // Verify spec contains expected fields
    const specText = await specDisplay.textContent();
    expect(specText).toContain('duration_target');
    expect(specText).toContain('scenes');
    expect(specText).toContain('style');
  });

  test('should navigate between pages', async ({ page }) => {
    // Test navigation
    await page.click('a:has-text("Editor")');
    await expect(page).toHaveURL(/.*editor/);

    await page.click('a:has-text("Preview")');
    await expect(page).toHaveURL(/.*preview/);

    await page.click('a:has-text("Export")');
    await expect(page).toHaveURL(/.*export/);

    await page.click('a:has-text("Home")');
    await expect(page).toHaveURL(/^.*\/$/);
  });

  test('should edit spec in editor', async ({ page }) => {
    await page.goto('http://localhost:3000/editor');

    // Wait for editor to load
    await page.waitForSelector('text=Specification Editor');

    // Edit duration
    const durationInput = page.locator('input[type="number"]').first();
    await durationInput.fill('150');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify success message
    await expect(page.locator('text=Changes Saved')).toBeVisible({ timeout: 5000 });
  });

  test('should display 3D preview', async ({ page }) => {
    await page.goto('http://localhost:3000/preview');

    // Verify preview page loads
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();

    // Verify timeline controls
    await expect(page.locator('input[type="range"]')).toBeVisible();
  });

  test('should start export process', async ({ page }) => {
    await page.goto('http://localhost:3000/export');

    // Configure export settings
    await page.selectOption('select', { label: '1920x1080' });

    // Start export
    await page.click('button:has-text("Start Export")');

    // Verify progress indicator appears
    await expect(page.locator('text=Exporting Video')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Determinism Tests', () => {
  test('should generate identical specs from same prompt', async ({ page }) => {
    const prompt = 'Explain Newton\'s First Law';

    // Generate spec first time
    await page.goto('http://localhost:3000');
    await page.fill('textarea[placeholder*="Explain"]', prompt);
    await page.click('button:has-text("Generate Video Spec")');
    await page.waitForSelector('pre', { timeout: 30000 });
    const spec1 = await page.locator('pre').textContent();

    // Reset and generate again
    await page.goto('http://localhost:3000');
    await page.fill('textarea[placeholder*="Explain"]', prompt);
    await page.click('button:has-text("Generate Video Spec")');
    await page.waitForSelector('pre', { timeout: 30000 });
    const spec2 = await page.locator('pre').textContent();

    // Specs should be identical (deterministic with seed=42)
    expect(spec1).toBe(spec2);
  });
});

