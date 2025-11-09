/**
 * Test Flow 7: Camera Controls & Timeline (Using Fixtures)
 * 
 * Example of using test fixtures to avoid redundant API calls
 */

import { test, expect } from '../fixtures/test-fixtures';
import { navigateToPreview } from '../helpers/test-helpers';

test.describe('Test Flow 7: Camera Controls & Timeline (Fixtures)', () => {
  // Use serial execution to avoid API rate limiting
  test.describe.configure({ mode: 'serial' });
  
  test('should display timeline controls', async ({ page, previewPageReady }) => {
    // Fixture ensures preview page is ready
    // Verify timeline slider is visible
    const timelineSlider = page.locator('input[type="range"]');
    await expect(timelineSlider).toBeVisible();
    
    // Verify time display
    await expect(page.locator('text=/\\d+:\\d+ \\/ \\d+:\\d+/')).toBeVisible();
    
    // Verify scene markers
    await expect(page.locator('text=intro')).toBeVisible();
    await expect(page.locator('text=skill1')).toBeVisible();
  });

  test('should scrub timeline', async ({ page, previewPageReady }) => {
    const timelineSlider = page.locator('input[type="range"]').first();
    
    // Get initial value
    const initialValue = await timelineSlider.inputValue();
    
    // Set timeline to a specific time (e.g., 30 seconds)
    await timelineSlider.fill('30');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify value changed
    const newValue = await timelineSlider.inputValue();
    expect(parseFloat(newValue)).toBeGreaterThan(parseFloat(initialValue));
  });

  test('should navigate via scene markers', async ({ page, previewPageReady }) => {
    // Click on skill1 scene marker
    await page.locator('text=skill1').click();
    
    // Wait for scene to change
    await page.waitForTimeout(1000);
    
    // Verify scene changed
    await expect(page.locator('text=Current Scene: skill1')).toBeVisible();
    
    // Verify timeline position updated
    const timelineSlider = page.locator('input[type="range"]').first();
    const value = await timelineSlider.inputValue();
    expect(parseFloat(value)).toBeGreaterThanOrEqual(15); // skill1 starts at 15s
  });
});

