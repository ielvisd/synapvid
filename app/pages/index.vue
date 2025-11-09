<template>
  <div>
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-4xl font-bold">Generate Educational Video</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Enter a prompt to generate a structured video specification for physics education
          </p>
        </div>
        <ClientOnly>
          <UButton
            v-if="generatedSpec"
            variant="outline"
            icon="i-lucide-plus"
            @click="startNewProject"
          >
            New Project
          </UButton>
        </ClientOnly>
      </div>

      <!-- Prompt Form -->
      <ClientOnly>
        <UForm 
          :schema="PromptInputSchema" 
          :state="formState" 
          class="space-y-6"
          @submit="onSubmit"
        >
          <!-- Main Prompt -->
          <UFormField 
            label="Video Prompt" 
            name="prompt" 
            required
            help="Describe the physics concept you want to explain (e.g., 'Explain Newton's First Law with a rocket example')"
          >
            <UTextarea
              v-model="formState.prompt"
              placeholder="e.g., Explain Newton's First Law with a rocket example"
              :rows="4"
              autoresize
            />
          </UFormField>

          <!-- Learning Objectives -->
          <UFormField
            label="Learning Objectives (Optional)"
            name="learningObjectives"
            help="Add specific learning goals, one per line"
          >
            <UTextarea
              v-model="learningObjectivesText"
              placeholder="e.g., Understand the concept of inertia&#10;Relate Newton's First Law to real-world examples"
              :rows="3"
            />
          </UFormField>

          <!-- Examples -->
          <UFormField
            label="Real-World Examples (Optional)"
            name="examples"
            help="Add specific examples to include, one per line"
          >
            <UTextarea
              v-model="examplesText"
              placeholder="e.g., Hockey puck sliding on ice&#10;Rocket in space"
              :rows="3"
            />
          </UFormField>

          <!-- Submit Button -->
          <div class="flex gap-3">
            <UButton 
              type="submit" 
              :loading="promptExpansion.isLoading.value"
              :disabled="promptExpansion.isLoading.value"
            >
              Generate Video Spec
            </UButton>
            <UButton 
              v-if="generatedSpec"
              variant="outline"
              @click="navigateTo('/editor')"
            >
              Edit in Editor
            </UButton>
          </div>
        </UForm>
      </ClientOnly>

      <!-- Generated Spec Display -->
      <ClientOnly>
        <div v-if="generatedSpec" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Generated Video Specification</h2>
          <div class="flex gap-2">
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-copy"
              @click="copySpec"
            >
              Copy JSON
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-download"
              @click="downloadSpec"
            >
              Download
            </UButton>
          </div>
        </div>

        <!-- Spec Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Duration Target</div>
            <div class="text-2xl font-bold">{{ generatedSpec.duration_target }}s</div>
          </div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Scenes</div>
            <div class="text-2xl font-bold">{{ generatedSpec.scenes.length }}</div>
          </div>
          <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">Voice</div>
            <div class="text-2xl font-bold capitalize">{{ generatedSpec.style.voice }}</div>
          </div>
        </div>

        <!-- JSON Display -->
        <div class="relative">
          <pre class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto max-h-96 text-sm">{{ JSON.stringify(generatedSpec, null, 2) }}</pre>
        </div>

        <!-- Next Steps -->
        <div class="flex gap-3">
          <UButton
            icon="i-lucide-volume-2"
            color="primary"
            :loading="narrationSynthesis.isLoading.value"
            :disabled="narrationSynthesis.isLoading.value"
            @click="synthesizeNarration"
          >
            {{ narrationSynthesis.audioSegments.value && Object.keys(narrationSynthesis.audioSegments.value).length > 0 ? 'Regenerate' : 'Generate' }} Narration
          </UButton>
          <UButton
            to="/editor"
            icon="i-lucide-edit"
            variant="outline"
          >
            Edit Specification
          </UButton>
          <UButton
            variant="outline"
            icon="i-lucide-play"
            @click="navigateTo('/preview')"
          >
            Preview 3D Scenes
          </UButton>
        </div>

        <!-- Audio Preview -->
        <AudioPreview 
          v-if="narrationSynthesis.audioSegments.value && Object.keys(narrationSynthesis.audioSegments.value).length > 0"
          :segments="narrationSynthesis.audioSegments.value"
        />
      </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PromptInputSchema, type PromptInput, type VideoSpec } from '~/schemas/videoSpec';
import type { FormSubmitEvent } from '@nuxt/ui';

// MCP Usage: Discovered UForm, UInput, UTextarea, UButton, Toast, AudioPreview components via nuxt-ui MCP
// MCP Usage: Using vue-app-mcp composable patterns for state management and useToast for notifications

definePageMeta({
  layout: 'default'
});

// Composables
const toast = useToast();
const promptExpansion = usePromptExpansion();
const narrationSynthesis = useNarrationSynthesis();
const projectState = useProjectState();

// Form state
const formState = reactive<Partial<PromptInput>>({
  prompt: '',
  learningObjectives: [],
  examples: []
});

// Text area helpers for array inputs
const learningObjectivesText = computed({
  get: () => formState.learningObjectives?.join('\n') || '',
  set: (value: string) => {
    formState.learningObjectives = value.split('\n').filter(line => line.trim());
  }
});

const examplesText = computed({
  get: () => formState.examples?.join('\n') || '',
  set: (value: string) => {
    formState.examples = value.split('\n').filter(line => line.trim());
  }
});

// Generated spec - use project state if available, otherwise use promptExpansion
const generatedSpec = computed(() => projectState.videoSpec.value || promptExpansion.generatedSpec.value);

// Form submission
async function onSubmit(event: FormSubmitEvent<PromptInput>) {
  console.log('Submitting prompt:', event.data);
  
  const result = await promptExpansion.expandPrompt(event.data);
  
  if (result) {
    // Save to project state
    projectState.updateVideoSpec(result);
    
    toast.add({
      title: 'Success!',
      description: 'Video specification generated successfully',
      icon: 'i-lucide-check-circle',
      color: 'success'
    });
  } else {
    // Show error toast with retry action
    toast.add({
      title: 'Generation Failed',
      description: promptExpansion.error.value || 'Failed to generate specification',
      icon: 'i-lucide-alert-circle',
      color: 'error',
      actions: [{
        label: 'Retry',
        icon: 'i-lucide-refresh-cw',
        color: 'error',
        variant: 'outline',
        onClick: () => onSubmit(event)
      }]
    });
  }
}

// Copy spec to clipboard
async function copySpec() {
  if (!generatedSpec.value) return;
  
  try {
    await navigator.clipboard.writeText(JSON.stringify(generatedSpec.value, null, 2));
    toast.add({
      title: 'Copied!',
      description: 'Specification copied to clipboard',
      color: 'success'
    });
  } catch (err) {
    toast.add({
      title: 'Error',
      description: 'Failed to copy to clipboard',
      color: 'error'
    });
  }
}

// Download spec as JSON file
function downloadSpec() {
  if (!generatedSpec.value) return;
  
  const blob = new Blob([JSON.stringify(generatedSpec.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'video-spec.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.add({
    title: 'Downloaded!',
    description: 'Specification downloaded as video-spec.json',
    color: 'success'
  });
}

// Start new project
function startNewProject() {
  if (confirm('Are you sure you want to start a new project? Any unsaved changes will be lost.')) {
    projectState.clearProject();
    promptExpansion.reset();
    narrationSynthesis.reset();
    
    // Clear form
    formState.prompt = '';
    formState.learningObjectives = [];
    formState.examples = [];
    
    toast.add({
      title: 'New Project',
      description: 'Started a new project',
      icon: 'i-lucide-plus',
      color: 'info'
    });
  }
}

// Synthesize narration from generated spec
async function synthesizeNarration() {
  if (!generatedSpec.value) return;
  
  console.log('Starting narration synthesis...');
  
  // Clone the spec to avoid readonly issues
  const specClone = JSON.parse(JSON.stringify(generatedSpec.value)) as VideoSpec;
  const result = await narrationSynthesis.synthesizeNarration(specClone);
  
  if (result) {
    const segmentCount = Object.keys(result).length;
    toast.add({
      title: 'Success!',
      description: `Generated ${segmentCount} audio segments`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    });
  } else {
    toast.add({
      title: 'Narration Failed',
      description: narrationSynthesis.error.value || 'Failed to synthesize narration',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    });
  }
}
</script>

