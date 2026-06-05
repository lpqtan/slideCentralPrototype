import { NextResponse } from "next/server";
import type { SlideContent, TextBlock } from "@/lib/types";
import { buildPptx } from "@/lib/pptx-builder";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await requireAuth(request);

    const body = await request.json();
    const { slides, overlayBlocks } = body as {
      slides: SlideContent[];
      overlayBlocks?: Record<number, TextBlock[]>;
    };

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "No slides to export" }, { status: 400 });
    }

    const buffer = await buildPptx(slides, overlayBlocks);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="presentation.pptx"',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
