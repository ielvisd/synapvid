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
          <UButton
            variant="outline"
            icon="i-lucide-play"
            :disabled="!hasScenes"
            @click="playPreview"
          >
            Play
          </UButton>
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
      <div class="relative bg-gray-900 rounded-lg overflow-hidden" style="height: 500px;">
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

        <!-- TresJS Canvas Placeholder -->
        <div v-else class="w-full h-full flex items-center justify-center">
          <div class="text-white text-center">
            <div class="mb-4">
              <div class="inline-block w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <p class="text-lg">Loading 3D Scene...</p>
            <p class="text-sm text-gray-400 mt-2">TresJS canvas will render here</p>
          </div>
        </div>

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

      <!-- Timeline Scrubber -->
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

      <!-- Scene Info -->
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

import type { Scene } from '~/schemas/videoSpec';

definePageMeta({
  layout: 'default'
});

// State
const showSettings = ref(false);
const quality = ref('medium');
const cameraAngle = ref('perspective');
const showGrid = ref(true);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(120); // Default 2 minutes

// Mock scenes data (in real app, this would come from the video spec)
const scenes = ref<Scene[]>([
  {
    type: 'intro',
    start: 0,
    end: 15,
    narration: ['Welcome to our physics demonstration'],
    events: []
  },
  {
    type: 'skill1',
    start: 15,
    end: 60,
    narration: ['Let\'s explore Newton\'s First Law'],
    events: []
  },
  {
    type: 'skill2',
    start: 60,
    end: 105,
    narration: ['Now for some real-world examples'],
    events: []
  },
  {
    type: 'summary',
    start: 105,
    end: 120,
    narration: ['To summarize what we\'ve learned'],
    events: []
  }
]);

const hasScenes = computed(() => scenes.value.length > 0);

const currentScene = computed(() => {
  return scenes.value.find(scene => 
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

