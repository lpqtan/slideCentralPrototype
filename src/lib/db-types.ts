import type { SavedDeck } from "@/lib/types";

export interface DbDeck {
  deckId: string;
  name: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  briefing: SavedDeck["briefing"];
  outline: SavedDeck["outline"];
  slides: SavedDeck["slides"];
  htmlContent: string;
  source: SavedDeck["source"];
  status: "built" | "exported";
  overlayBlocks: SavedDeck["overlayBlocks"];
}

export interface DbDeckListItem {
  deckId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  slideCount: number;
  status: "built" | "exported";
}
