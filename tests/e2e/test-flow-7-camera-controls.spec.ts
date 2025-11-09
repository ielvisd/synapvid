/**
 * Test Flow 7: Camera Controls & Timeline
 * 
 * Tests camera controls, timeline scrubbing, playback, and scene navigation
 */

import { test, expect } from '@playwright/test';
import { generateVideoSpec, navigateToPreview } from './helpers/test-helpers';

test.describe('Test Flow 7: Camera Controls & Timeline', () => {
  // Use serial execution to avoid API rate limiting
  test.describe.configure({ mode: 'serial' });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Generate a spec first (with longer timeout for API)
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    await navigateToPreview(page);
  });

  test('should display timeline controls', async ({ page }) => {
    // Verify timeline slider is visible
    const timelineSlider = page.locator('input[type="range"]');
    await expect(timelineSlider).toBeVisible();
    
    // Verify time display
    await expect(page.locator('text=/\\d+:\\d+ \\/ \\d+:\\d+/')).toBeVisible();
    
    // Verify scene markers
    await expect(page.locator('text=intro')).toBeVisible();
    await expect(page.locator('text=skill1')).toBeVisible();
  });

  test('should scrub timeline', async ({ page }) => {
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

  test('should navigate via scene markers', async ({ page }) => {
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

  test('should play and pause preview', async ({ page }) => {
    // Click play button
    await page.locator('button:has-text("Play")').click();
    
    // Wait a bit for playback to start
    await page.waitForTimeout(2000);
    
    // Verify timeline has advanced
    const timelineSlider = page.locator('input[type="range"]').first();
    const valueAfterPlay = await timelineSlider.inputValue();
    expect(parseFloat(valueAfterPlay)).toBeGreaterThan(0);
    
    // Click play again (should pause)
    await page.locator('button:has-text("Play")').click();
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Verify timeline stopped advancing (or advanced minimally)
    const valueAfterPause = await timelineSlider.inputValue();
    const diff = Math.abs(parseFloat(valueAfterPause) - parseFloat(valueAfterPlay));
    expect(diff).toBeLessThan(2); // Should be minimal change
  });

  test('should navigate scenes with next/previous buttons', async ({ page }) => {
    // Verify we're on first scene
    await expect(page.locator('text=Scene 1 of 4')).toBeVisible();
    
    // Click next scene
    await page.locator('button:has-text("Next Scene")').click();
    await page.waitForTimeout(1000);
    
    // Verify scene changed
    await expect(page.locator('text=Scene 2 of 4')).toBeVisible();
    
    // Click previous scene
    await page.locator('button:has-text("Previous Scene")').click();
    await page.waitForTimeout(1000);
    
    // Verify back to first scene
    await expect(page.locator('text=Scene 1 of 4')).toBeVisible();
  });

  test('should disable previous button on first scene', async ({ page }) => {
    // Verify previous button is disabled on first scene
    const prevButton = page.locator('button:has-text("Previous Scene")');
    await expect(prevButton).toBeDisabled();
  });

  test('should update scene info panel when navigating', async ({ page }) => {
    // Verify initial scene info
    await expect(page.locator('text=Current Scene: intro')).toBeVisible();
    
    // Navigate to next scene
    await page.locator('button:has-text("Next Scene")').click();
    await page.waitForTimeout(1000);
    
    // Verify scene info updated
    await expect(page.locator('text=Current Scene: skill1')).toBeVisible();
  });
});

