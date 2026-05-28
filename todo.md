# Slide Central — Fix Todo

This document catalogs all identified bugs and issues. Checkmarks indicate fixes that have been applied.

## Critical Bugs

### 1. Missing `return` in Gemini streaming (`src/lib/strategies/llm.ts:283`)
- [x] After the Gemini streaming block finishes, execution falls through to the OpenAI-compatible streaming code
- Makes a second bogus API call — will throw or return garbage for Gemini providers
- **Fix:** Added `return;` after the Gemini block's closing brace

### 2. CSS class mismatches (`src/lib/deck-builder.ts:13-33` vs `src/lib/layouts.ts`)
- [x] `data-table`: deck-builder renders `"data-table-layout"`, layouts defines `"data-table"` → unstyled
- [x] `org-chart`: deck-builder renders `"org-chart-layout"`, layouts defines `"org-chart"` → unstyled  
- [x] `full-bleed-image`: deck-builder renders `"full-bleed"`, layouts defines `"full-bleed-image"` → unstyled
- [x] `section-divider`: deck-builder renders `"slide hero light divider"` but uses `darkFoot` (light footer text on light bg = invisible). layouts says `dark: true`
- **Fix:** Aligned all CSS class names between deck-builder and layouts.ts; updated section-divider to use dark class with white logo and proper subtitle colors

### 3. Chat briefing enum mismatches (`src/lib/prompts-chat-briefing.ts:38-39`)
- [x] LLM told to return `"agreement-on-follow-ups"` and `"department-meeting"`
- Types define `"agreement"` and `"department"` → briefing data won't match app types
- **Fix:** Updated prompt enums to match `types.ts`

### 4. Mock deck data format mismatches (`src/lib/mock-deck.ts`)
- [x] `two-column`: Uses `"Current State:"`/`"What Members Expect:"` but deck-builder expects `"Before:"`/`"After:"` prefixes
- [x] `kpi-dashboard`: Uses arrow notation (`"→"`) but deck-builder splits on colon (`:`)
- [x] `timeline`: Uses colon+bullet format but deck-builder expects pipe-delimited (`yr | title | desc`)
- **Fix:** Reformatted mock deck body content to match parser expectations

## High Severity

### 5. `useHistory` global Cmd+Z fights native undo (`src/hooks/useHistory.ts:54-68`)
- [x] Intercepts keyboard globally, including inside `<input>` and `<textarea>`
- **Fix:** Check `e.target` and skip when focused on form elements

### 6. `AppSettings` type doesn't match localStorage schema (`src/lib/types.ts:92-97`)
- [x] Type has `strategyId` but code reads/writes `strategy`
- Type has `llmProviderId` but code uses `provider`
- Type missing `daemonAgent` and `daemonModel` fields
- **Fix:** Update `AppSettings` to match actual schema

### 7. `StepTemplate` misuses `LayoutId` type (`src/components/wizard/StepTemplate.tsx:7,13`)
- [x] Casts `"cpf"` and `"business"` as `LayoutId` but these aren't valid layout IDs
- **Fix:** Used `PresetDeckId` type instead of casting to `LayoutId`

### 8. No timeouts on daemon/opencode generation
- [x] `daemon.ts:70`: `streamChat` hangs indefinitely if daemon is unresponsive
- [x] `opencode-direct.ts:14`: `callOpenCode` hangs if child process hangs
- **Fix:** Added `AbortController` + `setTimeout` timeout to both (120s default)

### 9. `brandColor()` crashes on invalid paths (`src/lib/brands.ts:85-91`)
- [x] No error handling — dot-path to leaf node or invalid key causes `TypeError`
- **Fix:** Added null/type checks and return empty string fallback

### 10. Dead code in `generate-outline-stream/route.ts:154-157`
- [x] Duplicate `if (activeStrategy === "daemon")` block — unreachable
- **Fix:** Removed dead code block

### 11. Dead `split() || split()` in deck-builder (`src/lib/deck-builder.ts:64,82,97,114,129,143,150`)
- [x] `String.split()` never returns falsy, so `|| prompt.split("\n")` is dead code
- **Fix:** Replaced with `.filter(Boolean)`

### 12. Regex `[sS]` typo (`src/lib/deck-builder.ts:412`)
- [x] `[...sS]` matches literal `s`/`S` characters, likely meant `\s` for whitespace
- **Fix:** Removed `sS` from character class, now uses `[\d.,+$%-]`

### 13. Duplicate `.u-overlay` CSS rule (`src/lib/deck-builder.ts:756-757`)
- [x] Same rule defined twice in the CSS string
- **Fix:** Removed duplicate

### 14. `escapeHtml` doesn't escape single quotes (`src/lib/deck-builder.ts:5-11`)
- [x] `imageUrl` rendered in `src` attribute is vulnerable to XSS via `'`
- **Fix:** Added `replace(/'/g, "&#39;")` to `escapeHtml` and added `sanitizeUrl()` function for image source validation

### 15. Env var lookup for `gemini-3.5-flash` (`src/lib/strategies/llm.ts:139`)
- [x] `provider.toUpperCase()` on `"gemini-3.5-flash"` produces `GEMINI-3.5-FLASH_API_KEY` (invalid env var name)
- **Fix:** Sanitize provider name before building env var key (replace non-alphanumeric with `_`)

### 16. Hardcoded `HTTP-Referer` (`src/lib/strategies/llm.ts:194`)
- [x] `"https://slide-central.vercel.app"` is wrong in dev/staging
- **Fix:** Uses `NEXT_PUBLIC_APP_URL` env var with `http://localhost:3000` fallback

### 17. `JSON.parse` crash in `building-content.tsx:69-71`
- [x] No try/catch around `JSON.parse(settingsRaw)` — corrupted localStorage crashes component
- **Fix:** Wrapped `JSON.parse` in try/catch (also applied to `generating-content.tsx`)

### 18. No `AbortController` in building-content / generating-content
- [x] Fetch continues after component unmount
- **Fix:** Added `AbortController` to both `building-content.tsx` and `generating-content.tsx`

### 19. No file size/type limits in `parse-pdf/route.ts`
- [x] Multi-GB PDF can exhaust server memory, any file type accepted
- **Fix:** Added 10 MB size limit and `application/pdf` MIME type check

### 20. No size limit in `export-pptx/route.ts`
- [x] Large HTML input can cause memory issues
- **Fix:** Added 5 MB input size limit

### 21. Slide number calc in `build-deck-stream/route.ts:58`
- [x] `i * Math.ceil(slides.length / 4)` can exceed `slides.length` (e.g., 10 slides: `4 * 3 = 12`)
- **Fix:** Using `Math.min(Math.ceil(i * slides.length / 4), slides.length)`

### 22. Duplicated `fmtId` function (`src/lib/prompts.ts:7`, `src/lib/prompts-od.ts:5`)
- [x] Same function duplicated across two files
- **Fix:** Extracted to `src/lib/instructions.ts` as shared export

### 23. No input validation on API routes
- [x] All routes use `as` type assertions on `request.json()` output
- **Fix:** Added basic field presence/type checks on generate-outline-stream, chat-briefing, build-deck-stream

## Low Severity

### 24. `OPENDODE_BIN` typo (`src/lib/strategies/opencode-direct.ts:7`)
- [x] Variable named `OPENDODE_BIN` instead of `OPENCODE_BIN`
- **Fix:** Renamed to `OPENCODE_BIN` (both constant and all usages)

### 25. Multiple `Date.now()` calls in `mock-deck.ts:129,134-135`
- [x] `id`, `createdAt`, `updatedAt` each call `Date.now()` separately
- **Fix:** Called once and reused

### 26. `health/route.ts` uses POST instead of GET
- [x] Health checks are conventionally GET
- **Fix:** Added `GET` handler returning `{ ok: true, ts }`, kept POST for strategy checks

### 27. `StepMessage.tsx` shows `{length} / 500` but no `maxLength` on textareas
- [x] Users can exceed 500 characters with no visual feedback
- **Fix:** Added `maxLength={500}` to both textarea elements

### 28. Magic localStorage keys not shared constants
- [x] `"slidecentral-settings"` duplicated as string literal in 10+ files
- **Fix:** Created `src/lib/constants.ts` with `STORAGE_KEYS` object, updated all references

## Feature Fix

### 29. Slide outline generates content prompts, not actual content
- [x] `prompts-od.ts` asks for `contentPrompt` (meta-instructions) instead of `bodyContent` (actual slide content)
- **Fix:** Updated prompts, types, mock strategy, and outline UI to use `bodyContent` as the primary generated field

## Files Modified (all 29 items fixed)

### Core Types & Constants
- `src/lib/constants.ts` — **NEW** Shared `STORAGE_KEYS` object for all localStorage keys
- `src/lib/types.ts` — Added `bodyContent` to `SlideOutline`, made `contentPrompt` optional; fixed `AppSettings` to match actual schema
- `src/lib/instructions.ts` — Added shared `fmtId()` export

### Prompt System
- `src/lib/prompts-od.ts` — Changed output format from `contentPrompt` to `bodyContent`; switched to shared `fmtId`
- `src/lib/prompts.ts` — Changed output format from `contentPrompt` to `bodyContent`; switched to shared `fmtId`
- `src/lib/prompts-chat-briefing.ts` — Fixed enum values (`agreement-on-follow-ups` → `agreement`, `department-meeting` → `department`)

### Backend Strategies
- `src/lib/strategies/llm.ts` — Added `return` after Gemini streaming block; fixed env var lookup; fixed HTTP-Referer; shared constants
- `src/lib/strategies/daemon.ts` — Added `AbortController` timeout to `streamChat` (120s)
- `src/lib/strategies/opencode-direct.ts` — Fixed `OPENDODE_BIN` → `OPENCODE_BIN`; added stdin error handling; added timeout (120s)
- `src/lib/strategies/mock.ts` — Changed `makeContentPrompt` → `makeBodyContent` generating actual slide content

### Deck Builder & Mock
- `src/lib/deck-builder.ts` — Fixed CSS class mismatches (data-table, org-chart, full-bleed-image, section-divider); fixed dead `split()||split()` → `.filter(Boolean)`; fixed regex typo; added single-quote escaping; added `sanitizeUrl()`; removed duplicate CSS; removed unused `LAYOUTS` import
- `src/lib/mock-deck.ts` — Fixed two-column/kpi-dashboard/timeline data formats; fixed Date.now() duplicate calls; added `bodyContent` to outline mapping

### UI Components
- `src/components/wizard/StepTemplate.tsx` — Fixed `LayoutId` misuse with proper `PresetDeckId` type
- `src/components/wizard/StepMessage.tsx` — Added `maxLength={500}` to textareas
- `src/hooks/useHistory.ts` — Skip keyboard handler when focused on input/textarea elements
- `src/hooks/useBriefing.ts` — Switched to shared `STORAGE_KEYS`
- `src/hooks/useDeckStore.ts` — Switched to shared `STORAGE_KEYS`
- `src/hooks/useDaemonStatus.ts` — Switched to shared `STORAGE_KEYS`
- `src/lib/brands.ts` — Fixed `brandColor()` crash with null/type checks

### App Pages
- `src/app/page.tsx` — Switched to shared `STORAGE_KEYS`
- `src/app/briefing/page.tsx` — Switched to shared `STORAGE_KEYS`
- `src/app/settings/page.tsx` — Switched to shared `STORAGE_KEYS`
- `src/app/chat-briefing/page.tsx` — Switched to shared `STORAGE_KEYS`
- `src/app/outline/outline-content.tsx` — Initialize bodyContent from outline; include bodyContent in persist; switched to shared `STORAGE_KEYS`
- `src/app/generating/generating-content.tsx` — Switched to shared `STORAGE_KEYS`; added try/catch for localStorage; added `AbortController`
- `src/app/building/building-content.tsx` — Switched to shared `STORAGE_KEYS`; added try/catch for localStorage; added `AbortController`

### API Routes
- `src/app/api/health/route.ts` — Added `GET` handler
- `src/app/api/parse-pdf/route.ts` — Added 10 MB size limit, `application/pdf` MIME check
- `src/app/api/export-pptx/route.ts` — Added 5 MB HTML size limit
- `src/app/api/generate-outline-stream/route.ts` — Removed dead duplicate daemon block; fixed `contentPrompt` → `bodyContent` in regeneration; added briefing validation
- `src/app/api/build-deck-stream/route.ts` — Fixed slide number calculation (clamped); added validation
- `src/app/api/chat-briefing/route.ts` — Added messages array validation

---

## Round 2 — Remaining Issues Found on Second Audit

### HIGH — Crashes or Data Corruption

### 30. `escapeHtml` has no null/undefined guard (`src/lib/deck-builder.ts:4-11`)
- [x] **Root cause amplifier.** Every caller passing undefined crashes.
- `escapeHtml(str: string)` calls `.replace()` with no guard → `TypeError` on undefined.
- **Fix:** Add `if (!str) return "";` at the top.

### 31. `slide.contentPrompt` passed to `escapeHtml` in quote layout (`src/lib/deck-builder.ts:233,239`)
- [x] `const quoteText = lines[0] || slide.contentPrompt;` — `contentPrompt` is optional.
- If `lines` is empty and `contentPrompt` is `undefined`, `quoteText` is `undefined` → `escapeHtml(undefined)` crashes.
- **Fix:** `const quoteText = lines[0] || slide.contentPrompt || "";`

### 32. `captionTitle` can be undefined in full-bleed-image (`src/lib/deck-builder.ts:550,556-558`)
- [x] `const captionTitle = lines[1] || slide.title;` — if both falsy at runtime, it's `undefined`.
- Outer guard `(captionTitle || credit)` can be truthy via `credit` while `captionTitle` is still `undefined`.
- Then `escapeHtml(captionTitle)` crashes.
- **Fix:** `const captionTitle = lines[1] || slide.title || "";`

### 33. `s.contentPrompt` interpolated without guard in daemon outline (`src/app/api/build-deck-stream/route.ts:89`)
- [x] `` `- \*\*Content Prompt:** ${s.contentPrompt}\n` `` — when `undefined`, produces literal `"undefined"` in the daemon prompt.
- **Fix:** Make the line conditional: `(s.contentPrompt ? \`- **Content Prompt:** ${s.contentPrompt}\n\` : "")`

### 34. `slide.contentPrompt` interpolated without guard in regeneration (`src/app/api/generate-outline/route.ts:72-75`)
- [x] `` `${slide.contentPrompt} (refined: ...)` `` — when `undefined`, produces `"undefined (refined: ...)"`.
- **Fix:** Use `slide.contentPrompt ?? ""`.

### 35. `slide.contentPrompt` passed to `startEdit` without fallback (`src/app/outline/outline-content.tsx:500`)
- [x] `startEdit(slide.slideNumber, "prompt", slide.contentPrompt)` — `contentPrompt` is `string | undefined`, `startEdit` expects `string`.
- When `undefined`, `setEditValue(undefined)` makes the textarea display `"undefined"` or become uncontrolled.
- **Fix:** `startEdit(slide.slideNumber, "prompt", slide.contentPrompt ?? "")`

### 36. `JSON.parse` crash in briefing page (`src/app/briefing/page.tsx:50-53`)
- [x] `JSON.parse(settingsRaw)` not wrapped in try/catch inside `handleGenerate`.
- Corrupted localStorage crashes the function, leaving `generating` stuck at `true`.
- **Fix:** Wrap in try/catch with fallback.

---

### MEDIUM — Functional Issues

### 37. No runtime validation of `extractJson` output shape
- [ ] **Files:** `llm.ts`, `daemon.ts`, `opencode-direct.ts`, `generate-outline-stream/route.ts`
- `extractJson` casts to `SlideOutline[]` but never validates required fields (`slideNumber`, `title`, `suggestedLayout`, `bodyContent`).
- **Fix:** Add normalization step after `extractJson`: `outline.map(s => ({ ...s, bodyContent: s.bodyContent ?? "", title: s.title ?? "Untitled" }))`

### 38. `contentPrompt` prioritized over `bodyContent` in daemon outline upload (`src/app/api/build-deck-stream/route.ts:88-91`)
- [ ] Outline markdown lists `Content Prompt` (potentially `"undefined"`) before `Body` (conditionally).
- Since `bodyContent` is now primary, priority is inverted.
- **Fix:** List body content first, make content prompt conditional.

### 39. `handleBuildDeck` omits 7 optional fields (`src/app/outline/outline-content.tsx:274-282`)
- [ ] `persist` includes `sectionId`, `needsDiagram`, `needsChart`, `needsData`, `needsPlaceholder`, `diagramHint`, `chartHint`.
- `handleBuildDeck` drops all of them when building `contentSlides`.
- **Fix:** Include all optional fields in `handleBuildDeck`'s slide mapping.

### 40. Missing try/catch on `controller.close()` in chat-briefing route (`src/app/api/chat-briefing/route.ts:181`)
- [ ] Other routes already wrap `controller.close()` in try/catch. This one doesn't.
- **Fix:** `try { controller.close(); } catch { /* already closed */ }`

### 41. `saveDecks()` has no try/catch (`src/hooks/useDeckStore.ts:17`)
- [ ] `localStorage.setItem` can throw on quota exceeded. Unhandled error propagates to caller.
- **Fix:** Wrap in try/catch.

### 42. `StepContent.tsx:27` — `res.json()` called before `res.ok` check
- [ ] If server returns non-JSON error, `res.json()` throws before the `!res.ok` check.
- **Fix:** Check `res.ok` first.

### 43. `StepContent.tsx:32` — `alert()` used for error reporting
- [ ] Blocks main thread, poor UX.
- **Fix:** Replace with inline error message.

### 44. Settings parsing duplicated across 3+ places with inconsistent types
- [ ] `settings/page.tsx`, `chat-briefing/page.tsx`, `briefing/page.tsx` each parse settings independently.
- **Fix:** Extract to shared `loadSettings()` utility.

### 45. `BriefingStep` type is stale (`src/lib/types.ts:4`)
- [ ] Defined as `1 | 2 | 3 | 4` but wizard has 5 steps.
- **Fix:** Update to `1 | 2 | 3 | 4 | 5`.

### 46. `clearTimeout` not called on error paths in opencode-direct (`src/lib/strategies/opencode-direct.ts:44-55`)
- [ ] Timer fires even after process already exited with error.
- **Fix:** Call `clearTimeout(timer)` in all `reject()` paths.

---

### LOW — Code Quality, Accessibility, Cosmetic

### 47. `b.text` passed to `escapeHtml` without guard in `injectOverlay` (`src/lib/deck-builder.ts:766`)
- [ ] If `TextBlock.text` is undefined, crashes in `escapeHtml`.
- **Fix:** Relies on Fix #30's `escapeHtml` guard.

### 48. Duplicate entry in `DAEMON_AGENTS` array (`src/app/settings/page.tsx:26,32`)
- [ ] `id: "opencode"` appears twice.
- **Fix:** Remove the duplicate entry.

### 49. `SettingsState` uses `string` instead of proper types (`src/app/settings/page.tsx:48-54`)
- [ ] `strategy: string` instead of `StrategyId`.
- **Fix:** Use `StrategyId` and `LLMProviderId` from `types.ts`.

### 50. `postMessage(..., "*")` wildcard origin (`src/app/preview/preview-content.tsx`)
- [ ] Any iframe content can receive messages.
- **Fix:** Use a specific origin.

### 51. No `aria-pressed` on selection buttons (wizard steps, settings, layout picker)
- [ ] Visual selection state not communicated to screen readers.
- **Fix:** Add `aria-pressed` to all selection buttons.

### 52. No `role="alert"` on error containers (`briefing/page.tsx:106`, chat-briefing)
- [ ] Screen readers don't announce errors.
- **Fix:** Add `role="alert"`.

### 53-58. Minor code quality issues
- [ ] `mock.ts:98` — redundant `contentPrompt` assignment
- [ ] `mock.ts:5,40` — unused function parameters (`total`, `_arcId`)
- [ ] `daemon.ts:93-99` — inconsistent indentation
- [ ] `outline-content.tsx:12` — `EditableSlide` re-declares required `bodyContent`
- [ ] `preview-content.tsx:68` — unnecessary cast
