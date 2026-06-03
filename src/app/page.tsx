"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { SavedDeck } from "@/lib/types";

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
    case "briefing": return "Draft";
    case "outline": return "Outline Ready";
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

export default function HomePage() {
  const router = useRouter();
  const { getAllDecks, remove } = useDeckStore();
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [mounted, setMounted] = useState(false);

  const [dbDecks, setDbDecks] = useState<DbDeckCard[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    setDecks(getAllDecks());
    setMounted(true);
  }, [getAllDecks]);

  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((data: DbDeckCard[]) => setDbDecks(data))
      .catch(() => { /* DB offline */ })
      .finally(() => setDbLoading(false));
  }, []);

  const refreshDbDecks = useCallback(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((data: DbDeckCard[]) => setDbDecks(data))
      .catch(() => {});
  }, []);

  const startNewDeck = useCallback(() => {
    localStorage.removeItem("slidecentral-current-briefing");
    localStorage.removeItem("slidecentral-current-step");
    router.push("/briefing");
  }, [router]);

  const openDeck = useCallback(
    (deck: SavedDeck) => {
      if (deck.status === "built") {
        router.push(`/preview?deckId=${encodeURIComponent(deck.id)}`);
      } else {
        router.push(`/outline?deckId=${encodeURIComponent(deck.id)}`);
      }
    },
    [router]
  );

  const openDbDeck = useCallback(
    (deckId: string) => {
      router.push(`/preview?deckId=${encodeURIComponent(deckId)}`);
    },
    [router]
  );

  const deleteDeck = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      remove(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    },
    [remove]
  );

  const deleteDbDeck = useCallback(
    async (e: React.MouseEvent, deckId: string) => {
      e.stopPropagation();
      try {
        await fetch(`/api/decks/${encodeURIComponent(deckId)}`, { method: "DELETE" });
        refreshDbDecks();
      } catch { /* ignore */ }
    },
    [refreshDbDecks]
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
    <div className="flex flex-1 flex-col gap-6 px-2 py-8">
      {/* Brand header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded bg-[var(--color-cpf-green)]">
          <span className="font-['Roboto'] text-3xl font-black text-white">S</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-fg)]">
          Slide Central
        </h1>
        <p className="max-w-md text-lg text-[var(--color-fg-soft)]">
          Generate CPF-branded presentations with AI — from briefing to polished deck
        </p>
      </div>

      {/* How it works */}
      <div className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-4">
        {[
          { step: 1, label: "Brief" },
          { step: 2, label: "Outline" },
          { step: 3, label: "Content" },
          { step: 4, label: "Build" },
        ].map((s) => (
          <div key={s.step} className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-cpf-green)] text-sm font-bold text-white">
              {s.step}
            </div>
            <span className="text-sm text-[var(--color-fg-soft)]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mx-auto flex gap-3">
        <button
          onClick={startNewDeck}
          className="rounded bg-[var(--color-cpf-green)] px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
        >
          Start New Deck
        </button>
        <button
          onClick={() => router.push("/chat-briefing")}
          className="rounded border border-[var(--color-cpf-green)] px-6 py-3 text-lg font-medium text-[var(--color-cpf-green)] transition-colors hover:bg-[var(--color-cpf-mint)]"
        >
          Chat Briefing
        </button>
      </div>

      {/* Saved Decks — from MongoDB */}
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Saved Decks
          </h2>
          {dbLoading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading saved decks...</p>
          ) : dbDecks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No saved decks in database. Build a deck to see it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {dbDecks.map((deck) => (
                <div
                  key={deck.deckId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDbDeck(deck.deckId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openDbDeck(deck.deckId);
                  }}
                  className="group flex cursor-pointer flex-col rounded border border-[var(--color-border)] transition-colors hover:border-[var(--color-cpf-green)]"
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
                  <div className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--color-fg)]">
                          {deck.name || "Untitled Deck"}
                        </span>
                        <span className="shrink-0 rounded bg-[var(--color-cpf-mint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                          {statusLabel(deck.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                        <span>{deck.slideCount} slides</span>
                        <span>{mounted ? timeAgo(deck.updatedAt) : "—"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => downloadPptx(e, deck.deckId)}
                        className="rounded p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-cpf-mint)] hover:text-[var(--color-cpf-green)]"
                        title="Download PPTX"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => deleteDbDeck(e, deck.deckId)}
                        className="rounded p-1.5 text-[var(--color-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete deck"
                      >
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M3 3.5L4.5 2L6 3.5L7.5 2L9 3.5L7.5 5L9 6.5L7.5 8L6 6.5L4.5 8L3 6.5L4.5 5L3 3.5Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Saved decks — from localStorage */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Recent Decks
          </h2>
          {decks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No drafts yet. Click "Start New Deck" to create your first presentation.
            </p>
          ) : (
            <div className="max-h-[35vh] space-y-2 overflow-y-auto">
              {decks.map((deck) => {
                const slideCount = deck.outline?.length ?? deck.slides?.length ?? 0;
                return (
                  <div
                    key={deck.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDeck(deck)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openDeck(deck);
                    }}
                    className="group flex w-full cursor-pointer items-center justify-between rounded border border-[var(--color-border)] p-3 text-left transition-colors hover:border-[var(--color-cpf-green)] hover:bg-[var(--color-cpf-mint)]/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--color-fg)]">
                          {deck.name || "Untitled Deck"}
                        </span>
                        <span className="shrink-0 rounded bg-[var(--color-cpf-mint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                          {statusLabel(deck.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                        {slideCount > 0 && <span>{slideCount} slides</span>}
                        <span>{mounted ? timeAgo(deck.updatedAt) : "—"}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteDeck(e, deck.id)}
                      className="ml-3 shrink-0 rounded p-1 text-[var(--color-muted)] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Delete deck"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M3 3.5L4.5 2L6 3.5L7.5 2L9 3.5L7.5 5L9 6.5L7.5 8L6 6.5L4.5 8L3 6.5L4.5 5L3 3.5Z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Brand bar */}
      <div className="mx-auto flex items-center gap-2 pt-4">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          CPF Presentation Builder
        </span>
      </div>
    </div>
  );
}
