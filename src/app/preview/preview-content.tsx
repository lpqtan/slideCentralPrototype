"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";

export default function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById } = useDeckStore();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobRef = { current: null as string | null };

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }
    const deck = getById(deckId);
    if (deck?.htmlContent) {
      const blob = new Blob([deck.htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setBlobUrl(url);
    }
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, [deckId, getById, router]);

  if (!blobUrl) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">No deck to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Deck Preview</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
            Use arrow keys to navigate, Home/End to jump
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/outline?deckId=${encodeURIComponent(deckId ?? "")}`}
            className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            Back to Outline
          </Link>
          <button
            onClick={() => {
              /* Phase 8: PPTX export */
            }}
            className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
          >
            Download PPTX
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <iframe
          src={blobUrl}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
          allowFullScreen
          title="Slide Deck Preview"
        />
      </div>

      {/* Keyboard hint */}
      <div className="mt-3 shrink-0 flex items-center justify-center gap-6 text-xs text-[var(--color-muted)]">
        <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px]">←</kbd> <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px]">→</kbd> Navigate</span>
        <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px]">Home</kbd> First slide</span>
        <span><kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px]">End</kbd> Last slide</span>
      </div>

      {/* Brand bar */}
      <div className="mt-3 shrink-0 flex items-center gap-2">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Preview · CPF
        </span>
      </div>
    </div>
  );
}
