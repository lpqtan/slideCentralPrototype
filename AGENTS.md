# AGENTS.md — Slide Central Prototype

## Project

Next.js 16 + React 19 + TypeScript + Tailwind v4 app. Generates CPF-branded presentations via AI briefing → outline → HTML deck → PPTX export.

## Commands

```
npm install          # install deps (npm, NOT pnpm — pnpm is only for the open-design submodule)
npm run dev          # dev server (Turbopack, port 3000)
npm run build        # production build
npm run lint         # ESLint on src/
```

No test script or test files exist. No explicit typecheck script; use `npx tsc --noEmit` if needed.

## Prerequisites

- **Node 20** — pinned in `.nvmrc`
- **MongoDB** — runs in Docker container `mongo-test` on port 27017
  - `docker compose up -d` or `./start.sh` (which also starts the dev server)
  - App works without MongoDB; only Gallery/Save-to-DB features are unavailable
- **`.env.local`** — not committed. Expected keys: `MONGODB_URI`, `MONGODB_DB`

## Architecture

### AI Backend Strategies (`src/lib/strategies/`)

Three strategies registered in `registry.ts`:
- **mock** — hardcoded demo outline, no AI call
- **llm** — direct LLM API calls (Gemini, Groq, OpenRouter, OpenAI) with OD-style 6-layer prompts
- **daemon** — Open Design daemon at `http://localhost:7456`, spawns coding agents (OpenCode, Claude Code, etc.) for full deck generation
- **opencode-direct** — OpenCode direct strategy (registered but less used)

API keys stored in browser localStorage, not server-side. Settings page at `/settings`.

### Key API Routes (all SSE streaming)

| Route | Purpose |
|---|---|
| `/api/generate-outline-stream` | POST — generates slide outline via selected strategy |
| `/api/build-deck-stream` | POST — builds HTML deck (daemon creates OD project + skill, others use client-side builder) |
| `/api/export-pptx` | POST — exports HTML to .pptx via pptxgenjs |
| `/api/decks` | GET list / POST save deck to MongoDB |
| `/api/decks/[id]` | GET single / DELETE / PATCH |
| `/api/decks/[id]/pptx` | POST — generates PPTX from DB-stored HTML |
| `/api/health` | POST — strategy health check |
| `/api/health/mongo` | GET — MongoDB health check |
| `/api/test-daemon` | POST — daemon connection test |
| `/api/parse-pdf` | POST — PDF text extraction |
| `/api/chat-briefing` | POST — chat-based briefing |

### User Flow

Landing → Briefing Wizard (5 steps, state in localStorage) → Generate Outline → `/outline` editor → Build Deck → `/preview` → Save to DB / Download PPTX → `/gallery`

### State Management

- **Briefing wizard**: `useBriefing` hook — localStorage keys `slidecentral-current-briefing`, `slidecentral-current-step`
- **Saved decks**: `useDeckStore` hook — localStorage
- **MongoDB**: `src/lib/mongodb.ts` — global singleton cache on `globalThis.__mongoCache`
- **Daemon status**: `useDaemonStatus` — polls `/api/health` every 30s
- **Mongo status**: `useMongoStatus` — polls `/api/health/mongo` every 30s

## Git Submodule

`open-design` — submodule at `release/v0.6.1` from `https://github.com/nexu-io/open-design.git`. Contains the daemon, skills, and design systems. Not part of the Slide Central build.

To init/update: `git submodule update --init --recursive`

## Directory Boundaries

- `src/app/` — Next.js App Router pages + API routes
- `src/lib/` — shared logic (types, prompts, strategies, MongoDB, deck builder, brand constants)
- `src/components/` — wizard steps + shared UI
- `src/hooks/` — React hooks for state
- `referenceRepos/` — gitignored, reference-only (not built)
- `open-design/` — git submodule (daemon, skills)
- `.od/` — gitignored, open-design daemon artifacts

## Conventions

- Path alias: `@/*` → `./src/*`
- ESLint: `@typescript-eslint/no-unused-vars` warn with `argsIgnorePattern: "^_"`, `no-console` off
- Tailwind v4 with CPF brand tokens in `globals.css`
- British English in all generated content
- `serverExternalPackages: ["mongodb"]` in next.config.ts
