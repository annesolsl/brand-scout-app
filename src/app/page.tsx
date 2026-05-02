"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BrandAnalysis } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BrandAnalysis | null>(null);

  const hasResult = useMemo(() => Boolean(result), [result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not analyze this URL.");
      }
      setResult(data as BrandAnalysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-5 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Orbit-style dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Brand Scout</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Paste a URL to scrape written content, then run copywriting and competitor-profiling analysis.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-12 flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none ring-primary transition focus:ring-2"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="h-12 min-w-44 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primarySoft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Scouting..." : "Scout Site"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </header>

        {hasResult && result ? (
          <section className="grid gap-6 lg:grid-cols-12">
            <article className="rounded-2xl border border-slate-800 bg-card p-6 lg:col-span-8">
              <h2 className="text-lg font-semibold text-slate-100">Structure analysis</h2>
              <p className="mt-1 text-xs text-slate-400">
                Source: <span className="text-slate-200">{result.sourceUrl}</span>
              </p>
              <div className="analysis-markdown markdown-table mt-5 overflow-x-auto text-sm leading-relaxed text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysisMarkdown}</ReactMarkdown>
              </div>
            </article>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border border-slate-800 bg-card p-5 shadow-glow">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Tone of Voice
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <Stat label="Formality" value={result.toneSummary.formality} />
                  <Stat label="Personality" value={result.toneSummary.personality} />
                  <Stat label="Style" value={result.toneSummary.style} />
                  <Stat label="CTA Style" value={result.toneSummary.ctaStyle} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Proof Signals
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {result.toneSummary.proofSignals.map((signal) => (
                    <li key={signal} className="rounded-lg border border-slate-700 px-3 py-2">
                      {signal}
                    </li>
                  ))}
                  {!result.toneSummary.proofSignals.length ? (
                    <li className="text-slate-400">No proof signals detected.</li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Scanned Pages
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-300">
                  {result.pagesScanned.map((page) => (
                    <li key={page} className="truncate rounded border border-slate-700 px-2 py-1">
                      {page}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
            Submit a website URL to generate a narrative structure analysis and tone-of-voice card.
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-slate-100">{value}</p>
    </div>
  );
}
