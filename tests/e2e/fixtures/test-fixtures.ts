/**
 * Test Fixtures for SynapVid E2E Tests
 * 
 * Provides reusable test data and utilities to avoid redundant API calls
 */

import { test as base } from '@playwright/test';
import { expect } from '@playwright/test';
import { generateVideoSpec, generateNarration, navigateToPreview } from '../helpers/test-helpers';

// Extended test type with custom fixtures
type TestFixtures = {
  generatedSpec: string;
  hasNarration: boolean;
  previewPageReady: boolean;
};

// Export extended test with fixtures
export const test = base.extend<TestFixtures>({
  // Fixture: Pre-generated video spec (reused across tests)
  generatedSpec: async ({ page }, use) => {
    // Generate spec once and reuse
    const prompt = "Explain Newton's First Law with a hockey puck sliding on ice";
    const specText = await generateVideoSpec(page, prompt);
    
    // Use the spec in tests
    await use(specText);
    
    // Cleanup: spec persists in localStorage, no cleanup needed
  },

  // Fixture: Pre-generated narration (optional, only if needed)
  hasNarration: async ({ page, generatedSpec }, use) => {
    // Only generate narration if test needs it
    let narrationGenerated = false;
    
    // Check if narration already exists
    const hasExistingNarration = await page.evaluate(() => {
      const audioSegments = localStorage.getItem('synapvid_audioSegments');
      return audioSegments !== null && audioSegments !== '{}';
    });
    
    if (!hasExistingNarration) {
      try {
        await generateNarration(page);
        narrationGenerated = true;
      } catch (error) {
        console.warn('Failed to generate narration in fixture:', error);
        narrationGenerated = false;
      }
    } else {
      narrationGenerated = true;
    }
    
    await use(narrationGenerated);
  },

  // Fixture: Preview page ready state
  previewPageReady: async ({ page, generatedSpec }, use) => {
    // Navigate to preview and wait for it to be ready
    await navigateToPreview(page);
    
    // Wait for 3D canvas to be ready
    await page.waitForSelector('.scene-viewer-container, canvas', { timeout: 10000 });
    
    await use(true);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';

