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
              <div className="mt-4 flex items-center">
                {narr.sequence.map((stepLabel, i) => {
                  const isFirst = i === 0;
                  const isLast = i === narr.sequence.length - 1;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        <div
                          className={`h-[2px] flex-1 rounded-full ${
                            isFirst ? "invisible" : ""
                          } ${
                            isSelected ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                          }`}
                        />
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            isSelected
                              ? "bg-[var(--color-cpf-green)] text-white"
                              : "bg-[var(--color-border)] text-[var(--color-muted)]"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div
                          className={`h-[2px] flex-1 rounded-full ${
                            isLast ? "invisible" : ""
                          } ${
                            isSelected ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                          }`}
                        />
                      </div>
                      <span className="mt-1 text-center text-[10px] leading-tight text-[var(--color-muted)]">
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
