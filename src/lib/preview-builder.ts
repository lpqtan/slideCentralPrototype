// Mirrors pptx-builder.ts coordinate system but outputs HTML.
// Slide canvas: 1333 × 750 px  (100 px / inch, matching PPTX 13.333" × 7.5")
import type { SlideContent } from "@/lib/types";
import { LOGO_GREEN_URI, LOGO_WHITE_URI } from "@/lib/logos";

const BRAND = {
  green: "045941",
  mint: "E8F1ED",
  surface: "FFFFFF",
  fg: "1A1A1A",
  muted: "6B6B6B",
  pine: "134F4E",
  turq: "1AA594",
  orange: "E69324",
};

const S = 100; // px per inch

function px(inches: number): number { return Math.round(inches * S); }
function pt(points: number): number { return Math.round(points * S / 72); }

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function stripListPrefix(line: string): string {
  return line.replace(/^\d+\.\s*/, "");
}

function parseLines(slide: SlideContent): string[] {
  const body = slide.bodyContent?.trim() || slide.contentPrompt || "";
  return body.split("\n").map((l) => stripListPrefix(l.trim())).filter(Boolean);
}

// ── Primitives ──────────────────────────────────────────────────────────────

function R(
  x: number, y: number, w: number, h: number,
  color: string,
  transparency = 0,
): string {
  const op = transparency ? (1 - transparency / 100).toFixed(2) : "1";
  return `<div style="position:absolute;left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px;background:#${color};opacity:${op};"></div>`;
}

interface TOpts {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  opacity?: number;
}

function T(content: string, x: number, y: number, w: number, h: number, opts: TOpts = {}): string {
  const {
    size = 14, bold, italic,
    color = BRAND.fg,
    align = "left", valign = "top",
    opacity = 1,
  } = opts;
  const ai = valign === "middle" ? "center" : valign === "bottom" ? "flex-end" : "flex-start";
  return (
    `<div style="position:absolute;left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px;` +
    `display:flex;align-items:${ai};overflow:hidden;opacity:${opacity};">` +
    `<span style="font-family:'Roboto',sans-serif;font-size:${pt(size)}px;` +
    `font-weight:${bold ? 700 : 400};font-style:${italic ? "italic" : "normal"};` +
    `color:#${color};text-align:${align};line-height:1.3;white-space:pre-wrap;width:100%;">` +
    `${esc(content)}</span></div>`
  );
}

function B(
  items: string[],
  x: number, y: number, w: number, h: number,
  opts: { size?: number; color?: string; gap?: number } = {},
): string {
  const { size = 14, color = BRAND.fg, gap = 6 } = opts;
  const lis = items
    .map((l) => `<li style="margin-bottom:${gap}px;line-height:1.35;">${esc(l)}</li>`)
    .join("");
  return (
    `<ul style="position:absolute;left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px;` +
    `font-family:'Roboto',sans-serif;font-size:${pt(size)}px;color:#${color};` +
    `padding-left:22px;overflow:hidden;box-sizing:border-box;margin:0;list-style-type:disc;">` +
    `${lis}</ul>`
  );
}

function I(src: string, x: number, y: number, w: number, h: number): string {
  return `<img src="${src}" style="position:absolute;left:${px(x)}px;top:${px(y)}px;width:${px(w)}px;height:${px(h)}px;object-fit:contain;" alt="" />`;
}

// ── Shared elements ─────────────────────────────────────────────────────────

function designBar(): string {
  return R(0, 0, 13.333, 0.26, BRAND.green);
}

function addFooter(text_: string, num: number, total: number, dark = false): string {
  const color = dark ? "AAAAAA" : BRAND.muted;
  return T(`${num} / ${total}`, 12.1, 7.15, 0.9, 0.3, { size: 8, color, align: "right" });
}

function addLogo(position: "tr" | "br", dark: boolean): string {
  const src = dark ? LOGO_WHITE_URI : LOGO_GREEN_URI;
  const w = 0.7, h = 0.7;
  const x = 13.333 - w - 0.21;
  const y = position === "br" ? 7.5 - h - 0.38 : 0.21;
  return I(src, x, y, w, h);
}

function titleBlock(title: string): string {
  return (
    T(title, 0.5, 0.35, 12.3, 0.45, { size: 24, bold: true, color: BRAND.fg }) +
    R(0.5, 0.83, 0.56, 0.04, BRAND.green)
  );
}

// ── Slide renderer ──────────────────────────────────────────────────────────

function renderSlide(s: SlideContent, index: number, total: number): string {
  const layoutId = s.layoutOverride ?? s.suggestedLayout;
  const lines = parseLines(s);
  const num = index + 1;
  let bg = BRAND.mint;
  let body = "";

  switch (layoutId) {
    case "cover": {
      bg = BRAND.green;
      body =
        T("Central Provident Fund Board", 1, 1.5, 11.3, 0.4, { size: 11, color: "AAAAAA" }) +
        T(s.title, 1, 2, 11.3, 1.5, { size: 44, bold: true, color: "FFFFFF" }) +
        R(1, 3.8, 0.56, 0.04, "FFFFFF", 60) +
        (lines.length > 0 ? T(lines.join("\n"), 1, 3.95, 11.3, 1.5, { size: 18, color: "DDDDDD" }) : "") +
        R(0, 7, 13.333, 0.5, "000000", 82) +
        T("CPF Board", 1, 7.05, 5, 0.4, { size: 10, color: "CCCCCC" }) +
        addLogo("br", true);
      break;
    }

    case "section-divider": {
      bg = BRAND.surface;
      body =
        addLogo("tr", false) +
        T(s.title, 1, 2, 11.3, 1.0, { size: 36, bold: true, color: BRAND.fg }) +
        R(1, 3.05, 0.56, 0.04, BRAND.green) +
        (lines.length > 0 ? T(lines.join("\n"), 1, 3.2, 11.3, 1.5, { size: 16, color: BRAND.muted }) : "") +
        R(0, 5.6, 13.333, 1.9, BRAND.green) +
        addFooter(s.title, num, total);
      break;
    }

    case "big-stat": {
      bg = BRAND.green;
      body =
        T(s.title, 0, 0, 13.333, 7.5, { size: 64, bold: true, color: "FFFFFF", align: "center", valign: "middle" }) +
        addLogo("br", true) +
        addFooter(s.title, num, total, true);
      break;
    }

    case "quote-testimonial": {
      bg = BRAND.green;
      const quote = lines[0] || s.contentPrompt;
      const attr  = lines[1] || "";
      const role  = lines[2] || "";
      body =
        T("“", 1.5, 0.8, 2, 1.0, { size: 60, color: "FFFFFF", opacity: 0.25 }) +
        (quote ? T(quote, 1.5, 1.5, 10.3, 3.5, { size: 24, italic: true, color: "FFFFFF" }) : "") +
        (attr  ? T(attr + (role ? `  ·  ${role}` : ""), 1.5, 5.5, 10.3, 0.5, { size: 14, bold: true, color: "DDDDDD" }) : "") +
        addLogo("br", true) +
        addFooter(s.title, num, total, true);
      break;
    }

    case "closing": {
      bg = BRAND.green;
      body =
        T(s.title, 0, 0, 13.333, 7.5, { size: 64, bold: true, color: "FFFFFF", align: "center", valign: "middle" }) +
        addLogo("br", true) +
        addFooter(s.title, num, total, true);
      break;
    }

    case "kpi-dashboard": {
      const metrics = lines.slice(0, 4).map((l) => {
        const colon = l.indexOf(":");
        if (colon > 0) return { value: l.slice(0, colon).trim(), label: l.slice(colon + 1).trim() };
        return { value: l, label: "" };
      });
      const kpiColors = [BRAND.green, BRAND.pine, BRAND.turq, BRAND.orange];
      const positions = [
        { x: 0.5, y: 1.4 }, { x: 7.0, y: 1.4 },
        { x: 0.5, y: 4.0 }, { x: 7.0, y: 4.0 },
      ];
      body =
        designBar() +
        titleBlock(s.title) +
        metrics.map((m, i) => {
          const pos = positions[i];
          return (
            R(pos.x, pos.y, 5.8, 2.3, kpiColors[i]) +
            T(m.label, pos.x + 0.2, pos.y + 0.15, 5.4, 0.5, { size: 12, color: "FFFFFF", opacity: 0.7 }) +
            T(m.value, pos.x + 0.2, pos.y + 0.65, 5.4, 1.4, { size: 36, bold: true, color: "FFFFFF" })
          );
        }).join("") +
        addFooter(s.title, num, total);
      break;
    }

    case "two-column": {
      const beforeLines: string[] = [];
      const afterLines: string[] = [];
      let side: "before" | "after" = "before";
      for (const line of lines) {
        if (/^after[:\s]/i.test(line)) {
          side = "after";
          const c = line.replace(/^after[:\s]*/i, "").trim();
          if (c) afterLines.push(c);
        } else if (/^before[:\s]/i.test(line)) {
          side = "before";
          const c = line.replace(/^before[:\s]*/i, "").trim();
          if (c) beforeLines.push(c);
        } else {
          (side === "before" ? beforeLines : afterLines).push(line);
        }
      }
      body =
        designBar() +
        titleBlock(s.title) +
        R(6.62, 1.2, 0.04, 5.1, BRAND.green) +
        T("Current State", 0.5, 1.2, 5.9, 0.5, { size: 15, bold: true }) +
        (beforeLines.length > 0 ? B(beforeLines, 0.5, 1.75, 5.9, 4.45, { size: 13 }) : "") +
        T("Target State", 6.9, 1.2, 6.0, 0.5, { size: 15, bold: true }) +
        (afterLines.length > 0 ? B(afterLines, 6.9, 1.75, 6.0, 4.45, { size: 13 }) : "") +
        addFooter(s.title, num, total);
      break;
    }

    case "timeline": {
      const steps = lines.slice(0, 5).map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return { yr: parts[0] || "", title: parts[1] || "", desc: parts[2] || "" };
      });
      const count = Math.max(steps.length, 1);
      const stepW = (13.333 - 1.0) / count;
      body =
        designBar() +
        titleBlock(s.title) +
        R(0.5, 2.9, 13.333 - 1.0, 0.04, BRAND.green) +
        steps.map((step, i) => {
          const x  = 0.5 + i * stepW;
          const cx = x + stepW / 2 - 0.08;
          return (
            R(cx, 2.7, 0.16, 0.44, BRAND.green) +
            (step.yr    ? T(step.yr,    x, 1.9, stepW - 0.1, 0.6, { size: 13, bold: true, color: BRAND.green, align: "center" }) : "") +
            (step.title ? T(step.title, x, 3.3, stepW - 0.1, 0.6, { size: 13, bold: true, align: "center" }) : "") +
            (step.desc  ? T(step.desc,  x, 4.0, stepW - 0.1, 1.5, { size: 11, color: BRAND.muted, align: "center" }) : "")
          );
        }).join("") +
        addFooter(s.title, num, total);
      break;
    }

    case "process-pipeline": {
      const steps = lines.slice(0, 5).map((l, i) => {
        const parts = l.split("|").map((p) => p.trim());
        return { num: i + 1, title: parts[0] || "", desc: parts[1] || "" };
      });
      const count = Math.max(steps.length, 1);
      const stepW = (13.333 - 1.0) / count;
      body =
        designBar() +
        titleBlock(s.title) +
        steps.map((step, i) => {
          const x      = 0.5 + i * stepW;
          const isDark = i === 0;
          return (
            R(x, 1.4, stepW - 0.15, 4.4, BRAND.green, isDark ? 0 : 85) +
            T(String(step.num).padStart(2, "0"), x + 0.15, 1.6, stepW - 0.3, 0.6, { size: 22, bold: true, color: isDark ? "FFFFFF" : BRAND.green }) +
            (step.title ? T(step.title, x + 0.15, 2.3, stepW - 0.3, 0.6, { size: 12, bold: true, color: isDark ? "FFFFFF" : BRAND.fg }) : "") +
            (step.desc  ? T(step.desc,  x + 0.15, 3.0, stepW - 0.3, 2.5, { size: 11, color: isDark ? "DDDDDD" : BRAND.muted }) : "")
          );
        }).join("") +
        addFooter(s.title, num, total);
      break;
    }

    case "data-table": {
      const headerLine = lines[0] || "";
      const headers    = headerLine.split("|").map((h) => h.trim()).filter(Boolean);
      const dataRows   = lines.slice(1);
      let tableHtml = "";
      if (headers.length > 0) {
        const colW = px(13.333 - 1.0) / headers.length;
        const headerCells = headers.map((h) =>
          `<th style="padding:6px 8px;font-family:'Roboto',sans-serif;font-size:${pt(12)}px;font-weight:700;color:#FFFFFF;background:#${BRAND.green};text-align:left;width:${colW}px;">${esc(h)}</th>`
        ).join("");
        const bodyRows = dataRows.map((r, ri) => {
          const raw   = r.split("|").map((c) => c.trim());
          const cells = Array.from({ length: headers.length }, (_, ci) => raw[ci] ?? "");
          const isTotal = ri === dataRows.length - 1 && r.toLowerCase().includes("total");
          const rowBg = isTotal ? "D0E4DC" : ri % 2 === 0 ? BRAND.surface : BRAND.mint;
          return `<tr style="background:#${rowBg};">${cells.map((c, ci) =>
            `<td style="padding:5px 8px;font-family:'Roboto',sans-serif;font-size:${pt(11)}px;font-weight:${isTotal || ci === 0 ? 700 : 400};color:#${BRAND.fg};">${esc(c)}</td>`
          ).join("")}</tr>`;
        }).join("");
        tableHtml = `<table style="position:absolute;left:${px(0.5)}px;top:${px(1.2)}px;width:${px(13.333 - 1.0)}px;border-collapse:collapse;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
      }
      body = designBar() + titleBlock(s.title) + tableHtml + addFooter(s.title, num, total);
      break;
    }

    case "org-chart": {
      const topLine  = lines[0] || "";
      const topParts = topLine.split("|").map((p) => p.trim());
      const children = lines.slice(1, 5).map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return { role: parts[0] || "", name: parts[1] || "" };
      });
      const topX   = (13.333 - 4) / 2;
      const cCount = Math.max(children.length, 1);
      const childW = (13.333 - 1.0) / cCount;
      body =
        designBar() +
        titleBlock(s.title) +
        R(topX, 1.3, 4, 1.0, BRAND.green) +
        T([topParts[0], topParts[1]].filter(Boolean).join("\n"), topX + 0.1, 1.3, 3.8, 1.0, { size: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle" }) +
        (children.length > 0
          ? R(13.333 / 2 - 0.02, 2.3, 0.04, 0.4, BRAND.green) +
            R(0.5, 2.7, 13.333 - 1.0, 0.04, BRAND.green) +
            children.map((child, i) => {
              const x  = 0.5 + i * childW;
              const cx = x + childW / 2 - 0.02;
              return (
                R(cx, 2.7, 0.04, 0.4, BRAND.green) +
                R(x + 0.1, 3.1, childW - 0.2, 1.1, BRAND.surface) +
                `<div style="position:absolute;left:${px(x + 0.1)}px;top:${px(3.1)}px;width:${px(childW - 0.2)}px;height:${px(1.1)}px;border:1px solid #${BRAND.green};box-sizing:border-box;"></div>` +
                T([child.role, child.name].filter(Boolean).join("\n"), x + 0.1, 3.1, childW - 0.2, 1.1, { size: 11, align: "center", valign: "middle" })
              );
            }).join("")
          : "") +
        addFooter(s.title, num, total);
      break;
    }

    case "sidebar-bullets": {
      const sidebarText = lines.slice(0, 2);
      const bulletLines = lines.slice(2);
      body =
        designBar() +
        titleBlock(s.title) +
        R(0.5, 1.2, 3.5, 5.1, BRAND.green) +
        T("Why this matters", 0.65, 1.4, 3.2, 0.4, { size: 10, color: "AAAAAA" }) +
        (sidebarText.length > 0 ? T(sidebarText.join("\n\n"), 0.65, 1.9, 3.2, 4.0, { size: 14, color: "FFFFFF" }) : "") +
        (bulletLines.length > 0 ? B(bulletLines, 4.3, 1.9, 8.5, 4.4) : "") +
        addFooter(s.title, num, total);
      break;
    }

    case "content-image-60-40": {
      const contentLines = lines.slice(0, 4);
      body =
        designBar() +
        titleBlock(s.title) +
        (contentLines.length > 0 ? B(contentLines, 0.5, 1.2, 7.5, 5.1) : "") +
        R(8.3, 1.2, 4.5, 5.1, "D8D8D8") +
        T("Image", 8.3, 3.4, 4.5, 0.5, { size: 14, color: "888888", align: "center" }) +
        addFooter(s.title, num, total);
      break;
    }

    case "image-content-40-60": {
      const contentLines = lines.slice(1);
      body =
        designBar() +
        titleBlock(s.title) +
        R(0.5, 1.2, 4.5, 5.1, "D8D8D8") +
        T("Image", 0.5, 3.4, 4.5, 0.5, { size: 14, color: "888888", align: "center" }) +
        (contentLines.length > 0 ? B(contentLines, 5.3, 1.2, 7.5, 5.1) : "") +
        addFooter(s.title, num, total);
      break;
    }

    case "full-bleed-image": {
      bg = "222222";
      const captionTitle = lines[1] || s.title;
      const credit       = lines[2] || "";
      body =
        R(0, 6.0, 13.333, 1.5, "000000", 40) +
        (captionTitle ? T(captionTitle, 0.5, 6.1, 13.333 - 1.0, 0.6, { size: 20, bold: true, color: "FFFFFF" }) : "") +
        (credit       ? T(credit,       0.5, 6.75, 13.333 - 1.0, 0.35, { size: 11, color: "AAAAAA" }) : "") +
        addLogo("tr", true) +
        addFooter(s.title, num, total, true);
      break;
    }

    default: {
      body =
        designBar() +
        titleBlock(s.title) +
        (lines.length > 0
          ? B(lines, 0.8, 1.1, 11.7, 5.2, { size: 14, color: "3A3A3A" })
          : (s.contentPrompt ? T(s.contentPrompt, 0.8, 1.1, 11.7, 5.2, { size: 16, italic: true, color: BRAND.muted }) : "")) +
        addLogo("br", false) +
        addFooter(s.title, num, total);
      break;
    }
  }

  return (
    `<div style="position:relative;width:${px(13.333)}px;height:${px(7.5)}px;` +
    `background:#${bg};overflow:hidden;font-family:'Roboto',sans-serif;">` +
    body +
    `</div>`
  );
}

export function buildSlidePreviewHtml(slide: SlideContent, index: number, total: number): string {
  return renderSlide(slide, index, total);
}
