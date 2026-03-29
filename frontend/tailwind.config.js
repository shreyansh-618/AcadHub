/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional SaaS Color Palette
        primary: {
          25: "#f0f9ff",
          50: "#eff6ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9", // Main primary
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c3d66",
        },
        secondary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Main secondary
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        accent: {
          50: "#fef3c7",
          100: "#fde68a",
          200: "#fcd34d",
          300: "#fbbf24",
          400: "#f59e0b",
          500: "#f97316", // Main accent
          600: "#ea580c",
          700: "#c2410c",
          800: "#92400e",
          900: "#78350f",
        },
        // Neutral palette for professional SaaS
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Success, warning, error colors
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          500: "#eab308",
          600: "#ca8a04",
        },
        error: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: ["Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-light": "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        "gradient-primary": "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
        "gradient-primary-subtle":
          "linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        "gradient-secondary-subtle":
          "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
        "gradient-accent": "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        "gradient-accent-subtle":
          "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        "gradient-cool": "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.06)",
        medium: "0 4px 16px rgba(0, 0, 0, 0.1)",
        large: "0 8px 32px rgba(0, 0, 0, 0.12)",
        xl: "0 12px 48px rgba(0, 0, 0, 0.15)",
        primary: "0 8px 24px rgba(14, 165, 233, 0.15)",
        secondary: "0 8px 24px rgba(139, 92, 246, 0.15)",
        accent: "0 8px 24px rgba(249, 115, 22, 0.15)",
        "inset-light": "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
        xs: "0.25rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
