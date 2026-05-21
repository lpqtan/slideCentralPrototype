"use client";

import { useState } from "react";

const MOCK_STRATEGIES = [
  { id: "mock", label: "Mock", description: "Hardcoded responses for UI testing" },
  { id: "daemon", label: "Open Design Daemon", description: "localhost:7456 — full AI pipeline" },
  { id: "llm", label: "Direct LLM API", description: "OpenAI / Gemini / Groq / OpenRouter" },
];

const LLM_PROVIDERS = [
  { id: "openai", label: "OpenAI", free: false, model: "gpt-4o-mini" },
  { id: "gemini", label: "Gemini", free: true, model: "gemini-2.0-flash" },
  { id: "groq", label: "Groq", free: true, model: "llama-3.3-70b" },
  { id: "openrouter", label: "OpenRouter", free: true, model: "google/gemini-2.0-flash-001" },
];

export default function SettingsPage() {
  const [strategy, setStrategy] = useState("mock");
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
          Configure the AI backend and API keys
        </p>
      </div>

      {/* Backend Strategy */}
      <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Backend Strategy
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {MOCK_STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`rounded border p-4 text-left transition-colors ${
                strategy === s.id
                  ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div className="text-sm font-semibold text-[var(--color-fg)]">{s.label}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* LLM Provider (shown when llm strategy selected) */}
      {strategy === "llm" && (
        <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            LLM Provider
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {LLM_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`rounded border p-4 text-left transition-colors ${
                  provider === p.id
                    ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-fg)]">{p.label}</span>
                  {p.free && (
                    <span className="rounded bg-[var(--color-lime)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-pine-green)]">
                      FREE
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">{p.model}</div>
              </button>
            ))}
          </div>

          {/* API Key */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-[var(--color-fg-soft)]">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-cpf-paper)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Daemon Status (shown when daemon strategy selected) */}
      {strategy === "daemon" && (
        <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Daemon Status
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-[var(--color-muted)]" />
            <span className="text-sm text-[var(--color-muted)]">
              Daemon status check available in Phase 3
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            The Open Design daemon should be running at localhost:7456
          </p>
        </div>
      )}

      {/* Save */}
      <button
        onClick={() => {
          const settings = { strategy, provider, apiKey };
          localStorage.setItem("slidecentral-settings", JSON.stringify(settings));
          alert("Settings saved to localStorage");
        }}
        className="self-end rounded bg-[var(--color-cpf-green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)]"
      >
        Save Settings
      </button>

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
