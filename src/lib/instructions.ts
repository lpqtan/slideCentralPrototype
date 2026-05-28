// Slide-creation principles from corporate-template-main/instructions.md
// Used for prompt assembly and in-app guidance

export const OBJECTIVES = [
  { id: "approval", label: "Approval", description: "Seek formal sign-off on a recommendation or plan", icon: "✓" },
  { id: "guidance", label: "Guidance", description: "Get directional input before committing resources", icon: "↗" },
  { id: "showcase", label: "Showcase", description: "Demonstrate progress, results, or capabilities", icon: "◉" },
  { id: "teaching", label: "Teaching", description: "Educate the audience on a topic or skill", icon: "☉" },
  { id: "agreement", label: "Agreement on Follow-ups", description: "Align on next steps and owners", icon: "⇄" },
] as const;

export const AUDIENCES = [
  { id: "exco", label: "EXCO", description: "Executive Committee — approve, steer, decide" },
  { id: "cmm", label: "CMM", description: "Corporate Management Meeting — structured, formal" },
  { id: "department", label: "Department Meeting", description: "Team-level — informal, collaborative" },
  { id: "working-group", label: "Working Group", description: "Cross-functional — deep-dive, problem-solving" },
  { id: "public", label: "Public / External", description: "Partners, members, or public audience" },
] as const;

export const MODES = [
  { id: "presenting", label: "Presenting", description: "Concise slides, 1–2 min per slide, speaker-led" },
  { id: "reading", label: "Reading", description: "Detailed, self-explanatory, optimised for skimming" },
] as const;

export const NARRATIVE_ARCS = [
  {
    id: "proposal",
    label: "Proposal Arc",
    description: "Problem/opportunity → why it matters → root cause → what success looks like → what gets us there",
    sequence: [
      "Problem or Opportunity",
      "Why It Matters",
      "Root Cause",
      "What Success Looks Like",
      "What Gets Us There",
    ],
  },
  {
    id: "status",
    label: "Status Arc",
    description: "Where we are → what's working → blockers → next steps",
    sequence: [
      "Where We Are",
      "What's Working",
      "Blockers",
      "Next Steps",
    ],
  },
  {
    id: "teaching",
    label: "Teaching Arc",
    description: "What it is → why it matters → how it works → how to apply it",
    sequence: [
      "What It Is",
      "Why It Matters",
      "How It Works",
      "How to Apply It",
    ],
  },
] as const;

/** Look up a human-readable label for any instruction ID */
export function fmtId(id: string): string {
  const items = [...OBJECTIVES, ...AUDIENCES, ...MODES, ...NARRATIVE_ARCS] as Array<{ id: string; label: string }>;
  return items.find((i) => i.id === id)?.label ?? id;
}

/** Core content principles used in prompts */
export const CONTENT_PRINCIPLES = {
  /** Slide titles are the spine */
  titlesAsSpine:
    "Each title states an insight, not a label. Read top-to-bottom, titles should read like an executive summary.",
  /** One idea per slide */
  oneIdea:
    "Every slide makes one point. The title is that point; everything below it is evidence.",
  /** Numbered lists, not bullets */
  numberedLists:
    "Use numbered lists throughout. Sub-numbering (1a, 1b) for nested points so every line has a unique address.",
  /** Open with the answer */
  openWithAnswer:
    "Open with the answer, not the buildup. Senior audiences want the recommendation first; the rationale follows.",
  /** Density */
  density: "Aim for 1–2 minutes per slide for presentations. Move supporting detail to appendices.",
  /** House style */
  houseStyle: {
    language: "British English",
    acronyms: "Explain on first use",
    slideNumbers: "Always show slide numbers with total pages (7 / 24)",
    numbers: "Right-align in tables, use thousands separators (1,000)",
    currency: "Explicit: S$2.4m, not 2.4m",
  },
} as const;
