# SynapVid Development Tasks

This document tracks all development tasks for SynapVid. Each task represents a single commit-ready unit of work.

## Foundation & Setup

- [ ] Initialize Nuxt 3 project with `npx nuxi@latest init synapvid`
- [ ] Install core dependencies: `@tresjs/core`, `gsap`, `playwright`, `fluent-ffmpeg`, `zod`, `@nuxt/ui`
- [ ] Configure `nuxt.config.ts` with Nuxt UI module and TresJS setup
- [ ] Create `.env` file template with OpenAI API key placeholder
- [ ] Setup `.env.example` with required environment variables documentation
- [ ] Create base project structure: `composables/`, `pages/`, `components/`, `assets/`, `public/` directories
- [ ] Configure TypeScript with proper types for Nuxt, TresJS, and project-specific interfaces
- [ ] Setup Zod schemas directory (`schemas/`) for JSON validation
- [ ] Create base layout component with Nuxt UI (use nuxt-ui MCP for component discovery)
- [ ] Verify MCP servers are configured: nuxt-ui, vue-app-mcp, supabase, Playwright, chrome-devtools
- [ ] Setup Vitest testing framework with Nuxt test utilities
- [ ] Create `README.md` with setup instructions and project overview
- [ ] Add `.gitignore` with Node.js, Nuxt, and build artifacts patterns

## Stage 1: Prompt Expansion & Script Generation

- [ ] Create `composables/usePromptExpansion.ts` composable (use vue-app-mcp for patterns)
- [ ] Implement OpenAI GPT-4o-mini integration with seed=42 for determinism
- [ ] Create Zod schema for spec.json format (`schemas/videoSpec.ts`)
- [ ] Implement prompt expansion logic: text → structured JSON with scenes, narration, events
- [ ] Add error handling and retry logic for OpenAI API calls
- [ ] Create `pages/index.vue` home page with prompt input form (use nuxt-ui MCP for UForm/UInput)
- [ ] Build prompt form component with optional JSON spec inputs (learning obj, examples, style)
- [ ] Create JSON editor component for displaying/editing spec.json (Monaco editor or Nuxt UI equivalent)
- [ ] Add form validation using Zod schema
- [ ] Implement spec.json display in UI with formatted JSON viewer
- [ ] Add loading states and error messages (use nuxt-ui MCP for UToast notifications)

## Stage 2: Narration Synthesis

- [ ] Create `composables/useNarrationSynthesis.ts` composable
- [ ] Implement OpenAI TTS integration (voice="alloy", speed=1.0)
- [ ] Add fluent-ffmpeg integration for adding 1-2s pauses between chunks
- [ ] Implement per-chunk MP3 generation with duration calculation
- [ ] Create audio segment management: store paths, compute timestamps
- [ ] Update spec.json with actual audio timestamps (start/end per chunk)
- [ ] Build audio preview component (use nuxt-ui MCP for audio player component)
- [ ] Add audio playback controls in UI (play, pause, scrub)
- [ ] Implement audio loading states and error handling
- [ ] Add sync validation: ensure ±300ms sync potential via padding
- [ ] Use chrome-devtools MCP to inspect network requests for audio loading

## Stage 3: Visual Generation

- [ ] Create `composables/useVisualGeneration.ts` composable
- [ ] Setup TresJS base template component for 3D scenes (use template from PRD 8.2)
- [ ] Implement LLM-based Vue/TresJS component generation per scene
- [ ] Create scene template system: zones for title/main/3D canvas to prevent overlaps
- [ ] Add TresJS component library: TresArrowHelper, TresMesh, TresText, etc.
- [ ] Implement collision detection pre-render using TresJS raycasting
- [ ] Integrate GSAP for animation timings and transitions
- [ ] Create Playwright browser recording setup (use Playwright MCP for automation)
- [ ] Implement MP4 clip generation per scene via Playwright headless recording
- [ ] Build assets/ directory structure for GLTF exports and diagrams
- [ ] Create live 3D canvas preview component in UI (use nuxt-ui MCP for UContainer)
- [ ] Add 3D scene scrubbing controls for timeline navigation
- [ ] Implement preview mode (low-res) vs full render mode
- [ ] Use chrome-devtools MCP to inspect 3D rendering and debug performance

## Stage 4: Sync & Assembly

- [ ] Create `composables/useVideoAssembly.ts` composable
- [ ] Implement fluent-ffmpeg video concatenation with alignment (-itsoffset for drifts)
- [ ] Add audio-visual sync logic: align audio segments with visual clips
- [ ] Implement transition insertion (300ms fade via GSAP export)
- [ ] Add subtitle burning functionality (WebVTT support)
- [ ] Enforce output format: 1080p, 30fps MP4
- [ ] Create final video generation workflow: combine all clips + audio
- [ ] Generate JSON cues file with final timestamps
- [ ] Generate TXT transcript file from narration chunks
- [ ] Build download button component (use nuxt-ui MCP for UButton)
- [ ] Add progress indicator for video assembly (use nuxt-ui MCP for UProgress)
- [ ] Implement error handling for FFmpeg operations
- [ ] Use chrome-devtools MCP to verify video output and inspect media elements
- [ ] Consider supabase MCP integration for storing video metadata (optional)

## Stage 5: UI & Iteration

- [ ] Create multi-page workflow: home (prompt), editor (JSON), preview (3D), export (progress)
- [ ] Build JSON editor page with tree view (use nuxt-ui MCP for UTree component)
- [ ] Implement drag-drop functionality for JSON event reordering
- [ ] Create 3D preview page with TresJS canvas and timeline scrubber
- [ ] Add timeline component for scrubbing through video (use nuxt-ui MCP for UTimeline)
- [ ] Build export page with progress bar and download controls
- [ ] Implement Vue composables for state management across pages
- [ ] Add hot-reload support: auto-refresh preview on spec.json changes
- [ ] Create navigation between workflow stages
- [ ] Implement style system UI: color picker (use nuxt-ui MCP for UColorPicker)
- [ ] Add asset upload component (use nuxt-ui MCP for UUpload)
- [ ] Build error toast notifications (use nuxt-ui MCP for UToast)
- [ ] Add warning alerts for edge cases (use nuxt-ui MCP for UAlert)
- [ ] Use vue-app-mcp for app structure patterns and composables best practices
- [ ] Use chrome-devtools MCP to inspect and debug UI interactions

## Testing

- [ ] Write unit tests for `usePromptExpansion` composable
- [ ] Write unit tests for `useNarrationSynthesis` composable
- [ ] Write unit tests for `useVisualGeneration` composable
- [ ] Write unit tests for `useVideoAssembly` composable
- [ ] Write unit tests for Zod schemas validation
- [ ] Create Playwright end-to-end test: generate sample Newton's video (use Playwright MCP)
- [ ] Add visual regression tests for 3D rendering
- [ ] Test determinism: verify 3 re-runs produce identical videos
- [ ] Test sync accuracy: verify ±300ms sync tolerance
- [ ] Add error scenario tests (API failures, invalid inputs, etc.)

## Polish & Optimization

- [ ] Add loading skeletons for all async operations
- [ ] Implement error boundaries and graceful degradation
- [ ] Optimize 3D rendering performance (reduce draw calls, optimize meshes)
- [ ] Add keyboard navigation support for accessibility
- [ ] Implement high-contrast mode for accessibility
- [ ] Add alt-text support for all visual assets
- [ ] Create comprehensive error messages with actionable guidance
- [ ] Add tooltips and help text throughout UI
- [ ] Optimize bundle size (code splitting, lazy loading)
- [ ] Add performance monitoring and logging
- [ ] Create user documentation/tutorial for content creators
- [ ] Add example prompts and sample outputs to documentation
