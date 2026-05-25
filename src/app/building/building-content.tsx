"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import type { GenerationSource } from "@/lib/types";

interface StatusEvent {
  formattedTime: string;
  message: string;
  stage: string;
}

function badgeLabel(settings: { strategy: string; provider?: string; daemonAgent?: string; daemonModel?: string; apiKey?: string }): string {
  if (settings.strategy === "llm") {
    const p = settings.provider ?? "gemini";
    return p.charAt(0).toUpperCase() + p.slice(1);
  }
  const agent = settings.daemonAgent ?? "?";
  const model = (settings.daemonModel ?? "?").replace(/^opencode\//, "").replace(/^opencode-go\//, "");
  return `${agent} / ${model}`;
}

export default function BuildingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const { getById, setDeckHtml } = useDeckStore();

  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [textDeltas, setTextDeltas] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const [settings, setSettings] = useState<{
    strategy: string;
    provider: string;
    apiKey: string;
    daemonAgent: string;
    daemonModel: string;
  }>({
    strategy: "mock",
    provider: "gemini",
    apiKey: "",
    daemonAgent: "opencode",
    daemonModel: "opencode/big-pickle",
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
    const s = settingsRaw
      ? JSON.parse(settingsRaw)
      : { strategy: "llm", provider: "gemini", apiKey: "", daemonAgent: "opencode", daemonModel: "opencode/big-pickle" };
    setSettings(s);

    const slides = deck.slides ?? deck.outline?.map((o) => ({
      ...o,
      bodyContent: "",
    })) ?? [];

    const run = async () => {
      try {
        const res = await fetch("/api/build-deck-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slides,
            briefing: deck.briefing,
            strategy: s.strategy ?? "mock",
            provider: s.strategy === "daemon" ? (s.daemonAgent ?? "opencode") : (s.provider ?? "gemini"),
            model: s.strategy === "daemon" ? (s.daemonModel ?? "opencode/big-pickle") : "gemini-3.5-flash",
            apiKey: s.apiKey,
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
                  if (parsed.delta) setTextDeltas((prev) => prev + parsed.delta);
                } catch { /* ignore */ }
              }

              if (currentEvent === "complete") {
                try {
                  const parsed = JSON.parse(currentData) as { html: string; source?: GenerationSource };
                  setDeckHtml(deckId, parsed.html);
                  router.push(`/preview?deckId=${encodeURIComponent(deckId)}`);
                  return;
                } catch { /* ignore */ }
              }

              if (currentEvent === "error") {
                try {
                  const parsed = JSON.parse(currentData) as { message?: string };
                  setError(parsed.message ?? "Unknown error");
                } catch { setError("Unknown error"); }
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
  }, [deckId, getById, router, setDeckHtml]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Building Deck</h1>
        <p className="mt-1 flex items-center gap-3 text-sm text-[var(--color-fg-soft)]">
          <span>{error ? "An error occurred" : "Building slides with AI..."}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-cpf-green)]/30 bg-[var(--color-cpf-green)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-cpf-green)]">
            {badgeLabel(settings)}
          </span>
        </p>
      </div>

      {/* Spinner */}
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
                ? "Build failed"
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
            onClick={() => router.push("/outline")}
            className="mt-4 rounded border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-cpf-mint)]"
          >
            Back to Outline
          </button>
        )}
      </div>

      {/* Activity Log */}
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
                      : ev.stage === "fetching"
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

      {/* Agent output */}
      {textDeltas && (
        <details className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]">
            Agent Output
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
          Building · CPF
        </span>
      </div>
    </div>
  );
}
