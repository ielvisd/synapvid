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

      <!-- Editor View Toggle -->
      <div class="flex gap-2">
        <UButton
          :variant="viewMode === 'visual' ? 'solid' : 'outline'"
          size="sm"
          @click="viewMode = 'visual'"
        >
          Visual Editor
        </UButton>
        <UButton
          :variant="viewMode === 'json' ? 'solid' : 'outline'"
          size="sm"
          @click="viewMode = 'json'"
        >
          JSON Editor
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

// MCP Usage: Discovered UButton, UInput, UTextarea, USelect, UBadge, UFormField, UAlert components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for page state management

definePageMeta({
  layout: 'default'
});

// Composables
const toast = useToast();

// State
const viewMode = ref<'visual' | 'json'>('visual');
const hasChanges = ref(false);
const validationErrors = ref<string[]>([]);
const jsonError = ref<string | null>(null);

// Mock spec data (in real app, this would come from state management)
const spec = reactive<VideoSpec>({
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
});

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

// Save changes
function saveChanges() {
  if (validateSpec()) {
    toast.add({
      title: 'Changes Saved',
      description: 'Your specification has been saved',
      color: 'success'
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

