/**
 * Test Flow 1: Basic Video Generation (With API Mocking)
 * 
 * Example of using API mocks for faster, more reliable tests
 */

import { test, expect } from '@playwright/test';
import { setupApiMocks, injectMockSpec, removeApiMocks } from './mocks/api-mocks';
import { waitForSpecGeneration, validateSpecStructure, navigateToPreview } from './helpers/test-helpers';

test.describe('Test Flow 1: Basic Video Generation (Mocked)', () => {
  test('should generate video spec from prompt (mocked)', async ({ page }) => {
    // Setup API mocks
    await setupApiMocks(page, { mockSpecGeneration: true });
    
    await page.goto('http://localhost:3000');
    
    // Enter prompt
    const textarea = page.locator('textarea[placeholder*="Explain"]');
    await textarea.fill("Explain Newton's First Law with a hockey puck sliding on ice");
    
    // Click generate button
    await page.click('button:has-text("Generate Video Spec")');
    
    // Wait for spec (should be instant with mock)
    const specText = await waitForSpecGeneration(page, 5000); // Much shorter timeout with mock
    
    // Validate spec structure
    validateSpecStructure(specText);
    
    // Cleanup
    await removeApiMocks(page);
  });

  test('should use injected mock spec (fastest)', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Inject mock spec directly (bypasses API entirely)
    await injectMockSpec(page);
    
    // Verify spec is displayed
    await expect(page.locator('text=Generated Video Specification')).toBeVisible({ timeout: 2000 });
    
    const specDisplay = page.locator('pre');
    await expect(specDisplay).toBeVisible();
    
    // Verify summary cards
    await expect(page.locator('text=Duration Target')).toBeVisible();
    await expect(page.locator('text=Scenes')).toBeVisible();
  });

  test('should navigate to preview with mock spec', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Inject mock spec
    await injectMockSpec(page);
    
    // Navigate to preview
    await navigateToPreview(page);
    
    // Verify preview page loaded
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();
    
    // Verify 3D canvas container exists
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible({ timeout: 10000 });
  });
});

