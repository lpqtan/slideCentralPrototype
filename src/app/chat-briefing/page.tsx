"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDeckStore } from "@/hooks/useDeckStore";
import { STORAGE_KEYS } from "@/lib/constants";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts-od";
import type { BriefingData } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBriefingPage() {
  const router = useRouter();
  const { save } = useDeckStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'll help you create a slide deck briefing. Just tell me what you need — who it's for, what it should achieve, the key message, and any other details. The more you tell me upfront, the faster we can get started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [summary, setSummary] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [slidePrompt, setSlidePrompt] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [modelBadge, setModelBadge] = useState("OpenRouter");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.strategy === "opencode-direct") {
          setModelBadge(`opencode / ${s.daemonModel ? s.daemonModel.replace(/^opencode\//, "") : "big-pickle"}`);
        } else if (s.strategy === "llm") {
          const p = s.provider ?? "gemini";
          if (p === "gemini") setModelBadge("Gemini 2.5 Flash Lite");
          else if (p === "gemini-3.5-flash") setModelBadge("Gemini 3.5 Flash");
          else setModelBadge(p);
        } else {
          setModelBadge("OpenRouter");
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, streamText]);

  const loadApiKey = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const s = JSON.parse(raw) as { apiKey?: string };
        if (s.apiKey) return s.apiKey;
      }
    } catch { /* ignore */ }
    return "";
  }, []);

  const loadSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) return JSON.parse(raw) as { strategy?: string; provider?: string; apiKey?: string };
    } catch { /* ignore */ }
    return { strategy: "mock", provider: "gemini", apiKey: "" };
  }, []);

  const sendMessage = async (extractOnly = false) => {
    const text = input.trim();
    if (!text && !extractOnly) return;

    const newMsgs: Message[] = [
      ...messages,
      ...(text ? [{ role: "user" as const, content: text }] : []),
    ];

    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    setStreamText("");
    setRawOutput("");

    try {
      const settings = loadSettings();
      const res = await fetch("/api/chat-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          extractOnly,
          strategy: settings.strategy ?? "opencode-direct",
          provider: settings.provider ?? "gemini",
          apiKey: settings.apiKey || loadApiKey(),
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
            if (currentEvent === "text_delta") {
              try {
                const p = JSON.parse(currentData) as { delta?: string };
                if (p.delta) setStreamText((prev) => prev + p.delta);
              } catch { /* ignore */ }
            }

            if (currentEvent === "status") {
              // Just acknowledge — status text shows in loading state
            }

            if (currentEvent === "complete") {
              try {
                const p = JSON.parse(currentData) as {
                  status?: string;
                  message?: string;
                  followUpQuestions?: string[];
                  summary?: string;
                  briefing?: BriefingData;
                  rawOutput?: string;
                };

                if (p.rawOutput) setRawOutput(p.rawOutput);

                if (p.status === "complete" && p.briefing) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: p.summary || p.message || "Briefing complete." },
                  ]);
                  setBriefing(p.briefing);
                  setSummary(p.summary || p.message || "");
                  // Generate the slide outline prompt from the briefing
                  setSlidePrompt(buildSystemPrompt() + "\n\n---\n\n" + buildUserPrompt(p.briefing));
                } else if (p.followUpQuestions?.length) {
                  const qText = (p.message || "I need a bit more information:") +
                    "\n\n" +
                    p.followUpQuestions.map((q: string) => `• ${q}`).join("\n");
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: qText },
                  ]);
                } else {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: p.message || "Could you tell me more?" },
                  ]);
                }
                setStreamText("");
              } catch { /* ignore */ }
            }

            if (currentEvent === "error") {
              try {
                const p = JSON.parse(currentData) as { message?: string };
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `Error: ${p.message || "Unknown error"}` },
                ]);
                setStreamText("");
              } catch { /* ignore */ }
            }

            currentEvent = "";
            currentData = "";
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` },
      ]);
      setStreamText("");
    } finally {
      setStreaming(false);
    }
  };

  const proceedToGenerating = () => {
    if (!briefing) return;
    const deckId = crypto.randomUUID();
    const name = briefing.keyMessage?.slice(0, 60) || "Chat Briefing Deck";

    save({
      id: deckId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      briefing,
      outline: null,
      slides: null,
      htmlContent: null,
      source: null,
      status: "briefing",
    });

    router.push(`/generating?deckId=${encodeURIComponent(deckId)}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-fg)]">Chat Briefing</h1>
          <p className="mt-0.5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span>Tell me about your presentation — I&apos;ll ask follow-ups if needed</span>
            <span className="rounded bg-[var(--color-cpf-mint)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-cpf-green)]">
              {modelBadge}
            </span>
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[var(--color-cpf-green)] text-white"
                    : "bg-[var(--color-cpf-mint)] text-[var(--color-fg)]"
                }`}
              >
                {m.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < m.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded bg-[var(--color-cpf-mint)] px-4 py-2 text-sm text-[var(--color-fg)]">
                {streamText || "Thinking..."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw output */}
      {rawOutput && (
        <details className="mt-2 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]">
            Raw Response
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-cpf-paper)] p-2 font-mono text-[10px] leading-relaxed text-[var(--color-fg)]">
            {rawOutput}
          </pre>
        </details>
      )}

      {/* Briefing confirmation */}
      {briefing && (
        <div className="mt-3 shrink-0 rounded border border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] p-4">
          <h3 className="mb-2 text-sm font-bold text-[var(--color-cpf-green)]">
            Briefing Extracted
          </h3>
          <p className="mb-2 text-xs text-[var(--color-fg-soft)]">{summary}</p>
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--color-fg-soft)]">
            <span>Objective: {briefing.objective}</span>
            <span>Audience: {briefing.audience}</span>
            <span>Mode: {briefing.mode}</span>
            <span>Arc: {briefing.narrativeArc}</span>
            <span className="col-span-2">Message: {briefing.keyMessage}</span>
          </div>

          {/* Slide Outline Prompt Preview */}
          {slidePrompt && (
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-medium text-[var(--color-fg-soft)] hover:text-[var(--color-cpf-green)]">
                Preview Slide Outline Prompt ▾
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-[10px] leading-relaxed text-[var(--color-fg)]">
                {slidePrompt}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
              >
                Confirm & Generate Outline
              </button>
            ) : (
              <button
                onClick={proceedToGenerating}
                className="rounded bg-[var(--color-orange)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
              >
                Yes, generate outline now
              </button>
            )}
            <button
              onClick={() => {
                setBriefing(null);
                setSummary("");
                setConfirming(false);
                setMessages((prev) => [
                  ...prev,
                  { role: "user", content: "Actually, let me add more details..." },
                ]);
              }}
              className="rounded border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-fg-soft)] transition-colors hover:bg-white"
            >
              Add More Details
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!briefing && (
        <div className="mt-3 shrink-0 flex gap-2">
          {/* File upload */}
          <label className="cursor-pointer rounded border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)]" title="Upload PDF">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1L3 5h2v4h4V5h2L7 1zM2 10v2h10v-2H2z"/></svg>
            <input
              type="file"
              accept=".pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setStreaming(true);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
                  const data = await res.json() as { text?: string; error?: string };
                  if (data.error) throw new Error(data.error);
                  const text = data.text || "";
                  setMessages((prev) => [
                    ...prev,
                    { role: "user", content: `[Uploaded PDF: ${file.name}]\n\n${text.slice(0, 3000)}${text.length > 3000 ? "\n...(truncated)" : ""}` },
                  ]);
                  setStreaming(false);
                  // Auto-send the uploaded content
                  if (text) await sendMessage();
                } catch (err) {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: `PDF parse error: ${err instanceof Error ? err.message : "Unknown"}` },
                  ]);
                  setStreaming(false);
                }
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim() && !streaming) sendMessage();
            }}
            placeholder="Describe your presentation needs..."
            disabled={streaming}
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || !input.trim()}
            className="rounded bg-[var(--color-cpf-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
          <button
            onClick={() => sendMessage(true)}
            disabled={streaming}
            className="rounded border border-[var(--color-orange)]/50 px-3 py-2 text-xs font-medium text-[var(--color-orange)] transition-colors hover:bg-[var(--color-orange)]/10 disabled:opacity-40"
            title="Skip questions — use what I've provided so far"
          >
            Override
          </button>
        </div>
      )}
    </div>
  );
}
