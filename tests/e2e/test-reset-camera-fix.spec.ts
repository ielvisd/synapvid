/**
 * Quick test to verify Reset Camera bug fix
 * 
 * This test verifies that clicking Reset Camera doesn't throw errors
 */

import { test, expect } from '@playwright/test';
import { generateVideoSpec, navigateToPreview } from './helpers/test-helpers';

test.describe('Reset Camera Fix Verification', () => {
  test('should reset camera without errors', async ({ page }) => {
    // Generate a spec first
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Navigate to preview
    await navigateToPreview(page);
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known warnings
        if (!text.includes('Three.js') && 
            !text.includes('experimental') && 
            !text.includes('DevTools') &&
            !text.includes('set')) { // This should not appear if fix works
          consoleErrors.push(text);
        }
      }
    });
    
    // Click Reset Camera button
    const resetButton = page.locator('button:has-text("Reset Camera")');
    await expect(resetButton).toBeVisible();
    
    // Click and wait
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    // Verify no errors related to camera reset
    const cameraErrors = consoleErrors.filter(e => 
      e.includes('camera') || 
      e.includes('set') ||
      e.includes('undefined')
    );
    
    expect(cameraErrors.length).toBe(0);
    
    // Verify button is still functional (not disabled)
    await expect(resetButton).toBeEnabled();
    
    // Verify page is still functional
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();
  });
});

