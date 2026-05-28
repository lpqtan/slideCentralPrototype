import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import PptxGenJS from "pptxgenjs";

const BRAND = {
  green: "045941",
  mint: "E8F1ED",
  surface: "FFFFFF",
  fg: "1A1A1A",
  muted: "6B6B6B",
};

function darkSlide(slide: PptxGenJS.Slide) {
  slide.background = { color: BRAND.green };
}
function lightSlide(slide: PptxGenJS.Slide) {
  slide.background = { color: BRAND.mint };
}

function addFooter(slide: PptxGenJS.Slide, text: string, num: number, total: number) {
  slide.addText(text, { x: 0.4, y: 7.15, w: 5, h: 0.3, fontFace: "Roboto", fontSize: 8, color: BRAND.muted });
  slide.addText(`${num} / ${total}`, { x: 12.5, y: 7.15, w: 1, h: 0.3, fontFace: "Roboto", fontSize: 8, color: BRAND.muted, align: "right" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { html } = body as { html: string };

    if (!html) {
      return NextResponse.json({ error: "No HTML to export" }, { status: 400 });
    }

    if (html.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "HTML too large. Maximum 5 MB." }, { status: 400 });
    }

    const $ = cheerio.load(html);
    const slides = $(".slide");
    if (slides.length === 0) {
      return NextResponse.json({ error: "No slides found in HTML" }, { status: 400 });
    }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
    pptx.layout = "WIDE";

    const total = slides.length;

    slides.each((i, el) => {
      const s = $(el);
      const isCover = s.hasClass("cover");
      const isClosing = s.hasClass("closing");
      const isBigStat = s.hasClass("big-stat");
      const isQuote = s.hasClass("quote");
      const isDivider = s.hasClass("divider");

      const slide = pptx.addSlide();

      // ── Cover ──────────────────────────
      if (isCover) {
        darkSlide(slide);
        const title = s.find(".h-cover").text().trim() || `Slide ${i + 1}`;
        const subtitle = s.find(".subtitle").text().trim();
        const bandText = s.find(".band-meta").text().trim() || "CPF Board";

        slide.addText(title, { x: 1, y: 2, w: 11.3, h: 2, fontFace: "Roboto", fontSize: 44, bold: true, color: "FFFFFF" });
        if (subtitle) slide.addText(subtitle, { x: 1, y: 4.2, w: 11.3, h: 1.5, fontFace: "Roboto", fontSize: 18, color: "DDDDDD" });
        slide.addShape("rect", { x: 0, y: 7, w: 13.333, h: 0.5, fill: { color: "000000", transparency: 82 } });
        slide.addText(bandText, { x: 1, y: 7.05, w: 5, h: 0.4, fontFace: "Roboto", fontSize: 10, color: "CCCCCC" });
      }

      // ── Closing ────────────────────────
      else if (isClosing) {
        darkSlide(slide);
        const title = s.find(".h-cover").text().trim() || "Thank You";
        const subtitle = s.find(".subtitle").text().trim();

        slide.addText(title, { x: 1, y: 2.5, w: 11.3, h: 1.5, fontFace: "Roboto", fontSize: 40, bold: true, color: "FFFFFF", align: "center" });
        if (subtitle) slide.addText(subtitle, { x: 1, y: 4.5, w: 11.3, h: 1.5, fontFace: "Roboto", fontSize: 16, color: "DDDDDD", align: "center" });
        addFooter(slide, title, i + 1, total);
      }

      // ── Big Stat ───────────────────────
      else if (isBigStat) {
        darkSlide(slide);
        const number = s.find(".big-stat-number").text().trim() || "—";
        const label = s.find(".big-stat-label").text().trim() || "";

        slide.addText(number, { x: 0, y: 1.5, w: 13.333, h: 3, fontFace: "Roboto", fontSize: 72, bold: true, color: "FFFFFF", align: "center" });
        if (label) slide.addText(label, { x: 2, y: 4.5, w: 9.3, h: 1.5, fontFace: "Roboto", fontSize: 18, color: "DDDDDD", align: "center" });
        addFooter(slide, label, i + 1, total);
      }

      // ── Quote ──────────────────────────
      else if (isQuote) {
        darkSlide(slide);
        const quote = s.find(".quote-text").text().trim() || "";
        const cite = s.find(".quote-cite").text().trim() || "";

        if (quote) slide.addText(quote, { x: 1.5, y: 1.5, w: 10.3, h: 3.5, fontFace: "Roboto", fontSize: 24, italic: true, color: "FFFFFF" });
        if (cite) slide.addText(cite, { x: 1.5, y: 5.5, w: 10.3, h: 0.5, fontFace: "Roboto", fontSize: 14, bold: true, color: "DDDDDD" });
        addFooter(slide, `Slide ${i + 1}`, i + 1, total);
      }

      // ── Section Divider ────────────────
      else if (isDivider) {
        lightSlide(slide);
        slide.addShape("rect", { x: 0, y: 5.6, w: 13.333, h: 1.9, fill: { color: BRAND.green } });

        const title = s.find(".h-chapter").text().trim() || s.find(".h-section").text().trim() || `Section`;
        const subtitle = s.find(".subtitle").text().trim();

        slide.addText(title, { x: 1, y: 2, w: 11.3, h: 2, fontFace: "Roboto", fontSize: 36, bold: true, color: BRAND.fg });
        if (subtitle) slide.addText(subtitle, { x: 1, y: 3.5, w: 11.3, h: 1, fontFace: "Roboto", fontSize: 16, color: BRAND.muted });
        addFooter(slide, title, i + 1, total);
      }

      // ── Default Content ────────────────
      else {
        lightSlide(slide);

        // Design bar
        slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.26, fill: { color: BRAND.green } });

        const kicker = s.find(".kicker").text().trim() || "";
        const title = s.find(".h-section").text().trim() || `Slide ${i + 1}`;
        const bullets = s.find(".bullets li");
        const lead = s.find(".lead").text().trim();

        if (kicker) {
          slide.addText(kicker.toUpperCase(), { x: 0.5, y: 0.5, w: 12.3, h: 0.4, fontFace: "Roboto", fontSize: 11, color: BRAND.green });
        }
        slide.addText(title, {
          x: 0.5, y: kicker ? 1 : 0.5, w: 12.3, h: 0.7,
          fontFace: "Roboto", fontSize: 24, bold: true, color: BRAND.fg,
        });
        slide.addShape("rect", { x: 0.5, y: kicker ? 1.7 : 1.3, w: 2, h: 0.04, fill: { color: BRAND.green } });

        if (bullets.length > 0) {
          const bulletArr = bullets.toArray().map((b) => $(b).text().trim()).filter(Boolean);
          slide.addText(
            bulletArr.map((b) => ({ text: b, options: { bullet: true, fontSize: 14, color: "3A3A3A" } })),
            { x: 0.8, y: kicker ? 2 : 1.7, w: 11.7, h: 4.5, fontFace: "Roboto", paraSpaceAfter: 6 }
          );
        } else if (lead) {
          slide.addText(lead, { x: 0.8, y: kicker ? 2 : 1.7, w: 11.7, h: 4.5, fontFace: "Roboto", fontSize: 16, italic: true, color: BRAND.muted });
        }

        addFooter(slide, title, i + 1, total);
      }
    });

    const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="presentation.pptx"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
