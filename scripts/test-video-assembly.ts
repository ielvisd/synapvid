#!/usr/bin/env tsx
/**
 * Manual test script for video assembly API
 * 
 * Usage: pnpm tsx scripts/test-video-assembly.ts
 * 
 * Requires:
 * - Dev server running on localhost:3000
 * - Test audio files in public/audio/
 * - Test video clips in public/clips/
 */

import { join } from 'path';
import { readdir } from 'fs/promises';

const API_URL = 'http://localhost:3000/api/video/assemble';

async function testVideoAssembly() {
  console.log('🧪 Testing Video Assembly API\n');

  // Get test files
  const audioDir = join(process.cwd(), 'public', 'audio');
  const clipsDir = join(process.cwd(), 'public', 'clips');

  try {
    const audioFiles = await readdir(audioDir);
    const clipFiles = await readdir(clipsDir);

    const audioPaths = audioFiles
      .filter(f => f.endsWith('.mp3'))
      .slice(0, 2)
      .map(f => `/audio/${f}`);

    const clipPaths = clipFiles
      .filter(f => f.endsWith('.mp4'))
      .slice(0, 2)
      .map(f => `/clips/${f}`);

    if (audioPaths.length === 0) {
      console.error('❌ No audio files found in public/audio/');
      return;
    }

    if (clipPaths.length === 0) {
      console.error('❌ No video clips found in public/clips/');
      return;
    }

    console.log(`📁 Found ${audioPaths.length} audio files`);
    console.log(`📁 Found ${clipPaths.length} video clips\n`);

    // Test spec
    const spec = {
      duration_target: 10,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 5,
          narration: ['Welcome to physics', 'Let us begin'],
          events: []
        },
        {
          type: 'skill1',
          start: 5,
          end: 10,
          narration: ['This is Newton\'s First Law', 'Objects at rest stay at rest'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    console.log('📤 Sending request to API...');
    console.log(`   Audio paths: ${audioPaths.length}`);
    console.log(`   Clip paths: ${clipPaths.length}\n`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spec,
        audioPaths,
        clipPaths,
        output: {
          resolution: '1920x1080',
          fps: 30,
          format: 'mp4',
          codec: 'h264'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('   Response:', error);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Video assembly successful!\n');
    console.log('📊 Results:');
    console.log(`   Video: ${result.videoPath}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Cues: ${result.cuesPath}`);
    console.log(`   Transcript: ${result.transcriptPath}`);
    console.log(`   Subtitles: ${result.subtitlePath || 'N/A'}`);
    console.log(`   Created: ${result.createdAt}\n`);

    console.log('✅ Test completed successfully!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the dev server is running: pnpm dev');
    }
  }
}

testVideoAssembly();

