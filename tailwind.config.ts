import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        muted: "var(--foreground-muted)",
        accent: {
          algorithms: "var(--accent-algorithms)",
          os: "var(--accent-os)",
          networking: "var(--accent-networking)",
          systems: "var(--accent-systems)",
          languages: "var(--accent-languages)",
        },
        "card-border": "var(--card-border)",
        "card-border-hover": "var(--card-border-hover)",
        "logo-bg": "var(--logo-bg)",
        "logo-fg": "var(--logo-fg)",
      },
      fontFamily: { sans: "var(--font-sans)", mono: "var(--font-mono)" },
      boxShadow: {
        panel: "0 8px 32px rgba(0,0,0,.35), 0 0 0 1px var(--border)",
        card: "var(--card-glow)",
        "card-hover": "var(--card-glow-hover)",
      },
    },
  },
  plugins: [],
} satisfies Config;
