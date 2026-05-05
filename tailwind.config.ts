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
        /** Figma Android / mobile design tokens */
        mc: {
          cream: "#FDF8F1",
          creamDeep: "#F5F1E9",
          card: "#EBEBEB",
          ink: "#1A1A1A",
          muted: "#737373",
          accent: "#B4233A",
          maroon: "#800020",
          maroonDeep: "#5B001C",
          banner: "#8B1D25",
          gold: "#C9A66B",
          goldDeep: "#B8925A",
          input: "#EAE3D9",
          price: "#8B2B3E",
          stone: "#F3F0E9"
        },
        admin: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95"
        },
        crown: {
          50: "#f7f2f7",
          100: "#f0e5f2",
          200: "#dfc0e2",
          300: "#c795cc",
          400: "#ad65b3",
          500: "#974399",
          600: "#7b337d",
          700: "#5f2860",
          800: "#421c43",
          900: "#2b122b"
        }
      }
    }
  },
  plugins: []
};

export default config;
