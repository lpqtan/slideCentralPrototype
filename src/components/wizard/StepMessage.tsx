"use client";

interface StepMessageProps {
  keyMessage: string;
  audienceAsk: string;
  estimatedSlideCount: number;
  onKeyMessageChange: (value: string) => void;
  onAudienceAskChange: (value: string) => void;
  onSlideCountChange: (value: number) => void;
}

export default function StepMessage({
  keyMessage,
  audienceAsk,
  estimatedSlideCount,
  onKeyMessageChange,
  onAudienceAskChange,
  onSlideCountChange,
}: StepMessageProps) {
  return (
    <div className="space-y-8">
      {/* Key Message */}
      <div>
        <label
          htmlFor="keyMessage"
          className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]"
        >
          Key Message
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          If the audience remembers only one sentence, what should it be? This drives the
          entire deck. Open with the answer, not the buildup.
        </p>
        <textarea
          id="keyMessage"
          rows={3}
          maxLength={500}
          value={keyMessage}
          onChange={(e) => onKeyMessageChange(e.target.value)}
          placeholder="e.g. Member engagement has declined 12% year-on-year, and we need to approve a S$2.4m outreach programme to reverse the trend."
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-cpf-paper)] px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none focus:ring-1 focus:ring-[var(--color-cpf-green)]"
        />
        <p className="mt-1 text-right text-xs text-[var(--color-muted)]">
          {keyMessage.length} / 500
        </p>
      </div>

      {/* Audience Ask */}
      <div>
        <label
          htmlFor="audienceAsk"
          className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]"
        >
          The Ask
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          What specifically does the audience need to decide, do, or fund after this
          presentation?
        </p>
        <textarea
          id="audienceAsk"
          rows={3}
          maxLength={500}
          value={audienceAsk}
          onChange={(e) => onAudienceAskChange(e.target.value)}
          placeholder="e.g. Approve budget allocation of S$500k for Q3 outreach pilots, and nominate a department lead by end of month."
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-cpf-paper)] px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none focus:ring-1 focus:ring-[var(--color-cpf-green)]"
        />
        <p className="mt-1 text-right text-xs text-[var(--color-muted)]">
          {audienceAsk.length} / 500
        </p>
      </div>

      {/* Time Budget / Slide Count */}
      <div>
        <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Estimated Length
        </label>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          How many slides do you need? (AI will refine this)
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={estimatedSlideCount}
            onChange={(e) => onSlideCountChange(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-cpf-green)]"
          />
          <span className="min-w-[4rem] text-center font-mono text-sm text-[var(--color-fg)]">
            {estimatedSlideCount} slides
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Roughly {estimatedSlideCount * 1.5}–{estimatedSlideCount * 2} minutes of
          presentation time
        </p>
      </div>
    </div>
  );
}
