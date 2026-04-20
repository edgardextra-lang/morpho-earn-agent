import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        morpho: {
          bg: "#0B0D10",
          panel: "#14171C",
          border: "#22262D",
          accent: "#3B82F6",
          text: "#E5E7EB",
          muted: "#9CA3AF",
          success: "#10B981",
          warn: "#F59E0B",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
