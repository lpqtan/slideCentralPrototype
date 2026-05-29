"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBriefing } from "@/hooks/useBriefing";
import { useDeckStore } from "@/hooks/useDeckStore";
import StepIndicator from "@/components/shared/StepIndicator";
import StepContext from "@/components/wizard/StepContext";
import StepMessage from "@/components/wizard/StepMessage";
import StepNarrative from "@/components/wizard/StepNarrative";
import StepTemplate from "@/components/wizard/StepTemplate";
import StepContent from "@/components/wizard/StepContent";
import { createMockDeck } from "@/lib/mock-deck";

const STEP_LABELS = ["Context", "Message", "Narrative", "Template", "Content"];

export default function BriefingPage() {
  const router = useRouter();
  const { save } = useDeckStore();
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
    setSelectedLayout,
    setSlideCount,
    setAdditionalContent,
    reset,
    submitBriefing,
  } = useBriefing();

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    const data = submitBriefing();
    const currentDeckId = data.deckId ?? crypto.randomUUID();

    const settingsRaw = localStorage.getItem("slidecentral-settings");
    const settings = settingsRaw
      ? JSON.parse(settingsRaw)
      : { strategy: "mock" };

    if (settings.strategy === "mock") {
      // Use pre-built demo deck — skip generating pipeline
      const demo = createMockDeck();
      demo.id = currentDeckId;
      demo.briefing = data;
      save(demo);
      router.push(`/outline?deckId=${encodeURIComponent(currentDeckId)}`);
      return;
    }

    // Save briefing for daemon/llm generating page
    save({
      id: currentDeckId,
      name: data.keyMessage.slice(0, 60),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      briefing: data,
      outline: null,
      slides: null,
      htmlContent: null,
      source: null,
      status: "briefing",
    });

    router.push(`/generating?deckId=${encodeURIComponent(currentDeckId)}`);
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
            Step {step} of 5 — {STEP_LABELS[step - 1]}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] hover:text-[var(--color-fg-soft)]"
        >
          Start Over
        </button>
      </div>

      <StepIndicator currentStep={step} totalSteps={5} labels={STEP_LABELS} />

      {/* Step content */}
      <div className="flex min-h-[400px] flex-col rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        {error && (
          <div className="mb-4 rounded border border-[var(--color-orange)]/50 bg-[var(--color-orange)]/10 p-3 text-xs text-[var(--color-orange)]">
            {error}
          </div>
        )}
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
          <StepTemplate
            selected={briefing.selectedLayouts[0] ?? null}
            onSelect={setSelectedLayout}
          />
        )}
        {step === 5 && (
          <StepContent
            additionalContent={briefing.additionalContent ?? ""}
            onChange={setAdditionalContent}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => step === 1 ? router.push("/") : prevStep()}
          className="rounded border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
        >
          {step === 1 ? "Home" : "Back"}
        </button>

        <div>
          {step < 5 ? (
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
              disabled={generating}
              className="rounded bg-[var(--color-cpf-green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-wait disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate Outline"}
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
