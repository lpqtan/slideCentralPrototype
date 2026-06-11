import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/strategies/llm";

describe("extractJson", () => {
  const validSlide = {
    slideNumber: 1,
    title: "Test Slide",
    suggestedLayout: "cover",
    contentPrompt: "",
    estimatedMinutes: 1,
  };

  it("parses a bare JSON array", () => {
    const input = JSON.stringify([validSlide]);
    const result = extractJson(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Slide");
  });

  it("parses a { outline: [...] } wrapper", () => {
    const input = JSON.stringify({ outline: [validSlide, { ...validSlide, slideNumber: 2 }] });
    const result = extractJson(input);
    expect(result).toHaveLength(2);
    expect(result[0].slideNumber).toBe(1);
    expect(result[1].slideNumber).toBe(2);
  });

  it("parses JSON wrapped in markdown fences", () => {
    const input = "```json\n" + JSON.stringify({ outline: [validSlide] }) + "\n```";
    const result = extractJson(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Slide");
  });

  it("parses JSON with text prefix before the array", () => {
    const input = "Here is the outline:\n\n" + JSON.stringify([validSlide]);
    const result = extractJson(input);
    expect(result).toHaveLength(1);
  });

  it("parses an { output: '...' } envelope (opencode wrapper)", () => {
    const inner = JSON.stringify({ outline: [validSlide] });
    const input = JSON.stringify({ output: inner });
    const result = extractJson(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Slide");
  });

  it("parses NDJSON streaming output", () => {
    const inner = JSON.stringify({ outline: [validSlide] });
    const line = JSON.stringify({ type: "text", part: { text: inner } });
    const result = extractJson(line);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Slide");
  });

  it("handles JSON with trailing commas", () => {
    const input = '[{"slideNumber":1,"title":"Test","suggestedLayout":"cover","contentPrompt":"","estimatedMinutes":1,}]';
    const result = extractJson(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test");
  });

  it("throws on empty input", () => {
    expect(() => extractJson("")).toThrow();
  });

  it("throws on input with no JSON array", () => {
    expect(() => extractJson("This is just plain text with no JSON.")).toThrow();
  });

  it("parses multiple slides correctly", () => {
    const slides = Array.from({ length: 10 }, (_, i) => ({
      ...validSlide,
      slideNumber: i + 1,
      title: `Slide ${i + 1}`,
    }));
    const input = JSON.stringify({ outline: slides });
    const result = extractJson(input);
    expect(result).toHaveLength(10);
    expect(result[9].title).toBe("Slide 10");
  });

  it("preserves all slide fields", () => {
    const slide = {
      slideNumber: 1,
      title: "Full Slide",
      suggestedLayout: "kpi-dashboard",
      contentPrompt: "Some content\nwith newlines",
      estimatedMinutes: 2.5,
      needsDiagram: true,
      needsChart: false,
      needsData: true,
      needsPlaceholder: false,
      diagramHint: "org chart",
      chartHint: "",
    };
    const result = extractJson(JSON.stringify([slide]));
    expect(result[0]).toMatchObject(slide);
  });
});
