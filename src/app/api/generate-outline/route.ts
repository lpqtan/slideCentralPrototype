import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/strategies/registry";
import type { BriefingData } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { briefing, strategy, provider, apiKey } = body as {
      briefing: BriefingData;
      strategy: string;
      provider?: string;
      apiKey?: string;
    };

    if (!briefing) {
      return NextResponse.json({ error: "Missing briefing data" }, { status: 400 });
    }

    const backend = getStrategy(strategy ?? "mock");

    const outline = await backend.generateOutline(briefing, {
      provider,
      apiKey,
    });

    return NextResponse.json({ outline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
