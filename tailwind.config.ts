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
