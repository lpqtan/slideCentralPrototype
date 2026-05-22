import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/strategies/registry";
import { findAgent, streamChat } from "@/lib/strategies/daemon";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import type { BriefingData, SlideOutline, GenerationSource } from "@/lib/types";

function extractJson(text: string): SlideOutline[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("No JSON array found in daemon output");
  }
  try {
    return JSON.parse(jsonMatch[0]) as SlideOutline[];
  } catch {
    const cleaned = jsonMatch[0]
      .replace(/\/\/.*$/gm, "")
      .replace(/,\s*\]/g, "]")
      .replace(/,\s*\}/g, "}");
    return JSON.parse(cleaned) as SlideOutline[];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      briefing,
      strategy,
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
      return NextResponse.json({ error: "Missing briefing data" }, { status: 400 });
    }

    const activeStrategy = strategy ?? "mock";
    let outline: SlideOutline[];
    let rawOutput: string | undefined;
    const source: GenerationSource = {
      strategy: activeStrategy,
      timestamp: Date.now(),
    };

    if (activeStrategy === "daemon") {
      // Use daemon directly to capture raw output
      const agentId = provider ?? (await findAgent());
      source.agent = agentId;
      source.model = model ?? "opencode/big-pickle";
      const systemPrompt =
        buildSystemPrompt() +
        "\n\nIMPORTANT: Return ONLY a JSON array. No markdown, no explanation.";
      const userPrompt = buildUserPrompt(briefing);

      rawOutput = await streamChat(agentId, userPrompt, systemPrompt);
      outline = extractJson(rawOutput);
    } else {
      const backend = getStrategy(activeStrategy);
      outline = await backend.generateOutline(briefing, { provider, apiKey });
    }

    // If regenerating with a prompt, modify the outline
    if (regenerationPrompt && existingOutline) {
      const locked = new Set(lockedSlideNumbers ?? []);
      outline = outline.map((slide) => {
        const existing = existingOutline.find(
          (s) => s.slideNumber === slide.slideNumber
        );
        if (existing && locked.has(existing.slideNumber)) {
          return existing;
        }
        return {
          ...slide,
          contentPrompt:
            activeStrategy === "mock"
              ? `${slide.contentPrompt} (refined: ${regenerationPrompt.slice(0, 40)}...)`
              : slide.contentPrompt,
        };
      });
    }

    source.rawOutput = rawOutput;

    return NextResponse.json({ outline, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
