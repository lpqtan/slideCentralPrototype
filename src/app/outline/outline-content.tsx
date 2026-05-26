"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";
import { useHistory } from "@/hooks/useHistory";
import type { SlideOutline, GenerationSource, SlideContent } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";
import { buildDeckHtml } from "@/lib/deck-builder";

interface EditableSlide extends SlideOutline {
  locked: boolean;
  bodyContent: string;
  imageUrl: string;
}

function getLayoutName(id: string): string {
  return LAYOUTS.find((l) => l.id === id)?.name ?? id;
}

function sourceLabel(s: GenerationSource): string {
  if (s.strategy === "mock") return "Mock";
  if (s.strategy === "daemon" && s.agent) {
    const name = s.agent.charAt(0).toUpperCase() + s.agent.slice(1);
    const model = s.model ? ` (${s.model})` : "";
    return `${name}${model} via Daemon`;
  }
  if (s.strategy === "daemon") return "Daemon";
  return s.strategy;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function OutlineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById, updateOutline, setDeckSlides, setDeckHtml } = useDeckStore();

  const history = useHistory<EditableSlide[]>([]);
  const slides = history.state;
  const setSlides = (updated: EditableSlide[]) => history.push(updated);
  const setSlidesInit = (updated: EditableSlide[]) => history.push(updated, true);
  const [source, setSource] = useState<GenerationSource | null>(null);
  const [editingField, setEditingField] = useState<{ slide: number; field: "title" | "prompt" | "body" } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Regenerate state
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");

  // Layout picker state — stores which slide's picker is open + screen coords
  const [layoutPicker, setLayoutPicker] = useState<{
    slideNumber: number;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }
    const deck = getById(deckId);
    if (deck?.outline) {
      setSlidesInit(
        deck.outline.map((s) => ({
          ...s,
          locked: false,
          bodyContent: "",
          imageUrl: "",
        }))
      );
      setSource(deck.source ?? null);
    }
  }, [deckId, getById, router]);

  // Close layout picker on outside click, scroll, or resize
  useEffect(() => {
    if (!layoutPicker) return;
    const close = () => setLayoutPicker(null);
    document.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [layoutPicker]);

  // Compute the display order: during drag, shift items in real-time
  const displaySlides = useMemo(() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      return slides.map((s) => ({ slide: s, isDragging: false, isDropTarget: false }));
    }
    // Remove dragged item, insert at over position
    const without = [...slides];
    const [moved] = without.splice(dragIndex, 1);
    without.splice(dragOverIndex, 0, moved);
    return without.map((s, i) => ({
      slide: s,
      isDragging: s.slideNumber === moved.slideNumber,
      isDropTarget: i === dragOverIndex,
    }));
  }, [slides, dragIndex, dragOverIndex]);

  const persist = useCallback(
    (updated: EditableSlide[]) => {
      if (!deckId) return;
      const clean: SlideOutline[] = updated.map((s) => ({
        slideNumber: s.slideNumber,
        title: s.title,
        suggestedLayout: s.suggestedLayout,
        contentPrompt: s.contentPrompt,
        estimatedMinutes: s.estimatedMinutes,
        sectionId: s.sectionId,
        needsDiagram: s.needsDiagram,
        needsChart: s.needsChart,
        needsData: s.needsData,
        needsPlaceholder: s.needsPlaceholder,
        diagramHint: s.diagramHint,
        chartHint: s.chartHint,
      }));
      const cleanContent: SlideContent[] = updated.map((s) => ({
        slideNumber: s.slideNumber,
        title: s.title,
        suggestedLayout: s.suggestedLayout,
        contentPrompt: s.contentPrompt,
        estimatedMinutes: s.estimatedMinutes,
        sectionId: s.sectionId,
        needsDiagram: s.needsDiagram,
        needsChart: s.needsChart,
        needsData: s.needsData,
        needsPlaceholder: s.needsPlaceholder,
        diagramHint: s.diagramHint,
        chartHint: s.chartHint,
        bodyContent: s.bodyContent ?? "",
        imageUrl: s.imageUrl ?? "",
      }));
      updateOutline(deckId, clean);
      setDeckSlides(deckId, cleanContent);
    },
    [deckId, updateOutline, setDeckSlides]
  );

  const startEdit = (slide: number, field: "title" | "prompt" | "body", currentValue: string) => {
    setEditingField({ slide, field });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editingField) return;
    const updated = slides.map((s) => {
      if (s.slideNumber === editingField.slide) {
        if (editingField.field === "title") {
          return { ...s, title: editValue };
        }
        if (editingField.field === "prompt") {
          return { ...s, contentPrompt: editValue };
        }
        return { ...s, bodyContent: editValue };
      }
      return s;
    });
    setSlides(updated);
    persist(updated);
    setEditingField(null);
  };

  const toggleLock = (sn: number) => {
    const updated = slides.map((s) =>
      s.slideNumber === sn ? { ...s, locked: !s.locked } : s
    );
    setSlides(updated);
    persist(updated);
  };

  const toggleLockAll = () => {
    const allLocked = slides.every((s) => s.locked);
    const updated = slides.map((s) => ({ ...s, locked: !allLocked }));
    setSlides(updated);
    persist(updated);
  };

  // --- Drag & Drop ---

  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
    setDragOverIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    if (idx !== dragOverIndex) {
      setDragOverIndex(idx);
    }
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    // Commit the reorder
    const updated = [...slides];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dragOverIndex, 0, moved);
    const renumbered = updated.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setSlides(renumbered);
    persist(renumbered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // --- Delete ---

  const deleteSlide = (sn: number) => {
    const updated = slides
      .filter((s) => s.slideNumber !== sn)
      .map((s, i) => ({ ...s, slideNumber: i + 1 }));
    setSlides(updated);
    persist(updated);
  };

  const addSlide = () => {
    const newSlide: EditableSlide = {
      slideNumber: slides.length + 1,
      title: "Untitled Slide",
      suggestedLayout: "bullet-list" as SlideOutline["suggestedLayout"],
      contentPrompt: "Describe the content for this slide",
      estimatedMinutes: 1.5,
      locked: false,
      bodyContent: "",
      imageUrl: "",
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    persist(updated);
  };

  // --- Regenerate ---

  const handleRegenerate = () => {
    if (!deckId || !regenPrompt.trim()) return;

    const lockedIds = slides.filter((s) => s.locked).map((s) => s.slideNumber);
    localStorage.setItem(
      "slidecentral-regeneration-ctx",
      JSON.stringify({ lockedSlideNumbers: lockedIds })
    );

    router.push(
      `/generating?deckId=${encodeURIComponent(deckId)}&regenerationPrompt=${encodeURIComponent(regenPrompt.trim())}`
    );
  };

  const handleBuildDeck = () => {
    if (!deckId) return;
    const contentSlides: SlideContent[] = slides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.title,
      suggestedLayout: s.suggestedLayout,
      contentPrompt: s.contentPrompt,
      estimatedMinutes: s.estimatedMinutes,
      bodyContent: s.bodyContent ?? "",
      imageUrl: s.imageUrl ?? "",
    }));

    const settingsRaw = localStorage.getItem("slidecentral-settings");
    const settings = settingsRaw ? JSON.parse(settingsRaw) : { strategy: "mock" };

    if (settings.strategy === "mock") {
      const html = buildDeckHtml(contentSlides);
      setDeckHtml(deckId, html);
      router.push(`/preview?deckId=${encodeURIComponent(deckId)}`);
      return;
    }

    router.push(`/building?deckId=${encodeURIComponent(deckId)}`);
  };

  // --- Computed ---

  const lockedCount = slides.filter((s) => s.locked).length;
  const allLocked = lockedCount === slides.length;
  const estimatedMinutes = slides.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  if (!deckId || slides.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-muted)]">No outline found.</p>
          <Link
            href="/briefing"
            className="mt-3 inline-block text-xs text-[var(--color-cpf-green)] hover:underline"
          >
            Go to briefing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Slide Outline</h1>
          <p className="mt-1 flex items-center gap-3 text-sm text-[var(--color-fg-soft)]">
            <span>
              {slides.length} slides · ~{estimatedMinutes} min · {lockedCount} locked
            </span>
            {source && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  source.strategy === "mock"
                    ? "border-[var(--color-border)] bg-[var(--color-border)]/30 text-[var(--color-muted)]"
                    : "border-[var(--color-cpf-green)]/30 bg-[var(--color-cpf-green)]/10 text-[var(--color-cpf-green)]"
                }`}
              >
                {source.strategy === "daemon" ? (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-cpf-green)]" />
                ) : null}
                {sourceLabel(source)} @ {formatTime(source.timestamp)}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addSlide}
            className="rounded border border-[var(--color-cpf-green)] px-3 py-2 text-xs font-medium text-[var(--color-cpf-green)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            + Add Slide
          </button>
          <button
            onClick={toggleLockAll}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]"
            title={allLocked ? "Unlock all slides" : "Lock all slides"}
          >
            {allLocked ? "Unlock All" : "Lock All"}
          </button>
          <button
            onClick={() => setShowRegenPrompt((v) => !v)}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]"
          >
            Regenerate Outline
          </button>
          <Link
            href="/briefing"
            className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            Back to Briefing
          </Link>
        </div>
      </div>

      {/* Regenerate prompt */}
      {showRegenPrompt && (
        <div className="mb-4 rounded border border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] p-4">
          <p className="mb-2 text-xs text-[var(--color-fg-soft)]">
            Describe what to change. Locked slides ({lockedCount}) will be preserved.
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={regenPrompt}
              onChange={(e) => setRegenPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && regenPrompt.trim()) handleRegenerate();
                if (e.key === "Escape") setShowRegenPrompt(false);
              }}
              placeholder="e.g. Add more data-driven slides, focus on budget..."
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none"
            />
            <button
              onClick={handleRegenerate}
              disabled={!regenPrompt.trim()}
              className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                setShowRegenPrompt(false);
                setRegenPrompt("");
              }}
              className="rounded border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drag hint */}
      <p className="mb-2 text-[10px] text-[var(--color-muted)]">
        Drag slides to reorder. Click titles or prompts to edit inline.
      </p>

      {/* Info banner */}
      <div className="mb-4 flex gap-3 rounded border-l-4 border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] p-4">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-cpf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p className="text-xs leading-relaxed text-[var(--color-cpf-green)]">
          SlideCentral has drafted a slide structure based on your brief. Review the content prompt for each slide, then add your own content below it.
        </p>
      </div>

      {/* Slides */}
      <div className="space-y-3">
        {displaySlides.map(({ slide, isDragging, isDropTarget }, displayIdx) => (
          <div
            key={slide.slideNumber}
            draggable
            onDragStart={() => {
              const realIdx = slides.findIndex((s) => s.slideNumber === slide.slideNumber);
              handleDragStart(realIdx);
            }}
            onDragOver={(e) => handleDragOver(e, displayIdx)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`group flex overflow-hidden rounded border transition-all duration-150 ${
              isDragging
                ? "opacity-30 scale-[0.98]"
                : isDropTarget && dragIndex !== null
                  ? "border-[var(--color-cpf-green)] border-dashed ring-1 ring-[var(--color-cpf-green)]/40"
                  : slide.locked
                    ? "border-[var(--color-orange)]/50 bg-[var(--color-orange)]/[0.02]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            {/* Left accent bar */}
            <div
              className={`w-1 shrink-0 ${
                slide.locked ? "bg-[var(--color-orange)]" : "bg-[var(--color-cpf-green)]"
              }`}
            />

            <div className="min-w-0 flex-1 p-5">
              {/* Top row: number badge, title, layout, drag handle */}
              <div className="mb-3 flex items-start gap-3">
                <div className="shrink-0 rounded bg-[var(--color-cpf-mint)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  {slide.locked ? "\uD83D\uDD12" : `Slide ${slide.slideNumber}`}
                </div>

                <div className="min-w-0 flex-1">
                  {editingField?.slide === slide.slideNumber && editingField.field === "title" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className="w-full rounded border border-[var(--color-cpf-green)] bg-[var(--color-cpf-paper)] px-2 py-1 text-sm font-bold text-[var(--color-fg)] focus:outline-none"
                    />
                  ) : (
                    <h3
                      className="cursor-text text-sm font-bold text-[var(--color-fg)] hover:text-[var(--color-cpf-green)]"
                      onClick={() => startEdit(slide.slideNumber, "title", slide.title)}
                    >
                      {slide.title}
                    </h3>
                  )}
                  {/* Content prompt with label prefix */}
                  {editingField?.slide === slide.slideNumber && editingField.field === "prompt" ? (
                    <textarea
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      rows={2}
                      className="mt-1 w-full rounded border border-[var(--color-cpf-green)] bg-[var(--color-cpf-paper)] px-2 py-1 text-xs text-[var(--color-fg)] focus:outline-none"
                    />
                  ) : (
                    <p
                      className="mt-1 cursor-text text-xs italic text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]"
                      onClick={() =>
                        startEdit(slide.slideNumber, "prompt", slide.contentPrompt)
                      }
                    >
                      Content prompt: {slide.contentPrompt}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  <button
                    onClick={(e) => {
                      if (layoutPicker?.slideNumber === slide.slideNumber) {
                        setLayoutPicker(null);
                        return;
                      }
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setLayoutPicker({
                        slideNumber: slide.slideNumber,
                        top: rect.bottom + 4,
                        left: Math.min(rect.right - 320, window.innerWidth - 330),
                      });
                    }}
                    className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] hover:text-[var(--color-cpf-green)]"
                  >
                    {getLayoutName(slide.suggestedLayout)}
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <span className="cursor-grab select-none text-xs text-[var(--color-muted)] opacity-40 hover:opacity-100">
                    &#x2630;
                  </span>
                </div>
              </div>

              {/* Body content */}
              <div className="mb-1">
                {editingField?.slide === slide.slideNumber && editingField.field === "body" ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    rows={4}
                    placeholder="Enter slide body content — one point per line for bullet slides..."
                    className="w-full rounded border border-[var(--color-cpf-green)] bg-[var(--color-cpf-paper)] px-3 py-2 text-xs text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none"
                  />
                ) : slide.bodyContent ? (
                  <div
                    className="cursor-pointer whitespace-pre-wrap rounded border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-fg-soft)] hover:border-[var(--color-cpf-green)]"
                    onClick={() => startEdit(slide.slideNumber, "body", slide.bodyContent)}
                  >
                    {slide.bodyContent}
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(slide.slideNumber, "body", "")}
                    className="w-full cursor-text rounded border border-dashed border-[var(--color-border)] px-3 py-2 text-left text-[10px] text-[var(--color-muted)] hover:border-[var(--color-cpf-green)] hover:text-[var(--color-fg-soft)]"
                  >
                    + Add body content (bullet points, one per line)
                  </button>
                )}
              </div>

              {/* Image URL */}
              <div className="mb-1">
                {slide.imageUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[10px] text-[var(--color-muted)]">
                      Image: {slide.imageUrl}
                    </span>
                    <button
                      onClick={() => {
                        const updated = slides.map((s) =>
                          s.slideNumber === slide.slideNumber ? { ...s, imageUrl: "" } : s
                        );
                        setSlides(updated);
                        persist(updated);
                      }}
                      className="shrink-0 text-[10px] text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const url = prompt("Enter image URL:");
                      if (url) {
                        const updated = slides.map((s) =>
                          s.slideNumber === slide.slideNumber ? { ...s, imageUrl: url } : s
                        );
                        setSlides(updated);
                        persist(updated);
                      }
                    }}
                    className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-cpf-green)]"
                  >
                    + Add image URL
                  </button>
                )}
              </div>

              {/* Flag indicators */}
              {(slide.needsChart || slide.needsDiagram || slide.needsData || slide.needsPlaceholder) && (
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {slide.needsDiagram && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-cpf-green)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-cpf-green)]" title={slide.diagramHint || ""}>
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4"/></svg>
                      Diagram{slide.diagramHint ? `: ${slide.diagramHint}` : ""}
                    </span>
                  )}
                  {slide.needsChart && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-cpf-green)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-cpf-green)]" title={slide.chartHint || ""}>
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      Chart{slide.chartHint ? `: ${slide.chartHint}` : ""}
                    </span>
                  )}
                  {slide.needsData && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-cpf-green)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-cpf-green)]">
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                      Data needed
                    </span>
                  )}
                  {slide.needsPlaceholder && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-cpf-green)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-cpf-green)]">
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      Placeholder
                    </span>
                  )}
                </div>
              )}

              {/* Bottom row: estimated time, locked indicator, actions */}
              <div className="mt-2 flex items-center gap-3">
                <span className="font-mono text-[10px] text-[var(--color-muted)]">
                  ~{slide.estimatedMinutes} min
                </span>
                {slide.locked && (
                  <span className="rounded bg-[var(--color-orange)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-orange)]">
                    Locked
                  </span>
                )}
                <div className="ml-auto flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => toggleLock(slide.slideNumber)}
                    className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      slide.locked
                        ? "border-[var(--color-orange)]/50 text-[var(--color-orange)] hover:bg-[var(--color-orange)]/10"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-cpf-green)]"
                    }`}
                    title={slide.locked ? "Unlock" : "Lock"}
                  >
                    {slide.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    onClick={() => deleteSlide(slide.slideNumber)}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-muted)] transition-colors hover:border-red-300 hover:text-red-600"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug: Raw output */}
      {source?.rawOutput && (
        <details className="mt-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]">
            Debug: Raw Output
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-cpf-paper)] p-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg)]">
            {source.rawOutput}
          </pre>
        </details>
      )}

      {/* Layout Picker Popover (fixed position, floats above everything) */}
      {layoutPicker && (() => {
        const currentSlide = slides.find((s) => s.slideNumber === layoutPicker.slideNumber);
        return (
          <div
            className="fixed z-50 w-80 max-h-[70vh] overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            style={{ top: layoutPicker.top, left: layoutPicker.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--color-border)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Select Layout
              </p>
            </div>
            <div className="py-1">
              {LAYOUTS.map((layout) => {
                const isSelected = currentSlide?.suggestedLayout === layout.id;
                return (
                  <button
                    key={layout.id}
                    onClick={() => {
                      if (!currentSlide) return;
                      const updated = slides.map((s) =>
                        s.slideNumber === currentSlide.slideNumber
                          ? { ...s, suggestedLayout: layout.id as EditableSlide["suggestedLayout"] }
                          : s
                      );
                      setSlides(updated);
                      persist(updated);
                      setLayoutPicker(null);
                    }}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-cpf-mint)] ${
                      isSelected ? "bg-[var(--color-cpf-mint)]" : ""
                    }`}
                  >
                    {/* Mini thumbnail */}
                    <div className="mt-0.5 h-16 w-[107px] shrink-0 overflow-hidden rounded border border-[var(--color-border)]">
                      {layout.dark ? (
                        <div className="flex h-full items-center justify-center bg-[var(--color-cpf-green)] text-[7px] font-semibold text-white/80">
                          {layout.id === "cover" ? "Cover" :
                           layout.id === "section-divider" ? "Ch. 1" :
                           layout.id === "big-stat" ? "42%" :
                           layout.id === "quote-testimonial" ? "\u201C\u201D" :
                           layout.id === "closing" ? "Thank You" :
                           layout.id === "full-bleed-image" ? "\uD83D\uDCF7" :
                           layout.name.substring(0, 6)}
                        </div>
                      ) : (
                        <div className="flex h-full flex-col bg-[var(--color-cpf-mint)]">
                          <div className="h-[22%] w-full bg-[var(--color-cpf-green)]" />
                          <div className="flex flex-1 items-start gap-[3px] p-1">
                            {layout.id === "bullet-list" && (
                              <div className="flex flex-col gap-[2px] flex-1">
                                <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                <div className="h-[3px] w-3/4 rounded-full bg-[var(--color-border)]" />
                                <div className="h-[3px] w-2/3 rounded-full bg-[var(--color-border)]" />
                              </div>
                            )}
                            {layout.id === "content-image-60-40" && (
                              <>
                                <div className="flex flex-col gap-[2px] flex-1">
                                  <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                  <div className="h-[3px] w-2/3 rounded-full bg-[var(--color-border)]" />
                                </div>
                                <div className="w-[30%] self-stretch rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]" />
                              </>
                            )}
                            {layout.id === "image-content-40-60" && (
                              <>
                                <div className="w-[30%] self-stretch rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]" />
                                <div className="flex flex-col gap-[2px] flex-1">
                                  <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                  <div className="h-[3px] w-2/3 rounded-full bg-[var(--color-border)]" />
                                </div>
                              </>
                            )}
                            {layout.id === "kpi-dashboard" && (
                              <div className="grid grid-cols-2 gap-[2px] flex-1">
                                <div className="rounded bg-[var(--color-surface)] p-[1px] text-center">
                                  <div className="h-[4px] w-full rounded bg-[var(--color-cpf-green)]" />
                                  <div className="mt-[1px] h-[2px] w-full rounded-full bg-[var(--color-border)]" />
                                </div>
                                <div className="rounded bg-[var(--color-surface)] p-[1px] text-center">
                                  <div className="h-[4px] w-full rounded bg-[var(--color-cpf-green)]" />
                                  <div className="mt-[1px] h-[2px] w-full rounded-full bg-[var(--color-border)]" />
                                </div>
                                <div className="rounded bg-[var(--color-surface)] p-[1px] text-center">
                                  <div className="h-[4px] w-full rounded bg-[var(--color-turquoise)]" />
                                  <div className="mt-[1px] h-[2px] w-full rounded-full bg-[var(--color-border)]" />
                                </div>
                                <div className="rounded bg-[var(--color-surface)] p-[1px] text-center">
                                  <div className="h-[4px] w-full rounded bg-[var(--color-orange)]" />
                                  <div className="mt-[1px] h-[2px] w-full rounded-full bg-[var(--color-border)]" />
                                </div>
                              </div>
                            )}
                            {layout.id === "two-column" && (
                              <div className="flex gap-[2px] flex-1">
                                <div className="flex flex-col gap-[2px] flex-1 rounded-sm bg-[var(--color-surface)] p-[2px]">
                                  <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                  <div className="h-[2px] w-2/3 rounded-full bg-[var(--color-border)]" />
                                </div>
                                <div className="flex flex-col gap-[2px] flex-1 rounded-sm bg-[var(--color-cpf-green)] p-[2px]">
                                  <div className="h-[3px] w-full rounded-full bg-white/30" />
                                  <div className="h-[2px] w-2/3 rounded-full bg-white/20" />
                                </div>
                              </div>
                            )}
                            {layout.id === "timeline" && (
                              <div className="relative flex-1 px-1 pt-[6px]">
                                <div className="absolute left-1 right-1 top-[6px] h-[1px] bg-[var(--color-border)]" />
                                <div className="relative z-10 flex justify-between">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <div key={n} className={`h-[3px] w-[3px] rounded-full ${n % 2 === 0 ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"}`} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {layout.id === "process-pipeline" && (
                              <div className="flex items-center gap-[1px] flex-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <div key={n} className="flex-1 rounded-sm bg-[var(--color-surface)] px-[1px] py-[2px] text-center">
                                    <div className="h-[4px] w-[4px] rounded-full bg-[var(--color-cpf-green)] mx-auto" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {layout.id === "data-table" && (
                              <div className="flex flex-col flex-1">
                                <div className="h-[4px] w-full bg-[var(--color-cpf-green)]" />
                                <div className="mt-[1px] h-[3px] w-full bg-[var(--color-surface)]" />
                                <div className="mt-[1px] h-[3px] w-full bg-[var(--color-surface)]" />
                              </div>
                            )}
                            {layout.id === "org-chart" && (
                              <div className="flex flex-col items-center gap-[1px] flex-1">
                                <div className="h-[4px] w-[12px] rounded-sm bg-[var(--color-cpf-green)]" />
                                <div className="flex gap-[2px]">
                                  <div className="h-[3px] w-[6px] rounded-sm bg-[var(--color-surface)]" />
                                  <div className="h-[3px] w-[6px] rounded-sm bg-[var(--color-surface)]" />
                                  <div className="h-[3px] w-[6px] rounded-sm bg-[var(--color-surface)]" />
                                </div>
                              </div>
                            )}
                            {layout.id === "sidebar-bullets" && (
                              <div className="flex gap-[2px] flex-1">
                                <div className="w-[35%] rounded-sm bg-[var(--color-cpf-green)] p-[1px]">
                                  <div className="h-[3px] w-full rounded-full bg-white/30" />
                                </div>
                                <div className="flex flex-col gap-[2px] flex-1">
                                  <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                  <div className="h-[3px] w-2/3 rounded-full bg-[var(--color-border)]" />
                                </div>
                              </div>
                            )}
                            {layout.id !== "bullet-list" && layout.id !== "content-image-60-40" && layout.id !== "image-content-40-60" && layout.id !== "kpi-dashboard" && layout.id !== "two-column" && layout.id !== "timeline" && layout.id !== "process-pipeline" && layout.id !== "data-table" && layout.id !== "org-chart" && layout.id !== "sidebar-bullets" && (
                              <div className="flex flex-col gap-[2px] flex-1">
                                <div className="h-[3px] w-full rounded-full bg-[var(--color-border)]" />
                                <div className="h-[3px] w-1/2 rounded-full bg-[var(--color-border)]" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Layout info */}
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold ${
                        isSelected ? "text-[var(--color-cpf-green)]" : "text-[var(--color-fg)]"
                      }`}>
                        {layout.name}
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted)]">
                        {layout.description}
                      </p>
                    </div>
                    {isSelected && (
                      <svg className="mt-1 h-3 w-3 shrink-0 text-[var(--color-cpf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Bottom bar */}
      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
          <span className="font-mono text-xs text-[var(--color-muted)]">
            Slide {slides.length > 0 ? `1 of ${slides.length}` : "—"} · CPF
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={history.undo}
            disabled={!history.canUndo}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm px-2 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
          </button>
          <button
            onClick={history.redo}
            disabled={!history.canRedo}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm px-2 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"/></svg>
          </button>
          <button
            onClick={handleBuildDeck}
            className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
          >
            Build Deck
          </button>
        </div>
      </div>
    </div>
  );
}
