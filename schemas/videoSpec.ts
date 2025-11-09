import { z } from 'zod';

/**
 * Zod Schema for SynapVid Video Specification
 * Based on PRD Section 8.1 and Architecture document
 */

// Visual Event Schema
export const VisualEventSchema = z.object({
  t: z.number().min(0).describe('Time offset in seconds'),
  action: z.string().describe('Action type (e.g., animate_vector_3d, reveal_text, draw_eqn_3d)'),
  params: z.record(z.any()).optional().describe('Action-specific parameters'),
  text: z.string().optional().describe('Text content for text-based actions'),
  latex: z.string().optional().describe('LaTeX equation for equation rendering'),
  color: z.string().optional().describe('Color in hex format'),
  position: z.array(z.number()).optional().describe('3D position [x, y, z]'),
  duration: z.number().optional().describe('Duration of the action in seconds'),
  material: z.string().optional().describe('Material type for 3D objects')
});

export type VisualEvent = z.infer<typeof VisualEventSchema>;

// Scene Type Enum
export const SceneTypeSchema = z.enum(['intro', 'skill1', 'skill2', 'summary']);
export type SceneType = z.infer<typeof SceneTypeSchema>;

// Scene Schema
export const SceneSchema = z.object({
  type: SceneTypeSchema.describe('Scene type: intro, skill1, skill2, or summary'),
  start: z.number().min(0).describe('Start time in seconds'),
  end: z.number().min(0).describe('End time in seconds'),
  narration: z.array(z.string()).describe('Text chunks for narration'),
  events: z.array(VisualEventSchema).describe('Visual events with timings')
}).refine(
  (scene) => scene.end > scene.start,
  { message: 'Scene end time must be greater than start time' }
);

export type Scene = z.infer<typeof SceneSchema>;

// Style Configuration Schema
export const StyleConfigSchema = z.object({
  voice: z.string().default('alloy').describe('TTS voice (e.g., alloy, echo, fable, onyx, nova, shimmer)'),
  colors: z.object({
    primary: z.string().describe('Primary color in hex format'),
    accent: z.string().optional().describe('Accent color in hex format'),
    background: z.string().optional().describe('Background color in hex format')
  }),
  typography: z.object({
    family: z.string().optional().default('Roboto').describe('Font family'),
    sizes: z.object({
      title: z.number().optional().default(36),
      body: z.number().optional().default(16)
    }).optional()
  }).optional(),
  transitions: z.number().optional().default(0.3).describe('Transition duration in seconds')
});

export type StyleConfig = z.infer<typeof StyleConfigSchema>;

// Audio Segment Schema (for Stage 2 output)
export const AudioSegmentSchema = z.object({
  path: z.string().describe('Path to MP3 file'),
  start: z.number().describe('Start timestamp in seconds'),
  end: z.number().describe('End timestamp in seconds')
});

export type AudioSegment = z.infer<typeof AudioSegmentSchema>;

// Video Spec Schema (Main)
export const VideoSpecSchema = z.object({
  duration_target: z.number().min(80).max(180).describe('Target duration in seconds (80-180)'),
  scenes: z.array(SceneSchema).min(1).describe('Array of scene objects'),
  style: StyleConfigSchema.describe('Visual and audio style configuration'),
  audioSegments: z.record(AudioSegmentSchema).optional().describe('Audio segments (populated in Stage 2)')
}).refine(
  (spec) => {
    // Validate that scenes don't overlap
    const sortedScenes = [...spec.scenes].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedScenes.length - 1; i++) {
      if (sortedScenes[i].end > sortedScenes[i + 1].start) {
        return false;
      }
    }
    return true;
  },
  { message: 'Scenes must not overlap' }
).refine(
  (spec) => {
    // Validate that total duration matches scenes
    const lastScene = spec.scenes[spec.scenes.length - 1];
    return lastScene ? lastScene.end <= spec.duration_target + 5 : true; // Allow 5s buffer
  },
  { message: 'Total scene duration exceeds target duration' }
);

export type VideoSpec = z.infer<typeof VideoSpecSchema>;

// Prompt Input Schema (for Stage 1 input)
export const PromptInputSchema = z.object({
  prompt: z.string().min(10).describe('Text prompt describing the video content'),
  learningObjectives: z.array(z.string()).optional().describe('Optional learning objectives'),
  examples: z.array(z.string()).optional().describe('Optional real-world examples to include'),
  style: StyleConfigSchema.optional().describe('Optional style overrides')
});

export type PromptInput = z.infer<typeof PromptInputSchema>;

// Video Output Metadata Schema (for final output)
export const VideoOutputSchema = z.object({
  videoPath: z.string().describe('Path to final MP4 file'),
  duration: z.number().describe('Actual video duration in seconds'),
  cuesPath: z.string().describe('Path to JSON cues file'),
  transcriptPath: z.string().describe('Path to TXT transcript file'),
  spec: VideoSpecSchema.describe('Original video specification'),
  createdAt: z.string().datetime().describe('ISO timestamp of video creation')
});

export type VideoOutput = z.infer<typeof VideoOutputSchema>;

