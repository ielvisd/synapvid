import type { VideoSpec, Scene, VisualEvent } from '~/schemas/videoSpec';
import gsap from 'gsap';

/**
 * Stage 3: Visual Generation
 * Generates 3D visual components using LLM and renders scenes with TresJS
 * Includes collision detection and GSAP animations
 * 
 * MCP Usage: Follows vue-app-mcp composable patterns for state management
 */
export const useVisualGeneration = () => {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const progress = ref(0);
  const generatedScenes = ref<Record<string, any>>({});
  const previewMode = ref(false);

  /**
   * Generate visual components for all scenes in the spec
   */
  const generateVisuals = async (
    spec: VideoSpec,
    preview: boolean = false
  ): Promise<Record<string, any> | null> => {
    isLoading.value = true;
    error.value = null;
    progress.value = 0;
    previewMode.value = preview;
    generatedScenes.value = {};

    try {
      console.log(`Generating visuals for ${spec.scenes.length} scenes (preview: ${preview})`);

      const scenes: Record<string, any> = {};

      for (let i = 0; i < spec.scenes.length; i++) {
        const scene = spec.scenes[i];
        if (!scene) continue;
        
        const sceneId = `scene_${i}_${scene.type}`;

        try {
          // Generate 3D components for this scene
          const sceneComponent = await generateSceneComponent(scene, spec.style, preview);
          
          if (!sceneComponent) {
            throw new Error(`Failed to generate scene ${sceneId}`);
          }

          scenes[sceneId] = sceneComponent;
          
          // Update progress
          progress.value = Math.round(((i + 1) / spec.scenes.length) * 100);

          console.log(`Generated scene ${sceneId}`);
        } catch (err: any) {
          console.error(`Error generating scene ${sceneId}:`, err);
          throw new Error(`Failed to generate scene ${sceneId}: ${err.message}`);
        }
      }

      generatedScenes.value = scenes;
      return scenes;
    } catch (err: any) {
      console.error('Visual generation error:', err);
      error.value = err.message || 'Failed to generate visuals';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Generate a single scene component using LLM
   */
  const generateSceneComponent = async (
    scene: Scene,
    style: any,
    preview: boolean
  ): Promise<any> => {
    try {
      // Call LLM to generate TresJS component code
      const response = await $fetch<any>('/api/visuals/generate', {
        method: 'POST',
        body: {
          scene,
          style,
          preview
        }
      });

      return response;
    } catch (err: any) {
      console.error('Scene component generation error:', err);
      throw err;
    }
  };

  /**
   * Perform collision detection for scene objects
   * Uses raycasting to detect overlapping elements
   */
  const checkCollisions = (sceneObjects: any[]): { hasCollisions: boolean; collisions: string[] } => {
    const collisions: string[] = [];

    // Simple bounding box collision detection
    for (let i = 0; i < sceneObjects.length; i++) {
      for (let j = i + 1; j < sceneObjects.length; j++) {
        const obj1 = sceneObjects[i];
        const obj2 = sceneObjects[j];

        // Check if bounding boxes overlap
        if (checkBoundingBoxOverlap(obj1, obj2)) {
          collisions.push(`Collision detected between ${obj1.id} and ${obj2.id}`);
        }
      }
    }

    return {
      hasCollisions: collisions.length > 0,
      collisions
    };
  };

  /**
   * Check if two bounding boxes overlap
   */
  const checkBoundingBoxOverlap = (obj1: any, obj2: any): boolean => {
    // Simplified 2D overlap check
    // In a real implementation, this would use Three.js Box3 for 3D collision detection
    const box1 = obj1.boundingBox || { x: 0, y: 0, width: 1, height: 1 };
    const box2 = obj2.boundingBox || { x: 0, y: 0, width: 1, height: 1 };

    return !(
      box1.x + box1.width < box2.x ||
      box2.x + box2.width < box1.x ||
      box1.y + box1.height < box2.y ||
      box2.y + box2.height < box1.y
    );
  };

  /**
   * Animate scene elements using GSAP
   */
  const animateEvent = (element: any, event: VisualEvent): gsap.core.Tween => {
    const duration = event.duration || 1.0;
    const params = event.params || {};

    // Create GSAP animation based on event action
    switch (event.action) {
      case 'animate_vector_3d':
        const direction = Array.isArray(params.direction) ? params.direction : [];
        return gsap.to(element.position, {
          duration,
          x: direction[0] || 0,
          y: direction[1] || 0,
          z: direction[2] || 0,
          ease: 'power2.inOut'
        });

      case 'reveal_text':
        return gsap.to(element, {
          duration,
          opacity: 1,
          y: 0,
          ease: 'back.out(1.7)'
        });

      case 'animate_puck_3d':
        return gsap.to(element.position, {
          duration: (typeof params.duration === 'number' ? params.duration : 5) as any,
          x: params.path === 'straight_line' ? 10 : 0,
          ease: 'linear'
        });

      default:
        console.warn(`Unknown animation action: ${event.action}`);
        return gsap.to(element, { duration: 0 });
    }
  };

  /**
   * Create a timeline for multiple animations
   */
  const createAnimationTimeline = (events: VisualEvent[], elements: any[]): gsap.core.Timeline => {
    const timeline = gsap.timeline();

    events.forEach((event, index) => {
      const element = elements[index];
      if (element) {
        const animation = animateEvent(element, event);
        timeline.add(animation, event.t);
      }
    });

    return timeline;
  };

  /**
   * Reset state
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
    progress.value = 0;
    generatedScenes.value = {};
    previewMode.value = false;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    progress: readonly(progress),
    generatedScenes: readonly(generatedScenes),
    previewMode: readonly(previewMode),
    generateVisuals,
    checkCollisions,
    animateEvent,
    createAnimationTimeline,
    reset
  };
};

