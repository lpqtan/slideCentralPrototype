import { NextResponse } from "next/server";
import { findAgent, streamChat } from "@/lib/strategies/daemon";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireAuth(request);

    const body = await request.json();
    const { agentId } = body as { agentId?: string };

    const start = Date.now();
    const agent = agentId ?? (await findAgent());

    const systemPrompt =
      "You are a presentation assistant. Keep your response brief and to the point.";

    const userPrompt =
      "Generate exactly 3 slide titles for a presentation about CPF member engagement. " +
      "Return ONLY a JSON array of objects with 'title' and 'layout' fields. No other text.";

    const output = await streamChat(agent, userPrompt, systemPrompt);
    const durationMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      output,
      agent,
      durationMs,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
