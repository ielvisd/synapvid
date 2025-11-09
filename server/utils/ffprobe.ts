import { exec } from 'child_process';
import { promisify } from 'util';
import { chmod, access, constants } from 'fs/promises';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const execAsync = promisify(exec);

/**
 * Ensure ffprobe has execute permissions
 */
async function ensureFfprobePermissions(): Promise<void> {
  if (!ffprobeInstaller.path) {
    return;
  }

  try {
    // Check if file exists and has execute permission
    await access(ffprobeInstaller.path, constants.X_OK);
  } catch {
    // If no execute permission, add it
    try {
      await chmod(ffprobeInstaller.path, 0o755);
      console.log(`Fixed ffprobe permissions: ${ffprobeInstaller.path}`);
    } catch (err) {
      console.warn(`Failed to set ffprobe permissions: ${err}`);
    }
  }
}

/**
 * Get audio duration using ffprobe
 * @param filepath - Path to the audio file
 * @returns Duration in seconds
 */
export async function getAudioDuration(filepath: string): Promise<number> {
  try {
    // Verify ffprobe path exists
    if (!ffprobeInstaller.path) {
      throw new Error('ffprobe path not found. Please ensure @ffprobe-installer/ffprobe is properly installed.');
    }

    // Ensure ffprobe has execute permissions
    await ensureFfprobePermissions();

    const command = `"${ffprobeInstaller.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.trim()) {
      console.warn('ffprobe stderr:', stderr);
    }
    
    const durationStr = stdout.trim();
    if (!durationStr) {
      throw new Error(`ffprobe returned empty output for file: ${filepath}`);
    }
    
    const duration = parseFloat(durationStr);
    
    if (isNaN(duration)) {
      throw new Error(`Invalid duration returned from ffprobe: "${durationStr}"`);
    }
    
    if (duration <= 0) {
      throw new Error(`Invalid duration (must be > 0): ${duration}`);
    }
    
    return duration;
  } catch (error: any) {
    console.error('ffprobe error:', {
      filepath,
      ffprobePath: ffprobeInstaller.path,
      error: error.message,
      stderr: error.stderr,
      stdout: error.stdout
    });
    
    // Provide more specific error messages
    if (error.code === 'ENOENT') {
      throw new Error(`ffprobe executable not found at: ${ffprobeInstaller.path}`);
    }
    if (error.code === 'EACCES' || error.message?.includes('Permission denied')) {
      // Try to fix permissions and retry once
      try {
        await ensureFfprobePermissions();
        const retryCommand = `"${ffprobeInstaller.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`;
        const { stdout: retryStdout } = await execAsync(retryCommand);
        const durationStr = retryStdout.trim();
        if (durationStr) {
          const duration = parseFloat(durationStr);
          if (!isNaN(duration) && duration > 0) {
            return duration;
          }
        }
      } catch (retryError) {
        // If retry fails, throw user-friendly error
        throw new Error(`Permission denied: ffprobe cannot be executed. Please run: chmod +x "${ffprobeInstaller.path}"`);
      }
      throw new Error(`Permission denied accessing ffprobe or audio file: ${filepath}`);
    }
    
    throw new Error(`Failed to get audio duration: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get audio metadata using ffprobe
 * @param filepath - Path to the audio file
 * @returns Audio metadata
 */
export async function getAudioMetadata(filepath: string): Promise<{
  duration: number;
  bitRate: number;
  sampleRate: number;
}> {
  try {
    // Ensure ffprobe has execute permissions
    await ensureFfprobePermissions();

    const { stdout } = await execAsync(
      `"${ffprobeInstaller.path}" -v error -show_entries format=duration,bit_rate:stream=sample_rate -of json "${filepath}"`
    );
    
    const metadata = JSON.parse(stdout);
    
    return {
      duration: parseFloat(metadata.format.duration || 0),
      bitRate: parseInt(metadata.format.bit_rate || 0),
      sampleRate: parseInt(metadata.streams[0]?.sample_rate || 0)
    };
  } catch (error: any) {
    console.error('ffprobe metadata error:', error);
    throw new Error(`Failed to get audio metadata: ${error.message}`);
  }
}

