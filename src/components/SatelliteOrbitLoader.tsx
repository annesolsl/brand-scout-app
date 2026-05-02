import type { CSSProperties } from "react";

type SatelliteOrbitLoaderProps = {
  title: string;
  subtitle?: string;
  status: string;
};

const RINGS = [72, 102, 132, 162] as const;
const ARMS = [
  { diameter: 72, duration: "7s" },
  { diameter: 116, duration: "11s" },
  { diameter: 156, duration: "15s" }
] as const;

export function SatelliteOrbitLoader({ title, subtitle, status }: SatelliteOrbitLoaderProps) {
  return (
    <div className="flex flex-col items-center py-10">
      <div
        className="orbit-glow relative mx-auto flex h-[220px] w-[220px] items-center justify-center"
        aria-hidden
      >
        {RINGS.map((size) => (
          <div
            key={size}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200"
            style={{ width: size, height: size }}
          />
        ))}

        {ARMS.map((arm, i) => (
          <div
            key={i}
            className="orbit-arm absolute left-1/2 top-1/2"
            style={
              {
                "--orbit-d": `${arm.diameter}px`,
                "--orbit-speed": arm.duration
              } as CSSProperties
            }
          >
            <span className="orbit-satellite" />
          </div>
        ))}

        <div className="orbit-hub relative z-10 flex h-[42px] w-[42px] items-center justify-center rounded-full border-[7px] border-orbit-navy bg-white shadow-sm" />
      </div>

      <h2 className="mt-8 text-center text-xl font-bold tracking-tight text-orbit-navy">{title}</h2>
      {subtitle ? <p className="mt-2 text-center text-sm font-medium text-zinc-600">{subtitle}</p> : null}
      <p className="mt-2 text-center text-xs text-zinc-400">{status}</p>
    </div>
  );
}
