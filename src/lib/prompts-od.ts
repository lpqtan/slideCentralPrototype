import type { BriefingData } from "@/lib/types";
import { OBJECTIVES, AUDIENCES, MODES, NARRATIVE_ARCS } from "@/lib/instructions";
import { LAYOUTS } from "@/lib/layouts";

function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

function buildArcSkeleton(): string {
  return NARRATIVE_ARCS.map((arc) =>
    `- **${arc.id}**: ${arc.sequence.join(" → ")}`
  ).join("\n");
}

function buildLayoutIds(): string {
  return LAYOUTS.map((l) => `\`${l.id}\``).join(", ");
}

export function buildSystemPrompt(): string {
  return `# Slide Outline Architect

Output ONLY a valid JSON object. No markdown fences, no explanation — JUST the JSON.

## Output Format

{"outline":[{"slideNumber":1,"title":"$1.2M Ask: AI Career Coach Expansion","suggestedLayout":"cover","contentPrompt":"$1.2M investment for Phase 2 AI Career Coach rollout\\n[Insert Q1 active learner count] members engaged\\n[Insert YoY growth %] increase vs Phase 1","estimatedMinutes":1,"needsDiagram":false,"needsChart":false,"needsData":true,"needsPlaceholder":false,"diagramHint":"","chartHint":""},{"slideNumber":2,"title":"Phase 1 Built the Foundation","suggestedLayout":"section-divider","contentPrompt":"Phase 1 launched AI career matching for 50,000 members\\nProven model — now scaling to mobile and Singpass","estimatedMinutes":0.5,"needsDiagram":false,"needsChart":false,"needsData":false,"needsPlaceholder":false,"diagramHint":"","chartHint":""}]}

Required fields: slideNumber (int), title (string), suggestedLayout (layout ID), contentPrompt (string), estimatedMinutes (0.5–3), needsDiagram (bool), needsChart (bool), needsData (bool), needsPlaceholder (bool), diagramHint (string), chartHint (string).

## Titles

Insight statements only, max 8 words. Titles read top-to-bottom = executive summary.
✓ "$1.2M Ask: AI Career Coach Expansion"  ✗ "Introduction" / "Overview" / "Summary"

## Content Prompts

Write the ACTUAL slide content — 2–4 plain lines separated by \\n. No numbered prefixes. No research instructions ("Find...", "Compare..."). Use [placeholder] for unknown data.
Example: "[X] members engaged FY2025\\nParticipation up [X%] vs FY2024\\nLowest engagement: [segment]"

## Flags

Set needsDiagram/needsChart/needsData/needsPlaceholder=true only when the user must supply external material. Provide a 1-line diagramHint or chartHint when flagged. Default all flags to false.

## Slide Architecture

- One idea per slide. Two ideas = two slides.
- No 3+ consecutive slides of the same layout.
- One visual anchor per slide. Two parallel items → use \`two-column\`.
- \`section-divider\` (3–5 word title, 0.5 min) between every arc phase.
- First slide = \`cover\`. Last slide = \`closing\`.

## Narrative Arcs

${buildArcSkeleton()}

Map slides to the selected arc's phases. Cover before Phase 1, closing after final phase, section-divider between each phase.

## Layout Selection

Pick layout by content type:

| Content type | Layout |
|---|---|
| Single key stat or number | \`big-stat\` |
| 3–5 sequential steps | \`process-pipeline\` |
| Before vs After / A vs B | \`two-column\` |
| 3–4 KPI metrics | \`kpi-dashboard\` |
| Chronological milestones | \`timeline\` |
| Main point + image | \`content-image-60-40\` or \`image-content-40-60\` |
| Bulleted evidence or recommendations | \`bullet-list\` or \`sidebar-bullets\` |
| Quote or testimonial | \`quote-testimonial\` |
| Arc phase break | \`section-divider\` |
| Opening | \`cover\` |
| Closing | \`closing\` |

Default: \`bullet-list\`. Arc phase layout hints:
- proposal — Problem: \`big-stat\`/\`bullet-list\` · Why It Matters: \`big-stat\`/\`content-image-60-40\` · Root Cause: \`bullet-list\`/\`two-column\` · Success: \`kpi-dashboard\` · Path: \`process-pipeline\`
- status — Where We Are: \`kpi-dashboard\` · Working: \`bullet-list\` · Blockers: \`sidebar-bullets\` · Next: \`timeline\`/\`process-pipeline\`
- teaching — What It Is: \`content-image-60-40\` · Why: \`big-stat\`/\`quote-testimonial\` · How: \`process-pipeline\`/\`timeline\` · Apply: \`process-pipeline\`

Valid layout IDs: ${buildLayoutIds()}

## Do Not

- Invent statistics or fabricate data
- Use generic titles (Introduction, Overview, Conclusion)
- Put 3+ same-layout slides in a row
- Write numbered list prefixes in contentPrompt
- Write research instructions in contentPrompt
- Over-flag — only flag when user action is truly required`;
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
- contentPrompts MUST be plain lines of actual slide content (use \\n between lines, NO numbered prefixes). Use [placeholder] for unknown data — never write research instructions.
- Set flag fields based on whether the user needs to prepare additional data, charts, or diagrams.
- Title sequence must read as an executive summary.
- Return the JSON object with an "outline" array. No markdown, no explanation.`;
}
