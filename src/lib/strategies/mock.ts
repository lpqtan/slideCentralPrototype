import type { BriefingData, SlideOutline } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";
import { NARRATIVE_ARCS } from "@/lib/instructions";

function pickLayout(index: number, total: number, _arcId: string): string {
  if (index === 0) return "cover";
  if (index === total - 1) return "closing";

  const layouts = LAYOUTS.filter((l) => !l.dark || l.id === "big-stat" || l.id === "quote-testimonial" || l.id === "section-divider");
  const contentLayouts = layouts.filter((l) => l.id !== "cover" && l.id !== "closing" && l.id !== "section-divider");

  if (index % 4 === 0) return "section-divider";
  if (index % 5 === 3) return "big-stat";
  if (index % 6 === 2) return "two-column";
  if (index % 7 === 5) return "timeline";

  return contentLayouts[index % contentLayouts.length]?.id ?? "bullet-list";
}

function makeContentPrompt(arcId: string, stepIndex: number, total: number, briefing: BriefingData): string {
  const audienceLabel = briefing.audience?.replace("-", " ") ?? "audience";
  const keyMessage = briefing.keyMessage || "key message";

  const prompts = [
    `Describe the context and rationale behind: ${keyMessage}`,
    `Provide supporting data and evidence for: ${keyMessage}`,
    `Explain the impact on ${audienceLabel} and why this matters now`,
    `Detail the recommended approach and expected outcomes`,
    `List 3–5 specific actions or decisions needed, with owners and timelines`,
    `Present key metrics showing current state vs target`,
    `Address potential risks or blockers and mitigation strategies`,
    `Summarise key takeaways and reinforce the main message`,
    `Show a timeline of implementation phases`,
    `Compare alternatives: current approach vs proposed`,
  ];

  return prompts[stepIndex % prompts.length];
}

function makeTitle(arcId: string, stepIndex: number, total: number, briefing: BriefingData): string {
  const arc = NARRATIVE_ARCS.find((a) => a.id === arcId);
  const stepLabel = arc?.sequence?.[Math.min(stepIndex, arc.sequence.length - 1)] ?? "";
  const titles: Record<string, string[]> = {
    proposal: [
      "The Opportunity Ahead",
      "Our Members Are Telling Us Something",
      "Root Cause: Why Current Approaches Fall Short",
      "What Success Looks Like — Our Target State",
      "The Path Forward: Recommended Actions",
      "Investment Required vs. Expected Returns",
      "Implementation Roadmap",
      "Risks and How We'll Mitigate Them",
      "Measuring Success: Key Milestones",
      "Next Steps and Decision Required",
    ],
    status: [
      "Where We Stand Today",
      "Progress Against Q2 Targets",
      "What's Working Well",
      "Blockers Requiring Leadership Attention",
      "Resource Constraints and Their Impact",
      "Key Metrics at a Glance",
      "Team Updates and Milestones",
      "Revised Timeline and Dependencies",
      "Immediate Next Steps",
      "Decisions Needed This Month",
    ],
    teaching: [
      "What You Need to Know",
      "Why This Matters to Your Work",
      "The Core Concepts Explained",
      "How It Works in Practice",
      "Key Principles to Remember",
      "Common Pitfalls and How to Avoid Them",
      "Case Study: A Real-World Example",
      "Applying This to Your Context",
      "Resources and Next Steps for Learning",
      "Key Takeaways",
    ],
  };

  const list = titles[arcId] ?? titles.proposal;
  return list[Math.min(stepIndex, list.length - 1)] ?? `${stepLabel}: ${briefing.keyMessage.slice(0, 40)}`;
}

export function generateMockOutline(briefing: BriefingData): SlideOutline[] {
  const total = briefing.slideCount ?? 15;
  const arcId = briefing.narrativeArc ?? "proposal";
  const outline: SlideOutline[] = [];

  for (let i = 0; i < total; i++) {
    outline.push({
      slideNumber: i + 1,
      title: makeTitle(arcId, i, total, briefing),
      suggestedLayout: pickLayout(i, total, arcId) as SlideOutline["suggestedLayout"],
      contentPrompt: makeContentPrompt(arcId, i, total, briefing),
      estimatedMinutes: i === 0 ? 1 : 1.5,
    });
  }

  return outline;
}
