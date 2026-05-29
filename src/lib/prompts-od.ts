import type { BriefingData } from "@/lib/types";
import { OBJECTIVES, AUDIENCES, MODES, NARRATIVE_ARCS } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";

function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

function buildArcSkeleton(): string {
  return NARRATIVE_ARCS.map((arc) => {
    const phases = arc.sequence.map((p, i) => `  Phase ${i + 1}: ${p}`).join("\n");
    return `### ${arc.label} (id: ${arc.id})\n${arc.description}\n${phases}`;
  }).join("\n\n");
}

function buildLayoutGuidance(): string {
  return LAYOUTS.map((l) => {
    const darkLabel = l.dark ? "dark hero" : "light content";
    return `- **${l.name}** (\`${l.id}\`, ${darkLabel}): ${l.description}. Best for: ${l.useCases.join(", ")}. Content slots: ${l.contentSlots.join("; ")}.`;
  }).join("\n");
}

export function buildSystemPrompt(): string {
  return `# Slide Outline Architect

CRITICAL: Your ONLY output is a valid JSON object. No markdown fences, no explanation text, no conversational filler — JUST the JSON object, nothing else.

## Output Format (MUST follow exactly)

You MUST return a JSON object with an "outline" array:

{"outline":[{"slideNumber":1,"title":"$1.2M Ask: AI Career Coach Expansion","suggestedLayout":"cover","contentPrompt":"1. Find Q1 MySkillsFuture engagement data from the portal.\\n2. Compare active learner numbers YoY.\\n3. Note the $1.2M budget ask for Phase 2.","estimatedMinutes":1,"needsDiagram":false,"needsChart":false,"needsData":true,"diagramHint":"","chartHint":""},{"slideNumber":2,"title":"The Opportunity","suggestedLayout":"section-divider","contentPrompt":"1. Introduce Phase 1 and its purpose.\\n2. Set up the problem/opportunity framing.","estimatedMinutes":0.5,"needsDiagram":false,"needsChart":false,"needsData":false,"diagramHint":"","chartHint":""}]}

Each slide object MUST have these fields:
- slideNumber (int, 1-indexed)
- title (string, insight statement, max 8 words)
- suggestedLayout (string, one of the layout IDs listed below)
- contentPrompt (string, NUMBERED LIST format — see rules below)
- estimatedMinutes (number, 0.5–3)
- needsDiagram (boolean)
- needsChart (boolean)
- needsData (boolean)
- needsPlaceholder (boolean)
- diagramHint (string, brief hint if needsDiagram is true, else "")
- chartHint (string, brief hint if needsChart is true, else "")

## Title Quality Rules

Slide titles MUST be insight statements, not generic labels. Max 8 words (~60 characters). The audience should grasp the slide's point at a glance.

Bad: "We Recommend Approving $1.2M to Expand AI Career Coach to Mobile and Singpass by Q3 2026"
Good: "$1.2M Ask: AI Career Coach Expansion" or "Expand Career Coach to Mobile"

Never use: "Overview", "Background", "Introduction", "Summary", "Conclusion" as titles.
Read all titles top-to-bottom — they should read like an executive summary.

## Content Prompt Rules

contentPrompt MUST use a numbered list format for EVERY slide. Put each numbered item on a NEW LINE (use \\n in the JSON string). Every point gets its own line. Do NOT write paragraphs.

Format exactly like: "1. Find Q1 engagement data from the portal.\\n2. Compare participation rates to FY2024.\\n3. Note gaps in low-engagement segments."

If there is only one point, still use "1. " prefix.

## Audience & Mode Awareness

Audiences:
- EXCO / CMM: Be concise and recommendation-first. Content prompts should guide toward strategic framing.
- Department / Working Group: More operational detail is acceptable. Include specific metrics or data to find.
- Public / External: Accessible language, avoid internal jargon.

Modes:
- Presenting: Tighter slides — fewer data points, one key number per slide. Prompts should guide toward visuals.
- Reading: Self-explanatory, more detail. The deck must stand alone without a presenter.

## Flag Fields

Set flag booleans when the AI's content is NOT sufficient and the user should prepare additional material:
- needsDiagram=true → set diagramHint with a 1-line description of the diagram needed (e.g. "Flowchart: member onboarding journey")
- needsChart=true → set chartHint with a 1-line description of the chart needed (e.g. "Bar chart: Q1 vs Q2 engagement by department")
- needsData=true → the slide needs real data that the user must provide from internal sources
- needsPlaceholder=true → the slide needs a placeholder image or visual to fill

Set flags to false when the content prompt alone is sufficient. Do NOT over-flag — only flag where the user truly needs to prepare something external.

## Slide Architecture Rules

1. **One idea per slide.** Two ideas = two slides.
2. **Density:** Cover headlines ≤ 8 words. Body slides ≤ 3 sections.
3. **Theme rhythm:** No 3+ slides of the same layout type in a row. Alternate dark/light where natural.
4. **Slides are 1-indexed.**
5. **Section dividers at narrative breaks.** Insert section-divider layout slides between major arc phases. Section dividers have a short title (3–5 words) and low estimatedMinutes (0.5).

## Narrative Arc Skeletons

Use the selected arc as your structural guide:

${buildArcSkeleton()}

Map your slides to the arc phases. Insert section-divider slides between phases. The cover is before Phase 1; the closing is after the final phase.

## Available CPF Layouts

${buildLayoutGuidance()}

First slide = cover. Last slide = closing (\`closing\`). Use section dividers (\`section-divider\`) between major narrative phases.

## Anti-Slop

- ❌ Generic titles like "Introduction", "Overview", "Conclusion"
- ❌ Invented statistics or market-size claims
- ❌ Three consecutive same-type slides
- ❌ Closing that only says "Thank You"
- ❌ Paragraph-form content prompts — always use numbered list format
- ❌ Over-flagging — only flag when user action is truly needed`;
}

export function buildUserPrompt(briefing: BriefingData): string {
  const arc = NARRATIVE_ARCS.find((a) => a.id === briefing.narrativeArc);
  const audience = AUDIENCES.find((a) => a.id === briefing.audience);
  const mode = MODES.find((m) => m.id === briefing.mode);

  return `Create a slide outline for a CPF presentation:

**Objective:** ${fmtId(briefing.objective ?? "")}
**Audience:** ${audience?.label ?? "Not specified"} — ${audience?.description ?? ""}
**Mode:** ${mode?.label ?? "Not specified"} — ${mode?.description ?? ""}
**Key Message:** ${briefing.keyMessage}
**The Ask:** ${briefing.audienceAsk}
**Slide Count:** target ${briefing.slideCount ?? 15} slides

${arc ? `**Narrative Arc:** ${arc.label}\n${arc.description}\nPhases: ${arc.sequence.join(" → ")}` : "**Narrative Arc:** Not specified"}

${briefing.additionalContent ? `## Additional Content\nThe following was provided by the user as supplementary content. Use it to inform the outline structure and slide content:\n\n${briefing.additionalContent}` : ""}

## Requirements
- First slide = cover, last slide = closing.
- Insert section dividers between major arc phases.
- contentPrompts MUST be numbered lists (use \\n for newlines).
- Set flag fields based on whether the user needs to prepare additional data, charts, or diagrams.
- Title sequence must read as an executive summary.
- Return the JSON object with an "outline" array. No markdown, no explanation.`;
}
