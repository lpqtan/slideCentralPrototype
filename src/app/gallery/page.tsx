"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DbDeckCard {
  deckId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  slideCount: number;
  status: string;
  htmlContent: string;
}

function statusLabel(s: string): string {
  switch (s) {
    case "built": return "Built";
    case "exported": return "Exported";
    default: return s;
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function GalleryPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DbDeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDecks = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/decks")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data: DbDeckCard[]) => setDecks(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const openDeck = useCallback(
    (deckId: string) => {
      router.push(`/preview?deckId=${encodeURIComponent(deckId)}`);
    },
    [router]
  );

  const deleteDeck = useCallback(
    async (e: React.MouseEvent, deckId: string) => {
      e.stopPropagation();
      if (!confirm("Delete this deck from the database?")) return;
      try {
        await fetch(`/api/decks/${encodeURIComponent(deckId)}`, { method: "DELETE" });
        fetchDecks();
      } catch { /* ignore */ }
    },
    [fetchDecks]
  );

  const downloadPptx = useCallback(
    async (e: React.MouseEvent, deckId: string) => {
      e.stopPropagation();
      try {
        const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}/pptx`);
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "presentation.pptx";
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
    },
    []
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">Saved Decks</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
            {loading
              ? "Loading..."
              : error
                ? "Could not load decks"
                : `${decks.length} deck${decks.length === 1 ? "" : "s"} in database`}
          </p>
        </div>
        <button
          onClick={fetchDecks}
          disabled={loading}
          className="rounded border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)] disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-cpf-green)] border-t-transparent" />
            <p className="text-sm text-[var(--color-muted)]">Loading saved decks...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchDecks}
              className="rounded border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)] hover:bg-[var(--color-cpf-mint)]"
            >
              Retry
            </button>
          </div>
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-cpf-mint)]">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" className="text-[var(--color-cpf-green)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--color-fg-soft)]">No saved decks</p>
            <p className="max-w-xs text-xs text-[var(--color-muted)]">
              Build a deck and save it to the database to see it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <div
              key={deck.deckId}
              role="button"
              tabIndex={0}
              onClick={() => openDeck(deck.deckId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openDeck(deck.deckId);
              }}
              className="group flex cursor-pointer flex-col rounded border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-cpf-green)] hover:shadow-sm"
            >
              <div className="relative aspect-video overflow-hidden rounded-t bg-[var(--color-cpf-mint)]">
                <iframe
                  srcDoc={deck.htmlContent}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none border-0"
                  style={{ transform: "scale(0.25)", transformOrigin: "top left", width: "400%", height: "400%" }}
                  title={deck.name}
                  tabIndex={-1}
                />
                <div className="absolute inset-0" />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--color-fg)]">
                      {deck.name || "Untitled Deck"}
                    </span>
                    <span className="shrink-0 rounded bg-[var(--color-cpf-mint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                      {statusLabel(deck.status)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                    <span>{deck.slideCount} slides</span>
                    <span>{timeAgo(deck.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => downloadPptx(e, deck.deckId)}
                    className="rounded p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-cpf-mint)] hover:text-[var(--color-cpf-green)]"
                    title="Download PPTX"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteDeck(e, deck.deckId)}
                    className="rounded p-1.5 text-[var(--color-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete deck"
                  >
                    <svg width="15" height="15" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M3 3.5L4.5 2L6 3.5L7.5 2L9 3.5L7.5 5L9 6.5L7.5 8L6 6.5L4.5 8L3 6.5L4.5 5L3 3.5Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Slide Central · CPF
        </span>
      </div>
    </div>
  );
}
