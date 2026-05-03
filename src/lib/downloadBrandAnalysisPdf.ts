import { jsPDF } from "jspdf";
import { marked } from "marked";
import type { Token, Tokens } from "marked";
import type { BrandAnalysis } from "./types";

const COLOR = {
  canvas: [244, 244, 245] as [number, number, number],
  border: [228, 228, 231] as [number, number, number],
  text: [24, 24, 27] as [number, number, number],
  navy: [15, 23, 42] as [number, number, number],
  muted: [113, 113, 122] as [number, number, number]
};

const MARGIN_MM = 18;
const PAGE_PAD_MM = 16;

type PdfCtx = {
  doc: jsPDF;
  y: number;
  margin: number;
  maxWidth: number;
  pageHeight: number;
  pageWidth: number;
};

function safeFilenamePart(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.replace(/[^a-z0-9.-]+/gi, "-").slice(0, 60) || "report";
  } catch {
    return "report";
  }
}

/** Built-in PDF fonts are Latin-1; normalize smart quotes and strip unsupported code points. */
function sanitizeForPdf(text: string): string {
  let s = text
    .replace(/\u00a0/g, " ")
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2212/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[\u200b\ufeff\u200c\u200d\ufe0f]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  s = s.replace(/\*{3,}/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\n]+)\*/g, "$1");

  const out: string[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp === 10 || cp === 9) {
      out.push(ch);
      continue;
    }
    if (cp >= 32 && cp <= 255) {
      out.push(ch);
      continue;
    }
    if (cp > 255) {
      out.push(" ");
    }
  }
  return out.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function plainFromTokens(tokens: Token[] | undefined): string {
  if (!tokens?.length) return "";
  let out = "";
  for (const t of tokens) {
    switch (t.type) {
      case "text":
      case "escape":
        out += (t as Tokens.Text).text;
        break;
      case "strong":
      case "em":
      case "del":
        out += plainFromTokens((t as Tokens.Strong).tokens);
        break;
      case "codespan":
        out += (t as Tokens.Codespan).text;
        break;
      case "link":
        out += (t as Tokens.Link).text || plainFromTokens((t as Tokens.Link).tokens);
        break;
      case "image":
        out += (t as Tokens.Image).text || "";
        break;
      case "br":
        out += " ";
        break;
      default: {
        const g = t as Tokens.Generic;
        if (Array.isArray(g.tokens)) {
          out += plainFromTokens(g.tokens as Token[]);
        } else if (typeof g.text === "string") {
          out += g.text;
        }
        break;
      }
    }
  }
  return out;
}

function paragraphPlain(p: Tokens.Paragraph): string {
  const fromTok = plainFromTokens(p.tokens);
  if (fromTok.trim()) return sanitizeForPdf(fromTok);
  return sanitizeForPdf(p.text || p.raw || "");
}

function headingPlain(h: Tokens.Heading): string {
  const fromTok = plainFromTokens(h.tokens);
  if (fromTok.trim()) return sanitizeForPdf(fromTok);
  return sanitizeForPdf(h.text || "");
}

function listItemPlain(item: Tokens.ListItem): string {
  const fromTok = plainFromTokens(item.tokens);
  if (fromTok.trim()) return sanitizeForPdf(fromTok);
  return sanitizeForPdf(item.text || "");
}

function tableCellPlain(cell: Tokens.TableCell): string {
  const fromTok = plainFromTokens(cell.tokens);
  if (fromTok.trim()) return sanitizeForPdf(fromTok);
  return sanitizeForPdf(cell.text || "");
}

function drawPageCanvas(ctx: PdfCtx): void {
  const { doc } = ctx;
  const h = doc.internal.pageSize.getHeight();
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLOR.canvas);
  doc.rect(0, 0, w, h, "F");
}

function newPageIfNeeded(ctx: PdfCtx, neededMm: number): void {
  if (ctx.y + neededMm > ctx.pageHeight - PAGE_PAD_MM) {
    ctx.doc.addPage();
    drawPageCanvas(ctx);
    ctx.y = ctx.margin;
  }
}

function writeWrapped(
  ctx: PdfCtx,
  text: string,
  opts: {
    fontSize: number;
    fontStyle?: "normal" | "bold" | "italic";
    font?: string;
    lineMm: number;
    indent?: number;
    color?: [number, number, number];
  }
): void {
  const { doc } = ctx;
  const indent = opts.indent ?? 0;
  const x = ctx.margin + indent;
  const width = ctx.maxWidth - indent;
  const safe = sanitizeForPdf(text);
  if (!safe) return;
  doc.setFont(opts.font ?? "helvetica", opts.fontStyle ?? "normal");
  doc.setFontSize(opts.fontSize);
  if (opts.color) doc.setTextColor(...opts.color);
  else doc.setTextColor(...COLOR.text);
  const lines = doc.splitTextToSize(safe, width);
  for (const line of lines) {
    newPageIfNeeded(ctx, opts.lineMm);
    doc.text(line, x, ctx.y);
    ctx.y += opts.lineMm;
  }
}

function renderMarkdown(doc: jsPDF, md: string, ctx: PdfCtx): void {
  const tokens = marked.lexer(md) as Token[];

  for (const token of tokens) {
    switch (token.type) {
      case "space":
        break;
      case "hr":
        ctx.y += 4;
        doc.setDrawColor(...COLOR.border);
        doc.setLineWidth(0.3);
        newPageIfNeeded(ctx, 2);
        doc.line(ctx.margin, ctx.y, ctx.margin + ctx.maxWidth, ctx.y);
        ctx.y += 5;
        break;
      case "heading": {
        const h = token as Tokens.Heading;
        const depth = h.depth;
        const size = depth <= 2 ? 13 : depth === 3 ? 11.5 : depth === 4 ? 10.5 : 10;
        const lineMm = size * 0.42;
        const color = depth <= 2 ? COLOR.navy : COLOR.text;
        ctx.y += depth <= 2 ? 4 : 2;
        writeWrapped(ctx, headingPlain(h), {
          fontSize: size,
          fontStyle: "bold",
          lineMm,
          color
        });
        ctx.y += depth <= 2 ? 4 : 2;
        break;
      }
      case "paragraph": {
        const p = token as Tokens.Paragraph;
        writeWrapped(ctx, paragraphPlain(p), { fontSize: 10, lineMm: 5, color: COLOR.text });
        ctx.y += 2;
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        let n = typeof list.start === "number" ? list.start : 1;
        for (const item of list.items) {
          const prefix = list.ordered ? `${n}. ` : "• ";
          n += 1;
          const body = item.task
            ? `${item.checked ? "[x]" : "[ ]"} ${listItemPlain(item)}`
            : listItemPlain(item);
          writeWrapped(ctx, `${prefix}${body}`, { fontSize: 10, lineMm: 5 });
        }
        ctx.y += 3;
        break;
      }
      case "blockquote": {
        const b = token as Tokens.Blockquote;
        ctx.y += 1;
        const inner = sanitizeForPdf(b.tokens?.length ? plainFromTokens(b.tokens) : b.text);
        writeWrapped(ctx, inner, {
          fontSize: 10,
          fontStyle: "italic",
          lineMm: 5,
          indent: 4,
          color: COLOR.muted
        });
        ctx.y += 2;
        break;
      }
      case "code": {
        const c = token as Tokens.Code;
        ctx.y += 1;
        writeWrapped(ctx, c.text, { font: "courier", fontSize: 8.5, lineMm: 4.2, color: COLOR.text });
        ctx.y += 3;
        break;
      }
      case "table": {
        const t = token as Tokens.Table;
        const headerRow = t.header.map((cell) => tableCellPlain(cell)).join("  ·  ");
        const bodyRows = t.rows.map((row) => row.map((cell) => tableCellPlain(cell)).join("  ·  "));
        ctx.y += 2;
        writeWrapped(ctx, headerRow, { fontSize: 9, fontStyle: "bold", lineMm: 4.5, color: COLOR.navy });
        for (const row of bodyRows) {
          writeWrapped(ctx, row, { fontSize: 9, lineMm: 4.5, color: COLOR.text });
        }
        ctx.y += 3;
        break;
      }
      default:
        break;
    }
  }
}

function sectionTitle(ctx: PdfCtx, title: string): void {
  ctx.y += 6;
  newPageIfNeeded(ctx, 16);
  ctx.doc.setTextColor(...COLOR.navy);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(13);
  ctx.doc.text(sanitizeForPdf(title), ctx.margin, ctx.y);
  ctx.y += 8;
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(10);
  ctx.doc.setTextColor(...COLOR.text);
}

export function downloadBrandAnalysisPdf(analysis: BrandAnalysis): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN_MM * 2;

  const ctx: PdfCtx = {
    doc,
    y: MARGIN_MM,
    margin: MARGIN_MM,
    maxWidth,
    pageHeight,
    pageWidth
  };

  drawPageCanvas(ctx);

  doc.setTextColor(...COLOR.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Brand Scout Analysis", ctx.margin, ctx.y);
  ctx.y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  writeWrapped(ctx, `Source: ${analysis.sourceUrl}`, { fontSize: 10, lineMm: 5, color: COLOR.muted });
  writeWrapped(ctx, `Generated: ${new Date().toLocaleString()}`, { fontSize: 10, lineMm: 5, color: COLOR.muted });
  ctx.y += 3;
  doc.setTextColor(...COLOR.text);

  renderMarkdown(doc, analysis.analysisMarkdown, ctx);

  sectionTitle(ctx, "Tone of voice");
  const { toneSummary: t } = analysis;
  writeWrapped(ctx, `Formality: ${t.formality}`, { fontSize: 10, lineMm: 5 });
  writeWrapped(ctx, `Personality: ${t.personality}`, { fontSize: 10, lineMm: 5 });
  writeWrapped(ctx, `Style: ${t.style}`, { fontSize: 10, lineMm: 5 });
  writeWrapped(ctx, `CTA style: ${t.ctaStyle}`, { fontSize: 10, lineMm: 5 });

  sectionTitle(ctx, "Proof signals");
  if (analysis.toneSummary.proofSignals.length === 0) {
    writeWrapped(ctx, "No proof signals detected.", { fontSize: 10, lineMm: 5, color: COLOR.muted });
  } else {
    for (const signal of analysis.toneSummary.proofSignals) {
      writeWrapped(ctx, `• ${signal}`, { fontSize: 10, lineMm: 5 });
    }
  }

  sectionTitle(ctx, "Scanned pages");
  for (const page of analysis.pagesScanned) {
    writeWrapped(ctx, `• ${page}`, { fontSize: 9, lineMm: 4.5, color: COLOR.muted });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `brand-scout-${safeFilenamePart(analysis.sourceUrl)}-${stamp}.pdf`;
  doc.save(name);
}
