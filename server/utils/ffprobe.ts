import { exec } from 'child_process';
import { promisify } from 'util';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const execAsync = promisify(exec);

/**
 * Get audio duration using ffprobe
 * @param filepath - Path to the audio file
 * @returns Duration in seconds
 */
export async function getAudioDuration(filepath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `"${ffprobeInstaller.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`
    );
    
    const duration = parseFloat(stdout.trim());
    
    if (isNaN(duration)) {
      throw new Error('Invalid duration returned from ffprobe');
    }
    
    return duration;
  } catch (error: any) {
    console.error('ffprobe error:', error);
    throw new Error(`Failed to get audio duration: ${error.message}`);
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

