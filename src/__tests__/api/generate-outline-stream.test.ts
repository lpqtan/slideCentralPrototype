import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/generate-outline-stream/route";
import type { BriefingData } from "@/lib/types";

const mockBriefing: BriefingData = {
  objective: "approval",
  audience: "exco",
  mode: "presenting",
  keyMessage: "Member engagement is declining",
  audienceAsk: "Approve the budget",
  narrativeArc: "proposal",
  selectedLayouts: [],
  slideCount: 8,
};

/** Parse SSE events from a ReadableStream response */
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

describe("POST /api/generate-outline-stream", () => {
  it("returns SSE content-type", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing: mockBriefing, strategy: "mock" }),
    });

    const response = await POST(request);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns a complete event with outline for mock strategy", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing: mockBriefing, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const completeEvent = events.find((e) => e.event === "complete");
    expect(completeEvent).toBeDefined();

    const data = completeEvent!.data as { outline: unknown[]; source: { strategy: string } };
    expect(Array.isArray(data.outline)).toBe(true);
    expect(data.outline.length).toBeGreaterThan(0);
    expect(data.source.strategy).toBe("mock");
  });

  it("emits status events during generation", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing: mockBriefing, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const statusEvents = events.filter((e) => e.event === "status");
    expect(statusEvents.length).toBeGreaterThan(0);
  });

  it("emits a prompt event", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing: mockBriefing, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const promptEvent = events.find((e) => e.event === "prompt");
    expect(promptEvent).toBeDefined();

    const data = promptEvent!.data as { systemPrompt: string; userPrompt: string };
    expect(data.systemPrompt).toBeTruthy();
    expect(data.userPrompt).toBeTruthy();
  });

  it("returns error event when briefing is missing", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();

    const data = errorEvent!.data as { message: string };
    expect(data.message).toContain("Missing briefing");
  });

  it("outline slides have required fields", async () => {
    const request = new Request("http://localhost:3000/api/generate-outline-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing: mockBriefing, strategy: "mock" }),
    });

    const response = await POST(request);
    const events = await consumeSse(response);
    const completeEvent = events.find((e) => e.event === "complete");
    const data = completeEvent!.data as { outline: Array<Record<string, unknown>> };

    for (const slide of data.outline) {
      expect(slide).toHaveProperty("slideNumber");
      expect(slide).toHaveProperty("title");
      expect(slide).toHaveProperty("suggestedLayout");
      expect(slide).toHaveProperty("contentPrompt");
      expect(slide).toHaveProperty("estimatedMinutes");
    }
  });
});
