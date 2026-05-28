# Fix: `Cannot read properties of undefined (reading 'trim')` — Deck Building

## Root Cause

In `src/lib/deck-builder.ts`, the `sanitizeUrl` function (added in an earlier fix for XSS) accepts `url: string` and immediately calls `url.trim()`:

```ts
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();  // ← CRASH if url is undefined
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  return "";
}
```

At line ~574, the default bullet-list layout passes `slide.imageUrl` directly:

```ts
${sanitizeUrl(slide.imageUrl) ? `...` : ""}
```

But `slide.imageUrl` is `string | undefined` (optional field on `SlideContent`). When the slide has no image URL (which is the normal case for most slides), `sanitizeUrl(undefined)` calls `undefined.trim()` → crash.

Other call sites (`content-image-60-40`, `image-content-40-60`, `full-bleed-image`) are safe because they use `|| ""` fallbacks:
```ts
const imageUrl = lines[0] || slide.imageUrl || "";
sanitizeUrl(imageUrl)  // always a string
```

## Fix

In `src/lib/deck-builder.ts`, change the `sanitizeUrl` signature to accept `string | undefined` and return `""` for falsy values:

```ts
function sanitizeUrl(url: string | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  return "";
}
```

This is a one-line change (first line of the function body) that protects all current and future call sites.

## Files to edit

- `src/lib/deck-builder.ts` — lines 13–17
