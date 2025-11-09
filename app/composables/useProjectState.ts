import type { VideoSpec, AudioSegment } from '~/schemas/videoSpec';

/**
 * Global project state management
 * Persists video spec and audio segments across page navigation
 * Uses Nuxt's useState for SSR-safe global state
 */
export const useProjectState = () => {
  // Global state (shared across all components)
  const videoSpec = useState<VideoSpec | null>('videoSpec', () => null);
  const audioSegments = useState<Record<string, AudioSegment> | null>('audioSegments', () => null);
  const projectName = useState<string>('projectName', () => 'Untitled Project');
  const lastSaved = useState<Date | null>('lastSaved', () => null);

  /**
   * Load project from localStorage on client-side
   */
  const loadProject = () => {
    if (process.client) {
      try {
        const saved = localStorage.getItem('synapvid-project');
        if (saved) {
          const data = JSON.parse(saved);
          videoSpec.value = data.videoSpec || null;
          audioSegments.value = data.audioSegments || null;
          projectName.value = data.projectName || 'Untitled Project';
          lastSaved.value = data.lastSaved ? new Date(data.lastSaved) : null;
          console.log('Project loaded from localStorage');
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    }
  };

  /**
   * Save project to localStorage
   */
  const saveProject = () => {
    if (process.client) {
      try {
        const data = {
          videoSpec: videoSpec.value,
          audioSegments: audioSegments.value,
          projectName: projectName.value,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem('synapvid-project', JSON.stringify(data));
        lastSaved.value = new Date();
        console.log('Project saved to localStorage');
      } catch (err) {
        console.error('Failed to save project:', err);
      }
    }
  };

  /**
   * Update video spec and auto-save
   */
  const updateVideoSpec = (spec: VideoSpec) => {
    videoSpec.value = spec;
    saveProject();
  };

  /**
   * Update audio segments and auto-save
   */
  const updateAudioSegments = (segments: Record<string, AudioSegment>) => {
    audioSegments.value = segments;
    saveProject();
  };

  /**
   * Clear project (new project)
   */
  const clearProject = () => {
    videoSpec.value = null;
    audioSegments.value = null;
    projectName.value = 'Untitled Project';
    lastSaved.value = null;
    if (process.client) {
      localStorage.removeItem('synapvid-project');
    }
  };

  /**
   * Export project as JSON file
   */
  const exportProject = () => {
    if (!videoSpec.value) return;

    const data = {
      videoSpec: videoSpec.value,
      audioSegments: audioSegments.value,
      projectName: projectName.value,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.value.replace(/\s+/g, '-').toLowerCase()}.synapvid.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Import project from JSON file
   */
  const importProject = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.videoSpec) {
        videoSpec.value = data.videoSpec;
        audioSegments.value = data.audioSegments || null;
        projectName.value = data.projectName || 'Imported Project';
        saveProject();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to import project:', err);
      return false;
    }
  };

  // Auto-load on initialization (client-side only)
  if (process.client && !videoSpec.value) {
    loadProject();
  }

  return {
    // State
    videoSpec: readonly(videoSpec),
    audioSegments: readonly(audioSegments),
    projectName,
    lastSaved: readonly(lastSaved),
    
    // Methods
    updateVideoSpec,
    updateAudioSegments,
    saveProject,
    loadProject,
    clearProject,
    exportProject,
    importProject
  };
};

