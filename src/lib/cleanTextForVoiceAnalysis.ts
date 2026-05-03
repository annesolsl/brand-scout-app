import type { ScrapedPage } from "./scrape";

/**
 * Removes generic e-commerce utility / UI copy so brand voice analysis focuses on
 * narrative, descriptive, and persuasive copy—not buttons, checkout, or nav.
 */

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
  /free \w+ on orders over\s*\$?\d/i,
  /orders?\s+over\s*\$?\d+\s*(qualify|ship free|get free)/i,
  /^\s*subscribe\s+(to\s+)?(our\s+)?(newsletter|emails?)\s*$/i,
  /accept all cookies/i,
  /reject all|cookie settings|privacy preferences/i,
  /^\s*close\s*$/i,
  /^\s*menu\s*$/i
];

const LIKELY_BUTTON_LABELS = new Set(
  [
    "add to cart",
    "add to bag",
    "buy now",
    "shop now",
    "view offers",
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
  const sentences = splitIntoSentences(raw);
  const kept = sentences.filter(shouldKeepSentence);
  return normalizeWs(kept.join(" "));
}

export function cleanScrapedPagesForVoice(pages: ScrapedPage[]): ScrapedPage[] {
  return pages.map((p) => ({
    url: p.url,
    text: cleanTextForVoiceAnalysis(p.text)
  }));
}
