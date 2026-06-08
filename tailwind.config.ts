import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animatePlugin from "tailwindcss-animate";
import typographyPlugin from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        brand: {
          primary:   "var(--brand-primary)",
          secondary: "var(--brand-secondary)",
          accent:    "var(--brand-accent)",
          warning:   "var(--brand-warning)",
          danger:    "var(--brand-danger)",
        },
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          dim:       "var(--text-dim)",
        },
        border:  "var(--border)",
        "border-subtle": "var(--border-subtle)",
        "orange-bg": "var(--orange-bg)",
        /* shadcn/ui semantic aliases */
        background: "var(--surface-0)",
        foreground: "var(--text-primary)",
        card:       { DEFAULT: "var(--surface-1)", foreground: "var(--text-primary)" },
        popover:    { DEFAULT: "var(--surface-1)", foreground: "var(--text-primary)" },
        primary:    { DEFAULT: "var(--brand-primary)", foreground: "#ffffff" },
        secondary:  { DEFAULT: "var(--surface-2)",     foreground: "var(--text-primary)" },
        muted:      { DEFAULT: "var(--surface-2)",     foreground: "var(--text-secondary)" },
        accent:     { DEFAULT: "var(--brand-accent)",  foreground: "#ffffff" },
        destructive:{ DEFAULT: "var(--brand-danger)",  foreground: "#ffffff" },
        input:      "var(--border)",
        ring:       "var(--brand-primary)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans:    ["Plus Jakarta Sans", ...fontFamily.sans],
        display: ["Instrument Serif", ...fontFamily.serif],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      borderWidth: {
        DEFAULT: '0.5px',
        '0': '0px',
        '1': '1px',
        '2': '2px',
        '4': '4px',
        '8': '8px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.3s ease-out",
        "slide-in-right":  "slide-in-right 0.25s ease-out",
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin],
};

export default config;
