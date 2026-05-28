// The 16 CPF-branded slide layout definitions
// Derived from corporate-template-main/index.html
// Each layout maps to a section.class in the HTML template
// and corresponds to a construction function in build-pptx.js

import type { LayoutId } from "./types";

export interface LayoutInfo {
  id: LayoutId;
  name: string;
  description: string;
  /** The CSS class used in the HTML template for this layout */
  cssClass: string;
  /** Whether this layout uses a dark (green) background */
  dark: boolean;
  /** Typical use cases */
  useCases: string[];
  /** What content types this layout expects */
  contentSlots: string[];
}

export const LAYOUTS: LayoutInfo[] = [
  {
    id: "cover",
    name: "Cover",
    description: "Hero slide with title, subtitle, and presenter info on a dark green panel",
    cssClass: "slide hero dark cover",
    dark: true,
    useCases: ["Opening slide", "Title slide"],
    contentSlots: ["Title", "Subtitle", "Date", "Presenter name", "Department"],
  },
  {
    id: "section-divider",
    name: "Section Divider",
    description: "Dark green background with section number and title, motif bar at bottom",
    cssClass: "slide hero dark divider",
    dark: true,
    // Note: dark=true is correct — divider has green background
    useCases: ["Transition between major sections", "Chapter breaks"],
    contentSlots: ["Section number", "Section title"],
  },
  {
    id: "bullet-list",
    name: "Bullet List",
    description: "Clean list layout with title and numbered/bulleted points",
    cssClass: "slide light bullets",
    dark: false,
    useCases: ["Key points", "Recommendations", "Findings", "Action items"],
    contentSlots: ["Title", "Bullet points (numbered)"],
  },
  {
    id: "content-image-60-40",
    name: "Content + Image (60/40)",
    description: "Two-column: 60% content on left, 40% image on right",
    cssClass: "slide light content-image",
    dark: false,
    useCases: ["Explaining a concept with a supporting visual", "Feature showcase"],
    contentSlots: ["Title", "Body text / bullets", "Image placeholder"],
  },
  {
    id: "image-content-40-60",
    name: "Image + Content (40/60)",
    description: "Two-column: 40% image on left, 60% content on right",
    cssClass: "slide light image-content",
    dark: false,
    useCases: ["Visual-led explanation", "Before/after comparison"],
    contentSlots: ["Image placeholder", "Title", "Body text / bullets"],
  },
  {
    id: "big-stat",
    name: "Big Stat",
    description: "Dark green background with a single large metric and supporting label",
    cssClass: "slide hero dark big-stat",
    dark: true,
    useCases: ["Single impactful number", "KPI highlight", "Key result"],
    contentSlots: ["Large number", "Label", "Source / context"],
  },
  {
    id: "kpi-dashboard",
    name: "KPI Dashboard",
    description: "4-stat grid with metrics, labels, and trend indicators",
    cssClass: "slide light kpi-dashboard",
    dark: false,
    useCases: ["Quarterly review", "Performance snapshot", "Scorecard"],
    contentSlots: ["4 × (Metric value, Label, Trend indicator)"],
  },
  {
    id: "two-column",
    name: "Two-Column Comparison",
    description: "Side-by-side columns for comparison views",
    cssClass: "slide light two-column",
    dark: false,
    useCases: ["Pros vs cons", "Before vs after", "Current state vs target state"],
    contentSlots: ["Title", "Left column heading + points", "Right column heading + points"],
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Horizontal timeline with up to 5 milestones",
    cssClass: "slide light timeline",
    dark: false,
    useCases: ["Project roadmap", "Historical progression", "Phase plan"],
    contentSlots: ["Title", "5 × (Date, Milestone, Brief description)"],
  },
  {
    id: "quote-testimonial",
    name: "Quote / Testimonial",
    description: "Dark green background with a prominent quote and attribution",
    cssClass: "slide hero dark quote",
    dark: true,
    useCases: ["Testimonial", "Key message emphasis", "Inspirational close"],
    contentSlots: ["Quote text", "Attribution (name, title)"],
  },
  {
    id: "process-pipeline",
    name: "Process Pipeline",
    description: "5-step horizontal process flow with arrows",
    cssClass: "slide light pipeline",
    dark: false,
    useCases: ["Workflow explanation", "Process overview", "Customer journey"],
    contentSlots: ["Title", "5 × (Step number, Step name, Brief description)"],
  },
  {
    id: "data-table",
    name: "Data Table",
    description: "Full-width table with header row and data rows",
    cssClass: "slide light data-table",
    dark: false,
    useCases: ["Tabular data", "Comparison matrix", "Specifications"],
    contentSlots: ["Title", "Table headers", "Data rows", "Source footnote"],
  },
  {
    id: "org-chart",
    name: "Organisation Chart",
    description: "Hierarchical org chart layout",
    cssClass: "slide light org-chart",
    dark: false,
    useCases: ["Team structure", "Governance model", "Reporting lines"],
    contentSlots: ["Title", "Hierarchical nodes with names and roles"],
  },
  {
    id: "sidebar-bullets",
    name: "Sidebar Bullets",
    description: "5/7 split: narrow sidebar on left, main content on right with bullets",
    cssClass: "slide light sidebar-bullets",
    dark: false,
    useCases: ["Context + detail", "Topic + sub-points"],
    contentSlots: ["Sidebar label/topic", "Title", "Bullet points"],
  },
  {
    id: "full-bleed-image",
    name: "Full-Bleed Image",
    description: "Image fills the entire slide with a caption overlay",
    cssClass: "slide full-bleed-image",
    dark: true,
    useCases: ["Visual impact", "Location/site photo", "Product shot"],
    contentSlots: ["Image", "Caption"],
  },
  {
    id: "closing",
    name: "Closing / Thank You",
    description: "Dark green closing slide with thank you message and contact info",
    cssClass: "slide hero dark closing",
    dark: true,
    useCases: ["Thank you", "Q&A", "Contact information"],
    contentSlots: ["Thank you message", "Contact details", "QA prompt"],
  },
];

/** Look up a layout by its ID */
export function getLayout(id: LayoutId): LayoutInfo {
  const layout = LAYOUTS.find((l) => l.id === id);
  if (!layout) throw new Error(`Unknown layout: ${id}`);
  return layout;
}

/** Group layouts by dark/light for theme rhythm planning */
export function layoutsByTheme(): { dark: LayoutInfo[]; light: LayoutInfo[] } {
  return {
    dark: LAYOUTS.filter((l) => l.dark),
    light: LAYOUTS.filter((l) => !l.dark),
  };
}
