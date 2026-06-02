import type { SlideContent, TextBlock } from "@/lib/types";
import { LAYOUTS } from "@/lib/layouts";
import { LOGO_GREEN_URI, LOGO_WHITE_URI } from "@/lib/logos";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
    case "data-table": return "slide light data-table-layout";
    case "org-chart": return "slide light org-chart-layout";
    case "sidebar-bullets": return "slide light sidebar-bullets";
    case "full-bleed-image": return "slide full-bleed";
    case "closing": return "slide hero dark closing";
    default: return "slide light";
  }
}

function stripListPrefix(line: string): string {
  return line.replace(/^\d+\.\s*/, "");
}

function parseBody(slide: SlideContent): { lines: string[]; body: string } {
  const body = slide.bodyContent && slide.bodyContent.trim() ? slide.bodyContent : fallbackBody(slide);
  const lines = body.split("\n").map((l) => stripListPrefix(l.trim())).filter(Boolean);
  return { lines, body };
}

/** Generate structured body content from contentPrompt when bodyContent is empty */
function fallbackBody(slide: SlideContent): string {
  const layoutId = slide.layoutOverride ?? slide.suggestedLayout;
  const prompt = slide.contentPrompt || "";

  // If user already provided body content, use it
  if (slide.bodyContent && slide.bodyContent.trim()) return slide.bodyContent;

  switch (layoutId) {
    case "kpi-dashboard": {
      // Extract numbers/metrics from prompt and create 4 entries
      const matches = prompt.match(/\d+\.?\d*[%MBKk]?/g) || [];
      const labels = prompt.split(/\d+\./).filter(Boolean).map((s) => s.trim());
      const items: string[] = [];
      for (let i = 0; i < Math.min(4, matches.length); i++) {
        const label = labels[i] || `Metric ${i + 1}`;
        const cleanLabel = label.replace(/^[:\s]+/, "").replace(/\(.*?\)/g, "").trim().slice(0, 30);
        items.push(`${matches[i]}: ${cleanLabel}`);
      }
      if (items.length === 0) items.push("—: Enter metrics here");
      return items.join("\n");
    }
    case "timeline": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const items: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const yearMatch = trimmed.match(/(20\d{2}|Q[1-4]\s*20\d{2})/);
        const year = yearMatch ? yearMatch[0] : "—";
        const rest = trimmed.replace(year, "").replace(/^[:\-\s]+/, "").trim();
        const parts = rest.split(/[:\-–—]/);
        const title = (parts[0] || "").trim().slice(0, 40);
        const desc = (parts[1] || "").trim().slice(0, 60);
        items.push(`${year} | ${title} | ${desc}`);
        if (items.length >= 5) break;
      }
      if (items.length === 0) items.push("— | Title | Description");
      return items.join("\n");
    }
    case "process-pipeline": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const items: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/[:\-–—]/);
        const step = (parts[0] || "").trim().slice(0, 30);
        const desc = (parts[1] || "").trim().slice(0, 60);
        items.push(`${step} | ${desc}`);
        if (items.length >= 5) break;
      }
      if (items.length === 0) items.push("Step | Description");
      return items.join("\n");
    }
    case "two-column": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const items: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.match(/before|current|today/i)) {
          items.push(`Before: ${trimmed.slice(0, 80)}`);
        } else if (trimmed.match(/after|proposed|target|future/i)) {
          items.push(`After: ${trimmed.slice(0, 80)}`);
        } else {
          items.push(trimmed.slice(0, 80));
        }
      }
      if (items.length === 0) items.push("Before: Current state\nAfter: Target state");
      return items.join("\n");
    }
    case "org-chart": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const names: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/[,;]/);
        names.push(parts[0].trim().slice(0, 30));
      }
      if (names.length === 0) names.push("Role");
      const top = names[0] ? `Lead | ${names[0]} | CPF Board` : "Lead | — | CPF Board";
      const children = names.slice(1, 5).map((n, i) => `Lead | ${n} | Team ${i + 1}`);
      while (children.length < 4) children.push(`— | — | —`);
      return [top, ...children].join("\n");
    }
    case "data-table": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const headers: string[] = ["Category", "Value", "Change", "Notes"];
      const rows: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/[:\-–—]/);
        rows.push(parts.map((p) => p.trim().slice(0, 20)).join(" | "));
      }
      if (rows.length === 0) rows.push("— | — | — | —");
      const items = [headers.join(" | "), ...rows.slice(0, 6)];
      return items.join("\n");
    }
    case "sidebar-bullets": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      const contextLines = lines.filter(Boolean).slice(0, 2).map((l) => l.trim().slice(0, 80));
      const bulletLines = lines.filter(Boolean).slice(2).map((l) => l.trim().slice(0, 100));
      return [...contextLines, ...bulletLines].join("\n");
    }
    case "content-image-60-40":
    case "image-content-40-60": {
      const lines = prompt.split(/\d+\./) || prompt.split("\n");
      return lines.filter(Boolean).map((l) => l.trim().slice(0, 100)).join("\n");
    }
    default:
      return prompt;
  }
}

function defaultFoot(title: string): string {
  return `<div class="slide-foot">
    <span>${escapeHtml(title)}</span>
    <span class="counter"></span>
  </div>`;
}

function darkFoot(title: string): string {
  return `<div class="slide-foot" style="color:rgba(255,255,255,.6)">
    <span>${escapeHtml(title)}</span>
    <span class="counter"></span>
  </div>`;
}

function slideHtml(slide: SlideContent, index: number, _total: number): string {
  const layoutClass = getLayoutClass(slide.layoutOverride ?? slide.suggestedLayout);
  const layoutId = slide.layoutOverride ?? slide.suggestedLayout;
  const { lines } = parseBody(slide);

  // ── Cover ────────────────────────────────────
  if (layoutId === "cover") {
    return `<section class="${layoutClass} active" data-slide="${index + 1}">
  <div class="cover-frame">
    <div class="cover-tag">Central Provident Fund Board</div>
    <h1 class="h-cover">${escapeHtml(slide.title)}</h1>
    <div class="title-rule"></div>
    ${lines.length > 0 ? `<p class="subtitle">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
  </div>
  <img class="logo-mark br" src="${LOGO_WHITE_URI}" alt="CPF" />
  <div class="cover-band">
    <div class="band-meta">CPF Board</div>
  </div>
</section>`;
  }

  // ── Section Divider ──────────────────────────
  if (layoutId === "section-divider") {
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <img class="logo-mark tr" src="${LOGO_GREEN_URI}" alt="CPF" />
  <div class="divider-frame">
    <h2 class="h-chapter">${escapeHtml(slide.title)}</h2>
    <div class="title-rule"></div>
    ${lines.length > 0 ? `<p class="subtitle" style="color:var(--fg-soft);max-width:34em;margin-top:1cqh">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
  </div>
  <div class="divider-band"></div>
  ${darkFoot(slide.title)}
</section>`;
  }

  // ── Big Stat ─────────────────────────────────
  if (layoutId === "big-stat") {
    const stat = lines[0] || "—";
    const label = lines[1] || "";
    const note = lines[2] || "";
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="big-stat-wrap">
    <div class="big-stat-label">${escapeHtml(slide.title)}</div>
    <h2 class="h-big-stat">${escapeHtml(stat)}</h2>
    ${label ? `<p class="big-stat-note">${escapeHtml(label)}</p>` : ""}
    ${note ? `<p class="big-stat-src">${escapeHtml(note)}</p>` : ""}
  </div>
  <img class="logo-mark br" src="${LOGO_WHITE_URI}" alt="CPF" />
  ${darkFoot(slide.title)}
</section>`;
  }

  // ── Quote ────────────────────────────────────
  if (layoutId === "quote-testimonial") {
    const quoteText = lines[0] || slide.contentPrompt;
    const attr = lines[1] || "";
    const role = lines[2] || "";
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="quote-frame">
    <div class="quote-mark">\u201C</div>
    <p class="h-quote">${escapeHtml(quoteText)}</p>
    ${(attr || role) ? `<div class="quote-attr">
      ${attr ? `<div class="quote-who">${escapeHtml(attr)}</div>` : ""}
      ${(attr && role) ? `<span class="quote-sep"></span>` : ""}
      ${role ? `<div class="quote-role">${escapeHtml(role)}</div>` : ""}
    </div>` : ""}
  </div>
  <img class="logo-mark br" src="${LOGO_WHITE_URI}" alt="CPF" />
  ${darkFoot(slide.title)}
</section>`;
  }

  // ── Closing ──────────────────────────────────
  if (layoutId === "closing") {
    const contactLines = lines.slice(0, 3);
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="closing-frame">
    <div class="closing-kicker">Thank you</div>
    <h1 class="closing-title">${escapeHtml(slide.title)}</h1>
    <div class="title-rule" style="margin-inline:auto"></div>
    ${lines.length > 0 ? `<p class="subtitle" style="max-width:30em">${lines.map(escapeHtml).join("<br/>")}</p>` : ""}
    ${contactLines.length > 0 ? `<div class="closing-contact">${contactLines.map((c) => {
      const parts = c.split("|");
      return `<div class="closing-item"><span class="closing-lbl">${escapeHtml(parts[0] || "")}</span><span class="closing-val">${escapeHtml(parts[1] || "")}</span></div>`;
    }).join("")}</div>` : ""}
  </div>
  <img class="logo-mark br" src="${LOGO_WHITE_URI}" alt="CPF" />
  ${darkFoot(slide.title)}
</section>`;
  }

  // ── KPI Dashboard ────────────────────────────
  if (layoutId === "kpi-dashboard") {
    const metrics = lines.slice(0, 4).map((l) => {
      const colon = l.indexOf(":");
      if (colon > 0) return { value: l.slice(0, colon).trim(), label: l.slice(colon + 1).trim() };
      return { value: l, label: "" };
    });
    const colors = ["", "pine", "turq", "orange"];
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="kpi-grid">
        ${metrics.map((m, i) => `<div class="kpi ${colors[i] || ""}">
          <span class="kpi-label">${escapeHtml(m.label)}</span>
          <span class="kpi-value">${escapeHtml(m.value)}</span>
        </div>`).join("")}
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Two-Column Comparison ────────────────────
  if (layoutId === "two-column") {
    const beforeLines: string[] = [];
    const afterLines: string[] = [];
    let side: "before" | "after" = "before";
    for (const line of lines) {
      if (line.toLowerCase().startsWith("after:") || line.toLowerCase().startsWith("after ")) {
        side = "after";
        const content = line.replace(/^after[:\s]*/i, "").trim();
        if (content) afterLines.push(content);
      } else if (line.toLowerCase().startsWith("before:") || line.toLowerCase().startsWith("before ")) {
        side = "before";
        const content = line.replace(/^before[:\s]*/i, "").trim();
        if (content) beforeLines.push(content);
      } else {
        if (side === "before") beforeLines.push(line);
        else afterLines.push(line);
      }
    }
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="compare">
        <div class="col-before">
          <span class="compare-tag">Before</span>
          <h3 class="compare-col-title before-title">Current State</h3>
          ${beforeLines.length > 0 ? `<ul class="compare-bullets">${beforeLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
        </div>
        <div class="col-after">
          <span class="compare-tag">After</span>
          <h3 class="compare-col-title after-title">Target State</h3>
          ${afterLines.length > 0 ? `<ul class="compare-bullets">${afterLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Timeline ─────────────────────────────────
  if (layoutId === "timeline") {
    const steps = lines.slice(0, 5).map((l) => {
      const parts = l.split("|").map((p) => p.trim());
      return { yr: parts[0] || "", title: parts[1] || "", desc: parts[2] || "" };
    });
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="timeline">
        <div class="timeline-rail">
          ${steps.map((s) => `<div class="timeline-step">
            ${s.yr ? `<span class="timeline-yr">${escapeHtml(s.yr)}</span>` : ""}
            ${s.title ? `<span class="timeline-ttl">${escapeHtml(s.title)}</span>` : ""}
            ${s.desc ? `<span class="timeline-dsc">${escapeHtml(s.desc)}</span>` : ""}
          </div>`).join("")}
        </div>
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Process Pipeline ─────────────────────────
  if (layoutId === "process-pipeline") {
    const steps = lines.slice(0, 5).map((l, i) => {
      const parts = l.split("|").map((p) => p.trim());
      return { num: i + 1, title: parts[0] || "", desc: parts[1] || "" };
    });
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="pipeline">
        ${steps.map((s) => `<div class="pipe-step">
          <span class="pipe-nb">${String(s.num).padStart(2, "0")}</span>
          ${s.title ? `<span class="pipe-ttl">${escapeHtml(s.title)}</span>` : ""}
          ${s.desc ? `<span class="pipe-dsc">${escapeHtml(s.desc)}</span>` : ""}
        </div>`).join("")}
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Data Table ───────────────────────────────
  if (layoutId === "data-table") {
    const headerLine = lines[0] || "";
    const headers = headerLine.split("|").map((h) => h.trim()).filter(Boolean);
    const rows = lines.slice(1);
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <table class="data-table">
        ${headers.length > 0 ? `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>` : ""}
        <tbody>
          ${rows.map((r, ri) => {
            const cells = r.split("|").map((c) => c.trim());
            const isTotal = ri === rows.length - 1 && r.toLowerCase().includes("total");
            return `<tr class="${isTotal ? "total" : ""}">${cells.map((c, ci) => {
              const isNum = ci > 0 && /^[\d\.,\+\-\$%sS]+[%\d]?$/.test(c);
              return `<td class="${isNum ? "num" : ci === 0 ? "label" : ""}">${escapeHtml(c)}</td>`;
            }).join("")}</tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Org Chart ────────────────────────────────
  if (layoutId === "org-chart") {
    const topLine = lines[0] || "";
    const topParts = topLine.split("|").map((p) => p.trim());
    const topRole = topParts[0] || "";
    const topName = topParts[1] || "";
    const topSub = topParts[2] || "";
    const children = lines.slice(1, 5).map((l) => {
      const parts = l.split("|").map((p) => p.trim());
      return { role: parts[0] || "", name: parts[1] || "", sub: parts[2] || "" };
    });
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="org">
        <div class="org-row">
          <div class="org-node top">
            ${topRole ? `<span class="org-role">${escapeHtml(topRole)}</span>` : ""}
            ${topName ? `<span class="org-name">${escapeHtml(topName)}</span>` : ""}
            ${topSub ? `<span class="org-sub">${escapeHtml(topSub)}</span>` : ""}
          </div>
        </div>
        ${children.length > 0 ? `<div class="org-row children">
          ${children.map((c) => `<div class="org-node">
            ${c.role ? `<span class="org-role">${escapeHtml(c.role)}</span>` : ""}
            ${c.name ? `<span class="org-name">${escapeHtml(c.name)}</span>` : ""}
            ${c.sub ? `<span class="org-sub">${escapeHtml(c.sub)}</span>` : ""}
          </div>`).join("")}
        </div>` : ""}
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Sidebar Bullets ──────────────────────────
  if (layoutId === "sidebar-bullets") {
    const sidebarText = lines.slice(0, 2);
    const bulletLines = lines.slice(2);
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      <div class="sidebar-layout">
        <div class="side">
          <div class="side-kicker">Why this matters</div>
          ${sidebarText.map((t) => `<p class="side-body">${escapeHtml(t)}</p>`).join("")}
        </div>
        <div class="main">
          ${bulletLines.length > 0 ? `<ul class="bullets">${bulletLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
        </div>
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Content + Image 60/40 ────────────────────
  if (layoutId === "content-image-60-40") {
    const contentLines = lines.slice(0, 4);
    const imageUrl = lines[4] || slide.imageUrl || "";
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body split-6040">
      <div style="display:flex;flex-direction:column;gap:2.4cqh">
        ${contentLines.length > 0 ? `<ul class="bullets">${contentLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="img-slot">
        ${imageUrl ? `<img class="img-real" src="${escapeHtml(imageUrl)}" alt="" />` : `<div class="img-plus">+</div><div class="img-placeholder">Image</div>`}
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Image + Content 40/60 ────────────────────
  if (layoutId === "image-content-40-60") {
    const imageUrl = lines[0] || slide.imageUrl || "";
    const contentLines = lines.slice(1);
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body split-4060">
      <div class="img-slot">
        ${imageUrl ? `<img class="img-real" src="${escapeHtml(imageUrl)}" alt="" />` : `<div class="img-plus">+</div><div class="img-placeholder">Image</div>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:2.4cqh">
        ${contentLines.length > 0 ? `<ul class="bullets">${contentLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>
  </div>
  ${defaultFoot(slide.title)}
</section>`;
  }

  // ── Full-Bleed Image ─────────────────────────
  if (layoutId === "full-bleed-image") {
    const imageUrl = lines[0] || slide.imageUrl || "";
    const captionTitle = lines[1] || slide.title;
    const credit = lines[2] || "";
    return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="full-image">
    ${imageUrl ? `<img class="full-img" src="${escapeHtml(imageUrl)}" alt="" />` : `<div class="full-placeholder">Full-bleed image</div>`}
  </div>
  ${(captionTitle || credit) ? `<div class="full-bleed-caption">
    <div class="full-caption-kicker">Image &amp; Caption</div>
    <div class="full-caption-ttl">${escapeHtml(captionTitle)}</div>
    ${credit ? `<div class="full-caption-src">${escapeHtml(credit)}</div>` : ""}
  </div>` : ""}
  <img class="logo-mark tr" src="${LOGO_WHITE_URI}" alt="CPF" />
  ${darkFoot(slide.title)}
</section>`;
  }

  // ── Bullet List (default) ────────────────────
  const layoutInfo = LAYOUTS.find((l) => l.id === layoutId);
  const layoutName = layoutInfo?.name ?? "Content";

  return `<section class="${layoutClass}" data-slide="${index + 1}">
  <div class="design-bar"></div>
  <div class="frame">
    <header class="frame-header">
      <h2 class="h-section" style="margin-top:1cqh">${escapeHtml(slide.title)}</h2>
      <div class="title-rule"></div>
    </header>
    <div class="frame-body">
      ${slide.imageUrl ? `<div class="deck-image"><img src="${escapeHtml(slide.imageUrl)}" alt="Slide image" /></div>` : ""}
      ${lines.length > 0 ? `<ul class="bullets">
${lines.map((l) => `        <li>${escapeHtml(l)}</li>`).join("\n")}
      </ul>` : `<p class="lead" style="margin-bottom:3cqh">${escapeHtml(slide.contentPrompt)}</p>`}
    </div>
  </div>
  <img class="logo-mark br" src="${LOGO_GREEN_URI}" alt="CPF" />
  ${defaultFoot(slide.title)}
</section>`;
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
#deck{position:relative;width:100%;height:1080px;overflow:hidden}
.slide{position:absolute;top:0;left:0;width:1920px;height:1080px;overflow:hidden;container-type:size;container-name:slide;visibility:hidden}
.slide.active{visibility:visible}
.slide.light{background:var(--cpf-mint)}
.slide.hero.dark{background:var(--cpf-green);color:#fff}
.slide.hero.light{background:var(--surface)}
.design-bar{position:absolute;top:0;left:0;right:0;height:24px;background:var(--cpf-green)}
.frame{position:absolute;inset:48px 80px 80px 80px;display:flex;flex-direction:column}
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
/* ── Cover ───────────────────── */

.cover-frame{position:absolute;inset:80px 80px 120px 80px;display:flex;flex-direction:column;justify-content:center}
.cover-tag{font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.12em;opacity:.65;margin-bottom:1.5cqh}
.cover-band{position:absolute;bottom:0;left:0;right:0;height:52px;background:rgba(0,0,0,.18);display:flex;align-items:center;padding:0 80px}
.band-meta{font-family:var(--font-mono);font-size:13px;opacity:.7}
/* ── Divider ─────────────────── */

.divider-frame{position:absolute;inset:80px 80px 0 80px;display:flex;flex-direction:column;justify-content:center}
.chapter-tag{font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);margin-bottom:1.5cqh}
.divider-band{position:absolute;bottom:0;left:0;right:0;height:25%;background:var(--cpf-green)}
/* ── Big Stat ─────────────────── */

.big-stat-wrap{position:absolute;inset:80px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:2cqh}
.big-stat-label{font-family:var(--font-mono);font-size:16px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,.7)}
.h-big-stat{font-family:var(--font-display);font-weight:900;font-size:140px;line-height:1;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;margin:0}
.big-stat-note{font-family:var(--font-body);font-weight:300;font-size:28px;line-height:1.4;color:rgba(255,255,255,.78);max-width:24em}
.big-stat-src{font-family:var(--font-mono);font-size:14px;color:rgba(255,255,255,.5)}
/* ── Quote ────────────────────── */

.quote-frame{position:absolute;inset:80px 80px 120px 80px;display:flex;flex-direction:column;justify-content:center}
.quote-mark{font-family:var(--font-display);font-weight:700;font-size:80px;line-height:.4;color:rgba(255,255,255,.25)}
.h-quote{font-family:var(--font-display);font-weight:300;font-style:italic;font-size:44px;line-height:1.3;max-width:28em;margin:0}
.quote-attr{display:flex;gap:16px;align-items:center;margin-top:3cqh}
.quote-who{font-family:var(--font-display);font-weight:700;font-size:18px;color:#fff}
.quote-role{font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,.65)}
.quote-sep{width:24px;height:1px;background:rgba(255,255,255,.35)}
/* ── Closing ──────────────────── */

.closing-frame{position:absolute;inset:80px 80px 80px 80px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:2cqh}
.closing-kicker{font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:var(--lime)}
.closing-title{font-family:var(--font-display);font-weight:900;font-size:80px;line-height:1.05;margin:0}
.closing-contact{display:flex;gap:32px;margin-top:3cqh}
.closing-item{display:flex;flex-direction:column;align-items:center;gap:4px}
.closing-lbl{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,.5)}
.closing-val{font-family:var(--font-body);font-weight:300;font-size:18px;color:rgba(255,255,255,.85)}
/* ── KPI Dashboard ────────────── */

.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);flex:1;align-content:center}
.kpi{padding:4cqh 2cqw;display:flex;flex-direction:column;gap:1cqh;border-right:1px solid var(--border)}
.kpi:last-child{border-right:0}
.kpi-label{font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
.kpi-value{font-family:var(--font-display);font-weight:700;font-size:60px;line-height:1;letter-spacing:-0.02em;color:var(--cpf-green);font-variant-numeric:tabular-nums}
.kpi.pine .kpi-value{color:var(--pine-green)}
.kpi.turq .kpi-value{color:var(--turquoise)}
.kpi.orange .kpi-value{color:var(--orange)}
/* ── Two-Column Comparison ────── */

.compare{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border);border-bottom:1px solid var(--border);flex:1}
.compare>div{padding:4cqh 3cqw;display:flex;flex-direction:column;gap:1.6cqh;border-right:1px solid var(--border)}
.compare>div:last-child{border-right:0}
.compare-tag{font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
.compare-col-title{font-family:var(--font-display);font-weight:700;font-size:32px;line-height:1.2}
.before-title{color:var(--muted)}
.after-title{color:var(--cpf-green)}
.compare-bullets{list-style:none;display:flex;flex-direction:column;gap:1.2cqh;margin-top:1.4cqh}
.compare-bullets li{position:relative;padding-left:1.6em;font-family:var(--font-body);font-size:18px;line-height:1.5;color:var(--fg-soft)}
.compare-bullets li::before{content:"•";position:absolute;left:0;color:var(--cpf-green);font-weight:700}
.col-after .compare-bullets li::before{content:"•"}
/* ── Timeline ─────────────────── */

.timeline{flex:1;display:flex;flex-direction:column;justify-content:center;padding:4cqh 0}
.timeline-rail{display:grid;grid-template-columns:repeat(5,1fr);gap:1cqw;padding-top:4cqh;position:relative}
.timeline-rail::before{content:"";position:absolute;left:0;right:0;top:4cqh;height:2px;background:var(--border-strong)}
.timeline-step{position:relative;display:flex;flex-direction:column;gap:1cqh;padding-top:2cqh}
.timeline-step::before{content:"";position:absolute;left:0;top:-7px;width:14px;height:14px;background:var(--cpf-green);border-radius:50%}
.timeline-yr{font-family:var(--font-display);font-weight:700;font-size:22px;color:var(--cpf-green);font-variant-numeric:tabular-nums}
.timeline-ttl{font-family:var(--font-display);font-weight:700;font-size:16px;line-height:1.25;color:var(--fg)}
.timeline-dsc{font-family:var(--font-body);font-size:14px;line-height:1.4;color:var(--fg-soft)}
/* ── Pipeline ─────────────────── */

.pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:1.4cqw;flex:1;align-content:center;position:relative}
.pipeline::before{content:"";position:absolute;left:10%;right:10%;top:50%;height:2px;background:var(--border-strong)}
.pipe-step{display:flex;flex-direction:column;gap:1.4cqh;padding:3cqh 1.6cqw;background:var(--surface);border:1px solid var(--border);position:relative}
.pipe-nb{font-family:var(--font-display);font-weight:700;font-size:28px;color:var(--cpf-green);font-variant-numeric:tabular-nums}
.pipe-ttl{font-family:var(--font-display);font-weight:700;font-size:17px;line-height:1.25;color:var(--fg)}
.pipe-dsc{font-family:var(--font-body);font-size:14px;line-height:1.4;color:var(--fg-soft)}
.pipe-step::after{content:"\u203A";position:absolute;right:-1cqw;top:50%;transform:translateY(-50%);font-family:var(--font-display);font-weight:300;font-size:28px;color:var(--border-strong)}
.pipe-step:last-child::after{display:none}
/* ── Data Table ───────────────── */

.data-table{width:100%;border-collapse:collapse;font-family:var(--font-body)}
.data-table thead th{text-align:left;font-family:var(--font-mono);font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);font-weight:500;padding:1.4cqh 1.2cqw;border-bottom:2px solid var(--cpf-green)}
.data-table tbody td{padding:1.6cqh 1.2cqw;font-size:17px;color:var(--fg);border-bottom:1px solid var(--border)}
.data-table tbody td.num{font-variant-numeric:tabular-nums;text-align:right;font-weight:500}
.data-table tbody td.label{font-weight:500;color:var(--cpf-green)}
.data-table tbody tr.total td{border-top:2px solid var(--cpf-green);font-weight:700;background:var(--cpf-paper)}
/* ── Org Chart ─────────────────── */

.org{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3cqh 0;gap:0}
.org-row{display:flex;justify-content:center;gap:1.4cqw;width:100%;position:relative}
.org-row+.org-row{margin-top:2.4cqh;padding-top:3.2cqh}
.org-row+.org-row::before{content:"";position:absolute;top:-2.4cqh;left:50%;transform:translateX(-50%);width:1px;height:3.8cqh;background:var(--border-strong)}
.org-row.children{display:grid;grid-template-columns:repeat(4,1fr);max-width:88%}
.org-row.children::after{content:"";position:absolute;top:1.4cqh;left:12.5%;right:12.5%;height:1px;background:var(--border-strong)}
.org-row.children .org-node::before{content:"";position:absolute;top:-1.8cqh;left:50%;transform:translateX(-50%);width:1px;height:1.8cqh;background:var(--border-strong)}
.org-node{position:relative;background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--cpf-green);padding:1.8cqh 1.4cqw;display:flex;flex-direction:column;gap:.4cqh;min-width:14cqw;max-width:18cqw;text-align:center}
.org-node.top{border-top:0;background:var(--cpf-green);color:#fff;min-width:22cqw;max-width:24cqw;padding:2.4cqh 2cqw}
.org-role{font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
.org-node.top .org-role{color:rgba(255,255,255,.7)}
.org-name{font-family:var(--font-display);font-weight:700;font-size:16px;line-height:1.2}
.org-node.top .org-name{color:#fff}
.org-sub{font-family:var(--font-body);font-size:13px;color:var(--fg-soft);line-height:1.3}
.org-node.top .org-sub{color:rgba(255,255,255,.8)}
/* ── Sidebar Bullets ──────────── */

.sidebar-layout{display:grid;grid-template-columns:5fr 7fr;border:1px solid var(--border);flex:1}
.side{padding:4cqh 3cqw;background:var(--cpf-green);color:#fff;display:flex;flex-direction:column;gap:2cqh;position:relative;overflow:hidden}
.side-kicker{font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--lime)}
.side-body{font-family:var(--font-body);font-size:16px;line-height:1.5;color:rgba(255,255,255,.85)}
.main{padding:4cqh 3cqw;background:var(--surface);display:flex;flex-direction:column;gap:2cqh}
/* ── Split Grids ──────────────── */

.split-6040{display:grid;grid-template-columns:6fr 4fr;gap:4cqw;flex:1;align-items:start;min-height:0}
.split-4060{display:grid;grid-template-columns:4fr 6fr;gap:4cqw;flex:1;align-items:start;min-height:0}
.img-slot{width:100%;aspect-ratio:16/10;background:var(--surface);border:1.5px dashed var(--border-strong);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqh;font-family:var(--font-mono);font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);position:relative;overflow:hidden}
.img-plus{font-size:36px;font-weight:300;color:var(--border-strong)}
.img-placeholder{font-size:13px;color:var(--muted)}
.img-real{width:100%;height:100%;object-fit:cover;display:block}
/* ── Full-Bleed Image ─────────── */

.full-image{position:absolute;inset:0;background:var(--cpf-green-deep);display:flex;align-items:center;justify-content:center;overflow:hidden}
.full-placeholder{font-family:var(--font-mono);font-size:16px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,.3)}
.full-img{width:100%;height:100%;object-fit:cover;display:block}
.full-bleed-caption{position:absolute;left:80px;bottom:100px;max-width:50cqw;background:rgba(4,89,65,.85);padding:3cqh 3cqw;color:#fff}
.full-caption-kicker{font-family:var(--font-mono);font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:var(--lime)}
.full-caption-ttl{font-family:var(--font-display);font-weight:700;font-size:32px;line-height:1.2;margin-top:1.2cqh}
.full-caption-src{font-family:var(--font-mono);font-size:13px;letter-spacing:0.06em;color:rgba(255,255,255,.65);margin-top:1.4cqh}
/* ── Bullets ──────────────────── */

.bullets{list-style:none;padding:0;margin:0}
.bullets li{font-family:var(--font-body);font-size:22px;line-height:1.6;padding:.4em 0;padding-left:2em;position:relative;color:var(--fg-soft)}
.bullets li::before{content:"—";position:absolute;left:0;font-family:var(--font-mono);font-weight:700;color:var(--cpf-green)}
/* ── Generic ──────────────────── */

.lead{font-family:var(--font-body);font-weight:300;font-size:28px;line-height:1.5;color:var(--fg-soft);max-width:44em}
.slide-foot{position:absolute;bottom:12px;left:40px;right:40px;display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:var(--muted);opacity:.6}
.slide-foot .counter::before{content:"Slide "counter(slide)" of "}
.hero.dark .slide-foot{color:rgba(255,255,255,.6)}
.logo-mark{position:absolute;z-index:2}
.logo-mark.br{bottom:55px;right:30px}
.logo-mark.tr{top:30px;right:30px}
.deck-image{margin-bottom:2cqh}
.deck-image img{max-width:100%;max-height:30cqh;border-radius:4px}
.u-overlay{font-family:var(--font-body);position:absolute;z-index:5;pointer-events:none;white-space:pre-wrap;word-break:break-word;max-width:420px;text-align:center;font-size:clamp(11px,1.5cqw,26px)}
.u-overlay{font-family:var(--font-body);position:absolute;z-index:5;pointer-events:none;white-space:pre-wrap;word-break:break-word;max-width:420px;text-align:center;font-size:clamp(11px,1.5cqw,26px)}
`;

/** Inject overlay blocks into a full HTML document string (used after inline-edit save). */
export function injectAllOverlaysIntoHtml(html: string, allOverlay?: Record<number, TextBlock[]>): string {
  if (!allOverlay) return html;
  const parts = html.split("</section>");
  return parts.map((part, i) => {
    if (i === parts.length - 1) return part;
    const match = part.match(/data-slide="(\d+)"/);
    if (!match) return part + "</section>";
    const slideIndex = parseInt(match[1]) - 1;
    const blocks = allOverlay[slideIndex];
    if (!blocks?.length) return part + "</section>";
    const overlay = blocks.map((b) =>
      `<div class="u-overlay" style="left:${b.x}%;top:${b.y}%;transform:translate(-50%,-50%);color:${b.color};font-weight:${b.bold ? 700 : 400};font-style:${b.italic ? "italic" : "normal"}">${escapeHtml(b.text)}</div>`
    ).join("");
    return part + overlay + "</section>";
  }).join("");
}

function injectOverlay(html: string, blocks?: TextBlock[]): string {
  if (!blocks?.length) return html;
  const overlay = blocks.map((b) =>
    `<div class="u-overlay" style="left:${b.x}%;top:${b.y}%;transform:translate(-50%,-50%);color:${b.color};font-weight:${b.bold ? 700 : 400};font-style:${b.italic ? "italic" : "normal"}">${escapeHtml(b.text)}</div>`
  ).join("");
  return html.replace("</section>", `${overlay}</section>`);
}

export function buildDeckHtml(slides: SlideContent[], overlayBlocks?: Record<number, TextBlock[]>, options?: { thumbnail?: boolean }): string {
  const slideSections = slides.map((s, i) => injectOverlay(slideHtml(s, i, slides.length), overlayBlocks?.[i])).join("\n\n");
  const isThumbnail = options?.thumbnail === true;

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
.deck-shell{width:100vw;height:100vh;overflow:hidden;position:relative;background:var(--cpf-mint)}
.deck-shell .stage{width:1920px;height:1080px;transform-origin:top left;position:absolute}
${isThumbnail ? ".deck-nav{display:none!important}" : ""}
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
  var shell=document.getElementById('shell');

  if(slides.length===0)return;
  slides[0].classList.add('active');

  function fit(){
    var w=shell.offsetWidth||window.innerWidth;
    var h=shell.offsetHeight||window.innerHeight;
    var s=Math.min(w/1920,h/1080);
    var x=(w-1920*s)/2;
    var y=(h-1080*s)/2;
    stage.style.transform='translate('+x+'px,'+y+'px) scale('+s+')';
  }
  fit();
  window.addEventListener('resize',fit);
  if(window.ResizeObserver){new ResizeObserver(fit).observe(shell);}

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
    if(document.activeElement&&document.activeElement.getAttribute('contenteditable')==='true')return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key===' '){e.preventDefault();go(current+1)}
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(current-1)}
    if(e.key==='Home'){e.preventDefault();go(0)}
    if(e.key==='End'){e.preventDefault();go(total-1)}
  });

  window.addEventListener('message',function(e){
    if(e.data&&typeof e.data.slide==='number'){
      go(e.data.slide);
    }
    if(e.data&&typeof e.data.showNav==='boolean'){
      var nav=document.querySelector('.deck-nav');
      if(nav)nav.style.display=e.data.showNav?'flex':'none';
    }
    if(e.data&&e.data.editMode===true){
      document.querySelectorAll('.slide h1,.slide h2,.slide h3,.slide p,.slide li').forEach(function(el){
        if(el.closest('.slide-foot')||el.closest('.deck-nav'))return;
        el.setAttribute('contenteditable','true');
        el.style.outline='1.5px dashed rgba(4,89,65,0.4)';
        el.style.outlineOffset='2px';
        el.style.borderRadius='2px';
        el.style.cursor='text';
      });
    }
    if(e.data&&e.data.editMode===false){
      document.querySelectorAll('[contenteditable="true"]').forEach(function(el){
        el.removeAttribute('contenteditable');
        el.style.outline='';el.style.outlineOffset='';el.style.borderRadius='';el.style.cursor='';
      });
    }
    if(e.data&&e.data.getContent===true){
      parent.postMessage({type:'deckContent',html:document.documentElement.outerHTML},'*');
    }
  });

  var startX=0;
  document.addEventListener('touchstart',function(e){startX=e.touches[0].clientX});
  document.addEventListener('touchend',function(e){
    var dx=startX-e.changedTouches[0].clientX;
    if(Math.abs(dx)>50){go(current+(dx>0?1:-1))}
  });
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
