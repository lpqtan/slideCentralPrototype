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
    <div className="mb-8 flex items-center">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        const isFirst = i === 0;
        const isLast = i === totalSteps - 1;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <div
                className={`h-[2px] flex-1 rounded-full ${
                  isFirst ? "invisible" : ""
                } ${
                  isDone ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                }`}
              />
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-cpf-green)] text-white"
                    : isDone
                      ? "bg-[var(--color-cpf-green-dim)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {isDone ? "\u2713" : stepNum}
              </div>
              <div
                className={`h-[2px] flex-1 rounded-full ${
                  isLast ? "invisible" : ""
                } ${
                  isDone && !isLast ? "bg-[var(--color-cpf-green)]" : "bg-[var(--color-border)]"
                }`}
              />
            </div>
            <span
              className={`text-xs font-medium ${
                isDone || isActive ? "text-[var(--color-cpf-green)]" : "text-[var(--color-muted)]"
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
