<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Audio Narration Preview</h3>
      <div class="flex items-center gap-2">
        <UBadge v-if="syncValidation" :color="syncValidation.valid ? 'success' : 'warning'">
          {{ syncValidation.valid ? 'Sync Valid' : 'Sync Issues' }}
        </UBadge>
        <UButton
          v-if="segments && Object.keys(segments).length > 0"
          size="sm"
          variant="outline"
          icon="i-lucide-download"
          @click="downloadAll"
        >
          Download All
        </UButton>
      </div>
    </div>

    <!-- Sync Validation Errors -->
    <UAlert
      v-if="syncValidation && !syncValidation.valid"
      color="warning"
      variant="soft"
      title="Sync Validation Issues"
      :description="`Found ${syncValidation.errors.length} issue(s)`"
    >
      <template #description>
        <ul class="list-disc list-inside space-y-1 mt-2">
          <li v-for="(err, idx) in syncValidation.errors" :key="idx" class="text-sm">
            {{ err }}
          </li>
        </ul>
      </template>
    </UAlert>

    <!-- Audio Segments List -->
    <div v-if="segments && Object.keys(segments).length > 0" class="space-y-3">
      <div
        v-for="(segment, id) in segments"
        :key="id"
        class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <UBadge size="sm" variant="soft">{{ id }}</UBadge>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ segment.start.toFixed(2) }}s - {{ segment.end.toFixed(2) }}s
              ({{ (segment.end - segment.start).toFixed(2) }}s)
            </span>
          </div>
          <UButton
            size="sm"
            variant="ghost"
            icon="i-lucide-download"
            @click="downloadSegment(segment.path, id)"
          />
        </div>

        <!-- Audio Player -->
        <div class="flex items-center gap-3">
          <UButton
            :icon="playingSegment === id ? 'i-lucide-pause' : 'i-lucide-play'"
            size="sm"
            @click="togglePlay(id, segment.path)"
          />
          
          <!-- Waveform visualization placeholder -->
          <div class="flex-1 h-12 bg-gray-100 dark:bg-gray-900 rounded relative overflow-hidden">
            <div
              v-if="playingSegment === id && currentTime > 0"
              class="absolute inset-y-0 left-0 bg-primary/20"
              :style="{ width: `${(currentTime / audioDuration) * 100}%` }"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-xs text-gray-500">
                {{ playingSegment === id ? formatTime(currentTime) : '00:00' }} / 
                {{ playingSegment === id ? formatTime(audioDuration) : formatTime(segment.end - segment.start) }}
              </span>
            </div>
          </div>

          <!-- Volume Control -->
          <div class="flex items-center gap-2 w-32">
            <UIcon name="i-lucide-volume-2" class="text-gray-500" />
            <input
              v-model.number="volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-gray-500">
      <UIcon name="i-lucide-audio-lines" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <p>No audio segments available</p>
      <p class="text-sm mt-1">Generate narration to preview audio</p>
    </div>

    <!-- Hidden Audio Element -->
    <audio
      ref="audioRef"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @loadedmetadata="onLoadedMetadata"
    />
  </div>
</template>

<script setup lang="ts">
import type { AudioSegment } from '~/schemas/videoSpec';

// MCP Usage: Discovered UButton, UBadge, UAlert, UIcon components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for component state

interface Props {
  segments: Record<string, AudioSegment> | null;
  syncValidation?: {valid: boolean; errors: string[] } | null;
}

const props = defineProps<Props>();

// Audio playback state
const audioRef = ref<HTMLAudioElement | null>(null);
const playingSegment = ref<string | null>(null);
const currentTime = ref(0);
const audioDuration = ref(0);
const volume = ref(0.8);

// Watch volume changes
watch(volume, (newVolume) => {
  if (audioRef.value) {
    audioRef.value.volume = newVolume;
  }
});

// Toggle play/pause for a segment
function togglePlay(segmentId: string, path: string) {
  if (!audioRef.value) return;

  if (playingSegment.value === segmentId) {
    // Pause current segment
    audioRef.value.pause();
    playingSegment.value = null;
  } else {
    // Play new segment
    audioRef.value.src = path;
    audioRef.value.volume = volume.value;
    audioRef.value.play();
    playingSegment.value = segmentId;
  }
}

// Audio event handlers
function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
}

function onEnded() {
  playingSegment.value = null;
  currentTime.value = 0;
}

function onLoadedMetadata() {
  if (audioRef.value) {
    audioDuration.value = audioRef.value.duration;
  }
}

// Format time in MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Download a single segment
function downloadSegment(path: string, id: string) {
  const a = document.createElement('a');
  a.href = path;
  a.download = `${id}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Download all segments (would need to be zipped)
function downloadAll() {
  // For now, just download the first segment as an example
  // In a real implementation, we'd zip all files or create a playlist
  if (props.segments) {
    const firstSegment = Object.values(props.segments)[0];
    if (firstSegment) {
      downloadSegment(firstSegment.path, 'all_audio');
    }
  }
}

// Cleanup audio on unmount
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.src = '';
  }
});
</script>

