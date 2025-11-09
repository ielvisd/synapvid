import { Page, expect } from '@playwright/test';

/**
 * Wait for video spec generation to complete
 * Increased timeout for API calls (60 seconds default)
 */
export async function waitForSpecGeneration(page: Page, timeout = 60000): Promise<string> {
  try {
    // Wait for loading state to appear first
    await page.waitForSelector('button:has-text("Generate Video Spec")[disabled]', { timeout: 5000 }).catch(() => {
      // Loading state might not appear, continue anyway
    });
    
    // Wait for the spec JSON to appear (with longer timeout for API)
    await page.waitForSelector('pre', { timeout });
    
    // Wait for "Generated Video Specification" heading
    await page.waitForSelector('text=Generated Video Specification', { timeout: 10000 });
    
    const specDisplay = page.locator('pre');
    await expect(specDisplay).toBeVisible({ timeout: 5000 });
    
    const specText = await specDisplay.textContent();
    if (!specText) {
      throw new Error('Spec text is empty');
    }
    
    // Verify it's valid JSON
    try {
      JSON.parse(specText);
    } catch (e) {
      throw new Error(`Spec text is not valid JSON: ${e}`);
    }
    
    return specText;
  } catch (error) {
    // Check for error messages
    const errorToast = page.locator('text=/error|failed|api/i');
    const hasError = await errorToast.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorToast.textContent();
      throw new Error(`Spec generation failed: ${errorText}`);
    }
    throw error;
  }
}

/**
 * Validate spec JSON structure
 */
export function validateSpecStructure(specText: string): void {
  let spec: any;
  try {
    spec = JSON.parse(specText);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e}`);
  }
  
  // Validate required fields
  if (typeof spec.duration_target !== 'number') {
    throw new Error('Missing or invalid duration_target');
  }
  
  if (!Array.isArray(spec.scenes) || spec.scenes.length < 2) {
    throw new Error('Missing or invalid scenes array (must have at least 2 scenes)');
  }
  
  if (!spec.style || typeof spec.style !== 'object') {
    throw new Error('Missing or invalid style object');
  }
  
  // Validate scene structure
  for (const scene of spec.scenes) {
    if (!scene.type || !scene.start || !scene.end || !Array.isArray(scene.narration) || !Array.isArray(scene.events)) {
      throw new Error(`Invalid scene structure: ${JSON.stringify(scene)}`);
    }
  }
}

/**
 * Wait for audio segments to appear
 * Increased timeout for TTS API calls (90 seconds default)
 */
export async function waitForAudioSegments(page: Page, timeout = 90000): Promise<void> {
  try {
    // Wait for loading state
    await page.waitForSelector('button:has-text("Generate Narration")[disabled], button:has-text("Regenerate Narration")[disabled]', { timeout: 5000 }).catch(() => {
      // Loading state might not appear, continue anyway
    });
    
    // Wait for AudioPreview component to appear
    await page.waitForSelector('text=Download All MP3s', { timeout });
    
    // Verify play buttons are visible
    const playButtons = page.locator('button[aria-label*="play" i], button:has-text("Play")');
    await expect(playButtons.first()).toBeVisible({ timeout: 10000 });
  } catch (error) {
    // Check for error messages
    const errorToast = page.locator('text=/error|failed|api/i');
    const hasError = await errorToast.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorToast.textContent();
      throw new Error(`Audio generation failed: ${errorText}`);
    }
    throw error;
  }
}

/**
 * Navigate to preview page and wait for 3D canvas
 */
export async function navigateToPreview(page: Page): Promise<void> {
  await page.click('a:has-text("Preview"), button:has-text("Preview 3D Scenes")');
  await page.waitForURL(/.*preview/, { timeout: 10000 });
  
  // Wait for 3D canvas container
  await page.waitForSelector('.scene-viewer-container, canvas, [class*="canvas"]', { timeout: 10000 });
}

/**
 * Scrub timeline to specific time
 */
export async function scrubTimeline(page: Page, time: number): Promise<void> {
  const timelineSlider = page.locator('input[type="range"]').first();
  await expect(timelineSlider).toBeVisible();
  
  // Get max value from slider
  const max = await timelineSlider.getAttribute('max');
  const maxValue = max ? parseFloat(max) : 120;
  
  // Calculate position (0-1)
  const position = time / maxValue;
  
  // Set value
  await timelineSlider.fill(time.toString());
  
  // Wait a bit for the scene to update
  await page.waitForTimeout(500);
}

/**
 * Take screenshot and save to tests/screenshots/
 */
export async function takeScreenshot(page: Page, filename: string): Promise<void> {
  await page.screenshot({ 
    path: `tests/screenshots/${filename}`,
    fullPage: false
  });
}

/**
 * Generate a video spec from a prompt
 * With retry logic for flaky API calls
 */
export async function generateVideoSpec(page: Page, prompt: string, retries = 2): Promise<string> {
  // Navigate to home if not already there
  if (!page.url().endsWith('/') && !page.url().includes('localhost:3000')) {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Check if page is still open
      if (page.isClosed()) {
        throw new Error('Page was closed');
      }
      
      // Enter prompt
      const textarea = page.locator('textarea[placeholder*="Explain"]');
      await textarea.waitFor({ state: 'visible', timeout: 5000 });
      await textarea.clear();
      await textarea.fill(prompt);
      
      // Click generate button
      const generateButton = page.locator('button:has-text("Generate Video Spec")');
      await generateButton.waitFor({ state: 'visible', timeout: 5000 });
      await generateButton.click();
      
      // Wait for spec generation (with longer timeout)
      const specText = await waitForSpecGeneration(page, 60000);
      
      return specText;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Check if page is still open before retrying
      if (page.isClosed()) {
        throw new Error('Page was closed during retry');
      }
      
      // Wait before retry (with page check)
      try {
        await page.waitForTimeout(2000);
      } catch (e) {
        // Page might be closed, skip retry
        throw error;
      }
      
      // Reload page for fresh state (if still open)
      if (!page.isClosed()) {
        try {
          await page.reload();
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
          // If reload fails, throw original error
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to generate spec after retries');
}

/**
 * Generate narration audio
 */
export async function generateNarration(page: Page): Promise<void> {
  // Click generate narration button
  await page.click('button:has-text("Generate Narration"), button:has-text("Regenerate Narration")');
  
  // Wait for audio segments
  await waitForAudioSegments(page);
}

