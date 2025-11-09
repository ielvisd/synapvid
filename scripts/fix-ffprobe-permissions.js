#!/usr/bin/env node

/**
 * Postinstall script to ensure ffprobe has execute permissions
 * This fixes the issue where @ffprobe-installer/ffprobe binaries
 * may not have execute permissions after installation
 */

import { chmod, access, constants, readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function findFfprobePath() {
  const rootDir = join(__dirname, '..');
  const nodeModules = join(rootDir, 'node_modules');
  
  // Try to resolve via the package first (most reliable)
  try {
    const ffprobeInstaller = await import(join(nodeModules, '@ffprobe-installer', 'ffprobe', 'index.js'));
    if (ffprobeInstaller.default?.path && existsSync(ffprobeInstaller.default.path)) {
      return ffprobeInstaller.default.path;
    }
  } catch (err) {
    // Package might not be installed yet or path different
  }

  // Try direct path in node_modules
  const directPath = join(nodeModules, '@ffprobe-installer', 'ffprobe', 'ffprobe');
  if (existsSync(directPath)) {
    return directPath;
  }

  // Try pnpm structure - look for @ffprobe-installer packages
  const pnpmDir = join(nodeModules, '.pnpm');
  if (existsSync(pnpmDir)) {
    try {
      const entries = await readdir(pnpmDir);
      const ffprobeDirs = entries.filter(e => e.startsWith('@ffprobe-installer+'));
      
      for (const dir of ffprobeDirs) {
        const ffprobePath = join(pnpmDir, dir, 'node_modules', '@ffprobe-installer', 'ffprobe', 'ffprobe');
        if (existsSync(ffprobePath)) {
          return ffprobePath;
        }
      }
    } catch (err) {
      // Ignore readdir errors
    }
  }

  return null;
}

async function fixPermissions() {
  try {
    const ffprobePath = await findFfprobePath();
    
    if (!ffprobePath) {
      console.warn('⚠️  ffprobe binary not found. Skipping permission fix.');
      console.warn('   This is normal if @ffprobe-installer/ffprobe is not installed yet.');
      return;
    }

    // Check if file exists and has execute permission
    try {
      await access(ffprobePath, constants.X_OK);
      console.log(`✅ ffprobe already has execute permissions`);
    } catch {
      // If no execute permission, add it
      await chmod(ffprobePath, 0o755);
      console.log(`✅ Fixed ffprobe permissions: ${ffprobePath}`);
    }
  } catch (error) {
    console.error('❌ Error fixing ffprobe permissions:', error.message);
    // Don't fail the install process
    process.exit(0);
  }
}

fixPermissions();

