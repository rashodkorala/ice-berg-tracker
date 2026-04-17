import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F2EE",
        ink: {
          DEFAULT: "#2C2C2C",
          light: "#6B6B6B",
        },
        ocean: {
          DEFAULT: "#1B6B93",
          light: "#E8F1F5",
          dark: "#134B66",
        },
        border: "#E0DCD7",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(44, 44, 44, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
