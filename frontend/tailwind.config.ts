import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050508",
        surface: "rgb(12 12 18)",
        surface2: "rgb(20 20 31)",
        surface3: "rgb(28 28 42)",
        border: "var(--border)",
        "accent-cyan": "rgb(34 211 238)",
        "accent-blue": "rgb(59 130 246)",
        "accent-violet": "rgb(167 139 250)",
        "accent-fuchsia": "rgb(232 121 249)",
        "accent-rose": "rgb(251 113 133)",
        "accent-amber": "rgb(251 191 36)",
        "accent-lime": "rgb(163 230 53)",
        neon: {
          cyan: "rgb(34 211 238)",
          magenta: "rgb(232 121 249)",
          violet: "rgb(167 139 250)",
          blue: "rgb(59 130 246)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          dim: "var(--text-dim)",
        },
      },
      fontFamily: {
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px var(--glow-cyan)",
        "glow-magenta": "0 0 24px var(--glow-rose)",
        "glow-violet": "0 0 24px var(--glow-violet)",
        "inner-glow": "inset 0 0 30px rgba(34, 211, 238, 0.04)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
        "gradient-mesh": "radial-gradient(ellipse 80% 50% at 50% -20%, var(--tw-gradient-from), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, var(--tw-gradient-to), transparent)",
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px var(--glow-cyan)" },
          "50%": { opacity: "0.9", boxShadow: "0 0 32px var(--glow-cyan)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { opacity: "0.5", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(100%)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
