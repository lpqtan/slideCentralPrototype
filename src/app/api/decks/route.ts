import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { DbDeck } from "@/lib/db-types";

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    const docs = await collection
      .find({}, { projection: { deckId: 1, name: 1, createdAt: 1, updatedAt: 1, status: 1, slides: 1, htmlContent: 1 } })
      .sort({ updatedAt: -1 })
      .toArray();

    const items = docs.map((doc) => ({
      deckId: doc.deckId,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      slideCount: doc.slides?.length ?? 0,
      status: doc.status,
      htmlContent: doc.htmlContent ?? "",
    }));

    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DbDeck;
    const db = await getDb();
    const collection = db.collection<DbDeck>("decks");

    await collection.updateOne(
      { deckId: body.deckId },
      { $set: { ...body, updatedAt: Date.now() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
