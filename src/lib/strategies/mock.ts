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

function makeBodyContent(arcId: string, stepIndex: number, total: number, briefing: BriefingData): string {
  const audienceLabel = briefing.audience?.replace("-", " ") ?? "audience";
  const keyMessage = briefing.keyMessage || "key message";

  const contents = [
    `1. ${keyMessage}\n2. This presentation outlines the rationale, data, and recommended path forward for ${audienceLabel}\n3. Key decisions are required to proceed with the proposed approach`,
    `1. Current trends show a clear need for action\n2. Data indicates a shift in how we serve ${audienceLabel}\n3. The case for change is supported by both quantitative and qualitative evidence`,
    `1. ${audienceLabel} expectations have evolved significantly\n2. Internal benchmarks reveal gaps in our current approach\n3. External factors amplify the urgency of this initiative`,
    `1. Our recommended approach addresses the root causes identified\n2. Expected outcomes include improved metrics and efficiency gains\n3. Success will be measured against clearly defined KPIs`,
    `1. Specific actions required with assigned owners and timelines\n2. Milestone tracking ensures accountability across teams\n3. Regular progress reviews will keep the initiative on track`,
    `1. Current state metrics versus target performance indicators\n2. Key gaps highlight where improvement is most needed\n3. Progress to date shows early momentum in priority areas`,
    `1. Identified risks and their potential impact on delivery\n2. Mitigation strategies are in place for each risk category\n3. Contingency plans ensure business continuity`,
    `1. Summary of key messages and recommended actions\n2. The core message reinforces the strategic importance of this initiative\n3. Next steps require leadership endorsement and resource commitment`,
    `1. Phased implementation timeline with key milestones\n2. Phase 1 focuses on foundational setup and quick wins\n3. Subsequent phases build on early momentum for sustained impact`,
    `1. Comparison of current versus proposed approach across key dimensions\n2. The proposed approach delivers superior outcomes across all metrics\n3. Transition plan minimises disruption while maximising value`,
  ];

  return contents[stepIndex % contents.length];
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
    const content = makeBodyContent(arcId, i, total, briefing);
    outline.push({
      slideNumber: i + 1,
      title: makeTitle(arcId, i, total, briefing),
      suggestedLayout: pickLayout(i, total, arcId) as SlideOutline["suggestedLayout"],
      bodyContent: content,
      estimatedMinutes: i === 0 ? 1 : 1.5,
    });
  }

  return outline;
}
