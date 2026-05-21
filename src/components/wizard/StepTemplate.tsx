"use client";

import { LAYOUTS } from "@/lib/layouts";
import type { LayoutId } from "@/lib/types";

interface StepTemplateProps {
  selected: LayoutId[];
  onToggle: (id: LayoutId) => void;
}

export default function StepTemplate({ selected, onToggle }: StepTemplateProps) {
  const toggleSelectAll = () => {
    if (selected.length === LAYOUTS.length) {
      // Deselect all
    } else {
      selected.forEach((id) => onToggle(id));
    }
  };

  const allSelected = selected.length === LAYOUTS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Preset Templates
          </label>
          <p className="text-xs text-[var(--color-muted)]">
            Select layouts to include. Leave all unselected to let the AI choose freely.
            <br />
            This step is optional — you can skip it.
          </p>
        </div>
        <button
          onClick={toggleSelectAll}
          className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LAYOUTS.map((layout) => {
          const isSelected = selected.includes(layout.id);
          return (
            <button
              key={layout.id}
              onClick={() => onToggle(layout.id)}
              className={`rounded border p-3 text-left transition-colors ${
                isSelected
                  ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                  : "border-[var(--color-border)] bg-[var(--color-cpf-paper)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              {/* Mini preview placeholder */}
              <div
                className={`mb-2 flex h-16 items-center justify-center rounded border text-[9px] font-medium uppercase tracking-wider ${
                  layout.dark
                    ? "border-transparent bg-[var(--color-cpf-green)] text-[var(--color-cpf-mint)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                }`}
              >
                {layout.dark ? "Dark" : "Light"}
                {layout.dark && <div className="ml-1 h-2 w-2 rounded-full bg-white/30" />}
              </div>
              <span className="block text-xs font-semibold text-[var(--color-fg)]">
                {layout.name}
              </span>
              <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                {layout.useCases[0]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-[var(--color-muted)]">
        {selected.length === 0
          ? "No templates selected — AI will choose layouts freely"
          : `${selected.length} of ${LAYOUTS.length} layouts selected`}
      </div>
    </div>
  );
}
