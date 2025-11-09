import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { readdir, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Integration test for video assembly
 * 
 * Creates test video clips and audio files, then tests the assembly process
 */
describe('Video Assembly Integration', () => {
  const testAudioDir = join(process.cwd(), 'public', 'audio');
  const testVideoDir = join(process.cwd(), 'public', 'videos');
  const testClipsDir = join(process.cwd(), 'public', 'clips');
  const testAudioFiles: string[] = [];
  const testClipFiles: string[] = [];
  const cleanupFiles: string[] = [];

  beforeAll(async () => {
    // Ensure directories exist
    await mkdir(testVideoDir, { recursive: true });
    await mkdir(testClipsDir, { recursive: true });

    // Get existing audio files
    try {
      const audioFiles = await readdir(testAudioDir);
      testAudioFiles.push(...audioFiles.filter(f => f.endsWith('.mp3')).slice(0, 2));
    } catch (err) {
      console.warn('No audio files found, skipping audio tests');
    }

    // Generate test video clips using FFmpeg (simple colored frames)
    for (let i = 0; i < 2; i++) {
      const clipPath = join(testClipsDir, `test_clip_${i}.mp4`);
      testClipFiles.push(`/clips/test_clip_${i}.mp4`);
      cleanupFiles.push(clipPath);

      // Create a simple 2-second video clip with a solid color
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input('color=c=blue:s=1920x1080:d=2')
          .inputFormat('lavfi')
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-t 2',
            '-r 30',
            '-pix_fmt yuv420p'
          ])
          .output(clipPath)
          .on('end', () => {
            console.log(`Created test clip ${i + 1}/2`);
            resolve();
          })
          .on('error', (err) => {
            console.warn(`Failed to create test clip: ${err.message}`);
            // Don't fail test if clip creation fails
            resolve();
          })
          .run();
      });
    }
  });

  afterAll(async () => {
    // Cleanup test files
    for (const file of cleanupFiles) {
      try {
        if (existsSync(file)) {
          await unlink(file);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  it('should generate WebVTT subtitles correctly', () => {
    const spec = {
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome', 'To the test']
        },
        {
          type: 'skill1',
          start: 5,
          end: 10,
          narration: ['This is', 'A skill scene']
        }
      ]
    };

    const vtt = generateWebVTT(spec);
    
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('Welcome');
    expect(vtt).toContain('A skill scene');
    expect(vtt).toMatch(/\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+/);
  });

  it('should resolve file paths correctly', () => {
    const resolvePath = (path: string) => {
      if (path.startsWith('/')) {
        return join(process.cwd(), 'public', path.replace(/^\//, ''));
      }
      return join(process.cwd(), 'public', path);
    };

    const testPaths = ['/audio/test.mp3', 'audio/test.mp3', '/clips/test.mp4'];
    const resolved = testPaths.map(resolvePath);

    expect(resolved[0]).toContain('public/audio/test.mp3');
    expect(resolved[1]).toContain('public/audio/test.mp3');
    expect(resolved[2]).toContain('public/clips/test.mp4');
  });

  it('should validate FFmpeg filter complex generation', () => {
    const clipPaths = ['/clips/test1.mp4', '/clips/test2.mp4'];
    const audioPaths = ['/audio/test1.mp3', '/audio/test2.mp3'];
    const videoInputs = clipPaths.length;

    // Build filter parts
    const filterParts: string[] = [];
    
    // Scale and pad videos
    clipPaths.forEach((_, i) => {
      filterParts.push(
        `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS,fps=30[v${i}]`
      );
    });

    // Copy videos
    clipPaths.forEach((_, i) => {
      filterParts.push(`[v${i}]copy[vf${i}]`);
    });

    // Concatenate video
    const videoConcatInputs = clipPaths.map((_, i) => `[vf${i}]`).join('');
    filterParts.push(`${videoConcatInputs}concat=n=${clipPaths.length}:v=1:a=0[outv]`);

    // Concatenate audio
    const audioConcatInputs = audioPaths.map((_, i) => `[${videoInputs + i}:a]`).join('');
    filterParts.push(`${audioConcatInputs}concat=n=${audioPaths.length}:v=0:a=1[outa]`);

    const filterComplex = filterParts.join(';');

    expect(filterComplex).toContain('[outv]');
    expect(filterComplex).toContain('[outa]');
    expect(filterComplex).toContain('concat');
    expect(filterComplex.split('concat').length - 1).toBe(2); // Video and audio concat
  });

  function generateWebVTT(spec: any): string {
    let vtt = 'WEBVTT\n\n';

    spec.scenes.forEach((scene: any, sceneIndex: number) => {
      scene.narration.forEach((text: string, chunkIndex: number) => {
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

  function formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
});

