/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        "bim-bg": "#0f1219",
        "bim-surface": "#1a1f2e",
        "bim-border": "#2a3042",
        "bim-accent": "#3b82f6",
        "bim-warning": "#f59e0b",
        "bim-success": "#10b981",
        "bim-danger": "#ef4444",
        "bim-muted": "#64748b",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-in": "slideIn 0.3s ease-out forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 4px rgba(59,130,246,0.3)" },
          "50%": { boxShadow: "0 0 16px rgba(59,130,246,0.6)" },
        },
      },
    },
  },
  plugins: [],
};
