import * as cheerio from "cheerio";

type ScrapedPage = {
  url: string;
  text: string;
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

function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
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

async function fetchPageText(url: string): Promise<string> {
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
  return extractVisibleText(html);
}

export async function scrapeSite(urlInput: string): Promise<ScrapedPage[]> {
  const normalized = normalizeInputUrl(urlInput);
  const rootUrl = new URL(normalized);

  const homeRes = await fetch(normalized, { cache: "no-store" });
  if (!homeRes.ok) {
    throw new Error(`Could not load homepage (${homeRes.status}).`);
  }
  const homeHtml = await homeRes.text();
  const homeText = extractVisibleText(homeHtml);
  const candidateLinks = pickRelevantLinks(homeHtml, rootUrl);

  const pages: ScrapedPage[] = [{ url: normalized, text: homeText }];

  for (const link of candidateLinks) {
    try {
      const text = await fetchPageText(link);
      pages.push({ url: link, text });
    } catch {
      // Continue even if some pages fail.
    }
  }

  return pages;
}
