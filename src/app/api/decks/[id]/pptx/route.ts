import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import type { DbDeck } from "@/lib/db-types";
import { buildPptx } from "@/lib/pptx-builder";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    const doc = await collection.findOne({ deckId: id, createdBy: userId });
    if (!doc) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    if (!doc.slides || doc.slides.length === 0) {
      return NextResponse.json({ error: "No slide data for this deck" }, { status: 400 });
    }

    const buffer = await buildPptx(doc.slides, doc.overlayBlocks ?? undefined);

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
