import type { BriefingData } from "@/lib/types";
import { OBJECTIVES, AUDIENCES, MODES, NARRATIVE_ARCS } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";

function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

export function buildSystemPrompt(): string {
  return `# Slide Outline Architect

CRITICAL: Your ONLY output is a valid JSON object. No markdown fences, no explanation text, no conversational filler — JUST the JSON object, nothing else.

## Output Format (MUST follow exactly)

You MUST return a JSON object with an "outline" array:

{"outline":[{"slideNumber":1,"title":"The Opportunity Ahead","suggestedLayout":"cover","contentPrompt":"Describe the context behind the key message","estimatedMinutes":1},{"slideNumber":2,"title":"Our Members Are Telling Us Something","suggestedLayout":"bullet-list","contentPrompt":"Provide supporting data","estimatedMinutes":1.5}]}

- Top-level MUST be an object with an "outline" key
- outline is an array of slide objects
- Each slide: slideNumber (int), title (string), suggestedLayout (string from layouts below), contentPrompt (string), estimatedMinutes (number 1-3)
- Title sequence must read as an executive summary
- No trailing commas, no comments, no markdown

## Content Philosophy

- **No filler.** Never pad with placeholder text, dummy sections, or stat-slop.
- **Real copy only.** If you don't have a specific value, leave an honest placeholder like \`—\` or \`[specific metric here]\`. Never invent statistics.

## Slide Architecture Rules

1. **One idea per slide.** Two ideas = two slides.
2. **Density:** Cover headlines ≤ 8 words. Body slides ≤ 3 sections.
3. **Theme rhythm:** No 3+ slides of the same type in a row.
4. **Slides are 1-indexed.**

## Available CPF Layouts

${LAYOUTS.map((l) => `- **${l.name}** (${l.id}): ${l.description}`).join("\n")}

First slide = cover. Last slide = closing/thank-you.

## Slide Types

- **Cover** — bold statement. Use "cover".
- **Section Divider** — section transition. Use "section-divider".
- **Problem/Body** — 2-3 evidence points. Use "bullet-list".
- **Big Stat** — one number, one caption. Use "big-stat".
- **KPI Dashboard** — 4 metrics. Use "kpi-dashboard".
- **Comparison** — old vs new. Use "two-column".
- **Timeline** — milestones. Use "timeline".
- **Quote** — pull quote. Use "quote-testimonial".
- **Process** — sequential flow. Use "process-pipeline".
- **Closing** — call to action. Use "closing".

## Anti-Slop

- ❌ Generic titles like "Introduction", "Overview", "Conclusion"
- ❌ Invented statistics or market-size claims
- ❌ Three consecutive same-type slides
- ❌ Closing that only says "Thank You"`;
}

export function buildUserPrompt(briefing: BriefingData): string {
  const arc = NARRATIVE_ARCS.find((a) => a.id === briefing.narrativeArc);

  return `Create a slide outline for a CPF presentation:

**Objective:** ${fmtId(briefing.objective ?? "")}
**Audience:** ${fmtId(briefing.audience ?? "")}
**Mode:** ${fmtId(briefing.mode ?? "")}
**Key Message:** ${briefing.keyMessage}
**The Ask:** ${briefing.audienceAsk}
**Narrative Arc:** ${arc?.label ?? "None"} → ${arc?.description ?? ""}
**Slide Count:** ${briefing.slideCount ?? 15}

First slide = cover, last slide = closing. Use section dividers between arc phases.
Return the JSON object with an "outline" array. No markdown, no explanation.`;
}
