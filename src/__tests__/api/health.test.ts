import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/health/route";

describe("POST /api/health", () => {
  it("returns healthy=true for mock strategy", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: "mock" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { healthy: boolean };
    expect(body.healthy).toBe(true);
  });

  it("returns healthy=false for daemon strategy (no daemon running)", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: "daemon" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { healthy: boolean };
    // Daemon isn't running in test environment
    expect(body.healthy).toBe(false);
  });

  it("returns healthy=false for unknown strategy", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: "nonexistent" }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { healthy: boolean };
    expect(body.healthy).toBe(false);
  });

  it("defaults to mock strategy when none specified", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = (await response.json()) as { healthy: boolean };
    expect(body.healthy).toBe(true);
  });
});
