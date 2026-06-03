// Shared TypeScript types for the Slide Central application

/** Briefing wizard step identifiers */
export type BriefingStep = 1 | 2 | 3 | 4 | 5;

/** Narrative arc types */
export type NarrativeArc = "proposal" | "status" | "teaching";

/** Deck mode */
export type DeckMode = "reading" | "presenting";

/** Objective types */
export type Objective =
  | "approval"
  | "guidance"
  | "showcase"
  | "teaching"
  | "agreement";

/** Audience types */
export type Audience = "exco" | "cmm" | "department" | "working-group" | "public";

/** Layout identifiers from the 16 CPF template layouts */
export type LayoutId =
  | "cover"
  | "section-divider"
  | "bullet-list"
  | "content-image-60-40"
  | "image-content-40-60"
  | "big-stat"
  | "kpi-dashboard"
  | "two-column"
  | "timeline"
  | "quote-testimonial"
  | "process-pipeline"
  | "data-table"
  | "org-chart"
  | "sidebar-bullets"
  | "full-bleed-image"
  | "closing";

/** Backend strategy identifiers */
export type StrategyId = "mock" | "daemon" | "llm" | "opencode-direct";

/** LLM provider identifiers */
export type LLMProviderId = "openai" | "gemini" | "groq" | "openrouter";

/** A section grouping slides under a common heading */
export interface SlideSection {
  id: string;
  title: string;
  slideNumbers: number[];
}

/** A single generated slide outline entry */
export interface SlideOutline {
  slideNumber: number;
  title: string;
  suggestedLayout: LayoutId;
  contentPrompt: string;
  estimatedMinutes: number;
  sectionId?: string;
  needsDiagram?: boolean;
  needsChart?: boolean;
  needsData?: boolean;
  needsPlaceholder?: boolean;
  diagramHint?: string;
  chartHint?: string;
}

/** Complete briefing data collected from the wizard */
export interface BriefingData {
  objective: Objective | null;
  audience: Audience | null;
  mode: DeckMode | null;
  keyMessage: string;
  audienceAsk: string;
  narrativeArc: NarrativeArc | null;
  selectedLayouts: LayoutId[];
  slideCount?: number;
  additionalContent?: string;
}

/** A user-edited slide with filled content */
export interface SlideContent extends SlideOutline {
  bodyContent: string;
  layoutOverride?: LayoutId;
  imageUrl?: string;
}

/** Application settings persisted in localStorage */
export interface AppSettings {
  strategyId: StrategyId;
  llmProviderId: LLMProviderId;
  llmApiKey: string;
  llmModel: string;
}

/** Tracks how the outline was generated */
export interface GenerationSource {
  strategy: string;
  agent?: string;
  model?: string;
  timestamp: number;
  rawOutput?: string;
}

/** A user-added overlay text block on a slide */
export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

/** A saved deck in localStorage */
export interface SavedDeck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  briefing: BriefingData;
  outline: SlideOutline[] | null;
  slides: SlideContent[] | null;
  htmlContent: string | null;
  source: GenerationSource | null;
  status: DeckStatus;
  overlayBlocks?: Record<number, TextBlock[]>;
}

export type DeckStatus =
  | "briefing"    // briefing filled, no outline yet
  | "outline"     // outline generated, editing content
  | "built"       // full deck built, previewing
  | "exported";   // pptx downloaded

/** Build result from the daemon/LLM */
export interface BuildResult {
  html: string;
  artifactId?: string;
}

/** LLM provider metadata */
export interface LLMProviderInfo {
  id: LLMProviderId;
  name: string;
  freeTier: boolean;
  defaultModel: string;
  requiresKey: boolean;
  apiBaseUrl?: string;
}

/** An undo/redo history snapshot */
export interface HistorySnapshot<T> {
  state: T;
  timestamp: number;
}

/** Backend strategy interface */
export interface BackendStrategy {
  id: StrategyId;
  healthCheck(): Promise<boolean>;
  generateOutline(briefing: BriefingData): Promise<SlideOutline[]>;
  buildDeck(outline: SlideContent[], briefing: BriefingData, extraPrompt?: string): Promise<BuildResult>;
}
