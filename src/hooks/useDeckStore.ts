"use client";

import { useCallback } from "react";
import type { SavedDeck, SlideOutline, SlideContent, GenerationSource, TextBlock } from "@/lib/types";

const DECKS_KEY = "slidecentral-decks";

function loadDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDecks(decks: SavedDeck[]) {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function useDeckStore() {
  const getAll = useCallback((): SavedDeck[] => loadDecks(), []);

  const getById = useCallback((id: string): SavedDeck | undefined => {
    return loadDecks().find((d) => d.id === id);
  }, []);

  const save = useCallback((deck: SavedDeck) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    const now = Date.now();
    if (idx >= 0) {
      decks[idx] = { ...deck, updatedAt: now };
    } else {
      decks.push({ ...deck, createdAt: now, updatedAt: now });
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
      };
      saveDecks(decks);
    }
  }, []);

  const updateName = useCallback((id: string, name: string) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], name, updatedAt: Date.now() };
      saveDecks(decks);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const decks = loadDecks().filter((d) => d.id !== id);
    saveDecks(decks);
  }, []);

  const getAllDecks = useCallback((): SavedDeck[] => {
    return loadDecks().sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);

  const setDeckHtml = useCallback((id: string, htmlContent: string) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], htmlContent, status: "built", updatedAt: Date.now() };
      saveDecks(decks);
    }
  }, []);

  const setDeckSlides = useCallback((id: string, slides: SlideContent[]) => {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === id);
    if (idx >= 0) {
      decks[idx] = { ...decks[idx], slides, status: "outline", updatedAt: Date.now() };
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
      };
      saveDecks(decks);
    }
  }, []);

  return { getAll, getById, save, updateOutline, updateSlides, updateName, remove, getAllDecks, setDeckHtml, setDeckSlides, setOverlayBlocks };
}
