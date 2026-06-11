import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts-od";
import type { BriefingData } from "@/lib/types";

const mockBriefing: BriefingData = {
  objective: "approval",
  audience: "exco",
  mode: "presenting",
  keyMessage: "We need $1M for digital outreach",
  audienceAsk: "Approve the budget by end of quarter",
  narrativeArc: "proposal",
  selectedLayouts: [],
  slideCount: 12,
  additionalContent: "",
};

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const result = buildSystemPrompt();
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("contains the output format instructions", () => {
    const result = buildSystemPrompt();
    expect(result).toContain("slideNumber");
    expect(result).toContain("suggestedLayout");
    expect(result).toContain("contentPrompt");
    expect(result).toContain("estimatedMinutes");
  });

  it("contains all 16 layout IDs", () => {
    const result = buildSystemPrompt();
    const layoutIds = [
      "cover", "section-divider", "bullet-list", "content-image-60-40",
      "image-content-40-60", "big-stat", "kpi-dashboard", "two-column",
      "timeline", "quote-testimonial", "process-pipeline", "data-table",
      "org-chart", "sidebar-bullets", "full-bleed-image", "closing",
    ];
    for (const id of layoutIds) {
      expect(result).toContain(id);
    }
  });

  it("includes daemon personality when strategy is daemon", () => {
    const result = buildSystemPrompt("daemon", "opencode", "opencode/big-pickle");
    expect(result).toContain("Creative Mandate");
  });

  it("includes llm/gemini personality when strategy is llm with gemini provider", () => {
    const result = buildSystemPrompt("llm", "gemini", undefined);
    expect(result).toContain("analytical");
  });

  it("includes llm/groq personality when strategy is llm with groq provider", () => {
    const result = buildSystemPrompt("llm", "groq", undefined);
    expect(result).toContain("concise");
  });

  it("includes llm/openrouter personality", () => {
    const result = buildSystemPrompt("llm", "openrouter", undefined);
    expect(result).toContain("balanced");
  });

  it("returns no extra personality for unknown strategy", () => {
    const base = buildSystemPrompt();
    const unknown = buildSystemPrompt("unknown-strategy");
    // Both should end the same way (no personality appended)
    expect(base).toBe(unknown);
  });
});

describe("buildUserPrompt", () => {
  it("returns a non-empty string", () => {
    const result = buildUserPrompt(mockBriefing);
    expect(result).toBeTruthy();
  });

  it("includes the key message", () => {
    const result = buildUserPrompt(mockBriefing);
    expect(result).toContain("We need $1M for digital outreach");
  });

  it("includes the audience ask", () => {
    const result = buildUserPrompt(mockBriefing);
    expect(result).toContain("Approve the budget by end of quarter");
  });

  it("includes the slide count", () => {
    const result = buildUserPrompt(mockBriefing);
    expect(result).toContain("12");
  });

  it("includes narrative arc info when set", () => {
    const result = buildUserPrompt(mockBriefing);
    // The proposal arc should be mentioned
    expect(result).toContain("Narrative Arc");
  });

  it("handles missing narrative arc", () => {
    const briefing = { ...mockBriefing, narrativeArc: null };
    const result = buildUserPrompt(briefing);
    expect(result).toContain("Not specified");
  });

  it("includes additional content when provided", () => {
    const briefing = { ...mockBriefing, additionalContent: "Budget breakdown: $500k Q3, $500k Q4" };
    const result = buildUserPrompt(briefing);
    expect(result).toContain("Budget breakdown");
  });

  it("does not include additional content section when empty", () => {
    const briefing = { ...mockBriefing, additionalContent: "" };
    const result = buildUserPrompt(briefing);
    expect(result).not.toContain("Additional Content");
  });

  it("handles null/missing objective gracefully", () => {
    const briefing = { ...mockBriefing, objective: null };
    // Should not throw
    const result = buildUserPrompt(briefing);
    expect(result).toBeTruthy();
  });
});
