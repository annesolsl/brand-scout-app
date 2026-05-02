import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        panel: "#111827",
        card: "#ffffff",
        border: "#1f2937",
        primary: "#3b82f6",
        primarySoft: "#1d4ed8",
        orbit: {
          canvas: "#f4f4f5",
          border: "#e4e4e7",
          text: "#18181b",
          navy: "#0f172a",
          muted: "#71717a"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,246,0.35), 0 10px 30px rgba(29,78,216,0.2)"
      }
    }
  },
  plugins: []
};

export default config;
