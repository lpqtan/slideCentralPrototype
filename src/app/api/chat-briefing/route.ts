import { callProvider } from "@/lib/strategies/llm";
import { chatOpenCode } from "@/lib/strategies/opencode-direct";
import { buildChatBriefingSystemPrompt, buildChatBriefingUserPrompt } from "@/lib/prompts-chat-briefing";
import { getUserSettings, getAuthTokenFromRequest, verifyAuthToken } from "@/lib/auth";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "openrouter/free";

function extractObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { /* continue */ }
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "{" && depth === 0) { start = i; depth++; }
    else if (cleaned[i] === "{") { depth++; }
    else if (cleaned[i] === "}") { depth--; if (depth === 0 && start !== -1) { end = i + 1; break; } }
  }
  if (start !== -1) {
    const json = end !== -1 ? cleaned.slice(start, end) : cleaned.slice(start);
    try { return JSON.parse(json) as Record<string, unknown>; } catch { /* ignore */ }
  }
  return null;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function sse(ctrl: ReadableStreamDefaultController, event: string, data: unknown) {
    ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  }

  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false;
      request.signal?.addEventListener("abort", () => { aborted = true; });

      try {
        const body = await request.json();
        const { messages, extractOnly, strategy, provider: bodyProvider, apiKey: bodyApiKey } = body as {
          messages: Array<{ role: string; content: string }>;
          extractOnly?: boolean;
          strategy?: string;
          provider?: string;
          apiKey?: string;
        };

        if (!messages?.length) {
          sse(controller, "error", { message: "No messages" });
          controller.close();
          return;
        }

        // Resolve API key: user settings (server-side) > request body > env
        const token = getAuthTokenFromRequest(request);
        const userId = token ? verifyAuthToken(token) : null;
        const userSettings = userId ? await getUserSettings(userId) : null;
        const provider = bodyProvider ?? userSettings?.provider;
        const apiKey = bodyApiKey ?? userSettings?.apiKey;

        const systemPrompt = buildChatBriefingSystemPrompt();
        const userPrompt = buildChatBriefingUserPrompt(messages, extractOnly ?? false);
        let fullText = "";

        // ── Local OpenCode ──────────────────────────
        if (strategy === "opencode-direct") {
          sse(controller, "status", { stage: "calling", message: "Calling opencode/big-pickle locally..." });
          try {
            fullText = await chatOpenCode(userPrompt);
          } catch (err) {
            sse(controller, "error", {
              message: `OpenCode failed: ${err instanceof Error ? err.message : "Unknown"}. Is opencode on your PATH?`,
            });
            controller.close();
            return;
          }
        }

        // ── Direct LLM API ──────────────────────────
        else if (strategy === "llm") {
          const llmProvider = provider ?? "gemini";
          const model = llmProvider === "gemini" ? "gemini-2.5-flash-lite"
            : llmProvider === "gemini-3.5-flash" ? "gemini-3.5-flash"
            : undefined;

          sse(controller, "status", { stage: "calling", message: `Calling ${llmProvider} (${model || "default"})...` });

          try {
            fullText = await callProvider(llmProvider, model, apiKey, systemPrompt, userPrompt);
          } catch (err) {
            sse(controller, "error", {
              message: `${llmProvider} failed: ${err instanceof Error ? err.message : "Unknown"}. Check your API key in AI Settings.`,
            });
            controller.close();
            return;
          }
        }

        // ── Fallback: OpenRouter ─────────────────────
        else {
          const key = apiKey || process.env.OPENROUTER_API_KEY || "";
          if (!key) {
            sse(controller, "error", {
              message: "No API key found. Get a free key at openrouter.ai/keys or switch to Local OpenCode in AI Settings.",
            });
            controller.close();
            return;
          }

          sse(controller, "status", { stage: "calling", message: `Calling OpenRouter (${FALLBACK_MODEL})...` });

          const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              "HTTP-Referer": "http://localhost:3000",
            },
            body: JSON.stringify({
              model: FALLBACK_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.3,
              stream: true,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
            sse(controller, "error", { message: err.error?.message ?? `OpenRouter returned ${res.status}` });
            controller.close();
            return;
          }
          if (!res.body) { sse(controller, "error", { message: "No response body" }); controller.close(); return; }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done || aborted) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6);
              if (json === "[DONE]") break;
              try {
                const ev = JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> };
                const text = ev.choices?.[0]?.delta?.content;
                if (text) {
                  fullText += text;
                  sse(controller, "text_delta", { delta: text });
                }
              } catch { /* skip */ }
            }
          }
        }

        if (!fullText.trim()) {
          sse(controller, "error", { message: "AI returned empty response" });
          controller.close();
          return;
        }

        // Parse response
        sse(controller, "status", { stage: "parsing", message: "Analyzing response..." });
        const parsed = extractObject(fullText);

        if (parsed && parsed.status) {
          sse(controller, "complete", { ...parsed, rawOutput: fullText });
        } else {
          sse(controller, "complete", {
            status: "needs_more",
            message: fullText.slice(0, 300),
            followUpQuestions: [],
            rawOutput: fullText,
          });
        }

        controller.close();
      } catch (error) {
        if (!aborted) {
          sse(controller, "error", { message: error instanceof Error ? error.message : "Unknown error" });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
