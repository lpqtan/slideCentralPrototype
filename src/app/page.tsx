"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SavedDeck } from "@/lib/types";

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

  useEffect(() => {
    setDecks(getAllDecks());
    setMounted(true);
  }, [getAllDecks]);

  const startNewDeck = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.BRIEFING);
    localStorage.removeItem(STORAGE_KEYS.STEP);
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

  const deleteDeck = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      remove(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    },
    [remove]
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
      <div className="mx-auto grid w-full max-w-2xl grid-cols-5 gap-4">
        {[
          { step: 1, label: "Brief" },
          { step: 2, label: "Message" },
          { step: 3, label: "Outline" },
          { step: 4, label: "Content" },
          { step: 5, label: "Build" },
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

      {/* Saved decks */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Recent Decks
          </h2>
          {decks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No decks yet. Click "Start New Deck" to create your first presentation.
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
