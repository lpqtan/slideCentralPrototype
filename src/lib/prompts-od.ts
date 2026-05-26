import type { BriefingData } from "@/lib/types";
import { OBJECTIVES, AUDIENCES, MODES, NARRATIVE_ARCS } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";

function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

export function buildSystemPrompt(): string {
  return `# Slide Outline Architect

CRITICAL: Your ONLY output is a valid JSON object. No markdown fences, no explanation text, no conversational filler.

## contentPrompt — THE ACTUAL SLIDE TEXT

The contentPrompt field is the body text that appears ON the slide — not a description, not a presenter note. Write it as bullet points or prose. Use specific data, numbers, facts.

WRONG: "Describe the engagement problem"
RIGHT: "Active portal users dropped from 1.2M to 1.06M in 12 months. Mobile app MAU declined 18%. Email open rates fell from 34% to 22%."

## Output Format

Return a JSON object with an "outline" array:

{"outline":[{"slideNumber":1,"title":"Member Engagement Is Down 12% YoY","suggestedLayout":"bullet-list","contentPrompt":"Active portal users dropped from 1.2M to 1.06M in 12 months\\nMobile app MAU declined 18%\\nEmail open rates fell from 34% to 22%","estimatedMinutes":1.5}]}

Each slide: slideNumber, title (insight, not label), suggestedLayout (from layouts below), contentPrompt (actual slide body text, not a description), estimatedMinutes (1-3). No trailing commas, no comments.

## Rules

## Rules

- **No filler.** Never pad with placeholder text. contentPrompt IS the slide body.
- One idea per slide. Cover headlines ≤ 8 words. Body slides ≤ 5 bullet points.
- No 3+ slides of the same type in a row.
- Slides are 1-indexed.
- **Slide 1 MUST be a cover/title slide** — include presentation title, subtitle/context, and presenter info in contentPrompt.
- **Last slide MUST be a closing/thank-you slide** — include call to action, next steps, and "Thank You" in contentPrompt.
- Generic titles like "Introduction", "Overview", "Conclusion" are forbidden.
- **The CPF logo MUST appear on every slide** — green logo (bottom-right) for content slides, white logo (bottom-right) for dark slides (cover, closing).

## Available CPF Layouts

${LAYOUTS.map((l) => `- **${l.name}** (${l.id})`).join("\n")}`;
}

export function buildUserPrompt(briefing: BriefingData): string {
  const arc = NARRATIVE_ARCS.find((a) => a.id === briefing.narrativeArc);

  let prompt = `Create a slide outline for a CPF presentation:

**Objective:** ${fmtId(briefing.objective ?? "")}
**Audience:** ${fmtId(briefing.audience ?? "")}
**Mode:** ${fmtId(briefing.mode ?? "")}
**Key Message:** ${briefing.keyMessage}
**The Ask:** ${briefing.audienceAsk}
**Narrative Arc:** ${arc?.label ?? "None"} → ${arc?.description ?? ""}
**Slide Count:** ${briefing.slideCount ?? 15}

Slide 1 MUST be a cover/title slide. Last slide MUST be a closing/thank-you slide.
Use section dividers between arc phases.
contentPrompt must contain actual slide body text — bullet points or prose. NOT descriptions.
Return ONLY the JSON object. No markdown, no explanation.`;

  if (briefing.additionalContent) {
    prompt += `

## Source Material
Use the following content to write specific slide body text. Extract passages and distribute them across slides. Each contentPrompt must contain real text from this material, not generic instructions:

${briefing.additionalContent.slice(0, 8000)}${briefing.additionalContent.length > 8000 ? "\n...(truncated)" : ""}

Every contentPrompt field should contain actual text from or derived from this source. Do NOT leave generic prompts.`;
  }

  return prompt;
}
