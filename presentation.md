# Slide Central — Backend Architecture & API Processes

## System Overview

Slide Central is a **Next.js App Router** web application that generates CPF-branded presentation decks using AI. It supports four backend strategies, a structured briefing wizard, a conversational chat briefing, an editable outline stage, deck building, live HTML preview, and PPTX export.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, PptxGenJS. All state persisted in **localStorage** (no database).

## User Flow

```
Home Page
  ├── "Start New Deck" → /briefing (4-step wizard) → /generating → /outline → /building → /preview
  ├── "Chat Briefing"  → /chat-briefing (conversational) → /generating → (same pipeline)
  ├── "Workspace"      → /workspace (iframe: localhost:7457)
  └── "AI Settings"    → /settings
```

---

## Page Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Lists saved decks, "Start New Deck" and "Chat Briefing" CTAs |
| `/briefing` | Briefing Wizard | 4-step structured form: context → message → narrative → template |
| `/chat-briefing` | Chat Briefing | Conversational AI interface, SSE streaming, extracts BriefingData |
| `/generating` | Generating | SSE progress page — shows real-time AI output during outline generation |
| `/outline` | Outline Editor | Edit, reorder, lock, delete slides. Add body content and image URLs. Drag-and-drop reorder. Source badge shows which backend generated the outline |
| `/building` | Building | SSE progress page — shows real-time AI output during deck HTML generation |
| `/preview` | Preview | Renders built deck in iframe, keyboard navigation, PPTX download |
| `/workspace` | Workspace | Embeds Open Design web app at `localhost:7457` in iframe |
| `/settings` | AI Settings | Configure strategy, provider, API key, agent, model |

---

## API Endpoints

### `POST /api/generate-outline` — Generate Outline (JSON)

**Request:**
```json
{
  "briefing": { "objective": "approval", "audience": "exco", "mode": "presenting", "keyMessage": "...", "audienceAsk": "...", "narrativeArc": "proposal", "selectedLayouts": [], "slideCount": 12 },
  "strategy": "mock" | "daemon" | "llm" | "opencode-direct",
  "provider": "...",
  "apiKey": "...",
  "model": "...",
  "existingOutline": [],
  "lockedSlideNumbers": [],
  "regenerationPrompt": "..."
}
```

**Response:** `{ "outline": [SlideOutline], "source": GenerationSource }`

**Flow:**
- **Daemon:** Calls `findAgent()` → `POST localhost:7456/api/chat` with system/user prompts → parses SSE → extracts JSON
- **LLM / OpenCode Direct:** Delegates to strategy implementation
- **Mock:** Delegates to `backend.generateOutline()`
- If `regenerationPrompt` exists: merges locked slides back

---

### `POST /api/generate-outline-stream` — Generate Outline (SSE)

Same request body as above. Returns SSE stream:

```
event: status
data: {"stage":"connecting","message":"Connecting to mock..."}

event: status
data: {"stage":"generating","message":"Thinking... (50%)"}

event: text_delta
data: {"delta":"[\n  {"}

event: complete
data: {"outline":[...],"source":{...}}

event: error
data: {"message":"..."}
```

**Three backend paths:**
- **Daemon:** proxies daemon SSE events — forwards `agent` (text_delta) and `stdout` chunks
- **LLM:** uses `streamProvider()` from llm.ts — proxy streams from Gemini/Groq/OpenRouter/OpenAI
- **Mock:** simulates progress (25/50/75/100%), then returns outline

---

### `POST /api/build-deck-stream` — Build Deck HTML (SSE)

**Request:** `{ "slides": [SlideContent], "strategy": "...", "agentId": "...", "model": "..." }`

**Response:** SSE with `status`, `text_delta`, `complete` (`{ html }`), `error`

**Two paths:**
- **Non-daemon (mock/LLM):** Simulates progress, then calls `buildDeckHtml(slides)` from deck-builder.ts
- **Daemon (full pipeline):**
  1. `POST localhost:7456/api/projects` — creates project with `skillId: "simple-deck"`, `kind: "deck"`
  2. `POST /api/projects/:id/files` — uploads `outline.md`, `brand-spec.md`, `instructions.md`
  3. `POST /api/chat` — system prompt with full 1920×1080 deck framework HTML skeleton + slot markers
  4. Parses SSE from agent
  5. Fetches generated `index.html` from project files
  6. Falls back to `buildDeckHtml()` if daemon output is empty

---

### `POST /api/chat-briefing` — Chat Briefing (SSE)

**Request:** `{ "messages": [{role, content}], "extractOnly": false, "strategy": "...", "provider": "...", "apiKey": "..." }`

**Response:** SSE with `status`, `text_delta`, `complete` (`{ status: "needs_more"|"complete", message, followUpQuestions, summary, briefing, rawOutput }`), `error`

**Three backend paths based on strategy:**
- **OpenCode Direct:** `chatOpenCode(prompt)` — spawns `opencode` CLI, stdin/stdout
- **LLM:** `callProvider()` — Gemini 2.5 Flash Lite / Gemini 3.5 Flash
- **Fallback:** OpenRouter API (`openrouter/free` — auto-selects free models) with SSE streaming

---

### `POST /api/export-pptx` — PowerPoint Download

**Request:** `{ "slides": [SlideContent] }`

**Response:** Binary `.pptx` file with headers `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation` and `Content-Disposition: attachment`

**Uses PptxGenJS** to build 16:9 slides with CPF branding:
- **Cover:** Green background, title, subtitle, footer band
- **Closing:** Green background, centered title
- **Section Divider:** Mint, green band at bottom
- **Big Stat:** Green, large centered number
- **Quote:** Green, italic quote
- **Default:** Mint, design bar, title, bullet list
- All slides have footer with slide number

---

### `POST /api/health` — Health Check

**Request:** `{ "strategy": "..." }`  
**Response:** `{ "healthy": true | false }`

Delegates to `backend.healthCheck()` for each strategy.

---

### `POST /api/test-daemon` — Test Daemon Connection

**Request:** `{ "agentId": "..." }`  
**Response:** `{ "success": true, "output": "...", "agent": "opencode", "durationMs": 10341 }`

Sends a test prompt through the daemon to verify agent connectivity.

---

## Backend Strategies

All strategies implement:
```typescript
interface BackendStrategy {
  id: string;
  generateOutline(briefing): Promise<SlideOutline[]>;
  healthCheck(): Promise<boolean>;
}
```

### Mock Strategy
- **How:** Deterministic algorithm — no AI call
- **Output:** Hardcoded titles per narrative arc (proposal/status/teaching), layouts assigned by position logic, generic content prompts

### Open Design Daemon
- **How:** Spawns coding agent via `POST localhost:7456/api/chat`
- **Flow:** `findAgent()` → build system prompt (brand rules + content principles + 16 layouts from `prompts.ts`) → user prompt (briefing data) → SSE stream → extract JSON
- **For deck building:** Creates OD project, uploads outline + brand spec + instructions, agent generates HTML with deck framework

### Direct LLM API
- **How:** Direct HTTP calls to Gemini / Groq / OpenRouter / OpenAI
- **Prompt:** OD-style 6-layer system prompt from `prompts-od.ts` (identity → anti-slop → architecture → archetypes → self-audit → format)
- **Streaming:** Proxy streams LLM provider SSE → forwards `text_delta` events to frontend
- **Gemini:** Native JSON mode, special API format (`systemInstruction` + `contents`)
- **Others:** OpenAI-compatible chat completions with `response_format: "json_object"`

### Local OpenCode (opencode-direct)
- **How:** Spawns `opencode run --format json -m opencode/big-pickle` via `child_process.spawn()`
- **Prompt:** Same OD-style prompts from `prompts-od.ts`
- **Flow:** Write system + user prompt to stdin → read stdout → extract JSON
- **No daemon required** — just opencode on PATH

---

## Prompt Architecture

### `prompts.ts` — Used by Daemon Strategy
- System: CPF brand rules + content principles + 16 layout definitions + output format
- User: Briefing data (objective, audience, mode, key message, ask, arc, slide count)

### `prompts-od.ts` — Used by LLM and OpenCode Direct
6-layer system prompt (higher precedence first):
1. **Identity Charter** — "expert presentation architect", no filler, real copy only
2. **Anti-Slop** — 8 forbidden patterns (generic titles, invented stats, emoji, same-layout)
3. **Slide Architecture** — one idea/slide, density rules, theme rhythm
4. **Archetypes** — 10 slide types mapped to CPF's 16 layouts
5. **Quality Self-Audit** — 4-question per-slide pre-emit check
6. **Output Format** — strict JSON schema

### `prompts-chat-briefing.ts` — Used by Chat Briefing
- Strict format rules: return ONLY JSON, no conversational text outside the object
- Two schemas: `needs_more` (max 3 questions) and `complete` (mandatory summary + full briefing)
- Inference guidelines to minimize unnecessary questions

---

## State Management

All state persisted in localStorage (no database):

| Key | Content |
|-----|---------|
| `slidecentral-decks` | `SavedDeck[]` — all saved deck data |
| `slidecentral-current-briefing` | Current in-progress briefing |
| `slidecentral-current-step` | Wizard step number (1-4) |
| `slidecentral-settings` | AI strategy, provider, apiKey, daemonAgent, daemonModel |
| `slidecentral-regeneration-ctx` | Transient locked slide numbers for regeneration |

**useBriefing** — Manages wizard state with auto-save on changes, validation per step  
**useDeckStore** — Full CRUD for decks, reads/writes JSON array to localStorage  
**useDaemonStatus** — Polls daemon health every 30s via `/api/health`

---

## Deck Builder (`deck-builder.ts`)

Generates self-contained HTML from `SlideContent[]`:

- Full CPF-branded CSS (colors, fonts, layout classes)
- 1920×1080 stage with scale-to-fit JS
- Embedded CPF logos as base64 data URIs (green for light slides, white for dark)
- Keyboard navigation (arrows, Space, Home, End), touch swipe, mouse wheel
- Slide counter footer and nav bar
- Layout-specific rendering: cover, section divider, big stat, quote, closing, default (bullets + image)
