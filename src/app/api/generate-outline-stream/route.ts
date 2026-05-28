import { getStrategy } from "@/lib/strategies/registry";
import { findAgent, parseSseStream } from "@/lib/strategies/daemon";
import { streamProvider, extractJson } from "@/lib/strategies/llm";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts-od";
import type { BriefingData, SlideOutline, GenerationSource } from "@/lib/types";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function sse(ctrl: ReadableStreamDefaultController, event: string, data: unknown) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${json}\n\n`));
  }

  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false;
      request.signal?.addEventListener("abort", () => { aborted = true; });

      try {
        const body = await request.json();
        const {
          briefing,
          strategy: strategyId,
          provider,
          apiKey,
          model,
          existingOutline,
          lockedSlideNumbers,
          regenerationPrompt,
        } = body as {
          briefing: BriefingData;
          strategy: string;
          provider?: string;
          apiKey?: string;
          model?: string;
          existingOutline?: SlideOutline[];
          lockedSlideNumbers?: number[];
          regenerationPrompt?: string;
        };

        if (!briefing) {
          sse(controller, "error", { message: "Missing briefing data" });
          controller.close();
          return;
        }

        const activeStrategy = strategyId ?? "mock";
        const source: GenerationSource = { strategy: activeStrategy, timestamp: Date.now() };

        sse(controller, "status", { stage: "connecting", message: `Connecting to ${activeStrategy}...` });

        let outline: SlideOutline[] | undefined;
        let rawOutput: string | undefined;

        // ── Daemon ──────────────────────────────────────
        if (activeStrategy === "daemon") {
          const agentId = provider ?? (await findAgent());
          source.agent = agentId;
          source.model = model ?? "opencode/big-pickle";

          sse(controller, "status", { stage: "generating", message: `Agent '${agentId}' starting with ${source.model}...` });

          const systemPrompt = buildSystemPrompt();

          let userPrompt = buildUserPrompt(briefing);

          // Include regeneration context in the prompt
          if (regenerationPrompt && existingOutline) {
            const locked = new Set(lockedSlideNumbers ?? []);
            const lockedSlides = existingOutline.filter((s) => locked.has(s.slideNumber));

            userPrompt =
              `REFINEMENT REQUEST: ${regenerationPrompt}\n\n` +
              (lockedSlides.length > 0
                ? `The following slides are LOCKED — keep them unchanged:\n` +
                  lockedSlides.map((s) => `${s.slideNumber}. ${s.title}`).join("\n") +
                  `\n\nRegenerate only the UNLOCKED slides. Keep total count at ${existingOutline.length}.\n\n`
                : `Regenerate all slides. Keep total count at ${existingOutline.length}.\n\n`) +
              `Original briefing:\n${buildUserPrompt(briefing)}`;
          }

          const daemonUrl = process.env.DAEMON_URL ?? "http://localhost:7456";
          const res = await fetch(`${daemonUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
            body: JSON.stringify({ agentId, message: userPrompt, systemPrompt, model: source.model }),
          });

          if (!res.ok) throw new Error(`Daemon returned ${res.status}`);
          if (!res.body) throw new Error("No response body from daemon");

          const reader = res.body.getReader();
          let output = "";
          let agentError = "";

          for await (const ev of parseSseStream(reader)) {
            if (aborted) break;
            if (!ev.data) continue;

            if (ev.event === "agent") {
              try {
                const p = JSON.parse(ev.data) as { type?: string; delta?: string; label?: string };
                if (p.type === "status" && p.label) {
                  sse(controller, "status", { stage: "generating", message: p.label });
                }
                if (p.type === "text_delta" && p.delta) {
                  output += p.delta;
                  sse(controller, "text_delta", { delta: p.delta });
                }
              } catch { /* skip corrupt frames */ }
            }

            if (ev.event === "stdout") {
              try {
                const p = JSON.parse(ev.data) as { chunk?: string };
                if (p.chunk) {
                  output += p.chunk;
                  sse(controller, "text_delta", { delta: p.chunk });
                }
              } catch { /* skip */ }
            }

            if (ev.event === "error") {
              try {
                agentError = (JSON.parse(ev.data) as { message?: string }).message ?? "Daemon error";
              } catch {
                agentError = "Daemon error";
              }
              break;
            }

            if (ev.event === "end") break;
          }

          if (agentError) throw new Error(agentError);
          if (!output.trim()) throw new Error("Daemon returned empty output");
          rawOutput = output;

          sse(controller, "status", { stage: "parsing", message: "Parsing outline..." });
          outline = extractJson(rawOutput);

          // Merge locked slides for regeneration
          if (regenerationPrompt && existingOutline) {
            const locked = new Set(lockedSlideNumbers ?? []);
            outline = outline.map((slide) => {
              const existing = existingOutline.find((s) => s.slideNumber === slide.slideNumber);
              if (existing && locked.has(existing.slideNumber)) return existing;
              return slide;
            });
          }
        }

        // ── Daemon ──────────────────────────────────────
        if (activeStrategy === "daemon") {
          // ... (unchanged)
        }

        // ── LLM API ─────────────────────────────────────
        else if (activeStrategy === "llm") {
          const llmProvider = provider ?? "gemini";
          source.agent = llmProvider;
          source.model = model;

          sse(controller, "status", { stage: "generating", message: `Calling ${llmProvider} API...` });

          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildUserPrompt(briefing);

          let output = "";
          let streamFailed = false;

          try {
            for await (const ev of streamProvider(
              llmProvider,
              model,
              apiKey,
              systemPrompt,
              userPrompt
            )) {
              if (aborted) break;
              if (ev.type === "text") {
                output += ev.text;
                sse(controller, "text_delta", { delta: ev.text });
              }
              if (ev.type === "error") throw new Error(ev.message);
            }
          } catch {
            streamFailed = true;
          }

          if (streamFailed || !output.trim()) {
            // Fallback to non-streaming
            const backend = getStrategy(activeStrategy);
            outline = await backend.generateOutline(briefing, { provider, apiKey, model });
            source.agent = provider ?? "gemini";
            sse(controller, "complete", { outline, source });
            controller.close();
            return;
          }

          rawOutput = output;
          sse(controller, "status", { stage: "parsing", message: "Parsing outline..." });
          outline = extractJson(rawOutput);
        }

        // ── Mock / Other ───────────────────────────────
        else {
          for (let i = 1; i <= 4; i++) {
            if (aborted) break;
            await new Promise((r) => setTimeout(r, 200));
            sse(controller, "status", { stage: "generating", message: `Thinking... (${i * 25}%)` });
          }

          const backend = getStrategy(activeStrategy);
          outline = await backend.generateOutline(briefing, { provider, apiKey });

          if (regenerationPrompt && existingOutline) {
            sse(controller, "status", { stage: "parsing", message: "Applying refinement..." });
            const locked = new Set(lockedSlideNumbers ?? []);
            outline = outline.map((slide) => {
              const existing = existingOutline.find((s) => s.slideNumber === slide.slideNumber);
              if (existing && locked.has(existing.slideNumber)) return existing;
              return {
                ...slide,
                contentPrompt: `${slide.contentPrompt} (refined: ${regenerationPrompt.slice(0, 40)}...)`,
              };
            });
          }
        }

        if (!outline) {
          throw new Error("No outline generated");
        }

        source.rawOutput = rawOutput;
        sse(controller, "complete", { outline, source });
        controller.close();
      } catch (error) {
        if (!aborted) {
          sse(controller, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
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
