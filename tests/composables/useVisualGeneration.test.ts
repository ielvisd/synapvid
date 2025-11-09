import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVisualGeneration } from '~/composables/useVisualGeneration';
import type { VideoSpec } from '~/schemas/videoSpec';

// Mock $fetch
const mockFetch = vi.fn();

describe('useVisualGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.$fetch = mockFetch;
  });

  it('should initialize with correct default state', () => {
    const { isLoading, error, progress, generatedScenes, previewMode } = useVisualGeneration();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(generatedScenes.value).toEqual({});
    expect(previewMode.value).toBe(false);
  });

  it('should generate visuals for all scenes', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: []
        },
        {
          type: 'skill1',
          start: 5,
          end: 10,
          narration: ['Physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const mockScene1 = { component: 'Scene1Component' };
    const mockScene2 = { component: 'Scene2Component' };

    mockFetch
      .mockResolvedValueOnce(mockScene1)
      .mockResolvedValueOnce(mockScene2);

    const { generateVisuals, generatedScenes, progress } = useVisualGeneration();

    const result = await generateVisuals(spec, false);

    expect(result).toBeDefined();
    expect(Object.keys(result || {}).length).toBe(2);
    expect(generatedScenes.value).toEqual(result);
    expect(progress.value).toBe(100);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should set preview mode correctly', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue({ component: 'TestComponent' });

    const { generateVisuals, previewMode } = useVisualGeneration();

    await generateVisuals(spec, true);

    expect(previewMode.value).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/visuals/generate',
      expect.objectContaining({
        body: expect.objectContaining({
          preview: true
        })
      })
    );
  });

  it('should update progress during generation', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: []
        },
        {
          type: 'skill1',
          start: 5,
          end: 10,
          narration: ['Physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue({ component: 'TestComponent' });

    const { generateVisuals, progress } = useVisualGeneration();

    await generateVisuals(spec, false);

    expect(progress.value).toBe(100);
  });

  it('should handle API errors gracefully', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockRejectedValue(new Error('Generation failed'));

    const { generateVisuals, error } = useVisualGeneration();

    const result = await generateVisuals(spec, false);

    expect(result).toBeNull();
    expect(error.value).toContain('Failed to generate scene');
  });

  it('should check collisions correctly', () => {
    const { checkCollisions } = useVisualGeneration();

    // Objects that don't collide
    const nonColliding = [
      { id: 'obj1', boundingBox: { x: 0, y: 0, width: 1, height: 1 } },
      { id: 'obj2', boundingBox: { x: 5, y: 0, width: 1, height: 1 } }
    ];

    const result1 = checkCollisions(nonColliding);
    expect(result1.collisions).toHaveLength(0);

    // Objects that collide
    const colliding = [
      { id: 'obj1', boundingBox: { x: 0, y: 0, width: 2, height: 2 } },
      { id: 'obj2', boundingBox: { x: 1, y: 0, width: 2, height: 2 } } // Overlaps with first
    ];

    const result2 = checkCollisions(colliding);
    expect(result2.collisions.length).toBeGreaterThan(0);
  });

  it('should reset state correctly', async () => {
    const { reset, isLoading, error, progress, generatedScenes, generateVisuals } = useVisualGeneration();

    // Set some state by calling generateVisuals (which sets internal state)
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue({ component: 'Test' });
    await generateVisuals(spec, false);

    // Verify state is set
    expect(isLoading.value).toBe(false); // Should be false after completion
    expect(generatedScenes.value).not.toEqual({});

    // Reset
    reset();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(generatedScenes.value).toEqual({});
  });
});

