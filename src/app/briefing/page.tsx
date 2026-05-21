"use client";

import { useBriefing } from "@/hooks/useBriefing";
import StepIndicator from "@/components/shared/StepIndicator";
import StepContext from "@/components/wizard/StepContext";
import StepMessage from "@/components/wizard/StepMessage";
import StepNarrative from "@/components/wizard/StepNarrative";
import StepTemplate from "@/components/wizard/StepTemplate";

const STEP_LABELS = ["Context", "Message", "Narrative", "Template"];

export default function BriefingPage() {
  const {
    step,
    briefing,
    nextStep,
    prevStep,
    canProceed,
    setObjective,
    setAudience,
    setMode,
    setKeyMessage,
    setAudienceAsk,
    setNarrativeArc,
    toggleLayout,
    setSlideCount,
    reset,
    submitBriefing,
  } = useBriefing();

  const handleGenerate = () => {
    const data = submitBriefing();
    console.log("Briefing submitted:", data);
    // In Phase 3: call the generation API
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">
            New Presentation Briefing
          </h1>
          <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
            Step {step} of 4 — {STEP_LABELS[step - 1]}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] hover:text-[var(--color-fg-soft)]"
        >
          Start Over
        </button>
      </div>

      <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />

      {/* Step content */}
      <div className="flex min-h-[400px] flex-col rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        {step === 1 && (
          <StepContext
            objective={briefing.objective}
            audience={briefing.audience}
            mode={briefing.mode}
            onObjectiveChange={setObjective}
            onAudienceChange={setAudience}
            onModeChange={setMode}
          />
        )}
        {step === 2 && (
          <StepMessage
            keyMessage={briefing.keyMessage}
            audienceAsk={briefing.audienceAsk}
            estimatedSlideCount={briefing.slideCount ?? 15}
            onKeyMessageChange={setKeyMessage}
            onAudienceAskChange={setAudienceAsk}
            onSlideCountChange={setSlideCount}
          />
        )}
        {step === 3 && (
          <StepNarrative arc={briefing.narrativeArc} onChange={setNarrativeArc} />
        )}
        {step === 4 && (
          <StepTemplate selected={briefing.selectedLayouts} onToggle={toggleLayout} />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="rounded border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        <div className="flex gap-3">
          {step === 4 && (
            <button
              onClick={handleGenerate}
              className="rounded border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
            >
              Skip
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="rounded bg-[var(--color-cpf-green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              className="rounded bg-[var(--color-cpf-green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
            >
              Generate Outline
            </button>
          )}
        </div>
      </div>

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-8">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Slide Central · CPF
        </span>
      </div>
    </div>
  );
}
