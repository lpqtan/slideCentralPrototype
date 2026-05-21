"use client";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-1">
              {i > 0 && (
                <div
                  className={`h-[2px] flex-1 rounded-full ${
                    isDone || isActive ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                  }`}
                />
              )}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-cpf-green)] text-white"
                    : isDone
                      ? "bg-[var(--color-cpf-green-dim)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`h-[2px] flex-1 rounded-full ${
                    isActive ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                isActive ? "text-[var(--color-cpf-green)]" : "text-[var(--color-muted)]"
              }`}
            >
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
