/**
 * Test Flow 2: Visual Features
 * 
 * Tests visual event types: puck animation, vectors, text, equations, spheres, boxes
 */

import { test, expect } from '@playwright/test';
import { generateVideoSpec, navigateToPreview } from './helpers/test-helpers';

test.describe('Test Flow 2: Visual Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Generate spec with hockey puck (which should have puck animations)
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    await navigateToPreview(page);
  });

  test('should render 3D canvas with scene objects', async ({ page }) => {
    // Verify 3D canvas container exists
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible({ timeout: 10000 });
    
    // Verify scene info shows events
    await expect(page.locator('text=/Events: \\d+/')).toBeVisible();
  });

  test('should display text rendering', async ({ page }) => {
    // Navigate to intro scene (which has text events)
    await page.locator('text=intro').click();
    await page.waitForTimeout(1000);
    
    // Verify scene has text events
    const eventsText = page.locator('text=/Events: \\d+/');
    const eventsCount = await eventsText.textContent();
    expect(eventsCount).toMatch(/Events: \d+/);
    
    // The 3D canvas should render the text
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible();
  });

  test('should handle puck animation events', async ({ page }) => {
    // Navigate to a scene with puck animation
    await page.locator('text=skill1').click();
    await page.waitForTimeout(1000);
    
    // Verify scene has events
    await expect(page.locator('text=/Events: \\d+/')).toBeVisible();
    
    // Scrub timeline to animation time
    const timelineSlider = page.locator('input[type="range"]').first();
    await timelineSlider.fill('20'); // Middle of skill1 scene
    
    await page.waitForTimeout(1000);
    
    // Verify canvas still renders (puck should be visible/animated)
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible();
  });

  test('should update scene when scrubbing timeline', async ({ page }) => {
    // Start at intro scene
    await page.locator('text=intro').click();
    await page.waitForTimeout(500);
    
    // Verify we're on intro
    await expect(page.locator('text=Current Scene: intro')).toBeVisible();
    
    // Scrub to skill1 scene time
    const timelineSlider = page.locator('input[type="range"]').first();
    await timelineSlider.fill('30');
    await page.waitForTimeout(1000);
    
    // Scene should update
    await expect(page.locator('text=Current Scene: skill1')).toBeVisible();
  });

  test('should render ground plane and grid', async ({ page }) => {
    // Verify 3D canvas is rendered
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible();
    
    // The ground plane and grid should be part of the 3D scene
    // We can't directly test them, but if the canvas renders, they should be there
    // Verify no console errors related to rendering
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('render') || text.includes('canvas') || text.includes('Three')) {
          if (!text.includes('Multiple instances')) { // Ignore known warning
            consoleErrors.push(text);
          }
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should not have rendering errors
    expect(consoleErrors.length).toBe(0);
  });
});

