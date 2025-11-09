/**
 * API Endpoint: Expand prompt using OpenAI GPT-4o-mini
 * POST /api/openai/expand
 * 
 * Handles Stage 1 prompt expansion with deterministic seed=42
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { prompt, styleOverride, seed = 42 } = body;

  if (!prompt || typeof prompt !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid prompt provided'
    });
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key not configured'
    });
  }

  try {
    // System prompt for video spec generation
    const systemPrompt = `You are an expert educational video script generator specializing in physics content for 17-year-old students.

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

Output ONLY valid JSON matching this exact schema (no markdown, no code blocks):
{
  "duration_target": 120,
  "scenes": [
    {
      "type": "intro",
      "start": 0,
      "end": 15,
      "narration": ["Welcome text here", "Another chunk"],
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

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        seed: seed,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse and return JSON
    let parsedSpec;
    try {
      parsedSpec = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Apply style overrides if provided
    if (styleOverride) {
      parsedSpec.style = {
        ...parsedSpec.style,
        ...styleOverride
      };
    }

    return parsedSpec;
  } catch (error: any) {
    console.error('OpenAI expansion error:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to expand prompt'
    });
  }
});

