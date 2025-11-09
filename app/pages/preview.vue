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
            :scene="currentScene"
            :style="projectState.videoSpec.value?.style"
            :show-controls="false"
            :enable-controls="true"
            :auto-play="isPlaying"
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
            />
          </div>
          <span class="text-sm tabular-nums">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
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

// State
const showSettings = ref(false);
const quality = ref('medium');
const cameraAngle = ref('perspective');
const showGrid = ref(true);
const isPlaying = ref(false);
const currentTime = ref(0);

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

// Playback control functions
function togglePlay() {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    // In real implementation, start animation loop
    console.log('Starting playback...');
  } else {
    console.log('Pausing playback...');
  }
}

function playPreview() {
  currentTime.value = 0;
  isPlaying.value = true;
}

function seekTo() {
  // Seek to current time in animation
  console.log('Seeking to:', currentTime.value);
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
  console.log('Resetting camera position');
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
});
</script>

