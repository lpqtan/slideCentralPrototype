import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/export-pptx/route";
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
    title: "Key Points",
    suggestedLayout: "bullet-list",
    contentPrompt: "Point A\nPoint B",
    estimatedMinutes: 2,
    bodyContent: "Finding one\nFinding two",
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

describe("POST /api/export-pptx", () => {
  it("returns a PPTX file with correct content-type", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
  });

  it("returns a Content-Disposition header with filename", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides }),
    });

    const response = await POST(request);
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("presentation.pptx");
  });

  it("returns a non-empty binary body", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides }),
    });

    const response = await POST(request);
    const buffer = await response.arrayBuffer();
    // PPTX files are ZIP archives; minimum size is a few KB
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("PPTX starts with ZIP magic bytes (PK signature)", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides }),
    });

    const response = await POST(request);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // ZIP files start with 0x50 0x4B (PK)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("returns 400 when slides are empty", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("No slides");
  });

  it("returns 400 when slides are missing", async () => {
    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("handles slides with overlay blocks", async () => {
    const overlayBlocks = {
      0: [
        { id: "tb1", text: "Overlay text", x: 50, y: 50, color: "#FFFFFF", bold: true, italic: false },
      ],
    };

    const request = new Request("http://localhost:3000/api/export-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: mockSlides, overlayBlocks }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
