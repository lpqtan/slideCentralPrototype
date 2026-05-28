"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STRATEGIES = [
  { id: "mock", label: "Mock", description: "Hardcoded responses for UI testing" },
  { id: "opencode-direct", label: "Local OpenCode", description: "Calls opencode CLI directly — no daemon" },
  { id: "daemon", label: "Open Design Daemon", description: "localhost:7456 — full AI pipeline" },
  { id: "llm", label: "Direct LLM API", description: "OpenAI / Gemini / Groq / OpenRouter" },
] as const;

const FREE_PROVIDERS = [
  { id: "gemini", label: "Gemini 2.5 Flash Lite", model: "gemini-2.5-flash-lite" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", model: "gemini-3.5-flash" },
  { id: "groq", label: "Groq", model: "llama-3.3-70b" },
  { id: "openrouter", label: "OpenRouter", model: "openrouter/free" },
] as const;

const BYOK_PROVIDERS = [
  { id: "openai", label: "OpenAI", model: "gpt-4o-mini" },
] as const;

const DAEMON_AGENTS = [
  { id: "opencode", label: "OpenCode", description: "Open source coding agent" },
  { id: "claude", label: "Claude Code", description: "Anthropic's coding agent" },
  { id: "codex", label: "Codex CLI", description: "OpenAI's coding agent" },
  { id: "gemini", label: "Gemini CLI", description: "Google's coding agent" },
  { id: "cursor-agent", label: "Cursor Agent", description: "Cursor's coding agent" },
  { id: "qwen", label: "Qwen Code", description: "Alibaba's coding agent" },
  { id: "opencode", label: "OpenCode", description: "Default — open source coding agent" },
] as const;

// Deduplicate by id
const DAEMON_AGENTS_UNIQUE = DAEMON_AGENTS.filter(
  (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i
);

const FREE_MODELS = [
  { id: "opencode/big-pickle", label: "Big Pickle", description: "Free — general purpose" },
  { id: "opencode/deepseek-v4-flash-free", label: "DeepSeek V4 Flash", description: "Free — fast" },
  { id: "opencode/nemotron-3-super-free", label: "Nemotron 3 Super", description: "Free — reasoning" },
  { id: "opencode/gemini-3-flash", label: "Gemini 3 Flash", description: "Free — Google" },
  { id: "opencode/qwen3.6-plus", label: "Qwen 3.6 Plus", description: "Free — Alibaba" },
] as const;

interface SettingsState {
  strategy: string;
  provider: string;
  apiKey: string;
  daemonAgent: string;
  daemonModel: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  strategy: "mock",
  provider: "gemini",
  apiKey: "",
  daemonAgent: "opencode",
  daemonModel: "opencode/big-pickle",
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem("slidecentral-settings");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [strategy, setStrategy] = useState(DEFAULT_SETTINGS.strategy);
  const [provider, setProvider] = useState(DEFAULT_SETTINGS.provider);
  const [apiKey, setApiKey] = useState(DEFAULT_SETTINGS.apiKey);
  const [daemonAgent, setDaemonAgent] = useState(DEFAULT_SETTINGS.daemonAgent);
  const [daemonModel, setDaemonModel] = useState(DEFAULT_SETTINGS.daemonModel);

  const [daemonStatus, setDaemonStatus] = useState<"checking" | "up" | "down">("checking");
  const [daemonError, setDaemonError] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    output?: string;
    durationMs?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setSaved(s);
    setStrategy(s.strategy);
    setProvider(s.provider);
    setApiKey(s.apiKey);
    setDaemonAgent(s.daemonAgent ?? "opencode");
    setDaemonModel(s.daemonModel ?? "opencode/big-pickle");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setDaemonStatus("checking");
    setDaemonError("");
    const controller = new AbortController();
    fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: "daemon" }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { healthy: boolean }) => {
        if (!controller.signal.aborted) {
          setDaemonStatus(data.healthy ? "up" : "down");
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setDaemonStatus("down");
          setDaemonError(err.message ?? "Cannot reach daemon");
        }
      });
    return () => controller.abort();
  }, [mounted]);

  const hasChanges =
    strategy !== saved.strategy ||
    provider !== saved.provider ||
    apiKey !== saved.apiKey ||
    daemonAgent !== (saved.daemonAgent ?? "opencode") ||
    daemonModel !== (saved.daemonModel ?? "opencode/big-pickle");

  const keyIsSet = saved.apiKey.length > 0;
  const keyIsPopulated = apiKey.length > 0;

  const save = () => {
    const next: SettingsState = { strategy, provider, apiKey, daemonAgent, daemonModel };
    localStorage.setItem("slidecentral-settings", JSON.stringify(next));
    window.location.reload();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header with back arrow */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/briefing"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-cpf-green)] hover:text-[var(--color-cpf-green)]"
          title="Back to current deck"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8L10 13" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-fg)]">AI Settings</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
            Configure the AI backend and provider keys
          </p>
        </div>
      </div>

      {/* Backend Strategy */}
      <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Backend Strategy
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {STRATEGIES.map((s) => {
            const isSaved = saved.strategy === s.id;
            const isSelected = strategy === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={`rounded border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-fg)]">{s.label}</span>
                  {isSaved && mounted && (
                    <span className="rounded bg-[var(--color-cpf-green)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[var(--color-muted)]">{s.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* LLM Provider (shown when llm strategy selected) */}
      {strategy === "llm" && (
        <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Provider
          </h2>

          {/* Included (free tier) */}
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Included
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {FREE_PROVIDERS.map((p) => {
                const isSaved = saved.strategy === "llm" && saved.provider === p.id;
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`rounded border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-fg)]">{p.label}</span>
                      {isSaved && (
                        <span className="rounded bg-[var(--color-cpf-green)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">
                      {p.model}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BYOK */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Bring Your Own Key
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {BYOK_PROVIDERS.map((p) => {
                const isSaved = saved.strategy === "llm" && saved.provider === p.id;
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`rounded border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-fg)]">{p.label}</span>
                      {isSaved && (
                        <span className="rounded bg-[var(--color-cpf-green)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">
                      {p.model}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div className="mt-5 border-t border-[var(--color-border)] pt-5">
            <label className="mb-1 block text-sm font-medium text-[var(--color-fg-soft)]">
              API Key
            </label>
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Required for BYOK providers. Stored locally in your browser.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-cpf-paper)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none"
            />
            {keyIsSet && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-[var(--color-cpf-green)]" />
                <span className="text-[var(--color-cpf-green)]">
                  Key saved
                </span>
              </div>
            )}
            {!keyIsSet && keyIsPopulated && (
              <div className="mt-2 text-xs text-[var(--color-orange)]">
                Save to store this key
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daemon + Agent (shown when daemon strategy selected) */}
      {strategy === "daemon" && (
        <>
          {/* Daemon agent picker */}
          <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Coding Agent
            </h2>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              The daemon spawns this agent to read your files and generate slides.
              Must be installed and on your <code className="rounded bg-[var(--color-cpf-mint)] px-1 py-0.5 font-mono text-[10px]">PATH</code>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {DAEMON_AGENTS_UNIQUE.map((a) => {
                const isSaved = saved.strategy === "daemon" && saved.daemonAgent === a.id;
                const isSelected = daemonAgent === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setDaemonAgent(a.id)}
                    className={`rounded border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-fg)]">{a.label}</span>
                      {isSaved && mounted && (
                        <span className="rounded bg-[var(--color-cpf-green)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-cpf-green)]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">{a.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Model selector */}
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Model
              </h3>
              <p className="mb-3 text-[10px] text-[var(--color-muted)]">
                Choose which model the agent uses. All listed models are free tier.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FREE_MODELS.map((m) => {
                  const isSaved = saved.strategy === "daemon" && saved.daemonModel === m.id;
                  const isSelected = daemonModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setDaemonModel(m.id)}
                      className={`rounded border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--color-cpf-green)] bg-[var(--color-cpf-mint)] ring-1 ring-[var(--color-cpf-green)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--color-fg)]">{m.label}</span>
                        {isSaved && mounted && (
                          <span className="rounded bg-[var(--color-cpf-green)]/15 px-1 py-0.5 text-[9px] font-medium text-[var(--color-cpf-green)]">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">{m.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Connection */}
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-[var(--color-fg-soft)]">
                    Test Connection
                  </h3>
                  <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                    Sends a simple prompt through the daemon to verify the agent works.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setTesting(true);
                    setTestResult(null);
                    try {
                      const res = await fetch("/api/test-daemon", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentId: daemonAgent }),
                      });
                      const data = await res.json() as {
                        success: boolean;
                        output?: string;
                        agent?: string;
                        durationMs?: number;
                        error?: string;
                      };
                      setTestResult({
                        success: data.success,
                        output: data.output,
                        durationMs: data.durationMs,
                        error: data.error,
                      });
                    } catch (err) {
                      setTestResult({
                        success: false,
                        error: err instanceof Error ? err.message : "Request failed",
                      });
                    } finally {
                      setTesting(false);
                    }
                  }}
                  disabled={testing}
                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)] disabled:cursor-wait disabled:opacity-60"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-3 rounded border p-3 text-xs ${
                    testResult.success
                      ? "border-[var(--color-cpf-green)]/40 bg-[var(--color-cpf-mint)]"
                      : "border-red-300 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        testResult.success ? "text-[var(--color-cpf-green)]" : "text-red-600"
                      }
                    >
                      {testResult.success ? "Test passed" : "Test failed"}
                    </span>
                    {testResult.durationMs != null && (
                      <span className="text-[var(--color-muted)]">
                        in {(testResult.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  {testResult.output && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-fg-soft)]">
                        Raw output
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-surface)] p-2 font-mono text-[10px] text-[var(--color-fg)] border border-[var(--color-border)]">
                        {testResult.output}
                      </pre>
                    </details>
                  )}
                  {testResult.error && (
                    <p className="mt-1 text-red-500">{testResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Daemon Status */}
          <div className="mb-8 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Daemon Status
            </h2>
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  daemonStatus === "checking"
                    ? "bg-[var(--color-muted)] animate-pulse"
                    : daemonStatus === "up"
                      ? "bg-[var(--color-cpf-green)]"
                      : "bg-red-500"
                }`}
              />
              <span className="text-sm text-[var(--color-fg-soft)]">
                {daemonStatus === "checking" && "Checking..."}
                {daemonStatus === "up" && "Daemon is running"}
                {daemonStatus === "down" && "Daemon is not reachable"}
              </span>
            </div>
            {daemonError && (
              <p className="mt-2 text-xs text-red-500">{daemonError}</p>
            )}
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Expected at localhost:7456. Run{" "}
              <code className="rounded bg-[var(--color-cpf-mint)] px-1 py-0.5 font-mono text-[10px]">pnpm tools-dev</code>{" "}
              in{" "}
              <code className="rounded bg-[var(--color-cpf-mint)] px-1 py-0.5 font-mono text-[10px]">referenceRepos/open-design-main</code>.
            </p>
          </div>
        </>
      )}

      {/* Save area */}
      <div className="flex items-center justify-between self-end">
        {hasChanges ? (
          <span className="mr-4 text-xs text-[var(--color-orange)]">
            Unsaved changes
          </span>
        ) : (
          <span className="mr-4 text-xs text-[var(--color-cpf-green)]">
            Up to date
          </span>
        )}
        <button
          onClick={save}
          disabled={!hasChanges}
          className="rounded bg-[var(--color-cpf-green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-cpf-green-dim)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Settings
        </button>
      </div>

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
