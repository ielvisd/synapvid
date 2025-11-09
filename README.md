# SynapVid - Educational Video Generation Pipeline

Synapvid is a Nuxt 4 web application that transforms text prompts into 80-180 second educational physics videos through a 5-stage AI-powered pipeline.

## Features

- **AI-Powered Generation**: Uses OpenAI GPT-4o-mini for script expansion and OpenAI TTS for narration
- **3D Visualizations**: TresJS/Three.js integration for immersive physics animations
- **Complete Pipeline**: Prompt → Script → Narration → Visuals → Final Video
- **Live Preview**: Real-time 3D scene preview with timeline scrubber
- **JSON Editor**: Edit video specifications with visual and raw JSON modes
- **Deterministic Output**: seed=42 ensures reproducible results

## Technology Stack

### Frontend
- **Nuxt 4** - Vue 3 framework with improved type inference and app/ directory structure
- **Nuxt UI v4** - Comprehensive component library
- **TresJS** - Vue 3 wrapper for Three.js 3D graphics
- **GSAP** - Animation library for smooth transitions
- **Tailwind CSS** - Utility-first CSS framework

### Backend & Processing
- **OpenAI GPT-4o-mini** - LLM for prompt expansion and component generation
- **OpenAI TTS** - Text-to-speech for narration (voice="alloy")
- **fluent-ffmpeg** - Video/audio processing and assembly
- **Playwright** - Headless browser for 3D scene recording

### Validation & Testing
- **Zod** - Runtime schema validation
- **TypeScript** - Static type checking
- **Vitest** - Unit testing framework

## Prerequisites

- Node.js 20+ 
- FFmpeg (for video processing)
- OpenAI API key

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/ielvisd/synapvid.git
cd synapvid
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### 1. Generate Video Specification (Home Page)

Navigate to the home page and enter a prompt:

**Example Prompts:**
- "Explain Newton's First Law with a rocket example"
- "Demonstrate projectile motion using a basketball"
- "Explain conservation of momentum with colliding objects"

Optional fields:
- **Learning Objectives**: Specific goals for the video
- **Real-World Examples**: Concrete examples to include

Click "Generate Video Spec" to create a structured JSON specification.

### 2. Edit Specification (Editor Page)

Fine-tune the generated specification:
- Adjust scene timings
- Edit narration text
- Modify visual events
- Configure style settings (colors, voice, transitions)

Switch between Visual Editor and JSON Editor modes.

### 3. Preview Scenes (Preview Page)

Preview your 3D scenes before final rendering:
- Navigate through scenes using the timeline scrubber
- Adjust camera angle and quality settings
- View current scene information

### 4. Export Video (Export Page)

Configure export settings and generate the final video:
- Resolution: 720p, 1080p, or 4K
- Frame rate: 24, 30, or 60 fps
- Quality: low, medium, high, or ultra
- Include/exclude subtitles

Download the exported video, timing cues (JSON), and transcript (TXT).

## Project Structure

```
synapvid/
├── app/                      # Nuxt 4 app directory
│   ├── assets/
│   │   └── css/
│   │       └── main.css     # Tailwind & Nuxt UI imports
│   ├── components/
│   │   └── AudioPreview.vue # Audio playback component
│   ├── composables/         # Vue composables (business logic)
│   │   ├── usePromptExpansion.ts
│   │   ├── useNarrationSynthesis.ts
│   │   ├── useVisualGeneration.ts
│   │   └── useVideoAssembly.ts
│   ├── layouts/
│   │   └── default.vue      # Default layout with navigation
│   └── pages/
│       ├── index.vue        # Home (prompt input)
│       ├── editor.vue       # JSON editor
│       ├── preview.vue      # 3D preview
│       └── export.vue       # Video export
├── schemas/
│   └── videoSpec.ts         # Zod validation schemas
├── server/
│   └── api/
│       ├── openai/
│       │   ├── expand.post.ts   # Prompt expansion endpoint
│       │   └── tts.post.ts      # Text-to-speech endpoint
│       ├── visuals/
│       │   └── generate.post.ts # Visual generation endpoint
│       └── video/
│           └── assemble.post.ts # Video assembly endpoint
├── public/                  # Static files
│   ├── audio/              # Generated audio files
│   └── videos/             # Generated video files
├── app.vue                 # App root with UApp wrapper
├── nuxt.config.ts          # Nuxt configuration
└── package.json            # Dependencies
```

## MCP Integration

This project leverages Model Context Protocol (MCP) servers for development:

### Used MCP Servers

1. **nuxt-ui MCP** - Component discovery and API reference
   - Used to discover correct component APIs (UForm, UInput, UButton, etc.)
   - Prevents hardcoding incorrect implementations
   - Documentation: https://ui.nuxt.com

2. **vue-app-mcp** - App structure patterns
   - Consulted for composable patterns
   - State management best practices
   - Routing conventions

3. **Playwright MCP** - Browser automation
   - Used for 3D scene recording workflows
   - End-to-end testing infrastructure

4. **chrome-devtools MCP** - Debugging and inspection
   - Used for debugging rendering issues
   - Network request inspection
   - Performance analysis

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run typecheck

# Run tests
npm test

# Run tests with UI
npm test:ui
```

### Adding New Visual Actions

1. Define the action in the `VisualEvent` schema (`schemas/videoSpec.ts`)
2. Implement the animation in `useVisualGeneration.ts`
3. Add the action to the LLM prompt in `server/api/visuals/generate.post.ts`

### Adding New Scene Types

1. Update the `SceneTypeSchema` in `schemas/videoSpec.ts`
2. Add the type to scene type options in editor
3. Update LLM prompts to handle the new type

## API Costs

Approximate costs per video (using OpenAI API):
- Prompt expansion (GPT-4o-mini): ~$0.001-0.005
- Narration synthesis (TTS): ~$0.015-0.040
- Visual generation (GPT-4o-mini): ~$0.005-0.015

**Total**: ~$0.01-0.05 per video

## Troubleshooting

### OpenAI API Key Issues
- Ensure your API key is correctly set in `.env`
- Check that you have sufficient credits in your OpenAI account
- Verify API key permissions for GPT-4o-mini and TTS

### FFmpeg Not Found
Install FFmpeg:
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt-get install ffmpeg`
- Windows: Download from https://ffmpeg.org/download.html

### Port Already in Use
Change the port in `nuxt.config.ts` or set via environment:
```bash
PORT=3001 npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Acknowledgments

- OpenAI for GPT-4o-mini and TTS APIs
- Nuxt team for Nuxt 4 and Nuxt UI
- TresJS team for the Three.js Vue wrapper
- All open-source contributors

## Support

For issues and questions:
- GitHub Issues: https://github.com/ielvisd/synapvid/issues
- Documentation: See `prd.md` and `architecture.md` for detailed specs

---

Built with ❤️ for physics education

