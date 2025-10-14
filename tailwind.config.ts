import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f172a",
          muted: "#1e293b",
          subtle: "#334155"
        },
        accent: {
          DEFAULT: "#38bdf8",
          soft: "#bae6fd"
        }
      }
    }
  },
  plugins: [],
};

export default config;
