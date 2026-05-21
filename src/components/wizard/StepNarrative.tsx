"use client";

import { NARRATIVE_ARCS } from "@/lib/instructions";
import type { NarrativeArc } from "@/lib/types";

interface StepNarrativeProps {
  arc: NarrativeArc | null;
  onChange: (arc: NarrativeArc) => void;
}

export default function StepNarrative({ arc, onChange }: StepNarrativeProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Narrative Arc
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          A sequence of slides without a discernible arc is a document, not a presentation.
          Choose the arc that fits your objective.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {NARRATIVE_ARCS.map((narr) => {
          const isSelected = arc === narr.id;
          return (
            <button
              key={narr.id}
              onClick={() => onChange(narr.id as NarrativeArc)}
              className={`rounded border p-5 text-left transition-colors ${
                isSelected
                  ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                  : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <span className="text-base font-bold text-[var(--color-fg)]">
                {narr.label}
              </span>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {narr.description}
              </p>

              {/* Arc sequence visual */}
              <div className="mt-4 flex items-center gap-1">
                {narr.sequence.map((step, i) => (
                  <div key={i} className="flex flex-1 items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isSelected
                          ? "bg-[var(--color-cpf-green)] text-white"
                          : "bg-[var(--color-border)] text-[var(--color-muted)]"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < narr.sequence.length - 1 && (
                      <div
                        className={`mx-1 h-[2px] flex-1 rounded-full ${
                          isSelected ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                {narr.sequence.map((step, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-[var(--color-muted)]">
                    {step}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
