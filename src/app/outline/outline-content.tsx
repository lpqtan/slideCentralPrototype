"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { SlideOutline, GenerationSource } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";

interface EditableSlide extends SlideOutline {
  locked: boolean;
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
  const { getById, updateOutline } = useDeckStore();

  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [source, setSource] = useState<GenerationSource | null>(null);
  const [editingField, setEditingField] = useState<{ slide: number; field: "title" | "prompt" } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Regenerate state
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }
    const deck = getById(deckId);
    if (deck?.outline) {
      setSlides(
        deck.outline.map((s) => ({
          ...s,
          locked: false,
        }))
      );
      setSource(deck.source ?? null);
    }
  }, [deckId, getById, router]);

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
      }));
      updateOutline(deckId, clean);
    },
    [deckId, updateOutline]
  );

  const startEdit = (slide: number, field: "title" | "prompt", currentValue: string) => {
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
        return { ...s, contentPrompt: editValue };
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

  // --- Regenerate ---

  const handleRegenerate = () => {
    if (!deckId || !regenPrompt.trim()) return;

    // Store locked slide numbers so the generating page can use them
    const lockedIds = slides.filter((s) => s.locked).map((s) => s.slideNumber);
    localStorage.setItem(
      "slidecentral-regeneration-ctx",
      JSON.stringify({ lockedSlideNumbers: lockedIds })
    );

    router.push(
      `/generating?deckId=${encodeURIComponent(deckId)}&regenerationPrompt=${encodeURIComponent(regenPrompt.trim())}`
    );
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
          <button
            onClick={() => {
              /* Phase 7: build deck */
            }}
            className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
          >
            Build Deck
          </button>
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

      {/* Slides */}
      <div className="space-y-2">
        {displaySlides.map(({ slide, isDragging, isDropTarget }, displayIdx) => (
          <div
            key={slide.slideNumber}
            draggable
            onDragStart={() => {
              // Find the real index of this slide in the original slides array
              const realIdx = slides.findIndex((s) => s.slideNumber === slide.slideNumber);
              handleDragStart(realIdx);
            }}
            onDragOver={(e) => handleDragOver(e, displayIdx)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`group rounded border bg-[var(--color-surface)] p-4 transition-all duration-150 cursor-grab active:cursor-grabbing ${
              isDragging
                ? "opacity-30 scale-[0.98]"
                : isDropTarget && dragIndex !== null
                  ? "border-[var(--color-cpf-green)] border-dashed ring-1 ring-[var(--color-cpf-green)]/40"
                  : slide.locked
                    ? "border-[var(--color-orange)]/40 bg-[var(--color-orange)]/[0.03]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Drag handle + slide number */}
              <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                    slide.locked ? "bg-[var(--color-orange)]" : "bg-[var(--color-cpf-green)]"
                  }`}
                >
                  {slide.locked ? "\uD83D\uDD12" : slide.slideNumber}
                </div>
                <span className="text-[9px] text-[var(--color-muted)] select-none">
                  &#x2630;
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Title */}
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

                {/* Content prompt */}
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
                    className="mt-1 cursor-text text-xs text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]"
                    onClick={() =>
                      startEdit(slide.slideNumber, "prompt", slide.contentPrompt)
                    }
                  >
                    {slide.contentPrompt}
                  </p>
                )}

                {/* Meta */}
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded bg-[var(--color-cpf-mint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                    {getLayoutName(slide.suggestedLayout)}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--color-muted)]">
                    ~{slide.estimatedMinutes} min
                  </span>
                  {slide.locked && (
                    <span className="text-[10px] text-[var(--color-orange)]">
                      Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-8">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Slide {slides.length > 0 ? `1 of ${slides.length}` : "—"} · CPF
        </span>
      </div>
    </div>
  );
}
