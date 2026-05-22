"use client";

import { useDaemonStatus } from "@/hooks/useDaemonStatus";

export default function DaemonStatusPill() {
  const { status, agentName } = useDaemonStatus();

  if (status === "inactive") return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
        status === "up"
          ? "border-[var(--color-cpf-green)]/40 bg-[var(--color-cpf-green)]/10 text-[var(--color-cpf-green)]"
          : status === "down"
            ? "border-red-300 bg-red-50 text-red-600"
            : "border-[var(--color-border)] bg-[var(--color-cpf-mint)] text-[var(--color-muted)]"
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === "up"
            ? "bg-[var(--color-cpf-green)]"
            : status === "down"
              ? "bg-red-500"
              : "bg-[var(--color-muted)] animate-pulse"
        }`}
      />
      {status === "up"
        ? `Daemon: ${agentName ?? "online"}`
        : status === "down"
          ? "Daemon offline"
          : "Daemon..."}
    </span>
  );
}
