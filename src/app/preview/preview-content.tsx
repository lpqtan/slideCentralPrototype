"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { SlideOutline } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";

function getLayoutName(id: string): string {
  return LAYOUTS.find((l) => l.id === id)?.name ?? id;
}

export default function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById } = useDeckStore();
  const [deckHtml, setDeckHtml] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideOutline[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      a.href = url;
      a.download = "presentation.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PPTX export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }
    const deck = getById(deckId);
    if (deck?.htmlContent) {
      setDeckHtml(deck.htmlContent);
    }
    if (deck?.outline) {
      setSlides(deck.outline);
      setCurrentSlide(0);
    }
  }, [deckId, getById, router]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data.slide === "number") {
        setCurrentSlide(e.data.slide);
      }
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Slides
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
            {slides.length} slides
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {slides.map((slide, i) => (
              <button
                key={slide.slideNumber}
                onClick={() => {
                  setCurrentSlide(i);
                  iframeRef.current?.contentWindow?.postMessage({ slide: i }, "*");
                }}
                className={`w-full cursor-pointer rounded text-left transition-all ${
                  i === currentSlide
                    ? "ring-2 ring-[var(--color-cpf-green)] ring-offset-1"
                    : "hover:ring-1 hover:ring-[var(--color-border-strong)]"
                }`}
              >
                <div className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="relative aspect-video bg-[var(--color-cpf-mint)]">
                    {(() => {
                      const isDark = LAYOUTS.find((l) => l.id === slide.suggestedLayout)?.dark;
                      return isDark ? (
                        <div className="flex h-full items-center justify-center bg-[var(--color-cpf-green)]">
                          <span className="text-[8px] font-medium text-white/70">
                            {getLayoutName(slide.suggestedLayout)}
                          </span>
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
                      <span className="text-[9px] font-bold text-[var(--color-muted)]">
                        {i + 1}.
                      </span>
                      <span className="truncate text-[9px] font-medium text-[var(--color-fg-soft)]">
                        {slide.title}
                      </span>
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
            <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
              Use arrow keys to navigate, Home/End to jump
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/outline?deckId=${encodeURIComponent(deckId ?? "")}`}
              className="rounded border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
            >
              Back to Outline
            </Link>
            <button
              onClick={handleDownloadPptx}
              disabled={downloading}
              className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-wait disabled:opacity-60"
            >
              {downloading ? "Downloading..." : "Download PPTX"}
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="min-h-0 flex-1 overflow-hidden border border-[var(--color-border)] mx-6">
          <iframe
            ref={iframeRef}
            srcDoc={deckHtml}
            className="h-full w-full border-0"
            allowFullScreen
            title="Slide Deck Preview"
          />
        </div>

        {/* Brand bar */}
        <div className="mt-3 mb-4 shrink-0 flex items-center gap-2 px-6">
          <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
          <span className="font-mono text-xs text-[var(--color-muted)]">
            Preview · CPF
          </span>
        </div>
      </div>
    </div>
  );
}
