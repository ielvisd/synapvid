/**
 * Test Flow 1: Basic Video Generation
 * 
 * Tests the complete basic flow:
 * - Generate video spec from prompt
 * - Generate narration audio
 * - Navigate to preview page
 * - Verify 3D canvas renders
 */

import { test, expect } from '@playwright/test';
import { 
  generateVideoSpec, 
  waitForSpecGeneration, 
  validateSpecStructure,
  generateNarration,
  waitForAudioSegments,
  navigateToPreview,
  takeScreenshot
} from './helpers/test-helpers';

test.describe('Test Flow 1: Basic Video Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should generate video spec from prompt', async ({ page }) => {
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    
    // Generate spec
    const specText = await generateVideoSpec(page, prompt);
    
    // Validate spec structure
    validateSpecStructure(specText);
    
    // Verify spec is displayed
    const specDisplay = page.locator('pre');
    await expect(specDisplay).toBeVisible();
    
    // Verify summary cards
    await expect(page.locator('text=Duration Target')).toBeVisible();
    await expect(page.locator('text=Scenes')).toBeVisible();
    await expect(page.locator('text=Voice')).toBeVisible();
    
    // Verify toast notification (if present)
    // Note: Toast may disappear quickly, so we don't assert it
  });

  test('should generate narration audio', async ({ page }) => {
    // First generate a spec
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Generate narration
    await generateNarration(page);
    
    // Verify AudioPreview component appears
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible();
    
    // Verify "Download All MP3s" button appears
    await expect(page.locator('button:has-text("Download All MP3s")')).toBeVisible();
    
    // Verify audio segments are displayed
    const segments = page.locator('[class*="segment"], [class*="audio"]');
    const count = await segments.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify play buttons are visible
    const playButtons = page.locator('button[aria-label*="play" i], button:has-text("Play")');
    await expect(playButtons.first()).toBeVisible();
  });

  test('should navigate to preview page and render 3D canvas', async ({ page }) => {
    // Generate spec first
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    await generateVideoSpec(page, prompt);
    
    // Navigate to preview
    await navigateToPreview(page);
    
    // Verify preview page loaded
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();
    
    // Verify 3D canvas container exists
    const canvasContainer = page.locator('.scene-viewer-container, canvas, [class*="canvas"]');
    await expect(canvasContainer.first()).toBeVisible();
    
    // Verify timeline controls
    await expect(page.locator('input[type="range"]')).toBeVisible();
    
    // Verify scene info panel
    await expect(page.locator('text=Current Scene')).toBeVisible();
    
    // Verify scene navigation buttons
    await expect(page.locator('button:has-text("Next Scene")')).toBeVisible();
    await expect(page.locator('button:has-text("Previous Scene")')).toBeVisible();
  });

  test('should complete full basic flow', async ({ page }) => {
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    
    // Step 1: Generate spec
    const specText = await generateVideoSpec(page, prompt);
    validateSpecStructure(specText);
    
    // Step 2: Generate narration
    await generateNarration(page);
    await expect(page.locator('text=Audio Narration Preview')).toBeVisible();
    
    // Step 3: Navigate to preview
    await navigateToPreview(page);
    await expect(page.locator('text=3D Scene Preview')).toBeVisible();
    
    // Verify 3D canvas renders
    const canvasContainer = page.locator('.scene-viewer-container, canvas');
    await expect(canvasContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should validate spec JSON structure', async ({ page }) => {
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    const specText = await generateVideoSpec(page, prompt);
    
    // Parse and validate
    const spec = JSON.parse(specText);
    
    // Validate required fields
    expect(spec).toHaveProperty('duration_target');
    expect(typeof spec.duration_target).toBe('number');
    expect(spec.duration_target).toBeGreaterThanOrEqual(80);
    expect(spec.duration_target).toBeLessThanOrEqual(180);
    
    expect(spec).toHaveProperty('scenes');
    expect(Array.isArray(spec.scenes)).toBe(true);
    expect(spec.scenes.length).toBeGreaterThanOrEqual(2);
    
    expect(spec).toHaveProperty('style');
    expect(typeof spec.style).toBe('object');
    expect(spec.style).toHaveProperty('voice');
    expect(spec.style).toHaveProperty('colors');
    
    // Validate scene structure
    for (const scene of spec.scenes) {
      expect(scene).toHaveProperty('type');
      expect(scene).toHaveProperty('start');
      expect(scene).toHaveProperty('end');
      expect(scene).toHaveProperty('narration');
      expect(scene).toHaveProperty('events');
      expect(Array.isArray(scene.narration)).toBe(true);
      expect(Array.isArray(scene.events)).toBe(true);
    }
  });
});

