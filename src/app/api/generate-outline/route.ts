import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/strategies/registry";
import type { BriefingData, SlideOutline } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      briefing,
      strategy,
      provider,
      apiKey,
      existingOutline,
      lockedSlideNumbers,
      regenerationPrompt,
    } = body as {
      briefing: BriefingData;
      strategy: string;
      provider?: string;
      apiKey?: string;
      existingOutline?: SlideOutline[];
      lockedSlideNumbers?: number[];
      regenerationPrompt?: string;
    };

    if (!briefing) {
      return NextResponse.json({ error: "Missing briefing data" }, { status: 400 });
    }

    const backend = getStrategy(strategy ?? "mock");

    let outline = await backend.generateOutline(briefing, {
      provider,
      apiKey,
    });

    // If regenerating with a prompt, modify the outline slightly
    if (regenerationPrompt && existingOutline) {
      const locked = new Set(lockedSlideNumbers ?? []);
      outline = outline.map((slide) => {
        const existing = existingOutline.find((s) => s.slideNumber === slide.slideNumber);
        if (existing && locked.has(existing.slideNumber)) {
          return existing;
        }
        // Vary the content prompt based on the regeneration prompt
        return {
          ...slide,
          contentPrompt:
            `${slide.contentPrompt} (refined: ${regenerationPrompt.slice(0, 40)}...)`,
        };
      });
    }

    return NextResponse.json({ outline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
