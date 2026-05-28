// CPF Brand Tokens — source of truth for colors, fonts, and styling rules
// Derived from corporate-template-main/brand-spec.md
// Used by Tailwind config (globals.css) and any programmatic rendering

export const BRAND = {
  colors: {
    primary: {
      green: "#045941",
      greenDeep: "#034735",
      greenDim: "#0b6b50",
      mint: "#E8F1ED",
      paper: "#F3F7F4",
    },
    surface: "#FFFFFF",
    text: {
      primary: "#1A1A1A",
      soft: "#3A3A3A",
      muted: "#6B6B6B",
    },
    border: {
      light: "#D6E2DC",
      strong: "#B7CDC2",
    },
    secondary: {
      pineGreen: "#134F4E",
      turquoise: "#1AA594",
      lime: "#A5CF4C",
      orange: "#E69324",
      gold: "#FFE07F",
    },
    status: {
      success: "#A5CF4C",
      warn: "#E69324",
      danger: "#DC2626",
    },
  },

  fonts: {
    display: `'Roboto', system-ui, sans-serif`,
    body: `'Roboto', system-ui, sans-serif`,
    mono: `ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace`,
  },
} as const;

/** Posture rules for maintaining brand consistency */
export const BRAND_RULES = {
  /** 1. Mint backgrounds, never pure white for inside pages */
  backgroundContent: "cpf-mint",

  /** 2. CPF green is a panel color, not body text */
  greenIsPanelNotText:
    "Reserve solid green for hero panels (covers, dividers, big stats, quotes, closing)",

  /** 3. Key motif is decorative wallpaper only */
  motifDecorative:
    "Cropped tight. On dark panels it is the primary visual identity; never lay text over the brightest part of the motif.",

  /** 4. Logo placement */
  logoPlacement: {
    cover: "bottom right of the green panel",
    divider: "top right of the mint area",
    inside: "optional, footer-right",
  },

  /** 5. Design bar at top of inside pages: 24px solid CPF green */
  designBar: "24px solid CPF green band with tiny motif strip on the right",

  /** 6. Section divider motif bar at bottom, ~25% of page */
  dividerMotif: "bottom 25% of page",

  /** 7. No drop shadows — brand is flat */
  noShadows: true,

  /** 8. Cards: hairline borders, no rounded corners on content */
  cardStyle: "1px border, square corners",

  /** 9. One accent color per slide */
  oneAccent: "Single accent from primary or secondary palette",

  /** 10. Slide counter footer: Slide X of YY, bottom-left, mono, low opacity */
  slideCounter: "Slide X of YY • bottom-left • mono font • low opacity",
} as const;

/** Map brand color names to hex values for runtime use */
export function brandColor(name: string): string {
  const parts = name.split(".");
  let current: unknown = BRAND.colors;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : "";
}
