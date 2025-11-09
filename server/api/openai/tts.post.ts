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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI TTS API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      // Get audio buffer
      const audioBuffer = await response.arrayBuffer();
      
      // Save to file
      await writeFile(filepath, Buffer.from(audioBuffer));
      console.log(`Generated new audio: ${filename}`);
    }

    // Get accurate duration using ffprobe
    const duration = await getAudioDuration(filepath);
    
    console.log(`Audio ready: ${filename} (${duration.toFixed(2)}s)`);

    return {
      path: `/audio/${filename}`,
      duration,
      filename,
      text // Return text for reference
    };
  } catch (error: any) {
    console.error('TTS generation error:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate speech'
    });
  }
});

