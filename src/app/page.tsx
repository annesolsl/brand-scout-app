"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { OrbitAppShell } from "@/components/OrbitAppShell";
import { SatelliteOrbitLoader } from "@/components/SatelliteOrbitLoader";
import { downloadBrandAnalysisPdf } from "@/lib/downloadBrandAnalysisPdf";
import { BrandAnalysis } from "@/lib/types";

function truncateUrl(url: string, max = 48) {
  const t = url.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

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

  const loaderSubtitle = url.trim() ? truncateUrl(url.trim()) : "Website URL";

  return (
    <OrbitAppShell
      breadcrumbs={[{ label: "Orbit" }, { label: "Brand Scout" }]}
      signedInAs="scout@orbit.app"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[20px] border border-orbit-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-orbit-text">Analysis configuration</h1>
            <button
              type="submit"
              form="scout-analysis-form"
              disabled={loading || !url.trim()}
              className="h-10 shrink-0 rounded-lg bg-orbit-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Scouting…" : "Scout Site"}
            </button>
          </div>

          {loading ? (
            <SatelliteOrbitLoader
              title="Running brand analysis"
              subtitle={loaderSubtitle}
              status="Aggregating signals across page content…"
            />
          ) : (
            <form id="scout-analysis-form" onSubmit={onSubmit} className="mt-6 space-y-2">
              <label htmlFor="scout-url" className="block text-xs font-semibold text-zinc-900">
                Website URL <span className="text-red-600">*</span>
              </label>
              <input
                id="scout-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoComplete="url"
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-orbit-navy/20 transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2"
              />
              {error ? <p className="pt-2 text-sm text-red-600">{error}</p> : null}
            </form>
          )}
        </section>

        {hasResult && result ? (
          <section className="grid gap-6 lg:grid-cols-12">
            <article className="rounded-[20px] border border-orbit-border bg-white p-6 shadow-sm lg:col-span-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-orbit-text">Structure analysis</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Source: <span className="font-medium text-zinc-800">{result.sourceUrl}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadBrandAnalysisPdf(result)}
                  className="h-9 shrink-0 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                >
                  Download PDF
                </button>
              </div>
              <div className="analysis-markdown markdown-table mt-5 overflow-x-auto text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysisMarkdown}</ReactMarkdown>
              </div>
            </article>

            <aside className="space-y-4 lg:col-span-4">
              <div className="rounded-[20px] border border-orbit-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Tone of Voice
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <Stat label="Formality" value={result.toneSummary.formality} />
                  <Stat label="Personality" value={result.toneSummary.personality} />
                  <Stat label="Style" value={result.toneSummary.style} />
                  <Stat label="CTA Style" value={result.toneSummary.ctaStyle} />
                </div>
              </div>

              <div className="rounded-[20px] border border-orbit-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Proof Signals
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-800">
                  {result.toneSummary.proofSignals.map((signal) => (
                    <li key={signal} className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
                      {signal}
                    </li>
                  ))}
                  {!result.toneSummary.proofSignals.length ? (
                    <li className="text-zinc-500">No proof signals detected.</li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-[20px] border border-orbit-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Scanned Pages
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-zinc-600">
                  {result.pagesScanned.map((page) => (
                    <li key={page} className="truncate rounded-lg border border-zinc-200 px-2 py-1.5">
                      {page}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>
        ) : !loading ? (
          <section className="rounded-[20px] border border-dashed border-zinc-300 bg-white/80 p-10 text-center text-sm text-zinc-500 shadow-sm">
            Submit a website URL to generate a narrative structure analysis and tone-of-voice card.
          </section>
        ) : null}
      </div>
    </OrbitAppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-medium text-zinc-900">{value}</p>
    </div>
  );
}
