import { describe, it, expect } from "vitest";
import { LAYOUTS, getLayout, layoutsByTheme } from "@/lib/layouts";

const EXPECTED_LAYOUT_IDS = [
  "cover",
  "section-divider",
  "bullet-list",
  "content-image-60-40",
  "image-content-40-60",
  "big-stat",
  "kpi-dashboard",
  "two-column",
  "timeline",
  "quote-testimonial",
  "process-pipeline",
  "data-table",
  "org-chart",
  "sidebar-bullets",
  "full-bleed-image",
  "closing",
];

describe("LAYOUTS", () => {
  it("has exactly 16 layouts", () => {
    expect(LAYOUTS).toHaveLength(16);
  });

  it("contains all expected layout IDs", () => {
    const ids = LAYOUTS.map((l) => l.id);
    for (const expected of EXPECTED_LAYOUT_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = LAYOUTS.map((l) => l.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every layout has required fields", () => {
    for (const layout of LAYOUTS) {
      expect(layout.id).toBeTruthy();
      expect(layout.name).toBeTruthy();
      expect(layout.description).toBeTruthy();
      expect(layout.cssClass).toBeTruthy();
      expect(typeof layout.dark).toBe("boolean");
      expect(Array.isArray(layout.useCases)).toBe(true);
      expect(Array.isArray(layout.contentSlots)).toBe(true);
    }
  });

  it("dark layouts include cover, section-divider, big-stat, quote-testimonial, closing", () => {
    const darkIds = LAYOUTS.filter((l) => l.dark).map((l) => l.id);
    expect(darkIds).toContain("cover");
    expect(darkIds).toContain("section-divider");
    expect(darkIds).toContain("big-stat");
    expect(darkIds).toContain("quote-testimonial");
    expect(darkIds).toContain("closing");
  });
});

describe("getLayout", () => {
  it("returns the correct layout by ID", () => {
    const layout = getLayout("cover");
    expect(layout.id).toBe("cover");
    expect(layout.name).toBe("Cover");
  });

  it("throws for an unknown layout ID", () => {
    expect(() => getLayout("nonexistent" as never)).toThrow("Unknown layout");
  });
});

describe("layoutsByTheme", () => {
  it("separates dark and light layouts", () => {
    const { dark, light } = layoutsByTheme();
    expect(dark.length).toBeGreaterThan(0);
    expect(light.length).toBeGreaterThan(0);
    expect(dark.length + light.length).toBe(16);
  });

  it("all dark layouts have dark=true", () => {
    const { dark } = layoutsByTheme();
    for (const layout of dark) {
      expect(layout.dark).toBe(true);
    }
  });

  it("all light layouts have dark=false", () => {
    const { light } = layoutsByTheme();
    for (const layout of light) {
      expect(layout.dark).toBe(false);
    }
  });
});
