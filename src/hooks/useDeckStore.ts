"use client";

import { useCallback } from "react";
import type { SavedDeck, SlideOutline, SlideContent, GenerationSource, TextBlock } from "@/lib/types";

const DECKS_KEY = "slidecentral-decks";
const HTML_KEY_PREFIX = "slidecentral-deck-html-";
const WRITE_DEBOUNCE_MS = 150;

type DeckMeta = Omit<SavedDeck, "htmlContent"> & { htmlContent: null };

// --- In-memory cache ---
let decksCache: DeckMeta[] | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDecks: DeckMeta[] | null = null;

function loadDecks(): DeckMeta[] {
  if (decksCache) return decksCache;
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    const parsed: SavedDeck[] = raw ? JSON.parse(raw) : [];
    let migrated = false;
    for (const d of parsed) {
      if (d.htmlContent) {
        try { localStorage.setItem(`${HTML_KEY_PREFIX}${d.id}`, d.htmlContent); } catch { /* ignore */ }
        d.htmlContent = null;
        migrated = true;
      }
    }
    if (migrated) {
      try { localStorage.setItem(DECKS_KEY, JSON.stringify(parsed)); } catch { /* ignore */ }
    }
    decksCache = parsed as DeckMeta[];
    return decksCache;
  } catch {
    return [];
  }
}

function flushDecks(): void {
  if (!pendingDecks) return;
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(pendingDecks));
  } catch { /* localStorage full or error — silently ignore */ }
  decksCache = pendingDecks;
  pendingDecks = null;
}

function scheduleWrite(decks: DeckMeta[]): void {
  pendingDecks = decks;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushDecks, WRITE_DEBOUNCE_MS);
}

function saveDecks(decks: DeckMeta[]): void {
  scheduleWrite(decks);
}

function loadHtml(id: string): string | null {
  try {
    return localStorage.getItem(`${HTML_KEY_PREFIX}${id}`);
  } catch {
    return null;
  }
}

function saveHtml(id: string, htmlContent: string): void {
  try {
    localStorage.setItem(`${HTML_KEY_PREFIX}${id}`, htmlContent);
  } catch { /* localStorage full */ }
}

function removeHtml(id: string): void {
  try {
    localStorage.removeItem(`${HTML_KEY_PREFIX}${id}`);
  } catch { /* ignore */ }
}

export function useDeckStore() {
  const getById = useCallback((id: string): SavedDeck | undefined => {
    const decks = loadDecks();
    // Use pending decks if there's a scheduled write not yet flushed
    const source = pendingDecks ?? decks;
    const deck = source.find((d) => d.id === id);
    if (!deck) return undefined;
    const htmlContent = loadHtml(id);
    return { ...deck, htmlContent: htmlContent ?? "" };
  }, []);

  const getAll = useCallback((): SavedDeck[] => {
    const source = pendingDecks ?? loadDecks();
    return source.map((d) => ({
      ...d,
      htmlContent: loadHtml(d.id) ?? "",
    }));
  }, []);

  const getAllDecks = useCallback((): SavedDeck[] => {
    const source = pendingDecks ?? loadDecks();
    return source
      .map((d) => ({
        ...d,
        htmlContent: loadHtml(d.id) ?? "",
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const save = useCallback((deck: SavedDeck) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    const now = Date.now();
    const { htmlContent, ...meta } = deck;
    if (idx >= 0) {
      decks[idx] = { ...meta, updatedAt: now, htmlContent: null };
    } else {
      decks.push({ ...meta, createdAt: now, updatedAt: now, htmlContent: null });
    }
    if (htmlContent) {
      saveHtml(deck.id, htmlContent);
    }
    saveDecks(decks);
  }, []);

  const updateOutline = useCallback((id: string, outline: SlideOutline[], source?: GenerationSource) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = {
        ...decks[idx],
        outline,
        source: source ?? decks[idx].source,
        status: "outline",
        updatedAt: Date.now(),
        htmlContent: null,
      };
      saveDecks(decks);
    }
  }, []);

  const updateSlides = useCallback((id: string, slides: SlideContent[]) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = {
        ...decks[idx],
        slides,
        status: "outline",
        updatedAt: Date.now(),
        htmlContent: null,
      };
      saveDecks(decks);
    }
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], name, updatedAt: Date.now(), htmlContent: null };
      saveDecks(decks);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const decks = loadDecks().filter((d) => d.id !== id);
    removeHtml(id);
    saveDecks(decks);
  }, []);

  const setDeckHtml = useCallback((id: string, htmlContent: string) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], status: "built", updatedAt: Date.now(), htmlContent: null };
      saveHtml(id, htmlContent);
      saveDecks(decks);
    }
  }, []);

  const setDeckSlides = useCallback((id: string, slides: SlideContent[]) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], slides, status: "outline", updatedAt: Date.now(), htmlContent: null };
      saveDecks(decks);
    }
  }, []);

  const patchOutlineLayout = useCallback((id: string, slideIndex: number, layoutId: string) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0 && decks[idx].outline) {
      const outline = decks[idx].outline!.map((s, i) =>
        i === slideIndex ? { ...s, suggestedLayout: layoutId as SlideOutline["suggestedLayout"] } : s
      );
      decks[idx] = { ...decks[idx], outline, updatedAt: Date.now() };
      saveDecks(decks);
    }
  }, []);

  const setOverlayBlocks = useCallback((id: string, slideIndex: number, blocks: TextBlock[]) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      const existing = decks[idx].overlayBlocks || {};
      decks[idx] = {
        ...decks[idx],
        overlayBlocks: { ...existing, [slideIndex]: blocks },
        updatedAt: Date.now(),
        htmlContent: null,
      };
      saveDecks(decks);
    }
  }, []);

  return { getAll, getById, save, updateOutline, updateSlides, updateName, remove, getAllDecks, setDeckHtml, setDeckSlides, setOverlayBlocks, patchOutlineLayout };
}
