import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/strategies/registry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { strategy } = body as { strategy: string };

    const backend = getStrategy(strategy ?? "mock");
    const healthy = await backend.healthCheck();

    return NextResponse.json({ healthy });
  } catch {
    return NextResponse.json({ healthy: false });
  }
}
