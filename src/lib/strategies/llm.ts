import type { BackendStrategy, StrategyOptions } from "./types";
import type { BriefingData, SlideOutline } from "@/lib/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts-od";
import { STORAGE_KEYS } from "@/lib/constants";

interface ProviderConfig {
  baseUrl: string;
  apiVersion?: string;
  model: string;
  jsonMode: boolean;
  streaming: boolean;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com",
    apiVersion: "v1beta",
    model: "gemini-2.5-flash-lite",
    jsonMode: true,
    streaming: true,
  },
  "gemini-3.5-flash": {
    baseUrl: "https://generativelanguage.googleapis.com",
    apiVersion: "v1beta",
    model: "gemini-3.5-flash",
    jsonMode: true,
    streaming: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai",
    apiVersion: "v1",
    model: "llama-3.3-70b",
    jsonMode: true,
    streaming: true,
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api",
    apiVersion: "v1",
    model: "openrouter/free",
    jsonMode: false,
    streaming: true,
  },
  openai: {
    baseUrl: "https://api.openai.com",
    apiVersion: "v1",
    model: "gpt-4o-mini",
    jsonMode: true,
    streaming: true,
  },
};

export function extractJson(text: string): SlideOutline[] {
  const raw = extractRawJson(text);
  return normalizeOutlines(raw);
}

function extractRawJson(text: string): SlideOutline[] {
  let cleaned = text
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Handle opencode NDJSON streaming output (--format json)
  // Each line is a separate JSON event: {"type":"text","part":{"text":"{\"outline\":[...]}"}}
  const lines = cleaned.split("\n");
  for (const line of lines) {
    try {
      const ev = JSON.parse(line) as Record<string, unknown>;
      if (ev.type === "text" && ev.part && typeof ev.part === "object") {
        const part = ev.part as Record<string, unknown>;
        if (typeof part.text === "string") {
          const innerJson = JSON.parse(part.text) as { outline?: SlideOutline[] } | SlideOutline[];
          if (Array.isArray(innerJson)) return innerJson;
          if (innerJson.outline && Array.isArray(innerJson.outline)) return innerJson.outline;
        }
      }
    } catch { /* not a JSON line, continue */ }
  }

  // Unwrap opencode --format json envelope (e.g. {"output":"...","error":""})
  try {
    const wrapper = JSON.parse(cleaned) as Record<string, unknown>;
    const inner = wrapper.output ?? wrapper.content ?? wrapper.text ?? wrapper.result;
    if (typeof inner === "string" && inner.trim()) {
      cleaned = inner.trim();
    }
  } catch { /* not a JSON wrapper, continue */ }

  // Skip text prefix before first JSON character
  const jsonStart = cleaned.search(/[{[]/);
  const jsonText = jsonStart >= 0 ? cleaned.slice(jsonStart) : cleaned;

  // Try direct parse first (handles { "outline": [...] } or bare [...])
  try {
    const parsed = JSON.parse(jsonText) as { outline?: SlideOutline[] } | SlideOutline[];
    if (Array.isArray(parsed)) return parsed;
    if (parsed.outline && Array.isArray(parsed.outline)) return parsed.outline;
  } catch { /* continue */ }

  // Find first balanced JSON array
  let depth = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < jsonText.length; i++) {
    if (jsonText[i] === "[" && depth === 0) {
      if (start === -1) start = i;
      depth++;
    } else if (jsonText[i] === "[") {
      depth++;
    } else if (jsonText[i] === "]") {
      depth--;
      if (depth === 0 && start !== -1) {
        end = i + 1;
        break;
      }
    }
  }

  if (start === -1) throw new Error("No JSON array found in LLM output");
  const json = end !== -1 ? jsonText.slice(start, end) : jsonText.slice(start);

  try {
    return JSON.parse(json) as SlideOutline[];
  } catch {
    const retry = json
      .replace(/\/\/.*$/gm, "")
      .replace(/,\s*\]/g, "]")
      .replace(/,\s*\}/g, "}");
    return JSON.parse(retry) as SlideOutline[];
  }
}

export function normalizeOutlines(outlines: unknown[]): SlideOutline[] {
  return outlines.map((s) => {
    const item = s as Record<string, unknown>;
    return {
      slideNumber: Number(item.slideNumber ?? 0),
      title: String(item.title ?? ""),
      suggestedLayout: (typeof item.suggestedLayout === "string" ? item.suggestedLayout : "bullet-list") as SlideOutline["suggestedLayout"],
      bodyContent: String(item.bodyContent ?? ""),
      contentPrompt: typeof item.contentPrompt === "string" ? item.contentPrompt : undefined,
      estimatedMinutes: Number(item.estimatedMinutes ?? 1),
      needsDiagram: Boolean(item.needsDiagram),
      needsChart: Boolean(item.needsChart),
      needsData: Boolean(item.needsData),
      needsPlaceholder: Boolean(item.needsPlaceholder),
      diagramHint: typeof item.diagramHint === "string" ? item.diagramHint : undefined,
      chartHint: typeof item.chartHint === "string" ? item.chartHint : undefined,
    };
  });
}

export async function callProvider(
  provider: string,
  model: string | undefined,
  apiKey: string | undefined,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const effectiveModel = model || config.model;
  const envKey = provider.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const key = apiKey || process.env[`${envKey}_API_KEY`] || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error(`No API key for ${provider}. Set it in AI Settings.`);

  if (provider === "gemini" || provider === "gemini-3.5-flash" || provider.startsWith("gemini")) {
    const url = `${config.baseUrl}/${config.apiVersion}/models/${effectiveModel}:generateContent?key=${key}`;
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    };
    if (config.jsonMode) {
      body.generationConfig = {
        responseMimeType: "application/json",
        temperature: 0.4,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (data.error) throw new Error(data.error.message ?? "Gemini error");
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Gemini returned empty response");
    }
    return data.candidates[0].content.parts[0].text;
  }

  // OpenAI-compatible providers
  const url = `${config.baseUrl}/${config.apiVersion}/chat/completions`;
  const body: Record<string, unknown> = {
    model: effectiveModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  };

  if (config.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string; code?: string } };
    throw new Error(err.error?.message ?? `${provider} returned ${res.status}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

export async function* streamProvider(
  provider: string,
  model: string | undefined,
  apiKey: string | undefined,
  systemPrompt: string,
  userPrompt: string
): AsyncGenerator<{ type: "text"; text: string } | { type: "error"; message: string }> {
  const config = PROVIDERS[provider];
  if (!config) {
    yield { type: "error", message: `Unknown provider: ${provider}` };
    return;
  }

  const effectiveModel = model || config.model;
  const envKey = provider.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const key = apiKey || process.env[`${envKey}_API_KEY`] || process.env.GEMINI_API_KEY || "";

  if (provider === "gemini" || provider === "gemini-3.5-flash" || provider.startsWith("gemini")) {
    const url = `${config.baseUrl}/${config.apiVersion}/models/${effectiveModel}:streamGenerateContent?alt=sse&key=${key}`;
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    };
    if (config.jsonMode) {
      body.generationConfig = {
        responseMimeType: "application/json",
        temperature: 0.4,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      yield { type: "error", message: `Gemini returned ${res.status}` };
      return;
    }
    if (!res.body) {
      yield { type: "error", message: "No response body" };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6);
        if (json === "[DONE]") break;
        try {
          const ev = JSON.parse(json) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = ev.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield { type: "text", text };
          }
        } catch { /* skip corrupt SSE chunks */ }
      }
    }
    return;
  }

  // OpenAI-compatible streaming
  const url = `${config.baseUrl}/${config.apiVersion}/chat/completions`;
  const body: Record<string, unknown> = {
    model: effectiveModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    stream: true,
  };
  if (config.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    yield { type: "error", message: `${provider} returned ${res.status}` };
    return;
  }
  if (!res.body) {
    yield { type: "error", message: "No response body" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6);
      if (json === "[DONE]") break;
      try {
        const ev = JSON.parse(json) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const text = ev.choices?.[0]?.delta?.content;
        if (text) {
          yield { type: "text", text };
        }
      } catch { /* skip corrupt SSE chunks */ }
    }
  }
}

const llmStrategy: BackendStrategy = {
  id: "llm",

  async healthCheck(): Promise<boolean> {
    // Check if any provider key is set
    const providers = ["gemini", "groq", "openrouter", "openai"];
    for (const p of providers) {
      if (process.env[`${p.toUpperCase()}_API_KEY`]) return true;
    }
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEYS.SETTINGS) : null;
      if (raw) {
        const s = JSON.parse(raw) as { apiKey?: string };
        if (s.apiKey) return true;
      }
    } catch { /* ignore */ }
    return false;
  },

  async generateOutline(
    briefing: BriefingData,
    opts?: StrategyOptions
  ): Promise<SlideOutline[]> {
    const provider = opts?.provider ?? "gemini";
    const sys = buildSystemPrompt();
    const usr = buildUserPrompt(briefing);
    const output = await callProvider(provider, opts?.model, opts?.apiKey, sys, usr);
    return extractJson(output);
  },
};

export default llmStrategy;
