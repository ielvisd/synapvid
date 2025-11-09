import { describe, it, expect } from 'vitest';
import { 
  VideoSpecSchema, 
  SceneSchema, 
  PromptInputSchema,
  StyleConfigSchema 
} from '~/schemas/videoSpec';

describe('VideoSpec Schema', () => {
  it('should validate a valid video spec', () => {
    const validSpec = {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 15,
          narration: ['Welcome to physics'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: {
          primary: '#F59E0B'
        }
      }
    };

    const result = VideoSpecSchema.safeParse(validSpec);
    expect(result.success).toBe(true);
  });

  it('should reject invalid duration', () => {
    const invalidSpec = {
      duration_target: 50, // Too short
      scenes: [],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const result = VideoSpecSchema.safeParse(invalidSpec);
    expect(result.success).toBe(false);
  });

  it('should reject overlapping scenes', () => {
    const overlappingSpec = {
      duration_target: 120,
      scenes: [
        {
          type: 'intro',
          start: 0,
          end: 20,
          narration: ['First scene'],
          events: []
        },
        {
          type: 'skill1',
          start: 15, // Overlaps with previous scene
          end: 30,
          narration: ['Second scene'],
          events: []
        }
      ],
      style: {
        voice: 'alloy',
        colors: { primary: '#F59E0B' }
      }
    };

    const result = VideoSpecSchema.safeParse(overlappingSpec);
    expect(result.success).toBe(false);
  });
});

describe('Scene Schema', () => {
  it('should validate a valid scene', () => {
    const validScene = {
      type: 'intro',
      start: 0,
      end: 15,
      narration: ['Welcome'],
      events: [
        {
          t: 5,
          action: 'reveal_text',
          text: 'Newton\'s Laws'
        }
      ]
    };

    const result = SceneSchema.safeParse(validScene);
    expect(result.success).toBe(true);
  });

  it('should reject scene with end before start', () => {
    const invalidScene = {
      type: 'intro',
      start: 20,
      end: 10,
      narration: ['Invalid'],
      events: []
    };

    const result = SceneSchema.safeParse(invalidScene);
    expect(result.success).toBe(false);
  });
});

describe('PromptInput Schema', () => {
  it('should validate a valid prompt input', () => {
    const validInput = {
      prompt: 'Explain Newton\'s First Law',
      learningObjectives: ['Understand inertia'],
      examples: ['Hockey puck on ice']
    };

    const result = PromptInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject prompt that is too short', () => {
    const invalidInput = {
      prompt: 'Test' // Too short
    };

    const result = PromptInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('StyleConfig Schema', () => {
  it('should apply default values', () => {
    const minimalStyle = {
      voice: 'alloy',
      colors: {
        primary: '#F59E0B'
      }
    };

    const result = StyleConfigSchema.parse(minimalStyle);
    expect(result.voice).toBe('alloy');
    expect(result.transitions).toBe(0.3); // Default value
  });
});

