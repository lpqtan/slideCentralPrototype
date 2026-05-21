"use client";

import { OBJECTIVES, AUDIENCES, MODES } from "@/lib/instructions";
import type { Objective, Audience, DeckMode } from "@/lib/types";

interface StepContextProps {
  objective: Objective | null;
  audience: Audience | null;
  mode: DeckMode | null;
  onObjectiveChange: (value: Objective) => void;
  onAudienceChange: (value: Audience) => void;
  onModeChange: (value: DeckMode) => void;
}

export default function StepContext({
  objective,
  audience,
  mode,
  onObjectiveChange,
  onAudienceChange,
  onModeChange,
}: StepContextProps) {
  return (
    <div className="space-y-8">
      {/* Objective */}
      <div>
        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Objective
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          What does this deck need to achieve?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OBJECTIVES.map((obj) => {
            const isSelected = objective === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => onObjectiveChange(obj.id as Objective)}
                className={`rounded border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                    : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <span className="mr-2 text-sm opacity-60">{obj.icon}</span>
                <span className="text-sm font-semibold text-[var(--color-fg)]">{obj.label}</span>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{obj.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Audience */}
      <div>
        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Audience
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Who is this presentation for?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {AUDIENCES.map((aud) => {
            const isSelected = audience === aud.id;
            return (
              <button
                key={aud.id}
                onClick={() => onAudienceChange(aud.id as Audience)}
                className={`rounded border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                    : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <span className="text-sm font-semibold text-[var(--color-fg)]">{aud.label}</span>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{aud.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode */}
      <div>
        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Mode
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          How will the audience consume this deck?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id as DeckMode)}
                className={`rounded border p-4 text-center transition-colors ${
                  isSelected
                    ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                    : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <span className="text-sm font-semibold text-[var(--color-fg)]">{m.label}</span>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{m.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
