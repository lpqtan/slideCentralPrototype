import type { BriefingData } from "@/lib/types";
import { fmtId, CONTENT_PRINCIPLES } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";
import { BRAND_RULES } from "@/lib/brands";

export function buildSystemPrompt(): string {
  return `You are a presentation design assistant creating slide outlines for CPF (Central Provident Fund) presentations.

## Brand Rules
- ${BRAND_RULES.backgroundContent}
- ${BRAND_RULES.greenIsPanelNotText}
- ${BRAND_RULES.oneAccent}
- ${BRAND_RULES.noShadows ? "Flat design — no drop shadows" : ""}
- ${BRAND_RULES.cardStyle}
- ${BRAND_RULES.slideCounter}

## Content Principles
- ${CONTENT_PRINCIPLES.titlesAsSpine}
- ${CONTENT_PRINCIPLES.oneIdea}
- ${CONTENT_PRINCIPLES.numberedLists}
- ${CONTENT_PRINCIPLES.openWithAnswer}
- ${CONTENT_PRINCIPLES.density}

## House Style
- Language: ${CONTENT_PRINCIPLES.houseStyle.language}
- ${CONTENT_PRINCIPLES.houseStyle.acronyms}
- ${CONTENT_PRINCIPLES.houseStyle.slideNumbers}
- ${CONTENT_PRINCIPLES.houseStyle.numbers}
- ${CONTENT_PRINCIPLES.houseStyle.currency}

## Available Layouts
${LAYOUTS.map((l) => `- **${l.name}** (${l.id}): ${l.description}`).join("\n")}

## Output Format
Return a JSON array where each element has:
- slideNumber: number
- title: string (an insight, not a label — the title sequence should read as an executive summary)
- suggestedLayout: one of the layout IDs above
- bodyContent: string (the actual slide content as a numbered list — one point per line)
- estimatedMinutes: number (1–3)`;
}

export function buildUserPrompt(briefing: BriefingData): string {
  const arc = NARRATIVE_ARCS.find((a) => a.id === briefing.narrativeArc);

  return `Create a slide outline for a presentation with the following brief:

**Objective:** ${fmtId(briefing.objective ?? "")}
**Audience:** ${fmtId(briefing.audience ?? "")}
**Mode:** ${fmtId(briefing.mode ?? "")}
**Key Message:** ${briefing.keyMessage}
**The Ask:** ${briefing.audienceAsk}
**Narrative Arc:** ${arc?.label ?? "None selected"} → ${arc?.description ?? ""}
**Estimated Slide Count:** ${briefing.slideCount ?? 15}
**Preferred Layouts:** ${briefing.selectedLayouts.length > 0 ? briefing.selectedLayouts.join(", ") : "No preference — choose freely"}

Follow the narrative arc structure. The first slide should be a cover, and the last a closing/thank you slide. Use section dividers between major arc phases.

Return ONLY the JSON array — no other text.`;
}
