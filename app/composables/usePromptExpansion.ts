import type { PromptInput, VideoSpec } from '~/schemas/videoSpec';
import { VideoSpecSchema } from '~/schemas/videoSpec';

/**
 * Stage 1: Prompt Expansion & Script Generation
 * Uses OpenAI GPT-4o-mini to expand text prompts into structured JSON specs
 * Implements deterministic generation with seed=42
 * 
 * MCP Usage: Follows vue-app-mcp composable patterns for state management
 */
export const usePromptExpansion = () => {
  const config = useRuntimeConfig();
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const generatedSpec = ref<VideoSpec | null>(null);

  /**
   * System prompt for GPT-4o-mini to generate structured video specs
   */
  const getSystemPrompt = () => `You are an expert educational video script generator specializing in physics content for 17-year-old students.

Your task is to transform text prompts into structured JSON specifications for educational videos.

Output Requirements:
1. Target duration: 80-180 seconds (default 120s)
2. Scene structure: intro (15s) → skill1 (45s) → skill2 (45s) → summary (15s)
3. Narration: Split into digestible chunks (1-3 sentences each)
4. Visual events: Include specific 3D animations, text reveals, and equation displays
5. Timing: Precise timings for all events to avoid overlaps

Available Visual Actions:
- animate_vector_3d: Animate 3D vectors with direction and color
- reveal_text: Progressive text reveals
- draw_eqn_3d: Render LaTeX equations in 3D space
- animate_puck_3d: Hockey puck or object animations
- load_gltf: Load 3D models (rocket, pendulum, etc.)
- animate_particles: Particle effects for data visualization

Style Guidelines:
- Use engaging real-world hooks (rockets, sports, everyday objects)
- Progressive complexity: Simple concepts → Advanced applications
- Visual metaphors for abstract concepts
- Clear, conversational narration tone

Output valid JSON matching this schema:
{
  "duration_target": 120,
  "scenes": [
    {
      "type": "intro|skill1|skill2|summary",
      "start": 0,
      "end": 15,
      "narration": ["Chunk 1", "Chunk 2"],
      "events": [
        {"t": 0, "action": "reveal_text", "text": "Title", "color": "#ffff00"},
        {"t": 5, "action": "animate_vector_3d", "params": {"direction": [1,0,0], "color": "#00ff00"}}
      ]
    }
  ],
  "style": {
    "voice": "alloy",
    "colors": {"primary": "#F59E0B", "accent": "#3B82F6"},
    "transitions": 0.3
  }
}`;

  /**
   * Generate video spec from prompt using OpenAI API
   */
  const expandPrompt = async (input: PromptInput): Promise<VideoSpec | null> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Build user prompt with optional fields
      let userPrompt = input.prompt;
      
      if (input.learningObjectives && input.learningObjectives.length > 0) {
        userPrompt += `\n\nLearning Objectives:\n${input.learningObjectives.map(obj => `- ${obj}`).join('\n')}`;
      }
      
      if (input.examples && input.examples.length > 0) {
        userPrompt += `\n\nReal-World Examples:\n${input.examples.map(ex => `- ${ex}`).join('\n')}`;
      }

      // Call OpenAI API with retry logic
      const spec = await callOpenAIWithRetry(userPrompt, input.style);
      
      if (!spec) {
        throw new Error('Failed to generate video specification');
      }

      // Validate against Zod schema
      const validatedSpec = VideoSpecSchema.parse(spec);
      generatedSpec.value = validatedSpec;
      
      return validatedSpec;
    } catch (err: any) {
      console.error('Prompt expansion error:', err);
      error.value = err.message || 'Failed to expand prompt';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Call OpenAI API with retry logic and deterministic seed
   */
  const callOpenAIWithRetry = async (
    prompt: string,
    styleOverride?: any,
    maxRetries = 3
  ): Promise<any | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await $fetch('/api/openai/expand', {
          method: 'POST',
          body: {
            prompt,
            styleOverride,
            seed: 42 // Deterministic generation
          }
        });

        return response;
      } catch (err: any) {
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, err.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return null;
  };

  /**
   * Reset state
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
    generatedSpec.value = null;
  };

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    generatedSpec: readonly(generatedSpec),
    expandPrompt,
    reset
  };
};

