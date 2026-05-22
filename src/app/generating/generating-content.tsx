"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { SlideOutline, GenerationSource } from "@/lib/types";

interface StatusEvent {
  time: number;
  message: string;
  stage: string;
}

export default function GeneratingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const regenPrompt = searchParams.get("regenerationPrompt");
  const { getById, updateOutline } = useDeckStore();

  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [textDeltas, setTextDeltas] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const [settings, setSettings] = useState<{ strategy: string; daemonAgent: string; daemonModel: string }>({
    strategy: "mock",
    daemonAgent: "opencode",
    daemonModel: "deepseek-chat",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!deckId) {
      router.push("/briefing");
      return;
    }

    const deck = getById(deckId);
    if (!deck) {
      router.push("/briefing");
      return;
    }

    const settingsRaw = localStorage.getItem("slidecentral-settings");
    const settings = settingsRaw
      ? JSON.parse(settingsRaw)
      : { strategy: "mock", daemonAgent: "opencode", daemonModel: "deepseek-chat" };

    setSettings(settings);

    const lockedIds: number[] = [];
    if (regenPrompt) {
      try {
        const ctx = localStorage.getItem("slidecentral-regeneration-ctx");
        if (ctx) {
          const parsed = JSON.parse(ctx) as { lockedSlideNumbers?: number[] };
          if (parsed.lockedSlideNumbers) lockedIds.push(...parsed.lockedSlideNumbers);
          localStorage.removeItem("slidecentral-regeneration-ctx");
        }
      } catch { /* ignore */ }
    }

    const run = async () => {
      try {
        const res = await fetch("/api/generate-outline-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefing: deck.briefing,
            strategy: settings.strategy ?? "mock",
            provider:
              settings.strategy === "daemon"
                ? (settings.daemonAgent ?? "opencode")
                : settings.provider,
            model: settings.strategy === "daemon" ? (settings.daemonModel ?? "deepseek-chat") : undefined,
            apiKey: settings.apiKey,
            existingOutline: regenPrompt ? (deck.outline ?? undefined) : undefined,
            lockedSlideNumbers: lockedIds.length > 0 ? lockedIds : undefined,
            regenerationPrompt: regenPrompt || undefined,
          }),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let currentData = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6);
            } else if (line === "" && currentData) {
              // Process event
              if (currentEvent === "status") {
                try {
                  const parsed = JSON.parse(currentData);
                  setEvents((prev) => [
                    ...prev,
                    { time: Date.now(), message: parsed.message, stage: parsed.stage },
                  ]);
                } catch { /* ignore */ }
              }

              if (currentEvent === "text_delta") {
                try {
                  const parsed = JSON.parse(currentData) as { delta?: string };
                  if (parsed.delta) {
                    setTextDeltas((prev) => prev + parsed.delta);
                  }
                } catch { /* ignore */ }
              }

              if (currentEvent === "complete") {
                try {
                  const parsed = JSON.parse(currentData) as {
                    outline: SlideOutline[];
                    source: GenerationSource;
                  };
                  // Save to deck store
                  updateOutline(deckId, parsed.outline, parsed.source);
                  router.push(`/outline?deckId=${encodeURIComponent(deckId)}`);
                  return;
                } catch { /* ignore */ }
              }

              if (currentEvent === "error") {
                try {
                  const parsed = JSON.parse(currentData) as { message?: string };
                  setError(parsed.message ?? "Unknown error");
                } catch {
                  setError("Unknown error");
                }
                return;
              }

              currentEvent = "";
              currentData = "";
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    };

    run();
  }, [deckId, getById, router, regenPrompt, updateOutline]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">
          {regenPrompt ? "Refining Outline" : "Generating Outline"}
        </h1>
        <p className="mt-1 flex items-center gap-3 text-sm text-[var(--color-fg-soft)]">
          <span>{error ? "An error occurred" : "Please wait while the AI works..."}</span>
          {settings.strategy === "daemon" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-cpf-green)]/30 bg-[var(--color-cpf-green)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-cpf-green)]">
              {settings.daemonAgent ?? "opencode"} / {settings.daemonModel ?? "deepseek-chat"}
            </span>
          )}
        </p>
      </div>

      {/* Spinner + timer */}
      <div className="mb-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center gap-4">
          {error ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <span className="text-sm text-red-500">!</span>
            </div>
          ) : (
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--color-cpf-green)] border-t-transparent" />
          )}
          <div>
            <p className="text-sm font-semibold text-[var(--color-fg)]">
              {error
                ? "Generation failed"
                : events.length > 0
                  ? events[events.length - 1].message
                  : "Initializing..."}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {error ? error : `Elapsed: ${elapsed}s`}
            </p>
          </div>
        </div>

        {error && (
          <button
            onClick={() => router.push("/briefing")}
            className="mt-4 rounded border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            Back to Briefing
          </button>
        )}
      </div>

      {/* Event timeline */}
      {events.length > 0 && (
        <div className="mb-6 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Activity Log
          </h2>
          <div className="space-y-1.5">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 font-mono text-[10px] text-[var(--color-muted)]">
                  {((Date.now() - ev.time) / 1000).toFixed(0).padStart(2, " ")}s ago
                </span>
                <span
                  className={
                    ev.stage === "error"
                      ? "text-red-500"
                      : ev.stage === "parsing"
                        ? "text-[var(--color-cpf-green)]"
                        : "text-[var(--color-fg-soft)]"
                  }
                >
                  {ev.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text deltas (collapsible) */}
      {textDeltas && (
        <details className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]">
            Raw Agent Output
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-cpf-paper)] p-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg)]">
            {textDeltas}
          </pre>
        </details>
      )}

      {/* Brand bar */}
      <div className="mt-auto flex items-center gap-2 pt-8">
        <div className="h-[3px] w-12 rounded-full bg-[var(--color-cpf-green)]" />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          Slide Central · CPF
        </span>
      </div>
    </div>
  );
}
