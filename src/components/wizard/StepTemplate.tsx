"use client";

import type { LayoutId } from "@/lib/types";

const PRESET_DECKS = [
  {
    id: "cpf" as LayoutId,
    name: "CPF Theme",
    description: "Standard CPF corporate deck with branded layouts, design bars, motif, and slide counter footer",
    count: 16,
  },
  {
    id: "business" as LayoutId,
    name: "Business Theme",
    description: "Clean business presentation with data-focused layouts for reporting and proposals",
    count: 12,
  },
];

interface StepTemplateProps {
  selected: LayoutId | null;
  onSelect: (id: LayoutId | null) => void;
}

export default function StepTemplate({ selected, onSelect }: StepTemplateProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Preset Slide Decks
        </label>
        <p className="text-xs text-[var(--color-muted)]">
          Optionally start from a preset deck. The AI will adapt it to your content.
          Leave unselected to let the AI build freely.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRESET_DECKS.map((deck) => {
          const isSelected = selected === deck.id;
          return (
            <button
              key={deck.id}
              onClick={() => onSelect(isSelected ? null : deck.id)}
              className={`rounded border p-5 text-left transition-colors ${
                isSelected
                  ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                  : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-fg)]">{deck.name}</span>
                <span className="shrink-0 rounded-full bg-[var(--color-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-muted)]">
                  {deck.count} slides
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--color-muted)]">{deck.description}</p>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-[var(--color-muted)]">
        {selected === null
          ? "No preset selected — AI will build from scratch"
          : "1 preset selected"}
      </div>
    </div>
  );
}
