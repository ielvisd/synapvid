import { vi } from 'vitest';
import { ref, readonly, watch } from 'vue';

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

// Mock useProjectState for composables that depend on it
global.useProjectState = vi.fn(() => ({
  audioSegments: { value: null },
  videoSpec: { value: null },
  projectName: { value: 'Untitled Project' },
  lastSaved: { value: null },
  updateVideoSpec: vi.fn(),
  updateAudioSegments: vi.fn(),
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  clearProject: vi.fn(),
  exportProject: vi.fn(),
  importProject: vi.fn()
}));

// Mock Nuxt useState (returns a ref-like object)
// Store is cleared in beforeEach hooks in individual test files
export const useStateStore: Record<string, any> = {};
global.useState = vi.fn((key: string, init?: () => any) => {
  if (!(key in useStateStore)) {
    useStateStore[key] = ref(init ? init() : null);
  }
  return useStateStore[key];
});

// Make Vue composables available globally
global.ref = ref;
global.readonly = readonly;
global.watch = watch;

