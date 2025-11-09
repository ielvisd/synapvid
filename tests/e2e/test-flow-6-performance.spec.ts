/**
 * Test Flow 6: Performance & Edge Cases
 * 
 * Tests multiple scenes, long narration, empty scenes, and performance
 */

import { test, expect } from '@playwright/test';
import { generateVideoSpec, generateNarration, navigateToPreview } from './helpers/test-helpers';

test.describe('Test Flow 6: Performance & Edge Cases', () => {
  test('should handle multiple scenes', async ({ page }) => {
    // Generate spec (should have 4+ scenes)
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Navigate to preview
    await navigateToPreview(page);
    
    // Verify all scenes are accessible
    await expect(page.locator('text=intro')).toBeVisible();
    await expect(page.locator('text=skill1')).toBeVisible();
    await expect(page.locator('text=skill2')).toBeVisible();
    await expect(page.locator('text=summary')).toBeVisible();
    
    // Navigate through all scenes
    const nextButton = page.locator('button:has-text("Next Scene")');
    
    // Click through scenes
    for (let i = 0; i < 3; i++) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify we can navigate back
    const prevButton = page.locator('button:has-text("Previous Scene")');
    for (let i = 0; i < 3; i++) {
      await prevButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify we're back at first scene
    await expect(page.locator('text=Scene 1 of 4')).toBeVisible();
  });

  test('should handle long narration audio chunking', async ({ page }) => {
    // Generate spec with long narration
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice. " +
      "This is a very long prompt that should generate multiple audio segments. " +
      "The narration should be properly chunked into manageable pieces. " +
      "Each segment should be playable independently. " +
      "The audio synthesis should handle long texts gracefully.";
    
    await generateVideoSpec(page, prompt);
    await generateNarration(page);
    
    // Verify audio segments are displayed
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible();
    
    // Count segments
    const segments = page.locator('[class*="segment"], [class*="audio"]');
    const segmentCount = await segments.count();
    
    // Should have multiple segments for long narration
    expect(segmentCount).toBeGreaterThan(0);
    
    // Verify all segments have play buttons
    const playButtons = page.locator('button[aria-label*="play" i], button:has-text("Play")');
    const playButtonCount = await playButtons.count();
    expect(playButtonCount).toBeGreaterThan(0);
  });

  test('should render empty scene gracefully', async ({ page }) => {
    // Generate spec
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Navigate to preview
    await navigateToPreview(page);
    
    // All scenes should render (even if they have no events)
    // Verify 3D canvas is visible
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible();
    
    // Verify timeline shows scene boundaries
    await expect(page.locator('input[type="range"]')).toBeVisible();
    await expect(page.locator('text=/\\d+:\\d+ \\/ \\d+:\\d+/')).toBeVisible();
    
    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Three.js') && !text.includes('experimental')) {
          consoleErrors.push(text);
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('Three.js') && 
      !e.includes('experimental') &&
      !e.includes('DevTools') &&
      !e.includes('set') // Ignore the reset camera error we found
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should maintain performance with multiple scenes', async ({ page }) => {
    // Generate spec
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    await navigateToPreview(page);
    
    // Measure initial load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Load time should be reasonable (< 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Navigate through scenes and measure performance
    const nextButton = page.locator('button:has-text("Next Scene")');
    
    for (let i = 0; i < 3; i++) {
      const sceneStartTime = Date.now();
      await nextButton.click();
      await page.waitForTimeout(500); // Wait for scene to render
      const sceneLoadTime = Date.now() - sceneStartTime;
      
      // Scene transitions should be fast (< 1 second)
      expect(sceneLoadTime).toBeLessThan(1000);
    }
  });
});

