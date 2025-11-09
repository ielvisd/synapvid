/**
 * Test Flow 3: State Persistence
 * 
 * Tests that video spec and audio segments persist across navigation and browser refresh
 */

import { test, expect } from '@playwright/test';
import { generateVideoSpec, generateNarration } from './helpers/test-helpers';

test.describe('Test Flow 3: State Persistence', () => {
  test('should persist spec across page navigation', async ({ page }) => {
    // Generate spec on home page
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Verify spec is displayed
    await expect(page.locator('text=Generated Video Specification')).toBeVisible();
    
    // Navigate to editor
    await page.click('a:has-text("Editor")');
    await page.waitForURL(/.*editor/);
    
    // Verify spec persists (editor should show the spec)
    await expect(page.locator('text=Specification Editor')).toBeVisible();
    
    // Navigate to preview
    await page.click('a:has-text("Preview")');
    await page.waitForURL(/.*preview/);
    
    // Verify preview page loads with spec
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();
    await expect(page.locator('text=Current Scene')).toBeVisible();
    
    // Navigate back to home
    await page.click('a:has-text("Home")');
    await page.waitForURL(/^.*\/$/);
    
    // Verify spec still present
    await expect(page.locator('text=Generated Video Specification')).toBeVisible();
  });

  test('should persist audio segments across navigation', async ({ page }) => {
    // Generate spec and narration
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    await generateNarration(page);
    
    // Verify audio segments are displayed
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible();
    
    // Navigate to editor
    await page.click('a:has-text("Editor")');
    await page.waitForURL(/.*editor/);
    
    // Navigate back to home
    await page.click('a:has-text("Home")');
    await page.waitForURL(/^.*\/$/);
    
    // Verify audio segments still present
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible();
    await expect(page.locator('button:has-text("Download All MP3s")')).toBeVisible();
  });

  test('should persist spec after browser refresh', async ({ page }) => {
    // Generate spec
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Get spec text
    const specDisplay = page.locator('pre');
    const specTextBefore = await specDisplay.textContent();
    expect(specTextBefore).toBeTruthy();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify spec loads from localStorage
    await expect(page.locator('text=Generated Video Specification')).toBeVisible({ timeout: 5000 });
    
    // Verify spec text matches
    const specTextAfter = await specDisplay.textContent();
    expect(specTextAfter).toBe(specTextBefore);
  });

  test('should persist audio segments after browser refresh', async ({ page }) => {
    // Generate spec and narration
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    await generateNarration(page);
    
    // Verify audio segments count
    const segmentsBefore = await page.locator('[class*="segment"], [class*="audio"]').count();
    expect(segmentsBefore).toBeGreaterThan(0);
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify audio segments load from localStorage
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible({ timeout: 5000 });
    
    // Verify segments count matches
    const segmentsAfter = await page.locator('[class*="segment"], [class*="audio"]').count();
    expect(segmentsAfter).toBe(segmentsBefore);
  });

  test('should persist state in localStorage', async ({ page, context }) => {
    // Generate spec
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Check localStorage
    const localStorage = await page.evaluate(() => {
      return {
        videoSpec: localStorage.getItem('synapvid_videoSpec'),
        audioSegments: localStorage.getItem('synapvid_audioSegments')
      };
    });
    
    // Verify localStorage has data
    expect(localStorage.videoSpec).toBeTruthy();
    
    // Parse and verify structure
    const spec = JSON.parse(localStorage.videoSpec!);
    expect(spec).toHaveProperty('duration_target');
    expect(spec).toHaveProperty('scenes');
  });
});

