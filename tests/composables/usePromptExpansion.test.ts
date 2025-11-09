import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePromptExpansion } from '~/composables/usePromptExpansion';
import type { PromptInput } from '~/schemas/videoSpec';

// Mock Nuxt composables
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    public: {}
  }),
  $fetch: vi.fn()
}));

// Mock the $fetch function
const mockFetch = vi.fn();

describe('usePromptExpansion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global $fetch mock
    global.$fetch = mockFetch;
  });

  it('should initialize with correct default state', () => {
    const { isLoading, error, generatedSpec } = usePromptExpansion();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(generatedSpec.value).toBeNull();
  });

  it('should set loading state during expansion', async () => {
    const validSpec = {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 15,
          narration: ['Welcome'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue(validSpec);

    const { expandPrompt, isLoading } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Explain Newton\'s First Law'
    };

    const promise = expandPrompt(input);
    
    // Check loading state is true during expansion
    expect(isLoading.value).toBe(true);
    
    await promise;
    
    // Check loading state is false after completion
    expect(isLoading.value).toBe(false);
  });

  it('should successfully expand a prompt', async () => {
    const validSpec = {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 15,
          narration: ['Welcome to physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue(validSpec);

    const { expandPrompt, generatedSpec, error } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Explain Newton\'s First Law'
    };

    const result = await expandPrompt(input);

    expect(result).toBeDefined();
    expect(result?.duration_target).toBe(120);
    expect(result?.scenes).toHaveLength(1);
    expect(generatedSpec.value).toEqual(result);
    expect(error.value).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/api/openai/expand', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        prompt: 'Explain Newton\'s First Law',
        seed: 42
      })
    }));
  });

  it('should include learning objectives in prompt', async () => {
    const validSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    mockFetch.mockResolvedValue(validSpec);

    const { expandPrompt } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Explain inertia',
      learningObjectives: ['Understand Newton\'s First Law', 'Relate to real-world examples']
    };

    await expandPrompt(input);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/openai/expand',
      expect.objectContaining({
        body: expect.objectContaining({
          prompt: expect.stringContaining('Learning Objectives')
        })
      })
    );
  });

  it('should include examples in prompt', async () => {
    const validSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    mockFetch.mockResolvedValue(validSpec);

    const { expandPrompt } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Explain inertia',
      examples: ['Hockey puck on ice', 'Rocket in space']
    };

    await expandPrompt(input);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/openai/expand',
      expect.objectContaining({
        body: expect.objectContaining({
          prompt: expect.stringContaining('Real-World Examples')
        })
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    // Mock to reject immediately (no retries)
    mockFetch.mockRejectedValue(new Error('API Error'));

    const { expandPrompt, error } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Test prompt'
    };

    const result = await expandPrompt(input);

    expect(result).toBeNull();
    // Error message will be the retry message after 3 attempts
    expect(error.value).toBeTruthy();
    expect(error.value).toContain('Unable to connect to OpenAI');
  }, 10000); // Increase timeout

  it('should handle missing API key error', async () => {
    // Mock to reject immediately (no retries)
    mockFetch.mockRejectedValue(new Error('OpenAI API key not configured'));

    const { expandPrompt, error } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Test prompt'
    };

    await expandPrompt(input);

    expect(error.value).toContain('API key');
  }, 10000); // Increase timeout

  it('should retry on failure', async () => {
    const validSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    // Fail twice, then succeed
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(validSpec);

    const { expandPrompt } = usePromptExpansion();
    const input: PromptInput = {
      prompt: 'Test prompt'
    };

    const result = await expandPrompt(input);

    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15000); // Increase timeout for retries with backoff

  it('should reset state correctly', async () => {
    const { reset, isLoading, error, generatedSpec, expandPrompt } = usePromptExpansion();
    
    // Set some state by calling expandPrompt
    const validSpec = {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 15,
          narration: ['Welcome'],
          events: []
        }
      ],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    mockFetch.mockResolvedValue(validSpec);
    const input: PromptInput = {
      prompt: 'Test prompt'
    };

    const result = await expandPrompt(input);
    expect(result).not.toBeNull();
    expect(generatedSpec.value).not.toBeNull();

    reset();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(generatedSpec.value).toBeNull();
  });
});

