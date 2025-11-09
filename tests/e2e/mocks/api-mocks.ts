/**
 * API Mocking Utilities for Faster Tests
 * 
 * Provides mock responses for OpenAI API calls to speed up tests
 * that don't need real API responses
 */

import { Page, Route } from '@playwright/test';

// Mock video spec response
export const mockVideoSpec = {
  duration_target: 120,
  scenes: [
    {
      type: 'intro',
      start: 0,
      end: 15,
      narration: [
        "Have you ever wondered why a hockey puck slides so smoothly on ice?",
        "Today, we'll explore Newton's First Law of Motion."
      ],
      events: [
        { t: 0, action: 'reveal_text', text: "Newton's First Law", color: '#ffff00' },
        { t: 5, action: 'animate_puck_3d', params: { start_position: [0, 0, 0], end_position: [5, 0, 0] } }
      ]
    },
    {
      type: 'skill1',
      start: 15,
      end: 60,
      narration: [
        "Newton's First Law states that an object at rest stays at rest, and an object in motion stays in motion unless acted upon by a net force.",
        "Let's imagine a hockey puck on a perfectly smooth ice rink."
      ],
      events: [
        { t: 15, action: 'animate_puck_3d', params: { start_position: [0, 0, 0], end_position: [10, 0, 0] } },
        { t: 30, action: 'reveal_text', text: "An object in motion...", color: '#ffffff' },
        { t: 35, action: 'reveal_text', text: "...will continue moving!", color: '#ffffff' }
      ]
    },
    {
      type: 'skill2',
      start: 60,
      end: 105,
      narration: [
        "Now, if we apply a force, like a stick hitting the puck, the puck will change its motion.",
        "This is how forces can alter the state of motion."
      ],
      events: [
        { t: 60, action: 'animate_puck_3d', params: { start_position: [10, 0, 0], end_position: [15, 2, 0] } },
        { t: 75, action: 'reveal_text', text: "Forces change motion!", color: '#ff0000' }
      ]
    },
    {
      type: 'summary',
      start: 105,
      end: 120,
      narration: [
        "In summary, a hockey puck will slide indefinitely on ice unless a force stops it or changes its direction.",
        "That's Newton's First Law in action!"
      ],
      events: [
        { t: 105, action: 'reveal_text', text: "Newton's First Law Explained", color: '#ffff00' }
      ]
    }
  ],
  style: {
    voice: 'alloy',
    colors: {
      primary: '#F59E0B',
      accent: '#3B82F6'
    },
    transitions: 0.3
  }
};

/**
 * Setup API mocks for faster testing
 */
export async function setupApiMocks(page: Page, options: {
  mockSpecGeneration?: boolean;
  mockNarration?: boolean;
} = {}) {
  const { mockSpecGeneration = false, mockNarration = false } = options;

  if (mockSpecGeneration) {
    // Mock the expand API endpoint
    await page.route('**/api/openai/expand', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoSpec)
      });
    });
  }

  if (mockNarration) {
    // Mock the TTS API endpoint
    await page.route('**/api/openai/tts', async (route: Route) => {
      // Return a mock audio file URL
      const mockAudioResponse = {
        url: '/audio/mock-narration.mp3',
        duration: 4.25,
        segmentId: 'scene0_chunk0'
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAudioResponse)
      });
    });
  }
}

/**
 * Remove API mocks (restore real API calls)
 */
export async function removeApiMocks(page: Page) {
  await page.unroute('**/api/openai/expand');
  await page.unroute('**/api/openai/tts');
}

/**
 * Helper to inject mock spec directly into localStorage
 * (faster than API call, bypasses network entirely)
 * Uses the correct format: synapvid-project with videoSpec property
 */
export async function injectMockSpec(page: Page) {
  await page.evaluate((spec) => {
    // Use the correct localStorage format that useProjectState expects
    const projectData = {
      videoSpec: spec,
      audioSegments: null,
      projectName: 'Test Project',
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('synapvid-project', JSON.stringify(projectData));
  }, mockVideoSpec);
  
  // Reload page to pick up the spec (useProjectState auto-loads on init)
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Wait for Vue to react to the state change
  await page.waitForTimeout(2000);
  
  // Verify spec appears
  try {
    await page.waitForSelector('text=Generated Video Specification', { timeout: 5000 });
  } catch (e) {
    // If it doesn't appear, the page might need a navigation trigger
    // Try going to editor and back to force state refresh
    await page.goto('http://localhost:3000/editor');
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Try one more time
    await page.waitForSelector('text=Generated Video Specification', { timeout: 5000 });
  }
}

