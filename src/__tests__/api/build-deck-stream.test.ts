import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/build-deck-stream/route";
import type { SlideContent } from "@/lib/types";

const mockSlides: SlideContent[] = [
  {
    slideNumber: 1,
    title: "Cover Slide",
    suggestedLayout: "cover",
    contentPrompt: "",
    estimatedMinutes: 1,
    bodyContent: "CPF Presentation\nQuarterly Review",
  },
  {
    slideNumber: 2,
    title: "Key Finding",
    suggestedLayout: "bullet-list",
    contentPrompt: "Point A\nPoint B\nPoint C",
    estimatedMinutes: 2,
    bodyContent: "Finding one\nFinding two\nFinding three",
  },
  {
    slideNumber: 3,
    title: "Thank You",
    suggestedLayout: "closing",
    contentPrompt: "",
    estimatedMinutes: 0.5,
    bodyContent: "",
  },
];

async function consumeSse(response: Response): Promise<Array<{ event: string; data: unknown }>> {
  const events: Array<{ event: string; data: unknown }> = [];
  const reader = response.body?.getReader();
  if (!reader) return events;

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let currentData = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        currentData = line.slice(6);
      } else if (line === "" && currentData) {
        try {
          events.push({ event: currentEvent, data: JSON.parse(currentData) });
        } catch {
          events.push({ event: currentEvent, data: currentData });
        }
        currentEvent = "";
        currentData = "";
      }
    }
  }

  return events;
}

describe("POST /api/build-deck-stream", () => {
  it("returns SSE content-type", async () => {
    const request = new Request("http://localhost:3000/api/build-deck-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides, strategy: "mock" }),
    });

    const response = await POST(request);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns complete event with HTML for non-daemon strategy", async () => {
    const request = new Request("http://localhost:3000/api/build-deck-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides, strategy: "llm" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const completeEvent = events.find((e) => e.event === "complete");
    expect(completeEvent).toBeDefined();

    const data = completeEvent!.data as { html: string; elapsed: number };
    expect(data.html).toContain("<!doctype html>");
    expect(data.html).toContain("Cover Slide");
    expect(typeof data.elapsed).toBe("number");
  });

  it("generated HTML contains all slide titles", async () => {
    const request = new Request("http://localhost:3000/api/build-deck-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);
    const completeEvent = events.find((e) => e.event === "complete");
    const data = completeEvent!.data as { html: string };

    expect(data.html).toContain("Cover Slide");
    expect(data.html).toContain("Key Finding");
    expect(data.html).toContain("Thank You");
  });

  it("returns error event when slides are empty", async () => {
    const request = new Request("http://localhost:3000/api/build-deck-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: [], strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();

    const data = errorEvent!.data as { message: string };
    expect(data.message).toContain("No slides");
  });

  it("emits status events during building", async () => {
    const request = new Request("http://localhost:3000/api/build-deck-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const statusEvents = events.filter((e) => e.event === "status");
    expect(statusEvents.length).toBeGreaterThan(0);
  });
});
