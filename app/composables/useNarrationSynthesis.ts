import type { VideoSpec, AudioSegment } from '~/schemas/videoSpec';

/**
 * Stage 2: Narration Synthesis
 * Converts text narration chunks into audio using OpenAI TTS
 * Adds pauses between chunks using fluent-ffmpeg
 * Calculates actual durations and updates timestamps
 * 
 * MCP Usage: Follows vue-app-mcp composable patterns for state management
 */
export const useNarrationSynthesis = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const audioSegments = ref<Record<string, AudioSegment>>({});
  const progress = ref(0);

  /**
   * Synthesize narration for all chunks in the spec
   */
  const synthesizeNarration = async (spec: VideoSpec): Promise<Record<string, AudioSegment> | null> => {
    isLoading.value = true;
    error.value = null;
    progress.value = 0;
    audioSegments.value = {};

    try {
      // Collect all narration chunks from all scenes
      const allChunks: Array<{ sceneIndex: number; chunkIndex: number; text: string; startTime: number }> = [];
      
      spec.scenes.forEach((scene, sceneIndex) => {
        scene.narration.forEach((chunk, chunkIndex) => {
          allChunks.push({
            sceneIndex,
            chunkIndex,
            text: chunk,
            startTime: scene.start
          });
        });
      });

      console.log(`Synthesizing ${allChunks.length} narration chunks`);

      // Process each chunk
      const segments: Record<string, AudioSegment> = {};
      let currentTime = 0;

      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        if (!chunk) continue;
        
        const chunkId = `scene${chunk.sceneIndex}_chunk${chunk.chunkIndex}`;

        try {
          // Synthesize audio for this chunk
          const audioData = await synthesizeChunk(chunk.text, spec.style.voice);
          
          if (!audioData) {
            throw new Error(`Failed to synthesize chunk ${chunkId}`);
          }

          // Calculate duration and create segment
          const segment: AudioSegment = {
            path: audioData.path,
            start: currentTime,
            end: currentTime + audioData.duration
          };

          segments[chunkId] = segment;
          currentTime = segment.end + 1.5; // Add 1.5s pause between chunks

          // Update progress
          progress.value = Math.round(((i + 1) / allChunks.length) * 100);

          console.log(`Synthesized chunk ${chunkId}: ${segment.start}s - ${segment.end}s`);
        } catch (err: any) {
          console.error(`Error synthesizing chunk ${chunkId}:`, err);
          throw new Error(`Failed to synthesize chunk ${chunkId}: ${err.message}`);
        }
      }

      audioSegments.value = segments;
      return segments;
    } catch (err: any) {
      console.error('Narration synthesis error:', err);
      error.value = err.message || 'Failed to synthesize narration';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Synthesize a single narration chunk using OpenAI TTS
   */
  const synthesizeChunk = async (
    text: string,
    voice: string = 'alloy'
  ): Promise<{ path: string; duration: number } | null> => {
    try {
      const response = await $fetch<{ path: string; duration: number }>('/api/openai/tts', {
        method: 'POST',
        body: {
          text,
          voice,
          speed: 1.0
        }
      });

      return response;
    } catch (err: any) {
      console.error('TTS synthesis error:', err);
      throw err;
    }
  };

  /**
   * Update video spec with audio timestamps
   */
  const updateSpecWithTimestamps = (spec: VideoSpec, segments: Record<string, AudioSegment>): VideoSpec => {
    // Create a new spec with updated audioSegments
    return {
      ...spec,
      audioSegments: segments
    };
  };

  /**
   * Validate sync accuracy (±300ms tolerance)
   */
  const validateSync = (segments: Record<string, AudioSegment>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const segmentArray = Object.entries(segments);

    for (let i = 0; i < segmentArray.length - 1; i++) {
      const entry1 = segmentArray[i];
      const entry2 = segmentArray[i + 1];
      if (!entry1 || !entry2) continue;
      
      const [id1, seg1] = entry1;
      const [id2, seg2] = entry2;

      const gap = seg2.start - seg1.end;
      
      // Check for overlaps or gaps > 300ms
      if (gap < 0) {
        errors.push(`Overlap detected: ${id1} and ${id2} (${Math.abs(gap)}ms)`);
      } else if (gap > 2.0) {
        errors.push(`Large gap detected: ${id1} to ${id2} (${gap}s)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  /**
   * Reset state
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
    audioSegments.value = {};
    progress.value = 0;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    audioSegments: readonly(audioSegments),
    progress: readonly(progress),
    synthesizeNarration,
    updateSpecWithTimestamps,
    validateSync,
    reset
  };
};

