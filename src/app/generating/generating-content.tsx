"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SlideOutline, GenerationSource } from "@/lib/types";

interface StatusEvent {
  formattedTime: string;
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
  const mountedRef = useRef(true);
  const [settings, setSettings] = useState<{ strategy: string; daemonAgent: string; daemonModel: string; provider: string; apiKey: string }>({
    strategy: "mock",
    daemonAgent: "opencode",
    daemonModel: "opencode/big-pickle",
    provider: "gemini",
    apiKey: "",
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

    mountedRef.current = true;
    let parsedSettings: Record<string, unknown> = { strategy: "mock", daemonAgent: "opencode", daemonModel: "opencode/big-pickle", provider: "gemini", apiKey: "" };
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) parsedSettings = JSON.parse(raw);
    } catch { /* ignore corrupt settings */ }
    setSettings(parsedSettings as typeof settings);
    // Capture settings for the run() closure to avoid stale state
    const capturedSettings = parsedSettings as typeof settings;

    const lockedIds: number[] = [];
    if (regenPrompt) {
      try {
        const ctx = localStorage.getItem(STORAGE_KEYS.REGENERATION_CTX);
        if (ctx) {
          const parsed = JSON.parse(ctx) as { lockedSlideNumbers?: number[] };
          if (parsed.lockedSlideNumbers) lockedIds.push(...parsed.lockedSlideNumbers);
          localStorage.removeItem(STORAGE_KEYS.REGENERATION_CTX);
        }
      } catch { /* ignore */ }
    }

    const abortController = new AbortController();

    const run = async () => {
      try {
        const res = await fetch("/api/generate-outline-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            briefing: deck.briefing,
            strategy: capturedSettings.strategy ?? "mock",
            provider:
              capturedSettings.strategy === "daemon"
                ? (capturedSettings.daemonAgent ?? "opencode")
                : capturedSettings.provider,
            model: capturedSettings.strategy === "daemon" ? (capturedSettings.daemonModel ?? "opencode/big-pickle") : undefined,
            apiKey: capturedSettings.apiKey,
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
                  const now = new Date();
                  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  setEvents((prev) => [
                    { formattedTime: time, message: parsed.message, stage: parsed.stage },
                    ...prev,
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
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    };

    run();
    return () => {
      mountedRef.current = false;
      abortController.abort();
    };
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
              {settings.daemonAgent ?? "?"} / {(settings.daemonModel ?? "?").replace(/^opencode\//, "").replace(/^opencode-go\//, "")}
            </span>
          )}
          {settings.strategy === "llm" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-cpf-green)]/30 bg-[var(--color-cpf-green)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-cpf-green)]">
              {settings.provider ?? "?"}
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
                  {ev.formattedTime}
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

      {/* Text deltas — always visible */}
      {textDeltas && (
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Raw Agent Output
          </h2>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-cpf-paper)] p-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg)]">
            {textDeltas}
          </pre>
        </div>
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
