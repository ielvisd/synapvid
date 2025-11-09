<template>
  <div ref="containerRef" class="scene-viewer-container">
    <!-- Only render canvas if we have a scene -->
    <TresCanvas
      v-if="scene && containerSize.width > 0"
      v-bind="canvasConfig"
      :width="containerSize.width"
      :height="containerSize.height"
      class="w-full h-full"
    >
      <!-- Scene Setup -->
      <TresPerspectiveCamera
        :position="[0, 5, 10]"
        :look-at="[0, 0, 0]"
      />
      
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight
        :position="[5, 5, 5]"
        :intensity="0.8"
        cast-shadow
      />

      <!-- Scene Content -->
      <TresGroup ref="sceneGroup">
        <!-- Ground Plane (Ice Rink for Hockey Puck example) -->
        <TresMesh
          :position="[0, 0, 0]"
          :rotation="[-Math.PI / 2, 0, 0]"
          receive-shadow
        >
          <TresPlaneGeometry :args="[20, 20]" />
          <TresMeshStandardMaterial
            :color="groundColor"
            :roughness="0.1"
            :metalness="0.8"
          />
        </TresMesh>

        <!-- Grid Helper -->
        <TresGridHelper
          :args="[20, 20, '#888888', '#444444']"
          :position="[0, 0.01, 0]"
        />

        <!-- Dynamic Scene Objects (will be populated from spec) -->
        <template v-for="(object, index) in sceneObjects" :key="index">
          <!-- Hockey Puck -->
          <TresMesh
            v-if="object.type === 'puck'"
            ref="puckRef"
            :position="object.position"
            cast-shadow
          >
            <TresCylinderGeometry :args="[0.4, 0.4, 0.15, 32]" />
            <TresMeshStandardMaterial :color="object.color || '#1a1a1a'" />
          </TresMesh>

          <!-- 3D Vector Arrow -->
          <TresArrowHelper
            v-if="object.type === 'vector'"
            :dir="object.direction"
            :origin="object.position"
            :length="object.length || 2"
            :color="object.color || '#ff0000'"
            :headLength="0.3"
            :headWidth="0.2"
          />

          <!-- 3D Text (placeholder - Text3D requires additional setup) -->
          <!-- TODO: Add proper 3D text rendering with troika-three-text or TextGeometry -->
          <TresGroup
            v-if="object.type === 'text'"
            :position="object.position"
          >
            <!-- Placeholder for text - will implement with proper text rendering later -->
          </TresGroup>
        </template>
      </TresGroup>

      <!-- Orbit Controls for Preview -->
      <!-- TODO: Add OrbitControls after extending TresJS catalog with controls -->
      <!-- For now, camera controls are handled via manual camera updates -->
    </TresCanvas>
    
    <!-- Fallback when no scene -->
    <div v-else class="flex items-center justify-center h-full text-gray-400">
      <div class="text-center">
        <p class="text-sm">No scene data available</p>
        <p class="text-xs mt-1">Generate a video spec first</p>
      </div>
    </div>

    <!-- Playback Controls Overlay -->
    <div
      v-if="showControls"
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4"
    >
      <UButton
        :icon="isPlaying ? 'i-lucide-pause' : 'i-lucide-play'"
        size="sm"
        @click="togglePlayback"
      />
      <UButton
        icon="i-lucide-skip-back"
        size="sm"
        variant="ghost"
        @click="resetAnimation"
      />
      <div class="flex items-center gap-2 min-w-[200px]">
        <span class="text-xs text-white">{{ formatTime(currentTime) }}</span>
        <input
          v-model.number="currentTime"
          type="range"
          :min="0"
          :max="duration"
          :step="0.1"
          class="flex-1"
          @input="onTimelineSeek"
        />
        <span class="text-xs text-white">{{ formatTime(duration) }}</span>
      </div>
      <UButton
        v-if="onRecord"
        icon="i-lucide-video"
        size="sm"
        color="red"
        @click="onRecord"
      >
        Record
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import type { Scene, VisualEvent } from '~/schemas/videoSpec';

// MCP Usage: Using TresJS components from vue3 ecosystem for 3D rendering

const props = defineProps<{
  scene?: Scene;
  style?: {
    colors: {
      primary: string;
      accent?: string;
      background?: string;
    };
  };
  showControls?: boolean;
  enableControls?: boolean;
  autoPlay?: boolean;
  onRecord?: () => void;
}>();

// Canvas configuration
const canvasConfig = {
  clearColor: '#1a1a1a',
  shadows: true,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance'
};

// Container ref for size tracking
const containerRef = ref<HTMLElement | null>(null);
const containerSize = ref({ width: 500, height: 500 });

// Measure container size on mount and resize
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  
  const updateSize = () => {
    if (containerRef.value) {
      containerSize.value = {
        width: containerRef.value.clientWidth || 500,
        height: containerRef.value.clientHeight || 500
      };
    }
  };
  
  updateSize();
  
  // Watch for resize
  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Scene state
const sceneGroup = ref();
const puckRef = ref();
const isPlaying = ref(props.autoPlay || false);
const currentTime = ref(0);
const duration = computed(() => props.scene ? props.scene.end - props.scene.start : 10);

// Scene objects (will be populated from visual events)
const sceneObjects = ref<Array<{
  type: 'puck' | 'vector' | 'text' | 'equation';
  position: [number, number, number];
  direction?: [number, number, number];
  length?: number;
  color?: string;
  text?: string;
  size?: number;
}>>([]);

// Ground color based on style
const groundColor = computed(() => {
  return props.style?.colors?.primary || '#e3f2fd';
});

// Initialize scene objects from visual events
watchEffect(() => {
  if (!props.scene) return;
  
  // Start with default objects
  const objects: typeof sceneObjects.value = [];
  
  // Check if we have a puck animation (hockey puck example)
  const hasPuck = props.scene.events?.some(e => e.action === 'animate_puck_3d');
  if (hasPuck) {
    objects.push({
      type: 'puck',
      position: [0, 0.1, 0],
      color: '#1a1a1a'
    });
  }
  
  // Parse visual events at t=0 for initial setup
  props.scene.events?.forEach(event => {
    if (event.t === 0) {
      if (event.action === 'animate_vector_3d') {
        const dir = event.params?.direction as [number, number, number] || [1, 0, 0];
        objects.push({
          type: 'vector',
          position: [0, 1, 0],
          direction: dir,
          length: 2,
          color: event.color || props.style?.colors?.accent || '#ff0000'
        });
      }
      
      if (event.action === 'reveal_text' && event.text) {
        objects.push({
          type: 'text',
          position: [0, 3, 0],
          text: event.text,
          color: event.color || '#ffffff',
          size: 0.5
        });
      }
    }
  });
  
  sceneObjects.value = objects;
});

// Animation loop
let animationFrameId: number;

const animate = () => {
  if (!isPlaying.value) return;
  
  currentTime.value += 0.016; // ~60fps
  
  if (currentTime.value >= duration.value) {
    currentTime.value = duration.value;
    isPlaying.value = false;
    return;
  }
  
  // Update scene based on current time and visual events
  updateSceneAtTime(currentTime.value);
  
  animationFrameId = requestAnimationFrame(animate);
};

// Update scene objects based on current time
const updateSceneAtTime = (time: number) => {
  if (!props.scene?.events) return;
  
  // Apply visual events at current time
  props.scene.events.forEach(event => {
    const eventTime = event.t;
    const eventDuration = event.duration || 1.0;
    
    // Check if event is active at current time
    if (time >= eventTime && time <= eventTime + eventDuration) {
      const progress = (time - eventTime) / eventDuration;
      
      // Apply event-specific animations
      applyEventAnimation(event, progress);
    }
  });
};

// Apply specific animation based on event type
const applyEventAnimation = (event: VisualEvent, progress: number) => {
  // Example: Animate puck movement
  if (event.action === 'animate_puck_3d' && puckRef.value) {
    const path = event.params?.path;
    if (path === 'straight_line') {
      // Move puck along X axis
      puckRef.value.position.x = progress * 10;
    }
  }
  
  // More animations will be added here
};

// Playback controls
const togglePlayback = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    animate();
  } else {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }
};

const resetAnimation = () => {
  currentTime.value = 0;
  isPlaying.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  updateSceneAtTime(0);
};

const onTimelineSeek = () => {
  updateSceneAtTime(currentTime.value);
};

// Format time display
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Cleanup
onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

// Auto-play if enabled
onMounted(() => {
  if (props.autoPlay) {
    togglePlayback();
  }
});
</script>

<style scoped>
.scene-viewer-container {
  position: relative;
  width: 100%;
  height: 500px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

/* Ensure TresCanvas respects container bounds */
.scene-viewer-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 500px;
}
</style>

