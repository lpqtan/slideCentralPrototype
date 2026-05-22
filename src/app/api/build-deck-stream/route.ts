import { findAgent, parseSseStream } from "@/lib/strategies/daemon";
import type { SlideContent, BriefingData } from "@/lib/types";

const DAEMON_URL = process.env.DAEMON_URL ?? "http://localhost:7456";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function daemonPost(path: string, body: unknown) {
  const res = await fetch(`${DAEMON_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Daemon ${res.status} at ${path}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function sse(ctrl: ReadableStreamDefaultController, event: string, data: unknown) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${json}\n\n`));
  }

  const stream = new ReadableStream({
    async start(controller) {
      let aborted = false;
      request.signal?.addEventListener("abort", () => { aborted = true; });

      try {
        const body = await request.json();
        const {
          slides,
          briefing,
          agentId,
          model,
        } = body as {
          slides: SlideContent[];
          briefing: BriefingData;
          agentId?: string;
          model?: string;
        };

        if (!slides?.length) {
          sse(controller, "error", { message: "No slides to build" });
          controller.close();
          return;
        }

        const agent = agentId ?? (await findAgent());
        const projectId = `deck-${Date.now().toString(36)}`;

        sse(controller, "status", { stage: "setup", message: "Creating project..." });

        // 1. Create project with deck skill
        await daemonPost("/api/projects", {
          id: projectId,
          name: "CPF Presentation",
          skillId: "simple-deck",
          metadata: { kind: "deck", speakerNotes: false, animations: false },
        });

        sse(controller, "status", { stage: "setup", message: "Uploading outline..." });

        // 2. Upload outline as formatted markdown
        const outlineMd = slides
          .map(
            (s, i) =>
              `## Slide ${i + 1}: ${s.title}\n` +
              `- **Layout:** ${s.suggestedLayout}\n` +
              `- **Content Prompt:** ${s.contentPrompt}\n` +
              (s.bodyContent ? `- **Body:**\n${s.bodyContent.split("\n").map((l) => `  - ${l}`).join("\n")}\n` : "")
          )
          .join("\n");

        await daemonPost(`/api/projects/${projectId}/files`, {
          name: "outline.md",
          content: outlineMd,
        });

        sse(controller, "status", { stage: "setup", message: "Uploading brand spec..." });

        // 3. Upload brand instructions
        const brandSpec = `# CPF Brand Spec
## Primary Palette
- CPF Green: #045941
- CPF Mint: #E8F1ED
- CPF Paper: #F3F7F4
- Text: #1A1A1A
- Muted: #6B6B6B
- Border: #D6E2DC

## Typography
- Font: Roboto (loaded from Google Fonts)
- Display: 700 (Bold) for headlines, cover titles, big stats
- Body: 400 (Regular) for sub-heads, paragraphs
- Light: 300 for subtitles, long body
- Mono: ui-monospace for slide counter, kicker, metadata

## Rules
1. Mint backgrounds for inside pages, never pure white
2. CPF green is a panel color, not body text
3. Design bar at top of inside pages: 24px solid CPF green
4. No drop shadows — flat design
5. Cards: 1px border, square corners
6. One accent color per slide
7. Slide counter footer: "Slide X of YY" in mono font
8. Section divider has motif/green band at bottom 25%
9. Cover and closing are dark green with mint footer band
10. British English throughout`;

        await daemonPost(`/api/projects/${projectId}/files`, {
          name: "brand-spec.md",
          content: brandSpec,
        });

        sse(controller, "status", { stage: "setup", message: "Uploading content principles..." });

        // 4. Upload content principles
        const instructions = `# Slide Creation Principles
1. Each slide title states an insight, not a label
2. One idea per slide
3. Use numbered lists, not bullets
4. Open with the answer, not the buildup
5. Slide titles must read as an executive summary end-to-end
6. 1-2 minutes per presented slide`;

        await daemonPost(`/api/projects/${projectId}/files`, {
          name: "instructions.md",
          content: instructions,
        });

        sse(controller, "status", { stage: "building", message: `Agent '${agent}' building deck...` });

        // 5. Build the prompt
        const systemPrompt = `You are an expert presentation designer for CPF (Central Provident Fund Board).

## CRITICAL: Framework Must Be Copied Verbatim
The HTML framework below is load-bearing. Copy it EXACTLY.
You may ONLY edit content inside SLOT-marked areas.
Do NOT rewrite the scale-to-fit, keyboard navigation, slide visibility toggle, counter, or print rules.

## Deck Framework (COPY VERBATIM)
\`\`\`html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CPF Presentation</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400&display=swap" rel="stylesheet">
<style>
:root{
  --cpf-green:#045941;--cpf-mint:#E8F1ED;--cpf-paper:#F3F7F4;
  --surface:#FFFFFF;--fg:#1A1A1A;--fg-soft:#3A3A3A;--muted:#6B6B6B;
  --border:#D6E2DC;--border-strong:#B7CDC2;
  --font-display:"Roboto",system-ui,sans-serif;--font-body:"Roboto",system-ui,sans-serif;
  --font-mono:ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:var(--cpf-mint);color:var(--fg);font-family:var(--font-body);-webkit-font-smoothing:antialiased}
.deck-shell{width:100vw;height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;background:var(--cpf-mint)}
.deck-shell .stage{width:1920px;height:1080px;transform-origin:center center}
#deck{display:flex;width:100%;height:1080px;overflow:hidden}
.slide{flex:0 0 1920px;width:1920px;height:1080px;position:relative;overflow:hidden}
.slide:not(.active){display:none!important}
/* SLOT: per-deck styles — typography, layout classes, dark/light themes */
SLOT: per-deck styles
</style>
</head>
<body>
<div class="deck-shell" id="shell">
<div class="stage" id="stage">
<div id="deck">
<!-- SLOT: slides — <section class="slide active"> blocks -->
SLOT: slides
</div>
</div>
</div>
<div class="deck-nav">
  <button class="deck-nav-btn" id="prev-btn">◂</button>
  <span class="deck-nav-counter" id="nav-counter">1</span>
  <button class="deck-nav-btn" id="next-btn">▸</button>
</div>
<script>
(function(){
  var slides=document.querySelectorAll('.slide');
  var current=0,total=slides.length;
  var counter=document.getElementById('nav-counter');
  var stage=document.getElementById('stage');
  if(!slides.length)return;
  slides[0].classList.add('active');
  function fit(){var s=Math.min(window.innerWidth/1920,window.innerHeight/1080);stage.style.transform='scale('+s+')';}
  fit();window.addEventListener('resize',fit);
  function go(i){if(i<0||i>=total)return;slides[current].classList.remove('active');slides[i].classList.add('active');current=i;counter.textContent=(i+1)+' / '+total;}
  document.getElementById('prev-btn').addEventListener('click',function(){go(current-1)});
  document.getElementById('next-btn').addEventListener('click',function(){go(current+1)});
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '){e.preventDefault();go(current+1)}
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(current-1)}
    if(e.key==='Home'){e.preventDefault();go(0)}
    if(e.key==='End'){e.preventDefault();go(total-1)}
  },{capture:true});
})();
</script>
<style>
.deck-nav{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;box-shadow:0 2px 8px rgba(0,0,0,.08);z-index:100}
.deck-nav-btn{background:none;border:none;font-size:18px;color:var(--cpf-green);cursor:pointer;padding:2px 6px;border-radius:4px;font-family:var(--font-mono)}
.deck-nav-btn:hover{background:var(--cpf-mint)}
.deck-nav-counter{font-family:var(--font-mono);font-size:12px;color:var(--fg-soft)}
</style>
</body>
</html>
\`\`\`

## Task
1. Read outline.md, brand-spec.md, instructions.md from the project files
2. Replace SLOT: slides with properly styled <section class="slide active"> blocks
3. Replace SLOT: per-deck styles with CPF-themed CSS (dark covers, mint content slides, title styles, design bars, etc.)
4. Each slide must match the brand rules in brand-spec.md
5. Follow the content principles in instructions.md
6. The first slide must be class="slide active"

Write the complete index.html to the project. Replace ONLY the SLOT markers.`;

        const userPrompt = `Build a CPF-branded slide deck from the outline in outline.md.

**Key Message:** ${escapeHtml(briefing.keyMessage || "CPF Presentation")}
**Audience:** ${briefing.audience || "general"}
**Narrative Arc:** ${briefing.narrativeArc || "general"}

Read outline.md, brand-spec.md, and instructions.md first. Then build the complete index.html.`;

        // 6. Start agent
        const chatRes = await fetch(`${DAEMON_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            agentId: agent,
            message: userPrompt,
            systemPrompt,
            projectId,
            model: model || undefined,
          }),
        });

        if (!chatRes.ok) throw new Error(`Daemon chat returned ${chatRes.status}`);
        if (!chatRes.body) throw new Error("No daemon response");

        const reader = chatRes.body.getReader();
        let agentError = "";

        for await (const ev of parseSseStream(reader)) {
          if (aborted) break;
          if (!ev.data) continue;

          if (ev.event === "agent") {
            try {
              const p = JSON.parse(ev.data) as { type?: string; delta?: string; label?: string };
              if (p.type === "status" && p.label) {
                sse(controller, "status", { stage: "building", message: p.label });
              }
              if (p.type === "text_delta" && p.delta) {
                sse(controller, "text_delta", { delta: p.delta });
              }
            } catch { /* skip */ }
          }

          if (ev.event === "stdout") {
            try {
              const p = JSON.parse(ev.data) as { chunk?: string };
              if (p.chunk) {
                sse(controller, "text_delta", { delta: p.chunk });
              }
            } catch { /* skip */ }
          }

          if (ev.event === "error") {
            try { agentError = (JSON.parse(ev.data) as { message?: string }).message ?? "Daemon error"; } catch { agentError = "Daemon error"; }
            break;
          }
          if (ev.event === "end") break;
        }

        if (agentError) throw new Error(agentError);

        sse(controller, "status", { stage: "fetching", message: "Fetching generated deck..." });

        // 7. Fetch the generated HTML
        const fileRes = await fetch(`${DAEMON_URL}/api/projects/${projectId}/files/index.html`);
        let html: string;
        if (fileRes.ok) {
          html = await fileRes.text();
        } else {
          const { buildDeckHtml } = await import("@/lib/deck-builder");
          html = buildDeckHtml(slides);
        }

        if (!html.trim()) {
          const { buildDeckHtml: fallback } = await import("@/lib/deck-builder");
          html = fallback(slides);
        }

        sse(controller, "complete", { html });
        controller.close();
      } catch (error) {
        if (!aborted) {
          sse(controller, "error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
