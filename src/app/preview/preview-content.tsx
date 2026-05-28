"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";
import { useHistory } from "@/hooks/useHistory";
import { buildDeckHtml } from "@/lib/deck-builder";
import type { SlideOutline, SlideContent, TextBlock } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";

const COLORS = [
  { value: "#045941", label: "Green" },
  { value: "#1A1A1A", label: "Black" },
  { value: "#FFFFFF", label: "White" },
  { value: "#E69324", label: "Orange" },
  { value: "#A5CF4C", label: "Lime" },
  { value: "#1AA594", label: "Turquoise" },
];

let idCounter = 0;
function nextId(): string {
  return `tb_${Date.now()}_${++idCounter}`;
}

function getLayoutName(id: string): string {
  return LAYOUTS.find((l) => l.id === id)?.name ?? id;
}

export default function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById, setOverlayBlocks, setDeckSlides, setDeckHtml: storeDeckHtml } = useDeckStore();
  const [deckHtml, setDeckHtml] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideOutline[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDownloadHtml = () => {
    const deck = deckId ? getById(deckId) : undefined;
    const html = deck?.htmlContent ?? "";
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = deck?.name ? `${deck.name}.html` : "presentation.html";
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; blockX: number; blockY: number } | null>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const editHistory = useHistory<TextBlock[]>([]);
  const editBlocks = editHistory.state;
  const setEditBlocks = (v: TextBlock[]) => editHistory.push(v);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const selectedBlock = selectedId ? editBlocks.find((b) => b.id === selectedId) : null;
  const currentSlideData = slides[currentSlide] as (SlideOutline & { bodyContent?: string }) | undefined;
  const isHero = currentSlideData ? (LAYOUTS.find((l) => l.id === currentSlideData.suggestedLayout)?.dark ?? false) : false;

  const enterEditMode = () => {
    const deck = getById(deckId ?? "");
    if (deck?.slides) {
      const cleanHtml = buildDeckHtml(deck.slides);
      setDeckHtml(cleanHtml);
    }
    const saved = deck?.overlayBlocks?.[currentSlide] || [];
    editHistory.push(saved.map((b) => ({ ...b })), true);
    setEditMode(true);
    setSelectedId(null);
    setEditingId(null);
    iframeRef.current?.contentWindow?.postMessage({ showNav: false }, window.location.origin);
  };

  const saveEdit = () => {
    if (!deckId) return;
    setOverlayBlocks(deckId, currentSlide, editBlocks);
    const deck = getById(deckId);
    if (deck?.slides) {
      const allOverlay = { ...deck.overlayBlocks, [currentSlide]: editBlocks };
      const newHtml = buildDeckHtml(deck.slides, allOverlay);
      storeDeckHtml(deckId, newHtml);
      setDeckHtml(newHtml);
    }
    setEditMode(false);
    setSelectedId(null);
    setEditingId(null);
    iframeRef.current?.contentWindow?.postMessage({ showNav: true }, window.location.origin);
  };

  const changeLayout = (layoutId: string) => {
    if (!deckId) return;
    const deck = getById(deckId);
    const source = deck?.slides?.length ? deck.slides : deck?.outline || [];
    const updated = source.map((s, i) =>
      i === currentSlide ? { ...s, suggestedLayout: layoutId as SlideContent["suggestedLayout"] } : s
    ) as SlideContent[];
    setDeckSlides(deckId, updated);
    const newHtml = buildDeckHtml(updated, deck.overlayBlocks);
    storeDeckHtml(deckId, newHtml);
    setDeckHtml(newHtml);
    setSlides(updated);
    setLayoutPickerOpen(false);
  };

  // Close layout picker on outside click

  // Close layout picker on outside click
  useEffect(() => {
    if (!layoutPickerOpen) return;
    const close = () => setLayoutPickerOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [layoutPickerOpen]);

  useEffect(() => {
    if (!downloadOpen) return;
    const close = () => setDownloadOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [downloadOpen]);

  const addBlock = () => {
    const newBlock: TextBlock = {
      id: nextId(),
      text: "New text",
      x: 50, y: 50,
      color: isHero ? "#FFFFFF" : "#1A1A1A",
      bold: false, italic: false,
    };
    setEditBlocks([...editBlocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const deleteBlock = (id: string) => {
    setEditBlocks(editBlocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (block: TextBlock) => {
    setEditingId(block.id);
    setSelectedId(block.id);
    setEditText(block.text);
  };

  const commitEdit = () => {
    if (!editingId) return;
    setEditBlocks(editBlocks.map((b) => (b.id === editingId ? { ...b, text: editText } : b)));
    setEditingId(null);
  };

  const updateSelectedBlock = (patch: Partial<TextBlock>) => {
    if (!selectedId) return;
    setEditBlocks(editBlocks.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)));
  };

  const onPointerDown = (e: React.PointerEvent, block: TextBlock) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(block.id);
    dragRef.current = {
      id: block.id, startX: e.clientX, startY: e.clientY,
      blockX: block.x, blockY: block.y,
    };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100;
      setEditBlocks(editBlocks.map((b) =>
        b.id === dragRef.current!.id
          ? { ...b, x: Math.max(1, Math.min(99, dragRef.current!.blockX + dx)), y: Math.max(1, Math.min(99, dragRef.current!.blockY + dy)) }
          : b
      ));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // Load overlay blocks when slide changes in edit mode
  useEffect(() => {
    if (!editMode || !deckId) return;
    const deck = getById(deckId);
    const saved = deck?.overlayBlocks?.[currentSlide] || [];
    editHistory.push(saved.map((b) => ({ ...b })), true);
    setSelectedId(null);
    setEditingId(null);
  }, [currentSlide]);

  const handleDownloadPptx = async () => {
    setDownloading(true);
    try {
      const deck = deckId ? getById(deckId) : undefined;
      const html = deck?.htmlContent ?? "";
      const res = await fetch("/api/export-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "presentation.pptx"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PPTX export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!deckId) { router.push("/briefing"); return; }
    const deck = getById(deckId);
    if (deck?.htmlContent) setDeckHtml(deck.htmlContent);
    if (deck?.outline) { setSlides(deck.outline); setCurrentSlide(0); }
  }, [deckId, getById, router]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data.slide === "number") setCurrentSlide(e.data.slide);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (!deckHtml) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">No deck to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Thumbnail sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Slides</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{slides.length} slides</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {slides.map((slide, i) => (
              <button key={slide.slideNumber}
                onClick={() => {
                  setCurrentSlide(i);
                  iframeRef.current?.contentWindow?.postMessage({ slide: i }, window.location.origin);
                }}
                className={`w-full cursor-pointer rounded text-left transition-all ${i === currentSlide ? "ring-2 ring-[var(--color-cpf-green)] ring-offset-1" : "hover:ring-1 hover:ring-[var(--color-border-strong)]"}`}>
                <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="relative aspect-video bg-[var(--color-cpf-mint)]">
                    {(() => {
                      const isDark = LAYOUTS.find((l) => l.id === slide.suggestedLayout)?.dark;
                      return isDark ? (
                        <div className="flex h-full items-center justify-center bg-[var(--color-cpf-green)]">
                          <span className="text-[8px] font-medium text-white/70">{getLayoutName(slide.suggestedLayout)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="h-[20%] w-full bg-[var(--color-cpf-green)]" />
                          <div className="p-1.5 space-y-1">
                            <div className="h-1 w-3/4 rounded-full bg-[var(--color-border)]" />
                            <div className="h-1 w-1/2 rounded-full bg-[var(--color-border)]" />
                            <div className="h-1 w-2/3 rounded-full bg-[var(--color-border)]" />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-[var(--color-muted)]">{i + 1}.</span>
                      <span className="truncate text-[9px] font-medium text-[var(--color-fg-soft)]">{slide.title}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 shrink-0 flex items-center justify-between px-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-fg)]">Deck Preview</h1>
            <p className="mt-1 text-sm text-[var(--color-fg-soft)]">Use arrow keys to navigate, Home/End to jump</p>
          </div>
          <div className="flex gap-2">
            {editMode && (
              <>
                <button onClick={editHistory.undo} disabled={!editHistory.canUndo}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm px-2 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] disabled:cursor-not-allowed disabled:opacity-30"
                  title="Undo (Ctrl+Z)">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
                </button>
                <button onClick={editHistory.redo} disabled={!editHistory.canRedo}
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm px-2 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] disabled:cursor-not-allowed disabled:opacity-30"
                  title="Redo (Ctrl+Shift+Z)">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4"/></svg>
                </button>
                <button onClick={saveEdit}
                  className="rounded border border-[var(--color-cpf-green)] px-3 py-2 text-xs font-medium text-[var(--color-cpf-green)] transition-colors hover:bg-[var(--color-cpf-mint)]">Save</button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setLayoutPickerOpen(!layoutPickerOpen); }}
                    className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]">
                    Layout: {currentSlideData ? getLayoutName(currentSlideData.suggestedLayout) : ""} ▼
                  </button>
                  {layoutPickerOpen && (
                    <div onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 z-50 w-72 max-h-[60vh] overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
                      <div className="border-b border-[var(--color-border)] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Select Layout</p>
                      </div>
                      <div className="py-1">
                        {LAYOUTS.map((layout) => {
                          const isSelected = currentSlideData?.suggestedLayout === layout.id;
                          return (
                            <button key={layout.id}
                              onClick={() => changeLayout(layout.id)}
                              className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-cpf-mint)] ${isSelected ? "bg-[var(--color-cpf-mint)]" : ""}`}>
                              <div className="mt-0.5 h-10 w-[71px] shrink-0 overflow-hidden rounded border border-[var(--color-border)]">
                                {layout.dark ? (
                                  <div className="flex h-full items-center justify-center bg-[var(--color-cpf-green)] text-[7px] font-semibold text-white/80">
                                    {layout.id === "cover" ? "Cover" : layout.id === "section-divider" ? "Ch. 1" : layout.id === "big-stat" ? "42%" : layout.id === "quote-testimonial" ? "\u201C\u201D" : layout.id === "closing" ? "Thx" : layout.name.substring(0, 6)}
                                  </div>
                                ) : (
                                  <div className="flex h-full flex-col bg-[var(--color-cpf-mint)]">
                                    <div className="h-[22%] w-full bg-[var(--color-cpf-green)]" />
                                    <div className="flex-1 p-1 space-y-0.5">
                                      <div className="h-[3px] w-3/4 rounded-full bg-[var(--color-border)]" />
                                      <div className="h-[3px] w-1/2 rounded-full bg-[var(--color-border)]" />
                                      <div className="h-[3px] w-2/3 rounded-full bg-[var(--color-border)]" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-[11px] font-semibold ${isSelected ? "text-[var(--color-cpf-green)]" : "text-[var(--color-fg)]"}`}>{layout.name}</div>
                                <p className="mt-0.5 text-[9px] leading-relaxed text-[var(--color-muted)]">{layout.description}</p>
                              </div>
                              {isSelected && <svg className="mt-1 h-3 w-3 shrink-0 text-[var(--color-cpf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!editMode && (
              <button onClick={enterEditMode}
                className="rounded border border-[var(--color-cpf-green)] px-3 py-2 text-xs font-medium text-[var(--color-cpf-green)] transition-colors hover:bg-[var(--color-cpf-mint)]">Edit</button>
            )}
            <Link href={`/outline?deckId=${encodeURIComponent(deckId ?? "")}`}
              className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]">Back to Outline</Link>
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setDownloadOpen(!downloadOpen); }} disabled={downloading}
                className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-wait disabled:opacity-60">
                {downloading ? "Downloading..." : "Download ▼"}
              </button>
              {downloadOpen && (
                <div onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 z-50 w-32 rounded border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
                  <button onClick={handleDownloadHtml}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--color-fg-soft)] hover:bg-[var(--color-cpf-mint)] transition-colors rounded-t">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    HTML
                  </button>
                  <button onClick={() => { handleDownloadPptx(); setDownloadOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--color-fg-soft)] hover:bg-[var(--color-cpf-mint)] transition-colors rounded-b border-t border-[var(--color-border)]">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    PPTX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        {editMode && (
          <div className="flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 mx-6 mb-2">
            <button onClick={addBlock} className="rounded border border-[var(--color-cpf-green)] px-2 py-1 text-[10px] font-medium text-[var(--color-cpf-green)] hover:bg-[var(--color-cpf-mint)] transition-colors">+ Text</button>
            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
            {COLORS.map((c) => (
              <button key={c.value} onClick={() => updateSelectedBlock({ color: c.value })}
                className="h-6 w-6 rounded border-2 border-transparent transition-colors hover:border-[var(--color-cpf-green)]"
                style={{ backgroundColor: c.value }} title={c.label} />
            ))}
            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
            <button onClick={() => updateSelectedBlock({ bold: !selectedBlock?.bold })}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${selectedBlock?.bold ? "bg-[var(--color-cpf-green)] text-white" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"}`}>B</button>
            <button onClick={() => updateSelectedBlock({ italic: !selectedBlock?.italic })}
              className={`rounded px-2 py-0.5 text-[10px] italic font-semibold transition-colors ${selectedBlock?.italic ? "bg-[var(--color-cpf-green)] text-white" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"}`}>I</button>
            {selectedId && (
              <>
                <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
                <button onClick={() => deleteBlock(selectedId)} className="rounded px-2 py-0.5 text-[10px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">Delete</button>
              </>
            )}
            <span className="ml-auto text-[10px] text-[var(--color-muted)]">Drag to reposition · Double-click to edit</span>
          </div>
        )}

        {/* Iframe + Overlay */}
        <div className="min-h-0 flex-1 overflow-hidden border border-[var(--color-border)] mx-6 relative">
          <iframe ref={iframeRef} srcDoc={deckHtml}
            className="h-full w-full border-0" allowFullScreen title="Slide Deck Preview" />
          {/* Overlay — edit mode only */}
          {editMode && (() => {
            const blocks = editBlocks;
            if (!blocks.length) return null;
            return (
              <div ref={overlayRef} className="absolute inset-0 z-10" style={{ pointerEvents: editMode ? "auto" : "none" }}>
                {blocks.map((block) => (
                  <div key={block.id}
                    style={{
                      position: "absolute", left: `${block.x}%`, top: `${block.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: selectedId === block.id ? 20 : 10,
                      cursor: editMode ? "move" : undefined,
                    }}
                    onPointerDown={editMode ? (e) => onPointerDown(e, block) : undefined}
                    onDoubleClick={editMode ? () => startEdit(block) : undefined}>
                    <div className={`rounded select-none ${editMode && selectedId === block.id ? "ring-2 ring-[var(--color-cpf-green)] ring-offset-1 ring-offset-black/5" : ""}`}
                      style={{
                        color: block.color, fontWeight: block.bold ? 700 : 400,
                        fontStyle: block.italic ? "italic" : "normal",
                        fontSize: "clamp(11px, 1.5cqw, 26px)",
                        fontFamily: "Roboto, system-ui, sans-serif",
                        textAlign: "center", maxWidth: "420px", wordBreak: "break-word",
                        backgroundColor: "transparent",
                        padding: editingId === block.id ? "6px 14px" : "3px 8px", borderRadius: 4,
                      }}>
                      {editMode && editingId === block.id ? (
                        <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent border-none outline-none text-center"
                          style={{ color: block.color, fontWeight: block.bold ? 700 : 400, fontStyle: block.italic ? "italic" : "normal", fontSize: "inherit", fontFamily: "inherit", width: "100%", minWidth: "120px" }} />
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>{block.text}</span>
                      )}
                  </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Brand bar */}
        <div className="mt-3 mb-4 shrink-0 flex items-center gap-2 px-6">
          <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
          <span className="font-mono text-xs text-[var(--color-muted)]">Preview · CPF</span>
        </div>
      </div>
    </div>
  );
}
