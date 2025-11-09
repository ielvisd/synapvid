import type { VideoSpec, VideoOutput } from '~/schemas/videoSpec';

/**
 * Stage 4: Video Assembly
 * Combines audio segments and visual clips using fluent-ffmpeg
 * Applies transitions, burns subtitles, and produces final MP4
 * 
 * MCP Usage: Follows vue-app-mcp composable patterns for state management
 */
export const useVideoAssembly = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const progress = ref(0);
  const assemblyStatus = ref<string>('');
  const finalVideoPath = ref<string | null>(null);

  /**
   * Assemble final video from audio segments and visual clips
   */
  const assembleVideo = async (
    spec: VideoSpec,
    audioPaths: string[],
    clipPaths: string[]
  ): Promise<VideoOutput | null> => {
    isLoading.value = true;
    error.value = null;
    progress.value = 0;
    assemblyStatus.value = 'Initializing video assembly...';

    try {
      console.log('Starting video assembly...');
      console.log('Audio paths:', audioPaths);
      console.log('Clip paths:', clipPaths);

      // Validate inputs
      if (!audioPaths || audioPaths.length === 0) {
        throw new Error('No audio segments provided');
      }

      if (!clipPaths || clipPaths.length === 0) {
        throw new Error('No visual clips provided');
      }

      // Call server API to perform video assembly with ffmpeg
      assemblyStatus.value = 'Merging audio and video...';
      progress.value = 20;

      const result = await $fetch<VideoOutput>('/api/video/assemble', {
        method: 'POST',
        body: {
          spec,
          audioPaths,
          clipPaths,
          output: {
            resolution: '1920x1080',
            fps: 30,
            format: 'mp4',
            codec: 'h264'
          }
        }
      });

      if (!result) {
        throw new Error('Failed to assemble video');
      }

      finalVideoPath.value = result.videoPath;
      progress.value = 100;
      assemblyStatus.value = 'Video assembly complete!';

      return result;
    } catch (err: any) {
      console.error('Video assembly error:', err);
      error.value = err.message || 'Failed to assemble video';
      assemblyStatus.value = 'Assembly failed';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Generate WebVTT subtitle file from narration
   */
  const generateSubtitles = (spec: VideoSpec): string => {
    let vtt = 'WEBVTT\n\n';

    spec.scenes.forEach((scene, sceneIndex) => {
      scene.narration.forEach((text, chunkIndex) => {
        // Calculate approximate timing based on scene duration
        const chunkDuration = (scene.end - scene.start) / scene.narration.length;
        const start = scene.start + (chunkIndex * chunkDuration);
        const end = start + chunkDuration;

        vtt += `${sceneIndex + 1}.${chunkIndex + 1}\n`;
        vtt += `${formatVTTTime(start)} --> ${formatVTTTime(end)}\n`;
        vtt += `${text}\n\n`;
      });
    });

    return vtt;
  };

  /**
   * Format time for WebVTT (HH:MM:SS.mmm)
   */
  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  /**
   * Generate transcript file from narration
   */
  const generateTranscript = (spec: VideoSpec): string => {
    let transcript = `Video Transcript\nGenerated: ${new Date().toISOString()}\n\n`;

    spec.scenes.forEach((scene, index) => {
      transcript += `[${scene.type.toUpperCase()}] (${scene.start}s - ${scene.end}s)\n`;
      transcript += scene.narration.join(' ') + '\n\n';
    });

    return transcript;
  };

  /**
   * Generate JSON cues file with exact timing information
   */
  const generateCues = (spec: VideoSpec): string => {
    const cues = spec.scenes.map((scene, index) => ({
      id: `scene_${index}`,
      type: scene.type,
      start: scene.start,
      end: scene.end,
      narration: scene.narration,
      events: scene.events.map(event => ({
        time: event.t,
        action: event.action,
        params: event.params
      }))
    }));

    return JSON.stringify({ cues, metadata: { duration: spec.duration_target } }, null, 2);
  };

  /**
   * Reset state
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
    progress.value = 0;
    assemblyStatus.value = '';
    finalVideoPath.value = null;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    progress: readonly(progress),
    assemblyStatus: readonly(assemblyStatus),
    finalVideoPath: readonly(finalVideoPath),
    assembleVideo,
    generateSubtitles,
    generateTranscript,
    generateCues,
    reset
  };
};

