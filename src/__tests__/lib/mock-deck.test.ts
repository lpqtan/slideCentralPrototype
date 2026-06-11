import { describe, it, expect } from "vitest";
import { createMockDeck } from "@/lib/mock-deck";

describe("createMockDeck", () => {
  it("returns a SavedDeck with required fields", () => {
    const deck = createMockDeck();
    expect(deck.id).toBeTruthy();
    expect(deck.name).toBeTruthy();
    expect(deck.createdAt).toBeTypeOf("number");
    expect(deck.updatedAt).toBeTypeOf("number");
    expect(deck.status).toBeTruthy();
  });

  it("has a valid briefing", () => {
    const deck = createMockDeck();
    expect(deck.briefing).toBeTruthy();
    expect(deck.briefing.objective).toBe("approval");
    expect(deck.briefing.audience).toBe("exco");
    expect(deck.briefing.mode).toBe("presenting");
    expect(deck.briefing.keyMessage).toBeTruthy();
    expect(deck.briefing.narrativeArc).toBe("proposal");
  });

  it("has a non-empty outline", () => {
    const deck = createMockDeck();
    expect(deck.outline).not.toBeNull();
    expect(Array.isArray(deck.outline)).toBe(true);
    expect(deck.outline!.length).toBeGreaterThan(0);
  });

  it("has slides with sequential slide numbers", () => {
    const deck = createMockDeck();
    const slides = deck.slides ?? deck.outline;
    expect(slides).not.toBeNull();
    for (let i = 0; i < slides!.length; i++) {
      expect(slides![i].slideNumber).toBe(i + 1);
    }
  });

  it("first slide is a cover layout", () => {
    const deck = createMockDeck();
    const slides = deck.slides ?? deck.outline;
    expect(slides![0].suggestedLayout).toBe("cover");
  });

  it("last slide is a closing layout", () => {
    const deck = createMockDeck();
    const slides = deck.slides ?? deck.outline;
    const last = slides![slides!.length - 1];
    expect(last.suggestedLayout).toBe("closing");
  });

  it("has source metadata", () => {
    const deck = createMockDeck();
    expect(deck.source).not.toBeNull();
    expect(deck.source!.strategy).toBe("mock");
  });

  it("returns a new instance each time", () => {
    const deck1 = createMockDeck();
    const deck2 = createMockDeck();
    // Should be equal in shape but not the same reference
    expect(deck1).not.toBe(deck2);
    expect(deck1.name).toBe(deck2.name);
  });
});
