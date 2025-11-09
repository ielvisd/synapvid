<template>
  <div>
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold">Export Video</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Finalize and export your educational physics video
        </p>
      </div>

      <!-- Export Settings -->
      <div v-if="!videoAssembly.isLoading.value && !videoAssembly.finalVideoPath.value" class="space-y-4">
        <h2 class="text-xl font-semibold">Export Settings</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Resolution">
            <USelect v-model="settings.resolution" :items="resolutionOptions" />
          </UFormField>
          
          <UFormField label="Frame Rate">
            <USelect v-model="settings.fps" :items="fpsOptions" />
          </UFormField>
          
          <UFormField label="Video Quality">
            <USelect v-model="settings.quality" :items="qualityOptions" />
          </UFormField>
          
          <UFormField label="Include Subtitles">
            <USwitch v-model="settings.includeSubtitles" />
          </UFormField>
        </div>

        <div v-if="!canExport" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <UIcon name="i-lucide-alert-circle" class="inline w-4 h-4 mr-1" />
            Please generate a video spec and audio narration before exporting.
          </p>
        </div>
        <UButton
          size="lg"
          icon="i-lucide-download"
          :disabled="!canExport"
          @click="startExport"
        >
          Start Export
        </UButton>
      </div>

      <!-- Export Progress -->
      <div v-if="videoAssembly.isLoading.value" class="space-y-4">
        <div class="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">Exporting Video</h2>
            <UBadge color="primary" variant="soft">
              {{ videoAssembly.progress.value }}%
            </UBadge>
          </div>

          <!-- Progress Bar -->
          <UProgress
            :model-value="videoAssembly.progress.value"
            :max="100"
            size="lg"
            :color="videoAssembly.progress.value === 100 ? 'success' : 'primary'"
          />

          <!-- Status Message -->
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {{ videoAssembly.assemblyStatus.value }}
          </p>

          <!-- Animated Icon -->
          <div class="mt-6 flex justify-center">
            <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>

      <!-- Export Error -->
      <UAlert
        v-if="videoAssembly.error.value"
        color="error"
        variant="soft"
        title="Export Error"
        :description="videoAssembly.error.value"
        :close-button="{ icon: 'i-lucide-x' }"
        @close="videoAssembly.reset()"
      />

      <!-- Export Complete -->
      <div v-if="videoAssembly.finalVideoPath.value" class="space-y-4">
        <UAlert
          color="success"
          variant="soft"
          title="Export Complete!"
          description="Your video has been successfully exported and is ready to download."
        />

        <div class="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold mb-4">Download Files</h2>
          
          <div class="space-y-3">
            <!-- Video File -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-video" class="w-6 h-6 text-primary" />
                <div>
                  <p class="font-medium">Final Video</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">MP4 • 1080p • 30fps</p>
                </div>
              </div>
              <UButton
                size="sm"
                icon="i-lucide-download"
                @click="downloadFile(videoAssembly.finalVideoPath.value, 'video.mp4')"
              >
                Download
              </UButton>
            </div>

            <!-- Cues File -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-file-json" class="w-6 h-6 text-blue-500" />
                <div>
                  <p class="font-medium">Timing Cues</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">JSON • Scene timings</p>
                </div>
              </div>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-download"
                @click="downloadCues"
              >
                Download
              </UButton>
            </div>

            <!-- Transcript File -->
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-file-text" class="w-6 h-6 text-green-500" />
                <div>
                  <p class="font-medium">Transcript</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">TXT • Narration text</p>
                </div>
              </div>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-download"
                @click="downloadTranscript"
              >
                Download
              </UButton>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            to="/"
            variant="outline"
            icon="i-lucide-home"
          >
            Create New Video
          </UButton>
          <UButton
            variant="outline"
            icon="i-lucide-share-2"
            @click="shareVideo"
          >
            Share
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// MCP Usage: Discovered UButton, UProgress, UAlert, UFormField, USelect, USwitch components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for page state management

definePageMeta({
  layout: 'default'
});

// Composables
const toast = useToast();
const videoAssembly = useVideoAssembly();
const projectState = useProjectState();

// Export settings
const settings = reactive({
  resolution: '1920x1080',
  fps: 30,
  quality: 'high',
  includeSubtitles: true
});

const resolutionOptions = ['1920x1080', '1280x720', '3840x2160'];
const fpsOptions = [24, 30, 60];
const qualityOptions = ['low', 'medium', 'high', 'ultra'];

// Get video spec and audio segments from project state
const videoSpec = computed(() => projectState.videoSpec.value);
const audioSegments = computed(() => projectState.audioSegments.value || {});

// Check if we have the required data
const canExport = computed(() => {
  return videoSpec.value && 
         Object.keys(audioSegments.value).length > 0 &&
         videoSpec.value.scenes.length > 0;
});

// Start export process
async function startExport() {
  if (!canExport.value) {
    toast.add({
      title: 'Cannot Export',
      description: 'Please generate a video spec and audio narration first.',
      color: 'error'
    });
    return;
  }

  // Get actual audio paths from segments
  const audioPaths = Object.values(audioSegments.value)
    .map(segment => segment.path)
    .filter(path => path); // Filter out any empty paths

  if (audioPaths.length === 0) {
    toast.add({
      title: 'No Audio Found',
      description: 'Please generate audio narration before exporting.',
      color: 'error'
    });
    return;
  }

  // For now, we need visual clips - these would be generated from the 3D scenes
  // NOTE: The visual generation pipeline (Stage 3) that records 3D scenes to MP4 files
  // is not yet fully implemented. Currently using test clips as placeholders.
  // TODO: Implement visual generation that records Scene3DViewer output to MP4 files
  const clipPaths = videoSpec.value.scenes.map((_, index) => {
    // Use test clips as placeholders until visual generation is implemented
    // These are simple test files and may not match your scene content
    return `/clips/test_clip_${index % 2}.mp4`;
  });
  
  // Warn user about placeholder clips
  toast.add({
    title: 'Using Test Clips',
    description: 'Visual generation pipeline not yet implemented. Using placeholder clips. Video may not match your scenes.',
    color: 'warning',
    timeout: 5000
  });

  // Clone spec to avoid readonly issues
  const spec = JSON.parse(JSON.stringify(videoSpec.value));

  const result = await videoAssembly.assembleVideo(
    spec,
    audioPaths,
    clipPaths
  );

  if (result) {
    toast.add({
      title: 'Export Complete',
      description: 'Your video has been successfully exported!',
      color: 'success'
    });
  } else {
    toast.add({
      title: 'Export Failed',
      description: videoAssembly.error.value || 'An error occurred during export',
      color: 'error'
    });
  }
}

// Download file helper
function downloadFile(path: string | null, filename: string) {
  if (!path) return;

  const a = document.createElement('a');
  a.href = path;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  toast.add({
    title: 'Downloaded',
    description: `${filename} has been downloaded`,
    color: 'success'
  });
}

// Download cues file
function downloadCues() {
  // In real app, get cues from videoAssembly result
  const cues = { scenes: [], duration: 120 };
  const blob = new Blob([JSON.stringify(cues, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, 'cues.json');
  URL.revokeObjectURL(url);
}

// Download transcript
function downloadTranscript() {
  const transcript = 'Video Transcript\n\n[Generated content]';
  const blob = new Blob([transcript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, 'transcript.txt');
  URL.revokeObjectURL(url);
}

// Share video
function shareVideo() {
  if (navigator.share) {
    navigator.share({
      title: 'SynapVid Educational Video',
      text: 'Check out my physics video created with SynapVid!',
      url: window.location.href
    }).catch((err) => console.log('Share failed:', err));
  } else {
    // Fallback: copy link to clipboard
    navigator.clipboard.writeText(window.location.href);
    toast.add({
      title: 'Link Copied',
      description: 'Video link copied to clipboard',
      color: 'success'
    });
  }
}
</script>

