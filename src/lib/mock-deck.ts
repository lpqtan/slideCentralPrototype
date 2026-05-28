import type { SlideContent, BriefingData, GenerationSource, SavedDeck } from "@/lib/types";

export function createMockDeck(): SavedDeck {
  const briefing: BriefingData = {
    objective: "approval",
    audience: "exco",
    mode: "presenting",
    keyMessage: "Member engagement has declined 12% year-on-year, requiring a S$2.4m digital outreach programme to reverse the trend.",
    audienceAsk: "Approve budget allocation of S$500k for Q3 outreach pilots and nominate a department lead by end of month.",
    narrativeArc: "proposal",
    selectedLayouts: [],
    slideCount: 8,
  };

  const slides: SlideContent[] = [
    {
      slideNumber: 1,
      title: "Reversing the Engagement Decline",
      suggestedLayout: "cover",
      contentPrompt: "",
      estimatedMinutes: 1,
      bodyContent: "CPF Board Digital Transformation\nQuarterly Strategy Review",
      imageUrl: "",
    },
    {
      slideNumber: 2,
      title: "Member Engagement Is Down 12% Year-on-Year",
      suggestedLayout: "bullet-list",
      contentPrompt: "",
      estimatedMinutes: 2,
      bodyContent:
        "Active portal users dropped from 1.2M to 1.06M in 12 months\n" +
        "Mobile app monthly active users declined 18%\n" +
        "Email open rates fell from 34% to 22%\n" +
        "In-person service visits increased 8% — reversing the digitisation trend\n" +
        "Member satisfaction scores dipped below target for first time in 3 years",
      imageUrl: "",
    },
    {
      slideNumber: 3,
      title: "Root Cause: Our Channels Haven't Kept Up with Member Expectations",
      suggestedLayout: "two-column",
      contentPrompt: "",
      estimatedMinutes: 2,
      bodyContent:
        "Before: Portal built in 2019 — mobile-unfriendly\n" +
        "Before: No personalised content or recommendations\n" +
        "Before: Paper-based communications still 40% of outreach\n" +
        "After: Seamless mobile-first experience\n" +
        "After: Personalised financial planning tools\n" +
        "After: Real-time notifications on policy changes\n" +
        "After: Chat and video support options",
      imageUrl: "",
    },
    {
      slideNumber: 4,
      title: "Key Metrics: Where We Stand vs. Where We Need to Be",
      suggestedLayout: "kpi-dashboard",
      contentPrompt: "",
      estimatedMinutes: 1.5,
      bodyContent:
        "1.2M: Active Users (target 1.5M)\n" +
        "22%: Email Open Rate (target 40%)\n" +
        "40%: Paper Comms (target 10%)\n" +
        "3.2/5: Satisfaction (target 4.0/5)",
      imageUrl: "",
    },
    {
      slideNumber: 5,
      title: "Proposed Solution: S$2.4m Digital Outreach Programme",
      suggestedLayout: "process-pipeline",
      contentPrompt: "",
      estimatedMinutes: 2,
      bodyContent:
        "Phase 1: Mobile Portal Redesign (Q3)\n" +
        "Phase 2: Personalised Member Dashboard (Q4)\n" +
        "Phase 3: AI-Powered Chat Support (Q1 2027)\n" +
        "Phase 4: Digital-First Communications Hub (Q2 2027)\n" +
        "Phase 5: Continuous Analytics & Feedback Loop (Ongoing)",
      imageUrl: "",
    },
    {
      slideNumber: 6,
      title: "S$2.4m Investment • S$8.2m Projected Savings Over 3 Years",
      suggestedLayout: "big-stat",
      contentPrompt: "",
      estimatedMinutes: 1,
      bodyContent:
        "3.4x ROI\n" +
        "S$2.4m investment yields S$8.2m in operational savings over 3 years through reduced paper, postage, and in-person service costs",
      imageUrl: "",
    },
    {
      slideNumber: 7,
      title: "Implementation Timeline and Key Milestones",
      suggestedLayout: "timeline",
      contentPrompt: "",
      estimatedMinutes: 1.5,
      bodyContent:
        "Q3 2026 | Vendor Selection | UX research, architecture design\n" +
        "Q4 2026 | Mobile Portal MVP | Member testing and iteration\n" +
        "Q1 2027 | Dashboard Rollout | 50% paper reduction, training\n" +
        "Q2 2027 | Chat Support Launch | Full digital comms, analytics\n" +
        "Q3 2027 | Continuous Improvement | Annual review and optimisation",
      imageUrl: "",
    },
    {
      slideNumber: 8,
      title: "Decision Required Today",
      suggestedLayout: "closing",
      contentPrompt: "",
      estimatedMinutes: 1,
      bodyContent:
        "1. Approve S$500k Q3 budget allocation\n" +
        "2. Nominate programme lead by 30 June\n" +
        "3. Commit to quarterly progress reviews\n\n" +
        "Thank you. Questions?",
      imageUrl: "",
    },
  ];

  const now = Date.now();

  const source: GenerationSource = {
    strategy: "mock",
    timestamp: now,
  };

  const id = `mock-demo-${now}`;

  return {
    id,
    name: "Member Engagement Strategy (Demo)",
    createdAt: now,
    updatedAt: now,
    briefing,
    outline: slides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.title,
      suggestedLayout: s.suggestedLayout,
      bodyContent: s.bodyContent ?? "",
      contentPrompt: s.contentPrompt,
      estimatedMinutes: s.estimatedMinutes,
    })),
    slides,
    htmlContent: null,
    source,
    status: "outline",
  };
}
