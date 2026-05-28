# Slide Central — Remaining Fixes (Round 2)

All 29 original issues are fixed. This plan covers **new findings** from a second audit pass, organized by severity.

---

## HIGH — Crashes or Data Corruption

### 30. `escapeHtml` has no null/undefined guard (`src/lib/deck-builder.ts:4-11`)
- **Root cause amplifier.** Every caller that passes an undefined value crashes.
- `escapeHtml(str: string)` calls `.replace()` with no guard. If `str` is `undefined` at runtime → `TypeError`.
- **Fix:** Add `if (!str) return "";` at the top, or change signature to `(str: string | undefined | null)`.

### 31. `slide.contentPrompt` passed to `escapeHtml` in quote layout (`src/lib/deck-builder.ts:233,239`)
- `const quoteText = lines[0] || slide.contentPrompt;` — `contentPrompt` is now optional.
- If `lines` is empty and `contentPrompt` is `undefined`, `quoteText` is `undefined`.
- Then `escapeHtml(quoteText)` crashes.
- **Fix:** `const quoteText = lines[0] || slide.contentPrompt || "";`

### 32. `captionTitle` can be undefined in full-bleed-image layout (`src/lib/deck-builder.ts:550,556-558`)
- `const captionTitle = lines[1] || slide.title;` — if both are falsy at runtime, `captionTitle` is `undefined`.
- The outer guard `(captionTitle || credit)` can be truthy via `credit` while `captionTitle` is still `undefined`.
- Then `escapeHtml(captionTitle)` crashes.
- **Fix:** `const captionTitle = lines[1] || slide.title || "";`

### 33. `s.contentPrompt` interpolated without guard in daemon outline (`src/app/api/build-deck-stream/route.ts:89`)
- `` `- **Content Prompt:** ${s.contentPrompt}\n` `` — when `contentPrompt` is `undefined`, produces literal `"undefined"` in the markdown sent to the daemon agent.
- **Fix:** `(s.contentPrompt ? \`- **Content Prompt:** ${s.contentPrompt}\n\` : "")` — omit the line entirely when absent.

### 34. `slide.contentPrompt` interpolated without guard in regeneration (`src/app/api/generate-outline/route.ts:72-75`)
- `` `${slide.contentPrompt} (refined: ...)` `` — when `contentPrompt` is `undefined`, produces `"undefined (refined: ...)"`.
- **Fix:** Use `slide.contentPrompt ?? ""` or `slide.bodyContent ?? ""`.

### 35. `slide.contentPrompt` passed to `startEdit` without fallback (`src/app/outline/outline-content.tsx:500`)
- `startEdit(slide.slideNumber, "prompt", slide.contentPrompt)` — `contentPrompt` is `string | undefined`, but `startEdit` expects `string`.
- When `undefined`, `setEditValue(undefined)` makes the textarea display `"undefined"` or become uncontrolled.
- **Fix:** `startEdit(slide.slideNumber, "prompt", slide.contentPrompt ?? "")`

### 36. `JSON.parse` crash in briefing page (`src/app/briefing/page.tsx:50-53`)
- `JSON.parse(settingsRaw)` is not wrapped in try/catch inside `handleGenerate`.
- Corrupted localStorage crashes the function, leaving `generating` stuck at `true`.
- **Fix:** Wrap in try/catch with fallback to `{ strategy: "mock" }`.

---

## MEDIUM — Functional Issues

### 37. No runtime validation of `extractJson` output shape
- **Files:** `src/lib/strategies/llm.ts`, `daemon.ts`, `opencode-direct.ts`, `generate-outline-stream/route.ts`
- `extractJson` returns `SlideOutline[]` via type assertions but never validates that each element has required fields (`slideNumber`, `title`, `suggestedLayout`, `bodyContent`).
- If the LLM returns partial objects, downstream code receives structurally invalid outlines.
- **Fix:** Add a validation/normalization step after `extractJson`:
  ```ts
  outline.map(s => ({ ...s, bodyContent: s.bodyContent ?? "", title: s.title ?? "Untitled" }))
  ```

### 38. `contentPrompt` prioritized over `bodyContent` in daemon outline upload (`src/app/api/build-deck-stream/route.ts:88-91`)
- The markdown sent to the daemon lists `Content Prompt` (always, possibly `"undefined"`) before `Body` (conditionally).
- Since `bodyContent` is now the primary field, the priority is inverted.
- **Fix:** Put `bodyContent` first, make `contentPrompt` conditional.

### 39. `handleBuildDeck` omits 7 optional fields (`src/app/outline/outline-content.tsx:274-282`)
- `persist` faithfully includes `sectionId`, `needsDiagram`, `needsChart`, `needsData`, `needsPlaceholder`, `diagramHint`, `chartHint`.
- `handleBuildDeck` drops all of them when building `contentSlides`.
- If the deck builder or daemon pipeline uses these flags, they'll be silently missing.
- **Fix:** Include all optional fields in `handleBuildDeck`'s slide mapping.

### 40. Missing try/catch on `controller.close()` in chat-briefing route (`src/app/api/chat-briefing/route.ts:181`)
- If the stream is already closed, `controller.close()` throws an unhandled error.
- Other routes (`generate-outline-stream`, `build-deck-stream`) already wrap this.
- **Fix:** `try { controller.close(); } catch { /* already closed */ }`

### 41. `saveDecks()` has no try/catch (`src/hooks/useDeckStore.ts:17`)
- `localStorage.setItem(...)` can throw if quota is exceeded (decks with large `htmlContent` can be megabytes).
- Unhandled error propagates to caller, potentially crashing the UI.
- **Fix:** Wrap in try/catch.

### 42. `StepContent.tsx:27` — `res.json()` called before `res.ok` check
- If server returns a non-JSON error response (HTML 500), `res.json()` throws before reaching the `!res.ok` check.
- Error message will be the JSON parse error, not the HTTP status.
- **Fix:** Check `res.ok` first, then parse JSON.

### 43. `StepContent.tsx:32` — `alert()` used for error reporting
- Blocks the main thread, poor UX.
- **Fix:** Replace with inline error message or toast state.

### 44. Settings parsing duplicated across 3+ places with inconsistent types
- `settings/page.tsx`, `chat-briefing/page.tsx`, `briefing/page.tsx` each parse settings independently with different type assertions and error handling.
- **Fix:** Extract to a shared `loadSettings()` utility in `src/lib/constants.ts` or a new `src/lib/settings.ts`.

### 45. `BriefingStep` type is stale (`src/lib/types.ts:4`)
- Defined as `1 | 2 | 3 | 4` but the wizard has 5 steps.
- **Fix:** Update to `1 | 2 | 3 | 4 | 5`.

### 46. `clearTimeout` not called on error paths in opencode-direct (`src/lib/strategies/opencode-direct.ts:44-55`)
- Timer fires `controller.abort()` even after the process has already exited with an error.
- Harmless but wasteful.
- **Fix:** Call `clearTimeout(timer)` in all `reject()` paths.

---

## LOW — Code Quality, Accessibility, Cosmetic

### 47. `slide.title` passed to `escapeHtml` at 31 call sites with no runtime fallback (`src/lib/deck-builder.ts`)
- `title` is typed as required `string`, but no runtime guard. A single malformed slide crashes every layout branch.
- **Fix:** Add `const title = slide.title || "";` at the top of `slideHtml` and use the local throughout. (Or rely on Fix #30's `escapeHtml` guard.)

### 48. `b.text` passed to `escapeHtml` without guard in `injectOverlay` (`src/lib/deck-builder.ts:766`)
- If any `TextBlock` has `text` as `undefined`, crashes inside `escapeHtml`.
- **Fix:** Rely on Fix #30's `escapeHtml` guard, or add `b.text ?? ""`.

### 49. Duplicate entry in `DAEMON_AGENTS` array (`src/app/settings/page.tsx:26,32`)
- `id: "opencode"` appears twice with different descriptions. Deduplication keeps only the first.
- **Fix:** Remove the duplicate entry.

### 50. `SettingsState` uses `string` instead of proper types (`src/app/settings/page.tsx:48-54`)
- `strategy: string` and `provider: string` instead of `StrategyId` and `LLMProviderId`.
- Type system cannot catch invalid values.
- **Fix:** Use `StrategyId` and `LLMProviderId` from `types.ts`.

### 51. `postMessage(..., "*")` wildcard origin (`src/app/preview/preview-content.tsx:82,98,266`)
- Any embedded third-party content in the iframe could receive these messages.
- **Fix:** Use a specific origin (e.g., `window.location.origin`).

### 52. No `aria-pressed` on any toggle/selection button
- **Files:** `StepContext.tsx`, `StepNarrative.tsx`, `settings/page.tsx`, `preview-content.tsx` layout picker
- Visual selection state is not communicated to screen readers.
- **Fix:** Add `aria-pressed={isSelected}` to all selection buttons.

### 53. No `role="alert"` on error message containers
- **Files:** `briefing/page.tsx:106`, `chat-briefing/page.tsx` inline errors
- Screen readers won't announce errors when they appear.
- **Fix:** Add `role="alert"` to error containers.

### 54. `mock.ts:98` — redundant `contentPrompt` assignment
- Sets both `bodyContent` and `contentPrompt` to the same value. `contentPrompt` is now optional/legacy.
- **Fix:** Remove the `contentPrompt` line (or keep for backward compat with a comment).

### 55. Unused function parameters in `mock.ts` (`pickLayout` line 5, `makeTitle` line 40)
- `total` parameter is never used in either function.
- **Fix:** Prefix with `_` or remove.

### 56. `daemon.ts:93-99` — inconsistent indentation
- Lines are indented one level less than surrounding `try` block.
- **Fix:** Re-indent to match.

### 57. `preview-content.tsx:68` — unnecessary cast
- `as (SlideOutline & { bodyContent?: string })` — `bodyContent` is already required on `SlideOutline`.
- **Fix:** Remove the cast.

### 58. `EditableSlide` re-declares `bodyContent: string` redundantly (`src/app/outline/outline-content.tsx:12`)
- `bodyContent` is already required on `SlideOutline` (which `EditableSlide` extends).
- **Fix:** Remove the redundant declaration.

---

## Implementation Order

1. **Fix #30 first** — the `escapeHtml` guard is the single highest-impact change. It prevents crashes from #31, #32, #47, #48 simultaneously.
2. **Fixes #31-36** — remaining high-severity crashes.
3. **Fixes #37-46** — medium-severity functional issues.
4. **Fixes #47-58** — low-severity quality/accessibility improvements.
