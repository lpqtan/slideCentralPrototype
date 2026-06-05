import { NextResponse } from "next/server";
import { requireAuth, getUserSettings, saveUserSettings } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await requireAuth(request);
    const settings = await getUserSettings(userId);
    if (!settings) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireAuth(request);
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
      daemonAgent?: string;
      daemonModel?: string;
      strategy?: string;
    };

    await saveUserSettings(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
