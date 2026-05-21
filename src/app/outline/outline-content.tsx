"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { SlideOutline } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";

function getLayoutName(id: string): string {
  return LAYOUTS.find((l) => l.id === id)?.name ?? id;
}

export default function OutlineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById } = useDeckStore();

  const [outline, setOutline] = useState<SlideOutline[]>([]);

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }
    const deck = getById(deckId);
    if (deck?.outline) {
      setOutline(deck.outline);
    }
  }, [deckId, getById, router]);

  const estimatedMinutes = outline.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  if (!deckId || outline.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">No outline found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Slide Outline</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
            {outline.length} slides · ~{estimatedMinutes} minutes
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/briefing`}
            className="rounded border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            Back to Briefing
          </Link>
          <button
            onClick={() => {
              /* Phase 6: build deck */
            }}
            className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
          >
            Continue to Content Editor
          </button>
        </div>
      </div>

      {/* Outline cards */}
      <div className="space-y-3">
        {outline.map((slide) => (
          <div
            key={slide.slideNumber}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-cpf-green)] text-xs font-bold text-white">
                {slide.slideNumber}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-[var(--color-fg)]">{slide.title}</h3>
                  <span className="shrink-0 rounded bg-[var(--color-cpf-mint)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                    {getLayoutName(slide.suggestedLayout)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{slide.contentPrompt}</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="font-mono text-[10px] text-[var(--color-muted)]">
                    ~{slide.estimatedMinutes} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-8">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Slide {outline.length > 0 ? `1 of ${outline.length}` : "—"} · CPF
        </span>
      </div>
    </div>
  );
}
