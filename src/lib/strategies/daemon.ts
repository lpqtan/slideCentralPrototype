import type { BackendStrategy, StrategyOptions } from "./types";
import type { BriefingData, SlideOutline } from "@/lib/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { extractJson } from "./llm";

const DAEMON_URL = process.env.DAEMON_URL ?? "http://localhost:7456";

interface DaemonAgent {
  id: string;
  name: string;
  available: boolean;
  authStatus: string;
}

interface SseEvent {
  event?: string;
  data?: string;
}

/**
 * Parse an SSE (text/event-stream) response line by line.
 * Yields parsed {event, data} objects.
 */
export async function* parseSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SseEvent> {
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
        // Empty line = end of event
        yield { event: currentEvent, data: currentData };
        currentEvent = "";
        currentData = "";
      }
    }
  }
}

export async function findAgent(): Promise<string> {
  const res = await fetch(`${DAEMON_URL}/api/agents`);
  if (!res.ok) throw new Error(`Daemon returned ${res.status}`);
  const body = (await res.json()) as { agents: DaemonAgent[] };
  const available = (body.agents ?? []).filter(
    (a) => a.available && a.authStatus !== "missing"
  );
  if (available.length === 0) {
    throw new Error(
      "No coding agent available. Install one: Claude Code, Codex CLI, Gemini CLI, or OpenCode."
    );
  }
  return available[0].id;
}

export async function streamChat(
  agentId: string,
  message: string,
  systemPrompt: string
): Promise<string> {
  const res = await fetch(`${DAEMON_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      agentId,
      message,
      systemPrompt,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: { message?: string } })?.error?.message ??
        `Daemon chat failed with ${res.status}`
    );
  }

  if (!res.body) throw new Error("No response body from daemon");

  const reader = res.body.getReader();
  let output = "";
  let error = "";

  for await (const ev of parseSseStream(reader)) {
    if (!ev.data) continue;

    if (ev.event === "error") {
      try {
        const parsed = JSON.parse(ev.data) as { message?: string };
        error = parsed.message ?? "Daemon error";
      } catch {
        error = "Daemon error";
      }
      break;
    }

    if (ev.event === "end") {
      try {
        const parsed = JSON.parse(ev.data) as { status?: string };
        if (parsed.status === "failed") {
          error = "Daemon run failed";
        }
      } catch { /* ignore */ }
      break;
    }

    if (ev.event === "agent") {
      try {
        const parsed = JSON.parse(ev.data) as { type?: string; delta?: string };
        if (parsed.type === "text_delta" && parsed.delta) {
          output += parsed.delta;
        }
      } catch { /* ignore */ }
    }

    if (ev.event === "stdout") {
      try {
        const parsed = JSON.parse(ev.data) as { chunk?: string };
        if (parsed.chunk) output += parsed.chunk;
      } catch { /* ignore */ }
    }
  }

  if (error) throw new Error(error);
  if (!output.trim()) throw new Error("Daemon returned empty output");

  return output;
}

const daemonStrategy: BackendStrategy = {
  id: "daemon",

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${DAEMON_URL}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return false;
      const body = (await res.json()) as { ok?: boolean };
      return body.ok === true;
    } catch {
      return false;
    }
  },

  async generateOutline(
    briefing: BriefingData,
    opts?: StrategyOptions
  ): Promise<SlideOutline[]> {
    const agentId = opts?.provider ?? (await findAgent());
    const systemPrompt =
      buildSystemPrompt() +
      "\n\nIMPORTANT: Return ONLY a JSON array. No markdown, no explanation.";
    const userPrompt = buildUserPrompt(briefing);

    const output = await streamChat(agentId, userPrompt, systemPrompt);
    return extractJson(output);
  },
};

export default daemonStrategy;
