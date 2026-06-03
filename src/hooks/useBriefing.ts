"use client";

import { useState, useCallback, useEffect } from "react";
import type { Objective, Audience, DeckMode, NarrativeArc, LayoutId, BriefingData, SavedDeck } from "@/lib/types";

const STORAGE_KEY = "slidecentral-current-briefing";
const STEP_KEY = "slidecentral-current-step";

function makeEmptyBriefing(): BriefingData {
  return {
    objective: null,
    audience: null,
    mode: null,
    keyMessage: "",
    audienceAsk: "",
    narrativeArc: null,
    selectedLayouts: [],
    slideCount: 15,
    additionalContent: "",
  };
}

export function useBriefing() {
  const [step, setStep] = useState<number>(1);
  const [briefing, setBriefing] = useState<BriefingData>(makeEmptyBriefing);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedDeck;
        setBriefing(parsed.briefing);
        if (parsed.id) setDeckId(parsed.id);
      }
      const savedStep = localStorage.getItem(STEP_KEY);
      if (savedStep) setStep(Number(savedStep));
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  // Persist briefing — only after loaded (state is real data, not initial empty)
  useEffect(() => {
    if (!loaded) return;
    try {
      const existing = deckId || crypto.randomUUID();
      if (!deckId) setDeckId(existing);
      const saved: SavedDeck = {
        id: existing,
        name: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        briefing,
        outline: null,
        slides: null,
        htmlContent: null,
        source: null,
        status: "briefing",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, [loaded, briefing, deckId]);

  // Persist step — only after loaded
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STEP_KEY, String(step));
  }, [loaded, step]);

  const setObjective = useCallback((o: Objective) => {
    setBriefing((prev) => ({ ...prev, objective: prev.objective === o ? null : o }));
  }, []);

  const setAudience = useCallback((a: Audience) => {
    setBriefing((prev) => ({ ...prev, audience: prev.audience === a ? null : a }));
  }, []);

  const setMode = useCallback((m: DeckMode) => {
    setBriefing((prev) => ({ ...prev, mode: prev.mode === m ? null : m }));
  }, []);

  const setKeyMessage = useCallback((msg: string) => {
    if (msg.length <= 500) {
      setBriefing((prev) => ({ ...prev, keyMessage: msg }));
    }
  }, []);

  const setAudienceAsk = useCallback((ask: string) => {
    if (ask.length <= 500) {
      setBriefing((prev) => ({ ...prev, audienceAsk: ask }));
    }
  }, []);

  const setNarrativeArc = useCallback((arc: NarrativeArc) => {
    setBriefing((prev) => ({
      ...prev,
      narrativeArc: prev.narrativeArc === arc ? null : arc,
    }));
  }, []);

  const toggleLayout = useCallback((id: LayoutId) => {
    setBriefing((prev) => ({
      ...prev,
      selectedLayouts: prev.selectedLayouts.includes(id)
        ? prev.selectedLayouts.filter((l) => l !== id)
        : [...prev.selectedLayouts, id],
    }));
  }, []);

  const setSelectedLayout = useCallback((id: LayoutId | null) => {
    setBriefing((prev) => ({
      ...prev,
      selectedLayouts: id ? [id] : [],
    }));
  }, []);

  const setSlideCount = useCallback((count: number) => {
    setBriefing((prev) => ({ ...prev, slideCount: count }));
  }, []);

  const setAdditionalContent = useCallback((content: string) => {
    setBriefing((prev) => ({ ...prev, additionalContent: content }));
  }, []);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return briefing.objective !== null && briefing.audience !== null && briefing.mode !== null;
      case 2:
        return briefing.keyMessage.trim().length > 0 && briefing.audienceAsk.trim().length > 0;
      case 3:
        return true;
      case 4:
        return briefing.narrativeArc !== null;
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, briefing]);

  const nextStep = useCallback(() => {
    if (!canProceed()) return;
    setStep((s) => Math.min(5, s + 1));
  }, [canProceed]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(5, s)));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setBriefing(makeEmptyBriefing());
    setDeckId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
  }, []);

  const submitBriefing = useCallback(() => {
    return { ...briefing, deckId };
  }, [briefing, deckId]);

  return {
    step,
    briefing,
    deckId,
    setStep: goToStep,
    nextStep,
    prevStep,
    canProceed,
    setObjective,
    setAudience,
    setMode,
    setKeyMessage,
    setAudienceAsk,
    setNarrativeArc,
    toggleLayout,
    setSelectedLayout,
    setSlideCount,
    setAdditionalContent,
    reset,
    submitBriefing,
  };
}
