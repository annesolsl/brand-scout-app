import { NextRequest, NextResponse } from "next/server";
import { analyzeBrand } from "@/lib/analyze";
import { cleanScrapedPagesForVoice } from "@/lib/cleanTextForVoiceAnalysis";
import { scrapeSite } from "@/lib/scrape";

type RequestBody = {
  url?: string;
};

/**
 * Brand voice / tone analysis with utility & UI copy stripped before analysis.
 * Prefer this endpoint when the consumer should ignore cart, nav, and transactional chrome.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    if (!body.url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const pages = await scrapeSite(body.url);
    const cleanedPages = cleanScrapedPagesForVoice(pages);
    const result = analyzeBrand(body.url, cleanedPages);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
