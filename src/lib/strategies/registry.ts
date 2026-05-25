import type { BackendStrategy } from "./types";
import type { BriefingData, SlideOutline } from "@/lib/types";
import { generateMockOutline } from "./mock";
import daemonStrategy from "./daemon";
import llmStrategy from "./llm";
import opencodeDirectStrategy from "./opencode-direct";

const strategies: Record<string, BackendStrategy> = {
  mock: {
    id: "mock",
    async generateOutline(briefing: BriefingData): Promise<SlideOutline[]> {
      await new Promise((r) => setTimeout(r, 800));
      return generateMockOutline(briefing);
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
  },

  daemon: daemonStrategy,

  llm: llmStrategy,

  "opencode-direct": opencodeDirectStrategy,
};

export function getStrategy(id: string): BackendStrategy {
  const strategy = strategies[id];
  if (!strategy) throw new Error(`Unknown strategy: ${id}`);
  return strategy;
}

export function getAvailableStrategies(): BackendStrategy[] {
  return Object.values(strategies);
}
