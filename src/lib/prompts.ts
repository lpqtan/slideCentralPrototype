import type { BriefingData } from "@/lib/types";
import { OBJECTIVES, AUDIENCES, MODES, NARRATIVE_ARCS, CONTENT_PRINCIPLES } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";
import { BRAND_RULES } from "@/lib/brands";

function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

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
- contentPrompt: string (suggested content the presenter should fill in for this slide)
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

Make the title of each slide custom, depending on what each slide is supposed to contain. For the content of each slide, do not create a prompt, but rather populate the content based on the additional content section. 
If the additional content section is empty or insufficient, fill the content with what is expected based on the key message and ask. 
The key message and ask are the most important, and have precedence over the additional content. 

Return ONLY the JSON array — no other text.`;
}
