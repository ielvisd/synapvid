import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { getAudioDuration } from '../../utils/ffprobe';

/**
 * API Endpoint: Text-to-Speech using OpenAI TTS
 * POST /api/openai/tts
 * 
 * Converts text to speech using OpenAI's TTS API
 * Returns path to generated audio file and accurate duration via ffprobe
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { text, voice = 'alloy', speed = 1.0 } = body;

  if (!text || typeof text !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid text provided'
    });
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key not configured'
    });
  }

  try {
    // Generate a unique filename based on text hash
    const hash = createHash('md5').update(text + voice + speed).digest('hex');
    const filename = `narration_${hash}.mp3`;
    const audioDir = join(process.cwd(), 'public', 'audio');
    const filepath = join(audioDir, filename);

    // Ensure audio directory exists
    await mkdir(audioDir, { recursive: true });

    // Check if audio file already exists (cache)
    let fileExists = false;
    try {
      await access(filepath);
      fileExists = true;
      console.log(`Using cached audio: ${filename}`);
    } catch {
      // File doesn't exist, need to generate
    }

    // Generate audio if not cached
    if (!fileExists) {
      console.log(`Generating new audio for: ${filename}`);
      
      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          speed: speed,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      // Get audio buffer
      const audioBuffer = await response.arrayBuffer();
      
      if (!audioBuffer || audioBuffer.byteLength === 0) {
        throw new Error('Received empty audio buffer from OpenAI TTS API');
      }
      
      // Save to file
      await writeFile(filepath, Buffer.from(audioBuffer));
      console.log(`Generated new audio: ${filename} (${audioBuffer.byteLength} bytes)`);
      
      // Verify file was written
      try {
        await access(filepath);
      } catch (err) {
        throw new Error(`Failed to verify audio file was written: ${filepath}`);
      }
    }

    // Get accurate duration using ffprobe
    let duration: number;
    try {
      // Verify file exists before getting duration
      await access(filepath);
      duration = await getAudioDuration(filepath);
      
      if (!duration || isNaN(duration) || duration <= 0) {
        throw new Error(`Invalid duration returned from ffprobe: ${duration}`);
      }
    } catch (err: any) {
      console.error(`Error getting audio duration for ${filepath}:`, err);
      throw new Error(`Failed to get audio duration: ${err.message || 'Unknown error'}`);
    }
    
    console.log(`Audio ready: ${filename} (${duration.toFixed(2)}s)`);

    return {
      path: `/audio/${filename}`,
      duration,
      filename,
      text // Return text for reference
    };
  } catch (error: any) {
    console.error('TTS generation error:', {
      message: error?.message,
      stack: error?.stack,
      statusCode: error?.statusCode,
      code: error?.code,
      name: error?.name
    });
    
    // Extract error message
    const errorMessage = error?.message || error?.toString() || 'Failed to generate speech';
    const statusCode = error?.statusCode || error?.status || 500;
    
    throw createError({
      statusCode,
      statusMessage: errorMessage,
      message: errorMessage
    });
  }
});

