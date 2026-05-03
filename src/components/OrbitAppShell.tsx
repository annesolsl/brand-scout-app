import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

type OrbitAppShellProps = {
  children: ReactNode;
  breadcrumbs: Crumb[];
  signedInAs?: string;
};

export function OrbitAppShell({
  children,
  breadcrumbs,
  signedInAs = "Signed in"
}: OrbitAppShellProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-orbit-canvas text-orbit-text">
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
  );
}
