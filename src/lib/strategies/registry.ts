import type { BackendStrategy, StrategyOptions } from "./types";
import type { BriefingData, SlideOutline } from "@/lib/types";
import { generateMockOutline } from "./mock";

const strategies: Record<string, BackendStrategy> = {
  mock: {
    id: "mock",
    async generateOutline(briefing: BriefingData): Promise<SlideOutline[]> {
      // Simulate a brief AI processing delay
      await new Promise((r) => setTimeout(r, 800));
      return generateMockOutline(briefing);
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
  },

  daemon: {
    id: "daemon",
    async generateOutline(_briefing: BriefingData): Promise<SlideOutline[]> {
      throw new Error("Daemon backend not implemented — available in Phase 4");
    },
    async healthCheck(): Promise<boolean> {
      return false;
    },
  },

  llm: {
    id: "llm",
    async generateOutline(_briefing: BriefingData, _opts?: StrategyOptions): Promise<SlideOutline[]> {
      throw new Error("LLM backend not implemented — available in Phase 5");
    },
    async healthCheck(): Promise<boolean> {
      return false;
    },
  },
};

export function getStrategy(id: string): BackendStrategy {
  const strategy = strategies[id];
  if (!strategy) throw new Error(`Unknown strategy: ${id}`);
  return strategy;
}

export function getAvailableStrategies(): BackendStrategy[] {
  return Object.values(strategies);
}
