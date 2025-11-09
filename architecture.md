# SynapVid Architecture

High-level system architecture for SynapVid educational video generation pipeline.

## System Overview

SynapVid is a Nuxt 3 web application that transforms text prompts into educational physics videos through a 5-stage pipeline. The system orchestrates LLM-based content generation, TTS narration, 3D visual rendering, and video assembly to produce synchronized MP4 outputs.

```
┌─────────────────────────────────────────────────────────────┐
│                     SynapVid Web App                        │
│                    (Nuxt 3 + Vue 3)                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Home   │→ │  Editor  │→ │  Preview │→ │  Export  │ │
│  │  (Form)  │  │  (JSON)  │  │  (3D)    │  │ (Progress)│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │     5-Stage Processing Pipeline       │
        └───────────────────────────────────────┘
```

## Component Architecture

### Nuxt Application Structure

```
synapvid/
├── pages/              # Route pages (home, editor, preview, export)
├── components/         # Reusable Vue components
├── composables/        # Vue composables (business logic)
│   ├── usePromptExpansion.ts
│   ├── useNarrationSynthesis.ts
│   ├── useVisualGeneration.ts
│   └── useVideoAssembly.ts
├── schemas/            # Zod validation schemas
│   └── videoSpec.ts
├── assets/             # Static assets (GLTF models, SVGs, diagrams)
├── public/             # Public files (generated videos, audio)
└── server/            # Server-side API routes (if needed)
```

### Core Composables

Each stage is implemented as a Vue composable that encapsulates the stage's logic:

1. **usePromptExpansion**: Expands text prompts into structured JSON specs
2. **useNarrationSynthesis**: Generates audio narration from text chunks
3. **useVisualGeneration**: Creates 3D visual components and renders scenes
4. **useVideoAssembly**: Synchronizes and combines audio/video into final MP4

### Page Components

- **pages/index.vue**: Prompt input form (Stage 1 entry point)
- **pages/editor.vue**: JSON spec editor with tree view
- **pages/preview.vue**: Live 3D canvas preview with timeline scrubber
- **pages/export.vue**: Video assembly progress and download

## Data Flow

### Pipeline Flow

```
User Input (Text Prompt)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Prompt Expansion & Script Generation              │
│ • OpenAI GPT-4o-mini                                       │
│ • Output: spec.json (scenes, narration, events, timings)   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Narration Synthesis                                │
│ • OpenAI TTS (voice="alloy")                               │
│ • fluent-ffmpeg (pauses, duration calc)                     │
│ • Output: MP3 segments + updated spec.json with timestamps │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Visual Generation                                  │
│ • LLM generates Vue/TresJS components                       │
│ • TresJS renders 3D scenes                                  │
│ • Playwright records MP4 clips per scene                   │
│ • Output: MP4 clips + assets/ (GLTF, SVGs)                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Sync & Assembly                                    │
│ • fluent-ffmpeg (concat, align, transitions)               │
│ • Subtitle burning (WebVTT)                                │
│ • Output: Final MP4 (1080p, 30fps) + JSON cues + TXT       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 5: UI & Iteration                                     │
│ • Multi-page workflow                                       │
│ • Live previews with hot-reload                            │
│ • User can edit spec.json and re-run stages                │
└─────────────────────────────────────────────────────────────┘
```

### State Management

State flows through Vue composables and reactive refs:

- **spec.json**: Central data structure passed between stages
- **Audio segments**: Stored with paths and timestamps
- **Visual clips**: MP4 file paths per scene
- **UI state**: Current stage, loading states, errors (managed via composables)

## Stage Interactions & Dependencies

### Stage Dependencies

```
Stage 1 (Prompt Expansion)
    │
    ├─→ Stage 2 (Narration) requires: spec.json narration chunks
    │
    ├─→ Stage 3 (Visuals) requires: spec.json events + style
    │
    └─→ Stage 4 (Assembly) requires: Stage 2 output + Stage 3 output
```

### Parallel Execution Opportunities

- Stage 2 (Narration) and Stage 3 (Visuals) can run in parallel after Stage 1
- Multiple scenes in Stage 3 can be rendered in parallel (worker threads)
- Preview mode allows Stage 3 to run independently for quick iteration

## Technology Stack

### Frontend Framework
- **Nuxt 3**: Vue 3 framework with SSR/SSG capabilities
- **Vue 3**: Reactive component framework
- **Nuxt UI**: Component library for consistent UI elements

### 3D Rendering
- **TresJS**: Vue 3 wrapper for Three.js
- **Three.js**: 3D graphics library (via TresJS)
- **GSAP**: Animation library for timing and transitions

### AI/ML Services
- **OpenAI GPT-4o-mini**: LLM for prompt expansion and component generation
- **OpenAI TTS**: Text-to-speech for narration

### Video/Audio Processing
- **fluent-ffmpeg**: Node.js wrapper for FFmpeg
- **FFmpeg**: Video/audio encoding, concatenation, sync

### Browser Automation
- **Playwright**: Headless browser for recording 3D scenes to MP4

### Validation & Type Safety
- **Zod**: Runtime schema validation for spec.json
- **TypeScript**: Static type checking

### Testing
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end and visual regression testing

## MCP Integration Points

### nuxt-ui MCP
- **Usage**: Component discovery and API reference
- **When**: Before implementing any UI component
- **Functions**: `mcp_nuxt-ui_get_component`, `mcp_nuxt-ui_list_components`, `mcp_nuxt-ui_get_component_metadata`
- **Examples**: UForm, UInput, UButton, UProgress, UToast, UTree, UTimeline, UColorPicker, UUpload, UAlert

### vue-app-mcp
- **Usage**: App structure patterns, composables best practices, routing
- **When**: Setting up project structure, creating composables, implementing state management
- **Functions**: `mcp_vue-app-mcp_*` functions

### supabase MCP
- **Usage**: Backend/data persistence (optional)
- **When**: Storing video metadata, user preferences, asset management
- **Use Cases**: Video metadata storage, cloud asset storage, user settings

### Playwright MCP
- **Usage**: Browser automation, testing workflows
- **When**: Stage 3 visual generation (recording), end-to-end testing
- **Functions**: `mcp_playwright_browser_*` functions

### chrome-devtools MCP
- **Usage**: Debugging, inspection, performance analysis
- **When**: Troubleshooting rendering, sync issues, performance bottlenecks
- **Functions**: `mcp_chrome-devtools_*` functions
- **Use Cases**: Inspect network requests, debug 3D rendering, verify video output

## Key Data Structures

### spec.json Schema

```typescript
{
  duration_target: number;        // Target duration in seconds (80-180)
  scenes: Scene[];                // Array of scene objects
  style: StyleConfig;             // Visual/audio style configuration
}

Scene {
  type: "intro" | "skill1" | "skill2" | "summary";
  start: number;                  // Start time in seconds
  end: number;                    // End time in seconds
  narration: string[];            // Text chunks for narration
  events: VisualEvent[];          // Visual events with timings
}

VisualEvent {
  t: number;                      // Time offset in seconds
  action: string;                 // e.g., "animate_vector_3d", "reveal_text"
  params: Record<string, any>;    // Action-specific parameters
}

StyleConfig {
  voice: string;                  // TTS voice (e.g., "alloy")
  colors: {                       // Color palette
    primary: string;
    accent: string;
  };
  font?: string;                  // Typography
  transitions?: number;           // Transition duration
}
```

### Audio Segment Format

```typescript
{
  [chunkId: string]: {
    path: string;                 // Path to MP3 file
    start: number;                // Start timestamp
    end: number;                  // End timestamp
  }
}
```

### Video Output Format

- **Format**: MP4 (H.264)
- **Resolution**: 1080p (1920x1080)
- **Frame Rate**: 30fps
- **Audio**: AAC, synced with narration
- **Subtitles**: WebVTT format (optional)

## External Dependencies

### APIs
- **OpenAI API**: GPT-4o-mini (prompt expansion), TTS (narration)
- **Cost**: ~$0.01-0.05 per video

### Local Requirements
- **Node.js**: 20+
- **FFmpeg**: Required for video/audio processing
- **Browser**: Chromium (via Playwright) for rendering

## Performance Considerations

### Rendering Performance
- **Target**: <20min full video render
- **Strategy**: Parallelize scene rendering via worker threads
- **Memory**: <4GB browser memory usage
- **Preview Mode**: Low-res preview <1min for quick iteration

### Determinism
- **LLM Seeding**: seed=42 for reproducible outputs
- **Three.js Seeding**: Deterministic random number generation
- **Verification**: Hash check to ensure identical outputs on re-runs

## Security & Reliability

### API Key Management
- **Storage**: `.env` file (never committed)
- **Access**: Nuxt runtime config
- **Validation**: Environment variable checks on startup

### Input Validation
- **Zod Schemas**: Validate all JSON inputs (spec.json, user inputs)
- **Pre-render Checks**: Collision detection before rendering (TresJS raycasting)
- **Error Handling**: Graceful failures with user-friendly messages

## Extensibility

### Modular Design
- **Composables**: Each stage is independent and testable
- **Action Types**: Extensible visual event actions (e.g., "draw_timeline_3d", "load_gltf")
- **Template System**: LLM fallback templates for non-physics topics

### Future Enhancements
- Support for non-physics topics (history, biology)
- Cloud storage integration (Supabase)
- Multi-user support with authentication
- Video template library
