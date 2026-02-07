import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b1220",
          2: "#0a0f1a",
          card: "rgba(255,255,255,0.06)"
        },
        accent: {
          DEFAULT: "#ff2a4f",
          2: "#b0122e"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    },
  },
  plugins: [],
} satisfies Config;
