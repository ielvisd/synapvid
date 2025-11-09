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
        ref="cameraRef"
        :position="[0, 5, 10]"
        :look-at="[0, 0, 0]"
        make-default
      />
      
      <TresAmbientLight :intensity="0.6" />
      <TresDirectionalLight
        :position="[5, 8, 5]"
        :intensity="1.2"
        cast-shadow
      />
      <TresDirectionalLight
        :position="[-5, 3, -5]"
        :intensity="0.4"
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

        <!-- Hockey Puck (rendered separately to prevent duplicates) -->
        <TresMesh
          v-if="hasPuck"
          ref="puckRef"
          :position="animatedPuckPosition"
          cast-shadow
          :receive-shadow="false"
          :key="`puck-${sceneObjectsRebuildCounter}`"
        >
          <TresCylinderGeometry :args="[0.4, 0.4, 0.15, 32]" />
          <TresMeshStandardMaterial 
            color="#1a1a1a"
            :roughness="0.2"
            :metalness="0.8"
          />
        </TresMesh>

        <!-- Other Dynamic Scene Objects (vectors, text, etc.) -->
        <template v-for="(object, index) in otherSceneObjects" :key="`scene-${sceneObjectsRebuildCounter}-${object.type}-${index}`">
          <!-- 3D Vector Arrow -->
          <TresArrowHelper
            v-if="object.type === 'vector'"
            :dir="object.direction || [1, 0, 0]"
            :origin="object.position || [0, 1, 0]"
            :length="object.length || 2"
            :color="object.color || '#ff0000'"
            :headLength="0.3"
            :headWidth="0.2"
          />

          <!-- 3D Text (using canvas texture for better visibility) -->
          <TresMesh
            v-if="object.type === 'text'"
            :position="object.position || [0, 3, 0]"
            :key="`text-${object.text}-${index}`"
          >
            <TresPlaneGeometry :args="[getTextWidth(object.text || ''), 1]" />
            <TresMeshBasicMaterial :map="createTextTexture(object.text || '', object.color || '#ffffff')" />
          </TresMesh>
        </template>
      </TresGroup>

      <!-- Orbit Controls for Preview -->
      <OrbitControls
        v-if="enableControls"
        ref="orbitControlsRef"
        :enable-damping="true"
        :damping-factor="0.05"
        :min-distance="3"
        :max-distance="50"
        :min-polar-angle="0"
        :max-polar-angle="Math.PI / 2"
        :target="[0, 0, 0]"
      />
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
import { OrbitControls } from '@tresjs/cientos';
import { CanvasTexture } from 'three';
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
  currentTime?: number;
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
  
  // Ensure camera is available before OrbitControls tries to use it
  // The make-default prop on TresPerspectiveCamera should handle this,
  // but we add a small delay to ensure everything is initialized
  nextTick(() => {
    // Camera should be available now via TresContext
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Scene state
const sceneGroup = ref();
const puckRef = ref();
const cameraRef = ref();
const orbitControlsRef = ref();
const isPlaying = ref(props.autoPlay || false);
// Use external currentTime if provided, otherwise use internal
const internalTime = ref(0);
const currentTime = computed(() => props.currentTime !== undefined ? props.currentTime : internalTime.value);
const duration = computed(() => props.scene ? props.scene.end - props.scene.start : 10);

// Animated puck position (for smooth movement)
const animatedPuckPosition = ref<[number, number, number]>([0, 0.1, 0]);

// Animation loop variable
let animationFrameId: number;

// Update scene objects based on current time
const updateSceneAtTime = (time: number) => {
  if (!props.scene?.events) {
    // Reset to initial position if no events
    animatedPuckPosition.value = [0, 0.1, 0];
    return;
  }
  
  // Convert global time to scene-relative time
  // Events have 't' relative to scene start, not video start
  const sceneStart = props.scene.start || 0;
  const sceneRelativeTime = time - sceneStart;
  
  if (sceneRelativeTime <= 0) {
    // Before scene starts, reset to initial position
    animatedPuckPosition.value = [0, 0.1, 0];
    return;
  }
  
  // Find all active events at current time (using scene-relative time)
  const activeEvents = props.scene.events.filter(event => {
    const eventTime = event.t; // This is already relative to scene start
    const eventDuration = event.duration || 1.0;
    return sceneRelativeTime >= eventTime && sceneRelativeTime <= eventTime + eventDuration;
  });
  
  // If no events are active, check if we should keep final position or reset
  if (activeEvents.length === 0) {
    // Find the last puck animation event that has completed
    const puckEvents = props.scene.events.filter(e => e.action === 'animate_puck_3d');
    const lastPuckEvent = puckEvents[puckEvents.length - 1];
    
    if (lastPuckEvent) {
      const eventTime = lastPuckEvent.t;
      const eventDuration = lastPuckEvent.duration || 1.0;
      const eventEnd = eventTime + eventDuration;
      
      // If we're past the last puck event (in this scene), keep it at final position
      if (sceneRelativeTime > eventEnd) {
        // Apply the animation at progress 1.0 to get final position
        applyEventAnimation(lastPuckEvent, 1.0);
        return;
      }
    }
    
    // Before any puck events or between events, reset to start
    animatedPuckPosition.value = [0, 0.1, 0];
    return;
  }
  
  // Apply active events (this will update the position)
  activeEvents.forEach(event => {
    const eventTime = event.t; // Relative to scene start
    const eventDuration = event.duration || 1.0;
    const progress = Math.max(0, Math.min(1, (sceneRelativeTime - eventTime) / eventDuration));
    
    // Apply event-specific animations
    applyEventAnimation(event, progress);
  });
};

// Apply specific animation based on event type
const applyEventAnimation = (event: VisualEvent, progress: number) => {
  // Animate puck movement
  if (event.action === 'animate_puck_3d') {
    const path = event.params?.path;
    const startX = event.params?.startX as number || 0;
    const endX = event.params?.endX as number || 10;
    
    if (path === 'straight_line') {
      // Smoothly interpolate puck position along X axis
      const currentX = startX + (endX - startX) * progress;
      animatedPuckPosition.value = [currentX, 0.1, 0];
    } else {
      // Default: move from center to right
      animatedPuckPosition.value = [progress * 10, 0.1, 0];
    }
  }
  
  // Animate vector appearance
  if (event.action === 'animate_vector_3d') {
    // Vectors appear instantly, but we could add fade-in here
    // For now, they're always visible when event is active
  }
  
  // More animations will be added here
};

// Watch currentTime to update scene when scrubbing (even when not playing)
watch(currentTime, (time) => {
  updateSceneAtTime(time);
}, { immediate: true });

// Reset animation when scene changes
watch(() => props.scene, (newScene) => {
  if (props.currentTime === undefined) {
    internalTime.value = 0;
  }
  animatedPuckPosition.value = [0, 0.1, 0];
  isPlaying.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  // Reset puck visibility when scene changes
  if (!newScene) {
    hasPuck.value = false;
  }
}, { immediate: true });

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

// Separate puck state to prevent duplicates
const hasPuck = ref(false);

// Other scene objects (excluding puck)
const otherSceneObjects = computed(() => {
  return sceneObjects.value.filter(obj => obj.type !== 'puck');
});

// Rebuild counter to force Vue to recreate components when array is replaced
const sceneObjectsRebuildCounter = ref(0);

// Ground color based on style
const groundColor = computed(() => {
  return props.style?.colors?.primary || '#e3f2fd';
});

// Initialize scene objects from visual events
// Only rebuild when scene type actually changes, not on every time update
watch(() => props.scene?.type, (newType, oldType) => {
  if (!props.scene) {
    sceneObjects.value = [];
    return;
  }
  
  // Only rebuild if scene type actually changed
  if (newType === oldType && sceneObjects.value.length > 0) {
    return;
  }
  
  if (import.meta.dev) {
    console.log(`[Scene3DViewer] Rebuilding scene objects for scene type "${newType}"`);
  }
  
  // Always start with a fresh array to prevent duplicates
  const objects: typeof sceneObjects.value = [];
  let puckAdded = false; // Track if we've added a puck to prevent duplicates
  
  // Check if we have a puck animation (hockey puck example)
  // Also check scene type - if it's skill1/skill2, likely has physics demos
  const hasPuckEvent = props.scene.events?.some(e => e.action === 'animate_puck_3d');
  const isPhysicsDemo = props.scene.type === 'skill1' || props.scene.type === 'skill2';
  
  // Set puck visibility flag (puck is rendered separately, not in the array)
  hasPuck.value = hasPuckEvent || isPhysicsDemo;
  
  // Reset puck position when scene changes
  if (hasPuck.value) {
    animatedPuckPosition.value = [0, 0.1, 0];
  }
  
  // Parse visual events for initial setup
  props.scene.events?.forEach((event, eventIndex) => {
    // Show vectors that appear early in the scene (t <= 2s)
    if (event.action === 'animate_vector_3d' && event.t <= 2) {
      const dir = Array.isArray(event.params?.direction) 
        ? (event.params.direction as [number, number, number])
        : [1, 0, 0];
      objects.push({
        type: 'vector',
        position: event.position as [number, number, number] || [0, 1, 0],
        direction: dir,
        length: (event.params?.length as number) || 2,
        color: event.color || props.style?.colors?.accent || '#ff0000'
      });
    }
    
    // Show text that appears early
    if (event.action === 'reveal_text' && event.text && event.t <= 2) {
      objects.push({
        type: 'text',
        position: event.position as [number, number, number] || [0, 3, 0],
        text: event.text,
        color: event.color || '#ffffff',
        size: 0.5
      });
    }
  });
  
  // Debug logging (only log warnings, not every creation)
  if (import.meta.dev) {
    const vectorCount = objects.filter(obj => obj.type === 'vector').length;
    const textCount = objects.filter(obj => obj.type === 'text').length;
    console.log(`[Scene3DViewer] Rebuilt: puck=${hasPuck.value}, vectors=${vectorCount}, text=${textCount}`);
  }
  
  // Replace the entire array to ensure no duplicates
  // Increment rebuild counter to force Vue to recreate components
  sceneObjectsRebuildCounter.value++;
  sceneObjects.value = objects;
}, { immediate: true });

// Animation loop
const animate = () => {
  if (!isPlaying.value) return;
  
  // Only update internal time if not controlled externally
  if (props.currentTime === undefined) {
    internalTime.value += 0.016; // ~60fps
    
    if (internalTime.value >= duration.value) {
      internalTime.value = duration.value;
      isPlaying.value = false;
      return;
    }
  }
  
  // Update scene based on current time and visual events
  updateSceneAtTime(currentTime.value);
  
  animationFrameId = requestAnimationFrame(animate);
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
  if (props.currentTime === undefined) {
    internalTime.value = 0;
  }
  isPlaying.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animatedPuckPosition.value = [0, 0.1, 0]; // Reset puck to start
  updateSceneAtTime(0);
};

const onTimelineSeek = () => {
  updateSceneAtTime(currentTime.value);
  // Reset puck position when seeking
  if (currentTime.value === 0) {
    animatedPuckPosition.value = [0, 0.1, 0];
  }
};

// Format time display
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Reset camera to initial position
const resetCamera = () => {
  if (cameraRef.value) {
    cameraRef.value.position.set(0, 5, 10);
    cameraRef.value.lookAt(0, 0, 0);
  }
  if (orbitControlsRef.value) {
    orbitControlsRef.value.target.set(0, 0, 0);
    orbitControlsRef.value.update();
  }
};

// Helper function to create text texture
const createTextTexture = (text: string, color: string): CanvasTexture => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    // Return a default texture if canvas context is not available
    const defaultCanvas = document.createElement('canvas');
    defaultCanvas.width = 256;
    defaultCanvas.height = 64;
    return new CanvasTexture(defaultCanvas);
  }
  
  // Set canvas size based on text length
  canvas.width = Math.max(256, text.length * 20);
  canvas.height = 64;
  
  // Clear canvas with transparent background
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw text with outline for better visibility
  context.strokeStyle = '#000000';
  context.lineWidth = 4;
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  
  // Draw filled text
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// Helper function to calculate text width
const getTextWidth = (text: string): number => {
  return Math.max(2, text.length * 0.3);
};

// Expose methods to parent component
defineExpose({
  resetCamera,
  resetAnimation
});

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

