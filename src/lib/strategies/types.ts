import type { BriefingData, SlideOutline } from "@/lib/types";

export interface BackendStrategy {
  id: string;
  generateOutline(briefing: BriefingData, opts?: StrategyOptions): Promise<SlideOutline[]>;
  healthCheck(): Promise<boolean>;
}

export interface StrategyOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
}
