"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const startNewDeck = useCallback(() => {
    localStorage.removeItem("slidecentral-current-briefing");
    localStorage.removeItem("slidecentral-current-step");
    router.push("/briefing");
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 py-20">
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
      <div className="grid w-full max-w-2xl grid-cols-4 gap-4">
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

      {/* CTA */}
      <button
        onClick={startNewDeck}
        className="rounded bg-[var(--color-cpf-green)] px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
      >
        Start New Deck
      </button>

      {/* Saved decks placeholder */}
      <div className="mt-8 w-full max-w-2xl rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Recent Decks
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          No decks yet. Click "Start New Deck" to create your first presentation.
        </p>
      </div>

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-8">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          CPF Presentation Builder
        </span>
      </div>
    </div>
  );
}
