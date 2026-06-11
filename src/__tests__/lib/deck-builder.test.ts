import { describe, it, expect } from "vitest";
import { buildDeckHtml } from "@/lib/deck-builder";
import type { SlideContent } from "@/lib/types";

function makeSlide(overrides: Partial<SlideContent> = {}): SlideContent {
  return {
    slideNumber: 1,
    title: "Test Slide",
    suggestedLayout: "bullet-list",
    contentPrompt: "Point one\nPoint two\nPoint three",
    estimatedMinutes: 1.5,
    bodyContent: "First point\nSecond point\nThird point",
    ...overrides,
  };
}

describe("buildDeckHtml", () => {
  it("returns valid HTML with doctype", () => {
    const html = buildDeckHtml([makeSlide()]);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
  });

  it("contains the slide title", () => {
    const html = buildDeckHtml([makeSlide({ title: "My Custom Title" })]);
    expect(html).toContain("My Custom Title");
  });

  it("renders the correct number of slide sections", () => {
    const slides = [
      makeSlide({ slideNumber: 1 }),
      makeSlide({ slideNumber: 2, title: "Second Slide" }),
      makeSlide({ slideNumber: 3, title: "Third Slide" }),
    ];
    const html = buildDeckHtml(slides);
    // Each slide is a <section> with data-slide attribute
    const slideCount = (html.match(/<section[^>]*data-slide="/g) || []).length;
    expect(slideCount).toBe(3);
  });

  it("first slide has the 'active' class when it is a cover layout", () => {
    const html = buildDeckHtml([
      makeSlide({ slideNumber: 1, suggestedLayout: "cover", title: "Cover" }),
      makeSlide({ slideNumber: 2, title: "Second" }),
    ]);
    // The cover layout hardcodes 'active' in the first section's class attribute
    expect(html).toMatch(/<section[^>]*class="[^"]*active[^"]*"[^>]*data-slide="1"/);
  });

  it("non-cover first slide gets active via JS (not in static HTML)", () => {
    const html = buildDeckHtml([
      makeSlide({ slideNumber: 1, suggestedLayout: "bullet-list" }),
    ]);
    // The runtime script adds 'active' to slides[0] — it's not in the static HTML
    // for non-cover layouts. Verify the JS bootstrap is present.
    expect(html).toContain("slides[0].classList.add('active')");
  });

  it("includes keyboard navigation script", () => {
    const html = buildDeckHtml([makeSlide()]);
    expect(html).toContain("ArrowRight");
    expect(html).toContain("ArrowLeft");
  });

  it("handles cover layout", () => {
    const html = buildDeckHtml([makeSlide({ suggestedLayout: "cover", title: "Cover Title" })]);
    expect(html).toContain("cover");
    expect(html).toContain("Cover Title");
  });

  it("handles closing layout", () => {
    const html = buildDeckHtml([makeSlide({ suggestedLayout: "closing", title: "Thank You" })]);
    expect(html).toContain("closing");
    expect(html).toContain("Thank You");
  });

  it("handles kpi-dashboard layout", () => {
    const slide = makeSlide({
      suggestedLayout: "kpi-dashboard",
      title: "KPI Dashboard",
      bodyContent: "1.2M: Active Members | +12%\n87%: Satisfaction | +5%\n34%: Email Opens | -8%\n$500k: Budget Used | 60%",
    });
    const html = buildDeckHtml([slide]);
    expect(html).toContain("kpi");
  });

  it("handles big-stat layout", () => {
    const slide = makeSlide({
      suggestedLayout: "big-stat",
      title: "87%",
      bodyContent: "",
    });
    const html = buildDeckHtml([slide]);
    expect(html).toContain("87%");
  });

  it("escapes HTML special characters in titles", () => {
    const html = buildDeckHtml([makeSlide({ title: "Test <script>alert('xss')</script>" })]);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders body content lines", () => {
    const html = buildDeckHtml([makeSlide({ bodyContent: "Line alpha\nLine beta\nLine gamma" })]);
    expect(html).toContain("Line alpha");
    expect(html).toContain("Line beta");
    expect(html).toContain("Line gamma");
  });

  it("handles empty slides array gracefully", () => {
    const html = buildDeckHtml([]);
    // Should still return valid HTML structure
    expect(html).toContain("<!doctype html>");
  });

  it("handles slides with empty body content", () => {
    const html = buildDeckHtml([makeSlide({ bodyContent: "" })]);
    expect(html).toContain("<!doctype html>");
  });
});
