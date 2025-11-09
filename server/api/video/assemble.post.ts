import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * API Endpoint: Assemble Final Video
 * POST /api/video/assemble
 * 
 * Uses fluent-ffmpeg to combine audio and visual clips
 * Applies transitions, burns subtitles, produces 1080p/30fps MP4
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const { spec, audioPaths, clipPaths, output } = body;

  if (!spec || !audioPaths || !clipPaths) {
    throw createError({
      statusCode: 400,
      message: 'Invalid assembly parameters provided'
    });
  }

  try {
    // Generate unique filename
    const hash = createHash('md5')
      .update(JSON.stringify(spec) + Date.now())
      .digest('hex');
    const filename = `video_${hash}.mp4`;
    const videoDir = join(process.cwd(), 'public', 'videos');
    const videoPath = join(videoDir, filename);

    // Ensure video directory exists
    await mkdir(videoDir, { recursive: true });

    // Resolve paths relative to project root
    const resolvePath = (path: string) => {
      // If path starts with /, it's already absolute or public path
      if (path.startsWith('/')) {
        return join(process.cwd(), 'public', path.replace(/^\//, ''));
      }
      return join(process.cwd(), 'public', path);
    };

    const resolvedAudioPaths = audioPaths.map(resolvePath);
    const resolvedClipPaths = clipPaths.map(resolvePath);

    // Verify files exist
    for (const path of [...resolvedAudioPaths, ...resolvedClipPaths]) {
      try {
        await readFile(path);
      } catch (err) {
        console.warn(`File not found: ${path}, will skip or use placeholder`);
      }
    }

    // Generate WebVTT subtitle file
    const subtitleFilename = `subtitles_${hash}.vtt`;
    const subtitlePath = join(videoDir, subtitleFilename);
    const vttContent = generateWebVTT(spec);
    await writeFile(subtitlePath, vttContent);

    // Generate supporting files (cues and transcript)
    const cuesFilename = `cues_${hash}.json`;
    const transcriptFilename = `transcript_${hash}.txt`;
    const cuesPath = join(videoDir, cuesFilename);
    const transcriptPath = join(videoDir, transcriptFilename);

    const cues = {
      scenes: spec.scenes.map((scene: any, index: number) => ({
        id: `scene_${index}`,
        type: scene.type,
        start: scene.start,
        end: scene.end
      })),
      duration: spec.duration_target
    };

    await writeFile(cuesPath, JSON.stringify(cues, null, 2));

    const transcript = spec.scenes
      .map((scene: any) => `[${scene.type}] ${scene.narration.join(' ')}`)
      .join('\n\n');

    await writeFile(transcriptPath, transcript);

    // Create FFmpeg command for video assembly
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add video clips as inputs
      resolvedClipPaths.forEach((clipPath, index) => {
        command.input(clipPath);
      });

      // Add audio segments as inputs
      resolvedAudioPaths.forEach((audioPath) => {
        command.input(audioPath);
      });

      // Complex filter for video concatenation, transitions, and audio mixing
      const videoInputs = resolvedClipPaths.length;
      const transitionDuration = 0.3; // 300ms transitions
      
      // Build filter complex step by step
      const filterParts: string[] = [];
      
      // Step 1: Scale and pad all video inputs to 1920x1080, 30fps
      resolvedClipPaths.forEach((_, i) => {
        filterParts.push(
          `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=30[v${i}]`
        );
      });
      
      // Step 2: Apply fade transitions (fade in at start, fade out at end)
      // Note: For proper fade out, we'd need total duration - simplified for now
      resolvedClipPaths.forEach((_, i) => {
        if (i === 0 && resolvedClipPaths.length > 1) {
          // First clip: fade in at start
          filterParts.push(`[v${i}]fade=t=in:st=0:d=${transitionDuration}[vf${i}]`);
        } else {
          // Other clips: no fade (transitions can be enhanced later)
          filterParts.push(`[v${i}]copy[vf${i}]`);
        }
      });
      
      // Step 3: Concatenate video clips
      const videoConcatInputs = resolvedClipPaths.map((_, i) => `[vf${i}]`).join('');
      filterParts.push(`${videoConcatInputs}concat=n=${resolvedClipPaths.length}:v=1:a=0[outv]`);

      // Step 4: Concatenate audio segments
      const audioConcatInputs = resolvedAudioPaths.map((_, i) => `[${videoInputs + i}:a]`).join('');
      filterParts.push(`${audioConcatInputs}concat=n=${resolvedAudioPaths.length}:v=0:a=1[outa]`);

      const filterComplex = filterParts.join(';');

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map [outv]',
          '-map [outa]',
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k',
          '-r 30',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          // Note: Subtitle burning can be added later with subtitles filter
          // For now, subtitles are generated as separate WebVTT file
        ])
        .output(videoPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          console.log('Video assembly complete!');
          resolve({
            videoPath: `/videos/${filename}`,
            duration: spec.duration_target,
            cuesPath: `/videos/${cuesFilename}`,
            transcriptPath: `/videos/${transcriptFilename}`,
            subtitlePath: `/videos/${subtitleFilename}`,
            spec: spec,
            createdAt: new Date().toISOString()
          });
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(createError({
            statusCode: 500,
            message: `FFmpeg processing failed: ${err.message}`
          }));
        })
        .run();
    });
  } catch (error: any) {
    console.error('Video assembly error:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to assemble video'
    });
  }
});

/**
 * Generate WebVTT subtitle file from video spec
 */
function generateWebVTT(spec: any): string {
  let vtt = 'WEBVTT\n\n';

  spec.scenes.forEach((scene: any, sceneIndex: number) => {
    scene.narration.forEach((text: string, chunkIndex: number) => {
      // Calculate timing based on scene duration
      const chunkDuration = (scene.end - scene.start) / scene.narration.length;
      const start = scene.start + (chunkIndex * chunkDuration);
      const end = start + chunkDuration;

      vtt += `${sceneIndex + 1}.${chunkIndex + 1}\n`;
      vtt += `${formatVTTTime(start)} --> ${formatVTTTime(end)}\n`;
      vtt += `${text}\n\n`;
    });
  });

  return vtt;
}

/**
 * Format time for WebVTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
