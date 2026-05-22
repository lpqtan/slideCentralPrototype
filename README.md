# Slide Central

Generate CPF-branded presentations with AI — from briefing to polished deck.

## Overview

Slide Central is a standalone Next.js web application that guides users through a structured briefing process and uses AI to generate slide outlines, content prompts, and fully rendered HTML slide decks. Decks can be previewed in-browser and exported as `.pptx` PowerPoint files.

It replaces the Open Design web UI with a custom-branded experience while leveraging the Open Design daemon (or direct LLM APIs) as the AI processing engine.

## Prerequisites

- **Node.js** 18+ (tested with latest LTS)
- **npm** 9+
- (Optional) **Open Design daemon** — for AI-powered generation via agent CLIs

## Quick Start

```bash
# Clone and enter the project
git clone https://github.com/lpqtan/slideCentralPrototype.git
cd slideCentralPrototype

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```

The app will be available at **http://localhost:3000**.

## Starting Each Component

### 1. The Next.js Web App (Slide Central)

This is the main user-facing application. It runs on its own.

```bash
npm run dev
```

Open http://localhost:3000. The landing page shows a **Start New Deck** button leading into the briefing wizard.

#### Build for production

```bash
npm run build
npm start
```

#### Lint

```bash
npm run lint
```

### 2. Open Design Daemon (AI Backend — Option A)

The daemon handles AI-powered slide generation by spawning coding-agent CLIs. It must be running separately for the `daemon` backend strategy to work.

#### Prerequisites for Daemon

- **pnpm** (`npm install -g pnpm`)
- At least one supported coding-agent CLI on your `PATH`:
  - Claude Code (`claude`)
  - Codex CLI (`codex`)
  - Gemini CLI (`gemini`)
  - Cursor Agent (`cursor-agent`)
  - OpenCode (`opencode`)
  - See full list in `referenceRepos/open-design-main/README.md`

#### Setup & Start

```bash
# Navigate to the Open Design repo
cd referenceRepos/open-design-main

# First-time install (only once)
pnpm install

# Start the daemon and web app
pnpm tools-dev start web --daemon-port 7456
```

The daemon listens at **http://localhost:7456**. Verify:

```bash
curl http://localhost:7456/api/health
```

#### Troubleshooting Daemon

If `pnpm tools-dev` fails:
1. Ensure `pnpm` is installed: `npm install -g pnpm`
2. Ensure Node.js ~24 is installed
3. Try running the daemon directly: `cd apps/daemon && npx tsx src/server.ts`
4. Check that at least one coding-agent CLI is on your `PATH`: `which claude` or `which codex`

#### Using the Daemon in Slide Central

1. Start the daemon (see above)
2. In Slide Central, go to **AI Settings**
3. Select **Open Design Daemon** as the backend strategy
4. Save settings

The daemon must be running whenever you use the `daemon` strategy.

### 3. Direct LLM API (AI Backend — Option B)

For development or when the daemon is not available, Slide Central can call LLM APIs directly.

Go to **AI Settings** → select **Direct LLM API** → choose a provider and enter your API key.

| Provider | Free Tier | Default Model | Key Needed |
|----------|-----------|---------------|------------|
| **Gemini** | Yes | `gemini-2.0-flash` | Free from [Google AI Studio](https://aistudio.google.com/apikey) |
| **Groq** | Yes | `llama-3.3-70b` | Free from [Groq Console](https://console.groq.com/keys) |
| **OpenRouter** | Free models | `google/gemini-2.0-flash-001` | Free from [OpenRouter](https://openrouter.ai/keys) |
| **OpenAI** | No (paid) | `gpt-4o-mini` | [Platform dashboard](https://platform.openai.com/api-keys) |

Set the API key in macOS/Linux:

```bash
# Used as default if no key is set in Settings UI
export GEMINI_API_KEY="your-key-here"
export GROQ_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
```

### 4. Mock Backend (Development Mode — Option C)

For UI development without any AI dependencies, the **Mock** strategy returns hardcoded responses. This lets you test and build the frontend without running a daemon or paying API costs.

Select **Mock** in Settings. Available immediately — no setup needed.

## Project Structure

```
src/
├── app/
│   ├── globals.css              # Tailwind v4 + CPF brand @theme tokens
│   ├── layout.tsx               # Root layout (design bar, header nav, Roboto font)
│   ├── page.tsx                 # Landing page
│   ├── briefing/
│   │   └── page.tsx             # Multi-step briefing wizard
│   ├── slides/[id]/
│   │   ├── page.tsx             # Content editor (Phase 4)
│   │   └── preview/page.tsx     # Deck preview iframe (Phase 5)
│   ├── settings/
│   │   └── page.tsx             # Backend strategy + provider + API key
│   └── api/                     # Next.js API routes (Phases 3+)
├── lib/
│   ├── types.ts                 # Shared TypeScript types
│   ├── brands.ts                # CPF colour/font constants + posture rules
│   ├── instructions.ts          # Objectives, audiences, modes, narrative arcs
│   ├── layouts.ts               # 16 CPF layout definitions
│   └── strategies/              # Backend strategy implementations
│       ├── types.ts             # Strategy interface
│       ├── registry.ts          # Strategy factory
│       ├── mock.ts              # Mock strategy
│       ├── daemon.ts            # OD daemon client
│       └── llm.ts               # Direct LLM client
├── components/
│   ├── wizard/                  # Wizard step components
│   ├── editor/                  # Slide editing components
│   ├── preview/                 # Deck preview + navigation
│   ├── settings/                # Settings UI components
│   └── shared/                  # Shared UI (StepIndicator, StatusBadge, etc.)
└── hooks/
    ├── useBriefing.ts           # Wizard state management
    ├── useDeckStore.ts          # localStorage deck CRUD
    └── useStrategy.ts           # Active backend strategy
```

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Done | Scaffolding, brand tokens, app shell, landing page, settings |
| 2 | Done | Briefing wizard with real inputs (context, message, narrative, template) |
| 3 | Done | Backend strategy layer — mock strategy, strategy registry, prompt assembly, `/api/generate-outline`, `/api/health`, outline display page with inline editing |
| 4 | — | Daemon backend integration |
| 5 | — | Direct LLM backend integration |
| 6 | — | Content editor (per-slide body content) |
| 7 | — | Deck building + HTML preview |
| 8 | — | PPTX export |
| 9 | — | Polish, persistence, history |

## Reference Repos

The `referenceRepos/` directory contains two projects used as design and architectural reference. These are gitignored and not part of the Slide Central build.

- `corporate-template-main/` — CPF slide template with 16 layouts, brand spec, PPTX generator
- `open-design-main/` — Open Design platform (daemon, web app, skills, design systems)
