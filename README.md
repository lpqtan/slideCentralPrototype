# Slide Central

Generate CPF-branded presentations with AI — from briefing to polished deck.

## Overview

Slide Central is a standalone Next.js web application that guides users through a structured briefing process and uses AI to generate slide outlines, content prompts, and fully rendered HTML slide decks. Completed decks are stored in MongoDB and can be previewed, browsed in a gallery, and exported as `.pptx` PowerPoint files.

Three AI backends are supported: **Mock** (pre-built demo), **Direct LLM API** (Gemini, Groq, OpenRouter, OpenAI), and **Open Design Daemon** (spawns coding agents like OpenCode with full file-system access for deck building).

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **npm** 10+ (bundled with Node.js)
- **Docker** — [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Colima](https://github.com/abiosoft/colima) (`brew install colima docker`)
- (Optional) **pnpm** — only needed for the [Open Design daemon](#open-design-daemon-option-b--full-pipeline)

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/lpqtan/slideCentralPrototype.git
cd slideCentralPrototype
npm install
```

### 2. Start MongoDB

MongoDB runs in Docker for zero-config setup:

```bash
docker compose up -d
```

This starts MongoDB on port 27017 with persistent storage. The `.env.local` file is already configured to connect to it.

### 3. Start the app

```bash
npm run dev
```

Opens at **http://localhost:3000**.

### 4. Stop MongoDB when done

```bash
./stop.sh
```

Or: `docker compose down`

### Alternative: `start.sh`

The `start.sh` script automates steps 2–3. It checks Docker, starts/creates the MongoDB container, waits for readiness, then launches the dev server.

```bash
chmod +x start.sh
./start.sh
```

---

## MongoDB Configuration

The `.env.local` file contains:

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=slidecentral
```

| Setup | MONGODB_URI |
|---|---|
| **Local (default)** | `mongodb://localhost:27017` — works with `docker compose up -d` |
| **MongoDB Atlas** | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority` |
| **Enterprise** | Your enterprise cluster connection string |

The app is resilient — if MongoDB is unreachable, the app still works fine. Only the Gallery and "Save to DB" features will be unavailable. No data is lost; in-progress decks are stored in your browser's localStorage.

### Manual data inspection

```bash
docker exec -it mongo-test mongosh
```

```js
use slidecentral
db.decks.countDocuments()
db.decks.find({}, { deckId: 1, name: 1, status: 1 }).pretty()
```

---

## Adding API Keys

API keys are stored **locally in your browser** via localStorage. Nothing is sent to a server.

### Via the UI (Recommended)

1. Open http://localhost:3000/settings
2. Select **Direct LLM API** as the backend strategy
3. Choose your provider (Gemini, Groq, OpenRouter, or OpenAI)
4. Enter your API key in the **API Key** field
5. Click **Save Settings**

The key is saved in your browser's localStorage. A green dot + "Key saved" confirms it's stored.

### Via Environment Variables

As a fallback if no key is set in the UI:

```bash
export GEMINI_API_KEY="your-key-here"
export GROQ_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
```

### Getting Free Keys

| Provider | Get Key From | Free Tier? |
|----------|-------------|------------|
| **Gemini** | [Google AI Studio](https://aistudio.google.com/apikey) | Yes |
| **Groq** | [Groq Console](https://console.groq.com/keys) | Yes |
| **OpenRouter** | [OpenRouter](https://openrouter.ai/keys) | Yes (free models) |
| **OpenAI** | [Platform dashboard](https://platform.openai.com/api-keys) | No (paid) |

---

## AI Backend Strategies

### Mock (Default — No Setup)

Pre-built 8-slide demo deck about CPF member engagement. Select **Mock** in AI Settings. Immediately generates the demo outline. Build Deck goes straight to preview — no AI call needed.

### Direct LLM API (Option A — Free Tier)

Calls LLM APIs directly using Open Design-style layered prompts (6-layer system prompt with identity charter, anti-slop rules, slide architecture, archetypes, quality self-audit, and output format).

**Setup:**
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open http://localhost:3000/settings
3. Select **Direct LLM API**
4. Choose **Gemini** (default: `gemini-3.5-flash`)
5. Paste your key in the **API Key** field
6. Click **Save Settings**

Now "Generate Outline" will call Gemini directly. Real-time text streaming appears on the generating page.

**Supported providers:**

| Provider | Default Model | Streaming | JSON Mode |
|----------|--------------|-----------|-----------|
| Gemini | `gemini-3.5-flash` | Yes (real-time) | Native |
| Groq | `llama-3.3-70b` | Yes | `response_format` |
| OpenRouter | `google/gemini-2.0-flash-001` | Yes | Regex fallback |
| OpenAI | `gpt-4o-mini` | Yes | `response_format` |

### Open Design Daemon (Option B — Full Pipeline)

Uses the Open Design daemon to spawn coding agents (OpenCode, Claude Code, etc.) with full file-system access. For **outline generation**, sends prompts through the agent. For **deck building**, creates a project with the `simple-deck` skill, uploads brand spec + instructions + outline, and lets the agent generate complete HTML decks using the OD framework.

**Prerequisites:**
- **pnpm:** `npm install -g pnpm`
- A coding-agent CLI on your `PATH`. The daemon auto-detects installed agents:
  - **OpenCode** (`opencode`) — default
  - Claude Code (`claude`)
  - Codex CLI (`codex`)
  - Gemini CLI (`gemini`)
  - Cursor Agent (`cursor-agent`)

**Setup & Start:**

```bash
cd referenceRepos/open-design-main
pnpm install                                   # first time only
pnpm tools-dev                                 # starts daemon + web app
```

The daemon listens at **http://localhost:7456**. Verify:

```bash
curl http://localhost:7456/api/health
```

**Using it in Slide Central:**
1. Start the daemon (see above)
2. Open http://localhost:3000/settings
3. Select **Open Design Daemon**
4. Pick a **Coding Agent** (e.g. OpenCode)
5. Pick a **Model** (e.g. `opencode/big-pickle` — your daemon's `/api/agents` endpoint lists available models)
6. Click **Test Connection** to verify the agent works
7. **Save Settings**

**Troubleshooting Daemon:**

If `pnpm tools-dev` fails:
1. Ensure `pnpm` is installed: `npm install -g pnpm`
2. Ensure Node.js ~24 is installed
3. Try running the daemon directly: `cd apps/daemon && npx tsx src/server.ts`
4. Check agents: `curl http://localhost:7456/api/agents` — look for `"available": true`
5. Check your agent CLI is on `PATH`: `which opencode` or `which claude`

---

## Full User Flow

```
Landing Page
  → Start New Deck
    → Briefing Wizard (5 steps)
      Step 1: Context (Objective, Audience, Mode)
      Step 2: Message (Key Message, The Ask)
      Step 3: Content (Additional context / PDF upload)
      Step 4: Narrative (Proposal / Status / Teaching arc)
      Step 5: Template (Preset deck theme / layout)
    → Generate Outline
      → /generating (loading page with activity log + real-time text)
        → /outline (edit titles, content prompts, reorder slides)
          → Build Deck
            → /building (AI pipeline: agent generates HTML deck)
              → /preview (interactive deck with keyboard nav + editing)
                → Save to DB → Download PPTX
  → Saved Decks
    → /gallery (browse all completed decks stored in MongoDB)
      → Preview / Download PPTX / Delete
```

**When Mock is selected:** both Generate Outline and Build Deck skip the AI pipeline and use pre-built/client-side generation for instant results.

---

## Production Build

### Local Production

```bash
npm run build
npm start
```

### Docker Deployment

Build and run with MongoDB in one command:

```bash
docker compose up --build -d
```

Opens at **http://localhost:3000**. The app connects to the MongoDB container automatically.

Stop everything:

```bash
docker compose down
```

To stop MongoDB only (keeps app running):

```bash
docker compose stop mongo
```

To rebuild after code changes:

```bash
docker compose up --build -d
```

---

## Local Development

For local development with MongoDB + dev server (and optionally the Open Design daemon), use `start.sh`:

```bash
chmod +x start.sh
./start.sh
```

This starts MongoDB, the Open Design daemon, and the Next.js dev server on port 3000.

To stop everything:

```bash
./stop.sh
```

Or manually: `docker compose down`

Lint:

```bash
npm run lint
```

---

## Testing

The project uses **Vitest** for unit tests and **Playwright** for end-to-end tests.

### Prerequisites

```bash
npm install                               # installs vitest + playwright as devDependencies
npx playwright install --with-deps chromium   # download Chromium for E2E tests
```

### Unit Tests

```bash
npm test              # run all unit tests once
npm run test:watch    # run in watch mode during development
```

Unit tests cover:
- **Pure functions:** `extractJson`, `buildSystemPrompt`, `buildUserPrompt`, `buildDeckHtml`, layout definitions, mock deck generation
- **API route handlers:** `/api/generate-outline-stream`, `/api/build-deck-stream`, `/api/export-pptx`, `/api/health` (called directly without a server)

### E2E Tests

```bash
npm run test:e2e          # run all E2E tests (starts dev server automatically)
npm run test:e2e:ui       # run with Playwright's interactive UI
```

E2E tests cover:
- **Mock flow:** Full user journey — landing page, 5-step briefing wizard, outline generation, deck building, preview page, download buttons
- **LLM flow:** Outline generation and deck building across providers (Gemini, Groq, OpenRouter, OpenAI)
- **Settings page:** Strategy selection, provider selection, persistence

#### LLM Provider Tests

LLM E2E tests are **parameterised** across all 4 providers. Each provider's tests are **skipped** if its API key isn't available. Set env vars to enable them:

```bash
export GEMINI_API_KEY="your-key"       # enables Gemini tests
export GROQ_API_KEY="your-key"         # enables Groq tests
export OPENROUTER_API_KEY="your-key"   # enables OpenRouter tests
export OPENAI_API_KEY="your-key"       # enables OpenAI tests

npm run test:e2e
```

### CI / GitHub Actions

The `.github/workflows/ci.yml` workflow runs on every push and PR:

| Job | What it does |
|---|---|
| **Lint & Typecheck** | `npm run lint` + `npx tsc --noEmit` |
| **Unit Tests** | `npm test` (Vitest) |
| **E2E Tests** | `npm run test:e2e` (Playwright with Chromium) |

To enable LLM E2E tests in CI, add repository secrets:
`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`

Playwright reports are uploaded as artifacts on every CI run.

---

## Project Structure

```
slideCentralPrototype/
├── .env.local                    # MongoDB connection config
├── .nvmrc                        # Node version pin (20)
├── docker-compose.yml            # MongoDB + app container definitions
├── Dockerfile                    # Multi-stage production build
├── .dockerignore                 # Build context exclusions
├── start.sh                      # Start MongoDB + daemon + dev server (local dev)
├── stop.sh                       # Stop MongoDB container
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts              # Vitest unit test configuration
├── playwright.config.ts          # Playwright E2E test configuration
├── postcss.config.mjs
├── eslint.config.mjs
├── .github/workflows/ci.yml     # GitHub Actions CI pipeline
├── e2e/                          # Playwright E2E tests
│   ├── mock-flow.spec.ts         # Full user flow with mock strategy
│   ├── llm-flow.spec.ts          # Multi-provider LLM flow tests
│   └── settings.spec.ts          # Settings page tests
└── src/
    ├── app/
    │   ├── globals.css              # Tailwind v4 + CPF brand @theme tokens
    │   ├── layout.tsx               # Root layout (design bar, header nav, status pills)
    │   ├── page.tsx                 # Landing page with saved deck cards
    │   ├── briefing/page.tsx        # 5-step briefing wizard
    │   ├── chat-briefing/page.tsx    # Chat-based briefing
    │   ├── generating/              # Outline generation loading page (SSE)
    │   ├── outline/                 # Outline editor (titles, content, drag-and-drop)
    │   ├── building/                # Deck building loading page (SSE)
    │   ├── preview/                 # Deck preview + edit + PPTX download + DB save
    │   ├── gallery/page.tsx         # Database deck browser with thumbnails
    │   ├── workspace/page.tsx       # Workspace page
    │   ├── settings/                # AI settings: strategy, agent, model, API key
    │   └── api/
    │       ├── health/route.ts          # Strategy health check (POST)
    │       ├── health/mongo/route.ts    # MongoDB health check (GET)
    │       ├── generate-outline-stream/route.ts  # SSE outline endpoint
    │       ├── build-deck-stream/route.ts   # Deck building SSE endpoint
    │       ├── export-pptx/route.ts     # PowerPoint export from HTML
    │       ├── chat-briefing/route.ts   # Chat briefing endpoint
    │       ├── parse-pdf/route.ts       # PDF text extraction
    │       ├── test-daemon/route.ts     # Daemon connection test
    │       └── decks/
    │           ├── route.ts             # GET list / POST save
    │           └── [id]/
    │               ├── route.ts         # GET single / DELETE / PATCH
    │               └── pptx/route.ts    # PPTX generation from DB-stored HTML
    ├── lib/
    │   ├── types.ts                 # Shared TypeScript types
    │   ├── db-types.ts              # MongoDB document types
    │   ├── mongodb.ts               # MongoDB client singleton
    │   ├── brands.ts                # CPF colour/font constants + posture rules
    │   ├── instructions.ts          # Objectives, audiences, modes, narrative arcs
    │   ├── layouts.ts               # 16 CPF layout definitions
    │   ├── logos.ts                 # Logo assets/config
    │   ├── prompts.ts               # Original prompt assembly
    │   ├── prompts-od.ts            # OD-style 6-layer prompt assembly
    │   ├── prompts-chat-briefing.ts # Chat briefing prompt assembly
    │   ├── deck-builder.ts          # Client-side HTML deck generator
    │   ├── mock-deck.ts             # Pre-built 8-slide demo deck
    │   └── strategies/
    │       ├── types.ts             # BackendStrategy interface
    │       ├── registry.ts          # Strategy factory (mock / daemon / llm)
    │       ├── mock.ts              # Mock strategy — hardcoded outlines
    │       ├── daemon.ts            # OD daemon client — SSE, chat, project creation
    │       ├── llm.ts               # Direct LLM client — Gemini, Groq, OpenRouter, OpenAI
    │       └── opencode-direct.ts   # OpenCode direct strategy
    ├── components/
    │   ├── wizard/                  # StepContext, StepMessage, StepNarrative, StepTemplate, StepContent
    │   └── shared/                  # StepIndicator, DaemonStatusPill, MongoStatusPill
    └── hooks/
        ├── useBriefing.ts           # Wizard state + localStorage persistence
        ├── useDeckStore.ts          # Deck CRUD in localStorage
        ├── useDaemonStatus.ts       # Polls daemon health every 30s
        ├── useMongoStatus.ts        # Polls MongoDB health every 30s
        └── useHistory.ts            # Undo/redo history tracking
```

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Done | Scaffolding, brand tokens, app shell, landing page, settings |
| 2 | Done | Briefing wizard (context, message, content, narrative, template) |
| 3 | Done | Backend strategy layer, mock strategy, outline display with editing |
| 4 | Done | Daemon backend — SSE chat, agent spawning, health check |
| 5 | Done | Direct LLM API — OD-style prompts, proxy streaming, 4 providers |
| 6 | Done | Content editor — inline body editing, drag-and-drop reorder, lock/unlock |
| 7 | Done | Deck building — OD pipeline (project + skill + brand + agent), /preview |
| 8 | Done | PPTX export — pptxgenjs with CPF branding |
| 9 | Done | MongoDB integration — persistent storage, gallery, DB status pill |
| 10 | — | Polish, deck history, landing page refinements |

## Reference Repos

The `referenceRepos/` directory is gitignored and not part of the Slide Central build. It contains:

- `corporate-template-main/` — CPF slide template with 16 layouts, brand spec, PPTX generator
- `open-design-main/` — Open Design platform (daemon, web app, skills, design systems)
