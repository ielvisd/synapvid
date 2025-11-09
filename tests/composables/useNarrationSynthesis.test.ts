import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNarrationSynthesis } from '~/composables/useNarrationSynthesis';
import type { VideoSpec, AudioSegment } from '~/schemas/videoSpec';

// Mock useProjectState
const mockProjectState = {
  audioSegments: { value: null }
};

vi.mock('~/composables/useProjectState', () => ({
  useProjectState: vi.fn(() => mockProjectState)
}));

// Make useProjectState available globally
global.useProjectState = vi.fn(() => mockProjectState);

// Mock $fetch
const mockFetch = vi.fn();

describe('useNarrationSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.$fetch = mockFetch;
    mockProjectState.audioSegments.value = null;
  });

  it('should initialize with correct default state', () => {
    const { isLoading, error, progress, audioSegments } = useNarrationSynthesis();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(audioSegments.value).toEqual({});
  });

  it('should synthesize narration for all scenes', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome', 'Let us begin'],
          events: []
        },
        {
          type: 'skill1',
          start: 5,
          end: 10,
          narration: ['This is physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    // Mock TTS responses
    mockFetch
      .mockResolvedValueOnce({ path: '/audio/chunk1.mp3', duration: 2.0 })
      .mockResolvedValueOnce({ path: '/audio/chunk2.mp3', duration: 1.5 })
      .mockResolvedValueOnce({ path: '/audio/chunk3.mp3', duration: 2.5 });

    const { synthesizeNarration, audioSegments, progress } = useNarrationSynthesis();

    const result = await synthesizeNarration(spec);

    expect(result).toBeDefined();
    expect(Object.keys(result || {}).length).toBe(3);
    expect(audioSegments.value).toEqual(result);
    expect(progress.value).toBe(100);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should calculate correct timestamps with pauses', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['First chunk', 'Second chunk'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch
      .mockResolvedValueOnce({ path: '/audio/chunk1.mp3', duration: 2.0 })
      .mockResolvedValueOnce({ path: '/audio/chunk2.mp3', duration: 1.5 });

    const { synthesizeNarration } = useNarrationSynthesis();

    const result = await synthesizeNarration(spec);

    expect(result).toBeDefined();
    const segments = result || {};
    
    // First chunk should start at 0
    expect(segments['scene0_chunk0']?.start).toBe(0);
    expect(segments['scene0_chunk0']?.end).toBe(2.0);
    
    // Second chunk should start after first chunk + pause (1.5s)
    expect(segments['scene0_chunk1']?.start).toBe(3.5);
    expect(segments['scene0_chunk1']?.end).toBe(5.0);
  });

  it('should update progress during synthesis', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Chunk 1', 'Chunk 2', 'Chunk 3'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch
      .mockResolvedValue({ path: '/audio/chunk.mp3', duration: 1.0 });

    const { synthesizeNarration, progress } = useNarrationSynthesis();

    const promise = synthesizeNarration(spec);
    
    // Progress should be updated (we can't easily test intermediate values in this setup)
    await promise;
    
    expect(progress.value).toBe(100);
  });

  it('should handle TTS errors gracefully', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Test chunk'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockRejectedValue(new Error('TTS API Error'));

    const { synthesizeNarration, error } = useNarrationSynthesis();

    const result = await synthesizeNarration(spec);

    expect(result).toBeNull();
    expect(error.value).toContain('Failed to synthesize chunk');
  });

  it('should validate sync accuracy correctly', () => {
    const { validateSync } = useNarrationSynthesis();

    // Valid segments (no overlaps, gaps < 2s)
    const validSegments: Record<string, AudioSegment> = {
      chunk1: { path: '/audio/1.mp3', start: 0, end: 2.0 },
      chunk2: { path: '/audio/2.mp3', start: 3.5, end: 5.0 },
      chunk3: { path: '/audio/3.mp3', start: 6.5, end: 8.0 }
    };

    const validResult = validateSync(validSegments);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid segments (overlap)
    const invalidSegments: Record<string, AudioSegment> = {
      chunk1: { path: '/audio/1.mp3', start: 0, end: 2.0 },
      chunk2: { path: '/audio/2.mp3', start: 1.5, end: 3.0 } // Overlaps with chunk1
    };

    const invalidResult = validateSync(invalidSegments);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should update spec with timestamps', () => {
    const { updateSpecWithTimestamps } = useNarrationSynthesis();

    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Test'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const segments: Record<string, AudioSegment> = {
      chunk1: { path: '/audio/1.mp3', start: 0, end: 2.0 }
    };

    const updated = updateSpecWithTimestamps(spec, segments);

    expect(updated.audioSegments).toEqual(segments);
    expect(updated.duration_target).toBe(spec.duration_target);
  });

  it('should reset state correctly', async () => {
    const { reset, isLoading, error, progress, audioSegments, synthesizeNarration } = useNarrationSynthesis();

    // Set some state by calling synthesizeNarration
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Test chunk'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    mockFetch.mockResolvedValue({ path: '/audio/chunk.mp3', duration: 1.0 });
    await synthesizeNarration(spec);

    expect(audioSegments.value).not.toEqual({});

    reset();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(audioSegments.value).toEqual({});
  });
});

