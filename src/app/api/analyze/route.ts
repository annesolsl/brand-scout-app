import { NextRequest, NextResponse } from "next/server";
import { analyzeBrand } from "@/lib/analyze";
import { scrapeSite } from "@/lib/scrape";

type RequestBody = {
  url?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    if (!body.url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const pages = await scrapeSite(body.url);
    const result = analyzeBrand(body.url, pages);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
