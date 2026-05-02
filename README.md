# Brand Scout App

Standalone Next.js + Tailwind application for website brand analysis.

## Features

- Dark, dashboard-style interface with URL input and `Scout Site` action
- API route for scraping website content using Cheerio
- Analysis logic modeled after:
  - `skills/copywriting`
  - `skills/competitor-profiling`
- Output rendered as:
  - Long-form **structure analysis** (markdown narrative: personality, tone, language, on-site communication, audience, “mirror this tone,” plus a compact positioning table)
  - Tone of Voice summary card

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

`POST /api/analyze`

```json
{
  "url": "https://example.com"
}
```

Response includes:
- `analysisMarkdown`
- `toneSummary`
- `pagesScanned`
