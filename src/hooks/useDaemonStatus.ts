"use client";

import { useState, useEffect, useCallback } from "react";

interface DaemonStatus {
  status: "checking" | "up" | "down" | "inactive";
}

function loadDaemonAgent(): string | null {
  try {
    const raw = localStorage.getItem("slidecentral-settings");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.strategy === "daemon") return s.daemonAgent ?? "opencode";
  } catch { /* ignore */ }
  return null;
}

export function useDaemonStatus() {
  const [status, setStatus] = useState<DaemonStatus["status"]>("checking");
  const [agentName, setAgentName] = useState<string | null>(null);

  const check = useCallback(async () => {
    const daemonAgent = loadDaemonAgent();
    if (!daemonAgent) {
      setStatus("inactive");
      return;
    }
    setAgentName(daemonAgent);
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "daemon" }),
      });
      const data = (await res.json()) as { healthy: boolean };
      setStatus(data.healthy ? "up" : "down");
    } catch {
      setStatus("down");
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [check]);

  return { status, agentName };
}
