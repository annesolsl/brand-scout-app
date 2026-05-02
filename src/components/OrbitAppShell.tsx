import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

type OrbitAppShellProps = {
  children: ReactNode;
  breadcrumbs: Crumb[];
  signedInAs?: string;
};

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 17.8 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function LineChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18V6M8 16V10M12 14V7M16 11V4M20 8v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 20V10M12 20V4M18 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlanetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12c3-2 13-2 16 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function OrbitAppShell({
  children,
  breadcrumbs,
  signedInAs = "Signed in"
}: OrbitAppShellProps) {
  return (
    <div className="flex min-h-screen bg-orbit-canvas text-orbit-text">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-orbit-border bg-white">
        <div className="flex items-center gap-3 border-b border-orbit-border px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orbit-navy text-white">
            <StarIcon />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-orbit-text">Mission Control</p>
          </div>
        </div>
        <div className="px-4 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Workspace
          </p>
          <nav className="space-y-1">
            <span className="flex items-center gap-3 rounded-lg bg-sky-100 px-3 py-2.5 text-sm font-medium text-sky-950">
              <LineChartIcon className="shrink-0 text-sky-800" />
              Brand Scout
            </span>
            <span className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500">
              <BarChartIcon className="shrink-0" />
              Chart Scanner
            </span>
            <span className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500">
              <PlanetIcon className="shrink-0" />
              Brand Cosmos
            </span>
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-orbit-border bg-white px-8 py-4">
          <span className="text-lg font-semibold tracking-tight text-orbit-text">Orbit</span>
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-600">
              Signed in as:{" "}
              <span className="font-medium text-orbit-text">{signedInAs}</span>
            </p>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="border-b border-orbit-border bg-orbit-canvas px-8 py-2.5">
          <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="text-zinc-400" aria-hidden>{">"}</span> : null}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-zinc-800">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={i === breadcrumbs.length - 1 ? "font-medium text-zinc-700" : ""}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <main className="flex-1 overflow-auto bg-orbit-canvas px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
