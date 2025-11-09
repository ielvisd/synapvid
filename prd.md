# Product Requirements Document (PRD): Educational Video Generation Pipeline

## Document Metadata

- **Product Name:** SynapVid (Educational Video Generator)
- **Version:** 1.3 (Updated for UI-First Nuxt + TresJS Stack with Composables & Nuxt UI)
- **Author:** Grok (xAI Assistant)
- **Stakeholders:** Internal Content Creators (Primary Users)
- **Purpose of PRD:** This document outlines requirements for a web-based pipeline that transforms text prompts into 80-180 second educational physics videos. It serves as a blueprint for implementation using Cursor's Composer AI feature, which will generate modular code components from natural language prompts derived from this PRD (e.g., "Implement Stage 1: Prompt Expansion using OpenAI API").

## 1. Overview

### 1.1 Product Description

SynapVid is a web app (built on Nuxt) that automates the creation of high-quality, consistent educational videos for 17-year-old physics students. Starting from a single text prompt (e.g., "Explain Newton's First Law with a rocket example") in the UI, it generates:

- Synced MP4 videos (1080p, 30fps) with narration, 3D animations (via TresJS), progressive text/equation reveals, and real-world hooks.
- Supporting artifacts: JSON metadata (cue alignments), TXT transcripts, and assets/ folder (diagrams/SVGs/GLTF models).

The pipeline addresses current pain points: manual scripting iterations, overlaps, sync drifts, and bland visuals. It leverages LLMs for automation while using TresJS for immersive 3D physics content (e.g., orbiting vectors, particle trajectories). The UI enables live previews and drag-drop iteration using Vue composables for state management and Nuxt UI for components.

### 1.2 Problem Statement

**Current Challenges:**
- Videos require hours/days of scripting
- Overlaps and sync issues demand repeated fixes
- Style/pacing varies
- No fast previews or prompt-based entry
- Visuals feel static/boring

**Target Outcome:** Generate "infinite" bug-free videos (e.g., 3 Newton's Laws demos) with engaging 3D elements, via an intuitive web UI, in <30min each, with deterministic re-runs and easy JSON-based iteration.

### 1.3 Scope

**In Scope:**
- Prompt-to-video pipeline (5 stages: expansion, narration, visuals, assembly, UI)
- TresJS for 3D/physics anims
- OpenAI for LLM/TTS
- Playwright + FFmpeg for browser-based rendering/sync

**Out of Scope:**
- Mobile app
- Non-web exports (e.g., native apps)
- Custom ML models
- Cloud hosting (local dev server focus)

**Assumptions:** Users have Node.js 20+, Nuxt 3, TresJS installed; OpenAI API key available (~$0.01-0.05/video).

## 2. Objectives & Success Criteria

### 2.1 Business Objectives

- Enable internal creators to produce 10+ videos/week without deep coding expertise.
- Achieve 100% style consistency across outputs.
- Reduce iteration time from days to minutes via live UI previews.

### 2.2 Success Metrics

**Quantitative:**
- Generate 3 Newton's Laws videos (80-180s each) from single prompts, bug-free (no overlaps, ±300ms sync).
- Determinism: 3 re-runs of same prompt yield visually identical videos (diff <1% frames).
- Performance: End-to-end <30min/video (incl. 5-20min browser render); low-res preview <1min.

**Qualitative:**
- Manual checks: Clear narrative (hook → explain → example → summary); engaging 3D visuals (e.g., rotatable models, particle effects); readable text (no overlaps).
- User Feedback: Creators rate ease-of-use 8/10+ in beta tests; visuals "non-boring" (e.g., 3D depth scores high).

## 3. User Personas & Stories

### 3.1 Primary Persona

**Name:** Alex, Content Creator

- **Role:** Physics teacher developing curriculum; tech-savvy but not a full-time dev.
- **Goals:** Quickly prototype videos from ideas; tweak timings/styles without re-coding; preview changes live in browser.
- **Pain Points:** Tedious scripting; inconsistent outputs; flat visuals.

### 3.2 User Stories

- As Alex, I want a web UI for prompt input so I can generate a full video spec without manual scripting.
- As Alex, I want JSON outputs editable in a visual editor so I can adjust a single event (e.g., "add pause at 20s") without breaking sync.
- As Alex, I want live 3D previews in the browser so I can validate pacing/visuals before full render.
- As Alex, I want consistent styles (fonts/colors/voice) applied automatically so all videos feel branded.

## 4. Functional Requirements

### 4.1 High-Level Pipeline

The tool is a Nuxt app launched via `npx nuxt dev` (web UI at localhost:3000), orchestrating 5 stages via composables. Use Cursor's Composer to implement each as modular composables/pages.

#### Stage 1: Prompt Expansion & Script Generation

- **Input:** Text prompt + optional JSON spec (learning obj, examples, style) via UI form.
- **Process:** LLM (OpenAI GPT-4o-mini) expands to structured JSON: scenes array (intro/skills/summary), narration chunks with est. timings, visual events (e.g., `{"t": 10, "action": "animate_vector_3d", "params": {"direction": [1,0,0], "color": "#00ff00"}}`).
- **Output:** spec.json (enforce format with Zod schema); display in UI editor.
- **Composer Prompt:** "Create a composable `usePromptExpansion(prompt: string)` using OpenAI API; seed=42 for determinism; output JSON with scenes, events, timings targeting 120s total. **Use nuxt-ui MCP to discover correct UForm and UInput component APIs** for form input. **Use vue-app-mcp for composable patterns** and state management best practices. Integrate with Nuxt page for form input."

#### Stage 2: Narration Synthesis

- **Input:** JSON narration chunks from UI.
- **Process:** Generate per-chunk MP3s via OpenAI TTS (voice="alloy", speed=1.0); use fluent-ffmpeg to add 1-2s pauses; compute actual durations.
- **Output:** Audio segments + updated JSON with timestamps (e.g., `{"chunk1": {"path": "audio1.mp3", "start": 0.0, "end": 3.2}}`); preview audio in UI player.
- **Composer Prompt:** "Implement `useNarrationSynthesis(spec: object)` with OpenAI TTS and fluent-ffmpeg; ensure ±300ms sync potential via padding. **Use nuxt-ui MCP to discover correct audio preview component APIs**. **Use chrome-devtools MCP to inspect network requests** and verify audio loading."

#### Stage 3: Visual Generation

- **Input:** JSON events + style from UI.
- **Process:** LLM generates Vue/TresJS components per scene (template-based to prevent overlaps: zones for title/main/3D canvas); render via Nuxt page with TresJS (e.g., `<TresArrowHelper>` for vectors); capture via Playwright (headless browser recording).
- **Output:** MP4 clips per scene + assets/ (GLTF exports via TresJS); live 3D canvas in UI for scrubbing.
- **Composer Prompt:** "Build `useVisualGeneration(spec: object, preview: boolean)`; generate Vue components with TresJS (e.g., `<TresMesh>` for models); include collision checks pre-render; use GSAP for timings. **Use Playwright MCP for browser recording and automation** workflows. **Use nuxt-ui MCP for UContainer and layout components**. **Use chrome-devtools MCP to inspect 3D rendering** and debug performance issues."

#### Stage 4: Sync & Assembly

- **Input:** Audio segments + visual clips + JSON cues from UI.
- **Process:** FFmpeg concat with alignments (-itsoffset for drifts); insert transitions (300ms fade via GSAP export); burn subtitles.
- **Output:** Final MP4 + JSON cues + TXT transcript; download button in UI.
- **Composer Prompt:** "Create `useVideoAssembly(audioPaths: string[], clipPaths: string[], spec: object)` using fluent-ffmpeg; enforce 1080p/30fps. **Use nuxt-ui MCP for UButton and progress indicators**. **Use chrome-devtools MCP to verify video output** and inspect media elements. **Consider supabase MCP if storing video metadata** or enabling cloud storage."

#### Stage 5: UI & Iteration

- **Input:** User session in Nuxt dev server.
- **Process:** Nuxt pages for workflow (home: prompt form; editor: JSON tree with drag-drop; preview: 3D canvas + timeline scrubber; export: progress bar) using Vue composables for state management.
- **Output:** Interactive app (e.g., "Generated spec.json—edit live and preview?"); hot-reload on changes.
- **Composer Prompt:** "Implement Nuxt app structure: pages for prompt input, JSON editor (e.g., Monaco), 3D preview (TresJS canvas), and export; use Vue composables for state management. **Use nuxt-ui MCP to discover correct component APIs** (e.g., UTree for JSON editor, UProgress for renders, UTimeline for scrubbing). **Use vue-app-mcp for app structure patterns** and composables best practices. **Use chrome-devtools MCP to inspect and debug** during implementation."

### 4.2 Key Features

- **Style System:** JSON tokens (e.g., `{"font": "Roboto", "colors": {"accent": "#F59E0B"}, "transitions": 0.3}`); auto-applied via Nuxt composables/Tailwind; UI color picker for tweaks using Nuxt UI UColorPicker (discover via nuxt-ui MCP).
- **Real-World Hooks:** Auto-include in JSON (e.g., 3D rocket model via GLTF loader); drag-drop assets in UI using Nuxt UI UUpload (discover via nuxt-ui MCP). Consider supabase MCP for cloud asset storage.
- **Error Handling:** Graceful fails (e.g., re-gen LLM if invalid TresJS code); UI toasts for feedback using Nuxt UI UToast (discover via nuxt-ui MCP); logging to console/UI. Use chrome-devtools MCP to inspect errors in real-time.

### 4.3 Extensibility Considerations

To support non-physics topics (e.g., history timelines, biology diagrams), design visual events modularly:

- Use extensible action types in JSON (e.g., "draw_timeline_3d" for paths, "load_gltf" for models, "animate_particles" for data viz).
- LLM prompt includes fallback templates for generic visuals (e.g., Three.js basics for non-3D).
- **Edge Cases:** Handle text-heavy scenes (e.g., auto-subtitles via WebVTT); asset uploads (validate via File API); variable durations (cap at 180s with UI warnings using Nuxt UI UAlert).

## 5. Non-Functional Requirements

### 5.1 Performance

- **Render Time:** <20min full video (parallelize scenes via worker threads).
- **Memory:** <4GB (browser default).
- **Determinism:** Seeded LLMs/Three.js; same input → same output (hash check).

### 5.2 Security & Reliability

- **API Keys:** .env only (nuxt runtime config); no hardcodes.
- **Validation:** Zod for JSON schemas; pre-render collision detection (TresJS raycasting).
- **Compatibility:** Node 20+; cross-platform (Windows/macOS/Linux).

### 5.3 Usability & Accessibility

- **UI:** Nuxt dev server (localhost:3000) for drag-drop JSON/models; responsive design with Nuxt UI.
- **Accessibility:** High-contrast materials; alt-text in assets; clear transcripts; keyboard nav for editor.

### 5.4 Tech Constraints

- **Libs:** `nuxt@3`, `@tresjs/core`, `gsap`, `playwright`, `fluent-ffmpeg`, `zod`, `@nuxt/ui` (no new installs beyond these).
- **Models:** GPT-4o-mini (LLM/TTS); fallback to local if API offline.

### 5.5 MCP (Model Context Protocol) Integration

During development, leverage the following MCP servers to accelerate implementation and ensure best practices:

- **nuxt-ui MCP:** Use for discovering and implementing Nuxt UI components. When building UI components, query this MCP for component documentation, props, slots, and examples. Reference: `mcp_nuxt-ui_get_component`, `mcp_nuxt-ui_list_components`, `mcp_nuxt-ui_get_component_metadata`.
- **vue-app-mcp:** Use for app structure and foundation setup. Consult this MCP when establishing project structure, routing, composables patterns, and Vue/Nuxt best practices. Reference: `mcp_vue-app-mcp_*` functions.
- **supabase MCP:** Use for any backend requirements (e.g., storing video metadata, user preferences, asset management). When implementing data persistence or API endpoints, leverage Supabase MCP for database schema, authentication, and storage patterns.
- **Playwright MCP:** Use for automated testing and browser automation. When implementing Stage 3 (visual generation) and end-to-end tests, use Playwright MCP for browser recording, testing workflows, and visual regression testing.
- **chrome-devtools MCP:** Use for debugging and inspection during development. When troubleshooting rendering issues, sync problems, or performance bottlenecks, use Chrome DevTools MCP to inspect the browser, analyze network requests, and debug runtime issues.

**MCP Usage Guidelines:**
- Always check MCP availability before implementing features manually.
- Use MCPs to discover correct component APIs and avoid hardcoding incorrect implementations.
- Leverage MCPs for testing and debugging workflows throughout development.
- Document MCP usage in code comments for future reference.

## 6. Dependencies & Risks

### 6.1 Dependencies

- **External:** OpenAI API (~$0.05/video); TresJS/Playwright installed via npm.
- **Internal:** Access to example scripts/Video_Tips.md for templates.
- **MCP Servers:** Ensure the following MCP servers are configured and available:
  - nuxt-ui MCP (for component discovery)
  - vue-app-mcp (for app structure patterns)
  - supabase MCP (for backend/data needs)
  - Playwright MCP (for testing and browser automation)
  - chrome-devtools MCP (for debugging and inspection)

### 6.2 Risks & Mitigations

- **Risk:** LLM-generated TresJS code has syntax errors. **Mitigation:** Strict templates + unit tests via Vitest (Composer: "Add tests for each stage").
- **Risk:** High render costs/time. **Mitigation:** Preview mode; cap at 3 scenes/test.
- **Risk:** Sync drifts >300ms. **Mitigation:** Post-assembly waveform check (fluent-ffmpeg diff).

## 7. Implementation Guidance

Use Cursor's Composer to generate the full codebase in one pass:

- Feed sections as prompts (e.g., copy-paste "4.1 Stage 1" into Composer for code gen).
- Ensure modular design: Each stage as a Nuxt composable/page, with a central pages/index.vue for workflow; use Vue composables for all state management.
- **Leverage MCPs throughout development:**
  - **Before implementing UI components:** Query nuxt-ui MCP to discover correct component APIs, props, and usage patterns.
  - **When setting up app structure:** Consult vue-app-mcp for routing, composables, and Nuxt best practices.
  - **For backend/data needs:** Use supabase MCP for database schemas, authentication, and storage patterns.
  - **During testing:** Use Playwright MCP for browser automation, visual regression testing, and end-to-end test workflows.
  - **While debugging:** Use chrome-devtools MCP to inspect runtime behavior, network requests, and performance bottlenecks.
- Include end-to-end tests: Generate a sample Newton's video and verify outputs using Playwright MCP for test automation.
- Document MCP usage: Add comments in code indicating which MCPs were consulted for each major feature.

## 8. Appendix

### 8.1 Example Inputs/Outputs

**Input Prompt:** "Newton's First Law: Inertia explained with a hockey puck on ice." (Entered in UI form using Nuxt UI UInput).

**Output Snippet (spec.json):**

```json
{
  "duration_target": 120,
  "scenes": [
    {
      "type": "intro",
      "start": 0,
      "end": 15,
      "narration": ["Welcome to inertia..."],
      "events": [
        {"t": 0, "action": "animate_puck_3d", "params": {"path": "straight_line", "duration": 5, "material": "phong"}},
        {"t": 5, "action": "reveal_text", "text": "Newton's First Law"}
      ]
    },
    {
      "type": "skill1",
      "start": 15,
      "end": 60,
      "narration": ["Objects at rest stay at rest..."],
      "events": [
        {"t": 20, "action": "draw_eqn_3d", "latex": "F = ma = 0 \\implies a = 0", "color": "#0000ff", "position": [0,1,0]}
      ]
    }
  ],
  "style": {"voice": "alloy", "colors": {"primary": "#F59E0B"}}
}
```

**Style JSON:** `{"typography": {"family": "Roboto", "sizes": {"title": 36}}, "palette": {"bg": "#000000", "accent": "#F59E0B"}}`.

### 8.2 TresJS Template Snippet

Embed this base for Stage 3 templates (helps Composer generate overlap-free 3D code):

```vue
<template>
  <TresCanvas>
    <TresPerspectiveCamera :position="[0, 0, 5]" />
    <TresAmbientLight intensity={0.5} />
    <TresGroup v-if="title" :position="[0, 3, 0]">
      <TresText :text="title" :font-size="1" color="#ffff00" />
    </TresGroup>
    <TresAxes :start="[0,0,0]" :end="[4,3,0]" />
    <TresArrowHelper v-if="vector" :origin="[0,0,0]" :length="4" :direction="[1,0,0]" color="#00ff00" />
    <!-- Collision check: Use raycaster in mounted() to detect overlaps -->
  </TresCanvas>
</template>
<script setup>
import { onMounted } from 'vue';
import * as THREE from 'three';
// GSAP for timings: gsap.to(mesh, {duration: 2, rotation: Math.PI});
onMounted(() => {
  // Pre-render raycast for overlaps
});
</script>
```

### 8.3 References

- TresJS Docs: docs.tresjs.org
- Nuxt Docs: nuxt.com
- Nuxt UI Docs: ui.nuxt.com
- Video_Tips.md: Adapt for 3D collision prevention.
- OpenAI Pricing: platform.openai.com/pricing (as of Nov 2025).
- **MCP Resources:**
  - nuxt-ui MCP: Use `mcp_nuxt-ui_*` functions for component discovery and documentation
  - vue-app-mcp: Use `mcp_vue-app-mcp_*` functions for app structure and patterns
  - supabase MCP: Use for database, auth, and storage operations
  - Playwright MCP: Use `mcp_playwright_browser_*` functions for browser automation
  - chrome-devtools MCP: Use `mcp_chrome-devtools_*` functions for debugging and inspection
