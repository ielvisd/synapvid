<template>
  <div>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Specification Editor</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Edit and fine-tune your video specification
          </p>
        </div>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            icon="i-lucide-eye"
            to="/preview"
          >
            Preview
          </UButton>
          <UButton
            icon="i-lucide-save"
            :disabled="!hasChanges"
            @click="saveChanges"
          >
            Save Changes
          </UButton>
        </div>
      </div>

      <!-- Workflow Steps -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <UButton
          :variant="viewMode === 'visual' ? 'solid' : 'outline'"
          size="sm"
          @click="viewMode = 'visual'"
        >
          <template #leading>
            <UIcon name="i-lucide-edit" />
          </template>
          1. Edit Spec
        </UButton>
        <UIcon name="i-lucide-chevron-right" class="text-gray-400" />
        <UButton
          :variant="viewMode === 'narration' ? 'solid' : 'outline'"
          size="sm"
          @click="viewMode = 'narration'"
        >
          <template #leading>
            <UIcon name="i-lucide-mic" />
          </template>
          2. Generate Audio
        </UButton>
        <UIcon name="i-lucide-chevron-right" class="text-gray-400" />
        <UButton
          :variant="viewMode === 'json' ? 'solid' : 'outline'"
          size="sm"
          @click="viewMode = 'json'"
        >
          <template #leading>
            <UIcon name="i-lucide-code" />
          </template>
          3. Review JSON
        </UButton>
      </div>

      <!-- Visual Editor -->
      <div v-if="viewMode === 'visual'" class="space-y-4">
        <!-- Global Settings -->
        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold mb-4">Global Settings</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UFormField label="Duration Target (seconds)">
              <UInput v-model.number="spec.duration_target" type="number" min="80" max="180" />
            </UFormField>
            <UFormField label="Voice">
              <USelect v-model="spec.style.voice" :items="voiceOptions" />
            </UFormField>
            <UFormField label="Primary Color">
              <UInput v-model="spec.style.colors.primary" type="text" placeholder="#F59E0B" />
            </UFormField>
          </div>
        </div>

        <!-- Scenes List -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Scenes</h2>
            <UButton
              size="sm"
              icon="i-lucide-plus"
              @click="addScene"
            >
              Add Scene
            </UButton>
          </div>

          <!-- Scene Cards -->
          <div
            v-for="(scene, index) in spec.scenes"
            :key="index"
            class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <UBadge>Scene {{ index + 1 }}</UBadge>
                <USelect v-model="scene.type" :items="sceneTypes" />
              </div>
              <div class="flex gap-2">
                <UButton
                  size="sm"
                  variant="ghost"
                  icon="i-lucide-arrow-up"
                  :disabled="index === 0"
                  @click="moveScene(index, -1)"
                />
                <UButton
                  size="sm"
                  variant="ghost"
                  icon="i-lucide-arrow-down"
                  :disabled="index === spec.scenes.length - 1"
                  @click="moveScene(index, 1)"
                />
                <UButton
                  size="sm"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  @click="deleteScene(index)"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
              <UFormField label="Start Time (s)">
                <UInput v-model.number="scene.start" type="number" min="0" />
              </UFormField>
              <UFormField label="End Time (s)">
                <UInput v-model.number="scene.end" type="number" min="0" />
              </UFormField>
            </div>

            <UFormField label="Narration">
              <UTextarea
                v-model="narrationText[index]"
                :rows="3"
                placeholder="Enter narration text..."
                @input="updateNarration(index)"
              />
            </UFormField>

            <div class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">Events ({{ scene.events.length }})</span>
                <UButton
                  size="xs"
                  variant="outline"
                  icon="i-lucide-plus"
                  @click="addEvent(index)"
                >
                  Add Event
                </UButton>
              </div>
              <div v-if="scene.events.length === 0" class="text-sm text-gray-500 italic">
                No events yet
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Narration Synthesis View -->
      <div v-else-if="viewMode === 'narration'" class="space-y-6">
        <UAlert
          icon="i-lucide-info"
          color="info"
          title="Narration Synthesis"
          description="Generate AI voice narration for your video specification. This will create audio files for each narration chunk."
        />

        <!-- Narration Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Total Chunks</div>
            <div class="text-2xl font-bold">{{ totalNarrationChunks }}</div>
          </div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Voice</div>
            <div class="text-2xl font-bold capitalize">{{ spec.style.voice }}</div>
          </div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Progress</div>
            <div class="text-2xl font-bold">{{ narrationSynthesis.progress.value }}%</div>
          </div>
        </div>

        <!-- Synthesis Controls -->
        <div class="flex gap-3">
          <UButton
            icon="i-lucide-mic"
            :loading="narrationSynthesis.isLoading.value"
            :disabled="narrationSynthesis.isLoading.value"
            @click="synthesizeAudio"
          >
            <ClientOnly fallback="Generate Narration">
              {{ Object.keys(narrationSynthesis.audioSegments.value).length > 0 ? 'Regenerate' : 'Generate' }} Narration
            </ClientOnly>
          </UButton>
          <ClientOnly>
            <UButton
              v-if="Object.keys(narrationSynthesis.audioSegments.value).length > 0"
              variant="outline"
              icon="i-lucide-file-json"
              @click="downloadAudioSegments"
            >
              Export Metadata (JSON)
            </UButton>
          </ClientOnly>
        </div>

        <!-- Progress Bar -->
        <UProgress
          v-if="narrationSynthesis.isLoading.value"
          :value="narrationSynthesis.progress.value"
          :max="100"
          animation="carousel"
          color="primary"
        />

        <!-- Audio Preview -->
        <ClientOnly>
          <AudioPreview
            v-if="Object.keys(narrationSynthesis.audioSegments.value).length > 0"
            :segments="narrationSynthesis.audioSegments.value"
          />
        </ClientOnly>

        <!-- Error Display -->
        <UAlert
          v-if="narrationSynthesis.error.value"
          color="error"
          icon="i-lucide-alert-circle"
          :title="'Synthesis Error'"
          :description="narrationSynthesis.error.value"
        />
      </div>

      <!-- JSON Editor -->
      <div v-else class="space-y-4">
        <UAlert
          icon="i-lucide-info"
          title="Direct JSON Editing"
          description="Edit the raw JSON specification. Be careful to maintain valid JSON format."
        />

        <div class="relative">
          <UTextarea
            v-model="jsonText"
            :rows="25"
            class="font-mono text-sm"
            @input="validateJSON"
          />
          <div v-if="jsonError" class="mt-2">
            <UAlert
              color="error"
              :title="'Invalid JSON'"
              :description="jsonError"
            />
          </div>
        </div>

        <UButton
          icon="i-lucide-check"
          :disabled="!!jsonError"
          @click="applyJSON"
        >
          Apply Changes
        </UButton>
      </div>

      <!-- Validation Errors -->
      <UAlert
        v-if="validationErrors.length > 0"
        color="warning"
        title="Validation Issues"
        :description="`Found ${validationErrors.length} issue(s) with the specification`"
      >
        <template #description>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="(err, idx) in validationErrors" :key="idx" class="text-sm">
              {{ err }}
            </li>
          </ul>
        </template>
      </UAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VideoSpecSchema, type VideoSpec } from '~/schemas/videoSpec';
import AudioPreview from '~/components/AudioPreview.vue';

// MCP Usage: Discovered UButton, UInput, UTextarea, USelect, UBadge, UFormField, UAlert, UProgress components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for page state management and narration synthesis

definePageMeta({
  layout: 'default'
});

// Composables
const toast = useToast();
const narrationSynthesis = useNarrationSynthesis();
const projectState = useProjectState();

// State
const viewMode = ref<'visual' | 'narration' | 'json'>('visual');
const hasChanges = ref(false);
const validationErrors = ref<string[]>([]);
const jsonError = ref<string | null>(null);

// Get spec from project state or create default
// Clone to avoid readonly issues
const initialSpec: VideoSpec = projectState.videoSpec.value 
  ? JSON.parse(JSON.stringify(projectState.videoSpec.value))
  : {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 15,
          narration: ['Welcome to our physics demonstration'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: {
          primary: '#F59E0B'
        },
        transitions: 0.3
      }
    };

const spec = reactive<VideoSpec>(initialSpec);

// Watch for changes and auto-save
watch(spec, () => {
  hasChanges.value = true;
}, { deep: true });

// Options
const voiceOptions = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const sceneTypes = ['intro', 'skill1', 'skill2', 'summary'];

// Narration text helpers
const narrationText = reactive<Record<number, string>>({});

// Initialize narration text
spec.scenes.forEach((scene, index) => {
  narrationText[index] = scene.narration.join('\n');
});

// JSON text for JSON editor mode
const jsonText = computed({
  get: () => JSON.stringify(spec, null, 2),
  set: (value: string) => {
    // Will be updated via applyJSON
  }
});

// Update narration array from text
function updateNarration(index: number) {
  const scene = spec.scenes[index];
  const text = narrationText[index];
  if (!scene || !text) return;
  
  scene.narration = text
    .split('\n')
    .filter(line => line.trim());
  hasChanges.value = true;
}

// Scene management
function addScene() {
  const lastScene = spec.scenes[spec.scenes.length - 1];
  const newStart = lastScene ? lastScene.end : 0;
  
  spec.scenes.push({
    type: 'skill1',
    start: newStart,
    end: newStart + 30,
    narration: ['New scene narration'],
    events: []
  });
  
  narrationText[spec.scenes.length - 1] = 'New scene narration';
  hasChanges.value = true;
}

function deleteScene(index: number) {
  spec.scenes.splice(index, 1);
  hasChanges.value = true;
}

function moveScene(index: number, direction: number) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < spec.scenes.length) {
    const temp = spec.scenes[index];
    const target = spec.scenes[newIndex];
    if (!temp || !target) return;
    
    spec.scenes[index] = target;
    spec.scenes[newIndex] = temp;
    hasChanges.value = true;
  }
}

function addEvent(sceneIndex: number) {
  const scene = spec.scenes[sceneIndex];
  if (!scene) return;
  
  scene.events.push({
    t: scene.start,
    action: 'reveal_text',
    params: {}
  });
  hasChanges.value = true;
}

// Validation
function validateSpec() {
  try {
    VideoSpecSchema.parse(spec);
    validationErrors.value = [];
    return true;
  } catch (err: any) {
    if (err.errors) {
      validationErrors.value = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`);
    } else {
      validationErrors.value = [err.message];
    }
    return false;
  }
}

// JSON editor functions
function validateJSON() {
  try {
    JSON.parse(jsonText.value);
    jsonError.value = null;
  } catch (err: any) {
    jsonError.value = err.message;
  }
}

function applyJSON() {
  try {
    const parsed = JSON.parse(jsonText.value);
    Object.assign(spec, parsed);
    toast.add({
      title: 'JSON Applied',
      description: 'Changes have been applied from JSON',
      color: 'success'
    });
  } catch (err: any) {
    toast.add({
      title: 'Invalid JSON',
      description: err.message,
      color: 'error'
    });
  }
}

// Narration synthesis functions
const totalNarrationChunks = computed(() => {
  return spec.scenes.reduce((sum, scene) => sum + scene.narration.length, 0);
});

function getChunkText(chunkId: string): string {
  // Parse chunkId like "scene0_chunk0" to get scene and chunk indices
  const match = chunkId.match(/scene(\d+)_chunk(\d+)/);
  if (!match || !match[1] || !match[2]) return '';
  
  const sceneIndex = parseInt(match[1]);
  const chunkIndex = parseInt(match[2]);
  
  const scene = spec.scenes[sceneIndex];
  if (!scene) return '';
  
  return scene.narration[chunkIndex] || '';
}

async function synthesizeAudio() {
  const result = await narrationSynthesis.synthesizeNarration(spec);
  
  if (result) {
    // Save audio segments to project state
    projectState.updateAudioSegments(result);
    
    toast.add({
      title: 'Success!',
      description: `Generated ${Object.keys(result).length} audio segments`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    });
    
    // Update spec with audio segments
    const updatedSpec = narrationSynthesis.updateSpecWithTimestamps(spec, result);
    Object.assign(spec, updatedSpec);
    projectState.updateVideoSpec(spec);
    hasChanges.value = false;
  } else {
    toast.add({
      title: 'Synthesis Failed',
      description: narrationSynthesis.error.value || 'Failed to generate narration',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  }
}

function downloadAudioSegments() {
  // Create a JSON file with all audio segment paths
  const segments = narrationSynthesis.audioSegments.value;
  const blob = new Blob([JSON.stringify(segments, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audio-segments.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.add({
    title: 'Downloaded!',
    description: 'Audio segments metadata downloaded',
    color: 'success'
  });
}

// Save changes
function saveChanges() {
  if (validateSpec()) {
    // Save to project state
    projectState.updateVideoSpec(spec);
    
    toast.add({
      title: 'Changes Saved',
      description: 'Your specification has been saved',
      color: 'success',
      icon: 'i-lucide-check'
    });
    hasChanges.value = false;
  } else {
    toast.add({
      title: 'Validation Failed',
      description: 'Please fix validation errors before saving',
      color: 'error'
    });
  }
}

// Watch for changes
watch(spec, () => {
  hasChanges.value = true;
}, { deep: true });
</script>

