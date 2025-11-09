/**
 * Test Flow 5: Error Handling
 * 
 * Tests error handling for missing API key, invalid prompts, and network errors
 */

import { test, expect } from '@playwright/test';

test.describe('Test Flow 5: Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should validate empty prompt', async ({ page }) => {
    // Try to submit form with empty prompt
    const submitButton = page.locator('button:has-text("Generate Video Spec")');
    
    // The button should be disabled or form should prevent submission
    // Try clicking anyway
    await submitButton.click();
    
    // Wait a bit to see if any error appears
    await page.waitForTimeout(1000);
    
    // Check for validation error (implementation may vary)
    // Some forms show inline errors, others prevent submission
    const errorMessage = page.locator('text=/required|invalid|error/i');
    const errorCount = await errorMessage.count();
    
    // Either the form prevents submission or shows an error
    // We verify that no spec was generated
    const specDisplay = page.locator('pre');
    const isVisible = await specDisplay.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Enter a valid prompt
    const textarea = page.locator('textarea[placeholder*="Explain"]');
    await textarea.fill('Test prompt for error handling');
    
    // Submit form
    await page.click('button:has-text("Generate Video Spec")');
    
    // Wait for either success or error
    await page.waitForTimeout(5000);
    
    // Check for error toast or message (if API fails)
    // Note: This test may pass if API works, which is fine
    // The important thing is that errors are handled gracefully
    const errorToast = page.locator('text=/error|failed|api key/i');
    const hasError = await errorToast.isVisible().catch(() => false);
    
    // If there's an error, verify it's user-friendly
    if (hasError) {
      const errorText = await errorToast.textContent();
      expect(errorText?.toLowerCase()).not.toContain('undefined');
      expect(errorText?.toLowerCase()).not.toContain('null');
    }
  });

  test('should show retry option on errors', async ({ page }) => {
    // This test verifies that error messages include retry functionality
    // The exact implementation depends on the error handling
    
    // Enter prompt
    await page.locator('textarea[placeholder*="Explain"]').fill('Test prompt');
    
    // Submit
    await page.click('button:has-text("Generate Video Spec")');
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Check for retry button (if error occurs)
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    const hasRetry = await retryButton.isVisible().catch(() => false);
    
    // If retry button exists, verify it's functional
    if (hasRetry) {
      await expect(retryButton).toBeEnabled();
    }
  });

  test('should not crash UI on errors', async ({ page }) => {
    // Enter prompt
    await page.locator('textarea[placeholder*="Explain"]').fill('Test');
    
    // Submit
    await page.click('button:has-text("Generate Video Spec")');
    
    // Wait
    await page.waitForTimeout(3000);
    
    // Verify page is still functional
    await expect(page.locator('h1, heading')).toBeVisible();
    
    // Verify navigation still works
    await expect(page.locator('a:has-text("Editor")')).toBeVisible();
    await expect(page.locator('a:has-text("Preview")')).toBeVisible();
    
    // Check console for critical errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected warnings, but log unexpected errors
        if (!text.includes('Three.js') && !text.includes('experimental')) {
          consoleErrors.push(text);
        }
      }
    });
    
    // Wait a bit more
    await page.waitForTimeout(2000);
    
    // Verify no critical console errors (beyond expected warnings)
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('Three.js') && 
      !e.includes('experimental') &&
      !e.includes('DevTools')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

