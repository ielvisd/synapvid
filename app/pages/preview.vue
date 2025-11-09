<template>
  <div>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">3D Scene Preview</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Preview generated 3D scenes before final rendering
          </p>
        </div>
        <div class="flex gap-2">
          <ClientOnly>
            <UButton
              variant="outline"
              icon="i-lucide-play"
              :disabled="!hasScenes"
              @click="playPreview"
            >
              Play
            </UButton>
          </ClientOnly>
          <UButton
            variant="outline"
            icon="i-lucide-settings"
            @click="showSettings = !showSettings"
          >
            Settings
          </UButton>
        </div>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold mb-3">Preview Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormField label="Quality">
            <USelect v-model="quality" :items="['low', 'medium', 'high']" />
          </UFormField>
          <UFormField label="Camera Angle">
            <USelect v-model="cameraAngle" :items="['front', 'top', 'side', 'perspective']" />
          </UFormField>
          <UFormField label="Show Grid">
            <USwitch v-model="showGrid" />
          </UFormField>
        </div>
      </div>

      <!-- 3D Canvas -->
      <ClientOnly>
        <div class="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700" style="height: 500px; max-height: 500px;">
          <div v-if="!hasScenes" class="absolute inset-0 flex items-center justify-center text-white">
            <div class="text-center">
              <UIcon name="i-lucide-box" class="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p class="text-lg">No scenes to preview</p>
              <p class="text-sm text-gray-400 mt-2">Generate a video spec first</p>
              <UButton to="/" class="mt-4">
                Go to Home
              </UButton>
            </div>
          </div>

          <!-- TresJS 3D Canvas -->
          <Scene3DViewer
            v-if="hasScenes && currentScene"
            ref="sceneViewerRef"
            :scene="currentScene"
            :style="projectState.videoSpec.value?.style"
            :show-controls="false"
            :enable-controls="true"
            :auto-play="isPlaying"
            :current-time="currentTime"
          />

          <!-- Canvas Overlay Controls -->
          <div v-if="hasScenes" class="absolute top-4 right-4 flex gap-2">
            <UButton
              size="sm"
              variant="soft"
              icon="i-lucide-rotate-3d"
              @click="resetCamera"
            >
              Reset Camera
            </UButton>
            <UButton
              size="sm"
              variant="soft"
              icon="i-lucide-maximize"
              @click="fullscreen"
            >
              Fullscreen
            </UButton>
          </div>
        </div>
        <template #fallback>
          <div class="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center" style="height: 500px;">
            <div class="text-white">Loading preview...</div>
          </div>
        </template>
      </ClientOnly>

      <!-- Timeline Scrubber -->
      <ClientOnly>
        <div v-if="hasScenes" class="space-y-3">
        <div class="flex items-center gap-4">
          <UButton
            size="sm"
            :icon="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
            @click="togglePlay"
          />
                  <div class="flex-1">
                    <input
                      v-model.number="currentTime"
                      type="range"
                      min="0"
                      :max="duration"
                      step="0.1"
                      class="w-full"
                      @input="seekTo"
                      @mousedown="pauseOnSeek"
                    />
                  </div>
          <div class="flex items-center gap-2">
            <span class="text-sm tabular-nums">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </span>
            <UIcon 
              v-if="hasAudio" 
              name="i-lucide-volume-2" 
              class="w-4 h-4 text-green-500"
              title="Audio available"
            />
          </div>
        </div>

        <!-- Scene Markers -->
        <div class="relative h-8 bg-gray-100 dark:bg-gray-800 rounded">
          <div
            v-for="(scene, index) in scenes"
            :key="index"
            class="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-primary cursor-pointer hover:bg-primary/30 transition-colors"
            :style="{
              left: `${(scene.start / duration) * 100}%`,
              width: `${((scene.end - scene.start) / duration) * 100}%`
            }"
            @click="jumpToScene(scene.start)"
          >
            <div class="p-1 text-xs font-medium truncate">
              {{ scene.type }}
            </div>
          </div>
        </div>
      </div>
      </ClientOnly>

      <!-- Scene Info -->
      <ClientOnly>
        <div v-if="currentScene" class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold mb-2">Current Scene: {{ currentScene.type }}</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600 dark:text-gray-400">Duration:</span>
            <span class="ml-2 font-medium">{{ (currentScene.end - currentScene.start).toFixed(1) }}s</span>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">Events:</span>
            <span class="ml-2 font-medium">{{ currentScene.events.length }}</span>
          </div>
        </div>
        <div class="mt-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">Narration:</p>
          <p class="text-sm mt-1">{{ currentScene.narration.join(' ') }}</p>
        </div>
      </div>
      </ClientOnly>

      <!-- Scene Navigation -->
      <ClientOnly>
        <div v-if="hasScenes" class="flex items-center justify-between gap-4">
          <UButton
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="currentSceneIndex === 0"
            @click="previousScene"
          >
            Previous Scene
          </UButton>
          
          <div class="flex-1 text-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Scene {{ (currentSceneIndex ?? 0) + 1 }} of {{ scenes.length }}
            </span>
          </div>
          
          <UButton
            variant="outline"
            icon="i-lucide-chevron-right"
            :disabled="currentSceneIndex >= scenes.length - 1"
            @click="nextScene"
          >
            Next Scene
          </UButton>
        </div>
      </ClientOnly>

      <!-- Actions -->
      <div class="flex gap-3">
        <UButton
          to="/editor"
          variant="outline"
          icon="i-lucide-edit"
        >
          Edit Scenes
        </UButton>
        <UButton
          to="/export"
          icon="i-lucide-download"
        >
          Export Video
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// MCP Usage: Discovered UButton, USelect, USwitch, UFormField components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for page state management
// MCP Usage: Using TresJS for 3D scene rendering

import type { Scene } from '~/schemas/videoSpec';
import Scene3DViewer from '~/components/Scene3DViewer.vue';

definePageMeta({
  layout: 'default'
});

// Composables
const projectState = useProjectState();
const toast = useToast();

// Scene viewer ref for camera control
const sceneViewerRef = ref();

// State
const showSettings = ref(false);
const quality = ref('medium');
const cameraAngle = ref('perspective');
const showGrid = ref(true);
const isPlaying = ref(false);
const currentTime = ref(0);

// Animation loop for playback
let playbackAnimationFrame: number | null = null;

// Audio playback state
const audioSegments = computed(() => projectState.audioSegments.value || {});
const audioElements = ref<Map<string, HTMLAudioElement>>(new Map());
const activeAudioSegments = ref<Set<string>>(new Set());
const hasAudio = computed(() => Object.keys(audioSegments.value).length > 0);

// Get scenes from project state
const scenes = computed(() => projectState.videoSpec.value?.scenes || []);
const duration = computed(() => projectState.videoSpec.value?.duration_target || 120);

const hasScenes = computed(() => scenes.value.length > 0);

// Track current scene index for navigation
const currentSceneIndex = ref(0);

// Update scene index when time changes
watch(currentTime, (time) => {
  const index = scenes.value.findIndex(scene => 
    time >= scene.start && time < scene.end
  );
  if (index !== -1) {
    currentSceneIndex.value = index;
  }
}, { immediate: true });

// Update time when scene index changes
watch(currentSceneIndex, (index) => {
  const scene = scenes.value[index];
  if (scene) {
    currentTime.value = scene.start;
  }
});

const currentScene = computed(() => {
  return scenes.value[currentSceneIndex.value] || scenes.value.find(scene => 
    currentTime.value >= scene.start && currentTime.value < scene.end
  );
});

/**
 * Initialize audio elements for all segments
 */
function initializeAudioElements() {
  if (!process.client) return;
  
  // Clean up existing audio elements
  audioElements.value.forEach(audio => {
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();
  
  // Create audio elements for each segment
  Object.entries(audioSegments.value).forEach(([chunkId, segment]) => {
    // Validate segment path
    if (!segment.path || segment.path.trim() === '') {
      console.warn(`Skipping audio segment ${chunkId}: empty path`);
      return;
    }
    
    const audio = new Audio();
    
    // Set src after creating the element to avoid empty src errors
    try {
      audio.src = segment.path;
      audio.preload = 'auto';
      audio.volume = 1.0;
      
      // Handle audio end
      audio.addEventListener('ended', () => {
        activeAudioSegments.value.delete(chunkId);
      });
      
      // Handle audio errors - only log after src is set
      audio.addEventListener('error', (e) => {
        // Wait a tick to ensure error object is populated
        setTimeout(() => {
          const error = audio.error;
          if (error && error.code !== 0) {
            // Only log meaningful errors (not just loading issues)
            // MEDIA_ERR_ABORTED (0) and MEDIA_ERR_SRC_NOT_SUPPORTED (4) can be common
            if (error.code === 4 && !audio.src) {
              // Empty src - this shouldn't happen but handle gracefully
              console.warn(`Audio ${chunkId} has empty src, path was: ${segment.path}`);
            } else if (error.code !== 0 && error.code !== 4) {
              console.warn(`Audio error for ${chunkId}:`, {
                code: error.code,
                message: error.message || 'Unknown error',
                path: segment.path
              });
            }
          }
        }, 0);
        activeAudioSegments.value.delete(chunkId);
      });
      
      // Handle load errors more gracefully
      audio.addEventListener('loadstart', () => {
        // Audio started loading
      });
      
      audio.addEventListener('loadeddata', () => {
        // Audio data loaded successfully
      });
      
      audioElements.value.set(chunkId, audio);
    } catch (err) {
      console.warn(`Failed to create audio element for ${chunkId}:`, err);
    }
  });
  
  console.log(`Initialized ${audioElements.value.size} audio segments`);
}

/**
 * Get active audio segments at a given time
 */
function getActiveAudioSegments(time: number): Array<{ chunkId: string; segment: import('~/schemas/videoSpec').AudioSegment }> {
  return Object.entries(audioSegments.value)
    .filter(([_, segment]) => time >= segment.start && time < segment.end)
    .map(([chunkId, segment]) => ({ chunkId, segment }));
}

/**
 * Update audio playback based on current time
 */
function updateAudioPlayback(time: number) {
  if (!process.client || !hasAudio.value) return;
  
  const activeSegments = getActiveAudioSegments(time);
  const activeChunkIds = new Set(activeSegments.map(s => s.chunkId));
  
  // Stop segments that are no longer active
  activeAudioSegments.value.forEach(chunkId => {
    if (!activeChunkIds.has(chunkId)) {
      const audio = audioElements.value.get(chunkId);
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (err) {
          // Ignore errors when pausing/stopping
        }
        activeAudioSegments.value.delete(chunkId);
      }
    }
  });
  
  // Start/update segments that should be playing
  activeSegments.forEach(({ chunkId, segment }) => {
    const audio = audioElements.value.get(chunkId);
    if (!audio) return;
    
    // Calculate the offset within this segment (ensure it's not negative)
    const segmentOffset = Math.max(0, time - segment.start);
    const segmentDuration = segment.end - segment.start;
    
    // Ensure offset doesn't exceed segment duration
    const safeOffset = Math.min(segmentOffset, segmentDuration - 0.1);
    
    try {
      if (!activeAudioSegments.value.has(chunkId)) {
        // Start playing this segment
        // Wait for audio to be ready before setting currentTime
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          audio.currentTime = safeOffset;
          audio.play().catch(err => {
            // Only log if it's not a user-initiated play error
            if (err.name !== 'NotAllowedError') {
              console.warn(`Failed to play audio ${chunkId}:`, err);
            }
          });
          activeAudioSegments.value.add(chunkId);
        } else {
          // Wait for audio to load
          const onCanPlay = () => {
            audio.currentTime = safeOffset;
            audio.play().catch(() => {});
            activeAudioSegments.value.add(chunkId);
            audio.removeEventListener('canplay', onCanPlay);
          };
          audio.addEventListener('canplay', onCanPlay);
          audio.load(); // Trigger load if not already loading
        }
      } else {
        // Update playback position if needed (for seeking)
        // Only seek if the difference is significant to avoid constant seeking
        const expectedTime = safeOffset;
        if (Math.abs(audio.currentTime - expectedTime) > 0.5) {
          audio.currentTime = expectedTime;
        }
      }
    } catch (err) {
      // Ignore seek errors (e.g., when audio is not ready)
      console.warn(`Audio seek error for ${chunkId}:`, err);
    }
  });
}

/**
 * Stop all audio playback
 */
function stopAllAudio() {
  audioElements.value.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  activeAudioSegments.value.clear();
}

// Initialize audio when audio segments are available
watch(audioSegments, () => {
  if (hasAudio.value) {
    initializeAudioElements();
  } else {
    stopAllAudio();
  }
}, { immediate: true });

// Sync audio with play/pause state
watch(isPlaying, (playing) => {
  if (!hasAudio.value) return;
  
  if (playing) {
    // Start audio playback for current time
    updateAudioPlayback(currentTime.value);
  } else {
    // Pause all audio
    stopAllAudio();
  }
});

// Sync audio position with timeline during playback
watch(currentTime, (time) => {
  if (isPlaying.value && hasAudio.value) {
    updateAudioPlayback(time);
  }
});

// Animation loop function
function animatePlayback() {
  if (!isPlaying.value) return;
  
  // Update current time
  currentTime.value += 0.016; // ~60fps
  
  // Check if we've reached the end
  if (currentTime.value >= duration.value) {
    // Stop at end
    currentTime.value = duration.value;
    isPlaying.value = false;
    stopAllAudio();
    if (playbackAnimationFrame) {
      cancelAnimationFrame(playbackAnimationFrame);
      playbackAnimationFrame = null;
    }
    return;
  }
  
  // Continue animation
  playbackAnimationFrame = requestAnimationFrame(animatePlayback);
}

// Playback control functions
function togglePlay() {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    console.log('Starting playback...');
    // Start animation loop
    playbackAnimationFrame = requestAnimationFrame(animatePlayback);
  } else {
    console.log('Pausing playback...');
    // Stop animation loop
    if (playbackAnimationFrame) {
      cancelAnimationFrame(playbackAnimationFrame);
      playbackAnimationFrame = null;
    }
  }
}

function playPreview() {
  currentTime.value = 0;
  isPlaying.value = true;
  // Start animation loop
  if (playbackAnimationFrame) {
    cancelAnimationFrame(playbackAnimationFrame);
  }
  playbackAnimationFrame = requestAnimationFrame(animatePlayback);
}

function pauseOnSeek() {
  // Pause playback when user starts scrubbing
  if (isPlaying.value) {
    isPlaying.value = false;
    if (playbackAnimationFrame) {
      cancelAnimationFrame(playbackAnimationFrame);
      playbackAnimationFrame = null;
    }
  }
}

function seekTo() {
  // Seek to current time in animation
  // The Scene3DViewer will automatically update via :current-time prop
  console.log('Seeking to:', currentTime.value);
  
  // Update audio playback for the new time
  if (hasAudio.value) {
    updateAudioPlayback(currentTime.value);
  }
}

function jumpToScene(startTime: number) {
  currentTime.value = startTime;
  seekTo();
}

// Scene navigation functions
function previousScene() {
  if (currentSceneIndex.value > 0) {
    currentSceneIndex.value--;
  }
}

function nextScene() {
  if (currentSceneIndex.value < scenes.value.length - 1) {
    currentSceneIndex.value++;
  }
}

function resetCamera() {
  // Call resetCamera method on Scene3DViewer component
  if (sceneViewerRef.value?.resetCamera) {
    sceneViewerRef.value.resetCamera();
  }
}

function fullscreen() {
  // Enter fullscreen mode
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Cleanup on unmount
onUnmounted(() => {
  isPlaying.value = false;
  if (playbackAnimationFrame) {
    cancelAnimationFrame(playbackAnimationFrame);
    playbackAnimationFrame = null;
  }
  stopAllAudio();
  // Clean up audio elements
  audioElements.value.forEach(audio => {
    audio.pause();
    audio.src = '';
  });
  audioElements.value.clear();
});
</script>

