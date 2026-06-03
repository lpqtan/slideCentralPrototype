"use client";

import { useState, useEffect, useCallback } from "react";

type MongoStatus = "checking" | "up" | "down";

export function useMongoStatus() {
  const [status, setStatus] = useState<MongoStatus>("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/health/mongo");
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

  return { status };
}
