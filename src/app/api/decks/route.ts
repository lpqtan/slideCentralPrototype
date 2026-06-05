import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import type { DbDeck } from "@/lib/db-types";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    const docs = await collection
      .find(
        { createdBy: userId },
        { projection: { deckId: 1, name: 1, createdAt: 1, updatedAt: 1, status: 1, slides: 1, outline: 1, htmlContent: 1 } }
      )
      .sort({ updatedAt: -1 })
      .toArray();

    const items = docs.map((doc) => ({
      deckId: doc.deckId,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      slideCount: doc.slides?.length ?? doc.outline?.length ?? 0,
      status: doc.status,
      htmlContent: doc.htmlContent ?? "",
    }));

    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = (await request.json()) as DbDeck;
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    await collection.updateOne(
      { deckId: body.deckId },
      { $set: { ...body, createdBy: userId, updatedAt: Date.now() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
