import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVideoAssembly } from '~/composables/useVideoAssembly';
import type { VideoSpec } from '~/schemas/videoSpec';

// Mock $fetch
const mockFetch = vi.fn();

describe('useVideoAssembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.$fetch = mockFetch;
  });

  it('should initialize with correct default state', () => {
    const { isLoading, error, progress, assemblyStatus, finalVideoPath } = useVideoAssembly();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(assemblyStatus.value).toBe('');
    expect(finalVideoPath.value).toBeNull();
  });

  it('should assemble video successfully', async () => {
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

    const mockResult = {
      videoPath: '/videos/test.mp4',
      duration: 10,
      cuesPath: '/videos/cues.json',
      transcriptPath: '/videos/transcript.txt',
      subtitlePath: '/videos/subtitles.vtt',
      spec,
      createdAt: new Date().toISOString()
    };

    mockFetch.mockResolvedValue(mockResult);

    const { assembleVideo, finalVideoPath, progress } = useVideoAssembly();

    const result = await assembleVideo(spec, ['/audio/1.mp3'], ['/clips/1.mp4']);

    expect(result).toBeDefined();
    expect(result?.videoPath).toBe('/videos/test.mp4');
    expect(finalVideoPath.value).toBe('/videos/test.mp4');
    expect(progress.value).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith('/api/video/assemble', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        spec,
        audioPaths: ['/audio/1.mp3'],
        clipPaths: ['/clips/1.mp4']
      })
    }));
  });

  it('should handle missing audio paths', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    const { assembleVideo, error } = useVideoAssembly();

    const result = await assembleVideo(spec, [], ['/clips/1.mp4']);

    expect(result).toBeNull();
    expect(error.value).toBe('No audio segments provided');
  });

  it('should handle missing clip paths', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    const { assembleVideo, error } = useVideoAssembly();

    const result = await assembleVideo(spec, ['/audio/1.mp3'], []);

    expect(result).toBeNull();
    expect(error.value).toBe('No visual clips provided');
  });

  it('should handle API errors', async () => {
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    mockFetch.mockRejectedValue(new Error('Assembly failed'));

    const { assembleVideo, error } = useVideoAssembly();

    const result = await assembleVideo(spec, ['/audio/1.mp3'], ['/clips/1.mp4']);

    expect(result).toBeNull();
    expect(error.value).toBe('Assembly failed');
  });

  it('should generate WebVTT subtitles correctly', () => {
    const { generateSubtitles } = useVideoAssembly();

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

    const vtt = generateSubtitles(spec);

    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('Welcome');
    expect(vtt).toContain('This is physics');
    expect(vtt).toMatch(/\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+/);
  });

  it('should generate transcript correctly', () => {
    const { generateTranscript } = useVideoAssembly();

    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome', 'To physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const transcript = generateTranscript(spec);

    expect(transcript).toContain('Video Transcript');
    expect(transcript).toContain('[INTRO]');
    expect(transcript).toContain('Welcome To physics');
  });

  it('should generate cues JSON correctly', () => {
    const { generateCues } = useVideoAssembly();

    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome'],
          events: [
            { t: 1, action: 'reveal_text', text: 'Title' }
          ]
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const cues = generateCues(spec);
    const parsed = JSON.parse(cues);

    expect(parsed.cues).toBeDefined();
    expect(parsed.cues).toHaveLength(1);
    expect(parsed.cues[0].type).toBe('intro');
    expect(parsed.cues[0].start).toBe(0);
    expect(parsed.cues[0].end).toBe(5);
    expect(parsed.metadata.duration).toBe(10);
  });

  it('should reset state correctly', async () => {
    const { reset, isLoading, error, progress, assemblyStatus, finalVideoPath, assembleVideo } = useVideoAssembly();

    // Set some state by calling assembleVideo
    const spec: VideoSpec = {
      duration_target: 10,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    mockFetch.mockResolvedValue({
      videoPath: '/videos/test.mp4',
      duration: 10,
      cuesPath: '/videos/cues.json',
      transcriptPath: '/videos/transcript.txt',
      subtitlePath: '/videos/subtitles.vtt',
      spec,
      createdAt: new Date().toISOString()
    });

    await assembleVideo(spec, ['/audio/1.mp3'], ['/clips/1.mp4']);
    expect(finalVideoPath.value).not.toBeNull();

    reset();

    expect(isLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBe(0);
    expect(assemblyStatus.value).toBe('');
    expect(finalVideoPath.value).toBeNull();
  });
});

