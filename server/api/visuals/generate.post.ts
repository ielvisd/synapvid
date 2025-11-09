/**
 * API Endpoint: Generate 3D Visual Components
 * POST /api/visuals/generate
 * 
 * Uses LLM to generate TresJS/Three.js component code for scenes
 * Returns component structure and metadata
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const { scene, style, preview = false } = body;

  if (!scene) {
    throw createError({
      statusCode: 400,
      message: 'Invalid scene data provided'
    });
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key not configured'
    });
  }

  try {
    // System prompt for generating TresJS components
    const systemPrompt = `You are an expert in generating Vue 3 + TresJS (Three.js) components for educational physics videos.

Your task is to generate a structured component definition (not code) that describes the 3D scene.

Output a JSON object with this structure:
{
  "sceneType": "intro|skill1|skill2|summary",
  "objects": [
    {
      "id": "unique_id",
      "type": "mesh|text|arrow|group|light",
      "geometry": "box|sphere|plane|cylinder",
      "material": { "color": "#hex", "opacity": 1 },
      "position": [x, y, z],
      "rotation": [x, y, z],
      "scale": [x, y, z],
      "boundingBox": { "x": 0, "y": 0, "width": 1, "height": 1 }
    }
  ],
  "camera": {
    "position": [x, y, z],
    "lookAt": [x, y, z]
  },
  "lights": [
    { "type": "ambient|directional|point", "intensity": 0.5, "position": [x, y, z] }
  ],
  "animations": [
    { "objectId": "id", "event": {...} }
  ]
}

Guidelines:
- Use zones to prevent overlaps: title zone (y: 3-4), main zone (y: 0-2), canvas zone (z: -5 to 5)
- Include collision detection boundaries
- Generate objects based on visual events
- Use physics-appropriate colors (vectors: green/red, forces: blue, objects: gray)
- Preview mode: lower resolution, simpler geometries`;

    // User prompt describing the scene
    const userPrompt = `Generate a 3D scene for a ${scene.type} section.

Duration: ${scene.start}s to ${scene.end}s
Narration: ${scene.narration.join(' ')}

Visual Events:
${scene.events.map((e: any, i: number) => `${i + 1}. At ${e.t}s: ${e.action} ${JSON.stringify(e.params || {})}`).join('\n')}

Style: ${JSON.stringify(style)}
Preview Mode: ${preview}`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        seed: 42,
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
    const sceneComponent = JSON.parse(content);
    
    return {
      ...sceneComponent,
      sceneId: `${scene.type}_${scene.start}`,
      preview: preview,
      generated: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Visual generation error:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to generate visual components'
    });
  }
});

