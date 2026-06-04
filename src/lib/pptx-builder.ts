import PptxGenJS from "pptxgenjs";
import type { SlideContent, TextBlock } from "@/lib/types";
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

const W = 13.333;
const H = 7.5;

function stripListPrefix(line: string): string {
  return line.replace(/^\d+\.\s*/, "");
}

function parseLines(slide: SlideContent): string[] {
  const body = slide.bodyContent?.trim() || slide.contentPrompt || "";
  return body.split("\n").map((l) => stripListPrefix(l.trim())).filter(Boolean);
}

function addDesignBar(slide: PptxGenJS.Slide) {
  slide.addShape("rect", { x: 0, y: 0, w: W, h: 0.26, fill: { color: BRAND.green } });
}

function addFooter(slide: PptxGenJS.Slide, text: string, num: number, total: number, dark = false) {
  const color = dark ? "AAAAAA" : BRAND.muted;
  slide.addText(text, {
    x: 0.4, y: 7.15, w: 5, h: 0.3,
    fontFace: "Roboto", fontSize: 8, color,
  });
  slide.addText(`${num} / ${total}`, {
    x: 12.1, y: 7.15, w: 0.9, h: 0.3,
    fontFace: "Roboto", fontSize: 8, color, align: "right",
  });
}

function addLogo(slide: PptxGenJS.Slide, position: "tr" | "br", dark: boolean) {
  const logoData = dark ? LOGO_WHITE_URI : LOGO_GREEN_URI;
  const w = 0.9, h = 0.9;
  const x = W - w - 0.21;
  const y = position === "br" ? H - h - 0.38 : 0.21;
  slide.addImage({ data: logoData, x, y, w, h });
}

function addTitleBlock(slide: PptxGenJS.Slide, title: string) {
  slide.addText(title, {
    x: 0.5, y: 0.4, w: 12.3, h: 0.7,
    fontFace: "Roboto", fontSize: 24, bold: true, color: BRAND.fg,
  });
  slide.addShape("rect", { x: 0.5, y: 1.15, w: 0.56, h: 0.04, fill: { color: BRAND.green } });
}

function renderSlide(s: SlideContent, index: number, total: number, pptx: PptxGenJS): PptxGenJS.Slide {
  const layoutId = s.layoutOverride ?? s.suggestedLayout;
  const lines = parseLines(s);
  const num = index + 1;
  const slide = pptx.addSlide();

  switch (layoutId) {
    // ── Cover ──────────────────────────────────────────────────────
    case "cover": {
      slide.background = { color: BRAND.green };
      slide.addText("Central Provident Fund Board", {
        x: 1, y: 1.5, w: 11.3, h: 0.4,
        fontFace: "Roboto", fontSize: 11, color: "AAAAAA",
      });
      slide.addText(s.title, {
        x: 1, y: 2, w: 11.3, h: 2,
        fontFace: "Roboto", fontSize: 44, bold: true, color: "FFFFFF",
      });
      slide.addShape("rect", { x: 1, y: 4.1, w: 0.56, h: 0.04, fill: { color: "FFFFFF", transparency: 60 } });
      if (lines.length > 0) {
        slide.addText(lines.join("\n"), {
          x: 1, y: 4.2, w: 11.3, h: 1.5,
          fontFace: "Roboto", fontSize: 18, color: "DDDDDD",
        });
      }
      slide.addShape("rect", { x: 0, y: 7, w: W, h: 0.5, fill: { color: "000000", transparency: 82 } });
      slide.addText("CPF Board", {
        x: 1, y: 7.05, w: 5, h: 0.4,
        fontFace: "Roboto", fontSize: 10, color: "CCCCCC",
      });
      addLogo(slide, "br", true);
      break;
    }

    // ── Section Divider ────────────────────────────────────────────
    case "section-divider": {
      slide.background = { color: BRAND.surface };
      addLogo(slide, "tr", false);
      slide.addText(s.title, {
        x: 1, y: 2, w: 11.3, h: 2,
        fontFace: "Roboto", fontSize: 36, bold: true, color: BRAND.fg,
      });
      slide.addShape("rect", { x: 1, y: 3.9, w: 0.56, h: 0.04, fill: { color: BRAND.green } });
      if (lines.length > 0) {
        slide.addText(lines.join("\n"), {
          x: 1, y: 4.05, w: 11.3, h: 1.0,
          fontFace: "Roboto", fontSize: 16, color: BRAND.muted,
        });
      }
      slide.addShape("rect", { x: 0, y: 5.6, w: W, h: 1.9, fill: { color: BRAND.green } });
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Big Stat ───────────────────────────────────────────────────
    case "big-stat": {
      slide.background = { color: BRAND.green };
      const stat = lines[0] || "—";
      const note = lines[1] || "";
      const src = lines[2] || "";
      slide.addText(s.title.toUpperCase(), {
        x: 0, y: 1.0, w: W, h: 0.5,
        fontFace: "Roboto", fontSize: 12, color: "AAAAAA", align: "center",
      });
      slide.addText(stat, {
        x: 0, y: 1.5, w: W, h: 3,
        fontFace: "Roboto", fontSize: 72, bold: true, color: "FFFFFF", align: "center",
      });
      if (note) {
        slide.addText(note, {
          x: 2, y: 4.5, w: 9.3, h: 1.0,
          fontFace: "Roboto", fontSize: 18, color: "DDDDDD", align: "center",
        });
      }
      if (src) {
        slide.addText(src, {
          x: 2, y: 5.6, w: 9.3, h: 0.4,
          fontFace: "Roboto", fontSize: 11, color: "AAAAAA", align: "center",
        });
      }
      addLogo(slide, "br", true);
      addFooter(slide, s.title, num, total, true);
      break;
    }

    // ── Quote Testimonial ──────────────────────────────────────────
    case "quote-testimonial": {
      slide.background = { color: BRAND.green };
      const quote = lines[0] || s.contentPrompt;
      const attr = lines[1] || "";
      const role = lines[2] || "";
      slide.addText("“", {
        x: 1.5, y: 0.8, w: 2, h: 1.0,
        fontFace: "Roboto", fontSize: 60, color: "FFFFFF", transparency: 75,
      });
      if (quote) {
        slide.addText(quote, {
          x: 1.5, y: 1.5, w: 10.3, h: 3.5,
          fontFace: "Roboto", fontSize: 24, italic: true, color: "FFFFFF",
        });
      }
      if (attr) {
        slide.addText(attr + (role ? `  ·  ${role}` : ""), {
          x: 1.5, y: 5.5, w: 10.3, h: 0.5,
          fontFace: "Roboto", fontSize: 14, bold: true, color: "DDDDDD",
        });
      }
      addLogo(slide, "br", true);
      addFooter(slide, s.title, num, total, true);
      break;
    }

    // ── Closing ────────────────────────────────────────────────────
    case "closing": {
      slide.background = { color: BRAND.green };
      slide.addText("Thank you", {
        x: 1, y: 2.0, w: 11.3, h: 0.5,
        fontFace: "Roboto", fontSize: 11, color: "AAAAAA", align: "center",
      });
      slide.addText(s.title, {
        x: 1, y: 2.5, w: 11.3, h: 1.5,
        fontFace: "Roboto", fontSize: 40, bold: true, color: "FFFFFF", align: "center",
      });
      slide.addShape("rect", { x: W / 2 - 0.28, y: 4.2, w: 0.56, h: 0.04, fill: { color: "FFFFFF", transparency: 60 } });
      if (lines.length > 0) {
        slide.addText(lines.join("\n"), {
          x: 1, y: 4.35, w: 11.3, h: 1.5,
          fontFace: "Roboto", fontSize: 16, color: "DDDDDD", align: "center",
        });
      }
      addLogo(slide, "br", true);
      addFooter(slide, s.title, num, total, true);
      break;
    }

    // ── KPI Dashboard ──────────────────────────────────────────────
    case "kpi-dashboard": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const metrics = lines.slice(0, 4).map((l) => {
        const colon = l.indexOf(":");
        if (colon > 0) return { value: l.slice(0, colon).trim(), label: l.slice(colon + 1).trim() };
        return { value: l, label: "" };
      });
      const kpiColors = [BRAND.green, BRAND.pine, BRAND.turq, BRAND.orange];
      const positions = [
        { x: 0.5, y: 2.0 },
        { x: 7.0, y: 2.0 },
        { x: 0.5, y: 4.6 },
        { x: 7.0, y: 4.6 },
      ];
      metrics.forEach((m, i) => {
        const pos = positions[i];
        slide.addShape("rect", { x: pos.x, y: pos.y, w: 5.8, h: 2.3, fill: { color: kpiColors[i] } });
        slide.addText(m.label, {
          x: pos.x + 0.2, y: pos.y + 0.15, w: 5.4, h: 0.5,
          fontFace: "Roboto", fontSize: 12, color: "FFFFFF", transparency: 30,
        });
        slide.addText(m.value, {
          x: pos.x + 0.2, y: pos.y + 0.65, w: 5.4, h: 1.4,
          fontFace: "Roboto", fontSize: 36, bold: true, color: "FFFFFF",
        });
      });
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Two Column ─────────────────────────────────────────────────
    case "two-column": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
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
          (side === "before" ? beforeLines : afterLines).push(line);
        }
      }
      slide.addShape("rect", { x: 6.62, y: 1.8, w: 0.04, h: 4.5, fill: { color: BRAND.green } });
      // Before column
      slide.addText("BEFORE", {
        x: 0.5, y: 1.8, w: 5.9, h: 0.4,
        fontFace: "Roboto", fontSize: 10, bold: true, color: BRAND.muted,
      });
      slide.addText("Current State", {
        x: 0.5, y: 2.25, w: 5.9, h: 0.5,
        fontFace: "Roboto", fontSize: 15, bold: true, color: BRAND.fg,
      });
      if (beforeLines.length > 0) {
        slide.addText(
          beforeLines.map((b) => ({ text: b, options: { bullet: true, fontSize: 13, color: BRAND.fg } })),
          { x: 0.5, y: 2.9, w: 5.9, h: 3.3, fontFace: "Roboto", paraSpaceAfter: 5 }
        );
      }
      // After column
      slide.addText("AFTER", {
        x: 6.9, y: 1.8, w: 6.0, h: 0.4,
        fontFace: "Roboto", fontSize: 10, bold: true, color: BRAND.green,
      });
      slide.addText("Target State", {
        x: 6.9, y: 2.25, w: 6.0, h: 0.5,
        fontFace: "Roboto", fontSize: 15, bold: true, color: BRAND.fg,
      });
      if (afterLines.length > 0) {
        slide.addText(
          afterLines.map((b) => ({ text: b, options: { bullet: true, fontSize: 13, color: BRAND.fg } })),
          { x: 6.9, y: 2.9, w: 6.0, h: 3.3, fontFace: "Roboto", paraSpaceAfter: 5 }
        );
      }
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Timeline ───────────────────────────────────────────────────
    case "timeline": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const steps = lines.slice(0, 5).map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return { yr: parts[0] || "", title: parts[1] || "", desc: parts[2] || "" };
      });
      const count = Math.max(steps.length, 1);
      const stepW = (W - 1.0) / count;
      slide.addShape("rect", { x: 0.5, y: 3.5, w: W - 1.0, h: 0.04, fill: { color: BRAND.green } });
      steps.forEach((step, i) => {
        const x = 0.5 + i * stepW;
        const cx = x + stepW / 2 - 0.08;
        slide.addShape("rect", { x: cx, y: 3.3, w: 0.16, h: 0.44, fill: { color: BRAND.green } });
        if (step.yr) {
          slide.addText(step.yr, {
            x, y: 2.5, w: stepW - 0.1, h: 0.6,
            fontFace: "Roboto", fontSize: 13, bold: true, color: BRAND.green, align: "center",
          });
        }
        if (step.title) {
          slide.addText(step.title, {
            x, y: 3.9, w: stepW - 0.1, h: 0.6,
            fontFace: "Roboto", fontSize: 13, bold: true, color: BRAND.fg, align: "center",
          });
        }
        if (step.desc) {
          slide.addText(step.desc, {
            x, y: 4.6, w: stepW - 0.1, h: 1.5,
            fontFace: "Roboto", fontSize: 11, color: BRAND.muted, align: "center",
          });
        }
      });
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Process Pipeline ───────────────────────────────────────────
    case "process-pipeline": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const steps = lines.slice(0, 5).map((l, i) => {
        const parts = l.split("|").map((p) => p.trim());
        return { num: i + 1, title: parts[0] || "", desc: parts[1] || "" };
      });
      const count = Math.max(steps.length, 1);
      const stepW = (W - 1.0) / count;
      steps.forEach((step, i) => {
        const x = 0.5 + i * stepW;
        const isDark = i === 0;
        slide.addShape("rect", {
          x, y: 2.0, w: stepW - 0.15, h: 3.8,
          fill: { color: BRAND.green, transparency: isDark ? 0 : 85 },
        });
        slide.addText(String(step.num).padStart(2, "0"), {
          x: x + 0.15, y: 2.2, w: stepW - 0.3, h: 0.6,
          fontFace: "Roboto", fontSize: 22, bold: true, color: isDark ? "FFFFFF" : BRAND.green,
        });
        if (step.title) {
          slide.addText(step.title, {
            x: x + 0.15, y: 2.9, w: stepW - 0.3, h: 0.6,
            fontFace: "Roboto", fontSize: 12, bold: true, color: isDark ? "FFFFFF" : BRAND.fg,
          });
        }
        if (step.desc) {
          slide.addText(step.desc, {
            x: x + 0.15, y: 3.6, w: stepW - 0.3, h: 1.9,
            fontFace: "Roboto", fontSize: 11, color: isDark ? "DDDDDD" : BRAND.muted,
          });
        }
      });
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Data Table ─────────────────────────────────────────────────
    case "data-table": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const headerLine = lines[0] || "";
      const headers = headerLine.split("|").map((h) => h.trim()).filter(Boolean);
      const dataRows = lines.slice(1);
      if (headers.length > 0) {
        const colW = (W - 1.0) / headers.length;
        const tableRows: PptxGenJS.TableRow[] = [
          headers.map((h) => ({
            text: h,
            options: {
              bold: true, color: "FFFFFF",
              fill: { color: BRAND.green }, fontSize: 12, fontFace: "Roboto",
            },
          })),
          ...dataRows.map((r, ri) => {
            const rawCells = r.split("|").map((c) => c.trim());
            const cells = Array.from({ length: headers.length }, (_, ci) => rawCells[ci] ?? "");
            const isTotal = ri === dataRows.length - 1 && r.toLowerCase().includes("total");
            return cells.map((c, ci) => ({
              text: c,
              options: {
                bold: isTotal || ci === 0,
                fill: { color: isTotal ? "D0E4DC" : ri % 2 === 0 ? BRAND.surface : BRAND.mint },
                fontSize: 11, fontFace: "Roboto", color: BRAND.fg,
              },
            }));
          }),
        ];
        slide.addTable(tableRows, {
          x: 0.5, y: 1.8, w: W - 1.0,
          colW: headers.map(() => colW),
          border: { type: "none" },
          rowH: 0.4,
        });
      }
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Org Chart ──────────────────────────────────────────────────
    case "org-chart": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const topLine = lines[0] || "";
      const topParts = topLine.split("|").map((p) => p.trim());
      const children = lines.slice(1, 5).map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return { role: parts[0] || "", name: parts[1] || "", sub: parts[2] || "" };
      });
      const topX = (W - 4) / 2;
      slide.addShape("rect", { x: topX, y: 1.9, w: 4, h: 1.0, fill: { color: BRAND.green } });
      slide.addText([topParts[0], topParts[1]].filter(Boolean).join("\n"), {
        x: topX + 0.1, y: 1.9, w: 3.8, h: 1.0,
        fontFace: "Roboto", fontSize: 13, bold: true, color: "FFFFFF",
        align: "center", valign: "middle",
      });
      if (children.length > 0) {
        slide.addShape("rect", { x: W / 2 - 0.02, y: 2.9, w: 0.04, h: 0.4, fill: { color: BRAND.green } });
        slide.addShape("rect", { x: 0.5, y: 3.3, w: W - 1.0, h: 0.04, fill: { color: BRAND.green } });
        const childW = (W - 1.0) / children.length;
        children.forEach((child, i) => {
          const x = 0.5 + i * childW;
          const cx = x + childW / 2 - 0.02;
          slide.addShape("rect", { x: cx, y: 3.3, w: 0.04, h: 0.4, fill: { color: BRAND.green } });
          slide.addShape("rect", {
            x: x + 0.1, y: 3.7, w: childW - 0.2, h: 1.1,
            fill: { color: BRAND.surface },
            line: { color: BRAND.green, width: 1 },
          });
          slide.addText([child.role, child.name].filter(Boolean).join("\n"), {
            x: x + 0.1, y: 3.7, w: childW - 0.2, h: 1.1,
            fontFace: "Roboto", fontSize: 11, color: BRAND.fg,
            align: "center", valign: "middle",
          });
        });
      }
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Sidebar Bullets ────────────────────────────────────────────
    case "sidebar-bullets": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const sidebarText = lines.slice(0, 2);
      const bulletLines = lines.slice(2);
      slide.addShape("rect", { x: 0.5, y: 1.8, w: 3.5, h: 4.5, fill: { color: BRAND.green } });
      slide.addText("Why this matters", {
        x: 0.65, y: 2.0, w: 3.2, h: 0.4,
        fontFace: "Roboto", fontSize: 10, color: "AAAAAA",
      });
      if (sidebarText.length > 0) {
        slide.addText(sidebarText.join("\n\n"), {
          x: 0.65, y: 2.5, w: 3.2, h: 3.6,
          fontFace: "Roboto", fontSize: 14, color: "FFFFFF",
        });
      }
      if (bulletLines.length > 0) {
        slide.addText(
          bulletLines.map((b) => ({ text: b, options: { bullet: true, fontSize: 14, color: BRAND.fg } })),
          { x: 4.3, y: 1.8, w: 8.5, h: 4.5, fontFace: "Roboto", paraSpaceAfter: 6 }
        );
      }
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Content Image 60/40 ────────────────────────────────────────
    case "content-image-60-40": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      const contentLines = lines.slice(0, 4);
      if (contentLines.length > 0) {
        slide.addText(
          contentLines.map((b) => ({ text: b, options: { bullet: true, fontSize: 14, color: BRAND.fg } })),
          { x: 0.5, y: 1.8, w: 7.5, h: 4.5, fontFace: "Roboto", paraSpaceAfter: 6 }
        );
      }
      slide.addShape("rect", { x: 8.3, y: 1.8, w: 4.5, h: 4.5, fill: { color: "D8D8D8" } });
      slide.addText("Image", {
        x: 8.3, y: 3.8, w: 4.5, h: 0.5,
        fontFace: "Roboto", fontSize: 14, color: "888888", align: "center",
      });
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Image Content 40/60 ────────────────────────────────────────
    case "image-content-40-60": {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      slide.addShape("rect", { x: 0.5, y: 1.8, w: 4.5, h: 4.5, fill: { color: "D8D8D8" } });
      slide.addText("Image", {
        x: 0.5, y: 3.8, w: 4.5, h: 0.5,
        fontFace: "Roboto", fontSize: 14, color: "888888", align: "center",
      });
      const contentLines = lines.slice(1);
      if (contentLines.length > 0) {
        slide.addText(
          contentLines.map((b) => ({ text: b, options: { bullet: true, fontSize: 14, color: BRAND.fg } })),
          { x: 5.3, y: 1.8, w: 7.5, h: 4.5, fontFace: "Roboto", paraSpaceAfter: 6 }
        );
      }
      addFooter(slide, s.title, num, total);
      break;
    }

    // ── Full Bleed Image ───────────────────────────────────────────
    case "full-bleed-image": {
      slide.background = { color: "222222" };
      const captionTitle = lines[1] || s.title;
      const credit = lines[2] || "";
      slide.addShape("rect", { x: 0, y: 6.0, w: W, h: 1.5, fill: { color: "000000", transparency: 40 } });
      if (captionTitle) {
        slide.addText(captionTitle, {
          x: 0.5, y: 6.1, w: W - 1.0, h: 0.6,
          fontFace: "Roboto", fontSize: 20, bold: true, color: "FFFFFF",
        });
      }
      if (credit) {
        slide.addText(credit, {
          x: 0.5, y: 6.75, w: W - 1.0, h: 0.35,
          fontFace: "Roboto", fontSize: 11, color: "AAAAAA",
        });
      }
      addLogo(slide, "tr", true);
      addFooter(slide, s.title, num, total, true);
      break;
    }

    // ── Bullet List (default for all unrecognised layouts) ─────────
    default: {
      slide.background = { color: BRAND.mint };
      addDesignBar(slide);
      addTitleBlock(slide, s.title);
      if (lines.length > 0) {
        slide.addText(
          lines.map((b) => ({ text: b, options: { bullet: true, fontSize: 14, color: "3A3A3A" } })),
          { x: 0.8, y: 1.7, w: 11.7, h: 4.5, fontFace: "Roboto", paraSpaceAfter: 6 }
        );
      } else if (s.contentPrompt) {
        slide.addText(s.contentPrompt, {
          x: 0.8, y: 1.7, w: 11.7, h: 4.5,
          fontFace: "Roboto", fontSize: 16, italic: true, color: BRAND.muted,
        });
      }
      addLogo(slide, "br", false);
      addFooter(slide, s.title, num, total);
      break;
    }
  }

  return slide;
}

function addOverlayBlocks(slide: PptxGenJS.Slide, blocks: TextBlock[]) {
  for (const block of blocks) {
    slide.addText(block.text, {
      x: (block.x / 100) * W,
      y: (block.y / 100) * H,
      w: 4,
      h: 0.5,
      fontFace: "Roboto",
      fontSize: 14,
      bold: block.bold,
      italic: block.italic,
      color: block.color.replace("#", ""),
    });
  }
}

export async function buildPptx(
  slides: SlideContent[],
  overlayBlocks?: Record<number, TextBlock[]>
): Promise<ArrayBuffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: W, height: H });
  pptx.layout = "WIDE";
  const total = slides.length;

  slides.forEach((s, i) => {
    const slide = renderSlide(s, i, total, pptx);
    const blocks = overlayBlocks?.[i + 1] ?? [];
    if (blocks.length > 0) addOverlayBlocks(slide, blocks);
  });

  return pptx.write({ outputType: "arraybuffer" }) as Promise<ArrayBuffer>;
}
