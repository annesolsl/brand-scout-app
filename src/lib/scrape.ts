import * as cheerio from "cheerio";

export type ScrapedPage = {
  url: string;
  /** Visible body text with headings removed—used for voice / tone analysis. */
  text: string;
  /** `h1`–`h6` outline for site structure only; not scored as narrative voice. */
  structureText: string;
};

const KEY_PATH_HINTS = [
  "/about",
  "/faq",
  "/ingredients",
  "/product",
  "/products",
  "/pricing",
  "/collections"
];

function normalizeInputUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error("Please provide a URL.");
  }
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

function extractPageCorpora(html: string): { voiceText: string; structureText: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();

  const headings: string[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length <= 220) headings.push(t);
  });

  $("title").remove();
  $("h1, h2, h3, h4, h5, h6").remove();
  const voiceText = $("body").text().replace(/\s+/g, " ").trim();

  const uniqueHeadings: string[] = [];
  for (const h of headings) {
    const prev = uniqueHeadings[uniqueHeadings.length - 1];
    if (!prev || prev.toLowerCase() !== h.toLowerCase()) uniqueHeadings.push(h);
  }
  const structureText = uniqueHeadings.join(" · ");

  return { voiceText, structureText };
}

function pickRelevantLinks(html: string, rootUrl: URL): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, rootUrl);
      if (absolute.origin !== rootUrl.origin) return;
      if (KEY_PATH_HINTS.some((hint) => absolute.pathname.toLowerCase().includes(hint))) {
        links.add(absolute.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  });

  return [...links].slice(0, 7);
}

async function fetchPageCorpora(url: string): Promise<{ voiceText: string; structureText: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "BrandScout/1.0 (+https://example.com)"
    },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status})`);
  }
  const html = await res.text();
  return extractPageCorpora(html);
}

export async function scrapeSite(urlInput: string): Promise<ScrapedPage[]> {
  const normalized = normalizeInputUrl(urlInput);
  const rootUrl = new URL(normalized);

  const homeRes = await fetch(normalized, { cache: "no-store" });
  if (!homeRes.ok) {
    throw new Error(`Could not load homepage (${homeRes.status}).`);
  }
  const homeHtml = await homeRes.text();
  const home = extractPageCorpora(homeHtml);
  const candidateLinks = pickRelevantLinks(homeHtml, rootUrl);

  const pages: ScrapedPage[] = [
    { url: normalized, text: home.voiceText, structureText: home.structureText }
  ];

  for (const link of candidateLinks) {
    try {
      const { voiceText, structureText } = await fetchPageCorpora(link);
      pages.push({ url: link, text: voiceText, structureText });
    } catch {
      // Continue even if some pages fail.
    }
  }

  return pages;
}
