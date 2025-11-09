import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectState } from '~/composables/useProjectState';
import type { VideoSpec, AudioSegment } from '~/schemas/videoSpec';
import { useStateStore } from '../setup';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock process.client
Object.defineProperty(global, 'process', {
  value: {
    ...process,
    client: true
  }
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('useProjectState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Clear useState store between tests
    Object.keys(useStateStore).forEach(key => delete useStateStore[key]);
  });

  it('should initialize with default values', () => {
    const { videoSpec, audioSegments, projectName, lastSaved } = useProjectState();

    expect(videoSpec.value).toBeNull();
    expect(audioSegments.value).toBeNull();
    expect(projectName.value).toBe('Untitled Project');
    expect(lastSaved.value).toBeNull();
  });

  it('should load project from localStorage', () => {
    const savedData = {
      videoSpec: {
        duration_target: 120,
        scenes: [],
        style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
      },
      audioSegments: {
        chunk1: { path: '/audio/1.mp3', start: 0, end: 2.0 }
      },
      projectName: 'Test Project',
      lastSaved: new Date().toISOString()
    };

    localStorageMock.setItem('synapvid-project', JSON.stringify(savedData));

    const { videoSpec, audioSegments, projectName, lastSaved } = useProjectState();
    
    // Trigger load
    const { loadProject } = useProjectState();
    loadProject();

    expect(videoSpec.value).toBeDefined();
    expect(audioSegments.value).toBeDefined();
    expect(projectName.value).toBe('Test Project');
    expect(lastSaved.value).toBeDefined();
  });

  it('should save project to localStorage', () => {
    const { updateVideoSpec, saveProject } = useProjectState();

    const spec: VideoSpec = {
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

    updateVideoSpec(spec);

    const saved = localStorageMock.getItem('synapvid-project');
    expect(saved).toBeTruthy();
    
    const parsed = JSON.parse(saved || '{}');
    expect(parsed.videoSpec).toBeDefined();
    expect(parsed.videoSpec.duration_target).toBe(120);
  });

  it('should update video spec and auto-save', () => {
    const { updateVideoSpec, videoSpec } = useProjectState();

    const spec: VideoSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    updateVideoSpec(spec);

    expect(videoSpec.value).toEqual(spec);
    
    const saved = localStorageMock.getItem('synapvid-project');
    expect(saved).toBeTruthy();
  });

  it('should update audio segments and auto-save', () => {
    const { updateAudioSegments, audioSegments } = useProjectState();

    const segments: Record<string, AudioSegment> = {
      chunk1: { path: '/audio/1.mp3', start: 0, end: 2.0 },
      chunk2: { path: '/audio/2.mp3', start: 3.5, end: 5.0 }
    };

    updateAudioSegments(segments);

    expect(audioSegments.value).toEqual(segments);
    
    const saved = localStorageMock.getItem('synapvid-project');
    expect(saved).toBeTruthy();
  });

  it('should clear project', () => {
    const { updateVideoSpec, clearProject, videoSpec, audioSegments, projectName, lastSaved } = useProjectState();

    const spec: VideoSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    updateVideoSpec(spec);
    clearProject();

    expect(videoSpec.value).toBeNull();
    expect(audioSegments.value).toBeNull();
    expect(projectName.value).toBe('Untitled Project');
    expect(lastSaved.value).toBeNull();
    expect(localStorageMock.getItem('synapvid-project')).toBeNull();
  });

  it('should export project as JSON', () => {
    const { updateVideoSpec, exportProject } = useProjectState();

    const spec: VideoSpec = {
      duration_target: 120,
      scenes: [],
      style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
    };

    updateVideoSpec(spec);

    // Mock document.createElement and URL.createObjectURL
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn()
    };

    global.document = {
      createElement: vi.fn(() => mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      }
    } as any;

    global.URL = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn()
    } as any;

    global.Blob = class Blob {
      constructor(public parts: any[], public options: any) {}
    } as any;

    exportProject();

    expect(global.document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should import project from JSON file', async () => {
    const { importProject, videoSpec, projectName } = useProjectState();

    const importData = {
      videoSpec: {
        duration_target: 120,
        scenes: [],
        style: { voice: 'alloy', colors: { primary: '#F59E0B' } }
      },
      audioSegments: null,
      projectName: 'Imported Project'
    };

    const mockFile = {
      text: vi.fn().mockResolvedValue(JSON.stringify(importData))
    } as any;

    const result = await importProject(mockFile);

    expect(result).toBe(true);
    expect(videoSpec.value).toBeDefined();
    expect(projectName.value).toBe('Imported Project');
  });

  it('should handle invalid import file', async () => {
    const { importProject } = useProjectState();

    const mockFile = {
      text: vi.fn().mockResolvedValue('invalid json')
    } as any;

    const result = await importProject(mockFile);

    expect(result).toBe(false);
  });

  it('should handle import file without videoSpec', async () => {
    const { importProject } = useProjectState();

    const mockFile = {
      text: vi.fn().mockResolvedValue(JSON.stringify({ invalid: 'data' }))
    } as any;

    const result = await importProject(mockFile);

    expect(result).toBe(false);
  });
});

