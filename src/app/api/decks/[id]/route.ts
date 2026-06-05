import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import type { DbDeck } from "@/lib/db-types";

const ALLOWED_PATCH_FIELDS: (keyof DbDeck)[] = [
  "name",
  "htmlContent",
  "status",
  "overlayBlocks",
  "slides",
  "outline",
  "briefing",
  "source",
];

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

    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    const result = await collection.deleteOne({ deckId: id, createdBy: userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    const $set: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in body) $set[key] = body[key];
    }

    const result = await collection.updateOne(
      { deckId: id, createdBy: userId },
      { $set }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
