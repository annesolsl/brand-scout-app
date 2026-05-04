import type { ScrapedPage } from "./scrape";

/**
 * Removes generic e-commerce utility / UI copy so brand voice analysis focuses on
 * narrative, descriptive, and persuasive copy—not buttons, checkout, or nav.
 *
 * Aligns with negative constraints in `brandAnalysisSystemPrompt.ts`.
 */

/** Strip these substrings from the blob first (even mid-sentence), then sentence-filter. */
const STRIP_SUBSTRING_PATTERNS: RegExp[] = [
  /Taxes, discounts and shipping calculated at checkout/gi,
  /Estimated total/gi,
  /\bVIEW OFFERS?\b/gi,
  /\bADD TO CART\b/gi,
  /\bFREE SHIPPING\b/gi,
  /\bFree Shipping\b/g,
  /\bSUBSCRIBE NOW\b/gi,
  /\bSubscribe Now\b/g,
  /\bSubscribe to any product\b/gi,
  /\bSave\s+\d{1,2}%\b/gi,
  /\bSave\s+\d{1,2}%\s+on\b/gi,
  /\b\d{1,2}%\s*off\b/gi,
  /\b\d{1,2}%\s*OFF\b/g,
  /\bSave\s+\d{1,2}%\s+today\b/gi,
  /\bauto[- ]?deliver(y|ies)?\b/gi,
  /\bsubscribe\s*(?:&|and|\+)\s*save\b/gi,
  /\d+%\s*off\s+forever/gi,
  /\bSave All Year Long\b/gi,
  /\bOffers? Start Strong\b/gi,
  /\bShop All\b/gi,
  /\bNew Arrivals\b/gi
];

const UTILITY_PHRASES: RegExp[] = [
  /taxes,?\s*discounts?\s*(and\s*)?shipping/i,
  /calculated at checkout/i,
  /shipping calculated/i,
  /your cart is empty/i,
  /your bag is empty/i,
  /cart is empty/i,
  /\b(empty cart|view cart|shopping cart)\b/i,
  /\b(checkout|secure checkout|proceed to checkout)\b/i,
  /order summary/i,
  /estimated tax/i,
  /promo code|coupon code|gift card/i,
  /free shipping on orders over/i,
  /\bfree shipping\b/i,
  /\bview offers?\b/i,
  /\bsubscribe\s+now\b/i,
  /\bsubscribe\s+to\s+any\b/i,
  /\bsubscribe\s*(?:&|and|\+)\s*save\b/i,
  /\bsave\s+\d{1,2}%\b/i,
  /\b\d{1,2}%\s*off\b/i,
  /\bget\s+\d+%\s*off\b/i,
  /\b\d+%\s*off\s+forever\b/i,
  /\bsave all year\b/i,
  /\boffers?\s+start\b/i,
  /\bshop all\b/i,
  /\bnew arrivals\b/i,
  /free \w+ on orders over\s*\$?\d/i,
  /orders?\s+over\s*\$?\d+\s*(qualify|ship free|get free)/i,
  /^\s*subscribe\s+(to\s+)?(our\s+)?(newsletter|emails?)\s*$/i,
  /accept all cookies/i,
  /reject all|cookie settings|privacy preferences/i,
  /^\s*close\s*$/i,
  /^\s*menu\s*$/i
];

/**
 * If true, this string must not be quoted as “representative” voice evidence
 * (promotional / nav / offer language).
 */
const SNIPPET_EXCLUDE: RegExp[] = [
  /\bview offers?\b/i,
  /\bfree shipping\b/i,
  /\bsubscribe\s+now\b/i,
  /\bsubscribe\s+to\s+any\b/i,
  /\bsubscribe\s*(?:&|and|\+)\s*save\b/i,
  /\bsave\s+\d{1,2}%\b/i,
  /\b\d{1,2}%\s*off\b/i,
  /\bget\s+\d+%\s*off\b/i,
  /\b\d+%\s*off\s+forever\b/i,
  /\bsave all year\b/i,
  /\boffers?\s+start\s+strong\b/i,
  /\bshop all\b/i,
  /\bnew arrivals\b/i,
  /\blimited time offer\b/i,
  /\bact now\b/i
];

export function snippetContainsExcludedPromo(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return SNIPPET_EXCLUDE.some((re) => re.test(t));
}

const LIKELY_BUTTON_LABELS = new Set(
  [
    "add to cart",
    "add to bag",
    "buy now",
    "shop now",
    "view offers",
    "view offer",
    "view all",
    "log in",
    "login",
    "sign in",
    "sign out",
    "log out",
    "register",
    "create account",
    "search",
    "submit",
    "apply",
    "continue shopping",
    "update cart",
    "remove",
    "edit",
    "save",
    "cancel",
    "close",
    "next",
    "previous",
    "back",
    "filter",
    "sort by",
    "show more",
    "read more",
    "learn more",
    "get started",
    "join now",
    "subscribe",
    "subscribe now",
    "subscribe & save",
    "subscribe and save",
    "unsubscribe",
    "account",
    "wishlist",
    "compare",
    "size guide",
    "find a store",
    "track order",
    "help",
    "contact us",
    "faq",
    "shipping & returns",
    "returns",
    "terms",
    "privacy policy"
  ].map((s) => s.toLowerCase())
);

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Collapses immediate repeats of the same word or short phrase (e.g. nav: "About Us About Us").
 */
export function collapseAdjacentRepeatedPhrases(blob: string): string {
  let t = normalizeWs(blob);
  let prev = "";
  while (prev !== t) {
    prev = t;
    for (let words = 6; words >= 1; words--) {
      const chunk =
        words === 1
          ? String.raw`(\w{3,})`
          : String.raw`((?:\w+\s+){${words - 1}}\w+)`;
      const re = new RegExp(String.raw`\b${chunk}\s+\1(?:\s+\1)*\b`, "gi");
      t = normalizeWs(t.replace(re, "$1"));
    }
  }
  return t;
}

function stripBoilerplatePhrases(blob: string): string {
  let t = blob;
  for (const re of STRIP_SUBSTRING_PATTERNS) {
    t = t.replace(re, " ");
  }
  return normalizeWs(t);
}

function matchesUtilityPhrase(s: string): boolean {
  const t = s.trim();
  for (const re of UTILITY_PHRASES) {
    if (re.test(t)) return true;
  }
  return false;
}

function isLikelyAllCapsButton(s: string): boolean {
  const t = s.trim();
  if (t.length < 3 || t.length > 48) return false;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (upper / letters.length < 0.75) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  return true;
}

function isLikelyUiOnlyShortLine(s: string): boolean {
  const t = normalizeWs(s);
  if (t.length > 60) return false;
  const lower = t.toLowerCase().replace(/[!?.]+$/, "");
  if (LIKELY_BUTTON_LABELS.has(lower)) return true;
  if (LIKELY_BUTTON_LABELS.has(lower.split(/\s*[·|]\s*/)[0] ?? "")) return true;
  return false;
}

function shouldKeepSentence(sentence: string): boolean {
  const t = normalizeWs(sentence);
  if (!t) return false;

  if (matchesUtilityPhrase(t)) return false;
  if (isLikelyAllCapsButton(t)) return false;
  if (t.length <= 64 && isLikelyUiOnlyShortLine(t)) return false;

  return true;
}

/**
 * Split on sentence boundaries; keep fragments that still carry narrative value.
 */
function splitIntoSentences(blob: string): string[] {
  const n = normalizeWs(blob);
  if (!n) return [];
  return n
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function cleanTextForVoiceAnalysis(raw: string): string {
  const stripped = collapseAdjacentRepeatedPhrases(stripBoilerplatePhrases(raw));
  const sentences = splitIntoSentences(stripped);
  const kept = sentences.filter(shouldKeepSentence);
  return collapseAdjacentRepeatedPhrases(normalizeWs(kept.join(" ")));
}

export function cleanScrapedPagesForVoice(pages: ScrapedPage[]): ScrapedPage[] {
  return pages.map((p) => ({
    url: p.url,
    text: cleanTextForVoiceAnalysis(p.text),
    structureText: p.structureText ?? ""
  }));
}
