import type { SlideContent } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";

function getLayoutClass(id: string): string {
  switch (id) {
    case "cover": return "slide hero dark cover";
    case "section-divider": return "slide hero light divider";
    case "bullet-list": return "slide light bullets";
    case "content-image-60-40": return "slide light content-image";
    case "image-content-40-60": return "slide light image-content";
    case "big-stat": return "slide hero dark big-stat";
    case "kpi-dashboard": return "slide light kpi-dashboard";
    case "two-column": return "slide light two-column";
    case "timeline": return "slide light timeline";
    case "quote-testimonial": return "slide hero dark quote";
    case "process-pipeline": return "slide light pipeline";
    case "data-table": return "slide light data-table";
    case "org-chart": return "slide light org-chart";
    case "sidebar-bullets": return "slide light sidebar-bullets";
    case "full-bleed-image": return "slide full-bleed-image";
    case "closing": return "slide hero dark closing";
    default: return "slide light";
  }
}

function slideHtml(slide: SlideContent, index: number, _total: number): string {
  const layoutClass = getLayoutClass(slide.layoutOverride ?? slide.suggestedLayout);
  const body = slide.bodyContent || "";
  const lines = body.split("\n").filter(Boolean);

  if (slide.layoutOverride === "cover" || slide.suggestedLayout === "cover") {
    return `<section class="${layoutClass} active" data-slide="${index + 1}">
  <div class="cover-frame">
    <div class="cover-tag">Central Provident Fund Board</div>
    <h1 class="h-cover">${escapeHtml(slide.title)}</h1>
    <div class="title-rule"></div>
    ${lines.length > 0 ? `<p class="subtitle">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
  </div>
  <div class="cover-band">
    <div class="band-meta">CPF Board</div>
  </div>
</section>`;
  }

  if (slide.layoutOverride === "section-divider" || slide.suggestedLayout === "section-divider") {
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="divider-frame">
    <div class="chapter-tag">Section</div>
    <h2 class="h-chapter">${escapeHtml(slide.title)}</h2>
    <div class="title-rule"></div>
    ${lines.length > 0 ? `<p class="subtitle" style="color:var(--fg-soft);max-width:34em;margin-top:1cqh">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
  </div>
  <div class="divider-band"></div>
  <div class="slide-foot" style="color:rgba(255,255,255,.7)">
    <span>${escapeHtml(slide.title)}</span>
    <span class="counter"></span>
  </div>
</section>`;
  }

  if (slide.layoutOverride === "big-stat" || slide.suggestedLayout === "big-stat") {
    const stat = lines[0] || "—";
    const label = lines[1] || slide.title;
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="stat-frame">
    <div class="big-stat-number">${escapeHtml(stat)}</div>
    <p class="big-stat-label">${escapeHtml(label)}</p>
  </div>
  <div class="slide-foot" style="color:rgba(255,255,255,.7)">
    <span>${escapeHtml(slide.title)}</span>
    <span class="counter"></span>
  </div>
</section>`;
  }

  if (slide.layoutOverride === "quote-testimonial" || slide.suggestedLayout === "quote-testimonial") {
    const quote = body || slide.contentPrompt;
    const attribution = lines[1] || "";
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <blockquote class="quote-text">${escapeHtml(quote)}</blockquote>
  ${attribution ? `<cite class="quote-cite">${escapeHtml(attribution)}</cite>` : ""}
  <div class="slide-foot" style="color:rgba(255,255,255,.7)">
    <span>${escapeHtml(slide.title)}</span>
    <span class="counter"></span>
  </div>
</section>`;
  }

  if (slide.layoutOverride === "closing" || slide.suggestedLayout === "closing") {
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="cover-frame">
    <h1 class="h-cover">${escapeHtml(slide.title)}</h1>
    <div class="title-rule"></div>
    ${lines.length > 0 ? `<p class="subtitle">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
  </div>
  <div class="cover-band">
    <div class="band-meta">Thank you</div>
  </div>
</section>`;
  }

  // Default: light content slide with bullet list
  const layoutInfo = LAYOUTS.find(
    (l) => l.id === (slide.layoutOverride ?? slide.suggestedLayout)
  );
  const layoutName = layoutInfo?.name ?? "Content";

  return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <div class="kicker">${escapeHtml(layoutName)}</div>
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      ${lines.length > 0 ? `<ul class="bullets">
${lines.map((l) => `        <li>${escapeHtml(l)}</li>`).join("\n")}
      </ul>` : `<p class="lead" style="margin-bottom:3cqh">${escapeHtml(slide.contentPrompt)}</p>`}
    </div>
  </div>
  <div class="slide-foot">
    <span>${escapeHtml(slide.title)}</span>
    <span class="counter"></span>
  </div>
</section>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DECK_CSS = `
:root{
  --cpf-green:#045941;--cpf-green-rgb:4,89,65;--cpf-green-deep:#034735;--cpf-green-dim:#0b6b50;
  --cpf-mint:#E8F1ED;--cpf-mint-rgb:232,241,237;--cpf-paper:#F3F7F4;
  --surface:#FFFFFF;--fg:#1A1A1A;--fg-soft:#3A3A3A;--muted:#6B6B6B;
  --border:#D6E2DC;--border-strong:#B7CDC2;
  --pine-green:#134F4E;--turquoise:#1AA594;--lime:#A5CF4C;--orange:#E69324;--gold:#FFE07F;
  --font-display:"Roboto",system-ui,sans-serif;--font-body:"Roboto",system-ui,sans-serif;
  --font-mono:ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:var(--cpf-mint);color:var(--fg);font-family:var(--font-body);-webkit-font-smoothing:antialiased}
#deck{display:flex;width:100%;height:1080px;overflow:hidden}
.slide{flex:0 0 1920px;width:1920px;height:1080px;position:relative;overflow:hidden;container-type:size;container-name:slide}
.slide:not(.active){display:none!important}
.slide.light{background:var(--cpf-mint)}
.slide.hero.dark{background:var(--cpf-green);color:#fff}
.slide.hero.light{background:var(--surface)}
.design-bar{position:absolute;top:0;left:0;right:0;height:24px;background:var(--cpf-green)}
.frame{position:absolute;inset:24px 80px 60px 80px;display:flex;flex-direction:column}
.frame-header{margin-bottom:3cqh}
.frame-body{flex:1;overflow-y:auto}
.kicker{font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--cpf-green);font-weight:500}
.h-cover{font-family:var(--font-display);font-weight:900;font-size:90px;line-height:1.15;max-width:28em;margin:0}
.h-chapter{font-family:var(--font-display);font-weight:900;font-size:70px;line-height:1.1;margin:0}
.h-section{font-family:var(--font-display);font-weight:700;font-size:44px;line-height:1.2;max-width:24em;margin:0}
.subtitle{font-family:var(--font-body);font-weight:300;font-size:32px;line-height:1.5;color:rgba(255,255,255,.85);max-width:28em;margin-top:2cqh}
.title-rule{width:80px;height:4px;background:var(--cpf-green);margin:2.5cqh 0}
.hero.dark .title-rule{background:rgba(255,255,255,.4)}
.hero.light .title-rule{background:var(--cpf-green)}
.cover-frame{position:absolute;inset:80px 80px 120px 80px;display:flex;flex-direction:column;justify-content:center}
.cover-tag{font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.12em;opacity:.65;margin-bottom:1.5cqh}
.cover-band{position:absolute;bottom:0;left:0;right:0;height:52px;background:rgba(0,0,0,.18);display:flex;align-items:center;padding:0 80px}
.band-meta{font-family:var(--font-mono);font-size:13px;opacity:.7}
.divider-frame{position:absolute;inset:80px 80px 0 80px;display:flex;flex-direction:column;justify-content:center}
.chapter-tag{font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:1.5cqh}
.divider-band{position:absolute;bottom:0;left:0;right:0;height:25%;background:var(--cpf-green)}
.bullets{list-style:none;padding:0;margin:0}
.bullets li{font-family:var(--font-body);font-size:22px;line-height:1.6;padding:.4em 0;padding-left:2em;position:relative;color:var(--fg-soft)}
.bullets li::before{content:"1.";counter-increment:none;position:absolute;left:0;font-family:var(--font-mono);font-weight:700;color:var(--cpf-green)}
.lead{font-family:var(--font-body);font-weight:300;font-size:28px;line-height:1.5;color:var(--fg-soft);max-width:44em}
.slide-foot{position:absolute;bottom:12px;left:40px;right:40px;display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:var(--muted);opacity:.6}
.slide-foot .counter::before{content:"Slide "counter(slide)" of "}
.hero.dark .slide-foot{color:rgba(255,255,255,.6)}
.stat-frame{position:absolute;inset:80px 80px 60px 80px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.big-stat-number{font-family:var(--font-display);font-weight:900;font-size:120px;line-height:1;margin-bottom:2cqh}
.big-stat-label{font-family:var(--font-body);font-weight:300;font-size:28px;max-width:20em;opacity:.85}
.quote-text{font-family:var(--font-display);font-weight:300;font-style:italic;font-size:42px;line-height:1.4;max-width:24em;margin:0 auto;position:absolute;inset:120px 80px 120px 80px;display:flex;align-items:center}
.quote-cite{position:absolute;bottom:80px;right:80px;font-family:var(--font-mono);font-size:16px;opacity:.7}
`;

export function buildDeckHtml(slides: SlideContent[]): string {
  const slideSections = slides.map((s, i) => slideHtml(s, i, slides.length)).join("\n\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CPF Presentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400&display=swap" rel="stylesheet">
<style>${DECK_CSS}
.deck-shell{width:100vw;height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;background:var(--cpf-mint)}
.deck-shell .stage{width:1920px;height:1080px;transform-origin:center center}
</style>
</head>
<body>
<div class="deck-shell" id="shell">
<div class="stage" id="stage">
<div id="deck">
${slideSections}
</div>
</div>
</div>
<div class="deck-nav">
  <button class="deck-nav-btn" id="prev-btn" aria-label="Previous">◂</button>
  <span class="deck-nav-counter" id="nav-counter">1 / ${slides.length}</span>
  <button class="deck-nav-btn" id="next-btn" aria-label="Next">▸</button>
</div>
<script>
(function(){
  var slides=document.querySelectorAll('.slide');
  var current=0;
  var total=${slides.length};
  var counter=document.getElementById('nav-counter');
  var stage=document.getElementById('stage');

  if(slides.length===0)return;
  slides[0].classList.add('active');

  function fit(){
    var s=Math.min(window.innerWidth/1920, window.innerHeight/1080);
    stage.style.transform='scale('+s+')';
  }
  fit();
  window.addEventListener('resize',fit);

  function go(i){
    if(i<0||i>=total)return;
    slides[current].classList.remove('active');
    slides[i].classList.add('active');
    current=i;
    counter.textContent=(i+1)+' / '+total;
  }

  document.getElementById('prev-btn').addEventListener('click',function(){go(current-1)});
  document.getElementById('next-btn').addEventListener('click',function(){go(current+1)});

  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '){e.preventDefault();go(current+1)}
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(current-1)}
    if(e.key==='Home'){e.preventDefault();go(0)}
    if(e.key==='End'){e.preventDefault();go(total-1)}
  });

  var startX=0;
  document.addEventListener('touchstart',function(e){startX=e.touches[0].clientX});
  document.addEventListener('touchend',function(e){
    var dx=startX-e.changedTouches[0].clientX;
    if(Math.abs(dx)>50){go(current+(dx>0?1:-1))}
  });

  document.addEventListener('wheel',function(e){
    if(e.deltaX!==0||Math.abs(e.deltaX)>Math.abs(e.deltaY)){
      if(e.deltaX>30||e.deltaY>30){go(current+1)}
      else if(e.deltaX<-30||e.deltaY<-30){go(current-1)}
    }
  },{passive:true});
})();
</script>
<style>
.deck-nav{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;box-shadow:0 2px 8px rgba(0,0,0,.08);z-index:100}
.deck-nav-btn{background:none;border:none;font-size:18px;color:var(--cpf-green);cursor:pointer;padding:2px 6px;border-radius:4px;font-family:var(--font-mono)}
.deck-nav-btn:hover{background:var(--cpf-mint)}
.deck-nav-counter{font-family:var(--font-mono);font-size:12px;color:var(--fg-soft)}
</style>
</body>
</html>`;
}
