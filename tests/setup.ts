import { vi } from 'vitest';

// Mock Nuxt auto-imports
global.$fetch = vi.fn();
global.useRuntimeConfig = vi.fn(() => ({
  openaiApiKey: 'test-key',
  public: {}
}));

global.useToast = vi.fn(() => ({
  add: vi.fn()
}));

global.navigateTo = vi.fn();

